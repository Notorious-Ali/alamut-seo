import { getPayload } from 'payload'

import config from '@payload-config'

// Renders the newest post's meta title/description and JSON-LD via the
// plugin's host-facing helpers, proving the head integration end-to-end.
export default async function FrontendPage() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    limit: 1,
    overrideAccess: true,
    sort: '-createdAt',
  })

  const post = docs[0] as
    | {
        content?: unknown
        slug?: string
        title?: string
      }
    | undefined

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', margin: 32 }}>
      <h1>alamut-seo dev frontend</h1>
      {post ? (
        <>
          <h2>{post.title}</h2>
          <p>
            Slug: <code>{post.slug}</code>
          </p>
          <p>
            This page is crawled by the sitemap at{' '}
            <a href="/sitemap.xml">/sitemap.xml</a> and analyzed by the audit
            pipeline.
          </p>
        </>
      ) : (
        <p>No posts yet.</p>
      )}
    </main>
  )
}
