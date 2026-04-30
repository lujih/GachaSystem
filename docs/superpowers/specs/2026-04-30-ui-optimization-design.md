# Frontend UI Optimization Design

**Date:** 2026-04-30
**Status:** Approved
**Goal:** Transform the basic UI into a modern, luxurious gacha experience

## Tech Stack

- **Tailwind CSS v4** — Vite plugin mode, utility-first CSS
- **shadcn/ui** — High-quality React components (Button, Card, Input, Badge, Tabs, Dialog)
- **CSS Animations** — Keyframes for gacha effects, no external libraries

## Visual Style

### Color Palette (Preserved)
- Primary: `#6366f1` (indigo)
- N: `#64748b` (gray)
- R: `#3b82f6` (blue)
- SR: `#8b5cf6` (purple)
- SSR: `#f59e0b` (gold)
- UR: `#ef4444` (red)

### Design Language
- **Background:** Gradient from indigo-50 → purple-50 → pink-50
- **Cards:** Glass morphism (semi-transparent + backdrop-blur)
- **Buttons:** Gradient backgrounds + hover glow effects
- **Shadows:** Layered shadows for depth
- **Borders:** Subtle gradients for premium feel

## Page Designs

### Header
- Fixed top + glass morphism (`backdrop-blur-xl bg-white/80`)
- Logo: Gradient text + sparkle icon
- User info: Avatar + level badge + coin icon
- Mobile: Hamburger menu + slide-in sidebar

### Home Page (`_index.jsx`)
- Announcement: Glass card with gradient border
- Tabs: shadcn Tabs with sliding indicator
- Draw panel: Large gradient button with pulse animation
- Showcase: Grid with hover scale effect

### Gacha Experience
- **Card Flip:** `rotateY(180deg)` with `perspective(1000px)`
- **SSR+:** Gold glow + box-shadow pulse
- **UR:** Red particle effect (CSS radial-gradient animation)
- **Multi-draw:** Sequential flip with `animation-delay`

### Responsive Design
- Mobile-first: `sm:` `md:` `lg:` breakpoints
- Card grid: 2 cols mobile → 4 cols desktop
- Navigation: Mobile hamburger menu

## Implementation Steps

1. Configure Tailwind CSS + shadcn/ui
2. Create base UI components (Button, Card, Input, Badge, Tabs)
3. Redesign Header component
4. Redesign home page layout
5. Implement gacha animation component
6. Redesign other pages (library, profile, login, admin)
7. Responsive adaptation
8. Test and optimize

## Files to Modify

- `vite.config.ts` — Add Tailwind plugin
- `tailwind.config.ts` — Custom theme
- `app/styles/global.css` — Tailwind directives
- `app/root.jsx` — Update imports
- `app/components/Header.jsx` — Redesign
- `app/components/DrawPanel.jsx` — Add animations
- `app/components/Inventory.jsx` — Redesign
- `app/components/DiceGame.jsx` — Redesign
- `app/components/ShopPanel.jsx` — Redesign
- `app/components/Leaderboard.jsx` — Redesign
- `app/components/LoginForm.jsx` — Redesign
- `app/routes/_index.jsx` — Redesign
- `app/routes/library.jsx` — Redesign
- `app/routes/profile.jsx` — Redesign
- `app/routes/login.jsx` — Redesign
- `app/routes/admin.jsx` — Redesign
