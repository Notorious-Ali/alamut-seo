import type { PageData } from '@power-seo/links'
import type { Payload, PayloadHandler } from 'payload'

import {
  analyzeLinkEquity,
  buildLinkGraph,
  findOrphanPages,
  suggestLinks,
} from '@power-seo/links'

import type { PluginContext } from '../types.js'

import { getSeoEnv } from '../env.js'
import { requireAdmin } from '../util/access.js'
import { extractLinksFromLexical, extractTextFromLexical } from '../util/lexical.js'

type DocLike = Record<string, unknown>

/**
 * Collects page link data from the SEO-enabled collections: each document
 * becomes a page with its Lexical outbound links.
 */
export async function collectPageData(
  payload: Payload,
  ctx: PluginContext,
): Promise<PageData[]> {
  const siteUrl = (ctx.options.siteUrl ?? getSeoEnv().siteUrl ?? 'http://localhost:3000').replace(/\/$/, '')
  const enabled = Object.keys(ctx.options.collections ?? {})
  const pages: PageData[] = []

  for (const name of enabled) {
    const result = await payload.find({
      collection: name as never,
      limit: 0,
      overrideAccess: true,
    })

    for (const doc of result.docs as unknown as DocLike[]) {
      const slug = typeof doc.slug === 'string' ? doc.slug : ''
      const url = slug === 'home' || slug === 'index' ? siteUrl : `${siteUrl}/${name}/${slug}`

      pages.push({
        content: extractTextFromLexical(doc.content),
        links: extractLinksFromLexical(doc.content),
        title: typeof doc.title === 'string' ? doc.title : undefined,
        url,
      })
    }
  }

  return pages
}

/**
 * GET /seo/links — link graph report (admin-only): nodes, orphans, equity,
 * and cross-link suggestions.
 */
export function createLinksReportEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const pages = await collectPageData(req.payload, ctx)
    const graph = buildLinkGraph(pages)
    const nodes = Array.from(graph.nodes.values())
    const entryPoints = pages.filter((page) => page.url === ctx.options.siteUrl).map((page) => page.url)

    return Response.json({
      equity: analyzeLinkEquity(graph),
      nodes,
      orphans: findOrphanPages(graph, entryPoints.length > 0 ? entryPoints : [`${ctx.options.siteUrl ?? ''}/`]),
      suggestions: suggestLinks(pages),
      totalLinks: graph.totalLinks,
      totalPages: graph.totalPages,
    })
  }
}

/**
 * Host helper: run the link report via the Local API.
 */
export async function buildLinksReport(
  payload: Payload,
  pluginOptions: PluginContext['options'],
) {
  const pages = await collectPageData(payload, { options: pluginOptions })
  const graph = buildLinkGraph(pages)

  return {
    equity: analyzeLinkEquity(graph),
    nodes: Array.from(graph.nodes.values()),
    orphans: findOrphanPages(graph),
    suggestions: suggestLinks(pages),
    totalLinks: graph.totalLinks,
    totalPages: graph.totalPages,
  }
}
