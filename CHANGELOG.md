# Changelog

## 1.0.0 — 2026-09-27

Initial public release.

- `seo` field group on opted-in collections: meta title/description, canonical, robots directives, OpenGraph, Twitter cards, hreflang, sitemap directives, schema type + FAQ + raw JSON-LD
- Live SERP / OpenGraph / Twitter preview panel (Payload-themed, follows admin light/dark)
- Content, readability, and image alt-text analysis (`POST /api/seo/analyze`, `POST /api/seo/images`)
- JSON-LD schema builder + validation endpoint for Article, Product, FAQPage, HowTo, Event, Recipe, VideoObject
- AI-assisted copy generation (opt-in): meta title/description/suggestions/SERP copy plus tab-targeted generation — OpenGraph/Twitter social copy, schema-type suggestion, and FAQ drafting — via any OpenAI-compatible endpoint (providers: OpenAI, Anthropic, Z.ai, DeepSeek, Grok, OpenRouter)
- `sitemap.xml`, `sitemap-index.xml`, `robots.txt` routes + host-side helpers
- `seo-redirects` collection + public redirect-resolution endpoint for middleware
- `seo-tracking` global (GA4, Clarity, Plausible, PostHog, Fathom) + `TrackingScripts` host component
- Search Console console view (analytics, URL inspection, sitemaps) behind OAuth refresh-token env vars
- Auto-audit on document save + on-demand audits, stored in `seo-audits`
- Analytics dashboard aggregating audits + Search Console data
- Internal link graph report + keyword research/backlinks via Semrush/Ahrefs
- Host helpers under `alamut-seo/next`: `generateSeoMetadata`, `renderJsonLd`, `TrackingScripts`, sitemap/robots builders, `toNextRedirects`
