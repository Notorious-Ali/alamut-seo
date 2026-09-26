import config from '@payload-config'
import { getPayload } from 'payload'

import { getSitemapXml } from 'alamut-seo/next'
import { pluginOptions } from '../../../pluginOptions.js'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const xml = await getSitemapXml(payload, pluginOptions)

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  })
}
