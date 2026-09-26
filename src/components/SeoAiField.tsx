'use client'

import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

import { extractTextFromLexical } from '../util/lexical.js'
import {
  seoActionButtonStyle,
  seoErrorStyle,
  seoMutedStyle,
  seoPanelStyle,
  seoRowStyle,
} from './seoStyles.js'

type TitleResult = { charCount: number; pixelWidth: number; title: string }

type DescriptionResult = {
  charCount: number
  description: string
  isValid: boolean
  pixelWidth: number
}

type ContentSuggestion = {
  priority: number
  reason?: string
  suggestion: string
  type: string
}

type FieldState = { value?: unknown }

type AiFormState = Record<string, FieldState>

/**
 * Client AI panel: generates meta title/description via the AI endpoints and
 * applies the first results to the form; lists content suggestions.
 */
export const SeoAiField = () => {
  const [formState, dispatch] = useAllFormFields()
  const { id, collectionSlug } = useDocumentInfo()
  const [loading, setLoading] = React.useState('')
  const [error, setError] = React.useState<string | undefined>()
  const [suggestions, setSuggestions] = React.useState<ContentSuggestion[]>()

  const state = (formState ?? {}) as AiFormState
  const valueOf = (path: string): unknown => state[path]?.value

  const docBody = {
    id: id ?? undefined,
    collection: collectionSlug,
    content: extractTextFromLexical(valueOf('content')),
    focusKeyphrase:
      typeof valueOf('seo.focusKeyphrase') === 'string'
        ? String(valueOf('seo.focusKeyphrase'))
        : undefined,
  }

  const call = async (path: string, body: Record<string, unknown>): Promise<Response> => {
    const response = await fetch(path, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    return response
  }

  const generateMeta = async () => {
    setLoading('meta')
    setError(undefined)

    try {
      const [titleResponse, descriptionResponse] = await Promise.all([
        call('/api/seo/ai/title', docBody),
        call('/api/seo/ai/description', docBody),
      ])
      const titleData = (await titleResponse.json()) as { error?: string; titles?: TitleResult[] }
      const descriptionData = (await descriptionResponse.json()) as {
        description?: DescriptionResult
        error?: string
      }

      if (!titleResponse.ok) {
        setError(titleData.error ?? `Title request failed (${titleResponse.status})`)
      } else if (!descriptionResponse.ok) {
        setError(
          descriptionData.error ??
            `Description request failed (${descriptionResponse.status})`,
        )
      } else {
        const title = titleData.titles?.[0]?.title
        const description = descriptionData.description?.description

        if (title) {
          dispatch({ type: 'UPDATE', path: 'seo.metaTitle', value: title })
        }

        if (description) {
          dispatch({ type: 'UPDATE', path: 'seo.metaDescription', value: description })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setLoading('')
    }
  }

  const generateSuggestions = async () => {
    setLoading('suggestions')
    setError(undefined)

    try {
      const response = await call('/api/seo/ai/suggestions', docBody)
      const data = (await response.json()) as {
        error?: string
        suggestions?: ContentSuggestion[]
      }

      if (!response.ok) {
        setError(data.error ?? `Request failed (${response.status})`)
      } else {
        setSuggestions(data.suggestions ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setLoading('')
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
        disabled: loading !== '',
        key: 'generate',
        onClick: () => {
          void generateMeta()
        },
        style: {
          ...seoActionButtonStyle,
          marginRight: 8,
        },
      },
      loading === 'meta'
        ? React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'Generating…'),
          )
        : React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'Generate with AI'),
          ),
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        className: 'btn btn--style-primary btn--size-small',
        disabled: loading !== '',
        key: 'suggest',
        onClick: () => {
          void generateSuggestions()
        },
        style: {
          ...seoActionButtonStyle,
          marginRight: 8,
        },
      },
      loading === 'suggestions'
        ? React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'Thinking…'),
          )
        : React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'AI suggestions'),
          ),
    ),
    error
      ? React.createElement('p', { key: 'error', style: seoErrorStyle }, error)
      : null,
    suggestions && suggestions.length === 0
      ? React.createElement('p', { key: 'empty' }, 'No suggestions returned.')
      : null,
    ...(suggestions ?? []).map((suggestion, i) =>
      React.createElement(
        'div',
        { key: `suggestion-${i}`, style: seoRowStyle },
        React.createElement('strong', null, `${suggestion.type}: `),
        suggestion.suggestion,
        suggestion.reason
          ? React.createElement(
              'div',
              { style: seoMutedStyle },
              suggestion.reason,
            )
          : null,
      ),
    ),
  )
}
