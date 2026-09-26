import type { CollectionSlug } from 'payload'

import type { AiProvider, LlmClient } from './ai/llm.js'
import type { GscBundle } from './gsc/context.js'
import type { IntegrationsBundle } from './integrations/context.js'

export type { AiProvider } from './ai/llm.js'

/**
 * Per-feature options. Every feature ships an `enabled` flag:
 * local-only features default to `true`, external-service features default to `false`.
 */
export type MetaOptions = {
  enabled?: boolean
  siteName?: string
  titleTemplate?: string
}

export type FeatureOptions = {
  enabled?: boolean
}

export type AiOptions = {
  /**
   * API key; falls back to the provider's `ALAMUT_<PROVIDER>_API_KEY` env var
   */
  apiKey?: string
  /**
   * Override the provider's default API base URL (OpenAI-compatible gateways)
   */
  baseUrl?: string
  enabled?: boolean
  /**
   * Fully custom client — bypasses the built-in provider clients entirely
   */
  llm?: LlmClient
  /**
   * Model id; falls back to `ALAMUT_AI_MODEL`, then the provider default
   */
  model?: string
  /**
   * `openai` (default) | `anthropic` | `zai` | `deepseek` | `grok` | `openrouter`;
   * falls back to `ALAMUT_AI_PROVIDER`
   */
  provider?: AiProvider
}

export type AlamutSeoConfig = {
  ai?: AiOptions
  analytics?: FeatureOptions
  audit?: FeatureOptions
  /**
   * Collections that receive the `seo` field group and participate in sitemap/analysis features
   */
  collections?: Partial<Record<CollectionSlug, true>>
  contentAnalysis?: FeatureOptions
  /**
   * Disable the plugin without removing it from the config (schema stays intact for migrations)
   */
  disabled?: boolean
  images?: FeatureOptions
  integrations?: FeatureOptions
  links?: FeatureOptions
  meta?: MetaOptions
  preview?: FeatureOptions
  readability?: FeatureOptions
  redirects?: FeatureOptions
  schema?: FeatureOptions
  searchConsole?: FeatureOptions
  sitemap?: FeatureOptions
  /**
   * Canonical site URL, e.g. https://example.com (falls back to ALAMUT_SITE_URL)
   */
  siteUrl?: string
  tracking?: FeatureOptions
}

export type PluginContext = {
  gsc?: GscBundle
  integrations?: IntegrationsBundle
  llm?: LlmClient
  options: AlamutSeoConfig
}
