'use client'

import type { TwitterCardType } from '@power-seo/core'

import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

import { SeoPreviewPanel } from './SeoPreviewPanel.js'

type SeoPreviewCustom = {
  siteName?: string
  siteUrl?: string
}

type SeoPreviewFieldProps = {
  field: {
    admin?: {
      custom?: SeoPreviewCustom
    }
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function asImageUrl(value: unknown): { url: string } | undefined {
  if (value && typeof value === 'object') {
    const doc = value as { url?: unknown }

    if (typeof doc.url === 'string' && doc.url.length > 0) {
      return { url: doc.url }
    }
  }

  return undefined
}

/**
 * Live SERP / OpenGraph / Twitter preview bound to the document form state.
 * Registered as a `ui` field on opted-in collections — no schema data.
 */
export const SeoPreviewField = ({ field }: SeoPreviewFieldProps) => {
  const [formState] = useAllFormFields()
  const { id } = useDocumentInfo()
  const custom = field?.admin?.custom ?? {}

  const formValue = (path: string): unknown => formState?.[path]?.value

  const title =
    asString(formValue('seo.metaTitle')) ??
    asString(formValue('title')) ??
    'Untitled document'
  const description =
    asString(formValue('seo.metaDescription')) ??
    asString(formValue('seo.ogDescription')) ??
    ''
  const slug = asString(formValue('slug')) ?? String(id ?? '')
  const url = custom.siteUrl
    ? `${custom.siteUrl.replace(/\/$/, '')}/${slug}`
    : `/${slug}`
  const image =
    asImageUrl(formValue('seo.ogImage')) ??
    asImageUrl(formValue('seo.twitterImage'))

  const cardType = formValue('seo.twitterCard')
  const twitterCardType: TwitterCardType =
    cardType === 'summary' ? 'summary' : 'summary_large_image'

  return React.createElement(SeoPreviewPanel, {
    description,
    image,
    siteName: custom.siteName,
    siteTitle: custom.siteName,
    title,
    twitterCardType,
    twitterSite: asString(formValue('seo.twitterSite')),
    url,
  })
}
