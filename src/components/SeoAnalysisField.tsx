'use client'

import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui'
import React from 'react'

import { extractImagesFromLexical } from '../util/lexical.js'
import {
  seoActionButtonStyle,
  seoErrorStyle,
  seoMutedStyle,
  seoPanelStyle,
  seoRowStyle,
  seoStatusPillClass,
} from './seoStyles.js'

type AnalysisResult = {
  description: string
  id: string
  maxScore: number
  score: number
  status: 'good' | 'na' | 'ok' | 'poor'
  title: string
}

type ReadabilityData = {
  fleschKincaidGrade: number
  fleschReadingEase: number
  recommendations: string[]
  score: number
}

type ImageAuditData = {
  issues: Array<{
    description: string
    image?: { src: string }
    severity: string
    title: string
  }>
  score: number
  totalImages: number
}

type AnalyzeResponse = {
  contentAnalysis?: {
    maxScore: number
    results: AnalysisResult[]
    score: number
  }
  error?: string
  readability?: ReadabilityData
}

/**
 * Client analysis panel: runs POST /api/seo/analyze against the current
 * document's Lexical content and renders scored results as a compact
 * Payload-styled checklist.
 */
export const SeoAnalysisField = () => {
  const [fieldsMap] = useAllFormFields()
  const { id } = useDocumentInfo()
  const formState = fieldsMap ?? {}
  const [analysis, setAnalysis] = React.useState<AnalyzeResponse['contentAnalysis']>()
  const [readability, setReadability] = React.useState<ReadabilityData>()
  const [imageAudit, setImageAudit] = React.useState<ImageAuditData>()
  const [error, setError] = React.useState<string>()
  const [loading, setLoading] = React.useState(false)

  const runAnalysis = async (): Promise<void> => {
    setLoading(true)
    setError(undefined)

    try {
      const contentNode = formState?.['content']?.value

      const slug = typeof formState?.['slug']?.value === 'string' ? String(formState?.['slug']?.value) : ''
      const title = typeof formState?.['title']?.value === 'string' ? String(formState?.['title']?.value) : undefined

      const response = await fetch('/api/seo/analyze', {
        body: JSON.stringify({
          id,
          slug,
          collection: 'posts',
          content: contentNode && typeof contentNode === 'object' ? contentNode : undefined,
          focusKeyphrase:
            typeof formState?.['seo.focusKeyphrase']?.value === 'string'
              ? formState?.['seo.focusKeyphrase']?.value
              : undefined,
          title,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const data = (await response.json()) as AnalyzeResponse

      if (!response.ok) {
        setError(data.error ?? `Request failed (${response.status})`)
      } else {
        setAnalysis(data.contentAnalysis)
        setReadability(data.readability)
      }

      const images = extractImagesFromLexical(contentNode)

      if (images.length > 0) {
        const imagesResponse = await fetch('/api/seo/images', {
          body: JSON.stringify({
            focusKeyphrase:
              typeof formState?.['seo.focusKeyphrase']?.value === 'string'
                ? formState?.['seo.focusKeyphrase']?.value
                : undefined,
            images,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        if (imagesResponse.ok) {
          setImageAudit((await imagesResponse.json()) as ImageAuditData)
        }
      } else {
        setImageAudit(undefined)
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
          void runAnalysis()
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
            React.createElement('span', { className: 'btn__label' }, 'Analyzing…'),
          )
        : React.createElement(
            'span',
            { className: 'btn__content' },
            React.createElement('span', { className: 'btn__label' }, 'Run analysis'),
          ),
    ),
    error ? React.createElement('p', { style: seoErrorStyle }, error) : null,
    analysis
      ? React.createElement(
          'div',
          { key: 'results' },
          React.createElement(
            'p',
            { style: { fontWeight: 600, margin: '6px 0 2px' } },
            `Score: ${analysis.score} / ${analysis.maxScore}`,
          ),
          ...analysis.results.map((result) =>
            React.createElement(
              'div',
              { key: result.id, style: seoRowStyle },
              React.createElement(
                'span',
                { className: seoStatusPillClass(result.status) },
                result.status,
              ),
              React.createElement('span', null, result.title),
              React.createElement(
                'span',
                { style: seoMutedStyle },
                `${result.description} (${result.score}/${result.maxScore})`,
              ),
            ),
          ),
        )
      : null,
    readability
      ? React.createElement(
          'div',
          { key: 'readability' },
          React.createElement(
            'p',
            { style: { fontWeight: 600, margin: '6px 0 2px' } },
            `Readability: Flesch ${Math.round(readability.fleschReadingEase)} (grade ${Math.round(readability.fleschKincaidGrade)})`,
          ),
          ...readability.recommendations.map((rec, i) =>
            React.createElement(
              'div',
              { key: `rec-${i}`, style: seoRowStyle },
              React.createElement(
                'span',
                { style: seoMutedStyle },
                rec,
              ),
            ),
          ),
        )
      : null,
    imageAudit
      ? React.createElement(
          'div',
          { key: 'images' },
          React.createElement(
            'p',
            { style: { fontWeight: 600, margin: '6px 0 2px' } },
            `Images: ${imageAudit.totalImages} audited, score ${imageAudit.score}`,
          ),
          ...imageAudit.issues.map((issue, i) =>
            React.createElement(
              'div',
              { key: `image-issue-${i}`, style: seoRowStyle },
              React.createElement(
                'span',
                { style: seoMutedStyle },
                `${issue.severity}: ${issue.title} — ${issue.description}${issue.image ? ` (${issue.image.src})` : ''}`,
              ),
            ),
          ),
        )
      : null,
  )
}
