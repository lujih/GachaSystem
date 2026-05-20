# 首页重设计 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `app/routes/_index.jsx` 从硬编码静态占位页改为功能完整的可交互首页（公告、用户概览、真实保底、最新掉落、抽卡记录、结果弹窗）

**Architecture:** Remix loader 获取公告/showcase/抽卡历史并 SSR 预填；客户端通过 `useAuth()` + `useGacha()` + `useRevalidator()` 驱动抽卡交互；保底计数扩展 `/api/user/info` 返回；抽卡结果用 Dialog 弹窗呈现；CSS 沿用现有 Vivid Pulse 设计 token

**Tech Stack:** Remix v2, React 18, Tailwind CSS v4, shadcn/ui Dialog, Cloudflare D1/KV, Material Symbols Icons

---

### Task 1: 扩展 UserService.getInfo() 返回保底计数器

**Files:**
- Modify: `src/services/user-service.js:336-397`

- [ ] **Step 1: 在 getInfo() 中添加 pity 读取逻辑**

在 `user-service.js` 的 `getInfo` 方法中，`claimedRewards` 查询之后、`responseData` 组装之前，添加：

```js
// 读取保底计数器
let ssrPity = 0, urPity = 0;
if (this.env.KV_CACHE) {
  try {
    const [ssr, ur] = await Promise.all([
      this.env.KV_CACHE.get(`pity:ssr:${currentUser.id}`),
      this.env.KV_CACHE.get(`pity:ur:${currentUser.id}`)
    ]);
    ssrPity = parseInt(ssr || '0', 10);
    urPity = parseInt(ur || '0', 10);
  } catch (e) { /* ignore */ }
}
```

在 `responseData` 对象中追加：
```js
ssrPity,
urPity,
ssrPityAt: CONFIG.PITY.SSR.at,
urPityAt: CONFIG.PITY.UR.at,
```

确保 `CONFIG` 已在文件顶部导入（检查现有 import）。

- [ ] **Step 2: 同步更新缓存键中的字段**

缓存写入时 KV key `uinfo:{id}` 已包含新字段（因为 `responseData` 直接序列化），无需额外改动。但 `login_streak` 字段当前未在 `getInfo` 的 DB 查询中 SELECT——在 SQL 中添加 `u.login_streak`：

在已有 SQL 的 SELECT 列表中追加 `u.login_streak`（在 `u.last_login_date` 之后）：

```js
const sql = `
  SELECT 
    u.username, u.nickname, u.coins, u.draw_count, u.wins, 
    u.level, u.exp, u.total_exp, u.last_login_date, u.login_streak,
    (
      SELECT title_id 
      FROM user_titles 
      WHERE user_id = u.id AND is_equipped = 1
    ) as active_title
  FROM users u
  WHERE u.id = ?
`;
```

在 `responseData` 中追加：
```js
loginStreak: userRes.login_streak || 0,
```

- [ ] **Step 3: 运行 typecheck 确认**

```bash
npm run typecheck
```
预期：无新增错误（仅有现有的 `serverBuildPath` 类型警告，忽略）

---

### Task 2: 创建 DrawResultDialog 组件

**Files:**
- Create: `app/components/DrawResultDialog.jsx`

- [ ] **Step 1: 创建 DrawResultDialog.jsx**

```jsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';

const RARITY_GRADIENT = {
  N: 'from-gray-400 to-gray-500',
  R: 'from-blue-400 to-blue-600',
  SR: 'from-purple-400 to-purple-600',
  SSR: 'from-amber-400 to-yellow-500',
  UR: 'from-red-500 to-rose-600',
};

const RARITY_BADGE = {
  N: 'bg-gray-500',
  R: 'bg-blue-500',
  SR: 'bg-purple-500',
  SSR: 'bg-amber-500',
  UR: 'bg-red-500',
};

export default function DrawResultDialog({ open, onClose, result }) {
  const [revealed, setRevealed] = useState([]);
  const cards = result?.cards || (result?.card ? [result.card] : []);

  useEffect(() => {
    if (!open) { setRevealed([]); return; }
    setRevealed([]);
    if (cards.length === 0) return;
    let i = 0;
    const timer = setInterval(() => {
      setRevealed(prev => [...prev, cards[i]]);
      i++;
      if (i >= cards.length) clearInterval(timer);
    }, 200);
    return () => clearInterval(timer);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg md:max-w-2xl bg-surface-bright border-4 border-primary-fixed shadow-[6px_6px_0px_0px_rgba(255,119,175,0.3)] p-4 md:p-8">
        <div className="text-center mb-4 md:mb-6">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary flex items-center justify-center gap-2">
            <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">auto_awesome</span>
            抽卡结果
          </h2>
        </div>

        {cards.length > 1 ? (
          <div className="grid grid-cols-5 gap-2 md:gap-3">
            {cards.map((c, i) => (
              <div
                key={i}
                className={`relative aspect-[3/4] rounded-lg md:rounded-xl border-2 border-outline-variant overflow-hidden ${
                  revealed.includes(c) ? 'animate-card-reveal' : 'opacity-0'
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[c.rarity || 'N']}`} />
                {c.imageUrl || c.url ? (
                  <img src={c.imageUrl || c.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white text-xl md:text-3xl font-black">{c.rarity || 'N'}</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-1 md:p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <Badge className={`${RARITY_BADGE[c.rarity || 'N']} text-white text-[10px]`}>
                    {c.rarity || 'N'}
                  </Badge>
                </div>
                {c.isPity && (
                  <div className="absolute top-1 right-1">
                    <span className="material-symbols-outlined text-amber-400 symbol-filled text-sm">stars</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative w-48 md:w-64 aspect-[3/4] rounded-xl overflow-hidden border-4 border-primary-fixed shadow-[4px_4px_0px_0px_rgba(255,119,175,0.3)] animate-card-reveal">
              <div className={`absolute inset-0 bg-gradient-to-br ${RARITY_GRADIENT[cards[0]?.rarity || 'N']}`} />
              {cards[0]?.imageUrl || cards[0]?.url ? (
                <img src={cards[0].imageUrl || cards[0].url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-6xl font-black">{cards[0]?.rarity || 'N'}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <Badge className={`${RARITY_BADGE[cards[0]?.rarity || 'N']} text-white`}>
                  {cards[0]?.rarity || 'N'}
                </Badge>
              </div>
              {cards[0]?.isPity && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-500 text-white animate-pulse">保底</Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="mt-4 md:mt-6 text-center space-y-1">
            {result.expGained != null && (
              <p className="text-sm text-on-surface-variant">+{result.expGained} 经验</p>
            )}
            {result.levelUp && (
              <p className="text-sm font-bold text-emerald-600">
                🎉 升级! Lv.{result.levelUp.newLevel} (+{result.levelUp.reward} 金币)
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <button
            onClick={onClose}
            className="bg-primary text-on-primary font-button-text text-sm px-8 py-2 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            确定
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
npm run typecheck
```
预期：无新增错误

---

### Task 3: 重写 _index.jsx loader

**Files:**
- Modify: `app/routes/_index.jsx:8-25`

- [ ] **Step 1: 扩展 loader 增加抽卡历史查询**

替换现有 loader（8-25 行）为：

```jsx
export async function loader({ request, context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { showcase: [], announcement: null, drawHistory: [] };
  }
  try {
    const [showcaseResult, announcement] = await Promise.all([
      env.DB.prepare(
        'SELECT g.*, u.username FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
      ).all(),
      env.KV_CACHE?.get('system:announcement', { type: 'json' }),
    ]);

    let drawHistory = [];
    const token = request.headers.get('X-Session-Token') || '';
    if (token) {
      const sessionData = await env.KV_CACHE.get(`session:${token}`, { type: 'json' });
      if (sessionData?.id) {
        const historyResult = await env.DB.prepare(
          'SELECT rarity, is_pity, source_name, created_at FROM draw_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
        ).bind(sessionData.id).all();
        drawHistory = historyResult.results || [];
      }
    }

    return {
      showcase: showcaseResult.results || [],
      announcement: announcement || null,
      drawHistory,
    };
  } catch (e) {
    return { showcase: [], announcement: null, drawHistory: [] };
  }
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
npm run typecheck
```
预期：无新增错误

---

### Task 4: 重写 _index.jsx 组件 — 导入 + 状态 + 公告/用户概览

**Files:**
- Modify: `app/routes/_index.jsx:27-185`（替换整个组件）

- [ ] **Step 1: 替换导入语句（1-6 行）**

```jsx
import { useLoaderData, useRevalidator } from '@remix-run/react';
import { useState, useCallback } from 'react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import { useAuth } from '~/hooks/useAuth';
import { useGacha } from '~/hooks/useGacha';
import DrawResultDialog from '~/components/DrawResultDialog';
```

- [ ] **Step 2: 组件声明 + 状态初始化（替换 27-42 行）**

```jsx
const POOL_CONFIG = {
  limited: { name: '限定池', cost: 500, multiCost: 5000, desc: '概率 UP! · 当期角色精选', tag: '概率 UP!' },
  permanent: { name: '常驻池', cost: 160, multiCost: 1600, desc: '标准卡池 · 概率均等', tag: null },
};

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const RARITY_DOT = {
  N: 'bg-n', R: 'bg-r', SR: 'bg-sr', SSR: 'bg-ssr', UR: 'bg-ur',
};

export default function Index() {
  const { showcase, announcement, drawHistory: initialDrawHistory } = useLoaderData();
  const { user, refreshUser } = useAuth();
  const { drawing, lastDraw, draw, multiDraw, clearDraw } = useGacha();
  const revalidator = useRevalidator();
  const [poolType, setPoolType] = useState('limited');
  const [drawResult, setDrawResult] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dismissedAnnId, setDismissedAnnId] = useState(
    () => typeof window !== 'undefined' ? localStorage.getItem('dismissedAnnouncement') : null
  );
  const [drawHistory, setDrawHistory] = useState(initialDrawHistory);

  const pool = POOL_CONFIG[poolType];
  const ssrPity = user?.ssrPity ?? 0;
  const urPity = user?.urPity ?? 0;
  const ssrAt = user?.ssrPityAt ?? 10;
  const urAt = user?.urPityAt ?? 50;

  async function handleDraw(type) {
    if (drawing) return;
    clearDraw();
    try {
      let result;
      if (type === 'multi') {
        result = await multiDraw(10);
      } else {
        result = await draw();
      }
      setDrawResult(result);
      setDialogOpen(true);
    } catch (e) {}
  }

  async function handleDialogClose() {
    setDialogOpen(false);
    setDrawResult(null);
    clearDraw();
    await refreshUser();
    revalidator.revalidate();
  }

  async function handleCheckIn() {
    try {
      const { api } = await import('~/lib/api');
      await api.checkIn();
      await refreshUser();
    } catch (e) {}
  }

  const todayChecked = useCallback(() => {
    if (!user?.last_login_date) return false;
    const last = new Date(user.last_login_date);
    const now = new Date();
    return last.toDateString() === now.toDateString();
  }, [user?.last_login_date]);

  const showAnnouncement = announcement?.title && dismissedAnnId !== announcement.refreshId;
```

- [ ] **Step 3: 运行 typecheck 确认**

```bash
npm run typecheck
```
预期：无新增错误

---

### Task 5: 重写 _index.jsx 组件 — JSX 渲染

**Files:**
- Modify: `app/routes/_index.jsx`（追加 JSX 部分）

- [ ] **Step 1: 替换整个 return 语句（原 44-184 行）**

```jsx
  return (
    <div className="min-h-screen bg-background bg-halftone relative">
      <Header activeTab="大厅" />

      <main className="max-w-[1440px] mx-auto w-full px-3 md:px-8 py-4 md:py-12 pt-[72px] md:pt-[88px] pb-[100px] md:pb-8">

        {/* ① 公告横条 */}
        {showAnnouncement && (
          <div className="bg-primary-fixed border-b-2 border-primary-container rounded-2xl px-4 md:px-6 py-3 md:py-4 mb-4 md:mb-6 flex items-center justify-between shadow-[2px_2px_0px_0px_rgba(255,119,175,0.2)]">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="material-symbols-outlined symbol-filled text-primary">campaign</span>
              <span className="font-label-bold text-sm md:text-label-bold text-on-primary-fixed-variant">{announcement.title}</span>
            </div>
            <button
              onClick={() => {
                if (announcement.refreshId) localStorage.setItem('dismissedAnnouncement', announcement.refreshId);
                setDismissedAnnId(announcement.refreshId || 'closed');
              }}
              className="text-on-primary-fixed-variant/60 hover:text-on-primary-fixed-variant p-1"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        )}

        {/* ② 用户概览卡片 */}
        {user ? (
          <div className="bg-surface-container-low rounded-2xl border-2 border-outline-variant p-3 md:p-4 mb-4 md:mb-6 flex items-center gap-2 md:gap-4 overflow-x-auto shadow-[2px_2px_0px_0px_rgba(136,113,120,0.1)]">
            <div className="flex items-center gap-1.5 shrink-0 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
              <span className="material-symbols-outlined symbol-filled text-tertiary-container text-sm md:text-base">monetization_on</span>
              <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{(user.coins ?? 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
              <span className="material-symbols-outlined symbol-filled text-primary text-sm md:text-base">stars</span>
              <span className="font-label-bold text-xs md:text-label-bold text-on-surface">Lv.{user.level ?? 1}</span>
              <div className="w-12 md:w-16 h-1.5 bg-surface-variant rounded-full overflow-hidden ml-1">
                <div className="h-full bg-primary rounded-full" style={{ width: `${user.level_progress ?? 0}%` }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
              <span className="material-symbols-outlined symbol-filled text-secondary text-sm md:text-base">local_fire_department</span>
              <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user.loginStreak ?? 0}天</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 bg-surface-bright rounded-full px-3 py-1.5 border border-outline-variant">
              <span className="material-symbols-outlined symbol-filled text-primary-container text-sm md:text-base">style</span>
              <span className="font-label-bold text-xs md:text-label-bold text-on-surface">{user.drawCount ?? 0}抽</span>
            </div>
            <button
              onClick={handleCheckIn}
              disabled={todayChecked()}
              className={`shrink-0 ml-auto font-button-text text-xs md:text-button-text px-4 py-2 rounded-full border-2 transition-all ${
                todayChecked()
                  ? 'bg-surface-variant text-on-surface-variant border-outline-variant cursor-default'
                  : 'bg-primary text-on-primary border-on-primary-container shadow-[2px_2px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] animate-pulse'
              }`}
            >
              {todayChecked() ? '已签到' : '签到'}
            </button>
          </div>
        ) : (
          <div className="bg-surface-container-low rounded-2xl border-2 border-outline-variant p-4 md:p-6 mb-4 md:mb-6 text-center">
            <p className="text-on-surface-variant text-sm mb-3">登录后查看个人数据</p>
            <a href="/login" className="inline-block bg-primary text-on-primary font-button-text text-sm px-6 py-2 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all no-underline">
              登录
            </a>
          </div>
        )}

        {/* ③ 池切换 + 抽卡主区域 */}
        <div className="relative w-full rounded-2xl md:rounded-[32px] border-4 border-primary-fixed overflow-hidden shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[8px_8px_0px_0px_rgba(255,119,175,0.2)] bg-surface-bright flex flex-col md:flex-row mb-4 md:mb-8">
          <div className="absolute inset-0 opacity-10 bg-halftone" />

          {/* 左侧立绘展示区 */}
          <div className="relative w-full md:w-2/3 min-h-[160px] md:min-h-[280px] overflow-hidden">
            <div className={`absolute inset-0 transition-colors duration-500 ${
              poolType === 'limited'
                ? 'bg-gradient-to-br from-primary-container/30 to-secondary-container/30'
                : 'bg-gradient-to-br from-surface-container/50 to-surface-variant/30'
            }`} />
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface-bright via-surface-bright/50 to-transparent md:w-3/4" />

            <div className="absolute bottom-0 left-0 p-4 md:p-8 w-full md:w-auto">
              {pool.tag && (
                <div className="inline-block bg-secondary text-on-secondary font-label-bold text-[10px] md:text-label-bold px-2 md:px-4 py-1 rounded-full mb-2 md:mb-4 border-2 border-secondary-fixed shadow-[2px_2px_0px_0px_rgba(0,103,131,0.5)]">
                  {pool.tag}
                </div>
              )}
              <h2 className="font-headline-md md:text-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_rgba(255,255,255,1)] mb-1 md:mb-2">
                {pool.name}
              </h2>
              <p className="font-body-md text-sm md:text-body-md text-on-surface-variant">
                {pool.desc}
              </p>
            </div>
          </div>

          {/* 右侧抽卡操作区 */}
          <div className="relative w-full md:w-1/3 bg-white/80 backdrop-blur-md border-t-4 md:border-t-0 md:border-l-4 border-outline-variant p-4 md:p-6 flex flex-col justify-between z-10">
            {/* 池切换标签 */}
            <div className="flex gap-2 mb-4">
              {['limited', 'permanent'].map(type => (
                <button
                  key={type}
                  onClick={() => setPoolType(type)}
                  className={`font-label-bold text-xs px-4 py-1.5 rounded-full border-2 transition-transform hover:-translate-y-1 ${
                    poolType === type
                      ? 'bg-primary text-on-primary border-primary-container shadow-[2px_2px_0px_0px_rgba(255,119,175,0.4)]'
                      : 'bg-surface-container text-on-surface border-outline-variant hover:bg-surface-variant'
                  }`}
                >
                  {POOL_CONFIG[type].name}
                </button>
              ))}
            </div>

            {/* 保底进度 */}
            <div className="bg-surface-container-low rounded-2xl p-3 md:p-4 border-2 border-outline-variant mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest">SSR 保底</span>
                <span className="font-button-text text-xs text-primary">{ssrPity}/{ssrAt}</span>
              </div>
              <div className="h-3 md:h-4 w-full bg-surface-variant rounded-full overflow-hidden border border-outline-variant mb-3">
                <div className="h-full bg-gradient-to-r from-primary-container to-secondary-container rounded-full transition-all duration-500" style={{ width: `${Math.min((ssrPity / ssrAt) * 100, 100)}%` }} />
              </div>
              <p className="font-body-md text-[10px] md:text-body-md text-on-surface-variant text-center">
                {ssrPity >= ssrAt ? '下次必出 SSR!' : `再抽 ${ssrAt - ssrPity} 次必出 SSR`}
              </p>
            </div>

            {/* 抽卡按钮 */}
            {user ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleDraw('multi')}
                  disabled={drawing}
                  className="relative group bg-tertiary-fixed-dim text-on-tertiary-fixed font-button-text text-sm md:text-button-text py-3 md:py-4 px-4 rounded-full border-4 border-tertiary-container shadow-[4px_4px_0px_0px_#705d00] md:shadow-[6px_6px_0px_0px_#705d00] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex justify-between items-center overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="absolute inset-0 w-1/4 h-full bg-white/40 -skew-x-12 -translate-x-full group-hover:animate-[sheen_1s_ease-in-out]" />
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined symbol-filled">diamond</span>
                    {pool.multiCost}
                  </span>
                  <span className="uppercase tracking-wider">十连抽</span>
                </button>
                <button
                  onClick={() => handleDraw('single')}
                  disabled={drawing}
                  className="bg-surface-container text-on-surface font-button-text text-sm py-3 px-4 rounded-full border-4 border-outline-variant shadow-[3px_3px_0px_0px_#887178] md:shadow-[4px_4px_0px_0px_#887178] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined symbol-filled text-tertiary">diamond</span>
                    {pool.cost}
                  </span>
                  <span className="uppercase tracking-wider text-on-surface-variant">单抽</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-on-surface-variant text-sm mb-3">登录后开启抽卡</p>
                <a href="/login" className="inline-block bg-primary text-on-primary font-button-text text-sm px-6 py-2 rounded-full border-2 border-on-primary-container shadow-[3px_3px_0px_0px_rgba(119,1,67,0.4)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all no-underline">
                  登录
                </a>
              </div>
            )}
          </div>

          {/* 装饰星点 */}
          <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim absolute top-8 left-8 md:top-12 md:left-12 text-2xl md:text-4xl animate-sparkle">star</span>
          <span className="material-symbols-outlined symbol-filled text-primary-container absolute bottom-20 left-1/2 md:bottom-32 text-lg md:text-2xl animate-sparkle" style={{ animationDelay: '0.5s' }}>star</span>
          <span className="material-symbols-outlined symbol-filled text-secondary-container absolute top-1/4 right-1/2 text-2xl md:text-3xl animate-sparkle" style={{ animationDelay: '1s' }}>star</span>
        </div>

        {/* ④ 最新掉落 */}
        <div className="bg-surface rounded-2xl md:rounded-[32px] border-4 border-primary-fixed p-4 md:p-6 mb-4 md:mb-8 shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[6px_6px_0px_0px_rgba(255,119,175,0.2)]">
          <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary mb-3 md:mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">trophy</span>
            最新掉落
          </h2>
          {showcase.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2">style</span>
              <p className="text-sm">暂无掉落记录</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
              {showcase.map((item, i) => (
                <div key={i} className="group relative aspect-[3/4] rounded-lg overflow-hidden border-2 border-outline-variant shadow-[2px_2px_0px_0px_rgba(136,113,120,0.2)] hover:scale-105 hover:shadow-lg transition-all">
                  {item.url ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 translate-y-full group-hover:translate-y-0 transition-transform">
                    <p className="text-white text-xs font-medium truncate">{item.username || '匿名'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ⑤ 最近抽卡记录 */}
        {user && (
          <div className="bg-surface rounded-2xl md:rounded-[32px] border-4 border-primary-fixed p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(255,119,175,0.2)] md:shadow-[6px_6px_0px_0px_rgba(255,119,175,0.2)]">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="font-headline-md md:text-headline-lg text-headline-lg text-primary flex items-center gap-2">
                <span className="material-symbols-outlined symbol-filled text-tertiary-fixed-dim">history</span>
                最近抽卡
              </h2>
              <a href="/profile" className="font-label-bold text-xs text-primary hover:underline no-underline">查看全部 →</a>
            </div>
            {drawHistory.length === 0 ? (
              <div className="text-center py-6 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl mb-2">casino</span>
                <p className="text-sm">还没有抽卡记录，快去试试手气吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {drawHistory.map((record, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface-container-low border border-outline-variant">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${RARITY_DOT[record.rarity] || 'bg-n'}`} />
                    <span className="font-button-text text-xs text-on-surface shrink-0 min-w-[48px]">{formatRelativeTime(record.created_at)}</span>
                    <span className="font-label-bold text-xs text-on-surface-variant">{record.rarity}</span>
                    {record.is_pity ? (
                      <span className="material-symbols-outlined symbol-filled text-amber-400 text-sm">stars</span>
                    ) : null}
                    <span className="font-body-md text-xs text-on-surface-variant/60 ml-auto truncate">{record.source_name || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      <BottomNav activeTab="大厅" />

      {/* ⑥ 抽卡结果弹窗 */}
      <DrawResultDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        result={drawResult}
      />
    </div>
  );
}
```

- [ ] **Step 2: 运行 typecheck**

```bash
npm run typecheck
```
预期：无新增错误

---

### Task 6: 验证集成 — 本地启动测试

**Files:** 无代码改动，纯验证

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 浏览器验证清单**

在浏览器打开 `http://localhost:5173`，逐项检查：
- [ ] 无 JavaScript console 报错
- [ ] ① 公告横条如 KV 有数据则显示，点 ✕ 可关闭
- [ ] ② 登录后显示金币/等级/签到天数/抽卡次数 chip，签到按钮可点击
- [ ] ② 未登录显示登录引导
- [ ] ③ 限定池/常驻池切换时立绘区渐变、消耗钻石数联动变化
- [ ] ③ 登录后保底进度条显示真实数据（来自 `/api/user/info`）
- [ ] ③ 十连抽/单抽按钮可点击，钻石消耗显示正确
- [ ] ③ 未登录显示引导卡片
- [ ] ④ 最新掉落 6 宫格显示最近 gallery 数据
- [ ] ⑤ 登录后显示最近 5 条抽卡记录
- [ ] ⑤ 未登录不显示此区域
- [ ] ⑥ 抽卡成功弹出 Dialog，卡片逐张翻转，十连显示 5x2 网格
- [ ] ⑥ Dialog 关闭后用户数据刷新

- [ ] **Step 3: 确认无 console 报错后停止**

```bash
# Ctrl+C 停止 dev server
```

---

### Task 7: 最终提交

- [ ] **Step 1: 查看改动**

```bash
git status
git diff --stat
```

- [ ] **Step 2: 提交**

```bash
git add src/services/user-service.js app/routes/_index.jsx app/components/DrawResultDialog.jsx
git commit -m "feat: 首页重设计 — 公告/用户概览/真实保底/最新掉落/抽卡记录/结果弹窗"
```
