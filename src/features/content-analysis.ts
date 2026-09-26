import type { PayloadHandler } from 'payload'

import { analyzeContent } from '@power-seo/content-analysis'
import { isAbsoluteUrl } from '@power-seo/core'
import { analyzeReadability } from '@power-seo/readability'

import type { PluginContext } from '../types.js'

import { requireAdmin } from '../util/access.js'
import { extractLinksFromLexical, extractTextFromLexical } from '../util/lexical.js'
import { isEnabled } from '../util/options.js'

type AnalyzeBody = {
  collection?: string
  content?: string
  focusKeyphrase?: string
  id?: number | string
}

/**
 * POST /api/seo/analyze — runs content analysis against a document's
 * Lexical content (or an explicit content override).
 */
export function createAnalyzeEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const body = ((await req.json?.()) ?? {}) as AnalyzeBody

    if (!body.collection || !body.id) {
      return Response.json(
        { error: 'collection and id are required' },
        { status: 400 },
      )
    }

    const doc = await req.payload.findByID({
      id: body.id,
      collection: body.collection,
      overrideAccess: true,
    })

    const docRecord = doc as unknown as Record<string, unknown>
    const seo = (docRecord.seo ?? {}) as Record<string, unknown>
    const content = body.content ?? extractTextFromLexical(docRecord.content)
    const links = extractLinksFromLexical(docRecord.content)
    const internalLinks = links.filter((url) => !isAbsoluteUrl(url))
    const externalLinks = links.filter((url) => isAbsoluteUrl(url))

    const contentAnalysis = analyzeContent({
      slug: typeof docRecord.slug === 'string' ? docRecord.slug : undefined,
      content,
      externalLinks,
      focusKeyphrase: body.focusKeyphrase,
      internalLinks,
      metaDescription:
        typeof seo.metaDescription === 'string'
          ? seo.metaDescription
          : undefined,
      siteUrl: ctx.options.siteUrl,
      title:
        typeof seo.metaTitle === 'string' && seo.metaTitle.length > 0
          ? seo.metaTitle
          : typeof docRecord.title === 'string'
            ? docRecord.title
            : undefined,
    })

    return Response.json(
      isEnabled(ctx.options.readability, true)
        ? { contentAnalysis, readability: analyzeReadability({ content }) }
        : { contentAnalysis },
    )
  }
}
