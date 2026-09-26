# Repository Guidelines

`alamut-seo` is a Payload 3 plugin (`package.json` name: `alamut-seo`) that adds SEO features to host Payload apps, built on the `@power-seo` package family (`../seopay/` monorepo, npm scope `@power-seo`, pinned `^1.0.19`).

**For any Payload-related work, read the skill at `.agents/skills/payload/SKILL.md` first.** Its `reference/` docs (`FIELDS.md`, `HOOKS.md`, `COLLECTIONS.md`, `ACCESS-CONTROL.md`, `QUERIES.md`, `ENDPOINTS.md`, `ADAPTERS.md`, `ADVANCED.md`, `PLUGIN-DEVELOPMENT.md`, `FIELD-TYPE-GUARDS.md`) are the authoritative patterns for fields, hooks, access control, and plugin development. Plugin-specific conventions below build on `reference/PLUGIN-DEVELOPMENT.md`.

## Project Overview

- Plugin goal: full SEO suite for Payload collections — meta field group, SERP/OG/Twitter preview, content/readability/image analysis, JSON-LD schema, AI copy generation, sitemap/robots routes, redirects, tracking, Search Console, audits, analytics dashboard, link graph, keyword research.
- **Current state:** all planned features are implemented and integrated — meta field group, preview (Payload-themed fork in `src/components/SeoPreviewPanel.tsx`), content-analysis, readability, schema, ai, images, sitemap, redirects, tracking, search-console, audit, analytics, links, integrations. `@power-seo/preview` and `@power-seo/react` are NOT dependencies (the preview is a fork; admin components and `alamut-seo/next` helpers are self-contained).
- Feature convention (as each feature lands): server wiring in `src/features/<name>.ts` (`apply<X>(config, ctx)`), endpoint factories `create<X>Endpoint(ctx): PayloadHandler` registered under `/seo/...`, client components via `src/exports/client.ts`, server views via `src/exports/rsc.ts`, host-facing Next helpers via `src/exports/next.ts` (subpath `alamut-seo/next`).
- Demo/test app lives in `dev/` (not published); the plugin itself ships from `src/` → `dist/`.

## Architecture & Data Flow

- Curried Payload plugin: `alamutSeo(pluginOptions: AlamutSeoConfig) => (config: Config) => Config` in `src/index.ts`.
- `AlamutSeoConfig` is extended in place as features land (`disabled`, `siteUrl`, `collections`, and one namespaced options key per feature: `meta`, `preview`, `contentAnalysis`, `readability`, `schema`, `ai`, `images`, `sitemap`, `redirects`, `tracking`, `searchConsole`, `audit`, `analytics`, `links`, `integrations`).
- The factory owns a `PluginContext` (options + singletons: `llm`, `gsc`, `semrush`, `ahrefs`) created once per config build, so token managers/rate limiters are not re-created per request.
- `disabled: true` must skip all behavior while keeping schema mutations (collections/fields) so DB migrations stay consistent.
- Client/RSC split: admin components must be exported from `src/exports/client.ts` (`'use client'`) or `src/exports/rsc.ts` (server), referenced as `alamut-seo/client#Name` / `alamut-seo/rsc#Name`, and resolved through the generated import map (`dev/app/(payload)/admin/importMap.js`). After adding components: `pnpm generate:importmap`.
- Endpoints: sitemap/robots (`sitemap.xml`, `sitemap-index.xml`, `robots.txt`) and `GET /seo/redirects` are public (crawlers and middleware); all other custom handlers gate on `requireAdmin(req)` (`src/util/access.ts`).
- Lexical content signals come from `src/util/lexical.ts` walkers (`extractTextFromLexical`, `extractLinksFromLexical`) — no richText HTML converters.
- Env vars use the `ALAMUT_` prefix (`ALAMUT_SITE_URL`, `ALAMUT_AI_PROVIDER`, `ALAMUT_AI_MODEL`, `ALAMUT_AI_BASE_URL`, `ALAMUT_OPENAI_API_KEY` / `ALAMUT_ANTHROPIC_API_KEY` / `ALAMUT_ZAI_API_KEY` / `ALAMUT_DEEPSEEK_API_KEY` / `ALAMUT_GROK_API_KEY` / `ALAMUT_OPENROUTER_API_KEY`, `ALAMUT_GSC_*`, `ALAMUT_SEMRUSH_API_KEY`, `ALAMUT_AHREFS_API_TOKEN`); the `@power-seo` packages never read env themselves — keys are constructor args.
- Dev app flow: `dev/payload.config.ts` (mongooseAdapter/MongoDB, `lexicalEditor`) registers `posts` + `media`, applies `alamutSeo(...)`, seeds `devUser` via `dev/seed.ts`, serves admin at `http://localhost:3000/admin`.

## Key Directories

- `src/` — published plugin source
  - `src/index.ts` — entry; `alamutSeo` factory, `AlamutSeoConfig`, config mutation + singleton context
  - `src/types.ts` — options/context types (as features land)
  - `src/features/` — per-feature server wiring (`apply<X>`)
  - `src/endpoints/` — endpoint handler factories
  - `src/fields/`, `src/components/`, `src/views/` — admin field group, client components, RSC views
  - `src/exports/` — `client.ts` / `rsc.ts` / `next.ts` barrels backing the `alamut-seo/client`, `alamut-seo/rsc`, `alamut-seo/next` subpath exports
  - `src/util/` — shared helpers (`access.ts`, `options.ts`, `lexical.ts`, ...)
- `dev/` — create-payload-app demo/test harness (Next.js App Router)
  - `dev/payload.config.ts`, `dev/seed.ts`, `dev/helpers/` (`testEmailAdapter.ts`, `credentials.ts`), `dev/app/**`, `dev/payload-types.ts` (generated, committed)
  - `dev/int.spec.ts` (Vitest), `dev/e2e.spec.ts` (Playwright)
- `.agents/skills/payload/` — Payload development skill + `reference/` docs (read before Payload work)

## Development Commands

Requires Node `>=24.15.0`, pnpm `^9 || ^10 || ^11` (enforced by `engines`).

```bash
pnpm install
copy dev\.env.example dev\.env   # REQUIRED before dev/test (Windows); set DATABASE_URL + PAYLOAD_SECRET

pnpm dev                    # next dev dev --turbo → http://localhost:3000 (admin: /admin)
pnpm build                  # copyfiles → tsc d.ts → swc ESM into dist/
pnpm lint                   # eslint (flat config)
pnpm lint:fix               # eslint ./src --fix
pnpm test                   # = pnpm test:int && pnpm test:e2e
pnpm test:int               # vitest (integration, in-process)
pnpm test:e2e               # playwright test (chromium; webServer spawns pnpm dev)
pnpm generate:types         # regen dev/payload-types.ts (only when dev server NOT running)
pnpm generate:importmap     # regen dev/app/(payload)/admin/importMap.js
pnpm clean                  # rimraf dist + tsbuildinfo
```

`main`/`types` point directly at `src/index.ts` — no build needed for dev/test; `pnpm build` matters only for publishing (`publishConfig` swaps to `dist/`).

## Code Conventions & Common Patterns

- **Formatting** (`.prettierrc.json`): `singleQuote`, no semicolons, `trailingComma: all`, `printWidth: 100`. ESLint flat config (`eslint.config.js`) extends `@payloadcms/eslint-config`.
- **ESM + NodeNext**: `"type": "module"`; use `.js` extensions in relative TS imports.
- **Type safety**: annotate extracted Payload constants with their types or `satisfies` (`CollectionConfig`, `Field`, `Plugin`, `PayloadHandler`, …) — unannotated literals widen and break discriminated unions. Import generated types from `dev/payload-types.ts` in the dev app.
- **Plugin mutation**: extend collections via `config.collections.map(...)` + spread; never clobber existing `hooks`, `endpoints`, or `onInit` — wrap/await and preserve arrays.
- **Hooks**: collection hooks for cross-document logic, field-level hooks for per-field compute (`virtual: true`); pass `req` into nested Local API calls for transaction atomicity; use `req.context` flags to prevent hook loops (skill `HOOKS.md`).
- **Access**: `overrideAccess: true` only for trusted system operations (seeding, internal finds); pass `user` + `overrideAccess: false` when operating on behalf of a user.
- **Import-map discipline**: every admin component referenced as `alamut-seo/client#X` or `alamut-seo/rsc#X` must be re-exported from `src/exports/client.ts`/`rsc.ts`; keep `dev/tsconfig.json` `paths` aliases (`alamut-seo`, `alamut-seo/client`, `alamut-seo/rsc`, `alamut-seo/next` → `../src/...`) in sync when adding subpath exports.
- **Never hand-edit** generated files: `dev/payload-types.ts`, `dev/app/(payload)/**` (banner: `THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD`). One known exception: `dev/app/(payload)/layout.tsx` was patched to drop `generatePayloadViewport` — that export does not exist in pinned `@payloadcms/next@3.82.1` (added in a later 3.x); re-adding it breaks dev boot.
- **Local dev DB**: `pnpm dev` needs `dev/.env` with a reachable `DATABASE_URL`. Tests don't (they boot `MongoMemoryReplSet` under `NODE_ENV=test`); the first test run downloads the MongoDB binary into `~/.cache/mongodb-binaries` — that download can exceed the default 30s vitest hook timeout; subsequent runs are fast. Failed/interrupted test runs leak `%TEMP%/mongo-mem-*` dbpath dirs (~0.3GB each) — if C: fills up (symptom: `Mongod internal error (fassert() failure)`), delete them.

## Important Files

| File | Role |
|---|---|
| `src/index.ts` | Plugin entry: `alamutSeo`, `AlamutSeoConfig`, config mutation + context singletons |
| `src/exports/client.ts` / `src/exports/rsc.ts` / `src/exports/next.ts` | Admin client barrel / server-view barrel / host Next helpers (`alamut-seo/next`) |
| `package.json` | Exports map (dev → `src/*.ts`, publish → `dist/` via `publishConfig`); scripts; `peerDependencies: { payload: ^3.82.1 }`; `dependencies` = `@power-seo/*` |
| `.swcrc` / `tsconfig.json` | SWC ESM build (esnext, automatic JSX runtime); root TS = declaration-only, NodeNext, strict |
| `dev/tsconfig.json` | `paths` self-aliases wiring the dev app to live `src/` + `@payload-config` |
| `dev/payload.config.ts` | Demo config: `posts`, `media` (upload), mongooseAdapter, lexicalEditor, `alamutSeo(...)` |
| `dev/.env.example` | `DATABASE_URL`, `PAYLOAD_SECRET`, `ALAMUT_*` vars (as features land) |
| `playwright.config.js` / `vitest.config.js` | Test runners (root); vitest loads env from `dev/.env` |
| `.agents/skills/payload/SKILL.md` | Payload development skill (read first for Payload work) |

## Runtime/Tooling Preferences

- pnpm only; Node >= 24.15.0; Windows host — use forward slashes in code/imports, backslashes only in raw shell `copy` commands.
- Stack: Payload `3.82.1` (peer `^3.82.1`), Next `16.3.3` (Turbopack dev, App Router), React `19`, TypeScript `6.0.3`, MongoDB via `@payloadcms/db-mongodb`.
- Dev runs from TS source (no compile step); `dist/` is build output only (`files: ["dist"]`), gitignored.
- Tests boot `MongoMemoryReplSet` automatically when `NODE_ENV=test` — no local Mongo needed for `pnpm test`.
- `@power-seo/*` integration: npm dependencies pinned `^1.0.19` (not file:/workspace links). React subpaths: `@power-seo/{schema,tracking,preview}/react`. Internal dep graph: everything → `core`; `audit` → `content-analysis` + `readability` + `schema`; `analytics` → `audit` + `core`.

## Testing & QA

- **Vitest** (`vitest.config.js`, node env, 30s timeouts): `dev/int.spec.ts` — in-process integration via `getPayload({ config })` with `@payload-config` alias; one `describe('<feature>')` block per integrated feature; destroys payload in `afterAll`.
- **Playwright** (`playwright.config.js`): `dev/e2e.spec.ts` — logs into `/admin` (`dev@almut.ir` / `test` from `dev/helpers/credentials.ts`), expects Dashboard. Chromium only, `webServer` spawns `pnpm dev` (reuses existing server), `baseURL http://localhost:3000`.
- CI: `.github/workflows/ci.yml` runs lint + integration tests + build on push/PR (no e2e in CI — Chromium + dev-server runtime cost, run locally).
- Extend the existing spec files for new behavior: server behavior → `dev/int.spec.ts`; admin UI → `dev/e2e.spec.ts`. Never weaken existing assertions to pass checks.

## DEVELOPER
AliMorbid
