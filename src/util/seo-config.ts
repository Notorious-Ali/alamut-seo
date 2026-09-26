import type { SEOConfig } from '@power-seo/core'

import { resolveCanonical } from '@power-seo/core'

import type { PluginContext } from '../types.js'

import { getSeoEnv } from '../env.js'

type UploadDoc = {
  mimeType?: string
  url?: string
} & Record<string, unknown>

function resolveUploadUrl(
  value: unknown,
): string | undefined {
  if (!value || typeof value === 'string' || typeof value === 'number') {
    return undefined
  }

  const doc = value as UploadDoc

  return typeof doc.url === 'string' ? doc.url : undefined
}

function siteUrlOf(ctx: PluginContext): string | undefined {
  return ctx.options.siteUrl ?? getSeoEnv().siteUrl
}

function textOf(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number') {
    return String(value)
  }

  return ''
}

function resolveDocUrl(ctx: PluginContext, doc: Record<string, unknown>): string {
  const base = siteUrlOf(ctx)

  if (!base) {
    return textOf(doc.slug ?? doc.id)
  }

  return resolveCanonical(base, `/${textOf(doc.slug ?? doc.id)}`)
}

/**
 * Maps a document's `seo` field group onto the core SEOConfig shape.
 * Field-level values win over document fallbacks; canonical resolves against siteUrl + slug.
 */
export function getSeoConfigForDoc(
  doc: Record<string, unknown>,
  ctx: PluginContext,
): SEOConfig {
  const seo = (doc.seo ?? {}) as Record<string, unknown>
  const robots = (seo.robots ?? {}) as Record<string, unknown>
  const fallbackTitle = typeof doc.title === 'string' ? doc.title : undefined
  const fallbackDescription =
    typeof seo.metaDescription === 'string' ? seo.metaDescription : undefined
  const canonicalInput =
    typeof seo.canonical === 'string' && seo.canonical.length > 0
      ? seo.canonical
      : `/${textOf(doc.slug ?? doc.id)}`
  const siteUrl = siteUrlOf(ctx)
  const canonical =
    typeof seo.canonical === 'string' && seo.canonical.length > 0
      ? seo.canonical
      : siteUrl
        ? resolveCanonical(siteUrl, canonicalInput)
        : canonicalInput

  const ogImage = resolveUploadUrl(seo.ogImage)
  const twitterImage = resolveUploadUrl(seo.twitterImage)
  const hreflang = Array.isArray(seo.hreflang) ? seo.hreflang : []

  return {
    canonical,
    description: fallbackDescription,
    languageAlternates: hreflang.map((entry) => {
      const item = entry as { language?: unknown; url?: unknown }

      return {
        href: textOf(item.url),
        hrefLang: textOf(item.language),
      }
    }),
    nofollow: robots.nofollow === true,
    noindex: robots.noindex === true,
    openGraph: {
      description:
        typeof seo.ogDescription === 'string' && seo.ogDescription.length > 0
          ? seo.ogDescription
          : fallbackDescription,
      images: ogImage ? [{ url: ogImage }] : undefined,
      siteName: ctx.options.meta?.siteName ?? (siteUrl ? new URL(siteUrl).host : undefined),
      title:
        typeof seo.ogTitle === 'string' && seo.ogTitle.length > 0
          ? seo.ogTitle
          : fallbackTitle,
      url: resolveDocUrl(ctx, doc),
    },
    robots: {
      noarchive: robots.noarchive === true,
      noimageindex: robots.noimageindex === true,
      nosnippet: robots.nosnippet === true,
      notranslate: robots.notranslate === true,
      unavailableAfter:
        typeof robots.unavailableAfter === 'string'
          ? robots.unavailableAfter
          : undefined,
    },
    title:
      typeof seo.metaTitle === 'string' && seo.metaTitle.length > 0
        ? seo.metaTitle
        : fallbackTitle,
    titleTemplate: ctx.options.meta?.titleTemplate,
    twitter: {
      cardType:
        seo.twitterCard === 'summary' || seo.twitterCard === 'summary_large_image'
          ? seo.twitterCard
          : 'summary_large_image',
      creator:
        typeof seo.twitterCreator === 'string' ? seo.twitterCreator : undefined,
      description:
        typeof seo.twitterDescription === 'string' &&
        seo.twitterDescription.length > 0
          ? seo.twitterDescription
          : undefined,
      image: twitterImage,
      site: typeof seo.twitterSite === 'string' ? seo.twitterSite : undefined,
      title:
        typeof seo.twitterTitle === 'string' && seo.twitterTitle.length > 0
          ? seo.twitterTitle
          : undefined,
    },
  }
}
