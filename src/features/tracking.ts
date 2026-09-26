import type { GA4Config, ScriptConfig } from '@power-seo/tracking'
import type { Config, GlobalConfig } from 'payload'

import {
  buildClarityScript,
  buildFathomScript,
  buildGA4Script,
  buildPlausibleScript,
  buildPostHogScript,
} from '@power-seo/tracking'

/**
 * Adds the `seo-tracking` global (once) so editors can configure providers.
 */
export function applyTracking(config: Config): Config {
  const exists = config.globals?.some((global) => global.slug === seoTrackingGlobal.slug)

  if (!exists) {
    config.globals = [...(config.globals ?? []), seoTrackingGlobal]
  }

  return config
}

export type TrackingGlobalData = {
  clarity?: {
    enabled?: boolean
    projectId?: string
  }
  fathom?: {
    enabled?: boolean
    siteId?: string
  }
  ga4?: {
    anonymizeIp?: boolean
    enabled?: boolean
    measurementId?: string
  }
  plausible?: {
    domain?: string
    enabled?: boolean
    selfHostedUrl?: string
  }
  postHog?: {
    apiKey?: string
    enabled?: boolean
    host?: string
  }
}

/**
 * The `seo-tracking` global: per-provider IDs toggled by `enabled`.
 */
export const seoTrackingGlobal: GlobalConfig = {
  slug: 'seo-tracking',
  access: {
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    group: 'SEO',
  },
  fields: [
    {
      name: 'ga4',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Enable Google Analytics 4' },
        { name: 'measurementId', type: 'text', label: 'Measurement ID (G-XXXXXXX)' },
        { name: 'anonymizeIp', type: 'checkbox', label: 'Anonymize IP' },
      ],
      label: 'Google Analytics 4',
    },
    {
      name: 'clarity',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Enable Microsoft Clarity' },
        { name: 'projectId', type: 'text', label: 'Project ID' },
      ],
      label: 'Microsoft Clarity',
    },
    {
      name: 'plausible',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Enable Plausible' },
        { name: 'domain', type: 'text', label: 'Domain' },
        { name: 'selfHostedUrl', type: 'text', label: 'Self-hosted URL (optional)' },
      ],
      label: 'Plausible',
    },
    {
      name: 'postHog',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Enable PostHog' },
        { name: 'apiKey', type: 'text', label: 'API key' },
        { name: 'host', type: 'text', label: 'Host (optional)' },
      ],
      label: 'PostHog',
    },
    {
      name: 'fathom',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', label: 'Enable Fathom' },
        { name: 'siteId', type: 'text', label: 'Site ID' },
      ],
      label: 'Fathom',
    },
  ],
  label: 'Tracking',
}

/**
 * Builds the script-tag configs for every enabled provider from the
 * `seo-tracking` global data. Hosts render these in `<head>`.
 */
export function getTrackingScriptConfigs(data: TrackingGlobalData): ScriptConfig[] {
  const scripts: ScriptConfig[] = []

  if (data.ga4?.enabled && data.ga4.measurementId) {
    const config: GA4Config = {
      anonymizeIp: data.ga4.anonymizeIp,
      measurementId: data.ga4.measurementId,
    }

    scripts.push(...buildGA4Script(config))
  }

  if (data.clarity?.enabled && data.clarity.projectId) {
    scripts.push(buildClarityScript({ projectId: data.clarity.projectId }))
  }

  if (data.plausible?.enabled && data.plausible.domain) {
    scripts.push(
      buildPlausibleScript({
        domain: data.plausible.domain,
        selfHostedUrl: data.plausible.selfHostedUrl,
      }),
    )
  }

  if (data.postHog?.enabled && data.postHog.apiKey) {
    scripts.push(buildPostHogScript({ apiKey: data.postHog.apiKey, host: data.postHog.host }))
  }

  if (data.fathom?.enabled && data.fathom.siteId) {
    scripts.push(buildFathomScript({ siteId: data.fathom.siteId }))
  }

  return scripts
}
