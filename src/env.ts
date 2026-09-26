export type SeoEnv = {
  ahrefsApiToken?: string
  aiBaseUrl?: string
  aiModel?: string
  aiProvider?: string
  anthropicApiKey?: string
  deepseekApiKey?: string
  grokApiKey?: string
  gscClientId?: string
  gscClientSecret?: string
  gscRefreshToken?: string
  gscSiteUrl?: string
  openAiApiKey?: string
  openAiBaseUrl: string
  openAiModel: string
  openRouterApiKey?: string
  semrushApiKey?: string
  siteUrl?: string
  zaiApiKey?: string
}

export function getSeoEnv(): SeoEnv {
  return {
    ahrefsApiToken: process.env.ALAMUT_AHREFS_API_TOKEN,
    aiBaseUrl: process.env.ALAMUT_AI_BASE_URL,
    aiModel: process.env.ALAMUT_AI_MODEL,
    aiProvider: process.env.ALAMUT_AI_PROVIDER,
    anthropicApiKey: process.env.ALAMUT_ANTHROPIC_API_KEY,
    deepseekApiKey: process.env.ALAMUT_DEEPSEEK_API_KEY,
    grokApiKey: process.env.ALAMUT_GROK_API_KEY,
    gscClientId: process.env.ALAMUT_GSC_CLIENT_ID,
    gscClientSecret: process.env.ALAMUT_GSC_CLIENT_SECRET,
    gscRefreshToken: process.env.ALAMUT_GSC_REFRESH_TOKEN,
    gscSiteUrl: process.env.ALAMUT_GSC_SITE_URL,
    openAiApiKey: process.env.ALAMUT_OPENAI_API_KEY,
    openAiBaseUrl: process.env.ALAMUT_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openAiModel: process.env.ALAMUT_OPENAI_MODEL || 'gpt-4o-mini',
    openRouterApiKey: process.env.ALAMUT_OPENROUTER_API_KEY,
    semrushApiKey: process.env.ALAMUT_SEMRUSH_API_KEY,
    siteUrl: process.env.ALAMUT_SITE_URL,
    zaiApiKey: process.env.ALAMUT_ZAI_API_KEY,
  }
}
