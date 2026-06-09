# AGENTS.md — Chouka (KiraKira) Gacha System

## Overview

Remix v2 SPA on Cloudflare Pages. React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova style). D1 (SQLite), KV, R2.

Behavioral conventions in `CLAUDE.md`.

## Commands

```bash
npm run dev          # remix vite:dev (Vite HMR)
npm run build        # remix vite:build → build/server/ + build/client/
npm run deploy       # npm run build && wrangler deploy
npm run typecheck    # tsc --noEmit (only static check — no tests, no linter)
npm run start        # wrangler pages dev ./build/client
npm run preview      # npm run build && wrangler dev
```

- D1 migration: `npx wrangler d1 execute chouka --remote --file=./schema.sql`
- `.npmrc`: `legacy-peer-deps=true` (shadcn compatibility)
- `.dev.vars` — local secrets (`admin`, `GITHUB_TOKEN`), gitignored

## Architecture

### Request flow

```
Browser → Cloudflare Pages
  /api/* → functions/_middleware.js (session + CORS) → functions/api/[[path]].js
  /*     → functions/_middleware.js → functions/[[path]].js (Remix SSR)
```

- `functions/_middleware.js`: CORS preflight, reads `X-Session-Token` → `KV_CACHE(session:{token})` → `context.data.currentUser`. Skips auth for public API paths and static assets.
- `functions/api/[[path]].js`: monolithic API router. Routes matched by `path.startsWith()` + string compare. Instantiates `UserService` + `GachaService` per-request.
- **Dead code**: `functions/api/admin.js`, `showcase.js`, `library.js`, `changelog.js`, `announcement.js` exist but `[[path]].js` catches all `/api/*` first — these files are **never routed**.

### Frontend

- Routes: `_index.jsx`, `login.jsx`, `library.jsx`, `profile.jsx`, `games.jsx`, `shop.jsx`, `synthesis.jsx`, `admin.jsx`
- Path alias `~` → `app/` (tsconfig + vite)
- `AuthProvider` from `~/hooks/useAuth` wraps entire app. Exposes `{ user, loading, login, register, logout, refreshUser }`
- `app/lib/api.js`: client API. Auto-attaches `X-Session-Token`. Throws on non-2xx.
- `app/lib/rarity.js`: **frontend shared rarity config** — color classes (bg/border/text/dot), gradients, glow shadows. All UI rarity styling imports from here.
- Tailwind v4 (`@tailwindcss/vite` plugin). No `tailwind.config.js`.
- shadcn/ui config in `components.json`. Components in `app/components/ui/`.

### Backend

- `src/services/user-service.js`: auth, profile, inventory, check-in, titles, uploads
- `src/services/gacha-service.js`: draw, multi-draw, limited pools, craft, shop buy, dice, decompose, draw history
- `src/config/`: business (probabilities, pity, pool costs), technical (KV keys, TTLs), constants (HTTP statuses, rarity enums), index (merged `CONFIG` + `getEnvironmentAwareConfig(env)`)

### Database (D1)

- Direct SQL: `.prepare(...).bind(...).first()` / `.all()` / `.run()` / `.batch(...)`. No ORM.
- Tables use `STRICT` mode, foreign keys cascade on delete. `users.id` INTEGER AUTOINCREMENT.
- Timestamps are integer milliseconds (`Date.now()`).
- Tables: `users`, `gallery`, `inventory`, `logs`, `level_rewards`, `user_titles`, `user_uploads`, `draw_history`, `card_likes`, `card_bookmarks`

## Admin Auth (critical)

`requireAdmin(request, env)` from `src/utils/response.js` **consumes the request body** to read `body.password`. Returns `{ authorized, error }` — does NOT throw.

```js
const auth = await requireAdmin(request, env);
if (!auth.authorized) return jsonResponse({ error: '认证失败' }, 403);
```

**Admin routes that need additional body fields must use `request.clone().json()`** because `requireAdmin` already consumed the original body:

```js
const { password, targetId, amount } = await request.clone().json();
// or call requireAdmin first, then parse:
const auth = await requireAdmin(request, env);
const body = await request.clone().json();
```

Password compared against `env.admin` (lowercase `a`).

## Error Handling

Two patterns coexist — **do not mix in one handler**:
1. Direct return: `return jsonResponse({ error: 'msg' }, 400);`
2. Throw: `throw AppError.validationError('msg');`

User-facing messages in Chinese.

## Validation

- `src/utils/validation.js`: functions return `null` (ok) or error string.
- `validateAndThrow(obj, fields)` wraps validators and throws `AppError`.
- **Gotcha**: `validatePrediction()` checks `'odd'`/`'even'`, but dice endpoint (`/api/game/dice`) uses `'small'`/`'big'`. Don't use `validatePrediction` for dice.

## Rarity Configs (two sources — don't mix)

| Source | Location | Shape |
|--------|----------|-------|
| Frontend | `app/lib/rarity.js` | Tailwind classes: `bg`, `border`, `text`, `dot`, `hex`, `gradient`, `glow` + helper functions |
| Backend | `src/config/constants.js` | Hex strings only: `RARITY_COLORS = { N: '#64748B', ... }` |

## Gotchas

- No `Buffer` global. Use `crypto.subtle.digest` for hashing.
- `ctx.waitUntil()` for background work; `safeWaitUntil()` wraps with try/catch fallback (defined on both `UserService` and `GachaService` as instance methods).
- `btoa`/`atob` available (Web APIs).
- `nodejs_compat` compatibility flag in `wrangler.jsonc`.
- D1 binding: `DB`. KV: `KV_CACHE`, `RECENT_REQUESTS`. R2: `R2_BUCKET`.

## Environment

Secrets: `admin`, `GITHUB_TOKEN`. Vars: `GITHUB_OWNER`, `GITHUB_REPO`, `R2_DOMAIN`.
Local: `.dev.vars` (gitignored).
