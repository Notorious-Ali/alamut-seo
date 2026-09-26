import type { PayloadRequest } from 'payload'

/**
 * Gate for custom endpoints. Returns a 401 Response when the caller is not
 * an authenticated admin, otherwise null (request may proceed).
 */
export function requireAdmin(req: PayloadRequest): null | Response {
  if (req.user) {
    return null
  }

  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
