# AGENTS.md — Chouka (KiraKira) Gacha System

## Overview

Remix v2 SPA-like app on Cloudflare Pages. React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova style). D1 (SQLite), KV, R2 for data/caching/images.

Behavioral conventions in `CLAUDE.md` — read that too.

## Commands

```bash
npm run dev          # remix vite:dev (Vite HMR dev server)
npm run build        # remix vite:build → build/server/ + build/client/
npm run deploy       # npm run build && wrangler deploy
npm run typecheck    # tsc (noEmit, just type checking)
npm run start        # wrangler pages dev ./build/client (local preview with Functions)
```

- No test framework. No linting configured.
- D1 binding: `DB`, KV bindings: `KV_CACHE` / `RECENT_REQUESTS`, R2: `R2_BUCKET`.
- D1 migration: `npx wrangler d1 execute chouka --remote --file=./schema.sql`
- `.dev.vars` stores local secrets (`admin`, `GITHUB_TOKEN`, etc.) — gitignored.
- `.npmrc`: `legacy-peer-deps=true` (shadcn dependency resolution).

## Architecture

### Request flow

```
Browser → Cloudflare Pages
  /api/* → functions/_middleware.js (session + CORS) → functions/api/[[path]].js (API dispatch)
  /*     → functions/_middleware.js → functions/[[path]].js (Remix SSR via server build)
```

- **`functions/_middleware.js`**: global middleware — CORS preflight + parses `X-Session-Token` header, loads user from `KV_CACHE(session:{token})`, attaches to `context.data.currentUser`.
- **`functions/api/[[path]].js`**: monolithic API router. Routes matched by `path.startsWith()` + string compare. Services instantiated per-request: `new UserService(env, ctx)`, `new GachaService(env, ctx, userService)`.
- **`functions/[[path]].js`**: Remix server entry — imports `build/server/index.js`, calls `createPagesFunctionHandler()`.
- **`load-context.ts`**: injects `env`/`ctx` into Remix `AppLoadContext` for server `loader` functions.
- **Dead code warning**: `functions/api/admin.js`, `showcase.js`, `library.js`, `changelog.js`, `announcement.js` are **not used** — `[[path]].js` catches all `/api/*` routes first.

### Frontend

- Remix file-based routing under `app/routes/`: `_index.jsx` (home), `login.jsx`, `library.jsx`, `profile.jsx`, `games.jsx`, `shop.jsx`, `synthesis.jsx`, `admin.jsx`.
- Path alias `~` → `app/` (configured in both `tsconfig.json` and `vite.config.ts`).
- `AuthProvider` (React Context) wraps entire app in `app/root.jsx`. Exposes `user`, `login`, `register`, `logout`, `refreshUser`.
- `app/lib/api.js` — client-side API client. Auto-attaches `X-Session-Token` from `localStorage('sessionToken')`. Throws on non-2xx responses.
- Tailwind v4 (not v3) with `@tailwindcss/vite` plugin. No `tailwind.config.js`.
- shadcn/ui components in `app/components/ui/` (button, badge, card, dialog, input, tabs).
- No `remix.config.js` — all config in `vite.config.ts`: `serverBuildPath: "functions/[[path]].js"`.

## Auth & Sessions

- Login: `POST /api/auth/login` → `UserService.login()` generates `crypto.randomUUID()` token, stores full user row JSON in `KV_CACHE(session:{token})`.
- Subsequent requests: `X-Session-Token` header → `_middleware.js` reads KV → `context.data.currentUser`.
- Client: token in `localStorage('sessionToken')`, sent by `app/lib/api.js` on every request.
- Session TTL: midnight Beijing time + CONFIG.TTL.SESSION.
- Password storage: PBKDF2 (SHA-256, 100k iterations, 16-byte salt), format `saltBase64:hashBase64`. Legacy plaintext passwords auto-migrated on login.
- Debug mode: `X-User-ID` header bypass — **disabled** (`DEBUG_MODE_ENABLED` is `false`).

## Admin Auth

- Password compared against `env.admin` (**lowercase `a`**).
- `requireAdmin(request, env)` from `src/utils/response.js` — reads `body.password` from request JSON, compares to `env.admin`.
- **Critical**: `requireAdmin()` returns `{authorized, error}`, does NOT throw. Must explicitly check `auth.authorized`:
  ```js
  const auth = await requireAdmin(request, env);
  if (!auth.authorized) return jsonResponse({ error: '认证失败' }, 403);
  ```

## Database (D1)

- Direct parameterized SQL: `.prepare(...).bind(...).first()` / `.all()` / `.run()` / `.batch(...)`.
- No ORM.
- Tables use `STRICT` mode, foreign keys cascade on delete.
- `users.id` is INTEGER AUTOINCREMENT.
- Timestamps stored as integer milliseconds (`Date.now()`).
- `gallery` INSERT uses `ON CONFLICT(url) DO UPDATE`.

## Error Handling

Two coexisting patterns — **do not mix in one handler**:
1. Direct return: `return jsonResponse({ error: 'msg' }, 400);`
2. Throw: `throw AppError.validationError('msg');`

User-facing messages in Chinese.

## Validation

- `src/utils/validation.js` — functions return `null` on success or error string.
- `validateAndThrow(obj, fields)` throws `AppError` for you.
- **Gotcha**: `validatePrediction()` checks `'odd'`/`'even'`, but dice endpoint (`/api/game/dice`) uses `'small'`/`'big'`. Don't use `validatePrediction` for dice.

## Environment Variables

Secrets: `admin`, `GITHUB_TOKEN`. Vars: `GITHUB_OWNER`, `GITHUB_REPO`, `R2_DOMAIN`.
Local: `.dev.vars` (gitignored).

## CF Workers / Pages Gotchas

- No `Buffer` global. Use `crypto.subtle.digest` for image processing.
- `ctx.waitUntil()` for background work; `UserService.safeWaitUntil()` wraps with fallback to `await`.
- `btoa`/`atob` available (Web APIs).
- `nodejs_compat` compatibility flag in `wrangler.jsonc`.

## Configuration

- `src/config/business.js` — game balance: probabilities, pity thresholds, pool costs, level curves, titles.
- `src/config/technical.js` — KV key namespaces, TTLs, R2/GitHub URLs, session durations.
- `src/config/constants.js` — enums: HTTP statuses, rarity order/colors, game action types.
- `src/config/index.js` — merges all config modules. `CONFIG` exported at module level; `getEnvironmentAwareConfig(env)` for env-specific overrides.
