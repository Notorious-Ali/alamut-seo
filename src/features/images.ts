import type { ImageInfo } from '@power-seo/images'
import type { Config, Field, PayloadHandler } from 'payload'

import { analyzeAltText } from '@power-seo/images'

import type { AlamutSeoConfig, PluginContext } from '../types.js'

import { requireAdmin } from '../util/access.js'

type ImagesBody = {
  focusKeyphrase?: string
  images?: ImageInfo[]
}

/**
 * POST /api/seo/images — audits alt text for a set of images (admin-only).
 * Body: { images: ImageInfo[], focusKeyphrase? } → ImageAuditResult.
 */
export function createImagesEndpoint(_ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const body = ((await req.json?.()) ?? {}) as ImagesBody

    if (!Array.isArray(body.images)) {
      return Response.json({ error: 'images array is required' }, { status: 400 })
    }

    return Response.json(analyzeAltText(body.images, body.focusKeyphrase))
  }
}

/**
 * Adds an `alt` text field to every upload collection so editors can
 * maintain accessible alt text that the image audit reads.
 */
export function applyImages(
  config: Config,
  pluginOptions: AlamutSeoConfig,
): Config {
  const altField: Field = {
    name: 'alt',
    type: 'text',
    label: 'Alt text',
  }

  config.collections = config.collections?.map((collection) => {
    if (!collection.upload || pluginOptions.collections?.[collection.slug]) {
      return collection
    }

    if (collection.fields.some((field) => 'name' in field && field.name === 'alt')) {
      return collection
    }

    return {
      ...collection,
      fields: [...collection.fields, altField],
    }
  })

  return config
}
