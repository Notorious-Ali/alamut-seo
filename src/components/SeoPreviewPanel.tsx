'use client'

import type { TwitterCardType } from '@power-seo/core'

import {
  CHAR_PIXEL_WIDTHS,
  DEFAULT_CHAR_WIDTH,
  META_DESCRIPTION_MAX_PIXELS,
  OG_IMAGE,
  TITLE_MAX_PIXELS,
  TWITTER_IMAGE,
} from '@power-seo/core'
import { createElement, useMemo, useState } from 'react'

/**
 * Payload-themed fork of @power-seo/preview/react's PreviewPanel. All colors
 * come from the admin theme CSS variables so the panel follows light/dark
 * automatically; platform tabs use Payload's neutral tab styling (no accent
 * colors).
 */

type PreviewImage = {
  height?: number
  message?: string
  url: string
  valid: boolean
  width?: number
}

const mutedStyle: React.CSSProperties = { color: 'var(--theme-elevation-500)' }

const warningStyle: React.CSSProperties = {
  background: 'var(--theme-warning-100)',
  borderRadius: 'var(--style-radius-s)',
  color: 'var(--theme-warning-800)',
  fontSize: 11,
  marginTop: 4,
  padding: '6px 8px',
}

function truncateAtPixelWidth(text: string, maxPixels: number): { truncated: boolean; value: string } {
  if (calculatePixelWidth(text) <= maxPixels) {
    return { truncated: false, value: text }
  }

  const ellipsis = '...'
  let width = 0

  for (const char of ellipsis) {
    width += CHAR_PIXEL_WIDTHS[char] ?? DEFAULT_CHAR_WIDTH
  }

  for (let i = text.length - 1; i >= 0; i--) {
    width += CHAR_PIXEL_WIDTHS[text[i]] ?? DEFAULT_CHAR_WIDTH

    if (width > maxPixels) {
      return { truncated: true, value: `${text.slice(0, Math.max(0, i))}${ellipsis}` }
    }
  }

  return { truncated: true, value: `${text}${ellipsis}` }
}

function calculatePixelWidth(text: string): number {
  let width = 0

  for (const char of text) {
    width += CHAR_PIXEL_WIDTHS[char] ?? DEFAULT_CHAR_WIDTH
  }

  return width
}

function formatBreadcrumbUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const segments = parsed.pathname.split('/').filter((segment) => segment.length > 0)
    const display = segments.length > 0 ? `${host} › ${segments.join(' › ')}` : host

    return truncateAtPixelWidth(display, 400).value
  } catch {
    return url
  }
}

function SerpPreview({
  description,
  siteTitle,
  title,
  url,
}: {
  description: string
  siteTitle?: string
  title: string
  url: string
}) {
  const data = useMemo(() => {
    const displayTitle = siteTitle ? `${title} - ${siteTitle}` : title

    return {
      descriptionTruncated: truncateAtPixelWidth(description, META_DESCRIPTION_MAX_PIXELS).truncated,
      displayTitle: truncateAtPixelWidth(displayTitle, TITLE_MAX_PIXELS).value,
      displayUrl: formatBreadcrumbUrl(url),
      titleTruncated: truncateAtPixelWidth(displayTitle, TITLE_MAX_PIXELS).truncated,
    }
  }, [description, siteTitle, title, url])

  return createElement(
    'div',
    {
      style: {
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--style-radius-s)',
        maxWidth: 600,
        padding: 16,
      },
    },
    createElement(
      'div',
      { style: { fontSize: 12, marginBottom: 4 } },
      createElement('cite', { style: { fontStyle: 'normal', ...mutedStyle } }, data.displayUrl),
    ),
    createElement(
      'h3',
      {
        style: {
          color: 'var(--theme-text)',
          fontSize: 18,
          fontWeight: 500,
          lineHeight: 1.3,
          margin: '0 0 4px 0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        },
      },
      data.displayTitle,
    ),
    createElement(
      'div',
      { style: { fontSize: 13, lineHeight: 1.5, ...mutedStyle } },
      description,
    ),
    data.titleTruncated
      ? createElement('div', { style: warningStyle }, 'Title will be truncated in search results.')
      : null,
    data.descriptionTruncated
      ? createElement('div', { style: warningStyle }, 'Description will be truncated in search results.')
      : null,
  )
}

function OgPreview({
  description,
  image,
  siteName,
  title,
  url,
}: {
  description: string
  image?: { height?: number; url: string; width?: number }
  siteName?: string
  title: string
  url: string
}) {
  const data = useMemo(() => {
    let validated: PreviewImage | undefined

    if (image?.url) {
      const { height, url: imageUrl, width } = image

      if (!imageUrl) {
        validated = { message: 'Image URL is required.', url: imageUrl, valid: false }
      } else if (width !== undefined && height !== undefined) {
        if (width < OG_IMAGE.MIN_WIDTH || height < OG_IMAGE.MIN_HEIGHT) {
          validated = {
            height,
            message: `Image is ${width}x${height}px. Minimum size is ${OG_IMAGE.MIN_WIDTH}x${OG_IMAGE.MIN_HEIGHT}px.`,
            url: imageUrl,
            valid: false,
            width,
          }
        } else {
          validated = {
            height,
            message:
              width !== OG_IMAGE.WIDTH || height !== OG_IMAGE.HEIGHT
                ? `Image is ${width}x${height}px. Recommended size is ${OG_IMAGE.WIDTH}x${OG_IMAGE.HEIGHT}px.`
                : undefined,
            url: imageUrl,
            valid: true,
            width,
          }
        }
      } else {
        validated = { url: imageUrl, valid: true }
      }
    }

    let host = url

    try {
      host = new URL(url).hostname
    } catch {
      // relative URL — display as-is
    }

    return { host, image: validated }
  }, [image, url])

  return createElement(
    'div',
    {
      style: {
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--style-radius-s)',
        maxWidth: 524,
        overflow: 'hidden',
      },
    },
    data.image
      ? createElement('div', {
          style: {
            aspectRatio: '1.91 / 1',
            background: 'var(--theme-elevation-150)',
            backgroundImage: `url(${data.image.url})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          },
        })
      : null,
    createElement(
      'div',
      {
        style: {
          borderTop: '1px solid var(--theme-elevation-150)',
          padding: '10px 12px',
        },
      },
      createElement(
        'div',
        { style: { fontSize: 11, letterSpacing: '0.03em', textTransform: 'uppercase', ...mutedStyle } },
        siteName || data.host,
      ),
      createElement(
        'div',
        { style: { color: 'var(--theme-text)', fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginTop: 2 } },
        title,
      ),
      createElement('div', { style: { fontSize: 13, lineHeight: 1.4, marginTop: 4, ...mutedStyle } }, description),
    ),
    data.image && !data.image.valid && data.image.message
      ? createElement('div', { style: { padding: '6px 12px', ...warningStyle } }, data.image.message)
      : null,
  )
}

function TwitterPreview({
  cardType,
  description,
  image,
  site,
  title,
}: {
  cardType: TwitterCardType
  description: string
  image?: { height?: number; url: string; width?: number }
  site?: string
  title: string
}) {
  const data = useMemo(() => {
    const specs = cardType === 'summary_large_image' ? TWITTER_IMAGE.SUMMARY_LARGE : TWITTER_IMAGE.SUMMARY
    let validated: PreviewImage | undefined
    let domain: string | undefined

    if (image?.url) {
      const { height, url: imageUrl, width } = image

      if (width !== undefined && height !== undefined) {
        const tooSmall = width < specs.WIDTH || height < specs.HEIGHT

        validated = tooSmall
          ? {
              height,
              message: `Image is ${width}x${height}px. Recommended size is ${specs.WIDTH}x${specs.HEIGHT}px.`,
              url: imageUrl,
              valid: false,
              width,
            }
          : { url: imageUrl, valid: true }
      } else {
        validated = { url: imageUrl, valid: true }
      }
    }

    if (site) {
      domain = site.replace(/^@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    }

    return { domain, image: validated }
  }, [cardType, image, site])

  const isLarge = cardType === 'summary_large_image'

  return createElement(
    'div',
    {
      style: {
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 12,
        maxWidth: 500,
        overflow: 'hidden',
      },
    },
    isLarge && data.image
      ? createElement('div', {
          style: {
            aspectRatio: '2 / 1',
            background: 'var(--theme-elevation-150)',
            backgroundImage: `url(${data.image.url})`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          },
        })
      : null,
    createElement(
      'div',
      { style: { display: 'flex' } },
      !isLarge && data.image
        ? createElement('div', {
            style: {
              background: 'var(--theme-elevation-150)',
              backgroundImage: `url(${data.image.url})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              flexShrink: 0,
              height: 125,
              width: 125,
            },
          })
        : null,
      createElement(
        'div',
        { style: { flex: 1, overflow: 'hidden', padding: 12 } },
        createElement('div', { style: { fontSize: 13, marginBottom: 2, ...mutedStyle } }, data.domain ? `@${data.domain}` : ''),
        createElement(
          'div',
          {
            style: {
              color: 'var(--theme-text)',
              fontSize: 15,
              fontWeight: 700,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            },
          },
          title,
        ),
        createElement(
          'div',
          {
            style: {
              fontSize: 14,
              lineHeight: 1.3,
              marginTop: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              ...mutedStyle,
            },
          },
          description,
        ),
      ),
    ),
    data.image && !data.image.valid && data.image.message
      ? createElement('div', { style: { padding: '6px 12px', ...warningStyle } }, data.image.message)
      : null,
  )
}

type SeoPreviewPanelProps = {
  description?: string
  image?: { height?: number; url: string; width?: number }
  siteName?: string
  siteTitle?: string
  title?: string
  twitterCardType?: TwitterCardType
  twitterSite?: string
  url: string
}

/**
 * Live SERP / OpenGraph / Twitter preview, fully themed with Payload admin
 * CSS variables. Forked from @power-seo/preview/react to follow the admin
 * light/dark scheme; platform tabs use Payload's neutral tab styling.
 */
export const SeoPreviewPanel = ({
  description = '',
  image,
  siteName,
  siteTitle,
  title = 'Untitled document',
  twitterCardType = 'summary_large_image',
  twitterSite,
  url,
}: SeoPreviewPanelProps) => {
  const [activeTab, setActiveTab] = useState<'facebook' | 'google' | 'twitter'>('google')

  const tabs = [
    { id: 'google', label: 'Google' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'twitter', label: 'Twitter / X' },
  ] as const

  return createElement(
    'div',
    null,
    createElement(
      'div',
      {
        style: {
          borderBottom: '1px solid var(--theme-elevation-150)',
          display: 'flex',
          gap: 4,
          marginBottom: 12,
        },
      },
      ...tabs.map((tab) =>
        createElement(
          'button',
          {
            type: 'button',
            key: tab.id,
            onClick: () => setActiveTab(tab.id),
            style: {
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--theme-text)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              marginBottom: -1,
              padding: '6px 10px',
            },
          },
          tab.label,
        ),
      ),
    ),
    activeTab === 'google'
      ? createElement(SerpPreview, { description, siteTitle, title, url })
      : null,
    activeTab === 'facebook'
      ? createElement(OgPreview, { description, image, siteName, title, url })
      : null,
    activeTab === 'twitter'
      ? createElement(TwitterPreview, { cardType: twitterCardType, description, image, site: twitterSite, title })
      : null,
  )
}
