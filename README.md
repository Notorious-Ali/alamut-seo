# alamut-seo

**Alamut SEO** — full SEO suite for [Payload 3](https://payloadcms.com) by [AliMorbid](https://almut.ir).

Adds an SEO field group (meta, OpenGraph, Twitter, schema, sitemap directives), content/readability/image analysis, AI-assisted copy generation, sitemap + robots routes, redirect management, analytics dashboard views, and keyword research to host Payload applications. Built on the `@power-seo` package family.

## Install

```bash
pnpm add alamut-seo
```

Requires Node `>= 24.15.0`, pnpm, and Payload `^3.82.1`. The `@power-seo/*` engine packages install automatically; `@power-seo/react` is not needed (Payload 3 hosts are Next.js App Router apps — see [docs/INSTALLATION.md](docs/INSTALLATION.md)).

## Quick start

```ts
import { buildConfig } from 'payload'
import { alamutSeo } from 'alamut-seo'

export default buildConfig({
  // ...
  plugins: [
    alamutSeo({
      siteUrl: 'https://your-site.com',
      collections: { posts: true }, // gains the `seo` field group
    }),
  ],
})
```

Env vars are **optional** — only AI, Search Console, Semrush, and Ahrefs need credentials, and those features degrade gracefully (`503`) until configured; `siteUrl` can be passed as an option instead of `ALAMUT_SITE_URL`. See the [env var table](docs/INSTALLATION.md#environment-variables). (`dev/.env.example` is only for developing this plugin's demo app — plugin users don't need it.)

## Documentation

- [Installation](docs/INSTALLATION.md) — requirements, setup, env vars, host-side wiring
- [Configuration reference](docs/CONFIGURATION.md) — every option, default, and export
- [API endpoints](docs/ENDPOINTS.md) — routes, auth, request/response shapes, admin views

## Setup (development)

```bash
pnpm install
copy dev\.env.example dev\.env
pnpm mongo   # one-time per session: starts local MongoDB (data in dev/.mongo-data)
pnpm dev
```

Admin panel: http://localhost:3000/admin (`dev@almut.ir` / `test`).

## Integrations

### meta (`@power-seo/meta`)

Opt in with `collections: { posts: true }`. Every opted-in collection gains an `seo` field group (tabs: Content, OpenGraph, Twitter, Advanced, Schema, Preview) storing meta title/description, canonical, robots directives, OG/Twitter card fields, hreflang alternates, and sitemap directives. Titles/descriptions are validated with `@power-seo/core` SERP pixel limits.

Host frontends map a document to Next.js metadata via the `alamut-seo/next` subpath:

```ts
import { generateSeoMetadata } from 'alamut-seo/next'

export async function generateMetadata({ params }) {
  const doc = await payload.findByID({ collection: 'posts', id: params.id })
  return generateSeoMetadata({ doc, pluginOptions })
}
```

Options: `siteUrl`, `meta: { siteName, titleTemplate }`. Env: `ALAMUT_SITE_URL` (fallback).

### preview

Edit views on opted-in collections render a live SERP / OpenGraph / Twitter preview panel fed from form state. The panel is a Payload-themed implementation (`src/components/SeoPreviewPanel.tsx`) that follows the admin light/dark scheme; it deliberately does not use `@power-seo/preview/react`, whose inline styles are hardcoded light-theme.

Options: `preview: { enabled }` (default `true`).

### content-analysis (`@power-seo/content-analysis`)

`POST /api/seo/analyze` (admin-only) — body `{ collection, id, content?, focusKeyphrase? }`; analyzes the document's Lexical content and returns scored `AnalysisResult`s. The admin analysis panel (Preview tab) calls it with one click.

Options: `contentAnalysis: { enabled }` (default `true`). Also requires the document's `content` (richText) field or an explicit `content` override.

### readability (`@power-seo/readability`)

The same `/api/seo/analyze` response includes `readability` (Flesch reading ease, grade, per-check results, recommendations), rendered in the admin analysis panel (Preview tab).

Options: `readability: { enabled }` (default `true`).

### schema (`@power-seo/schema`)

Each document picks a schema type in the SEO group's Schema tab (`Article`, `Product`, `FAQPage`, `HowTo`, `Event`, `Recipe`, `VideoObject`) plus optional FAQ rows and raw JSON-LD. The admin Schema panel builds JSON-LD from the form state and validates it via `POST /api/seo/schema/validate` (admin-only; body `{ schema }` → `{ valid, issues }`).

Host frontends render the generated JSON-LD through the `alamut-seo/next` subpath:

```ts
import { renderJsonLd } from 'alamut-seo/next'

<script type="application/ld+json" dangerouslySetInnerHTML={renderJsonLd(doc, { options: pluginOptions }) ?? undefined} />
```

Options: `schema: { enabled }` (default `true`).

### ai (`@power-seo/ai`)

Opt-in (`ai: { enabled: true }`, default off). Four admin-only endpoints (`POST /api/seo/ai/{title,description,suggestions,serp}`) driven by a built-in client supporting **OpenAI, Anthropic, Z.ai (GLM), DeepSeek, Grok (x.ai), and OpenRouter**. Pick the provider with `ai: { provider }` or just set `ALAMUT_AI_PROVIDER` in env; override the model with `ALAMUT_AI_MODEL` (e.g. `glm-5.3-flash`); API keys come from `ALAMUT_<PROVIDER>_API_KEY` (e.g. `ALAMUT_ANTHROPIC_API_KEY`, `ALAMUT_ZAI_API_KEY`, `ALAMUT_DEEPSEEK_API_KEY`, `ALAMUT_GROK_API_KEY`, `ALAMUT_OPENROUTER_API_KEY`) or can be injected directly:

```ts
alamutSeo({
  ai: {
    enabled: true,
    provider: 'anthropic',     // or 'openai' (default), 'zai', 'deepseek', 'grok', 'openrouter'
    // apiKey: 'sk-...',       // optional; else ALAMUT_ANTHROPIC_API_KEY
    // baseUrl: '...',         // optional; else provider default
    // model: 'claude-sonnet-4-5', // optional; else provider default
    // llm: myLlmClient,       // fully custom: (prompt: PromptTemplate) => Promise<string>
  },
})
```

Per-provider defaults (base URL + model): `openai` → `https://api.openai.com/v1` / `gpt-4o-mini` · `anthropic` → `https://api.anthropic.com/v1` / `claude-sonnet-4-5` · `zai` → `https://api.z.ai/api/paas/v4` / `glm-4.6` · `deepseek` → `https://api.deepseek.com/v1` / `deepseek-chat` · `grok` → `https://api.x.ai/v1` / `grok-3` · `openrouter` → `https://openrouter.ai/api/v1` / `openai/gpt-4o-mini` (vendor-prefixed ids). Non-Anthropic providers speak the OpenAI chat-completions protocol, so any compatible gateway works via `baseUrl`.

When enabled, AI panels appear in the SEO tabs: Content — *Generate with AI* fills the meta title/description fields and *AI suggestions* lists content improvements; OpenGraph / Twitter — *Generate with AI* fills the social title/description; Schema — *Suggest schema type* and *Draft FAQ* (writes FAQ rows). Backed by five admin-only endpoints (`POST /api/seo/ai/{title,description,suggestions,serp,generate}`).

### images (`@power-seo/images`)

Adds an `alt` text field to every upload collection and exposes `POST /api/seo/images` (admin-only) auditing alt text via `analyzeAltText`. The admin analysis panel (Preview tab) runs the audit over images found in the document's Lexical content.

Options: `images: { enabled }` (default `true`).

### sitemap (`@power-seo/sitemap`)

Public endpoints: `GET /api/seo/sitemap.xml` (URLs from every SEO-enabled collection — `/{collection}/{slug}`, slug `home` → `/`), `GET /api/seo/sitemap-index.xml`, and `GET /api/seo/robots.txt`. Hosts can instead render the files themselves via the `alamut-seo/next` helpers (`getSitemapXml`, `getSitemapIndexXml`, `getRobotsTxt`) — the dev app does this in `dev/app/(frontend)/{sitemap.xml,sitemap-index.xml,robots.txt}/route.ts`.

Options: `sitemap: { enabled }` (default `true`).

### redirects (`@power-seo/redirects`)

Adds the `seo-redirects` collection (`from`/`to`/`statusCode`: 301/302/307/308/410) and a **public** `GET /api/seo/redirects?path=/old` endpoint (the one deliberate exception to admin gating — middleware calls it unauthenticated): `{ destination, statusCode }` or 404. Dev middleware (`dev/middleware.ts`) demonstrates the pattern; hosts with Local API access can use `createRedirectResolver(payload)` from the feature module, or `toNextRedirects` from `alamut-seo/next` in `next.config`.

Options: `redirects: { enabled }` (default `true`).

### tracking (`@power-seo/tracking`)

Adds the `seo-tracking` global (admin, SEO group): GA4, Microsoft Clarity, Plausible, PostHog, Fathom — each with an `enabled` toggle and provider IDs. `getTrackingScriptConfigs(data)` turns the global into script-tag configs; hosts render them with the `TrackingScripts` server component from `alamut-seo/next` (see `dev/app/(frontend)/layout.tsx`).

Options: `tracking: { enabled }` (default `true`).

### search-console (`@power-seo/search-console`)

Five admin-only endpoints backed by an OAuth refresh-token GSC client (access-token cached until expiry): `GET /api/seo/gsc/{status,analytics,inspect,sitemaps}` and `POST /api/seo/gsc/sitemaps`. Unconfigured endpoints answer `503 { error: 'Search Console not configured' }`. Configure via `ALAMUT_GSC_CLIENT_ID`, `ALAMUT_GSC_CLIENT_SECRET`, `ALAMUT_GSC_REFRESH_TOKEN`, `ALAMUT_GSC_SITE_URL`. Adds an `/admin/seo/gsc` console view.

Options: `searchConsole: { enabled }` (default `true`).

### audit (`@power-seo/audit`)

Adds the `seo-audits` collection and an `afterChange` auto-audit hook on every SEO-enabled collection (recursion-guarded via `req.context.seoAuditRun`). `POST /api/seo/audit/run { collection, id }` audits a document now; `GET /api/seo/audit?collection&limit` lists stored audits. Host helper: `runAudit(payload, collection, id, pluginOptions)`.

Options: `audit: { enabled }` (default `true`).








### analytics (`@power-seo/analytics`)

Aggregates stored audits (+ GSC data when configured) into a dashboard dataset. `GET /api/seo/analytics` returns the overview JSON; the client view at `/admin/seo/analytics` renders it, and a dashboard card links to it.

Options: `analytics: { enabled }` (default `true`).

### links (`@power-seo/links`)

Builds an internal link graph from every SEO-enabled collection's Lexical content. `GET /api/seo/links` (admin-only) returns nodes, orphan pages, link equity, and cross-link suggestions; the view lives at `/admin/seo/links`. Host helper: `buildLinksReport(payload, pluginOptions)`.

Options: `links: { enabled }` (default `true`).

### integrations (`@power-seo/integrations`)

Keyword research and backlink profiles via Semrush (`ALAMUT_SEMRUSH_API_KEY`) and Ahrefs (`ALAMUT_AHREFS_API_TOKEN`). `GET /api/seo/keywords?domain=` and `GET /api/seo/backlinks?domain=` (admin-only, `503` when unconfigured); view at `/admin/seo/keywords`.

Options: `integrations: { enabled }` (default `true`).

## Admin UI architecture

Admin client components (field UIs, analytics dashboard) are exported from `alamut-seo/client`; server views (Search Console, keywords, links) from `alamut-seo/rsc`; host Next.js helpers (`generateSeoMetadata`, `renderJsonLd`, `TrackingScripts`, sitemap/robots builders, `toNextRedirects`) from `alamut-seo/next`. All components style exclusively with Payload theme CSS variables so they follow the admin light/dark scheme.

## License

[MIT](LICENSE)
