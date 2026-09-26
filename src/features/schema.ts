import type { SchemaObject, SchemaValidationResult } from '@power-seo/schema'
import type { PayloadHandler } from 'payload'

import { toJsonLdString, validateSchema } from '@power-seo/schema'

import type { PluginContext } from '../types.js'

import { requireAdmin } from '../util/access.js'
import { buildSchemaForDoc } from '../util/schema-build.js'

type ValidateBody = {
  schema?: unknown
}

/**
 * POST /api/seo/schema/validate — validates a schema.org JSON-LD object.
 */
export function createSchemaValidateEndpoint(_ctx: PluginContext): PayloadHandler {
  return async (req) => {
    const unauthorized = requireAdmin(req)

    if (unauthorized) {
      return unauthorized
    }

    const body = ((await req.json?.()) ?? {}) as ValidateBody

    if (!body.schema || typeof body.schema !== 'object') {
      return Response.json(
        { error: 'schema object is required' },
        { status: 400 },
      )
    }

    // Outside-controlled JSON — validateSchema performs the actual shape check.
    const candidate = body.schema as SchemaObject
    const result: SchemaValidationResult = validateSchema(candidate)

    return Response.json(result)
  }
}

/**
 * Builds the JSON-LD `<script>` body for a document, or null when the
 * document has no schema type selected.
 */
export function renderJsonLd(
  doc: Record<string, unknown>,
  ctx: PluginContext,
): { __html: string } | null {
  const schema = buildSchemaForDoc(doc, ctx)

  if (!schema) {
    return null
  }

  return { __html: toJsonLdString(schema) }
}
