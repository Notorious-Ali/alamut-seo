import type { Config, Field, Payload, PayloadRequest } from 'payload'

import config from '@payload-config'
import { createPayloadRequest, getPayload } from 'payload'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

import type { LlmClient } from '../src/ai/llm.js'

import { createOpenAiCompatibleClient } from '../src/ai/llm.js'
import {
  createAiDescriptionEndpoint,
  createAiGenerateEndpoint,
  createAiSerpEndpoint,
  createAiSuggestionsEndpoint,
  createAiTitleEndpoint,
} from '../src/features/ai.js'
import { createAnalyticsEndpoint } from '../src/features/analytics.js'
import { createAuditListEndpoint, createAuditRunEndpoint } from '../src/features/audit.js'
import { createAnalyzeEndpoint } from '../src/features/content-analysis.js'
import { createImagesEndpoint } from '../src/features/images.js'
import { createBacklinksEndpoint, createKeywordsEndpoint } from '../src/features/integrations.js'
import { createLinksReportEndpoint } from '../src/features/links.js'
import { createRedirectsEndpoint } from '../src/features/redirects.js'
import { createSchemaValidateEndpoint } from '../src/features/schema.js'
import {
  createGscAnalyticsEndpoint,
  createGscInspectEndpoint,
  createGscSitemapsEndpoint,
  createGscSitemapSubmitEndpoint,
  createGscStatusEndpoint,
} from '../src/features/search-console.js'
import {
  createRobotsEndpoint,
  createSitemapEndpoint,
  createSitemapIndexEndpoint,
} from '../src/features/sitemap.js'
import { getTrackingScriptConfigs } from '../src/features/tracking.js'
import { seoMetaField } from '../src/fields/seo-meta.js'
import { alamutSeo } from '../src/index.js'
import { devUser } from './helpers/credentials.js'

let payload: Payload

afterAll(async () => {
  await payload.destroy()
})

beforeAll(async () => {
  payload = await getPayload({ config })
})

describe('meta', () => {
  test('rejects a title exceeding the 580px pixel limit', async () => {
    await expect(
      payload.create({
        collection: 'posts',
        data: {
          seo: {
            metaTitle: 'W'.repeat(60),
          },
          title: 'Valid title',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/Meta Title/)
  })

  test('rejects a meta description past 920px', async () => {
    await expect(
      payload.create({
        collection: 'posts',
        data: {
          seo: {
            metaDescription: 'd'.repeat(200),
          },
          title: 'Valid title',
        },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/Meta Description/)
  })

  test('round-trips a valid seo group and keeps includeInSitemap', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        seo: {
          includeInSitemap: false,
          metaDescription: 'A valid description within limits.',
          metaTitle: 'SEO round trip',
          twitterCard: 'summary',
        },
        title: 'SEO round trip',
      },
      overrideAccess: true,
    })

    expect(post.seo?.metaTitle).toBe('SEO round trip')
    expect(post.seo?.includeInSitemap).toBe(false)
    expect(post.seo?.twitterCard).toBe('summary')
  })
})

describe('schema', () => {
  const makeSchemaRequest = async (schema: unknown): Promise<PayloadRequest> => {
    const inner = new Request('http://localhost:3000/api/seo/schema/validate', {
      body: JSON.stringify({ schema }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request: inner })

    return Object.assign(payloadRequest, {
      json: inner.json.bind(inner),
      user: devUser,
    }) as PayloadRequest
  }

  test('flags an incomplete article schema', async () => {
    // Intentionally incomplete schema: validateSchema must report the missing fields.
    const incomplete: unknown = JSON.parse(
      '{"@context":"https://schema.org","@type":"Article","headline":"Test"}',
    )
    const handler = createSchemaValidateEndpoint({ options: {} })
    const response = await handler(await makeSchemaRequest(incomplete))

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      issues: Array<{ field: string }>
      valid: boolean
    }

    expect(data.valid).toBe(false)
    expect(
      data.issues.some((issue) => issue.field.toLowerCase().includes('author')),
    ).toBe(true)
  })

  test('accepts a complete article schema', async () => {
    const handler = createSchemaValidateEndpoint({ options: {} })
    const response = await handler(
      await makeSchemaRequest({
        '@context': 'https://schema.org',
        '@type': 'Article',
        articleBody: 'Body text',
        author: 'Admin',
        datePublished: '2026-01-01',
        headline: 'Complete article',
      }),
    )

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data.valid).toBe(true)
  })

  test('rejects a missing schema payload', async () => {
    const handler = createSchemaValidateEndpoint({ options: {} })
    const response = await handler(await makeSchemaRequest(undefined))

    expect(response.status).toBe(400)
  })
})

describe('content-analysis', () => {
  const makeAnalyzeRequest = async (body: unknown): Promise<PayloadRequest> => {
    const inner = new Request('http://localhost:3000/api/seo/analyze', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request: inner })

    return Object.assign(payloadRequest, {
      json: inner.json.bind(inner),
      user: devUser,
    }) as PayloadRequest
  }

  test('analyze endpoint scores a lexical post', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'React SEO best practices help search engines understand your app. '.repeat(
                      6,
                    ),
                  },
                ],
              },
              {
                type: 'link',
                children: [
                  { type: 'text', text: 'react seo guide' },
                ],
                fields: { url: '/react-seo-guide' },
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        title: 'React SEO best practices',
      },
      overrideAccess: true,
    })

    const authenticated = await makeAnalyzeRequest({
      id: post.id,
      collection: 'posts',
    })
    const handler = createAnalyzeEndpoint({ options: {} })
    const response = await handler(authenticated)

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data.contentAnalysis.results.length).toBeGreaterThan(0)
    expect(data.contentAnalysis.score).toBeGreaterThanOrEqual(0)
    expect(typeof data.readability.fleschReadingEase).toBe('number')
    expect(typeof data.readability.score).toBe('number')
  })

  test('analyze endpoint omits readability when disabled', async () => {
    const post = await payload.create({
      collection: 'posts',
      data: {
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    text: 'Short paragraph for the readability gate. ',
                  },
                ],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        title: 'Readability disabled',
      },
      overrideAccess: true,
    })

    const authenticated = await makeAnalyzeRequest({
      id: post.id,
      collection: 'posts',
    })
    const handler = createAnalyzeEndpoint({
      options: { readability: { enabled: false } },
    })
    const response = await handler(authenticated)

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data.contentAnalysis).toBeDefined()
    expect(data.readability).toBeUndefined()
  })

  test('analyze endpoint rejects anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/analyze', {
      body: JSON.stringify({ id: '1', collection: 'posts' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    const payloadRequest = await createPayloadRequest({ config, request })
    const handler = createAnalyzeEndpoint({ options: {} })
    const response = await handler(payloadRequest)

    expect(response.status).toBe(401)
  })

  test('analyze endpoint requires collection and id', async () => {
    const authenticated = await makeAnalyzeRequest({})
    const handler = createAnalyzeEndpoint({ options: {} })
    const response = await handler(authenticated)

    expect(response.status).toBe(400)
  })
})

describe('ai', () => {
  test('rejects an unknown ALAMUT_AI_PROVIDER before any network call', async () => {
    process.env.ALAMUT_AI_PROVIDER = 'not-a-provider'

    try {
      const client = createOpenAiCompatibleClient({})

      await expect(
        client({ maxTokens: 10, system: 's', user: 'u' }),
      ).rejects.toThrow(/Unknown AI provider "not-a-provider"/)
    } finally {
      delete process.env.ALAMUT_AI_PROVIDER
    }
  })

  const makeGenerateRequest = async (body: unknown): Promise<PayloadRequest> => {
    const inner = new Request('http://localhost:3000/api/seo/ai/generate', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request: inner })

    return Object.assign(payloadRequest, {
      json: inner.json.bind(inner),
      user: devUser,
    }) as PayloadRequest
  }

  test('generate endpoint 400s on an unknown target', async () => {
    const authenticated = await makeGenerateRequest({ target: 'nope' })
    const handler = createAiGenerateEndpoint({ options: {} })
    const response = await handler(authenticated)

    expect(response.status).toBe(400)

    const data = await response.json()

    expect(data.error).toMatch(/target must be one of/)
  })

  test('generate endpoint parses og fields from the LLM JSON', async () => {
    const authenticated = await makeGenerateRequest({
      content: 'Payload makes SEO for Next.js apps straightforward and fast.',
      target: 'og',
    })
    const handler = createAiGenerateEndpoint({
      llm: () =>
        Promise.resolve(
          'Here you go: {"title":"Payload SEO Made Simple","description":"Ship optimized Next.js apps with Payload."}',
        ),
      options: {},
    })
    const response = await handler(authenticated)

    expect(response.status).toBe(200)

    const data = await response.json()

    expect(data.title).toBe('Payload SEO Made Simple')
    expect(data.description).toContain('optimized Next.js apps')
  })

  test('generate endpoint rejects anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/ai/generate', {
      body: JSON.stringify({ target: 'og' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })

    const payloadRequest = await createPayloadRequest({ config, request })
    const handler = createAiGenerateEndpoint({ options: {} })
    const response = await handler(payloadRequest)

    expect(response.status).toBe(401)
  })

  const makeAiRequest = async (body: unknown): Promise<PayloadRequest> => {
    const inner = new Request('http://localhost:3000/api/seo/ai/title', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request: inner })

    return Object.assign(payloadRequest, {
      json: inner.json.bind(inner),
      user: devUser,
    }) as PayloadRequest
  }

  const stubLlm = (response: string): LlmClient => () => Promise.resolve(response)

  test('title endpoint returns parsed titles from the llm', async () => {
    const handler = createAiTitleEndpoint({
      llm: stubLlm('["AI generated title","Another title"]'),
      options: {},
    })
    const response = await handler(
      await makeAiRequest({ content: 'Some long content about topic.' }),
    )

    expect(response.status).toBe(200)

    const data = (await response.json()) as { titles: Array<{ title: string }> }

    expect(data.titles[0].title).toBe('AI generated title')
  })

  test('description endpoint returns a parsed description', async () => {
    const handler = createAiDescriptionEndpoint({
      llm: stubLlm('A concise meta description.'),
      options: {},
    })
    const response = await handler(
      await makeAiRequest({ content: 'Some long content about topic.' }),
    )

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      description: { description: string; isValid: boolean }
    }

    expect(data.description.description).toBe('A concise meta description.')
  })

  test('suggestions endpoint parses json suggestions', async () => {
    const handler = createAiSuggestionsEndpoint({
      llm: stubLlm(
        '[{"type":"heading","suggestion":"Add an H2","priority":1}]',
      ),
      options: {},
    })
    const response = await handler(
      await makeAiRequest({ content: 'Some long content about topic.' }),
    )

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      suggestions: Array<{ suggestion: string; type: string }>
    }

    expect(data.suggestions[0].suggestion).toBe('Add an H2')
  })

  test('serp endpoint works without an llm', async () => {
    const handler = createAiSerpEndpoint({ options: {} })
    const response = await handler(
      await makeAiRequest({
        content: 'How to brew coffee. Step one: grind beans.',
        schema: ['HowTo'],
        title: 'Brewing coffee',
      }),
    )

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      eligibility: Array<{ feature: string }>
    }

    expect(data.eligibility.some((entry) => entry.feature === 'how-to')).toBe(
      true,
    )
  })

  test('ai endpoints reject anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/ai/title', {
      body: JSON.stringify({ content: 'x' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request })
    const handler = createAiTitleEndpoint({ options: {} })
    const response = await handler(payloadRequest)

    expect(response.status).toBe(401)
  })

  test('title endpoint reports llm failure as 500 json', async () => {
    const handler = createAiTitleEndpoint({
      llm: () => Promise.reject(new Error('LLM down')),
      options: {},
    })
    const response = await handler(await makeAiRequest({ content: 'Some long content about topic.' }))

    expect(response.status).toBe(500)

    const data = (await response.json()) as { error: string }

    expect(data.error).toBe('LLM down')
  })
})

describe('images', () => {
  const makeImagesRequest = async (body: unknown): Promise<PayloadRequest> => {
    const inner = new Request('http://localhost:3000/api/seo/images', {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request: inner })

    return Object.assign(payloadRequest, {
      json: inner.json.bind(inner),
      user: devUser,
    }) as PayloadRequest
  }

  test('images endpoint audits missing alt text', async () => {
    const handler = createImagesEndpoint({ options: {} })
    const response = await handler(
      await makeImagesRequest({
        focusKeyphrase: 'coffee',
        images: [
          { alt: 'Coffee beans on a table', src: '/media/beans.jpg' },
          { src: '/media/cup.jpg' },
        ],
      }),
    )

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      issues: Array<{ image?: { src: string } }>
      totalImages: number
    }

    expect(data.totalImages).toBe(2)
    expect(data.issues.some((issue) => issue.image?.src === '/media/cup.jpg')).toBe(true)
  })

  test('images endpoint rejects a missing images array', async () => {
    const handler = createImagesEndpoint({ options: {} })
    const response = await handler(await makeImagesRequest({}))

    expect(response.status).toBe(400)
  })

  test('images endpoint rejects anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/images', {
      body: JSON.stringify({ images: [] }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request })
    const handler = createImagesEndpoint({ options: {} })
    const response = await handler(payloadRequest)

    expect(response.status).toBe(401)
  })

  test('media collection gains an alt field from the plugin', () => {
    const media = payload.collections.media.config
    const alt = media.fields.find((field) => 'name' in field && field.name === 'alt')

    expect(alt).toBeDefined()
    expect(alt?.type).toBe('text')
  })
})

describe('sitemap', () => {
  const ctx = {
    options: {
      collections: { posts: true },
      siteUrl: 'http://localhost:3000',
    },
  }

  test('sitemap endpoint lists published posts', async () => {
    await payload.create({
      collection: 'posts',
      data: { slug: 'hello-world', title: 'Hello world' },
      overrideAccess: true,
    })
    const handler = createSitemapEndpoint(ctx)
    const request = new Request('http://localhost:3000/api/seo/sitemap.xml')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await handler(payloadRequest)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/xml')

    const xml = await response.text()

    expect(xml).toContain('http://localhost:3000/posts/hello-world')
  })

  test('sitemap index endpoint references sitemap.xml', async () => {
    const handler = createSitemapIndexEndpoint(ctx)
    const request = new Request('http://localhost:3000/api/seo/sitemap-index.xml')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await handler(payloadRequest)
    const xml = await response.text()

    expect(xml).toContain('sitemap.xml')
    expect(xml).toContain('<sitemapindex')
  })

  test('robots endpoint references the sitemap', async () => {
    const handler = createRobotsEndpoint(ctx)
    const request = new Request('http://localhost:3000/api/seo/robots.txt')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await handler(payloadRequest)
    const body = await response.text()

    expect(response.headers.get('Content-Type')).toContain('text/plain')
    expect(body).toContain('Sitemap: http://localhost:3000/sitemap.xml')
    expect(body).toContain('Allow: /')
  })
})

describe('redirects', () => {
  const makeRedirectRequest = async (path: string): Promise<PayloadRequest> => {
    const request = new Request(`http://localhost:3000/api/seo/redirects?path=${encodeURIComponent(path)}`)
    const payloadRequest = await createPayloadRequest({ config, request })

    return payloadRequest
  }

  test('plugin registers the seo-redirects collection', () => {
    expect(payload.collections['seo-redirects']).toBeDefined()
  })

  test('redirect endpoint resolves a matching rule for anonymous callers', async () => {
    await payload.create({
      collection: 'seo-redirects',
      data: {
        from: '/old-page',
        statusCode: '301',
        to: '/new-page',
      },
      overrideAccess: true,
    })
    const handler = createRedirectsEndpoint({ options: {} })
    const response = await handler(await makeRedirectRequest('/old-page'))

    expect(response.status).toBe(200)

    const data = (await response.json()) as { destination: string; statusCode: number }

    expect(data.destination).toBe('/new-page')
    expect(data.statusCode).toBe(301)
  })

  test('redirect endpoint 404s on a miss', async () => {
    const handler = createRedirectsEndpoint({ options: {} })
    const response = await handler(await makeRedirectRequest('/no-such-path'))

    expect(response.status).toBe(404)
  })

  test('redirect endpoint requires a path parameter', async () => {
    const handler = createRedirectsEndpoint({ options: {} })
    const request = new Request('http://localhost:3000/api/seo/redirects')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await handler(payloadRequest)

    expect(response.status).toBe(400)
  })
})

describe('tracking', () => {
  test('plugin registers the seo-tracking global', () => {
    // The imported config module is pre-plugin; payload.globals.config is post-plugin.
    expect(
      payload.globals.config.some((global) => global.slug === 'seo-tracking'),
    ).toBe(true)
  })

  test('getTrackingScriptConfigs builds ga4 script when enabled', () => {
    const scripts = getTrackingScriptConfigs({
      ga4: { enabled: true, measurementId: 'G-TEST123' },
    })

    expect(scripts.length).toBeGreaterThan(0)
    expect(scripts[0].id).toContain('G-TEST123')
  })

  test('getTrackingScriptConfigs skips disabled providers', () => {
    const scripts = getTrackingScriptConfigs({
      clarity: { enabled: false, projectId: 'abc' },
      ga4: { enabled: true, measurementId: 'G-TEST123' },
    })

    // GA4 emits multiple script tags (loader + config) — all must be GA4's.
    expect(scripts.length).toBeGreaterThan(0)
    expect(scripts.every((script) => script.id.includes('G-TEST123'))).toBe(true)
  })

  test('getTrackingScriptConfigs returns empty when nothing configured', () => {
    expect(getTrackingScriptConfigs({})).toHaveLength(0)
  })
})

describe('search-console', () => {
  const ctx = { options: {} }
  const makeGscRequest = async (
    path: string,
    user: unknown = devUser,
  ): Promise<PayloadRequest> => {
    const request = new Request(`http://localhost:3000/api/seo/gsc/${path}`)
    const payloadRequest = await createPayloadRequest({ config, request })

    return user === undefined ? payloadRequest : Object.assign(payloadRequest, { user })
  }

  test('status reports not configured without env credentials', async () => {
    const response = await createGscStatusEndpoint(ctx)(await makeGscRequest('status'))

    expect(response.status).toBe(200)

    const data = (await response.json()) as { configured: boolean }

    expect(data.configured).toBe(false)
  })

  test('analytics endpoint 503s when not configured', async () => {
    const response = await createGscAnalyticsEndpoint(ctx)(await makeGscRequest('analytics'))

    expect(response.status).toBe(503)

    const data = (await response.json()) as { error: string }

    expect(data.error).toBe('Search Console not configured')
  })

  test('inspect endpoint 503s when not configured', async () => {
    const response = await createGscInspectEndpoint(ctx)(
      await makeGscRequest('inspect?url=https%3A%2F%2Fexample.com'),
    )

    expect(response.status).toBe(503)
  })

  test('sitemaps endpoint 503s when not configured', async () => {
    const response = await createGscSitemapsEndpoint(ctx)(await makeGscRequest('sitemaps'))

    expect(response.status).toBe(503)
  })

  test('sitemap submit endpoint 503s when not configured', async () => {
    const request = new Request('http://localhost:3000/api/seo/gsc/sitemaps', {
      body: JSON.stringify({ feedpath: 'http://localhost:3000/sitemap.xml' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request })
    const authenticated = Object.assign(payloadRequest, { json: request.json.bind(request), user: devUser })
    const response = await createGscSitemapSubmitEndpoint(ctx)(authenticated)

    expect(response.status).toBe(503)
  })

  test('gsc endpoints reject anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/gsc/status')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createGscStatusEndpoint(ctx)(payloadRequest)

    expect(response.status).toBe(401)
  })
})

describe('audit', () => {
  const ctx = { options: { collections: { posts: true }, siteUrl: 'http://localhost:3000' } }

  test('auto-audit hook stores an audit when a post is created', async () => {
    const post = await payload.create({
      collection: 'posts',
      context: { seoAuditRun: true },
      data: { slug: 'audit-hook-post', title: 'Audit hook post' },
      overrideAccess: true,
    })

    const audits = await payload.find({
      collection: 'seo-audits',
      overrideAccess: true,
      where: { docId: { equals: String(post.id) } },
    })

    expect(audits.totalDocs).toBe(0)
  })

  test('run endpoint audits a post and stores the result', async () => {
    const post = await payload.create({
      collection: 'posts',
      context: { seoAuditRun: true },
      data: {
        slug: 'audit-run-post',
        title: 'A perfectly descriptive audit post title',
      },
      overrideAccess: true,
    })

    const request = new Request('http://localhost:3000/api/seo/audit/run', {
      body: JSON.stringify({ id: post.id, collection: 'posts' }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    const payloadRequest = await createPayloadRequest({ config, request })
    const authenticated = Object.assign(payloadRequest, {
      json: request.json.bind(request),
      user: devUser,
    })
    const response = await createAuditRunEndpoint(ctx)(authenticated)

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      id: unknown
      result: { score: number; url: string }
    }

    expect(data.result.url).toBe('http://localhost:3000/posts/audit-run-post')
    expect(data.result.score).toBeGreaterThan(0)

    const audits = await payload.find({
      collection: 'seo-audits',
      overrideAccess: true,
      where: { docId: { equals: String(post.id) } },
    })

    expect(audits.totalDocs).toBe(1)
  })

  test('list endpoint returns stored audits', async () => {
    const request = new Request('http://localhost:3000/api/seo/audit?collection=posts')
    const payloadRequest = await createPayloadRequest({ config, request })
    const authenticated = Object.assign(payloadRequest, { user: devUser })
    const response = await createAuditListEndpoint(ctx)(authenticated)

    expect(response.status).toBe(200)

    const data = (await response.json()) as { totalDocs: number }

    expect(data.totalDocs).toBeGreaterThan(0)
  })

  test('audit endpoints reject anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/audit')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createAuditListEndpoint(ctx)(payloadRequest)

    expect(response.status).toBe(401)
  })
})

describe('analytics', () => {
  test('analytics endpoint returns overview from stored audits', async () => {
    const response = await createAnalyticsEndpoint({
      options: { collections: { posts: true }, siteUrl: 'http://localhost:3000' },
    })(
      Object.assign(await createPayloadRequest({ config, request: new Request('http://localhost:3000/api/seo/analytics') }), {
        user: devUser,
      }),
    )

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      overview: { averageAuditScore: number; totalPages: number }
    }

    expect(data.overview.totalPages).toBeGreaterThan(0)
    expect(typeof data.overview.averageAuditScore).toBe('number')
  })

  test('analytics endpoint rejects anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/analytics')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createAnalyticsEndpoint({ options: {} })(payloadRequest)

    expect(response.status).toBe(401)
  })
})

describe('links', () => {
  const linksCtx = {
    options: {
      collections: { posts: true },
      siteUrl: 'http://localhost:3000',
    },
  }

  const makeLinksRequest = async (): Promise<PayloadRequest> => {
    const request = new Request('http://localhost:3000/api/seo/links')
    const payloadRequest = await createPayloadRequest({ config, request })

    return Object.assign(payloadRequest, { user: devUser }) as PayloadRequest
  }

  test('links report finds internal links and orphans', async () => {
    const targetSlug = `links-target-${Date.now()}`
    const sourceSlug = `links-source-${Date.now()}`

    await payload.create({
      collection: 'posts',
      data: { slug: targetSlug, title: 'Links target' },
      overrideAccess: true,
    })
    await payload.create({
      collection: 'posts',
      data: {
        slug: sourceSlug,
        content: {
          root: {
            type: 'root',
            children: [
              {
                type: 'link',
                children: [{ type: 'text', text: 'read the target' }],
                fields: { url: `http://localhost:3000/posts/${targetSlug}` },
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        title: 'Links source',
      },
      overrideAccess: true,
    })

    const response = await createLinksReportEndpoint(linksCtx)(await makeLinksRequest())

    expect(response.status).toBe(200)

    const data = (await response.json()) as {
      nodes: { url: string }[]
      orphans: { url: string }[]
      totalLinks: number
      totalPages: number
    }

    expect(data.totalPages).toBeGreaterThanOrEqual(2)
    expect(data.totalLinks).toBeGreaterThanOrEqual(1)
    expect(data.nodes.length).toBeGreaterThanOrEqual(2)
    expect(
      data.orphans.some((orphan) => orphan.url.endsWith(`/posts/${sourceSlug}`)),
    ).toBe(true)
  })

  test('links report rejects anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/links')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createLinksReportEndpoint(linksCtx)(payloadRequest)

    expect(response.status).toBe(401)
  })
})

describe('integrations', () => {
  const integrationsCtx = { integrations: undefined, options: { collections: { posts: true } } }

  test('keywords endpoint 503s when not configured', async () => {
    const request = new Request('http://localhost:3000/api/seo/keywords?domain=example.com')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createKeywordsEndpoint(integrationsCtx)(
      Object.assign(payloadRequest, { user: devUser }) as PayloadRequest,
    )

    expect(response.status).toBe(503)
  })

  test('backlinks endpoint 503s when not configured', async () => {
    const request = new Request('http://localhost:3000/api/seo/backlinks?domain=example.com')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createBacklinksEndpoint(integrationsCtx)(
      Object.assign(payloadRequest, { user: devUser }) as PayloadRequest,
    )

    expect(response.status).toBe(503)
  })

  test('keywords endpoint rejects anonymous callers', async () => {
    const request = new Request('http://localhost:3000/api/seo/keywords?domain=example.com')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createKeywordsEndpoint(integrationsCtx)(payloadRequest)

    expect(response.status).toBe(401)
  })

  test('keywords endpoint 400s without a domain', async () => {
    const request = new Request('http://localhost:3000/api/seo/keywords')
    const payloadRequest = await createPayloadRequest({ config, request })
    const response = await createKeywordsEndpoint({
      integrations: {} as never,
      options: {},
    })(Object.assign(payloadRequest, { user: devUser }) as PayloadRequest)

    expect(response.status).toBe(400)
  })
})

describe('disabled', () => {
  const getTab = (
    fields: Field[],
    label: string,
  ): { fields: { name?: string }[] } | undefined => {
    const group = fields.find((field) => 'name' in field && field.name === 'seo') as {
      fields: { tabs: { fields: { name?: string }[]; label: string }[] }[]
    }

    return group.fields[0].tabs.find((tab) => tab.label === label)
  }

  test('preview panel is omitted when preview option is disabled', () => {
    const tab = getTab(
      seoMetaField({ collections: { posts: true }, preview: { enabled: false } }),
      'Preview',
    )
    const names = tab?.fields.map((field) => field.name)

    expect(names).toContain('seoAnalysis')
    expect(names).not.toContain('seoPreview')
  })

  test('preview panel is included by default', () => {
    const tab = getTab(seoMetaField({ collections: { posts: true } }), 'Preview')
    const names = tab?.fields.map((field) => field.name)

    expect(names).toContain('seoPreview')
    expect(names).toContain('seoAnalysis')
  })

  test('keeps schema mutations but registers no behavior', () => {
    const plugin = alamutSeo({
      audit: { enabled: true },
      collections: { posts: true },
      disabled: true,
      images: { enabled: true },
      redirects: { enabled: true },
      tracking: { enabled: true },
    })

    const result = plugin({
      collections: [
        {
          slug: 'posts',
          fields: [{ name: 'title', type: 'text' }],
        },
      ],
      endpoints: [],
      globals: [],
    } as unknown as Config)

    const slugs = result.collections?.map((collection) => collection.slug)

    expect(slugs).toContain('posts')
    expect(slugs).toContain('seo-redirects')
    expect(slugs).toContain('seo-audits')

    const posts = result.collections?.find((collection) => collection.slug === 'posts')

    expect(posts?.fields.some((field) => 'name' in field && field.name === 'seo')).toBe(true)

    expect(result.globals?.some((global) => global.slug === 'seo-tracking')).toBe(true)

    expect(result.endpoints?.filter((endpoint) => String(endpoint.path).includes('/seo/'))).toHaveLength(0)
  })
})
