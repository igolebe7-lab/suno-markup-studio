# Suno Markup Studio Architecture

## Current Shape

Suno Markup Studio is now an npm workspace monorepo:

```text
/
  apps/
    web/        React + Vite editor UI
    api/        Fastify REST API
  packages/
    shared/     Zod schemas and shared DTO types
  prisma/       PostgreSQL schema; sqlite/ is an optional VPS-specific schema
  deploy/       VPS service, backup, Caddy route fixture, and runbook
```

## Web App

`apps/web` owns the editor UX:

- tag library;
- style prompt editor;
- CodeMirror lyrics editor;
- validation/export panels;
- auth modal;
- cloud save/load controls.

The web app keeps the existing `localStorage` draft behavior. When authenticated, `persist()` also calls backend sync.

Key files:

- `apps/web/src/App.tsx` — app shell and UI components.
- `apps/web/src/stores/projectStore.ts` — editor state, auth state, project sync.
- `apps/web/src/lib/api.ts` — typed fetch client using `credentials: include`.
- `apps/web/src/domain/*` — pure prompt, lyrics, validation, export logic.
- `apps/web/src/data/officialTags.ts` — audited first-party vocabulary and scoped evidence, applied to the seed catalog without changing existing IDs. A glossary term is not proof of arbitrary bracket syntax. Custom tags cannot inherit official status.
- `apps/web/src/data/referenceCatalog.ts` — articles for every built-in tag, sources, current setting explanations, evidence filters and search. `components/ReferencePage.tsx` is a separate lazy-loaded screen, not a panel inside tag settings.
- `apps/web/src/domain/tagSettings.ts` — subject-specific profiles, configured plain-text output and a compatibility catalog for existing custom settings. Obsolete ambiguous fields are not offered for new custom tags.
- `apps/web/src/domain/validation.ts` — local nonblocking heuristics: bracket syntax, per-section directive conflicts, structure suggestions, known tags and positive Style/Exclude overlap. Sung words are excluded from directive analysis. This is not Suno execution validation.
- `docs/suno-2026-10-08/` — independent official glossary inventory and source/coverage audit. Unit tests enforce coverage and require evidence for every official badge.

## API

`apps/api` exposes a REST API:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET/POST/PATCH/DELETE /api/custom-tags[/:id]`

Auth uses opaque random tokens in httpOnly cookies. Token hashes are stored in the selected database. Passwords are hashed with Argon2. On the shared-IP VPS, cookies are scoped to `/suno/api`.

## Database

Prisma models:

- `User` — account and password hash.
- `RefreshToken` — hashed opaque session tokens.
- `Project` — user-owned Suno project with indexed scalar fields plus `projectJson`.
- `CustomTag` — account-owned tag definitions and settings.

The default `prisma/schema.prisma` and `prisma/migrations/` remain PostgreSQL-only for Render. The independent `prisma/sqlite/schema.prisma` and `prisma/sqlite/migrations/` are used only by the VPS release. Do not generate one provider's client for the other's deployment. `scripts/migrate-postgres-to-sqlite.mjs` copies users, projects, and custom tags after a write freeze and verifies content; refresh sessions are not copied.

Every project query is scoped by `userId`; a user cannot load/update/delete another user's project through API routes.

## Shared Contracts

`packages/shared/src/index.ts` contains Zod schemas and DTO types for:

- auth requests;
- project create/update requests;
- project responses;
- validation warnings;
- `SunoMarkupProject`.

Frontend and backend should use these contracts instead of duplicating request/response shapes.

## Commands

```bash
npm install
npm run prisma:migrate
npm run dev:api
npm run dev:web
npm test
npm run build
npm run e2e
npm run selfhost:build
npm run prisma:deploy:sqlite
```

`npm run e2e` disables startup auth probing because it tests editor behavior without requiring a running API.

The VPS variant serves the built web app under `/suno/` through the existing Family Caddy, proxies `/suno/api/*` to Suno's loopback Fastify service, and stores SQLite separately in `/var/lib/suno`. Do not change Family, WireGuard, or Amnezia units when updating Suno. See `deploy/SELFHOST.md` for preflight, backup, cutover, and rollback.
