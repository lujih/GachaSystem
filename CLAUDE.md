# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite HMR dev server (remix vite:dev)
npm run build        # Production build → build/server/ + build/client/
npm run deploy       # Build + wrangler deploy to Cloudflare Pages
npm run typecheck    # tsc type checking (noEmit)
npm run start        # Local preview: wrangler pages dev ./build/client
```

No test framework or linter configured. `npm run typecheck` is the only static check.

D1 migration: `npx wrangler d1 execute chouka --remote --file=./schema.sql`

## Architecture

Remix v2 SPA on Cloudflare Pages. React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui. Backend uses D1 (SQLite), KV (sessions/cache), R2 (images).

### Request flow

```
Browser → Cloudflare Pages
  /api/* → functions/_middleware.js (session + CORS) → functions/api/[[path]].js (API dispatch)
  /*     → functions/_middleware.js → functions/[[path]].js (Remix SSR)
```

- `functions/_middleware.js` — global middleware: CORS preflight, parses `X-Session-Token`, loads user from KV, attaches to `context.data.currentUser`.
- `functions/api/[[path]].js` — monolithic API router. Routes matched by `path.startsWith()` + string compare. Services instantiated per-request: `new UserService(env, ctx)`.
- `functions/[[path]].js` — Remix server entry.
- `load-context.ts` — injects `env`/`ctx` into Remix `AppLoadContext`.
- Dead code: `functions/api/admin.js`, `showcase.js`, `library.js`, `changelog.js`, `announcement.js` exist but are NOT routed — `[[path]].js` catches all `/api/*` first.

### Frontend

- Remix file-based routing: `app/routes/_index.jsx` (home), `login.jsx`, `library.jsx`, `profile.jsx`, `games.jsx`, `shop.jsx`, `synthesis.jsx`, `admin.jsx`.
- Path alias `~` → `app/` (tsconfig + vite).
- `AuthProvider` (React Context) wraps entire app in `app/root.jsx`. Exposes `user`, `login`, `register`, `logout`, `refreshUser`.
- `app/lib/api.js` — client API client. Auto-attaches `X-Session-Token` from `localStorage('sessionToken')`.
- Tailwind v4 with `@tailwindcss/vite` plugin. No `tailwind.config.js`.
- shadcn/ui components in `app/components/ui/`.
- All config in `vite.config.ts` — no `remix.config.js`.

### Backend services

- `src/services/user-service.js` — auth, profile, inventory, check-in, titles, uploads.
- `src/services/gacha-service.js` — draw logic, pity system, craft, shop, dice game.
- `src/config/business.js` — game balance: probabilities, pity, pool costs, level curves, titles.
- `src/config/technical.js` — KV key namespaces, TTLs, R2/GitHub URLs.
- `src/config/constants.js` — enums: HTTP statuses, rarity order/colors, game action types.
- `src/utils/validation.js` — validators return `null` (ok) or error string. `validateAndThrow()` wraps them.

### Database

- Direct parameterized SQL via D1: `.prepare(...).bind(...).first()` / `.all()` / `.run()`. No ORM.
- Tables use `STRICT` mode. Foreign keys cascade on delete. `users.id` is INTEGER AUTOINCREMENT.
- Timestamps stored as integer milliseconds (`Date.now()`).

## Auth & Sessions

- Login: `POST /api/auth/login` → generates `crypto.randomUUID()` token, stores user JSON in `KV_CACHE(session:{token})`.
- Client: token in `localStorage('sessionToken')`, sent by `app/lib/api.js`.
- Password: PBKDF2 (SHA-256, 100k iterations, 16-byte salt). Legacy plaintext auto-migrated on login.
- Admin auth: password compared against `env.admin` (lowercase `a`). `requireAdmin(request, env)` returns `{authorized, error}` — does NOT throw. Must check `auth.authorized`.

## Error Handling

Two coexisting patterns — do not mix in one handler:
1. Direct return: `return jsonResponse({ error: 'msg' }, 400);`
2. Throw: `throw AppError.validationError('msg');`

User-facing messages in Chinese.

## Validation Gotcha

`validatePrediction()` checks `'odd'`/`'even'`, but the dice endpoint (`/api/game/dice`) uses `'small'`/`'big'`. Don't use `validatePrediction` for dice.

## Cloudflare Workers Gotchas

- No `Buffer` global. Use `crypto.subtle.digest` for hashing.
- `ctx.waitUntil()` for background work; `UserService.safeWaitUntil()` wraps with fallback.
- `btoa`/`atob` available (Web APIs).
- `nodejs_compat` compatibility flag enabled in `wrangler.jsonc`.

## Environment

Secrets: `admin`, `GITHUB_TOKEN`. Vars: `GITHUB_OWNER`, `GITHUB_REPO`, `R2_DOMAIN`.
Local secrets in `.dev.vars` (gitignored). `.npmrc`: `legacy-peer-deps=true`.

---

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions that YOUR changes made unused.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```
