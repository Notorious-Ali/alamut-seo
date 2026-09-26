import { createAhrefsClient, createSemrushClient } from '@power-seo/integrations'

import { getSeoEnv } from '../env.js'

export type IntegrationsBundle = {
  ahrefs: ReturnType<typeof createAhrefsClient>
  semrush: ReturnType<typeof createSemrushClient>
}

/**
 * Builds the Semrush + Ahrefs clients from ALAMUT_SEMRUSH_API_KEY /
 * ALAMUT_AHREFS_API_TOKEN. Returns undefined when neither key is set; the
 * individual clients are additionally undefined-checked per endpoint.
 */
export function createIntegrationsBundle(env = getSeoEnv()): IntegrationsBundle | undefined {
  if (!env.semrushApiKey && !env.ahrefsApiToken) {
    return undefined
  }

  return {
    ahrefs: env.ahrefsApiToken ? createAhrefsClient(env.ahrefsApiToken) : undefined,
    semrush: env.semrushApiKey ? createSemrushClient(env.semrushApiKey) : undefined,
  } as IntegrationsBundle
}
