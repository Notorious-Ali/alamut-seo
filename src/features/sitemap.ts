import type { Payload, PayloadHandler } from 'payload'

import { generateSitemap, generateSitemapIndex } from '@power-seo/sitemap'

import type { AlamutSeoConfig, PluginContext  } from '../types.js'

import { getSeoEnv } from '../env.js'

type SlugDoc = {
  createdAt?: string
  slug?: string
  updatedAt?: string
}

function siteUrlOf(ctx: PluginContext): string {
  return ctx.options.siteUrl ?? getSeoEnv().siteUrl ?? ''
}

/**
 * Collects public URLs from the SEO-enabled collections. Documents with a
 * `slug` field become `/{collection}/{slug}` (slug `home` maps to `/`).
 */
export async function collectSitemapUrls(
  ctx: PluginContext,
  req: { payload: Payload },
): Promise<
  Array<{ changefreq: 'daily' | 'monthly'; lastmod?: string; loc: string; priority: number }>
> {
  const enabled = Object.keys(ctx.options.collections ?? {})
  const urls: Array<{
    changefreq: 'daily' | 'monthly'
    lastmod?: string
    loc: string
    priority: number
  }> = []

  for (const name of enabled) {
    // Collection slugs come from plugin config — trusted, narrowed for the generic find.
    const collection = name
    const result = await req.payload.find({
      collection,
      draft: false,
      limit: 0,
      overrideAccess: true,
      sort: 'updatedAt',
    })

    for (const doc of result.docs as SlugDoc[]) {
      const loc =
        doc.slug === 'home' || doc.slug === 'index'
          ? '/'
          : `/${collection}/${doc.slug ?? ''}`

      urls.push({
        changefreq: 'daily',
        lastmod: doc.updatedAt,
        loc,
        priority: 0.8,
      })
    }
  }

  return urls
}

/**
 * GET /seo/sitemap.xml — public XML sitemap of all enabled collections.
 */
export function createSitemapEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const urls = await collectSitemapUrls(ctx, req)
    const xml = generateSitemap({ hostname: siteUrlOf(ctx), urls })

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}

/**
 * GET /seo/sitemap-index.xml — public sitemap index pointing at sitemap.xml.
 */
export function createSitemapIndexEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const siteUrl = siteUrlOf(ctx).replace(/\/$/, '')
    const urls = await collectSitemapUrls(ctx, req)
    const lastmod = urls.reduce<string | undefined>(
      (latest, url) => (url.lastmod && (!latest || url.lastmod > latest) ? url.lastmod : latest),
      undefined,
    )
    const xml = generateSitemapIndex({
      sitemaps: [{ lastmod, loc: `${siteUrl}/sitemap.xml` }],
    })

    return new Response(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    })
  }
}

/**
 * GET /seo/robots.txt — public robots file referencing the sitemap.
 */
export function createRobotsEndpoint(ctx: PluginContext): PayloadHandler {
  return () => {
    return new Response(robotsTxt(ctx), {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }
}

function robotsTxt(ctx: PluginContext): string {
  const siteUrl = siteUrlOf(ctx).replace(/\/$/, '')

  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
}

/**
 * Host helper: XML sitemap string for the enabled collections.
 */
export async function getSitemapXml(
  payload: Payload,
  pluginOptions: AlamutSeoConfig,
): Promise<string> {
  const ctx: PluginContext = { options: pluginOptions }
  const urls = await collectSitemapUrls(ctx, { payload })

  return generateSitemap({ hostname: siteUrlOf(ctx), urls })
}

/**
 * Host helper: sitemap index XML string.
 */
export async function getSitemapIndexXml(
  payload: Payload,
  pluginOptions: AlamutSeoConfig,
): Promise<string> {
  const ctx: PluginContext = { options: pluginOptions }
  const siteUrl = siteUrlOf(ctx).replace(/\/$/, '')
  const urls = await collectSitemapUrls(ctx, { payload })
  const lastmod = urls.reduce<string | undefined>(
    (latest, url) => (url.lastmod && (!latest || url.lastmod > latest) ? url.lastmod : latest),
    undefined,
  )

  return generateSitemapIndex({
    sitemaps: [{ lastmod, loc: `${siteUrl}/sitemap.xml` }],
  })
}

/**
 * Host helper: robots.txt string referencing the sitemap.
 */
export function getRobotsTxt(pluginOptions: AlamutSeoConfig): string {
  return robotsTxt({ options: pluginOptions })
}
