import type {
  Field,
  TextareaFieldValidation,
  TextFieldValidation,
} from 'payload'

import type { AlamutSeoConfig } from '../types.js'

import { getSeoEnv } from '../env.js'
import { isEnabled } from '../util/options.js'
import { validateMetaDescription, validateTitle } from '../util/validation.js'

const ROBOTS_CHECKBOXES = [
  'noindex',
  'nofollow',
  'noarchive',
  'nosnippet',
  'noimageindex',
  'notranslate',
] as const

const validateMetaTitle: TextFieldValidation = (value) => {
  if (!value) {
    return true
  }

  const result = validateTitle(value)

  return result.valid ? true : result.message
}

const validateMetaDescriptionField: TextareaFieldValidation = (value) => {
  if (!value) {
    return true
  }

  const result = validateMetaDescription(value)

  return result.valid ? true : result.message
}

const robotsCheckboxes = ROBOTS_CHECKBOXES.map((name) => ({
  name,
  type: 'checkbox',
  label: name,
})) satisfies Field[]

export function seoMetaField(pluginOptions: AlamutSeoConfig): Field[] {
  const envSiteUrl = pluginOptions.siteUrl ?? getSeoEnv().siteUrl
  const siteName =
    pluginOptions.meta?.siteName ??
    (envSiteUrl ? new URL(envSiteUrl).host : undefined)

  const previewField: Field = {
    name: 'seoPreview',
    type: 'ui',
    admin: {
      components: {
        Field: 'alamut-seo/client#SeoPreviewField',
      },
      custom: {
        siteName,
        siteUrl: envSiteUrl,
      },
    },
    label: 'Preview',
  }

  const analysisField: Field = {
    name: 'seoAnalysis',
    type: 'ui',
    admin: {
      components: {
        Field: 'alamut-seo/client#SeoAnalysisField',
      },
    },
    label: 'Analysis',
  }

  const schemaField: Field = {
    name: 'seoSchema',
    type: 'ui',
    admin: {
      components: {
        Field: 'alamut-seo/client#SeoSchemaField',
      },
      custom: {
        siteUrl: envSiteUrl,
      },
    },
    label: 'Schema Validation',
  }

  const aiField: Field = {
    name: 'seoAi',
    type: 'ui',
    admin: {
      components: {
        Field: 'alamut-seo/client#SeoAiField',
      },
    },
    label: 'AI',
  }

  const aiFieldFor = (target: 'og' | 'schema' | 'twitter', name: string): Field => ({
    name,
    type: 'ui',
    admin: {
      components: {
        Field: 'alamut-seo/client#SeoAiGenerateField',
      },
      custom: {
        target,
      },
    },
  })

  const aiEnabled = isEnabled(pluginOptions.ai, false)

  return [
    seoGroupField(
      isEnabled(pluginOptions.preview, true) ? previewField : null,
      analysisField,
      [schemaField],
      {
        main: aiEnabled ? [aiField] : [],
        og: aiEnabled ? [aiFieldFor('og', 'seoAiOg')] : [],
        schema: aiEnabled ? [aiFieldFor('schema', 'seoAiSchema')] : [],
        twitter: aiEnabled ? [aiFieldFor('twitter', 'seoAiTwitter')] : [],
      },
    ),
  ]
}

type SeoAiTabFields = {
  main: Field[]
  og: Field[]
  schema: Field[]
  twitter: Field[]
}

function seoGroupField(
  previewField: Field | null,
  analysisField: Field,
  schemaFields: Field[],
  aiFields: SeoAiTabFields,
): Field {
  return {
    name: 'seo',
    type: 'group',
    fields: [
      {
        type: 'tabs',
        tabs: [
          {
            fields: [
              {
                name: 'metaTitle',
                type: 'text',
                label: 'Meta Title',
                validate: validateMetaTitle,
              },
              {
                name: 'metaDescription',
                type: 'textarea',
                label: 'Meta Description',
                validate: validateMetaDescriptionField,
              },
              {
                name: 'canonical',
                type: 'text',
                admin: {
                  description:
                    'Absolute URL. Defaults to site URL + slug when empty.',
                },
                label: 'Canonical URL',
              },
              {
                name: 'robots',
                type: 'group',
                fields: [
                  ...robotsCheckboxes,
                  {
                    name: 'unavailableAfter',
                    type: 'text',
                    label: 'Unavailable After (RFC 822 date)',
                  },
                ],
                label: 'Robots',
              },
              ...aiFields.main,
            ],
            label: 'Content',
          },
          {
            fields: [
              { name: 'ogTitle', type: 'text', label: 'OG Title' },
              {
                name: 'ogDescription',
                type: 'textarea',
                label: 'OG Description',
              },
              {
                name: 'ogImage',
                type: 'upload',
                filterOptions: {
                  mimeType: { like: 'image' },
                },
                label: 'OG Image',
                relationTo: 'media',
              },
              ...aiFields.og,
            ],
            label: 'OpenGraph',
          },
          {
            fields: [
              {
                name: 'twitterCard',
                type: 'select',
                defaultValue: 'summary_large_image',
                label: 'Card Type',
                options: ['summary', 'summary_large_image'],
              },
              { name: 'twitterSite', type: 'text', label: 'Twitter Site' },
              {
                name: 'twitterCreator',
                type: 'text',
                label: 'Twitter Creator',
              },
              { name: 'twitterTitle', type: 'text', label: 'Twitter Title' },
              {
                name: 'twitterDescription',
                type: 'textarea',
                label: 'Twitter Description',
              },
              {
                name: 'twitterImage',
                type: 'upload',
                filterOptions: {
                  mimeType: { like: 'image' },
                },
                label: 'Twitter Image',
                relationTo: 'media',
              },
              ...aiFields.twitter,
            ],
            label: 'Twitter',
          },
          {
            fields: [
              {
                name: 'hreflang',
                type: 'array',
                fields: [
                  { name: 'language', type: 'text', label: 'Language' },
                  { name: 'url', type: 'text', label: 'URL' },
                ],
                label: 'Hreflang Alternates',
              },
              {
                name: 'includeInSitemap',
                type: 'checkbox',
                defaultValue: true,
                label: 'Include in Sitemap',
              },
              {
                name: 'sitemapPriority',
                type: 'number',
                admin: {
                  description: '0–1, steps of 0.1',
                },
                label: 'Sitemap Priority',
                max: 1,
                min: 0,
              },
              {
                name: 'sitemapChangefreq',
                type: 'select',
                label: 'Sitemap Change Frequency',
                options: [
                  'always',
                  'hourly',
                  'daily',
                  'weekly',
                  'monthly',
                  'yearly',
                  'never',
                ],
              },
            ],
            label: 'Advanced',
          },
          {
            fields: [
              {
                name: 'schemaType',
                type: 'select',
                label: 'Schema Type',
                options: [
                  { label: 'None', value: '' },
                  'Article',
                  'Product',
                  'FAQPage',
                  'HowTo',
                  'Event',
                  'Recipe',
                  'VideoObject',
                ],
              },
              {
                name: 'faq',
                type: 'array',
                admin: {
                  condition: (_, siblingData) =>
                    siblingData?.schemaType === 'FAQPage',
                },
                fields: [
                  { name: 'question', type: 'textarea', label: 'Question' },
                  { name: 'answer', type: 'textarea', label: 'Answer' },
                ],
                label: 'FAQ',
              },
              {
                name: 'rawJsonLd',
                type: 'textarea',
                admin: {
                  description:
                    'Optional raw JSON-LD injected verbatim in addition to the generated schema.',
                },
                label: 'Raw JSON-LD',
              },
              ...schemaFields,
              ...aiFields.schema,
            ],
            label: 'Schema',
          },
          {
            fields: [...(previewField ? [previewField] : []), analysisField],
            label: 'Preview',
          },
        ],
      },
    ],
    label: 'SEO',
  }
}
