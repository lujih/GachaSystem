# Chouka 广告与运营开发计划

## 概述

本文档为Chouka抽卡系统的广告与运营功能开发计划，预计实施周期为5周。

---

## 第一阶段：数据库与配置（第1周）

### 1.1 数据库表扩展 (schema.sql)

```sql
-- 广告系统表
CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad_type TEXT NOT NULL, -- 'rewarded_video', 'banner'
    placement TEXT NOT NULL, -- 'home_top', 'profile_sidebar'
    content TEXT NOT NULL, -- JSON配置或第三方广告代码
    reward_coins INTEGER DEFAULT 0, -- 观看奖励金币数
    cooldown_seconds INTEGER DEFAULT 3600, -- 冷却时间(秒)
    max_views_per_day INTEGER DEFAULT 5, -- 每日最大观看次数
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
) STRICT;

CREATE TABLE IF NOT EXISTS user_ad_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    ad_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL, -- 'view', 'click', 'complete'
    reward_given INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    CONSTRAINT fk_uai_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_uai_ad FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
) STRICT;

-- 运营自动化表
CREATE TABLE IF NOT EXISTS daily_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    day_number INTEGER NOT NULL, -- 连续天数
    reward_type TEXT NOT NULL, -- 'coins', 'exp', 'special'
    amount INTEGER NOT NULL,
    claimed_at INTEGER,
    created_at INTEGER NOT NULL,
    CONSTRAINT fk_dr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS ad_cooldowns (
    user_id INTEGER NOT NULL,
    ad_type TEXT NOT NULL,
    last_watched_at INTEGER NOT NULL,
    views_today INTEGER DEFAULT 0,
    last_reset_day INTEGER NOT NULL, -- 用于每日重置
    PRIMARY KEY (user_id, ad_type),
    CONSTRAINT fk_ac_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) STRICT;
```

### 1.2 配置扩展 (worker.js - BUSINESS_CONFIG)

在 `BUSINESS_CONFIG` 中添加：

```javascript
ADS: {
    REWARDED_VIDEO: {
        COINS_PER_VIEW: 50,
        COOLDOWN_SECONDS: 3600,
        MAX_VIEWS_PER_DAY: 5,
        MIN_LEVEL_REQUIRED: 1
    },
    BANNER: {
        PLACEMENTS: ['home_top', 'profile_sidebar', 'gallery_bottom'],
        ROTATION_INTERVAL: 300, // 秒
        ENABLED: true
    },
    DAILY_REWARDS: {
        STREAK_BONUS: [50, 100, 150, 200, 300, 500, 1000], // 7天周期
        RESET_HOUR: 4 // 北京时间凌晨4点重置
    }
}
```

---

## 第二阶段：后端API实现（第2周）

### 2.1 新增API端点

在 routes 对象中添加：

```javascript
'GET /ads/available': () => handleRoute(() => adService.getAvailableAds(currentUser)),
'POST /ads/watch': () => handleRoute(() => adService.watchAd(currentUser, request)),
'GET /ads/banner': () => handleRoute(() => adService.getBannerAd(currentUser)),
'POST /daily/reward/claim': () => handleRoute(() => userService.claimDailyReward(currentUser)),
'GET /daily/reward/status': () => handleRoute(() => userService.getDailyRewardStatus(currentUser)),
'POST /admin/ads/create': () => handleRoute(() => handleAdminCreateAd(request, env)),
'GET /admin/ads/stats': () => handleRoute(() => handleAdminAdStats(request, env))
```

### 2.2 AdService 类结构

```javascript
class AdService {
    constructor(env, ctx, userService) {
        this.env = env;
        this.ctx = ctx;
        this.userService = userService;
    }
    
    async getAvailableAds(user) {
        // 检查用户等级、冷却时间、每日限制
        // 返回可用广告列表
    }
    
    async watchAd(user, request) {
        // 验证广告ID和用户资格
        // 更新冷却时间
        // 发放金币奖励
        // 记录交互日志
    }
    
    async getBannerAd(user) {
        // 根据placement返回合适的横幅广告
        // 支持轮换逻辑
    }
}
```

### 2.3 UserService 扩展

添加以下方法：

```javascript
async claimDailyReward(user) {
    // 检查是否已领取
    // 计算连续天数
    // 发放奖励
    // 更新领取记录
}

async getDailyRewardStatus(user) {
    // 返回今日奖励状态和连续天数
}
```

---

## 第三阶段：前端界面实现（第3周）

### 3.1 HTML 组件

#### 奖励视频广告按钮
```html
<button class="btn ad-btn" onclick="App.watchAd()" style="background: linear-gradient(135deg, #F59E0B, #D97706);">
    <i class="fas fa-play-circle"></i> 观看广告赚金币 (+50)
</button>
```

#### 横幅广告区域
```html
<div class="banner-ad" id="bannerAdTop">
    <!-- 动态加载广告内容 -->
</div>
```

#### 每日奖励面板
```html
<div class="daily-rewards-panel">
    <h4><i class="fas fa-calendar-check"></i> 每日签到</h4>
    <div class="rewards-streak">
        <div class="streak-day" data-day="1">第1天<br>+50金币</div>
        <div class="streak-day" data-day="2">第2天<br>+100金币</div>
        <!-- ... -->
    </div>
</div>
```

### 3.2 App 对象扩展

```javascript
async watchAd() {
    try {
        this.loading = true;
        const res = await fetch('/ads/watch', {
            method: 'POST',
            body: JSON.stringify({ adId: this.selectedAdId })
        });
        const data = await res.json();
        if (data.success) {
            this.toast(`获得 ${data.rewardCoins} 金币！`, 'ok');
            this.coins += data.rewardCoins;
            this.updateCoinsDisplay();
        }
    } catch(e) {
        this.toast('广告加载失败', 'warn');
    } finally {
        this.loading = false;
    }
},

async loadBannerAds() {
    // 加载横幅广告
},

async claimDailyReward() {
    // 领取每日奖励
}
```

### 3.3 CSS 样式

```css
.ad-btn {
    background: linear-gradient(135deg, #F59E0B, #D97706);
    border: none;
    color: white;
    font-weight: 600;
}

.banner-ad {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    margin: 16px 0;
    text-align: center;
    min-height: 90px;
}

.daily-rewards-panel {
    background: rgba(255, 255, 255, 0.03);
    border-radius: 16px;
    padding: 20px;
    margin-top: 20px;
}

.streak-day {
    display: inline-block;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    text-align: center;
    line-height: 1.2;
    font-size: 0.8rem;
    margin: 0 4px;
}

.streak-day.claimed {
    background: linear-gradient(135deg, #10B981, #059669);
    color: white;
}
```

---

## 第四阶段：运营自动化（第4周）

### 4.1 广告轮换系统
- 实现基于时间的广告轮换
- 添加广告权重系统（按点击率优化）
- 创建广告投放报告

### 4.2 每日奖励自动化
- 自动重置每日奖励状态（北京时间4点）
- 连续天数追踪
- 特殊节日奖励

### 4.3 管理员后台
```html
<!-- 在管理面板添加广告管理标签 -->
<button class="admin-tab" onclick="App.switchAdminTab('ads')" id="tab-ads">
    <i class="fas fa-ad"></i>广告管理
</button>

<div id="view-ads" style="display:none;">
    <div class="admin-section-title">
        <span><i class="fas fa-ad" style="color:#8B5CF6;margin-right:8px;"></i>广告管理</span>
        <button class="admin-btn primary small" onclick="App.createNewAd()">+ 新建广告</button>
    </div>
    <!-- 广告列表和统计 -->
</div>
```

---

## 第五阶段：测试与优化（第5周）

### 5.1 功能测试
- [ ] 广告观看流程测试
- [ ] 金币奖励验证
- [ ] 冷却时间逻辑测试
- [ ] 每日限制检查

### 5.2 性能测试
- [ ] 广告加载性能
- [ ] 数据库查询优化
- [ ] 缓存策略实施

### 5.3 A/B测试
- [ ] 不同奖励金额的转化率
- [ ] 广告位置优化
- [ ] 按钮文案测试

---

## 技术实施细节

### 6.1 广告提供商集成选项

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| Google AdSense | 广告源丰富，自动变现 | 需要审核，有政策风险 | 国际化项目 |
| 自定义广告 | 完全可控，零成本 | 需要自行招商 | 垂直领域 |
| 混合模式 | 平衡收益和体验 | 实现复杂 | 成熟项目 |

### 6.2 防作弊机制
- 广告观看时间验证（至少30秒）
- IP地址限制（同一IP每日上限）
- 设备指纹识别
- 异常行为检测（频繁领取、异常时间）

### 6.3 数据统计与分析

```javascript
// 广告效果追踪
async trackAdPerformance(adId, metric, value) {
    await this.env.KV_CACHE.put(
        `ad_stats:${adId}:${metric}:${Date.now()}`,
        JSON.stringify({ value, timestamp: Date.now() }),
        { expirationTtl: 2592000 } // 30天
    );
}
```

---

## 预期收益指标

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 每日广告观看次数 | 3-5次/用户 | 每用户每天平均观看广告次数 |
| 广告点击率 | 1-2% | 横幅广告点击率 |
| 金币消耗补充 | 30-50% | 通过广告补充的金币比例 |
| 用户留存提升 | +15% | 有奖励机制的用户留存率 |

---

## 风险与应对

| 风险 | 应对措施 |
|------|----------|
| 广告加载性能 | 实现懒加载和缓存 |
| 用户反感 | 控制广告频率，提供关闭选项 |
| 作弊行为 | 实施防作弊机制 |
| 广告内容安全 | 人工审核或使用可信广告源 |

---

## 实施优先级

### P0（必需）
1. [ ] 奖励视频广告系统
2. [ ] 每日签到奖励
3. [ ] 基本防作弊机制

### P1（重要）
1. [ ] 横幅广告系统
2. [ ] 广告管理后台
3. [ ] 数据统计面板

### P2（优化）
1. [ ] 广告轮换算法
2. [ ] A/B测试框架
3. [ ] 个性化推荐

---

## 开发进度追踪

| 周次 | 内容 | 状态 |
|------|------|------|
| 第1周 | 数据库与配置 | ⬜ |
| 第2周 | 后端API实现 | ⬜ |
| 第3周 | 前端界面实现 | ⬜ |
| 第4周 | 运营自动化 | ⬜ |
| 第5周 | 测试与优化 | ⬜ |

---

*文档创建日期：2026-03-01*
*最后更新：2026-03-01*
