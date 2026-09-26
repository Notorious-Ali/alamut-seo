import { getRobotsTxt } from 'alamut-seo/next'
import { pluginOptions } from '../../../pluginOptions.js'

export async function GET(): Promise<Response> {
  return new Response(getRobotsTxt(pluginOptions), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
