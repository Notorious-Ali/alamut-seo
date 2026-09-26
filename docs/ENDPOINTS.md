# API endpoints

All endpoints are registered under the Payload API prefix (typically `/api`). Every endpoint is admin-gated via `requireAdmin` — unauthenticated callers get `401` — **except** `GET /seo/redirects`, which is deliberately public for middleware use.

## Content analysis

| Method | Path | Auth | Body / Query | Response |
| --- | --- | --- | --- | --- |
| POST | `/seo/analyze` | admin | `{ collection, id, content?, focusKeyphrase? }` | `{ contentAnalysis, readability? }` — `readability` omitted when `readability.enabled: false` |
| POST | `/seo/images` | admin | `{ images: ImageInfo[], focusKeyphrase? }` | alt-text audit result |

## Schema

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| POST | `/seo/schema/validate` | admin | `{ schema }` | `{ valid, issues }` |

## AI (opt-in: `ai: { enabled: true }`)

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| POST | `/seo/ai/title` | admin | document context | generated meta title |
| POST | `/seo/ai/description` | admin | document context | generated meta description |
| POST | `/seo/ai/suggestions` | admin | document context | content improvement suggestions |
| POST | `/seo/ai/serp` | admin | document context | SERP preview copy |
| POST | `/seo/ai/generate` | admin | `{ target: 'og'\|'twitter'\|'schemaType'\|'faq', collection?, id?, content?, focusKeyphrase? }` | tab-targeted copy: `{ title, description }` (og/twitter), `{ schemaType }`, or `{ faq: [...] }` |

## Sitemap / robots (public)

| Method | Path | Auth | Response |
| --- | --- | --- | --- |
| GET | `/seo/sitemap.xml` | public | XML sitemap of opted-in collections |
| GET | `/seo/sitemap-index.xml` | public | sitemap index |
| GET | `/seo/robots.txt` | public | robots.txt |

## Redirects

| Method | Path | Auth | Query | Response |
| --- | --- | --- | --- | --- |
| GET | `/seo/redirects` | **public** (middleware contract) | `?path=/old` | `{ destination, statusCode }` or `404` |

## Search Console (admin; `503` when unconfigured)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/seo/gsc/status` | configuration status |
| GET | `/seo/gsc/analytics` | search analytics |
| GET | `/seo/gsc/inspect` | URL inspection |
| GET | `/seo/gsc/sitemaps` | list sitemaps |
| POST | `/seo/gsc/sitemaps` | submit sitemap |

## Audit

| Method | Path | Auth | Body / Query | Response |
| --- | --- | --- | --- | --- |
| POST | `/seo/audit/run` | admin | `{ collection, id }` | runs audit now, stores in `seo-audits` |
| GET | `/seo/audit` | admin | `?collection&limit` | latest stored audits |

## Analytics / links / integrations

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/seo/analytics` | admin | dashboard dataset (audits + GSC when configured) |
| GET | `/seo/links` | admin | link graph: `nodes`, `orphans`, `equity`, `suggestions`, totals |
| GET | `/seo/keywords?domain=` | admin | Semrush keyword research; `503` without `ALAMUT_SEMRUSH_API_KEY` |
| GET | `/seo/backlinks?domain=` | admin | Ahrefs backlink profile; `503` without `ALAMUT_AHREFS_API_TOKEN` |

## Admin views

| Path | View |
| --- | --- |
| `/admin/seo/gsc` | Search Console console (server view) |
| `/admin/seo/analytics` | analytics dashboard (client view) |
| `/admin/seo/links` | internal link graph (server view) |
| `/admin/seo/keywords` | keyword research (server view) |

## Collections & globals added

| Slug | Kind | Feature |
| --- | --- | --- |
| `seo-redirects` | collection | redirects |
| `seo-audits` | collection | audit |
| `seo-tracking` | global | tracking |

These schema mutations are applied even when the plugin is `disabled: true`.
