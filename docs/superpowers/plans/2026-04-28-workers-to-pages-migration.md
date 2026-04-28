# Workers to Pages + Remix Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Chouka Gacha System from Cloudflare Workers to Cloudflare Pages with Remix frontend

**Architecture:** One-shot migration. Remix frontend in `/app/`, API as Pages Functions in `/functions/`, existing `src/services/` and `src/utils/` imported directly. D1/KV/R2 bindings configured in Pages Dashboard.

**Tech Stack:** Remix v2 (React), Vite, Cloudflare Pages adapter, D1, KV, R2

---

## File Structure

```
Create:
├── remix.config.js
├── vite.config.ts
├── tsconfig.json
├── remix.env.d.ts
├── load-context.ts
├── app/
│   ├── root.jsx
│   ├── entry.client.jsx
│   ├── entry.server.jsx
│   ├── routes/
│   │   ├── _index.jsx
│   │   ├── library.jsx
│   │   ├── profile.jsx
│   │   ├── login.jsx
│   │   └── admin.jsx
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── DrawPanel.jsx
│   │   ├── Inventory.jsx
│   │   ├── DiceGame.jsx
│   │   ├── ShopPanel.jsx
│   │   ├── Leaderboard.jsx
│   │   └── LoginForm.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   └── useGacha.js
│   ├── lib/
│   │   └── api.js
│   └── styles/
│       └── global.css
├── functions/
│   ├── _middleware.js
│   ├── api/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── draw.js
│   │   ├── game.js
│   │   ├── library.js
│   │   ├── showcase.js
│   │   ├── announcement.js
│   │   ├── changelog.js
│   │   └── admin.js
│   └── tsconfig.json
└── public/
    └── favicon.ico

Modify:
├── package.json          (add remix deps, update scripts)
├── .gitignore            (add .cache, build/, public/build)

Delete:
├── worker.js
├── wrangler.toml
├── src/templates/        (entire directory)
```

---

### Task 1: Project Scaffolding — Remix Config & Dependencies

**Files:**
- Create: `remix.config.js`, `vite.config.ts`, `tsconfig.json`, `remix.env.d.ts`, `load-context.ts`
- Modify: `package.json`, `.gitignore`
- Create: `functions/tsconfig.json`

- [ ] **Step 1: Update package.json with Remix dependencies and new scripts**

```json
{
  "name": "chouka-gacha",
  "version": "1.0.0",
  "description": "Chouka Gacha System on Cloudflare Workers",
  "private": true,
  "sideEffects": false,
  "type": "module",
  "scripts": {
    "dev": "remix vite:dev",
    "build": "remix vite:build",
    "start": "wrangler pages dev ./build/client",
    "deploy": "wrangler pages deploy ./build/client",
    "typecheck": "tsc"
  },
  "dependencies": {
    "@remix-run/cloudflare-pages": "^2.12.0",
    "@remix-run/react": "^2.12.0",
    "isbot": "^5.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250303.0",
    "@remix-run/dev": "^2.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vite-tsconfig-paths": "^5.0.0",
    "wrangler": "^4.81.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Run npm install**

```bash
npm install
```

- [ ] **Step 3: Write remix.config.js**

```js
/** @type {import('@remix-run/dev').AppConfig} */
export default {
  serverBuildTarget: "cloudflare-pages",
  server: "./server.js",
  serverBuildPath: "functions/[[path]].js",
  ignoredRouteFiles: ["**/*.css"],
};
```

- [ ] **Step 4: Write vite.config.ts**

```ts
import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
});
```

- [ ] **Step 5: Write tsconfig.json**

```json
{
  "include": ["remix.env.d.ts", "**/*.ts", "**/*.tsx"],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "strict": true,
    "allowJs": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./app/*"]
    },
    "noEmit": true
  }
}
```

- [ ] **Step 6: Write remix.env.d.ts**

```ts
/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/cloudflare-pages" />
/// <reference types="@cloudflare/workers-types" />
```

- [ ] **Step 7: Write load-context.ts**

```ts
import { type AppLoadContext } from "@remix-run/cloudflare-pages";
import { type PlatformProxy } from "wrangler";

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "@remix-run/cloudflare-pages" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}

type GetLoadContext = (args: {
  request: Request;
  context: { cloudflare: Cloudflare };
}) => AppLoadContext;

export const getLoadContext: GetLoadContext = ({ context }) => {
  return { cloudflare: context.cloudflare };
};
```

- [ ] **Step 8: Write functions/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["**/*.js", "../remix.env.d.ts"]
}
```

- [ ] **Step 9: Update .gitignore — append these lines**

```
.cache
build/
public/build
```

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json remix.config.js vite.config.ts tsconfig.json remix.env.d.ts load-context.ts functions/tsconfig.json .gitignore
git commit -m "chore: scaffold Remix + Pages project config"
```

---

### Task 2: Pages Functions Middleware

**Files:**
- Create: `functions/_middleware.js`

- [ ] **Step 1: Write functions/_middleware.js**

```js
/**
 * Global middleware for all Pages Functions.
 * Parses session token, handles CORS, attaches currentUser to context.data.
 */

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Session-Token',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Parse session token
  const token = request.headers.get('X-Session-Token');
  if (token) {
    try {
      const sessionData = await env.KV_CACHE.get(`session:${token}`, { type: 'json' });
      context.data = { ...context.data, currentUser: sessionData };
    } catch (e) {
      // Token expired or invalid — continue without user
    }
  }

  return context.next();
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/_middleware.js
git commit -m "feat: add Pages Functions middleware (session, CORS)"
```

---

### Task 3: Functions API — auth.js

**Files:**
- Create: `functions/api/auth.js`

- [ ] **Step 1: Write functions/api/auth.js**

```js
import { UserService } from '../../src/services/user-service.js';
import { jsonResponse } from '../../src/utils/response.js';
import { validateAndThrow, validateUsername, validatePassword, validateNickname } from '../../src/utils/validation.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  if (request.method !== 'POST') {
    return jsonResponse({ error: '不支持的请求方法' }, 405);
  }

  const userService = new UserService(env, context.ctx || null);

  try {
    if (path.endsWith('/auth/register') || path.endsWith('/register')) {
      const body = await request.clone().json();
      validateAndThrow(body, [
        { field: 'username', validator: validateUsername },
        { field: 'password', validator: validatePassword },
        { field: 'nickname', validator: validateNickname },
      ]);
      return await userService.register(request);
    }

    if (path.endsWith('/auth/login') || path.endsWith('/login')) {
      const body = await request.clone().json();
      validateAndThrow(body, [
        { field: 'username', validator: validateUsername },
        { field: 'password', validator: validatePassword },
      ]);
      return await userService.login(request);
    }

    return jsonResponse({ error: '未知的认证操作' }, 404);
  } catch (e) {
    console.error('[auth] Error:', e);
    return jsonResponse({ error: e.message || '认证服务错误' }, 500);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/auth.js
git commit -m "feat: add auth API Function (register, login)"
```

---

### Task 4: Functions API — user.js

**Files:**
- Create: `functions/api/user.js`

- [ ] **Step 1: Write functions/api/user.js**

```js
import { UserService } from '../../src/services/user-service.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const currentUser = data?.currentUser;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  const userService = new UserService(env, context.ctx || null);

  try {
    if (path.endsWith('/user/info')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getInfo(currentUser);
    }

    if (path.endsWith('/user/inventory')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getInventory(currentUser);
    }

    if (path.endsWith('/user/check-in')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.checkIn(currentUser, request);
    }

    if (path.endsWith('/user/titles')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.getTitles(currentUser);
    }

    if (path.endsWith('/user/equip-title')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.equipTitle(currentUser, request);
    }

    if (path.endsWith('/user/update-profile')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.updateProfile(currentUser, request);
    }

    if (path.endsWith('/user/claim-reward')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      return await userService.claimReward(currentUser, request);
    }

    if (path.endsWith('/user/upload')) {
      if (request.method !== 'POST') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { GachaService } = await import('../../src/services/gacha-service.js');
      const gachaService = new GachaService(env, context.ctx || null, userService);
      return await gachaService.uploadImage(currentUser, request);
    }

    if (path.endsWith('/user/uploads')) {
      if (request.method !== 'GET') return jsonResponse({ error: '不支持的请求方法' }, 405);
      if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);
      const { GachaService } = await import('../../src/services/gacha-service.js');
      const gachaService = new GachaService(env, context.ctx || null, userService);
      return await gachaService.getUserUploads(currentUser, request);
    }

    return jsonResponse({ error: '未知的用户操作' }, 404);
  } catch (e) {
    console.error('[user] Error:', e);
    return jsonResponse({ error: e.message || '用户服务错误' }, 500);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/user.js
git commit -m "feat: add user API Function (info, inventory, check-in, titles, etc.)"
```

---

### Task 5: Functions API — draw.js

**Files:**
- Create: `functions/api/draw.js`

- [ ] **Step 1: Write functions/api/draw.js**

```js
import { UserService } from '../../src/services/user-service.js';
import { GachaService } from '../../src/services/gacha-service.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const currentUser = data?.currentUser;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

  const userService = new UserService(env, context.ctx || null);
  const gachaService = new GachaService(env, context.ctx || null, userService);

  try {
    // GET /api/draw — standard draw
    if (path.endsWith('/draw') && request.method === 'GET') {
      return await gachaService.draw(currentUser);
    }

    // GET /api/user/draw-history — draw history
    if (path.includes('/draw-history') && request.method === 'GET') {
      return await gachaService.getDrawHistory(currentUser, request);
    }

    // POST /api/draw/multi — multi draw
    if (path.includes('/multi') && request.method === 'POST') {
      return await gachaService.multiDraw(currentUser, request);
    }

    // POST /api/draw/limited — limited pool draw
    if (path.includes('/limited') && request.method === 'POST') {
      return await gachaService.drawLimited(currentUser, request);
    }

    // GET /api/limited/pools — list limited pools
    if (path.includes('/limited/pools') && request.method === 'GET') {
      return await gachaService.getLimitedPools(currentUser);
    }

    return jsonResponse({ error: '未知的抽卡操作' }, 404);
  } catch (e) {
    console.error('[draw] Error:', e);
    return jsonResponse({ error: e.message || '抽卡服务错误' }, 500);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/draw.js
git commit -m "feat: add draw API Function (standard, limited, multi, history)"
```

---

### Task 6: Functions API — game.js

**Files:**
- Create: `functions/api/game.js`

- [ ] **Step 1: Write functions/api/game.js**

```js
import { UserService } from '../../src/services/user-service.js';
import { GachaService } from '../../src/services/gacha-service.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env, data } = context;
  const currentUser = data?.currentUser;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  if (!currentUser) return jsonResponse({ error: '请先登录' }, 401);

  const userService = new UserService(env, context.ctx || null);
  const gachaService = new GachaService(env, context.ctx || null, userService);

  try {
    if (request.method !== 'POST') {
      return jsonResponse({ error: '不支持的请求方法' }, 405);
    }

    // POST /api/game/dice
    if (path.endsWith('/game/dice') || path.endsWith('/dice')) {
      return await gachaService.playDice(currentUser, request);
    }

    // POST /api/user/craft
    if (path.endsWith('/craft')) {
      return await gachaService.craft(currentUser, request);
    }

    // POST /api/shop/buy
    if (path.endsWith('/shop/buy') || path.endsWith('/buy')) {
      return await gachaService.shopBuy(currentUser, request);
    }

    return jsonResponse({ error: '未知的游戏操作' }, 404);
  } catch (e) {
    console.error('[game] Error:', e);
    return jsonResponse({ error: e.message || '游戏服务错误' }, 500);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/game.js
git commit -m "feat: add game API Function (dice, craft, shop)"
```

---

### Task 7: Functions API — library, showcase, announcement, changelog

**Files:**
- Create: `functions/api/library.js`, `functions/api/showcase.js`, `functions/api/announcement.js`, `functions/api/changelog.js`

- [ ] **Step 1: Write functions/api/library.js**

```js
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const rarity = url.searchParams.get('rarity');
  const offset = (page - 1) * limit;

  let query = 'SELECT id, url, user_id, username, created_at FROM gallery';
  let countQuery = 'SELECT COUNT(*) as total FROM gallery';
  const params = [];
  const countParams = [];

  if (rarity) {
    query += ' WHERE rarity = ?';
    countQuery += ' WHERE rarity = ?';
    params.push(rarity.toUpperCase());
    countParams.push(rarity.toUpperCase());
  }

  try {
    const [itemsResult, countResult] = await Promise.all([
      env.DB.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
      env.DB.prepare(countQuery).bind(...countParams).first(),
    ]);

    return jsonResponse({
      items: itemsResult.results || [],
      pagination: {
        page,
        limit,
        total: countResult?.total || 0,
        totalPages: Math.ceil((countResult?.total || 0) / limit),
      },
    });
  } catch (e) {
    console.error('[library] Error:', e);
    return jsonResponse({ error: '获取图库失败' }, 500);
  }
}
```

- [ ] **Step 2: Write functions/api/showcase.js**

```js
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const cards = await env.DB.prepare(`
      SELECT g.*, u.username
      FROM gallery g
      LEFT JOIN users u ON g.user_id = u.id
      ORDER BY g.created_at DESC
      LIMIT 6
    `).all();

    return jsonResponse({ cards: cards.results || [] });
  } catch (e) {
    console.error('[showcase] Error:', e);
    return jsonResponse({ cards: [] });
  }
}
```

- [ ] **Step 3: Write functions/api/announcement.js**

```js
import { CONFIG } from '../../src/config/index.js';
import { jsonResponse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const announcement = await env.KV_CACHE.get(CONFIG.KEYS.ANNOUNCEMENT, { type: 'json' });
    return jsonResponse(announcement || { title: '', content: '', enabled: false });
  } catch (e) {
    console.error('[announcement] Error:', e);
    return jsonResponse({ title: '', content: '', enabled: false });
  }
}
```

- [ ] **Step 4: Write functions/api/changelog.js (GET only)**

```js
import { CONFIG, DEFAULT_CHANGELOG } from '../../src/config/index.js';
import { jsonResponse, safeJsonParse } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { env } = context;

  try {
    const changelog = await env.KV_CACHE.get(CONFIG.KEYS.CHANGELOG);
    const data = changelog ? safeJsonParse(changelog) : DEFAULT_CHANGELOG;
    return jsonResponse(data);
  } catch (e) {
    console.error('[changelog] Error:', e);
    return jsonResponse([]);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add functions/api/library.js functions/api/showcase.js functions/api/announcement.js functions/api/changelog.js
git commit -m "feat: add library, showcase, announcement, changelog API Functions"
```

---

### Task 8: Functions API — admin.js

**Files:**
- Create: `functions/api/admin.js`

- [ ] **Step 1: Write functions/api/admin.js**

```js
import { CONFIG, DEFAULT_CHANGELOG } from '../../src/config/index.js';
import { jsonResponse, safeJsonParse } from '../../src/utils/response.js';
import { requireAdmin } from '../../src/utils/response.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '');

  try {
    // Admin auth — check the return value
    const auth = await requireAdmin(request, env);
    if (!auth.authorized) {
      return jsonResponse({ error: '认证失败' }, 403);
    }

    if (request.method === 'POST') {
      const body = await request.clone().json();

      // Verify
      if (path.endsWith('/admin/verify')) {
        return jsonResponse({ success: true });
      }

      // Users list
      if (path.endsWith('/admin/users')) {
        const { limit = 100, offset = 0 } = body;
        const users = await env.DB.prepare(
          'SELECT id, username, nickname, coins, level, exp, total_exp, created_at FROM users ORDER BY id DESC LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();
        return jsonResponse({ users: users.results || [] });
      }

      // Update points
      if (path.endsWith('/admin/update-points')) {
        const { targetId, amount } = body;
        if (!targetId || !amount) return jsonResponse({ error: '参数不完整' }, 400);
        await env.DB.prepare('UPDATE users SET coins = coins + ? WHERE id = ?').bind(amount, targetId).run();
        return jsonResponse({ success: true });
      }

      // Delete user
      if (path.endsWith('/admin/delete-user')) {
        const { targetId } = body;
        if (!targetId) return jsonResponse({ error: '用户ID不能为空' }, 400);
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(targetId).run();
        return jsonResponse({ success: true });
      }

      // Uploads list
      if (path.endsWith('/admin/uploads')) {
        const { status = 'pending', page = 1, limit = 20 } = body;
        const offset = (page - 1) * limit;
        const [items, count] = await Promise.all([
          env.DB.prepare('SELECT * FROM user_uploads WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(status, limit, offset).all(),
          env.DB.prepare('SELECT COUNT(*) as total FROM user_uploads WHERE status = ?').bind(status).first(),
        ]);
        return jsonResponse({ uploads: items.results || [], total: count?.total || 0, page });
      }

      // Review upload
      if (path.endsWith('/admin/review-upload')) {
        const { uploadId, action, rarity } = body;
        if (!uploadId) return jsonResponse({ error: '上传ID不能为空' }, 400);
        if (!['approved', 'rejected'].includes(action)) return jsonResponse({ error: '无效的操作' }, 400);
        await env.DB.prepare('UPDATE user_uploads SET status = ?, reviewed_at = ? WHERE id = ?').bind(action, Date.now(), uploadId).run();
        if (action === 'approved' && rarity) {
          await env.DB.prepare('UPDATE user_uploads SET rarity = ? WHERE id = ?').bind(rarity, uploadId).run();
        }
        return jsonResponse({ success: true });
      }

      // Save changelog
      if (path.endsWith('/admin/save-changelog')) {
        const { logs } = body;
        if (!Array.isArray(logs)) return jsonResponse({ error: '无效的日志格式' }, 400);
        const trimmed = logs.slice(0, 50);
        await env.KV_CACHE.put(CONFIG.KEYS.CHANGELOG, JSON.stringify(trimmed));
        return jsonResponse({ message: '更新日志已保存' });
      }

      // Save announcement
      if (path.endsWith('/admin/save-announcement')) {
        const { announcement } = body;
        if (!announcement) return jsonResponse({ error: '公告内容不能为空' }, 400);
        await env.KV_CACHE.put(CONFIG.KEYS.ANNOUNCEMENT, JSON.stringify({ ...announcement, updatedAt: new Date().toISOString() }));
        return jsonResponse({ message: '公告已保存' });
      }
    }

    return jsonResponse({ error: '未知的管理操作' }, 404);
  } catch (e) {
    console.error('[admin] Error:', e);
    return jsonResponse({ error: e.message || '管理服务错误' }, 500);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add functions/api/admin.js
git commit -m "feat: add admin API Function (verify, users, uploads, review, changelog)"
```

---

### Task 9: Remix Entry Points (root, client, server) + Global CSS

**Files:**
- Create: `app/root.jsx`, `app/entry.client.jsx`, `app/entry.server.jsx`, `app/styles/global.css`

- [ ] **Step 1: Write app/root.jsx**

```jsx
import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { AuthProvider } from "~/hooks/useAuth";
import "~/styles/global.css";

export default function App() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <Meta />
        <Links />
      </head>
      <body>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write app/entry.client.jsx**

```jsx
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
```

- [ ] **Step 3: Write app/entry.server.jsx**

```jsx
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";

export default function handleRequest(request, responseStatusCode, responseHeaders, remixContext) {
  const markup = renderToString(
    <RemixServer context={remixContext} url={request.url} />
  );

  responseHeaders.set("Content-Type", "text/html");

  return new Response("<!DOCTYPE html>" + markup, {
    status: responseStatusCode,
    headers: responseHeaders,
  });
}
```

- [ ] **Step 4: Write app/styles/global.css**

Extract the existing design token system from the current templates:

```css
:root {
  --primary: #6366f1;
  --primary-hover: #4f46e5;
  --primary-light: rgba(99, 102, 241, 0.1);
  --bg: #f1f5f9;
  --card-bg: #ffffff;
  --text-main: #1e293b;
  --text-light: #64748b;
  --text-muted: #94a3b8;
  --border: #e2e8f0;
  --danger: #ef4444;
  --success: #22c55e;
  --warning: #f59e0b;
  --radius: 12px;
  --radius-sm: 8px;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --n-color: #64748b;
  --r-color: #3b82f6;
  --sr-color: #8b5cf6;
  --ssr-color: #f59e0b;
  --ur-color: #ef4444;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: var(--bg);
  color: var(--text-main);
  line-height: 1.6;
  min-height: 100vh;
}

.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background: var(--primary);
  color: white;
}
.btn-primary:hover { background: var(--primary-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-main);
}
.btn-outline:hover { background: var(--bg); }

.input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}
.input:focus { border-color: var(--primary); }

.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 700;
  color: white;
}
.badge-N { background: var(--n-color); }
.badge-R { background: var(--r-color); }
.badge-SR { background: var(--sr-color); }
.badge-SSR { background: var(--ssr-color); }
.badge-UR { background: var(--ur-color); }

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px 20px 60px;
}
```

- [ ] **Step 5: Commit**

```bash
git add app/root.jsx app/entry.client.jsx app/entry.server.jsx app/styles/global.css
git commit -m "feat: add Remix entry points and global CSS"
```

---

### Task 10: API Library and Auth Hooks

**Files:**
- Create: `app/lib/api.js`, `app/hooks/useAuth.js`, `app/hooks/useGacha.js`

- [ ] **Step 1: Write app/lib/api.js**

```js
const API_BASE = '';

function getToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('sessionToken');
  }
  return null;
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'X-Session-Token': token } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `请求失败: ${res.status}`);
  }
  return data;
}

export const api = {
  // Auth
  register: (body) => apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  // User
  getUserInfo: () => apiFetch('/api/user/info'),
  getInventory: () => apiFetch('/api/user/inventory'),
  checkIn: () => apiFetch('/api/user/check-in', { method: 'POST' }),
  getTitles: () => apiFetch('/api/user/titles'),
  equipTitle: (titleId) => apiFetch('/api/user/equip-title', { method: 'POST', body: JSON.stringify({ titleId }) }),
  updateProfile: (nickname) => apiFetch('/api/user/update-profile', { method: 'POST', body: JSON.stringify({ nickname }) }),
  claimReward: (targetLevel) => apiFetch('/api/user/claim-reward', { method: 'POST', body: JSON.stringify({ targetLevel }) }),
  uploadImage: (formData) => {
    const token = getToken();
    return fetch('/api/user/upload', { method: 'POST', headers: { 'X-Session-Token': token }, body: formData }).then(r => r.json());
  },
  getUserUploads: (page = 1) => apiFetch(`/api/user/uploads?page=${page}`),

  // Draw
  draw: () => apiFetch('/api/draw'),
  multiDraw: (count = 10) => apiFetch('/api/draw/multi', { method: 'POST', body: JSON.stringify({ count }) }),
  drawLimited: (poolId) => apiFetch('/api/draw/limited', { method: 'POST', body: JSON.stringify({ poolId }) }),
  getLimitedPools: () => apiFetch('/api/limited/pools'),
  getDrawHistory: (page = 1, rarity) => apiFetch(`/api/draw/draw-history?page=${page}${rarity ? `&rarity=${rarity}` : ''}`),

  // Game
  playDice: (betAmount, prediction) => apiFetch('/api/game/dice', { method: 'POST', body: JSON.stringify({ betAmount, prediction }) }),
  craft: (targetRarity) => apiFetch('/api/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity }) }),
  shopBuy: (targetRarity) => apiFetch('/api/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity }) }),

  // Public
  getLibrary: (page = 1, limit = 20, rarity) => apiFetch(`/api/library/items?page=${page}&limit=${limit}${rarity ? `&rarity=${rarity}` : ''}`),
  getShowcase: () => apiFetch('/api/showcase'),
  getAnnouncement: () => apiFetch('/api/announcement'),
  getChangelog: () => apiFetch('/api/changelog'),

  // Admin
  adminVerify: (password) => apiFetch('/api/admin/verify', { method: 'POST', body: JSON.stringify({ password }) }),
  adminUsers: (password, page = 1, limit = 20) => apiFetch('/api/admin/users', { method: 'POST', body: JSON.stringify({ password, page, limit }) }),
  adminUpdatePoints: (password, targetId, amount) => apiFetch('/api/admin/update-points', { method: 'POST', body: JSON.stringify({ password, targetId, amount }) }),
  adminDeleteUser: (password, targetId) => apiFetch('/api/admin/delete-user', { method: 'POST', body: JSON.stringify({ password, targetId }) }),
  adminUploads: (password, status = 'pending', page = 1) => apiFetch('/api/admin/uploads', { method: 'POST', body: JSON.stringify({ password, status, page }) }),
  adminReviewUpload: (password, uploadId, action, rarity) => apiFetch('/api/admin/review-upload', { method: 'POST', body: JSON.stringify({ password, uploadId, action, rarity }) }),
  adminSaveChangelog: (password, logs) => apiFetch('/api/admin/save-changelog', { method: 'POST', body: JSON.stringify({ password, logs }) }),
  adminSaveAnnouncement: (password, announcement) => apiFetch('/api/admin/save-announcement', { method: 'POST', body: JSON.stringify({ password, announcement }) }),
};
```

- [ ] **Step 2: Write app/hooks/useAuth.js**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '~/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      setLoading(false);
      return;
    }
    api.getUserInfo()
      .then(res => setUser(res.data || res))
      .catch(() => localStorage.removeItem('sessionToken'))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.login({ username, password });
    localStorage.setItem('sessionToken', res.token);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (username, password, nickname) => {
    const res = await api.register({ username, password, nickname });
    if (res.success) {
      return await login(username, password);
    }
    return res;
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('sessionToken');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getUserInfo();
      setUser(res.data || res);
    } catch (e) { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Write app/hooks/useGacha.js**

```js
import { useState, useCallback } from 'react';
import { api } from '~/lib/api';

export function useGacha() {
  const [drawing, setDrawing] = useState(false);
  const [lastDraw, setLastDraw] = useState(null);

  const draw = useCallback(async () => {
    setDrawing(true);
    try {
      const result = await api.draw();
      setLastDraw(result);
      return result;
    } finally {
      setDrawing(false);
    }
  }, []);

  const multiDraw = useCallback(async (count = 10) => {
    setDrawing(true);
    try {
      const result = await api.multiDraw(count);
      setLastDraw(result);
      return result;
    } finally {
      setDrawing(false);
    }
  }, []);

  const drawLimited = useCallback(async (poolId) => {
    setDrawing(true);
    try {
      const result = await api.drawLimited(poolId);
      setLastDraw(result);
      return result;
    } finally {
      setDrawing(false);
    }
  }, []);

  return { drawing, lastDraw, draw, multiDraw, drawLimited, clearDraw: () => setLastDraw(null) };
}
```

- [ ] **Step 4: Commit**

```bash
git add app/lib/api.js app/hooks/useAuth.js app/hooks/useGacha.js
git commit -m "feat: add API client library and auth/gacha hooks"
```

---

### Task 11: Header and LoginForm Components

**Files:**
- Create: `app/components/Header.jsx`, `app/components/LoginForm.jsx`

- [ ] **Step 1: Write app/components/LoginForm.jsx**

```jsx
import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { useNavigate } from '@remix-run/react';

export default function LoginForm() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, nickname || username);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2 style={{ marginBottom: 20, textAlign: 'center' }}>
        {mode === 'login' ? '登录' : '注册'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>用户名</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="3-20位字母数字下划线" required minLength={3} />
        </div>
        {mode === 'register' && (
          <div style={{ marginBottom: 12 }}>
            <label>昵称</label>
            <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="可选" />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label>密码</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位" required minLength={6} />
        </div>
        {error && <p style={{ color: 'var(--danger)', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-light)', fontSize: '0.9rem' }}>
        {mode === 'login' ? '没有账号？' : '已有账号？'}
        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          {mode === 'login' ? '去注册' : '去登录'}
        </button>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Write app/components/Header.jsx**

```jsx
import { Link, useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', marginBottom: 20,
    }}>
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900 }}>
            <span style={{ color: 'var(--primary)' }}>Chouka</span> 抽卡
          </h1>
        </Link>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>二次元抽卡系统</p>
      </div>
      <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/library" style={{ color: 'var(--text-light)', textDecoration: 'none', fontSize: '0.9rem' }}>图库</Link>
        {user ? (
          <>
            <Link to="/profile" style={{ color: 'var(--text-light)', textDecoration: 'none', fontSize: '0.9rem' }}>
              {user.nickname || user.username}
              {user.title && <span style={{ color: 'var(--warning)', marginLeft: 4, fontSize: '0.75rem' }}>{user.title.name}</span>}
            </Link>
            <span style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600 }}>🪙 {user.coins}</span>
            <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Lv.{user.level}</span>
            <button className="btn btn-outline" onClick={logout} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>退出</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '8px 18px', fontSize: '0.9rem' }}>登录</button>
        )}
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/components/LoginForm.jsx app/components/Header.jsx
git commit -m "feat: add Header and LoginForm components"
```

---

### Task 12: DrawPanel Component

**Files:**
- Create: `app/components/DrawPanel.jsx`

- [ ] **Step 1: Write app/components/DrawPanel.jsx**

```jsx
import { useState } from 'react';
import { useGacha } from '~/hooks/useGacha';
import { useAuth } from '~/hooks/useAuth';

const RARITY_COLORS = { N: '#64748b', R: '#3b82f6', SR: '#8b5cf6', SSR: '#f59e0b', UR: '#ef4444' };
const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];

export default function DrawPanel() {
  const { user, refreshUser } = useAuth();
  const { drawing, lastDraw, draw, multiDraw, clearDraw } = useGacha();
  const [animating, setAnimating] = useState(false);

  async function handleDraw(type) {
    if (drawing) return;
    setAnimating(true);
    clearDraw();
    try {
      if (type === 'multi') await multiDraw(10);
      else await draw();
      setTimeout(async () => {
        try { await refreshUser(); } catch (e) {}
        setAnimating(false);
      }, 1200);
    } catch (e) {
      setAnimating(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>抽卡面板</h2>

      {/* Draw buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => handleDraw('single')} disabled={drawing} style={{ flex: 1 }}>
          {drawing && !animating ? '抽卡中...' : animating ? '开卡中...' : '单抽 (免费)'}
        </button>
        <button className="btn btn-primary" onClick={() => handleDraw('multi')} disabled={drawing} style={{ flex: 1 }}>
          {drawing && !animating ? '抽卡中...' : animating ? '开卡中...' : '十连抽 (免费)'}
        </button>
      </div>

      {/* Animation placeholder */}
      {animating && !lastDraw && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)', fontSize: '1.2rem' }}>
          正在抽卡... 🎲
        </div>
      )}

      {/* Single draw result */}
      {lastDraw && !lastDraw.cards && (
        <div style={{ textAlign: 'center' }}>
          {lastDraw.card?.imageUrl ? (
            <img
              src={lastDraw.card.imageUrl}
              alt={lastDraw.card.rarity}
              style={{
                width: '100%', maxWidth: 300, borderRadius: 'var(--radius)',
                boxShadow: `0 0 20px ${RARITY_COLORS[lastDraw.card.rarity] || '#fff'}40`,
                marginBottom: 12,
              }}
            />
          ) : (
            <span className={`badge badge-${lastDraw.card?.rarity || 'N'}`} style={{ fontSize: '1.1rem', padding: '6px 16px' }}>
              {lastDraw.card?.rarity || 'N'}
            </span>
          )}
          {lastDraw.isPity && <p style={{ color: 'var(--warning)', marginTop: 8 }}>保底触发!</p>}
          {lastDraw.expGained != null && <p style={{ color: 'var(--text-light)', marginTop: 4 }}>+{lastDraw.expGained} 经验</p>}
          {lastDraw.levelUp && (
            <p style={{ color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
              升级! Lv.{lastDraw.levelUp.newLevel} (+{lastDraw.levelUp.reward} 金币)
            </p>
          )}
        </div>
      )}

      {/* Multi draw results */}
      {lastDraw?.cards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
          {lastDraw.cards.map((c, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 8, borderRadius: 'var(--radius-sm)', background: `${RARITY_COLORS[c.rarity]}15` }}>
              {c.asset?.url ? (
                <img src={c.asset.url} alt={c.rarity} style={{ width: '100%', borderRadius: 6, marginBottom: 4 }} />
              ) : (
                <span className={`badge badge-${c.rarity}`}>{c.rarity}</span>
              )}
              {c.isPity && <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>保底</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/DrawPanel.jsx
git commit -m "feat: add DrawPanel component with animation"
```

---

### Task 13: Inventory, DiceGame, ShopPanel, Leaderboard

**Files:**
- Create: `app/components/Inventory.jsx`, `app/components/DiceGame.jsx`, `app/components/ShopPanel.jsx`, `app/components/Leaderboard.jsx`

- [ ] **Step 1: Write app/components/Inventory.jsx**

```jsx
import { useState, useEffect } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

export default function Inventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
  const [crafting, setCrafting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getInventory().then(res => setInventory(res.data || res)).catch(() => {});
  }, [user]);

  async function handleCraft(rarity) {
    setCrafting(true);
    try {
      const res = await api.craft(rarity);
      if (res.success) {
        const inv = await api.getInventory();
        setInventory(inv.data || inv);
      }
    } catch (e) {}
    setCrafting(false);
  }

  const craftOptions = [
    { target: 'R', source: 'N' },
    { target: 'SR', source: 'R' },
    { target: 'SSR', source: 'SR' },
    { target: 'UR', source: 'SSR' },
  ];

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>背包</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['N', 'R', 'SR', 'SSR', 'UR'].map(r => (
          <span key={r} className={`badge badge-${r}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
            {r}: {inventory[r] || 0}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {craftOptions.map(o => (
          <button
            key={o.target}
            className="btn btn-outline"
            onClick={() => handleCraft(o.target)}
            disabled={crafting || (inventory[o.source] || 0) < 5}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            5×{o.source} → 1×{o.target}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write app/components/DiceGame.jsx**

```jsx
import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

export default function DiceGame() {
  const { user, refreshUser } = useAuth();
  const [betAmount, setBetAmount] = useState(10);
  const [prediction, setPrediction] = useState('big');
  const [result, setResult] = useState(null);
  const [playing, setPlaying] = useState(false);

  async function handlePlay() {
    setPlaying(true);
    setResult(null);
    try {
      const res = await api.playDice(betAmount, prediction);
      setResult(res);
      await refreshUser();
    } catch (e) {
      setResult({ error: e.message });
    }
    setPlaying(false);
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>骰子猜大小</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>投注金额</label>
          <input className="input" type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value))} min={10} max={1000} style={{ marginTop: 4 }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>预测</label>
          <select className="input" value={prediction} onChange={e => setPrediction(e.target.value)} style={{ marginTop: 4 }}>
            <option value="big">大 (6-12)</option>
            <option value="small">小 (2-5)</option>
          </select>
        </div>
      </div>
      <button className="btn btn-primary" onClick={handlePlay} disabled={playing} style={{ width: '100%' }}>
        {playing ? '投掷中...' : `🎲 下注 ${betAmount} 积分`}
      </button>
      {result && !result.error && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: '1.5rem' }}>
            {result.roll1} + {result.roll2} = <strong>{result.sum}</strong>
          </p>
          <p style={{ color: result.reward > result.cost ? 'var(--success)' : 'var(--text-light)', fontWeight: 600 }}>
            {result.reward > result.cost ? `+${result.reward - result.cost} 积分` : '未中奖'}
          </p>
        </div>
      )}
      {result?.error && <p style={{ color: 'var(--danger)', marginTop: 12 }}>{result.error}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Write app/components/ShopPanel.jsx**

```jsx
import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

const SHOP_ITEMS = [
  { rarity: 'R', price: 150, label: 'R 卡片' },
  { rarity: 'SR', price: 600, label: 'SR 卡片' },
  { rarity: 'SSR', price: 2500, label: 'SSR 卡片' },
  { rarity: 'UR', price: 10000, label: 'UR 卡片' },
];

export default function ShopPanel() {
  const { user, refreshUser } = useAuth();
  const [buying, setBuying] = useState(null);

  async function handleBuy(rarity) {
    setBuying(rarity);
    try {
      await api.shopBuy(rarity);
      await refreshUser();
    } catch (e) {}
    setBuying(null);
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>商店</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {SHOP_ITEMS.map(item => (
          <button
            key={item.rarity}
            className={`badge badge-${item.rarity}`}
            onClick={() => handleBuy(item.rarity)}
            disabled={buying === item.rarity || (user?.coins || 0) < item.price}
            style={{
              padding: '12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              opacity: (user?.coins || 0) < item.price ? 0.4 : 1,
              fontSize: '0.9rem',
            }}
          >
            <div>{item.label}</div>
            <div style={{ marginTop: 4 }}>🪙 {item.price}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write app/components/Leaderboard.jsx**

```jsx
export default function Leaderboard({ showcase = [] }) {
  const cards = showcase.slice(0, 6);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>最新掉落</h3>
      {cards.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>暂无掉落记录</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {cards.map((card, i) => (
            <div key={i} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg)', padding: 6, textAlign: 'center' }}>
              {card.url ? (
                <img src={card.url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, marginBottom: 4 }} loading="lazy" />
              ) : (
                <div style={{ aspectRatio: '3/4', background: 'var(--border)', borderRadius: 6, marginBottom: 4 }} />
              )}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{card.username || '匿名'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add app/components/Inventory.jsx app/components/DiceGame.jsx app/components/ShopPanel.jsx app/components/Leaderboard.jsx
git commit -m "feat: add Inventory, DiceGame, ShopPanel, Leaderboard components"
```

---

### Task 14: Remix Routes — _index.jsx (Home Page)

**Files:**
- Create: `app/routes/_index.jsx`

- [ ] **Step 1: Write app/routes/_index.jsx**

```jsx
import { useLoaderData } from '@remix-run/react';
import Header from '~/components/Header';
import DrawPanel from '~/components/DrawPanel';
import Leaderboard from '~/components/Leaderboard';
import Inventory from '~/components/Inventory';
import DiceGame from '~/components/DiceGame';
import ShopPanel from '~/components/ShopPanel';
import { useState } from 'react';

export async function loader({ context }) {
  const { env } = context.cloudflare;
  try {
    const result = await env.DB.prepare(
      'SELECT g.*, u.username FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
    ).all();
    const announcement = await env.KV_CACHE.get('system:announcement', { type: 'json' });
    return {
      showcase: result.results || [],
      announcement: announcement || null,
    };
  } catch (e) {
    return { showcase: [], announcement: null };
  }
}

export default function Index() {
  const { showcase, announcement } = useLoaderData();
  const [tab, setTab] = useState('draw');

  return (
    <div className="container">
      <Header />

      {announcement?.enabled && announcement?.content && (
        <div style={{
          background: 'var(--primary-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          marginBottom: 20, borderLeft: '3px solid var(--primary)',
        }}>
          <strong>{announcement.title}</strong>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: 4 }}>{announcement.content}</p>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {[
          { key: 'draw', label: '抽卡' },
          { key: 'inventory', label: '背包' },
          { key: 'dice', label: '骰子' },
          { key: 'shop', label: '商店' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? 'white' : 'var(--text-main)',
              fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'draw' && <DrawPanel />}
      {tab === 'inventory' && <Inventory />}
      {tab === 'dice' && <DiceGame />}
      {tab === 'shop' && <ShopPanel />}

      <div style={{ marginTop: 20 }}>
        <Leaderboard showcase={showcase} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/routes/_index.jsx
git commit -m "feat: add home page route with draw, inventory, dice, shop tabs"
```

---

### Task 15: Remix Routes — library.jsx and profile.jsx

**Files:**
- Create: `app/routes/library.jsx`, `app/routes/profile.jsx`

- [ ] **Step 1: Write app/routes/library.jsx**

```jsx
import { useLoaderData, useSearchParams, Link } from '@remix-run/react';
import Header from '~/components/Header';

export async function loader({ request, context }) {
  const { env } = context.cloudflare;
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const rarity = url.searchParams.get('rarity');
  const offset = (page - 1) * limit;

  let query = 'SELECT id, url, user_id, username, created_at FROM gallery';
  let countQuery = 'SELECT COUNT(*) as total FROM gallery';
  const params = [];
  const countParams = [];

  if (rarity) {
    query += ' WHERE rarity = ?';
    countQuery += ' WHERE rarity = ?';
    params.push(rarity.toUpperCase());
    countParams.push(rarity.toUpperCase());
  }

  const [itemsResult, countResult] = await Promise.all([
    env.DB.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
    env.DB.prepare(countQuery).bind(...countParams).first(),
  ]);

  return {
    items: itemsResult.results || [],
    total: countResult?.total || 0,
    page,
    totalPages: Math.ceil((countResult?.total || 0) / limit),
    rarity: rarity || '',
  };
}

export default function Library() {
  const { items, page, totalPages, rarity } = useLoaderData();
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="container">
      <Header />
      <h2 style={{ marginBottom: 16 }}>图库</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'N', 'R', 'SR', 'SSR', 'UR'].map(r => (
          <button
            key={r}
            className={`btn ${rarity === r ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSearchParams(r ? { rarity: r, page: '1' } : { page: '1' })}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            {r || '全部'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
            <img src={item.url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} loading="lazy" />
            <p style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
              {item.username || '匿名'}
            </p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {page > 1 && (
            <button className="btn btn-outline" onClick={() => setSearchParams({ page: String(page - 1), ...(rarity && { rarity }) })}>
              上一页
            </button>
          )}
          <span style={{ padding: '8px 16px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <button className="btn btn-outline" onClick={() => setSearchParams({ page: String(page + 1), ...(rarity && { rarity }) })}>
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write app/routes/profile.jsx**

```jsx
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import Inventory from '~/components/Inventory';
import { useState } from 'react';
import { api } from '~/lib/api';

export function loader() {
  return null;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('inventory');

  if (!user) {
    return (
      <div className="container">
        <Header />
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ marginBottom: 16, color: 'var(--text-light)' }}>请先登录</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>去登录</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
            alt=""
            style={{ width: 64, height: 64, borderRadius: '50%' }}
          />
          <div>
            <h2>{user.nickname || user.username}</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
              @{user.username} · Lv.{user.level} · 🪙 {user.coins}
            </p>
            {user.title && <span className="badge badge-SSR" style={{ marginTop: 4 }}>{user.title.name}</span>}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
              抽卡次数: {user.drawCount || 0} · 胜场: {user.wins || 0}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {['inventory', 'activity'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--primary)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-main)',
              fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            {t === 'inventory' ? '背包' : '活动'}
          </button>
        ))}
      </div>

      {tab === 'inventory' && <Inventory />}
      {tab === 'activity' && (
        <div className="card">
          <h3>每日签到</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: 12 }}>每天签到可以获得金币和经验奖励</p>
          <button className="btn btn-primary" onClick={async () => {
            try {
              await api.checkIn();
              await refreshUser();
            } catch (e) {}
          }}>
            签到
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/routes/library.jsx app/routes/profile.jsx
git commit -m "feat: add library and profile routes"
```

---

### Task 16: Remix Routes — login.jsx and admin.jsx

**Files:**
- Create: `app/routes/login.jsx`, `app/routes/admin.jsx`

- [ ] **Step 1: Write app/routes/login.jsx**

```jsx
import { useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import LoginForm from '~/components/LoginForm';

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  return (
    <div className="container">
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>
          <span style={{ color: 'var(--primary)' }}>Chouka</span> 抽卡
        </h1>
        <p style={{ color: 'var(--text-light)', marginBottom: 24 }}>登录或注册以开始</p>
      </div>
      <LoginForm />
    </div>
  );
}
```

- [ ] **Step 2: Write app/routes/admin.jsx**

```jsx
import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import { api } from '~/lib/api';

export default function Admin() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', content: '' });

  async function handleVerify() {
    setError('');
    try {
      const res = await api.adminVerify(password);
      if (res.success) {
        setAuthed(true);
        handleLoadUsers();
      }
    } catch (e) {
      setError('密码错误');
    }
  }

  async function handleLoadUsers(page = 1) {
    try {
      const res = await api.adminUsers(password, page);
      setUsers(res.users || []);
    } catch (e) {}
  }

  async function handleLoadUploads(status = 'pending') {
    try {
      const res = await api.adminUploads(password, status);
      setUploads(res.uploads || []);
    } catch (e) {}
  }

  if (!authed) {
    return (
      <div className="container">
        <Header />
        <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
          <h2 style={{ marginBottom: 16 }}>管理员登录</h2>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="管理员密码" style={{ marginBottom: 12 }} />
          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary" onClick={handleVerify} style={{ width: '100%' }}>验证</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <h2 style={{ marginBottom: 16 }}>管理后台</h2>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {['users', 'uploads', 'announcement'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'users') handleLoadUsers(); if (t === 'uploads') handleLoadUploads(); }}
            style={{ flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'white' : 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {t === 'users' ? '用户' : t === 'uploads' ? '审核' : '公告'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          {users.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{u.nickname || u.username}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Lv.{u.level} · 🪙 {u.coins} · 抽卡{u.draw_count}次</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'uploads' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            {['pending', 'approved', 'rejected'].map(s => (
              <button key={s} className="btn btn-outline" onClick={() => handleLoadUploads(s)} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                {s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}
              </button>
            ))}
          </div>
          {uploads.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src={u.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem' }}>{u.username} · <span className={`badge badge-${u.rarity || 'N'}`}>{u.rarity || 'N'}</span></p>
              </div>
              {u.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" onClick={async () => { await api.adminReviewUpload(password, u.id, 'approved'); handleLoadUploads(); }} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>通过</button>
                  <button className="btn" style={{ background: 'var(--danger)', color: 'white', padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }} onClick={async () => { await api.adminReviewUpload(password, u.id, 'rejected'); handleLoadUploads(); }}>拒绝</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'announcement' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>发布公告</h3>
          <input className="input" value={announcement.title} onChange={e => setAnnouncement({ ...announcement, title: e.target.value })} placeholder="标题" style={{ marginBottom: 12 }} />
          <textarea className="input" value={announcement.content} onChange={e => setAnnouncement({ ...announcement, content: e.target.value })} placeholder="内容" rows={4} style={{ marginBottom: 12 }} />
          <button className="btn btn-primary" onClick={async () => { await api.adminSaveAnnouncement(password, { ...announcement, enabled: true }); alert('已保存'); }}>
            保存公告
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/routes/login.jsx app/routes/admin.jsx
git commit -m "feat: add login and admin routes"
```

---

### Task 17: Cleanup — Delete Old Files

**Files:**
- Delete: `worker.js`, `wrangler.toml`, `src/templates/` (entire directory)

- [ ] **Step 1: Delete worker.js**

```bash
git rm worker.js
```

- [ ] **Step 2: Delete wrangler.toml**

```bash
git rm wrangler.toml
```

- [ ] **Step 3: Delete src/templates/ directory**

```bash
git rm -r src/templates/
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove old Worker entrypoint, wrangler config, and server-side templates"
```

---

### Task 18: Local Dev Verification

- [ ] **Step 1: Install dependencies**

```bash
npm install
```

- [ ] **Step 2: Create .dev.vars with local bindings**

```
# .dev.vars (gitignored)
admin=test_password
GITHUB_TOKEN=your_token
GITHUB_OWNER=lujih
GITHUB_REPO=chouka-images
R2_DOMAIN=https://cft1.cszxorx.dpdns.org
```

- [ ] **Step 3: Start Remix dev server**

```bash
npm run dev
```

Expected: Vite dev server starts on `http://localhost:5173`

- [ ] **Step 4: In separate terminal, start Pages Functions**

```bash
npm run start
```

Expected: wrangler starts on `http://localhost:8788`, proxying to Vite

- [ ] **Step 5: Test key API endpoints**

```bash
# Test login
curl -X POST http://localhost:8788/api/auth/login -H "Content-Type: application/json" -d '{"username":"test","password":"test123"}'

# Test showcase
curl http://localhost:8788/api/showcase

# Test announcement
curl http://localhost:8788/api/announcement
```

- [ ] **Step 6: Open browser and test UI**

- `http://localhost:8788/` — Home page with draw panel, showcase
- `http://localhost:8788/login` — Login/register form
- `http://localhost:8788/library` — Gallery browser
- `http://localhost:8788/profile` — User profile
- `http://localhost:8788/admin` — Admin panel

- [ ] **Step 7: Commit any fixes discovered during testing**

```bash
git add -A
git commit -m "fix: address issues found during local verification"
```

---

### Task 19: First Deploy to Cloudflare Pages

**Prerequisites:** Pages project created in Dashboard with D1/KV/R2 bindings configured.

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: `build/client/` and `build/server/` directories created.

- [ ] **Step 2: Deploy to Pages**

```bash
npm run deploy
```

Or push to Git if Pages CI is configured.

- [ ] **Step 3: Verify production deployment**

- Check all API endpoints on the Pages domain
- Walk through key user flows: register → login → draw → check inventory → craft
- Verify admin panel with correct password
- Check that images display correctly (R2 URLs work)

- [ ] **Step 4: Switch DNS to Pages project**

In Cloudflare Dashboard → website → DNS: point the custom domain to the Pages project.

- [ ] **Step 5: Commit**

```bash
git commit -m "deploy: first Pages deployment, DNS switched"
```
