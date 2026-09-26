import type { PromptTemplate } from '@power-seo/ai'
import type { PayloadHandler, PayloadRequest } from 'payload'

import {
  analyzeSerpEligibility,
  buildContentSuggestionsPrompt,
  buildMetaDescriptionPrompt,
  buildSerpPredictionPrompt,
  buildTitlePrompt,
  parseContentSuggestionsResponse,
  parseMetaDescriptionResponse,
  parseSerpPredictionResponse,
  parseTitleResponse,
} from '@power-seo/ai'

import type { PluginContext } from '../types.js'

import { requireAdmin } from '../util/access.js'
import { extractTextFromLexical } from '../util/lexical.js'

type GenerateBody = {
  collection?: string
  content?: string
  focusKeyphrase?: string
  id?: number | string
  schema?: string[]
  tone?: string
}

type DocContext = {
  content: string
  title: string
}

function errorResponse(error: unknown): Response {
  return Response.json(
    { error: error instanceof Error ? error.message : 'AI request failed' },
    { status: 500 },
  )
}

async function resolveDocContext(
  req: PayloadRequest,
  body: GenerateBody,
): Promise<DocContext> {
  if (!body.collection || !body.id) {
    if (!body.content) {
      throw new Error('collection and id are required when content is omitted')
    }

    return { content: body.content, title: body.focusKeyphrase ?? '' }
  }

  const doc = (await req.payload.findByID({
    id: body.id,
    collection: body.collection,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>

  return {
    content: body.content ?? extractTextFromLexical(doc.content),
    title: typeof doc.title === 'string' ? doc.title : '',
  }
}

/**
 * POST /api/seo/ai/title — generates meta title candidates.
 */
export function createAiTitleEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    try {
      const body = ((await req.json?.()) ?? {}) as GenerateBody
      const doc = await resolveDocContext(req, body)
      const prompt = buildTitlePrompt({
        content: doc.content,
        focusKeyphrase: body.focusKeyphrase,
        tone: body.tone,
      })
      const response = await ctx.llm?.(prompt)

      return Response.json({ titles: parseTitleResponse(response ?? '') })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * POST /api/seo/ai/description — generates a meta description.
 */
export function createAiDescriptionEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    try {
      const body = ((await req.json?.()) ?? {}) as GenerateBody
      const doc = await resolveDocContext(req, body)
      const prompt = buildMetaDescriptionPrompt({
        content: doc.content,
        focusKeyphrase: body.focusKeyphrase,
        title: doc.title,
        tone: body.tone,
      })
      const response = await ctx.llm?.(prompt)

      return Response.json({
        description: parseMetaDescriptionResponse(response ?? ''),
      })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * POST /api/seo/ai/suggestions — generates content improvement suggestions.
 */
export function createAiSuggestionsEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    try {
      const body = ((await req.json?.()) ?? {}) as GenerateBody
      const doc = await resolveDocContext(req, body)
      const prompt = buildContentSuggestionsPrompt({
        content: doc.content,
        focusKeyphrase: body.focusKeyphrase,
        title: doc.title,
      })
      const response = await ctx.llm?.(prompt)

      return Response.json({
        suggestions: parseContentSuggestionsResponse(response ?? ''),
      })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * POST /api/seo/ai/serp — predicts SERP features. The deterministic part
 * (analyzeSerpEligibility) needs no LLM; the LLM refines the predictions.
 */
export function createAiSerpEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    try {
      const body = ((await req.json?.()) ?? {}) as GenerateBody
      const doc = await resolveDocContext(req, body)
      const input = {
        content: doc.content,
        schema: body.schema,
        title: doc.title || body.focusKeyphrase || '',
      }

      return Response.json({
        eligibility: analyzeSerpEligibility(input),
        predictions: parseSerpPredictionResponse(
          (await ctx.llm?.(buildSerpPredictionPrompt(input))) ?? '',
        ),
      })
    } catch (error) {
      return errorResponse(error)
    }
  }
}

type GenerateTarget = 'faq' | 'og' | 'schemaType' | 'twitter'

const GENERATABLE_SCHEMA_TYPES = [
  'Article',
  'Event',
  'FAQPage',
  'HowTo',
  'Product',
  'Recipe',
  'VideoObject',
]

const GENERATE_SYSTEM_PROMPT =
  'You are an SEO assistant. Reply with STRICT JSON only — no markdown fences, no commentary.'

function extractJsonObject(raw: string): Record<string, unknown> {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')

  if (start === -1 || end <= start) {
    throw new Error('AI response did not contain JSON')
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(raw.slice(start, end + 1))
  } catch {
    throw new Error('AI response contained invalid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AI response JSON was not an object')
  }

  // Parsed boundary object; members are validated per target below.
  return parsed as Record<string, unknown>
}

/**
 * POST /api/seo/ai/generate — generates OpenGraph/Twitter copy, a schema
 * type suggestion, or FAQ rows for the admin tab panels. Body:
 * { target: 'og'|'twitter'|'schemaType'|'faq', collection?, id?, content?, focusKeyphrase? }.
 */
export function createAiGenerateEndpoint(ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    try {
      const body = ((await req.json?.()) ?? {}) as { target?: string } & GenerateBody
      const target = body.target

      if (target !== 'faq' && target !== 'og' && target !== 'schemaType' && target !== 'twitter') {
        return Response.json(
          { error: 'target must be one of: faq, og, schemaType, twitter' },
          { status: 400 },
        )
      }

      const doc = await resolveDocContext(req, body)
      const focus = body.focusKeyphrase ? ` Focus keyword: ${body.focusKeyphrase}.` : ''
      const userPrompts: Record<GenerateTarget, string> = {
        faq: `Write 4 FAQ pairs answering real questions a reader has about this content. JSON shape: {"faq": [{"question": string, "answer": string}]} with 1-2 sentence answers.${focus} Content: ${doc.content}`,
        og: `Write an Open Graph title and description for this content. JSON shape: {"title": string (max 60 chars), "description": string (max 160 chars)}.${focus} Content: ${doc.content}`,
        schemaType: `Pick the single most fitting schema.org type for this content. JSON shape: {"schemaType": string} where the value is exactly one of: ${GENERATABLE_SCHEMA_TYPES.join(', ')}. Content: ${doc.content}`,
        twitter: `Write a Twitter card title and description for this content. JSON shape: {"title": string (max 60 chars), "description": string (max 160 chars)}.${focus} Content: ${doc.content}`,
      }
      const prompt: PromptTemplate = {
        maxTokens: 1000,
        system: GENERATE_SYSTEM_PROMPT,
        user: userPrompts[target],
      }
      const raw = (await ctx.llm?.(prompt)) ?? ''
      const json = extractJsonObject(raw)

      if (target === 'schemaType') {
        const value = typeof json.schemaType === 'string' ? json.schemaType : ''

        if (!GENERATABLE_SCHEMA_TYPES.includes(value)) {
          throw new Error(`AI suggested an unsupported schema type: ${value || '(none)'}`)
        }

        return Response.json({ schemaType: value })
      }

      if (target === 'faq') {
        if (!Array.isArray(json.faq)) {
          throw new Error('AI response was missing the faq array')
        }

        const faq = (json.faq as unknown[]).filter(
          (row): row is { answer: string; question: string } =>
            typeof row === 'object' &&
            row !== null &&
            'question' in row &&
            typeof row.question === 'string' &&
            'answer' in row &&
            typeof row.answer === 'string',
        ).slice(0, 5)

        if (faq.length === 0) {
          throw new Error('AI returned no usable FAQ rows')
        }

        return Response.json({ faq })
      }

      const title = typeof json.title === 'string' ? json.title : ''
      const description = typeof json.description === 'string' ? json.description : ''

      if (!title || !description) {
        throw new Error('AI response was missing title or description')
      }

      return Response.json({ description, title })
    } catch (error) {
      return errorResponse(error)
    }
  }
}
