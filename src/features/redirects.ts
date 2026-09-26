import type { RedirectRule } from '@power-seo/redirects'
import type { Config, Payload, PayloadHandler } from 'payload'

import { createRedirectEngine } from '@power-seo/redirects'

import type { PluginContext } from '../types.js'

import { seoRedirectsCollection } from '../collections/seo-redirects.js'

/**
 * Adds the `seo-redirects` collection (once) so editors can manage rules.
 */
export function applyRedirects(config: Config): Config {
  const exists = config.collections?.some(
    (collection) => collection.slug === seoRedirectsCollection.slug,
  )

  if (!exists) {
    config.collections = [...(config.collections ?? []), seoRedirectsCollection]
  }

  return config
}

async function loadRules(payload: Payload): Promise<RedirectRule[]> {
  const result = await payload.find({
    collection: 'seo-redirects',
    limit: 0,
    overrideAccess: true,
  })

  return result.docs.map((doc) => ({
    destination: String(doc.to),
    // statusCode from the select field is a string on the wire — narrowed to the rule union.
    source: String(doc.from),
    statusCode: Number(doc.statusCode) as RedirectRule['statusCode'],
  }))
}

/**
 * GET /seo/redirects?path=/old — PUBLIC (middleware calls it unauthenticated).
 * Returns `{ destination, statusCode }` for the first matching rule or 404.
 */
export function createRedirectsEndpoint(_ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const path = req.query.path

    if (typeof path !== 'string' || path.length === 0) {
      return Response.json({ error: 'path query parameter is required' }, { status: 400 })
    }

    const rules = await loadRules(req.payload)
    const engine = createRedirectEngine(rules)
    const match = engine.match(path)

    if (!match) {
      return Response.json({ error: 'No redirect found' }, { status: 404 })
    }

    return Response.json({
      destination: match.resolvedDestination,
      statusCode: match.statusCode,
    })
  }
}

/**
 * Host helper: resolve a redirect for a path using the Local API.
 */
export async function resolveRedirect(
  payload: Payload,
  path: string,
): Promise<{ destination: string; statusCode: number } | null> {
  const rules = await loadRules(payload)
  const engine = createRedirectEngine(rules)
  const match = engine.match(path)

  if (!match) {
    return null
  }

  return { destination: match.resolvedDestination, statusCode: match.statusCode }
}

/**
 * Builds a Next middleware-style redirect resolver for host apps:
 * `const redirect = createRedirectMiddleware({ payload, pluginOptions })`.
 */
export function createRedirectResolver(payload: Payload) {
  let cache: { expires: number; rules: RedirectRule[] } | undefined

  return async (path: string): Promise<{ destination: string; statusCode: number } | null> => {
    if (!cache || cache.expires < Date.now()) {
      cache = { expires: Date.now() + 30_000, rules: await loadRules(payload) }
    }

    const engine = createRedirectEngine(cache.rules)
    const match = engine.match(path)

    return match
      ? { destination: match.resolvedDestination, statusCode: match.statusCode }
      : null
  }
}

