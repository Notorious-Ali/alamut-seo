import type { Config } from 'payload'

import type { AlamutSeoConfig, PluginContext } from './types.js'

import { createOpenAiCompatibleClient } from './ai/llm.js'
import {
  createAiDescriptionEndpoint,
  createAiGenerateEndpoint,
  createAiSerpEndpoint,
  createAiSuggestionsEndpoint,
  createAiTitleEndpoint,
} from './features/ai.js'
import { createAnalyticsEndpoint } from './features/analytics.js'
import {
  applyAuditHooks,
  applyAuditSchema,
  createAuditListEndpoint,
  createAuditRunEndpoint,
} from './features/audit.js'
import { createAnalyzeEndpoint } from './features/content-analysis.js'
import { applyImages, createImagesEndpoint } from './features/images.js'
import { createBacklinksEndpoint, createKeywordsEndpoint } from './features/integrations.js'
import { createLinksReportEndpoint } from './features/links.js'
import { applyRedirects, createRedirectsEndpoint } from './features/redirects.js'
import { createSchemaValidateEndpoint } from './features/schema.js'
import {
  createGscAnalyticsEndpoint,
  createGscInspectEndpoint,
  createGscSitemapsEndpoint,
  createGscSitemapSubmitEndpoint,
  createGscStatusEndpoint,
} from './features/search-console.js'
import {
  createRobotsEndpoint,
  createSitemapEndpoint,
  createSitemapIndexEndpoint,
} from './features/sitemap.js'
import { applyTracking } from './features/tracking.js'
import { seoMetaField } from './fields/seo-meta.js'
import { createGscBundle } from './gsc/context.js'
import { createIntegrationsBundle } from './integrations/context.js'
import { isEnabled } from './util/options.js'

export type { AiProvider, AlamutSeoConfig, PluginContext } from './types.js'

export const alamutSeo = (pluginOptions: AlamutSeoConfig) => {
  const ctx: PluginContext = {
    gsc: createGscBundle(),
    integrations: createIntegrationsBundle(),
    llm: pluginOptions.ai?.llm ?? createOpenAiCompatibleClient({
      apiKey: pluginOptions.ai?.apiKey,
      baseUrl: pluginOptions.ai?.baseUrl,
      model: pluginOptions.ai?.model,
      provider: pluginOptions.ai?.provider,
    }),
    options: pluginOptions,
  }

  return (config: Config): Config => {
    // Schema mutations (collections, globals, fields) always run so DB
    // migrations stay consistent even when the plugin is `disabled`.
    if (isEnabled(pluginOptions.images, true)) {
      config = applyImages(config, pluginOptions)
    }

    if (isEnabled(pluginOptions.redirects, true)) {
      config = applyRedirects(config)
    }

    if (isEnabled(pluginOptions.tracking, true)) {
      config = applyTracking(config)
    }

    if (isEnabled(pluginOptions.audit, true)) {
      config = applyAuditSchema(config)
    }

    config.collections = config.collections?.map((collection) => {
      if (!pluginOptions.collections?.[collection.slug]) {
        return collection
      }

      return {
        ...collection,
        fields: [...collection.fields, ...seoMetaField(pluginOptions)],
      }
    })

    if (pluginOptions.disabled) {
      return config
    }

    if (isEnabled(pluginOptions.audit, true)) {
      config = applyAuditHooks(config, ctx)
    }

    if (isEnabled(pluginOptions.contentAnalysis, true)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createAnalyzeEndpoint(ctx),
          method: 'post',
          path: '/seo/analyze',
        },
      ]
    }

    if (isEnabled(pluginOptions.schema, true)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createSchemaValidateEndpoint(ctx),
          method: 'post',
          path: '/seo/schema/validate',
        },
      ]
    }

    if (isEnabled(pluginOptions.ai, false)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createAiTitleEndpoint(ctx),
          method: 'post',
          path: '/seo/ai/title',
        },
        {
          handler: createAiDescriptionEndpoint(ctx),
          method: 'post',
          path: '/seo/ai/description',
        },
        {
          handler: createAiSuggestionsEndpoint(ctx),
          method: 'post',
          path: '/seo/ai/suggestions',
        },
        {
          handler: createAiSerpEndpoint(ctx),
          method: 'post',
          path: '/seo/ai/serp',
        },
        {
          handler: createAiGenerateEndpoint(ctx),
          method: 'post',
          path: '/seo/ai/generate',
        },
      ]
    }

    if (isEnabled(pluginOptions.images, true)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createImagesEndpoint(ctx),
          method: 'post',
          path: '/seo/images',
        },
      ]
    }

    if (isEnabled(pluginOptions.sitemap, true)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createSitemapEndpoint(ctx),
          method: 'get',
          path: '/seo/sitemap.xml',
        },
        {
          handler: createSitemapIndexEndpoint(ctx),
          method: 'get',
          path: '/seo/sitemap-index.xml',
        },
        {
          handler: createRobotsEndpoint(ctx),
          method: 'get',
          path: '/seo/robots.txt',
        },
      ]
    }

    if (isEnabled(pluginOptions.redirects, true)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createRedirectsEndpoint(ctx),
          method: 'get',
          path: '/seo/redirects',
        },
      ]
    }

    if (isEnabled(pluginOptions.searchConsole, true)) {
      config.admin = {
        ...config.admin,
        components: {
          ...config.admin?.components,
          views: {
            ...config.admin?.components?.views,
            SeoGsc: {
              Component: 'alamut-seo/rsc#GscView',
              exact: true,
              path: '/seo/gsc',
            },
          },
        },
      }

      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createGscStatusEndpoint(ctx),
          method: 'get',
          path: '/seo/gsc/status',
        },
        {
          handler: createGscAnalyticsEndpoint(ctx),
          method: 'get',
          path: '/seo/gsc/analytics',
        },
        {
          handler: createGscInspectEndpoint(ctx),
          method: 'get',
          path: '/seo/gsc/inspect',
        },
        {
          handler: createGscSitemapsEndpoint(ctx),
          method: 'get',
          path: '/seo/gsc/sitemaps',
        },
        {
          handler: createGscSitemapSubmitEndpoint(ctx),
          method: 'post',
          path: '/seo/gsc/sitemaps',
        },
      ]
    }

    if (isEnabled(pluginOptions.audit, true)) {
      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createAuditRunEndpoint(ctx),
          method: 'post',
          path: '/seo/audit/run',
        },
        {
          handler: createAuditListEndpoint(ctx),
          method: 'get',
          path: '/seo/audit',
        },
      ]
    }

    if (isEnabled(pluginOptions.analytics, true)) {
      config.admin = {
        ...config.admin,
        components: {
          ...config.admin?.components,
          views: {
            ...config.admin?.components?.views,
            SeoAnalytics: {
              Component: 'alamut-seo/client#SeoAnalyticsPanel',
              exact: true,
              path: '/seo/analytics',
            },
          },
        },
      }

      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createAnalyticsEndpoint(ctx),
          method: 'get',
          path: '/seo/analytics',
        },
      ]
    }

    if (isEnabled(pluginOptions.links, true)) {
      config.admin = {
        ...config.admin,
        components: {
          ...config.admin?.components,
          views: {
            ...config.admin?.components?.views,
            SeoLinks: {
              Component: 'alamut-seo/rsc#LinksView',
              exact: true,
              path: '/seo/links',
            },
          },
        },
      }

      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createLinksReportEndpoint(ctx),
          method: 'get',
          path: '/seo/links',
        },
      ]
    }

    if (isEnabled(pluginOptions.integrations, true)) {
      config.admin = {
        ...config.admin,
        components: {
          ...config.admin?.components,
          views: {
            ...config.admin?.components?.views,
            SeoKeywords: {
              Component: 'alamut-seo/rsc#KeywordsView',
              exact: true,
              path: '/seo/keywords',
            },
          },
        },
      }

      config.endpoints = [
        ...(config.endpoints ?? []),
        {
          handler: createKeywordsEndpoint(ctx),
          method: 'get',
          path: '/seo/keywords',
        },
        {
          handler: createBacklinksEndpoint(ctx),
          method: 'get',
          path: '/seo/backlinks',
        },
      ]
    }

    return config
  }
}
