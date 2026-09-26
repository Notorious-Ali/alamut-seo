import type { NextMetadata } from '@power-seo/meta'

import { createMetadata } from '@power-seo/meta'
import { toNextRedirects } from '@power-seo/redirects'
import React from 'react'

import type { AlamutSeoConfig } from '../types.js'

export { toNextRedirects }
export { renderJsonLd } from '../features/schema.js'
export {
  getRobotsTxt,
  getSitemapIndexXml,
  getSitemapXml,
} from '../features/sitemap.js'
import type { TrackingGlobalData } from '../features/tracking.js'

import { getTrackingScriptConfigs } from '../features/tracking.js'
import { getSeoConfigForDoc } from '../util/seo-config.js'

/**
 * Server component: renders the tracking `<script>` tags configured in the
 * `seo-tracking` global. Place it in the host app's root layout `<head>`.
 */
export function TrackingScripts(props: { data: TrackingGlobalData }): React.ReactElement {
  const scripts = getTrackingScriptConfigs(props.data)

  return React.createElement(
    React.Fragment,
    null,
    scripts.map((script) =>
      React.createElement('script', {
        id: script.id,
        async: script.async ?? undefined,
        dangerouslySetInnerHTML: script.innerHTML ? { __html: script.innerHTML } : undefined,
        defer: script.defer ?? undefined,
        key: script.id,
        src: script.src,
      }),
    ),
  )
}

/**
 * Host-side helper: build Next.js `metadata` from a document's `seo` group.
 * Intended for App Router `generateMetadata` in the host application.
 */
export function generateSeoMetadata(args: {
  doc: Record<string, unknown>
  pluginOptions: AlamutSeoConfig
}): NextMetadata {
  return createMetadata(
    getSeoConfigForDoc(args.doc, { options: args.pluginOptions }),
  )
}
