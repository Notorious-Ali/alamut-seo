'use client'

import { useAllFormFields } from '@payloadcms/ui'
import React from 'react'

import type { PluginContext } from '../types.js'

import { buildSchemaForDoc } from '../util/schema-build.js'
import {
  seoActionButtonStyle,
  seoErrorStyle,
  seoMutedStyle,
  seoPanelStyle,
  seoRowStyle,
  seoSuccessStyle,
} from './seoStyles.js'

type SeoSchemaCustom = {
  siteUrl?: string
}

type SeoSchemaFieldProps = {
  field: {
    admin?: {
      custom?: SeoSchemaCustom
    }
  }
}

type DocFormState = {
  content?: { value?: unknown }
  createdAt?: { value?: string }
  slug?: { value?: string }
  title?: { value?: string }
} & Record<string, { value?: unknown } | undefined>

type ValidationResponse = {
  error?: string
  issues?: Array<{ field: string; message: string; severity: string }>
  valid?: boolean
}

/**
 * Client schema panel: builds JSON-LD from the current form state and
 * validates it through POST /api/seo/schema/validate.
 */
export const SeoSchemaField = ({ field }: SeoSchemaFieldProps) => {
  const [formState] = useAllFormFields()
  const [result, setResult] = React.useState<ValidationResponse>()
  const [error, setError] = React.useState<string | undefined>()
  const [loading, setLoading] = React.useState(false)

  const state = (formState ?? {}) as DocFormState
  const custom = field?.admin?.custom ?? {}
  const ctx: PluginContext = { options: { siteUrl: custom.siteUrl } }

  // Payload form state is flat (path-keyed entries like `seo.schemaType`), so
  // the seo object must be reassembled from per-field entries.
  const stringAt = (path: string): unknown => state[path]?.value
  const faqRows: Array<{ answer?: string; question?: string }> = []
  for (const [path, entry] of Object.entries(state)) {
    const match = /^seo\.faq\.(\d+)\.(question|answer)$/.exec(path)

    if (match && entry) {
      const rowIndex = Number(match[1])
      faqRows[rowIndex] = faqRows[rowIndex] ?? {}
      faqRows[rowIndex][match[2] as 'answer' | 'question'] = String(entry.value ?? '')
    }
  }

  const validate = async () => {
    setLoading(true)
    setError(undefined)

    const doc = {
      slug: state.slug?.value,
      content: state.content?.value,
      createdAt: state.createdAt?.value,
      seo: {
        faq: faqRows.filter((row) => row.question || row.answer),
        metaDescription: stringAt('seo.metaDescription'),
        metaTitle: stringAt('seo.metaTitle'),
        ogDescription: stringAt('seo.ogDescription'),
        ogImage: stringAt('seo.ogImage'),
        schemaType: stringAt('seo.schemaType'),
      },
      title: state.title?.value,
    }
    const schema = buildSchemaForDoc(doc, ctx)

    if (!schema) {
      setError('Select a schema type first.')
      setLoading(false)

      return
    }

    try {
      const response = await fetch('/api/seo/schema/validate', {
        body: JSON.stringify({ schema }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const data = (await response.json()) as ValidationResponse

      if (!response.ok) {
        setError(data.error ?? `Request failed (${response.status})`)
        setResult(undefined)
      } else {
        setResult(data)
        setError(undefined)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return React.createElement(
    'div',
    { style: seoPanelStyle },
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'btn btn--style-primary btn--size-small',
        disabled: loading,
        onClick: () => {
          void validate()
        },
        style: {
          ...seoActionButtonStyle,
          cursor: loading ? 'wait' : 'pointer',
        },
      },
      loading
        ? React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'Validating…'),
          )
        : React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'Validate schema'),
          ),
    ),
    error
      ? React.createElement('p', { key: 'error', style: seoErrorStyle }, error)
      : null,
    result
      ? React.createElement(
          'div',
          { key: 'result' },
          React.createElement(
            'p',
            {
              style: {
                color: result.valid
                  ? seoSuccessStyle.color
                  : seoErrorStyle.color,
                fontWeight: 600,
              },
            },
            result.valid
              ? 'Schema is valid'
              : `Schema has ${result.issues?.length ?? 0} issue(s)`,
          ),
          ...(result.issues ?? []).map((issue, i) =>
            React.createElement(
              'div',
              {
                key: `issue-${i}`,
                style: seoRowStyle,
              },
              React.createElement('strong', null, `${issue.severity}: ${issue.field}`),
              React.createElement('div', { style: seoMutedStyle }, issue.message),
            ),
          ),
        )
      : null,
  )
}
