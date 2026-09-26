'use client'

import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

import { extractTextFromLexical } from '../util/lexical.js'
import { seoActionButtonStyle, seoErrorStyle, seoPanelStyle } from './seoStyles.js'

type FieldState = { value?: unknown }

type AiFormState = Record<string, FieldState>

type Target = 'og' | 'schema' | 'twitter'

type SeoAiGenerateProps = {
  field?: {
    admin?: {
      custom?: {
        target?: Target
      }
    }
  }
}

const SOCIAL_PATHS: Record<'og' | 'twitter', { description: string; title: string }> = {
  og: { description: 'seo.ogDescription', title: 'seo.ogTitle' },
  twitter: { description: 'seo.twitterDescription', title: 'seo.twitterTitle' },
}

function faqRowCount(state: AiFormState): number {
  return Object.keys(state).filter((path) => /^seo\.faq\.\d+\.question$/.test(path)).length
}

/**
 * Per-tab AI generator. Placed as a ui field in the OpenGraph, Twitter, and
 * Schema tabs (via admin.custom.target); writes generated values straight
 * into that tab's form fields. Structured generation endpoints live at
 * POST /api/seo/ai/generate.
 */
export const SeoAiGenerateField = ({ field }: SeoAiGenerateProps) => {
  const target: Target = field?.admin?.custom?.target ?? 'og'
  const [formState, dispatch] = useAllFormFields()
  const { id, collectionSlug } = useDocumentInfo()
  const [loading, setLoading] = React.useState('')
  const [error, setError] = React.useState<string | undefined>()

  const state = (formState ?? {}) as AiFormState

  const callGenerate = async (kind: 'faq' | 'og' | 'schemaType' | 'twitter') => {
    const response = await fetch('/api/seo/ai/generate', {
      body: JSON.stringify({
        id: id ?? undefined,
        collection: collectionSlug,
        content: extractTextFromLexical(state['content']?.value),
        focusKeyphrase:
          typeof state['seo.focusKeyphrase']?.value === 'string'
            ? String(state['seo.focusKeyphrase'].value)
            : undefined,
        target: kind,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    return response
  }

  const generateSocial = async (kind: 'og' | 'twitter') => {
    const paths = SOCIAL_PATHS[kind]
    const response = await callGenerate(kind)

    if (!response.ok) {
      const data = (await response.json()) as { error?: string }

      setError(data.error ?? `Request failed (${response.status})`)

      return
    }

    const data = (await response.json()) as { description?: string; title?: string }

    if (data.title) {
      dispatch({ type: 'UPDATE', path: paths.title, value: data.title })
    }

    if (data.description) {
      dispatch({ type: 'UPDATE', path: paths.description, value: data.description })
    }
  }

  const suggestSchemaType = async () => {
    const response = await callGenerate('schemaType')

    if (!response.ok) {
      const data = (await response.json()) as { error?: string }

      setError(data.error ?? `Request failed (${response.status})`)

      return
    }

    const data = (await response.json()) as { schemaType?: string }

    if (data.schemaType) {
      dispatch({ type: 'UPDATE', path: 'seo.schemaType', value: data.schemaType })
    }
  }

  const draftFaq = async () => {
    const response = await callGenerate('faq')

    if (!response.ok) {
      const data = (await response.json()) as { error?: string }

      setError(data.error ?? `Request failed (${response.status})`)

      return
    }

    const data = (await response.json()) as {
      faq?: Array<{ answer: string; question: string }>
    }

    let index = faqRowCount(state)

    for (const row of data.faq ?? []) {
      dispatch({ type: 'ADD_ROW', path: 'seo.faq' })
      dispatch({ type: 'UPDATE', path: `seo.faq.${index}.question`, value: row.question })
      dispatch({ type: 'UPDATE', path: `seo.faq.${index}.answer`, value: row.answer })
      index += 1
    }
  }

  const run = (key: string, action: () => Promise<void>) => {
    setLoading(key)
    setError(undefined)

    void action().catch((err: unknown) =>
      setError(err instanceof Error ? err.message : 'AI request failed'),
    ).finally(() => setLoading(''))
  }

  const buttons: Array<{ key: string; label: string; onClick: () => Promise<void> }> =
    target === 'schema'
      ? [
          { key: 'schemaType', label: 'Suggest schema type', onClick: suggestSchemaType },
          { key: 'faq', label: 'Draft FAQ', onClick: draftFaq },
        ]
      : target === 'og' || target === 'twitter'
        ? [{ key: target, label: 'Generate with AI', onClick: () => generateSocial(target) }]
        : []

  return React.createElement(
    'div',
    { style: seoPanelStyle },
    ...buttons.map((button, i) =>
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'btn btn--style-primary btn--size-small',
          disabled: loading !== '',
          key: button.key,
          onClick: () => run(button.key, button.onClick),
          style: { ...seoActionButtonStyle, marginRight: i < buttons.length - 1 ? 8 : 0 },
        },
        loading === button.key
          ? React.createElement(
              'span',
              { className: 'btn__content' },
              React.createElement('span', { className: 'btn__label' }, 'Generating…'),
            )
          : React.createElement(
              'span',
              { className: 'btn__content' },
              React.createElement('span', { className: 'btn__label' }, button.label),
            ),
      ),
    ),
    error ? React.createElement('p', { style: seoErrorStyle }, error) : null,
  )
}
