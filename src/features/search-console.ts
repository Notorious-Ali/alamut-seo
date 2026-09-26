import type { Dimension } from '@power-seo/search-console'
import type { PayloadHandler } from 'payload'

import {
  inspectUrl,
  listSitemaps,
  querySearchAnalyticsAll,
  submitSitemap,
} from '@power-seo/search-console'

import type { PluginContext } from '../types.js'

import { gscConfigured } from '../gsc/context.js'
import { requireAdmin } from '../util/access.js'

const DIMENSIONS: readonly Dimension[] = ['query', 'page', 'device', 'country']

function notConfigured(): Response {
  return Response.json({ error: 'Search Console not configured' }, { status: 503 })
}

function parseDimensions(raw: null | string): Dimension[] {
  if (!raw) {
    return ['query', 'page']
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry): entry is Dimension => DIMENSIONS.includes(entry as Dimension))
}

function last30Days(): { endDate: string; startDate: string } {
  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  const iso = (date: Date): string => date.toISOString().slice(0, 10)

  return { endDate: iso(end), startDate: iso(start) }
}

/**
 * GET /seo/gsc/status — reports whether Search Console is configured.
 */
export function createGscStatusEndpoint(ctx: PluginContext): PayloadHandler {
  return (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    return Response.json({ configured: gscConfigured(ctx.gsc) })
  }
}

/**
 * GET /seo/gsc/analytics?startDate&endDate&dimensions — Search Analytics rows.
 */
export function createGscAnalyticsEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    if (!gscConfigured(ctx.gsc)) {
      return notConfigured()
    }

    const defaults = last30Days()
    const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : defaults.startDate
    const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : defaults.endDate
    const dimensions = parseDimensions(
      typeof req.query.dimensions === 'string' ? req.query.dimensions : null,
    )
    const rows = await querySearchAnalyticsAll(ctx.gsc!.client, {
      dimensions,
      endDate,
      startDate,
    })

    return Response.json({ endDate, rows, startDate })
  }
}

/**
 * GET /seo/gsc/inspect?url= — URL inspection result.
 */
export function createGscInspectEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    if (!gscConfigured(ctx.gsc)) {
      return notConfigured()
    }

    const inspectionUrl = req.query.url

    if (typeof inspectionUrl !== 'string' || inspectionUrl.length === 0) {
      return Response.json({ error: 'url query parameter is required' }, { status: 400 })
    }

    const result = await inspectUrl(ctx.gsc!.client, {
      inspectionUrl,
    })

    return Response.json(result)
  }
}

/**
 * GET /seo/gsc/sitemaps — lists submitted sitemaps.
 */
export function createGscSitemapsEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    if (!gscConfigured(ctx.gsc)) {
      return notConfigured()
    }

    const sitemaps = await listSitemaps(ctx.gsc!.client)

    return Response.json({ sitemaps })
  }
}

/**
 * POST /seo/gsc/sitemaps { feedpath } — submits a sitemap to Google.
 */
export function createGscSitemapSubmitEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    if (!gscConfigured(ctx.gsc)) {
      return notConfigured()
    }

    const body = ((await req.json?.()) ?? {}) as { feedpath?: string }

    if (!body.feedpath) {
      return Response.json({ error: 'feedpath is required' }, { status: 400 })
    }

    await submitSitemap(ctx.gsc!.client, body.feedpath)

    return Response.json({ submitted: true })
  }
}
