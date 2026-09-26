import config from '@payload-config'
import type { Metadata } from 'next'
import { getPayload } from 'payload'
import React from 'react'

import { TrackingScripts } from 'alamut-seo/next'

import '../(payload)/custom.css'

export const metadata: Metadata = {
  title: 'alamut-seo dev frontend',
}

export default async function FrontendLayout({ children }: { children: React.ReactNode }) {
  const payload = await getPayload({ config })
  // Global is added at runtime by the plugin; generated types don't know it yet.
  const slug = 'seo-tracking' as never
  const tracking = await payload.findGlobal({ overrideAccess: true, slug })

  return (
    <html lang="en">
      <head>
        <TrackingScripts data={tracking} />
      </head>
      <body>{children}</body>
    </html>
  )
}
