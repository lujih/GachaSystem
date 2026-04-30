# AGENTS.md — Chouka Gacha System

## Overview

Cloudflare Workers gacha app. Plain JS (ESM), no TypeScript, no build step. Uses Workers, D1 (SQLite), KV, R2. Entry point: `worker.js` — `export default { async fetch() }`.

Behavioral conventions live in `CLAUDE.md` — read that too.

## Commands

```bash
npm run dev          # wrangler dev --local
npm run deploy       # wrangler deploy
# D1:
npx wrangler d1 execute chouka --remote --file=./schema.sql
```

- No test framework. No linting configured. Test manually with `wrangler dev --local`.
- D1 binding name is `DB`, KV bindings are `KV_CACHE` and `RECENT_REQUESTS`, R2 is `R2_BUCKET`.

## Architecture (do NOT guess this)

- `worker.js` `fetch()` → `handleRequest()` → `handleApiRoute()` or `handlePageRoute()`.
- Route matching is `path.startsWith()` + string compare, not a regex table. There is **no** `handleRoute` wrapper — the old docs were aspirational.
- Services instantiated per-request: `new UserService(env, ctx)`, `new GachaService(env, ctx)`.
- `src/templates/*` are HTML pages, not API handlers.
- `src/config/index.js` exports module-level `CONFIG` (merged with empty env at import time). Services import this. Use `getEnvironmentAwareConfig(env)` at the top of `fetch()` for env-specific overrides.

## Auth & Sessions

- Session token via `X-Session-Token` header.
- Token stored in KV_CACHE as `session:${token}` with type `'json'`. Value is the full user row.
- `getCurrentUser(request, env)` in `worker.js` reads this. The current user is a DB row object (has `.id`, `.username`, etc.).
- Debug bypass: `X-User-ID` header (only active when `CONFIG.DEBUG_MODE_ENABLED` is true).

## Admin Auth

- Password compared against `env.admin` (**lowercase** `a`).
- `requireAdmin(request, env)` from `src/utils/response.js` is async — reads request body, compares `body.password` to `env.admin`.
- **Critical gotcha**: `requireAdmin()` returns `{authorized, error}` but does NOT throw. Some handlers call `await requireAdmin(request, env);` without checking the result — these handlers have **no actual auth guard**.

## Error Handling

Two coexisting patterns (do not mix in one handler):

1. Direct return: `return jsonResponse({ error: 'msg' }, 400);`
2. Throw: `throw AppError.validationError('msg');` — caught by `errorHandler()` in worker.js

User-facing error messages are in Chinese.

## Validation

- From `src/utils/validation.js`. Functions return `null` on success or an error string.
- `validateAndThrow(obj, [{field, validator}, ...])` throws `AppError` for you.
- **Gotcha**: `validatePrediction()` checks `'odd'`/`'even'`, but the dice endpoint accepts `'small'`/`'big'`. Don't use `validatePrediction` for the dice game.

## Database (D1)

- Parameterized: `.prepare(...).bind(...).first()` / `.all()` / `.run()`.
- `users` table uses integer `id` (AUTOINCREMENT). Foreign keys cascade on delete.
- `gallery` table stores image URLs indexed by `user_id`. The INSERT uses `ON CONFLICT(url) DO UPDATE`.
- Timestamps stored as integer milliseconds (`Date.now()`).

## CF Workers Gotchas

- No `Buffer` global. Image processing happens via `crypto.subtle.digest` and native APIs. Do not import `buffer` package unless you verify it works in Workers runtime.
- `ctx.waitUntil()` schedules background work; `safeWaitUntil()` in UserService wraps this.
- `btoa`/`atob` are available in Workers (Web APIs).

## Environment Variables

Secrets: `admin`, `GITHUB_TOKEN`. Vars: `GITHUB_OWNER`, `GITHUB_REPO`, `R2_DOMAIN`.
Local: put in `.dev.vars` (gitignored).
