import type { PageAuditInput, PageAuditResult } from '@power-seo/audit'
import type { Config, Payload, PayloadHandler } from 'payload'

import { auditPage } from '@power-seo/audit'

import type { PluginContext } from '../types.js'

import { seoAuditsCollection } from '../collections/seo-audits.js'
import { getSeoEnv } from '../env.js'
import { requireAdmin } from '../util/access.js'
import { extractTextFromLexical } from '../util/lexical.js'

type SeoLike = {
  canonical?: string
  metaDescription?: string
  metaTitle?: string
  robots?: string[]
}

type DocLike = Record<string, unknown>

/**
 * Adds the `seo-audits` collection (once). Schema-only: runs even when the
 * plugin is `disabled` so DB migrations stay consistent.
 */
export function applyAuditSchema(config: Config): Config {
  const exists = config.collections?.some(
    (collection) => collection.slug === seoAuditsCollection.slug,
  )

  if (!exists) {
    config.collections = [...(config.collections ?? []), seoAuditsCollection]
  }

  return config
}

/**
 * Wires the auto-audit `afterChange` hook on every SEO-enabled collection.
 * The hook is skipped when `req.context.seoAuditRun` is set (recursion guard).
 */
export function applyAuditHooks(config: Config, ctx: PluginContext): Config {
  config.collections = config.collections?.map((collection) => {
    if (!ctx.options.collections?.[collection.slug]) {
      return collection
    }

    const incomingAfterChange = collection.hooks?.afterChange ?? []

    return {
      ...collection,
      hooks: {
        ...collection.hooks,
        afterChange: [
          ...incomingAfterChange,
          async (args) => {
            if (args.req.context.seoAuditRun) {
              return args.doc
            }

            args.req.context.seoAuditRun = true

            const result = auditDoc(args.doc as DocLike, collection.slug, ctx)

            await args.req.payload.create({
              collection: 'seo-audits',
              data: {
                collection: collection.slug,
                docId: String(args.doc.id),
                result: result as unknown as Record<string, unknown>,
                score: result.score,
                url: result.url,
              },
              overrideAccess: true,
              req: args.req,
            })

            return args.doc
          },
        ],
      },
    }
  })

  return config
}

/**
 * Audits one document: maps its SEO group and Lexical content into
 * `auditPage` input and returns the result.
 */
export function auditDoc(
  doc: DocLike,
  collection: string,
  ctx: PluginContext,
): PageAuditResult {
  const seo = (doc.seo ?? {}) as SeoLike
  const slug = typeof doc.slug === 'string' ? doc.slug : ''
  const siteUrl = (ctx.options.siteUrl ?? getSeoEnv().siteUrl ?? 'http://localhost:3000').replace(/\/$/, '')

  const input: PageAuditInput = {
    canonical: seo.canonical,
    content: extractTextFromLexical(doc.content),
    metaDescription: seo.metaDescription,
    title: seo.metaTitle ?? (typeof doc.title === 'string' ? doc.title : undefined),
    url: slug === 'home' || slug === 'index' ? siteUrl : `${siteUrl}/${collection}/${slug}`,
  }

  return auditPage(input)
}

/**
 * POST /seo/audit/run { collection, id } — runs an audit now and stores it.
 */
export function createAuditRunEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const body = ((await req.json?.()) ?? {}) as { collection?: string; id?: number | string }

    if (!body.collection || !body.id) {
      return Response.json({ error: 'collection and id are required' }, { status: 400 })
    }

    const doc = (await req.payload.findByID({
      id: body.id,
      collection: body.collection,
      overrideAccess: true,
    })) as unknown as DocLike

    const result = auditDoc(doc, body.collection, ctx)

    const record = await req.payload.create({
      collection: 'seo-audits',
      data: {
        collection: body.collection,
        docId: String(body.id),
        result: result as unknown as Record<string, unknown>,
        score: result.score,
        url: result.url,
      },
      overrideAccess: true,
    })

    return Response.json({ id: record.id, result })
  }
}

/**
 * GET /seo/audit?collection&limit — latest stored audits (admin-only).
 */
export function createAuditListEndpoint(_ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const collection = typeof req.query.collection === 'string' ? req.query.collection : undefined
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : 20

    const result = await req.payload.find({
      collection: 'seo-audits',
      limit,
      overrideAccess: true,
      sort: '-createdAt',
      ...(collection ? { where: { collection: { equals: collection } } } : {}),
    })

    return Response.json({ docs: result.docs, totalDocs: result.totalDocs })
  }
}

/**
 * Host helper: run an audit for a document via the Local API.
 */
export async function runAudit(
  payload: Payload,
  collection: string,
  id: number | string,
  pluginOptions: PluginContext['options'],
): Promise<PageAuditResult> {
  const doc = (await payload.findByID({
    id,
    collection,
    overrideAccess: true,
  })) as unknown as DocLike

  return auditDoc(doc, collection, { options: pluginOptions })
}
