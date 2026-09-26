import type { PromptTemplate } from '@power-seo/ai'

import { getSeoEnv } from '../env.js'

export type LlmClient = (prompt: PromptTemplate) => Promise<string>

/**
 * Supported LLM providers. All but `anthropic` speak the OpenAI
 * chat-completions protocol with a different base URL; `anthropic` uses the
 * Messages API (x-api-key header, separate system field).
 */
export type AiProvider = 'anthropic' | 'deepseek' | 'grok' | 'openai' | 'openrouter' | 'zai'

type ProviderDefaults = {
  baseUrl: string
  envVar: string
  model: string
}

export const AI_PROVIDER_DEFAULTS: Record<AiProvider, ProviderDefaults> = {
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    envVar: 'ALAMUT_ANTHROPIC_API_KEY',
    model: 'claude-sonnet-4-5',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    envVar: 'ALAMUT_DEEPSEEK_API_KEY',
    model: 'deepseek-chat',
  },
  grok: {
    baseUrl: 'https://api.x.ai/v1',
    envVar: 'ALAMUT_GROK_API_KEY',
    model: 'grok-3',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    envVar: 'ALAMUT_OPENAI_API_KEY',
    model: 'gpt-4o-mini',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    envVar: 'ALAMUT_OPENROUTER_API_KEY',
    model: 'openai/gpt-4o-mini',
  },
  zai: {
    baseUrl: 'https://api.z.ai/api/paas/v4',
    envVar: 'ALAMUT_ZAI_API_KEY',
    model: 'glm-4.6',
  },
}

export type AiClientOptions = {
  apiKey?: string
  baseUrl?: string
  model?: string
  provider?: AiProvider
}

function resolveConfig(options: AiClientOptions): {
  apiKey: string | undefined
  baseUrl: string
  model: string
  provider: AiProvider
} {
  const env = getSeoEnv()
  let provider: AiProvider = 'openai'
  const rawProvider = options.provider ?? env.aiProvider

  if (rawProvider) {
    if (!(rawProvider in AI_PROVIDER_DEFAULTS)) {
      throw new Error(
        `Unknown AI provider "${rawProvider}" — expected one of: ${Object.keys(AI_PROVIDER_DEFAULTS).join(', ')} (set via ai: { provider } or ALAMUT_AI_PROVIDER)`,
      )
    }

    provider = rawProvider as AiProvider
  }

  const defaults = AI_PROVIDER_DEFAULTS[provider]
  const envApiKeys: Record<AiProvider, string | undefined> = {
    anthropic: env.anthropicApiKey,
    deepseek: env.deepseekApiKey,
    grok: env.grokApiKey,
    openai: env.openAiApiKey,
    openrouter: env.openRouterApiKey,
    zai: env.zaiApiKey,
  }
  const envBaseUrl = provider === 'openai' ? env.openAiBaseUrl : undefined
  const envModel = provider === 'openai' ? env.openAiModel : undefined

  return {
    apiKey: options.apiKey ?? envApiKeys[provider],
    baseUrl: (options.baseUrl ??
      env.aiBaseUrl ??
      envBaseUrl ??
      defaults.baseUrl).replace(/\/$/, ''),
    model: options.model ?? env.aiModel ?? envModel ?? defaults.model,
    provider,
  }
}

/**
 * LLM client factory covering OpenAI, Anthropic, DeepSeek, Grok (x.ai),
 * OpenRouter, and Z.ai (GLM). Every provider resolves its API key from
 * `ALAMUT_<PROVIDER>_API_KEY` unless `apiKey` is passed; base URL and model
 * fall back to curated per-provider defaults. `anthropic` uses the Messages
 * API; every other provider uses the OpenAI-compatible chat-completions
 * protocol (so custom gateways work via `baseUrl`).
 */
type ChatChoice = { finish_reason?: string; message?: { content?: string } }

function chatCompletionParts(data: unknown): { content?: string; finishReason?: string } {
  if (typeof data !== 'object' || data === null || !('choices' in data)) {return {}}

  const choices: unknown = data.choices
  if (!Array.isArray(choices) || choices.length === 0) {return {}}

  // Well-known OpenAI-compatible shape from an upstream boundary.
  const choice = choices[0] as ChatChoice

  return { content: choice.message?.content, finishReason: choice.finish_reason }
}

function anthropicText(data: unknown): string {
  if (typeof data !== 'object' || data === null || !('content' in data)) {return ''}

  const blocks: unknown = data.content
  if (!Array.isArray(blocks)) {return ''}

  return blocks
    .filter(
      (block) =>
        typeof block === 'object' && block !== null && 'type' in block && block.type === 'text',
    )
    .map((block) =>
      typeof block === 'object' && block !== null && 'text' in block && typeof block.text === 'string'
        ? block.text
        : '',
    )
    .join('')
    .trim()
}

export function createOpenAiCompatibleClient(options: AiClientOptions = {}): LlmClient {
  return async (prompt: PromptTemplate) => {
    const { apiKey, baseUrl, model, provider } = resolveConfig(options)

    if (!apiKey) {
      throw new Error(
        `${AI_PROVIDER_DEFAULTS[provider].envVar} is not set (provider: ${provider})`,
      )
    }

    const response =
      provider === 'anthropic'
        ? await fetchAnthropic({ apiKey, baseUrl, model, prompt })
        : await fetchChatCompletion({ apiKey, baseUrl, model, prompt, provider })

    if (!response.ok) {
      const body = await response.text()

      throw new Error(
        `LLM request failed (${provider}, ${response.status}): ${body.slice(0, 300)}`,
      )
    }

    const data: unknown = await response.json()
    const parts =
      provider === 'anthropic' ? { content: anthropicText(data) } : chatCompletionParts(data)

    if (!parts.content) {
      throw new Error(
        `LLM response contained no content${parts.finishReason ? ` (finish_reason: ${parts.finishReason})` : ''}`,
      )
    }

    return parts.content
  }
}

type FetchArgs = {
  apiKey: string
  baseUrl: string
  model: string
  prompt: PromptTemplate
}

async function fetchChatCompletion({
  apiKey,
  baseUrl,
  model,
  prompt,
  provider,
}: { provider: AiProvider } & FetchArgs): Promise<Response> {
  const body: Record<string, unknown> = {
    max_tokens: prompt.maxTokens,
    messages: [
      { content: prompt.system, role: 'system' },
      { content: prompt.user, role: 'user' },
    ],
    model,
  }

  // GLM thinking models (e.g. glm-5.3-flash) spend the max_tokens budget on
  // `reasoning_content` before answering, which starves `content` on the
  // short-copy budgets the prompts use. SEO copy needs no reasoning.
  if (provider === 'zai') {
    body.thinking = { type: 'disabled' }
  }

  return fetch(`${baseUrl}/chat/completions`, {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })
}

async function fetchAnthropic({
  apiKey,
  baseUrl,
  model,
  prompt,
}: FetchArgs): Promise<Response> {
  return fetch(`${baseUrl}/messages`, {
    body: JSON.stringify({
      max_tokens: prompt.maxTokens,
      messages: [{ content: prompt.user, role: 'user' }],
      model,
      system: prompt.system,
    }),
    headers: {
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    method: 'POST',
  })
}
