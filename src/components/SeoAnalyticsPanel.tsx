'use client'

import React from 'react'

import { seoErrorStyle, seoPanelStyle } from './seoStyles.js'

const metricStyle: React.CSSProperties = {
  display: 'inline-block',
  marginRight: 24,
}

type DashboardResponse = {
  error?: string
  overview?: {
    averageAuditScore: number
    averageCtr: number
    averagePosition: number
    totalClicks: number
    totalImpressions: number
    totalPages: number
  }
}

/**
 * Client analytics dashboard: renders the overview metrics from
 * GET /api/seo/analytics.
 */
export const SeoAnalyticsPanel: React.FC = () => {
  const [data, setData] = React.useState<DashboardResponse>()
  const [error, setError] = React.useState<string>()

  React.useEffect(() => {
    let cancelled = false

    const load = async (): Promise<void> => {
      try {
        const response = await fetch('/api/seo/analytics', {
          cache: 'no-store',
          credentials: 'same-origin',
        })
        const json = (await response.json()) as DashboardResponse

        if (cancelled) {
          return
        }

        if (json.error) {
          setError(json.error)
        } else {
          setData(json)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const overview = data?.overview

  return React.createElement(
    'div',
    { style: { ...seoPanelStyle, margin: 16 } },
    React.createElement('h1', null, 'SEO Analytics'),
    error
      ? React.createElement('p', { style: seoErrorStyle }, error)
      : null,
    overview
      ? React.createElement(
          'div',
          null,
          React.createElement('span', { style: metricStyle }, `Avg. audit score: ${overview.averageAuditScore}`),
          React.createElement('span', { style: metricStyle }, `Clicks: ${overview.totalClicks}`),
          React.createElement('span', { style: metricStyle }, `Impressions: ${overview.totalImpressions}`),
          React.createElement('span', { style: metricStyle }, `Avg. CTR: ${(overview.averageCtr * 100).toFixed(1)}%`),
          React.createElement('span', { style: metricStyle }, `Avg. position: ${overview.averagePosition}`),
          React.createElement('span', { style: metricStyle }, `Pages: ${overview.totalPages}`),
        )
      : null,
  )
}
