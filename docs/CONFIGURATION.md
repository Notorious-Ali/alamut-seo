# Configuration reference

`alamutSeo(options: AlamutSeoConfig)` — full option surface. Every feature key takes `{ enabled?: boolean }` unless noted. Local-only features default to `enabled: true`; features that call external services default to `enabled: false` (AI) or are gated on credentials answering `503`.

## Top-level options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `disabled` | `boolean` | `false` | Skips all behavior (endpoints, admin views, hooks) while **keeping schema mutations** so DB migrations stay consistent |
| `siteUrl` | `string` | `ALAMUT_SITE_URL` | Canonical site URL, e.g. `https://example.com` |
| `collections` | `Partial<Record<CollectionSlug, true>>` | — | Collections that receive the `seo` field group and participate in sitemap/analysis/audit/link features |

## Feature options

| Key | Default | Registers | Details |
| --- | --- | --- | --- |
| `meta` | on | `seo` field group | `MetaOptions`: `siteName` (defaults to `siteUrl` host), `titleTemplate` |
| `preview` | on | Preview tab | Live SERP/OG/Twitter panel (Payload-themed fork). Set `enabled: false` to omit the tab |
| `contentAnalysis` | on | `POST /api/seo/analyze` | Lexical content scoring; needs a `content` richText field or explicit override |
| `readability` | on | part of analyze response | Flesch reading ease/grade + recommendations inside `/api/seo/analyze` output |
| `schema` | on | `POST /api/seo/schema/validate` + Schema tab | Article, Product, FAQPage, HowTo, Event, Recipe, VideoObject + raw JSON-LD |
| `ai` | **off** | `POST /api/seo/ai/{title,description,suggestions,serp,generate}` + per-tab AI panels | `AiOptions`: `provider` (`openai` \| `anthropic` \| `zai` \| `deepseek` \| `grok` \| `openrouter`; falls back to `ALAMUT_AI_PROVIDER`), `apiKey`, `baseUrl` (falls back to `ALAMUT_AI_BASE_URL`), `model` (falls back to `ALAMUT_AI_MODEL`), `llm` (custom `(prompt) => Promise<string>`). Keys resolve from `ALAMUT_<PROVIDER>_API_KEY` |
| `images` | on | `alt` field on upload collections + `POST /api/seo/images` | Alt-text audit |
| `sitemap` | on | `GET /api/seo/{sitemap.xml,sitemap-index.xml,robots.txt}` | URLs from opted-in collections (`/{collection}/{slug}`, slug `home` → `/`); respects `includeInSitemap`, `sitemapPriority`, `sitemapChangefreq` fields |
| `redirects` | on | `seo-redirects` collection + public `GET /api/seo/redirects` | `from`/`to`/`statusCode` (301/302/307/308/410); the one public endpoint (middleware contract) |
| `tracking` | on | `seo-tracking` global | GA4, Clarity, Plausible, PostHog, Fathom — editor-configured, rendered via `TrackingScripts` |
| `searchConsole` | on | `/admin/seo/gsc` view + 5 endpoints | Inactive (`503`) until GSC env vars are set |
| `audit` | on | `seo-audits` collection + auto-audit hook + run/list endpoints | AfterChange hook is recursion-guarded via `req.context.seoAuditRun` |
| `analytics` | on | `/admin/seo/analytics` view + `GET /api/seo/analytics` | Aggregates stored audits (+ GSC data when configured) |
| `links` | on | `/admin/seo/links` view + `GET /api/seo/links` | Internal link graph: nodes, orphans, equity, suggestions |
| `integrations` | on | `/admin/seo/keywords` view + keywords/backlinks endpoints | Inactive (`503`) until Semrush/Ahrefs keys are set |

## Example

```ts
alamutSeo({
  siteUrl: 'https://example.com',
  collections: { posts: true, pages: true },
  meta: { siteName: 'Example', titleTemplate: '%s — Example' },
  ai: { enabled: true, model: 'gpt-4o-mini' },
  integrations: { enabled: false }, // no Semrush/Ahrefs keys
})
```

## Exported API surface

| Entry point | Exports |
| --- | --- |
| `alamut-seo` | `alamutSeo` factory, `AlamutSeoConfig`, `PluginContext` types |
| `alamut-seo/client` | `SeoAiField`, `SeoAnalysisField`, `SeoAnalyticsPanel`, `SeoPreviewField`, `SeoSchemaField` |
| `alamut-seo/rsc` | `GscView`, `KeywordsView`, `LinksView` |
| `alamut-seo/next` | `generateSeoMetadata`, `renderJsonLd`, `TrackingScripts`, `getSitemapXml`, `getSitemapIndexXml`, `getRobotsTxt`, `toNextRedirects` |
