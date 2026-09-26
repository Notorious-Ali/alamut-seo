import type { PayloadHandler } from 'payload'

import type { PluginContext } from '../types.js'

import { requireAdmin } from '../util/access.js'

/**
 * GET /seo/keywords?domain=example.com — organic keyword research via the
 * Semrush and Ahrefs clients (admin-only). Merges organic keywords from
 * whichever providers are configured.
 */
export function createKeywordsEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    if (!ctx.integrations) {
      return Response.json(
        { error: 'Keyword research not configured: set ALAMUT_SEMRUSH_API_KEY or ALAMUT_AHREFS_API_TOKEN' },
        { status: 503 },
      )
    }

    const domain = new URL(req.url ?? 'http://localhost:3000/api').searchParams.get('domain')

    if (!domain) {
      return Response.json({ error: 'Missing "domain" query parameter' }, { status: 400 })
    }

    const keywords = ctx.integrations.semrush
      ? await ctx.integrations.semrush.getOrganicKeywords(domain)
      : await ctx.integrations.ahrefs.getOrganicKeywords(domain)

    return Response.json({ domain, keywords })
  }
}

/**
 * GET /seo/backlinks?domain=example.com — backlink profile via Semrush /
 * Ahrefs (admin-only).
 */
export function createBacklinksEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    if (!ctx.integrations) {
      return Response.json(
        { error: 'Backlink data not configured: set ALAMUT_SEMRUSH_API_KEY or ALAMUT_AHREFS_API_TOKEN' },
        { status: 503 },
      )
    }

    const domain = new URL(req.url ?? 'http://localhost:3000/api').searchParams.get('domain')

    if (!domain) {
      return Response.json({ error: 'Missing "domain" query parameter' }, { status: 400 })
    }

    const backlinks = ctx.integrations.semrush
      ? ctx.integrations.semrush.getBacklinks(domain)
      : ctx.integrations.ahrefs.getBacklinks(domain)

    return Response.json({ backlinks: await backlinks, domain })
  }
}
