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
  prisma/       PostgreSQL schema
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

Auth uses opaque random tokens in httpOnly cookies. Token hashes are stored in PostgreSQL. Passwords are hashed with Argon2.

## Database

Prisma models:

- `User` — account and password hash.
- `RefreshToken` — hashed opaque session tokens.
- `Project` — user-owned Suno project with indexed scalar fields plus `projectJson`.

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
```

`npm run e2e` disables startup auth probing because it tests editor behavior without requiring a running API.
