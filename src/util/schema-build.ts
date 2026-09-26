import type { SchemaObject, WithContext } from '@power-seo/schema'

import { article, event, faqPage, howTo, product, recipe, videoObject } from '@power-seo/schema'

import type { PluginContext } from '../types.js'

function stringOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function childOf(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object' || !(key in value)) {
    return undefined
  }

  return (value as Record<string, unknown>)[key]
}

function faqOf(value: unknown): Array<{ answer: string; question: string }> {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => ({
    answer: stringOf(childOf(item, 'answer')) ?? '',
    question: stringOf(childOf(item, 'question')) ?? '',
  }))
}

function ogImageUrl(doc: Record<string, unknown>, ctx: PluginContext): string | undefined {
  const seo = childOf(doc, 'seo')
  const ogImage = childOf(seo, 'ogImage')

  if (!ogImage || typeof ogImage !== 'object' || !('url' in ogImage)) {
    return undefined
  }

  const url = childOf(ogImage, 'url')

  if (typeof url !== 'string' || url.length === 0) {
    return undefined
  }

  const siteUrl = ctx.options.siteUrl

  if (siteUrl && !url.startsWith('http')) {
    return `${siteUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`
  }

  return url
}

/**
 * Builds a JSON-LD schema object from a document's `seo.schemaType` selection.
 * Minimal-field builds on purpose: run the result through `validateSchema`
 * to surface missing required properties.
 */
export function buildSchemaForDoc(
  doc: Record<string, unknown>,
  ctx: PluginContext,
): null | WithContext<SchemaObject> {
  const seo = childOf(doc, 'seo')
  const schemaType = stringOf(childOf(seo, 'schemaType'))

  if (!schemaType) {
    return null
  }

  const metaTitle = stringOf(childOf(seo, 'metaTitle'))
  const metaDescription = stringOf(childOf(seo, 'metaDescription'))
  const ogDescription = stringOf(childOf(seo, 'ogDescription'))
  const title = stringOf(childOf(doc, 'title'))
  const createdAt = stringOf(childOf(doc, 'createdAt'))
  const headline = metaTitle || title || ''
  const description = metaDescription || ogDescription
  const image = ogImageUrl(doc, ctx)

  switch (schemaType) {
    case 'Article': {
      return article({
        articleBody: metaDescription,
        author: 'Admin',
        dateModified: createdAt,
        datePublished: createdAt ?? '',
        headline,
        image,
      })
    }

    case 'Event': {
      return event({
        name: headline,
        description,
        location: '',
        startDate: createdAt ?? '',
      })
    }

    case 'FAQPage': {
      return faqPage(faqOf(childOf(seo, 'faq')))
    }

    case 'HowTo': {
      return howTo({
        name: headline,
        description,
        step: [],
      })
    }

    case 'Product': {
      return product({
        name: headline,
        description,
        image,
      })
    }

    case 'Recipe': {
      return recipe({
        name: headline,
        author: 'Admin',
        description,
        image,
        recipeIngredient: [],
        recipeInstructions: [],
      })
    }

    case 'VideoObject': {
      return videoObject({
        name: headline,
        description,
        thumbnailUrl: image ?? '',
        uploadDate: createdAt ?? '',
      })
    }

    default: {
      return null
    }
  }
}
