import type { AuditSnapshot, DashboardData, GscPageData } from '@power-seo/analytics'
import type { AuditCategory, CategoryResult } from '@power-seo/audit'
import type { Payload, PayloadHandler } from 'payload'

import { buildDashboardData } from '@power-seo/analytics'
import { querySearchAnalyticsAll } from '@power-seo/search-console'

import type { PluginContext } from '../types.js'

import { gscConfigured } from '../gsc/context.js'
import { requireAdmin } from '../util/access.js'

type CategorySummary = Record<AuditCategory, CategoryResult>

type StoredAudit = {
  result?: {
    categories?: CategorySummary
    recommendations?: string[]
    score?: number
    url?: string
  }
  score?: number
  url?: string
}
async function collectGscPages(ctx: PluginContext): Promise<GscPageData[]> {
  if (!gscConfigured(ctx.gsc)) {
    return []
  }

  const end = new Date()
  const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  const iso = (date: Date): string => date.toISOString().slice(0, 10)

  const rows = await querySearchAnalyticsAll(ctx.gsc!.client, {
    dimensions: ['page'],
    endDate: iso(end),
    startDate: iso(start),
  })

  return rows.map((row) => ({
    clicks: row.clicks,
    ctr: row.ctr,
    impressions: row.impressions,
    position: row.position,
    url: row.keys?.[0] ?? '',
  }))
}

/**
 * Builds dashboard data from stored audits and (when configured) GSC pages.
 */
export async function buildAnalytics(
  payload: Payload,
  ctx: PluginContext,
): Promise<DashboardData> {
  const audits = await payload.find({
    collection: 'seo-audits',
    limit: 200,
    overrideAccess: true,
    sort: '-createdAt',
  })

  const docs = audits.docs as unknown as StoredAudit[]
  const auditResults: Array<{
    categories: CategorySummary
    recommendations: string[]
    score: number
    url: string
  }> = []
  const auditHistory: AuditSnapshot[] = []

  for (const doc of docs) {
    const result = doc.result

    if (!result?.url || !result.categories) {
      continue
    }

    auditResults.push({
      categories: result.categories,
      recommendations: result.recommendations ?? [],
      score: result.score ?? doc.score ?? 0,
      url: result.url,
    })

    auditHistory.push({
      categories: {
        content: result.categories.content.score,
        meta: result.categories.meta.score,
        performance: result.categories.performance.score,
        structure: result.categories.structure.score,
      },
      date: new Date().toISOString().slice(0, 10),
      score: result.score ?? 0,
      url: result.url,
    })
  }

  let gscPages: GscPageData[] = []

  try {
    gscPages = await collectGscPages(ctx)
  } catch {
    gscPages = []
  }

  return buildDashboardData({
    auditHistory,
    auditResults,
    gscPages,
  })
}

/**
 * GET /seo/analytics — dashboard data (admin-only).
 */
export function createAnalyticsEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const data = await buildAnalytics(req.payload, ctx)

    return Response.json(data)
  }
}
