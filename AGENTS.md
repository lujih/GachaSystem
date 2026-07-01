# AGENTS.md — Chouka Gacha System

Remix v2 SPA on Cloudflare Pages. React 18 + TypeScript + Tailwind CSS v4 + shadcn/ui (base-nova). D1 (SQLite), KV, R2.

## Commands

```bash
npm run dev          # vite HMR
npm run build        # remix vite:build → build/server/ + build/client/
npm run typecheck    # tsc --noEmit (only static check — no tests, no linter)
npm run deploy       # npm run build && wrangler deploy
npm run start        # wrangler pages dev ./build/client (SSR after build)
npm run preview      # npm run build && wrangler dev (full preview)
```

- D1 migration: `npx wrangler d1 execute chouka --remote --file=./schema.sql`
- `.npmrc`: `legacy-peer-deps=true` (shadcn compat)
- `.dev.vars` (gitignored): `admin`, `GITHUB_TOKEN`, `R2_DOMAIN`
- `wrangler.jsonc`: `nodejs_compat` flag required
- Known false‑positive: vite.config.ts:18 `'serverBuildPath' not in VitePluginConfig` (Remix type resolution)

## Architecture

```
Browser → Cloudflare Pages
  /api/* → functions/_middleware.js → functions/api/[[path]].js
  /*     → functions/_middleware.js → functions/[[path]].js (Remix SSR)
```

- **Middleware** (`functions/_middleware.js`): CORS preflight, reads `X-Session-Token` → `KV_CACHE(session:{token})` → `context.data.currentUser`. Skips session for public API paths. CORS allows `X-Admin-Mode` header. Generates per-request CSP nonce, injects into `<script>` tags in HTML responses, sets security headers (CSP with `'strict-dynamic'` + nonce, HSTS, XFO, etc.).
- **API Router** (`functions/api/[[path]].js`): Monolithic 345-line router. Matches by `path.startsWith()` + string compare. Instantiates `UserService` + `GachaService` per request. Rate-limit on login (10/10min) and register (5/10min) via KV with `CF-Connecting-IP`.
- **Frontend**: 8 routes under `app/routes/`. Path alias `~` → `app/`. Tailwind v4 (`@tailwindcss/vite` plugin, no `tailwind.config.js`). shadcn components in `app/components/ui/`.
- **Backend**: `src/services/user-service.js` (auth, profile, check-in, titles, uploads) and `src/services/gacha-service.js` (draw, multi-draw, limited, craft, shop buy, dice, decompose, draw history). Both have `safeWaitUntil()` instance method for `ctx.waitUntil()` with fallback.
- **Config**: `src/config/index.js` merges `business.js` (probabilities, pity, costs) + `technichal.js` (KV keys, TTLs) + `constants.js` (HTTP statuses, RARITY_COLORS hex strings).

## Database (D1)

Direct SQL, no ORM. `STRICT` mode, foreign keys cascade on delete. Integer millisecond timestamps (`Date.now()`). 12 tables: `users`, `gallery`, `inventory`, `logs`, `level_rewards`, `user_titles`, `user_uploads`, `draw_history`, `card_likes`, `card_bookmarks`, `buffer_claims`.

## Admin Auth

`requireAdmin(request, env)` **consumes the request body** to parse `body.password`. Returns `{ authorized, error }` — does NOT throw.

**Admin routes needing extra body fields must use `request.clone().json()`** because the original body was consumed:

```js
const auth = await requireAdmin(request.clone(), env);
if (!auth.authorized) return jsonResponse({ error: '认证失败' }, 403);
const { targetId, amount } = await request.clone().json();
```

Password compared against `env.admin` (lowercase `a`). The call in `[[path]].js` passes `request.clone()`.

## Error Handling & Validation

- Two patterns (don't mix): `return jsonResponse({ error: 'msg' }, 400)` vs `throw AppError.validationError('msg')`
- User-facing messages in Chinese.
- `src/utils/validation.js`: validators return `null` (ok) or error string. Removed unused functions: `validateEmail`, `validateUrl`, `validateIntegerRange`, `validateFields`, `validateAndThrow` (round 4).
- **Gotcha**: `validatePrediction()` checks `'odd'`/`'even'`, but dice uses `'small'`/`'big'`. Don't use it for dice.
- Password: PBKDF2 SHA-256, 100k iterations, stored as `saltBase64:hashBase64`. Compat fallback for legacy plaintext.

## Rarity Configs (two independent sources)

| Source | Location | Shape |
|--------|----------|-------|
| Frontend | `app/lib/rarity.js` | Tailwind classes (`bg`, `border`, `text`, `dot`, `gradient`, `glow`) + helper functions (`rarityBg`, `rarityBorder`, etc.) |
| Backend | `src/config/constants.js` | Hex strings only: `RARITY_COLORS = { N: '#64748B', ... }` |

## Environment

Secrets: `admin`, `GITHUB_TOKEN`. Vars: `GITHUB_OWNER` (default `lujih`), `GITHUB_REPO` (default `chouka-images`), `R2_DOMAIN`.

## Gotchas

- No `Buffer` global — use `crypto.subtle.digest` for hashing, `btoa`/`atob` for base64.
- API client (`app/lib/api.js`) auto-attaches `X-Session-Token` from `localStorage`. Throws on non-2xx.
- Session token stored in `localStorage` — XSS risk known, no workaround yet.
- Known race conditions: KV-based rate limiter (TOCTOU), decompose stock read-then-update.
- `consumeGlobalBuffer` race condition mitigated via `buffer_claims` D1 table — `INSERT ON CONFLICT DO NOTHING` acts as atomic distributed lock per URL hash, preventing duplicate image distribution under concurrent requests. Added round 4.
- Upload validation (`/user/upload`): dual MIME check (browser `file.type` + magic bytes), extension whitelist (`.jpg`, `.png`, `.gif`, `.webp`), `validateRarity` called. Added round 4.
- `consumeGlobalBuffer` refill guard: `safeRefillGlobalBuffer` only called when `selectedSlot.index >= 0`, preventing KV key pollution (`sys:buffer:UR:-1`). Fixed round 4.
- `jsonResponse()` sets `success` automatically (`true` if status < 400, `false` otherwise) if not already set.
