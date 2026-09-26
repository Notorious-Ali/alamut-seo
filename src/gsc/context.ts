import type { OAuthCredentials, TokenManager } from '@power-seo/search-console'

import {
  createGSCClient,
  createTokenManager,
  exchangeRefreshToken,
} from '@power-seo/search-console'

import { getSeoEnv } from '../env.js'

export type GscBundle = {
  client: ReturnType<typeof createGSCClient>
  tokenManager: TokenManager
}

/**
 * Builds an authenticated GSC client bundle from ALAMUT_GSC_* env vars,
 * with access-token caching until expiry. Returns undefined when the
 * OAuth credentials are not configured.
 */
export function createGscBundle(env = getSeoEnv()): GscBundle | undefined {
  if (!env.gscClientId || !env.gscClientSecret || !env.gscRefreshToken || !env.gscSiteUrl) {
    return undefined
  }

  const credentials: OAuthCredentials = {
    clientId: env.gscClientId,
    clientSecret: env.gscClientSecret,
    refreshToken: env.gscRefreshToken,
  }

  let cached: { accessToken: string; expiresAt: number } | undefined

  const tokenManager = createTokenManager(async () => {
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached
    }

    const token = await exchangeRefreshToken(credentials)

    cached = token

    return token
  })

  return {
    client: createGSCClient({
      auth: tokenManager,
      siteUrl: env.gscSiteUrl,
    }),
    tokenManager,
  }
}

export function gscConfigured(bundle: GscBundle | undefined): boolean {
  return bundle !== undefined
}
