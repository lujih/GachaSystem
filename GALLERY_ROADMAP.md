# 图鉴页开发路线图

> 按优先级分阶段，每阶段可独立上线。依赖关系用 `→` 标注。

---

## Phase 1 — 核心体验补全（预计 1-2 天）

> 当前图鉴页"能看不能用"，本阶段让用户能交互、能找到自己的卡。

### 1.1 卡片点击放大（Lightbox）

**目标：** 点击卡片弹出大图查看详情

- [ ] `GachaCard` 组件接入 `onClick` 回调
- [ ] 新建 `CardDetailDialog` 组件（或复用 DrawResultDialog 简化版）
- [ ] 弹窗内容：大图、稀有度标签、获得时间、抽到者用户名
- [ ] 支持左右滑动/键盘切换上一张下一张
- [ ] 移动端全屏展示，桌面端居中弹窗

**涉及文件：**
- `app/components/GachaCard.jsx` — 添加 onClick
- `app/components/CardDetailDialog.jsx` — 新建
- `app/routes/library.jsx` — 接入弹窗状态

### 1.2 "我的收藏" / "全服图鉴" 切换

**目标：** 用户能查看自己抽到的卡

- [ ] 顶部加 Tab 切换：`全服图鉴` | `我的收藏`
- [ ] 后端 `/library/items` 加 `?userId=xxx` 参数支持
- [ ] 我的收藏模式下只显示 `user_id = 当前用户` 的记录
- [ ] 两种模式各自独立分页
- [ ] 未登录时隐藏"我的收藏" Tab

**涉及文件：**
- `functions/api/[[path]].js` — `/library/items` 加 userId 过滤
- `app/routes/library.jsx` — Tab 切换 + 传参
- `app/lib/api.js` — `getLibraryItems` 加 userId 参数

### 1.3 排序方式

**目标：** 支持多种排序

- [ ] 加排序下拉：最新获得（默认） | 稀有度优先 | 最早获得
- [ ] 后端支持 `?sort=newest` / `?sort=rarity` / `?sort=oldest`
- [ ] 稀有度排序：UR > SSR > SR > R > N，同稀有度按时间倒序

**涉及文件：**
- `functions/api/[[path]].js` — 排序逻辑
- `app/routes/library.jsx` — 排序选择器

---

## Phase 2 — 数据增强（预计 1-2 天）

> 让图鉴数据更丰富，为后续收集体系打基础。

### 2.1 收集进度统计

**目标：** 展示用户收集了多少张不同的卡

- [ ] 顶部统计区改造：
  - 全服共有 X 张不同卡
  - 你收集了 Y / X 张（完成度百分比）
  - 按稀有度的收集条（UR: 2/10, SSR: 15/50 ...）
- [ ] 后端新增 `/user/collection-stats` 接口
  - 查询全服去重后的不同图片数量
  - 查询当前用户去重后的不同图片数量
  - 按稀有度分组统计

**涉及文件：**
- `functions/api/[[path]].js` — 新增接口
- `app/routes/library.jsx` — 统计区 UI
- `app/lib/api.js` — 新增 API 方法

### 2.2 卡片名称修正

**目标：** 显示有意义的卡片名称而非抽到者用户名

- [ ] `gallery` 表新增 `source_name` 字段（图源名称，如 "Pixiv Best"）
- [ ] `updateGalleryIndex` 写入时带上 `sourceName`
- [ ] 前端优先显示 `source_name`，fallback 到 "未知来源"
- [ ] D1 迁移：`ALTER TABLE gallery ADD COLUMN source_name TEXT`

**涉及文件：**
- `schema.sql` — DDL
- `src/services/gacha-service.js` — `updateGalleryIndex` 写入 source_name
- `app/routes/library.jsx` — 显示逻辑

### 2.3 搜索与高级筛选

**目标：** 能按关键词和条件筛选

- [ ] 搜索框：按抽到者用户名模糊搜索
- [ ] 时间范围筛选：今天 / 本周 / 本月 / 全部
- [ ] 多稀有度组合筛选（勾选 UR+SSR 同时显示）
- [ ] 后端支持 `?search=xxx&period=week&rarities=UR,SSR`

**涉及文件：**
- `functions/api/[[path]].js` — 查询条件扩展
- `app/routes/library.jsx` — 筛选 UI

---

## Phase 3 — 社交互动（预计 2-3 天）

> 让图鉴从"看"变成"玩"。

### 3.1 点赞系统

**目标：** 用户可以给喜欢的卡片点赞

- [ ] 新建 `card_likes` 表：
  ```sql
  CREATE TABLE card_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gallery_id INTEGER NOT NULL REFERENCES gallery(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, gallery_id)
  );
  ```
- [ ] 后端新增 `POST /library/like` 和 `DELETE /library/like`
- [ ] `/library/items` 响应增加 `likeCount` 和 `isLiked`（当前用户）
- [ ] 卡片上显示 ❤️ 点赞数
- [ ] 排序增加"最热门"选项（按点赞数倒序）

**涉及文件：**
- `schema.sql` — 新表
- `functions/api/[[path]].js` — 点赞 API
- `app/routes/library.jsx` — 点赞 UI
- `app/components/GachaCard.jsx` — 点赞按钮

### 3.2 收藏/书签

**目标：** 用户可以收藏特定卡片方便回看

- [ ] 新建 `card_bookmarks` 表（结构同 card_likes）
- [ ] 后端新增 `POST /library/bookmark` 和 `DELETE /library/bookmark`
- [ ] 卡片右上角加书签图标
- [ ] Tab 切换增加"我的收藏夹"（区别于"我的收藏=我抽到的卡"）

**涉及文件：**
- `schema.sql` — 新表
- `functions/api/[[path]].js` — 书签 API
- `app/routes/library.jsx` — 书签 Tab + UI
- `app/components/GachaCard.jsx` — 书签按钮

---

## Phase 4 — 图鉴收集体系（预计 3-5 天）

> 完整的收集玩法，长期留存核心。

### 4.1 图鉴条目体系

**目标：** 每张唯一图片是一个图鉴条目，用户"解锁"而非"拥有"

- [ ] 新建 `catalog_entries` 表：
  ```sql
  CREATE TABLE catalog_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_hash TEXT UNIQUE NOT NULL,  -- 图片内容 hash
    url TEXT NOT NULL,
    rarity TEXT NOT NULL,
    source_name TEXT,
    first_seen_at INTEGER NOT NULL,
    total_draws INTEGER DEFAULT 1    -- 被抽到的总次数
  );
  ```
- [ ] 新建 `user_catalog` 表：
  ```sql
  CREATE TABLE user_catalog (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    catalog_id INTEGER NOT NULL REFERENCES catalog_entries(id) ON DELETE CASCADE,
    first_drawn_at INTEGER NOT NULL,
    draw_count INTEGER DEFAULT 1,
    PRIMARY KEY (user_id, catalog_id)
  );
  ```
- [ ] `updateGalleryIndex` 同时写入 `catalog_entries` 和 `user_catalog`
- [ ] 图鉴页展示所有条目，已解锁的亮色显示，未解锁的灰色剪影

### 4.2 图鉴完成度成就

**目标：** 收集达到里程碑获得奖励

- [ ] 定义图鉴里程碑：
  - 集齐 10 张不同卡 → 称号"初级图鉴师"
  - 集齐 50 张不同卡 → 称号"中级图鉴师" + 500 金币
  - 集齐所有 N 卡 → 称号"N卡大师" + 1000 金币
  - 集齐所有 SSR → 称号"SSR收藏家" + 5000 金币
  - 集齐全部图鉴 → 称号"图鉴之神" + 20000 金币
- [ ] 后端新增 `/catalog/check-milestones` 自动检测并发放
- [ ] 图鉴页展示里程碑进度

### 4.3 图鉴统计面板

**目标：** 丰富的收集数据展示

- [ ] 总收集率（去重图片数 / 全服不同图片总数）
- [ ] 按稀有度的收集进度条
- [ ] 最近解锁的 5 张卡
- [ ] 稀有度分布饼图（可选，纯 CSS 实现）
- [ ] "还差 X 张集齐" 提示

---

## Phase 5 — 长期扩展（持续迭代）

### 5.1 展示厅页面
- 独立的全屏展示模式，按稀有度分 Tab 浏览
- UR/SSR 卡片有特殊展示效果（粒子、光效）

### 5.2 社交分享
- 卡片详情页带唯一 URL（`/library/card/:id`）
- 分享到外部平台的链接

### 5.3 图鉴排行
- 收集完成度排行
- 点赞数排行
- 最稀有卡片排行

### 5.4 限时图鉴活动
- 特定时间段抽到的卡标记为"活动限定"
- 活动期间的收集排行榜

---

## 技术债务（随做随清）

- [ ] `gallery.username` 冗余存储，应 JOIN `users` 表（或保持冗余但确保更新同步）
- [ ] `ON CONFLICT(url) DO UPDATE` 会覆盖 `user_id`，同一张卡只能归属最后抽到的人
- [ ] 前端 `library.jsx` 未使用 SSR loader，所有数据客户端拉取（首次加载白屏）
- [ ] `GachaCard` 的 `level` 属性从未被传入（library 页没有等级数据）
