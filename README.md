# Suno Markup Studio

React/Vite editor for Suno-ready style prompts and lyrics markup, with Fastify backend accounts and per-user project persistence.

## Architecture

```text
apps/web           React + Vite + TypeScript frontend
apps/api           Fastify + Prisma backend
packages/shared    Shared Zod schemas and DTO types
prisma             PostgreSQL schema and migrations
vercel.json        Vercel frontend deployment config
render.yaml        Render API deployment blueprint
```

The web app keeps an offline `localStorage` draft. After login, projects can be saved to PostgreSQL through the API.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Configure local environment:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to a local PostgreSQL database or a hosted test database.

3. Create database tables and Prisma client:

```bash
npm run prisma:migrate
```

4. Run API and web app in two terminals:

```bash
npm run dev:api
npm run dev:web
```

Web: `http://127.0.0.1:5173`  
API health: `http://127.0.0.1:8787/api/health`

## Scripts

```bash
npm run dev:web          # Vite frontend
npm run dev:api          # Fastify API with tsx watch
npm run build            # shared + api + web production build
npm run build:web        # shared + web only
npm run build:api        # shared + api only
npm run start:api        # run compiled API: apps/api/dist/server.js
npm run test             # unit tests across workspaces
npm run e2e              # Playwright editor tests
npm run prisma:generate  # generate Prisma Client
npm run prisma:migrate   # local dev migration
npm run prisma:deploy    # production migration deploy
npm run prisma:studio    # Prisma Studio
```

## Production Environment

API variables:

```bash
DATABASE_URL="postgresql://..."
WEB_ORIGINS="https://your-suno-app.vercel.app"
NODE_ENV="production"
HOST="0.0.0.0"
COOKIE_SECURE="true"
COOKIE_SAME_SITE="none"
ACCESS_TOKEN_TTL_MS="900000"
REFRESH_TOKEN_TTL_MS="2592000000"
```

Frontend variables:

```bash
VITE_API_BASE_URL=""
```

For Vercel, keep `VITE_API_BASE_URL` empty and let `vercel.json` proxy `/api/*` to Render. This keeps auth cookies on the frontend origin and avoids third-party cookie issues in browsers. Set `VITE_API_BASE_URL` to the Render API origin only if you deliberately want direct cross-origin browser calls.

## Deploy Through GitHub, Render, Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "chore: prepare deploy"
git branch -M main
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

Codex should keep working through Git commits and pushes. Vercel/Render then deploy from GitHub.

### 2. Create PostgreSQL

Use Supabase, Render PostgreSQL, Neon, or another PostgreSQL provider.

Copy the connection string into `DATABASE_URL`. For Supabase, use a pooled connection string for app traffic when available.

### 3. Deploy API on Render

Option A: use `render.yaml` as a Blueprint.

Option B: create a Render Web Service manually:

```text
Root Directory: .
Runtime: Node
Build Command: npm ci && npm run render:build && npm run prisma:deploy
Start Command: npm run start:api
Health Check Path: /api/health
```

Render environment variables:

```text
NODE_ENV=production
DATABASE_URL=<postgres connection string>
WEB_ORIGINS=https://your-suno-app.vercel.app
HOST=0.0.0.0
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
ACCESS_TOKEN_TTL_MS=900000
REFRESH_TOKEN_TTL_MS=2592000000
```

After deploy, verify:

```bash
curl https://your-suno-api.onrender.com/api/health
```

Expected:

```json
{"ok":true}
```

### 4. Deploy Frontend on Vercel

Import the same GitHub repository into Vercel.

The root `vercel.json` sets:

```text
Install Command: npm ci
Build Command: npm run vercel:build
Output Directory: apps/web/dist
Framework: Vite
```

Set Vercel environment variable:

```text
VITE_API_BASE_URL=
```

After Vercel gives you the app URL, add it to Render:

```text
WEB_ORIGINS=https://your-suno-app.vercel.app
```

If you use Vercel preview deployments, add their origins too, comma-separated:

```text
WEB_ORIGINS=https://your-suno-app.vercel.app,https://your-branch-preview.vercel.app
```

### 5. Verify Production Auth

1. Open the Vercel app URL.
2. Register a test account.
3. Save a project.
4. Reload the page.
5. Login again and verify the project list loads.

If login succeeds but `/api/auth/me` returns unauthorized after reload, check:

```text
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
WEB_ORIGINS exactly matches the Vercel URL
VITE_API_BASE_URL is empty when using the root vercel.json rewrite
```

## Prisma Deploy Notes

Local development uses:

```bash
npm run prisma:migrate
```

Production deployment uses:

```bash
npm run prisma:deploy
```

`prisma:deploy` applies committed migration files from `prisma/migrations`. Do not run `prisma migrate dev` in Render production builds.

## Verification

Before pushing deploy changes:

```bash
npm test
npm run build
npm run e2e
```

`npm run e2e` starts only the web app with backend auth probing disabled. Full auth/project persistence QA requires running API + PostgreSQL.

## Backend Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

Auth uses opaque httpOnly cookie tokens stored in PostgreSQL. Passwords are hashed with Argon2.
