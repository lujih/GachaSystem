# 首页重设计 Spec

**日期**: 2026-05-20
**状态**: 待审核
**方案**: 方案 C（信息卡片流 — 参考 Blue Archive / 明日方舟）

---

## 目标

将 `app/routes/_index.jsx` 从硬编码静态占位页改为功能完整的可交互首页，同时提升视觉品质。

当前问题：
- loader 获取的 showcase（最新掉落）和 announcement（公告）未被渲染
- Banner 标题、保底进度、消耗钻石均为硬编码
- 池切换无实际效果
- 缺少用户概览、签到入口、抽卡历史
- 无 loading/error/empty 态
- 未登录时仍显示抽卡按钮
- 抽卡结果内嵌显示，缺乏沉浸感

---

## 页面布局（从上到下）

```
┌─────────────────────────────────────────┐
│  Header（已有，不改）                     │
├─────────────────────────────────────────┤
│ ① 公告横条（可关闭）                      │
├─────────────────────────────────────────┤
│ ② 用户概览卡片 [金币] [等级] [签到] ...   │
├─────────────────────────────────────────┤
│ ③ 池切换 + 抽卡主区域                     │
│   [限定|常驻]                             │
│   [立绘区] [保底进度条] [十连/单抽按钮]    │
├─────────────────────────────────────────┤
│ ④ 最新掉落 6 宫格                        │
├─────────────────────────────────────────┤
│ ⑤ 最近抽卡记录时间线（登录后显示）         │
├─────────────────────────────────────────┤
│ BottomNav（已有，不改）                    │
└─────────────────────────────────────────┘
```

---

## 详细设计

### ① 公告横条

**数据**: loader 已从 `KV_CACHE.get('system:announcement', { type: 'json' })` 获取，当前未渲染。

**UI**:
- 位于 Header 正下方，整行横幅
- `bg-primary-fixed` 底边 `border-b-2 border-primary-container`
- 左侧 📢 图标 + 公告标题 (`announcement.title`)，右侧 ✕ 关闭按钮
- 有 `refreshId` 时关闭存入 `localStorage('dismissedAnnouncement')`，同 ID 不再出现
- 无公告时不渲染 DOM

**Props**: `announcement?: { title: string, content: string, refreshId?: string } | null`

---

### ② 用户概览卡片

**数据**: `useAuth().user`，已含 `coins, level, exp, total_exp, login_streak, draw_count`。

**UI**:
- 登录后显示一行 chip 组，水平排列（移动端可横向滚动）：
  - 💰 `coins.toLocaleString()` 金币
  - ⭐ Lv.`level` + mini 经验条（`exp / 升级所需` 百分比）
  - 🔥 连续签到 `login_streak` 天
  - 🎴 累计抽卡 `draw_count` 次
- 右侧：签到按钮
  - 今日未签：突出显示（primary 色 + pulse 动画），点按调用 `POST /api/user/check-in`
  - 今日已签：灰色，显示 "已签到"
- 未登录：显示 "登录后解锁" 占位 + 登录按钮
- 容器：`bg-surface-container-low rounded-2xl border-2 border-outline-variant`

**交互**:
- 签到成功后 `refreshUser()`
- 点等级区域跳转 `/profile`

---

### ③ 池切换 + 抽卡主区域

**数据**:
- 保底计数：扩展 `GET /api/user/info` 响应，新增 `ssrPity` / `urPity` 字段
- 池信息：前端常量映射（池名称、消耗、概率描述）
- `useGacha()` hook（已有的 draw / multiDraw）

**UI**:

**上层 — 池切换标签**（保留现有 pill 样式）:
- `限定池` / `常驻池` 两个切换按钮
- 切换时下方信息联动更新

**中层 — 立绘展示区**:
- 限定池：显示 "当前 UP 角色" 文字 + `概率 UP!` badge（`bg-secondary text-on-secondary`）
- 常驻池：显示 "标准卡池 · 概率均等"
- 背景：区分池类型的渐变色 + 装饰星光（已有）
- 不放入实际角色图片（无数据源），纯文字 + 装饰

**下层 — 保底进度 + 抽卡按钮**:
- 保底进度条（替换硬编码 45/100）:
  - SSR 保底：`ssrPity / 10`，文案 "再抽 X 次必出 SSR"
  - UR 保底：`urPity / 50`，文案 "再抽 X 次必出 UR"
  - 显示为双行条状指示器，SSR 条在上（短），UR 条在下（长）
- 抽卡按钮组:
  - 十连抽（主按钮 · tertiary 金色 · 大号 · 显示 1600 钻石）
  - 单抽（次按钮 · surface · 较小 · 显示 160 钻石）
  - 限定池消耗不同（500/抽），显示对应数值

**未登录状态**:
- 池标签消失，整区替换为引导卡片:
  - "登录后开启抽卡" + 跳转登录按钮

---

### ④ 最新掉落 6 宫格

**数据**: loader 已有 `showcase`（最新 6 条 gallery）

**改动**:
- 直接在 `_index.jsx` 中渲染展示网格（复用 `GachaCard` 或简化版卡片）
- 空态："暂无掉落记录"
- 抽卡成功后 `useRevalidator()` 刷新 loader，掉落区自动更新

---

### ⑤ 最近抽卡记录时间线

**数据**: loader 新增查询 `draw_history` 表，取当前用户最近 5 条。

```sql
SELECT rarity, is_pity, source_name, created_at
FROM draw_history
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 5
```

**UI**:
- 标题 "最近抽卡" + "查看全部 →"（跳转 `/profile`）
- 每条一行: `[稀有度色标圆点] [相对时间] [稀有度标签] [来源]`
  - UR 保底: 🌟 标记
  - 时间用相对时间（"3 分钟前"），客户端用 `Intl.RelativeTimeFormat`
- 无记录: "还没有抽卡记录"
- 未登录: 不显示此区域

---

### ⑥ 抽卡结果弹窗（新增组件）

**组件**: `app/components/DrawResultDialog.jsx`

**行为**:
- 抽卡 API 返回后弹出 Dialog（shadcn/ui Dialog，全屏/大半屏）
- 十连: 5x2 网格，卡片逐张翻转展示（每张 200ms 延时）
- 单抽: 居中大卡片 + 稀有度专属 glow 特效
- 底部: 确认按钮 + 经验/金币变化 + 升级提示
- 关闭后: `refreshUser()` + `revalidate()` loader

**稀有度特效**:
- SSR: 金色 glow + 粒子（`animate-glow-ssr`）
- UR: 红色 glow + 彩虹边缘（`animate-glow-ur`）
- 保底: 额外 🌟 角标

---

## 改动文件清单

| 文件 | 改动 |
|------|------|
| `app/routes/_index.jsx` | 重写 — 集成全部 6 个区域 |
| `functions/api/[[path]].js` | `/api/user/info` 响应新增 `ssrPity` `urPity` |
| `src/services/user-service.js` | `getInfo()` 加 KV 保底计数器读取 |
| `app/components/DrawResultDialog.jsx` | **新增** — 抽卡结果弹窗 |
| `app/styles/global.css` | 可能追加少量动画 keyframe（保底进度 pulse 等） |

**不改动的文件**: `Header.jsx`, `BottomNav.jsx`, `Leaderboard.jsx`（组件保留但首页可能直接用内联渲染而非 Leaderboard 组件）, `useGacha.js`, `api.js`, 其他 routes

---

## 状态处理矩阵

> ✅ = 显示内容, ⬜ = 显示占位/引导, ❌ = 不渲染该区域

| 区域 | 已登录 · 有数据 | 已登录 · 无数据 | 未登录 |
|------|:--:|:--:|:--:|
| ① 公告 | ✅ | ❌ | ✅ |
| ② 用户概览 | ✅ | ✅(均为0) | ⬜ 登录引导 |
| ③ 抽卡区 | ✅ 真实数据 | ✅(保底0/10) | ⬜ 登录引导 |
| ④ 最新掉落 | ✅ | ⬜ "暂无" | ✅ |
| ⑤ 抽卡记录 | ✅ | ⬜ "还没有" | ❌ |
| ⑥ 结果弹窗 | ✅(触发后) | — | — |

---

## 非功能需求

- 所有文案使用中文
- 保底数据通过 KV 缓存同步，用户抽卡时可能短暂不一致（≤1 秒），可接受
- 桌面端 (md:) 与移动端两套断点适配
- 保留现有 CSS 变量和设计 token，不引入新颜色体系
