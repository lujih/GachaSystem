# Design: Workers to Pages Migration (Big Bang)

**Date:** 2026-04-28  
**Status:** Draft  
**Decision:** Approach A — one-shot migration from Cloudflare Workers to Pages + Remix

## Motivation

Move Chouka Gacha System from Cloudflare Workers to Cloudflare Pages to gain:
- Preview deployments per branch
- Built-in Git-based CI/CD (no `wrangler deploy`)
- Cleaner frontend/backend separation
- Modern React (Remix) frontend replacing server-rendered templates

## Target Architecture

```
Cloudflare Pages
├── /app/           Remix frontend (React SSR + CSR)
├── /functions/     Pages Functions (API layer)
├── src/
│   ├── config/     Unchanged — business & technical config
│   ├── services/   Unchanged — UserService, GachaService
│   └── utils/      Unchanged — response, validation, time, AppError
├── schema.sql      Unchanged
└── public/         Static assets
```

**Bindings** (configured in Pages Dashboard, not `wrangler.toml`):
- D1: `DB` → `chouka`
- KV: `KV_CACHE`, `RECENT_REQUESTS`
- R2: `R2_BUCKET` → `cloudflare-t1`

**Environment variables:** `admin` (secret), `GITHUB_TOKEN` (secret), `GITHUB_OWNER`, `GITHUB_REPO`, `R2_DOMAIN`, `SESSION_SECRET`.

## Remix Frontend

**File structure:**
```
/app/
├── root.jsx              Global layout, Context providers
├── entry.client.jsx      Client hydration entry
├── entry.server.jsx      Server entry (Cloudflare adapter)
├── routes/
│   ├── _index.jsx        Home (draw panel, showcase)
│   ├── library.jsx       Gallery browsing
│   ├── profile.jsx       User profile
│   ├── login.jsx         Login/register
│   └── admin.jsx         Admin dashboard
├── components/
│   ├── DrawPanel.jsx     Single/multi draw UI
│   ├── CardReveal.jsx    Draw result animation
│   ├── Inventory.jsx     Inventory display
│   ├── DiceGame.jsx      Dice betting
│   ├── ShopPanel.jsx     Shop purchasing
│   ├── Leaderboard.jsx   Leaderboard
│   ├── Announcement.jsx  Announcement banner
│   └── LoginForm.jsx     Auth form
├── hooks/
│   ├── useAuth.js        Auth state management
│   └── useGacha.js       Gacha draw logic
├── lib/
│   └── api.js            Fetch wrapper for Functions API calls
└── styles/
    └── global.css        Extracted from existing template CSS
```

**Key decisions:**
- **Pure CSR mode:** Remix `loader` only does initial data prefetch. All interactive operations go via client-side `fetch` to Functions API.
- **Session storage:** Token in `localStorage`; `X-Session-Token` header on every API call.
- **State management:** React Context for auth state and rarity config. No Redux/Zustand.
- **Styling:** Keep existing design language (CSS variables). No Tailwind. Extract styles from current templates.

## Pages Functions (API Layer)

**File-based routing — one file per domain:**
```
/functions/
├── api/
│   ├── auth.js           POST register + login (route by body.action)
│   ├── user.js           GET/POST user info, inventory, check-in, titles,
│   │                     update-profile, upload, equip-title
│   ├── draw.js           GET normal draw, POST limited draw, multi-draw
│   ├── game.js           POST dice, craft, shop buy
│   ├── library.js        GET library items, paginated
│   ├── showcase.js       GET latest drops (top 6)
│   ├── announcement.js   GET announcement from KV
│   ├── changelog.js      GET/POST changelog
│   └── admin.js          POST verify, users, update-points, delete-user,
│                         uploads, review-upload, save-changelog, save-announcement
└── _middleware.js         Session parsing, CORS, request logging
```

**Route matching:** Each Function file uses `request.method` + URL pathname to dispatch, same pattern as existing `handleApiRoute()` but distributed across files.

**Function signature:** `export async function onRequest(context)` where `context.env` carries D1/KV/R2 bindings.

**Middleware (`_middleware.js`):**
1. Handle CORS preflight (`OPTIONS`)
2. Parse `X-Session-Token` → load user from `KV_CACHE` → attach to `context`
3. Log request metadata in debug mode
4. Call `context.next()`

**What stays unchanged:**
- `src/services/user-service.js` and `gacha-service.js` — imported directly by Functions
- `src/utils/response.js`, `validation.js`, `time.js`, `AppError.js` — unchanged
- `src/config/` — all config files unchanged

**What gets deleted:**
- `worker.js` — routing logic distributed to Functions
- `src/templates/` — replaced by Remix app
- `wrangler.toml` — bindings moved to Pages Dashboard

## Package Scripts

```json
{
  "scripts": {
    "dev": "remix vite:dev",
    "build": "remix vite:build",
    "start": "wrangler pages dev ./build/client",
    "deploy": "wrangler pages deploy ./build/client",
    "db:migrate": "npx wrangler d1 execute chouka --remote --file=./schema.sql"
  }
}
```

## CI/CD

```
Git push (main) → Pages auto-build:
  1. npm ci
  2. npm run build
  3. Deploy to production URL

Git push (feature branch) → Pages auto-build:
  1. npm ci
  2. npm run build
  3. Preview deployment URL (e.g., feature-branch.chouka.pages.dev)
```

No manual `wrangler deploy` needed.

## Migration Steps

1. Create Remix project with Cloudflare adapter in repo root
2. Create Pages project in Dashboard, attach D1/KV/R2 bindings
3. Move `src/services/`, `src/utils/`, `src/config/` into new structure (no changes needed)
4. Write `/functions/api/*.js` — port existing handlers, one domain per file
5. Build Remix frontend — routes, components, hooks
6. Local dev with `npm run dev` + `npm run start` (Functions + Remix)
7. Push to Git → Pages auto-deploys
8. Verify all endpoints and UI against old Worker
9. Switch DNS to Pages project
10. Decommission old Worker

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| D1/KV/R2 bindings misconfigured in Pages | Verify binding names match exactly before DNS cutover |
| `src/services/` code relies on Worker-specific globals | Audit for `ctx.waitUntil` patterns; Pages Functions expose `context.ctx` |
| Remix build complexity vs current no-build setup | Single `npm run build` step added; Vite handles most of it |
| `btoa`/`atob` usage in services (Web API, available in Functions) | Already verified — Pages Functions are Workers under the hood |
