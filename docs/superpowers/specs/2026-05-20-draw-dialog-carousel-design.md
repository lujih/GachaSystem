# 抽卡结果弹窗重构 Spec

**日期**: 2026-05-20
**状态**: 待审核
**方案**: 全屏轮播

---

## 目标

重写 `app/components/DrawResultDialog.jsx`，将现有的基础网格/单卡弹窗改为沉浸式全屏轮播体验。

当前问题：
- 移动端弹窗太窄 (`max-w-lg`)，卡片太小
- 十连 3 列网格每卡 ~109px，图片细节无法看清
- 缺乏抽卡揭晓的仪式感和动画
- 静态展示，无交互趣味

---

## 组件接口（不变）

```ts
interface DrawResultDialogProps {
  open: boolean;
  onClose: () => void;
  result: {
    cards?: Array<{ rarity: string; imageUrl?: string; url?: string; asset?: { url: string }; isPity?: boolean }>;
    card?: { rarity: string; imageUrl?: string; url?: string; isPity?: boolean };
    expGained?: number;
    levelUp?: { newLevel: number; reward: number } | null;
  } | null;
}
```

---

## 布局结构

```
┌──────────────────────────────────┐
│  全屏遮罩 (bg-black/70)          │
│  ┌────────────────────────────┐  │
│  │  × 关闭 (右上角固定)        │  │
│  │                            │  │
│  │     ┌──────────┐           │  │
│  │     │          │           │  │
│  │     │  卡片    │  75vw     │  │
│  │     │  3:4     │  移动端   │  │
│  │     │          │  max-w-xs │  │
│  │     └──────────┘  桌面端   │  │
│  │                            │  │
│  │  ● ● ● ○ ○ ○ ○ ○ ○ ○      │  │  圆点指示器
│  │                            │  │
│  │  稀有度标签 + 经验信息      │  │
│  │                            │  │
│  │  [  下一张  ]              │  │  主操作按钮
│  │  [  跳过  ]                │  │  展示全部
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

---

## 交互流程

1. 弹窗打开 → 遮罩 fade in
2. 第 1 张卡翻转动画入场 (rotateY 180→0, 400ms)
3. 用户点击卡片 / "下一张"按钮 → 下一张翻转
4. 逐张揭晓，每张间隔 400ms 动画
5. 显示完最后一张 → 按钮变为"确定"
6. 点击"跳过" → 立即全部展示（网格视图作为后备）
7. 点击"×" → 任何时候关闭
8. 关闭 → 遮罩 fade out

---

## 卡片动画

**翻转入场**: `transform: rotateY(180deg) scale(0.8)` → `rotateY(0deg) scale(1)` (400ms ease-out)

**稀有度光效**:
- N/R: 无特效
- SR: 淡紫色 `box-shadow`
- SSR: 金色脉冲 `box-shadow: 0 0 20px rgba(245,158,11,0.6)` → `40px`
- UR: 彩虹旋转边框（CSS `@property` 或 `conic-gradient` border）

**保底标记**: 卡片右上角 🌟 旋转放大动画

---

## 圆点指示器

- 10 个圆点（或根据 cards.length 动态）
- 已翻过: `bg-primary w-2 h-2`
- 当前: `bg-primary w-3 h-3 animate-pulse`
- 未翻: `border border-outline-variant w-2 h-2`

---

## 响应式

| 属性 | 移动端 | 桌面端 |
|------|--------|--------|
| 弹窗 | `fixed inset-0` | 同 |
| 卡片宽度 | `w-[75vw]` | `max-w-xs` (20rem) |
| 圆点间距 | `gap-1.5` | `gap-2` |
| 按钮文字 | `text-sm` | `text-base` |

---

## 文件

- **重写**: `app/components/DrawResultDialog.jsx`
- **不改**: `_index.jsx`（接口不变）、其他文件

---

## 状态处理

- `cards.length === 0` → 不渲染（`open && cards.length > 0` 条件）
- 单抽 (1 张) → 直接显示最终态，按钮为"确定"
- 十连 → 完整轮播流程
- 图片加载失败 → 稀有度渐变背景 + 大字母
