# Installation

## Requirements

| Requirement | Version |
| --- | --- |
| Node.js | >= 24.15.0 |
| pnpm | ^9 / ^10 / ^11 |
| Payload | ^3.82.1 (peer dependency) |
| Next.js | App Router (Payload 3 host) |
| Database | Any Payload-supported adapter (plugin is adapter-agnostic) |

## Install

```bash
pnpm add alamut-seo
```

The `@power-seo/*` engine packages are installed automatically as dependencies — nothing else to add.

## Basic setup

Add the plugin to your Payload config and opt collections into SEO:

```ts
import { buildConfig } from 'payload'
import { alamutSeo } from 'alamut-seo'

export default buildConfig({
  // ...
  plugins: [
    alamutSeo({
      siteUrl: 'https://your-site.com',
      collections: {
        posts: true, // every slug you opt in gains the `seo` field group
      },
    }),
  ],
})
```

Every opted-in collection gets an `seo` field group with tabs: Content, OpenGraph, Twitter, Advanced, Schema, Preview (SERP/OG/Twitter preview + content/readability analysis panel). When `ai.enabled`, AI panels appear inside Content (meta title/description generation), OpenGraph, Twitter (social copy), and Schema (type suggestion + FAQ drafting).

## Environment variables

All variables use the `ALAMUT_` prefix. Every one is optional — features that need credentials answer `503 { error: '... not configured' }` until you set them.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `ALAMUT_SITE_URL` | meta, sitemap, redirects, schema | Canonical site URL (fallback for `siteUrl` option) |
| `ALAMUT_AI_PROVIDER` | ai | Provider selection without code changes: `openai` (default), `anthropic`, `zai`, `deepseek`, `grok`, `openrouter` |
| `ALAMUT_AI_BASE_URL` | ai | Base URL override for the selected provider (e.g. `https://api.z.ai/api/coding/paas/v4` for Coding Plan keys) |
| `ALAMUT_AI_MODEL` | ai | Model override for the selected provider (e.g. `glm-5.3-flash` for `zai`) |
| `ALAMUT_OPENAI_API_KEY` | ai (`openai`) | OpenAI API key |
| `ALAMUT_OPENAI_MODEL` | ai (`openai`) | Model id (default `gpt-4o-mini`) |
| `ALAMUT_OPENAI_BASE_URL` | ai (`openai`) | API base URL (default `https://api.openai.com/v1`) |
| `ALAMUT_ANTHROPIC_API_KEY` | ai (`anthropic`) | Anthropic API key (default model `claude-sonnet-4-5`) |
| `ALAMUT_ZAI_API_KEY` | ai (`zai`) | Z.ai API key (default model `glm-5.3`) |
| `ALAMUT_DEEPSEEK_API_KEY` | ai (`deepseek`) | DeepSeek API key (default model `deepseek-chat`) |
| `ALAMUT_GROK_API_KEY` | ai (`grok`) | x.ai API key (default model `grok-4.7`) |
| `ALAMUT_OPENROUTER_API_KEY` | ai (`openrouter`) | OpenRouter API key (models are vendor-prefixed, e.g. `openai/gpt-4o-mini`) |
| `ALAMUT_GSC_CLIENT_ID` | search-console | Google OAuth client id |
| `ALAMUT_GSC_CLIENT_SECRET` | search-console | Google OAuth client secret |
| `ALAMUT_GSC_REFRESH_TOKEN` | search-console | OAuth refresh token (access tokens are cached until expiry) |
| `ALAMUT_GSC_SITE_URL` | search-console | Search Console site URL (e.g. `sc-domain:example.com`) |
| `ALAMUT_SEMRUSH_API_KEY` | integrations | Semrush API key (keyword research) |
| `ALAMUT_AHREFS_API_TOKEN` | integrations | Ahrefs API token (backlink profiles) |

Copy-paste template (matches `dev/.env.example`):

```bash
ALAMUT_SITE_URL=https://your-site.com
ALAMUT_OPENAI_API_KEY=
ALAMUT_OPENAI_MODEL=gpt-4o-mini
ALAMUT_OPENAI_BASE_URL=https://api.openai.com/v1
ALAMUT_ANTHROPIC_API_KEY=
ALAMUT_ZAI_API_KEY=
ALAMUT_DEEPSEEK_API_KEY=
ALAMUT_GROK_API_KEY=
ALAMUT_OPENROUTER_API_KEY=
ALAMUT_GSC_CLIENT_ID=
ALAMUT_GSC_CLIENT_SECRET=
ALAMUT_GSC_REFRESH_TOKEN=
ALAMUT_GSC_SITE_URL=
ALAMUT_SEMRUSH_API_KEY=
ALAMUT_AHREFS_API_TOKEN=
```

## Host-side wiring (Next.js App Router)

The plugin registers its own API routes inside Payload. For the public frontend, use the `alamut-seo/next` helpers:

```ts
// app/posts/[slug]/page.tsx
import { generateSeoMetadata, renderJsonLd } from 'alamut-seo/next'

export async function generateMetadata({ params }) {
  const doc = await payload.findByID({ collection: 'posts', /* ... */ })
  return generateSeoMetadata({ doc, pluginOptions })
}
```

See the README's per-feature sections for sitemap/robots routes, redirects middleware, and tracking scripts.

## Notes

- `disabled: true` skips all behavior (endpoints, admin views, hooks) but still applies schema mutations, so database migrations stay consistent while the plugin is off.
- All admin-only endpoints are gated on authenticated admin users; the single public endpoint is `GET /api/seo/redirects` (middleware calls it unauthenticated).
- The `@power-seo/react` package is **not** needed: Payload 3 hosts are Next.js App Router apps, so metadata, JSON-LD, and script rendering are covered by `alamut-seo/next` server helpers.
