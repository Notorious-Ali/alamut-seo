import type { AlamutSeoConfig } from '../src/types.js'

/**
 * Shared dev plugin options — single source for payload.config.ts and the
 * (frontend) route handlers so generated files match what hosts consume.
 *
 * Deliberately minimal: features default to enabled and everything
 * environment-specific comes from ALAMUT_* env vars (site URL, AI provider,
 * AI API key). Set ALAMUT_AI_PROVIDER + ALAMUT_<PROVIDER>_API_KEY in dev/.env
 * to switch AI providers without touching this file.
 */
export const pluginOptions: AlamutSeoConfig = {
  ai: {
    enabled: true,
  },
  collections: {
    posts: true,
  },
}
