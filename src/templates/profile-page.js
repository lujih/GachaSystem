// =========================================
// 个人资料页模板
// =========================================

export function getProfilePage() {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>个人档案 - Chouka</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Russo+One&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    :root {
      --primary: #7C3AED;
      --primary-dark: #5B21B6;
      --primary-light: #A78BFA;
      --secondary: #06B6D4;
      --cta: #F43F5E;
      --bg: #F8FAFC;
      --bg-card: #FFFFFF;
      --text: #1E293B;
      --text-light: #64748B;
      --text-muted: #94A3B8;
      --success: #10B981;
      --warning: #F59E0B;
      --danger: #EF4444;
      --r-n: #64748B;
      --r-r: #3B82F6;
      --r-sr: #8B5CF6;
      --r-ssr: #F59E0B;
      --r-ur: #EC4899;
      --radius: 16px;
      --shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
      --font-display: 'Russo One', sans-serif;
      --font-body: 'Chakra Petch', sans-serif;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
    }
    body {
      background: var(--bg);
      min-height: 100vh;
      color: var(--text);
      font-family: var(--font-body);
      margin: 0;
      overflow-x: hidden;
    }
    .container { max-width: 480px; margin: 0 auto; padding: 20px 16px 40px; }
    
    /* Header */
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .back-btn {
      width: 44px; height: 44px; border-radius: 12px; border: none;
      background: white; color: var(--text);
      font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
      box-shadow: var(--shadow);
    }
    .back-btn:hover { background: var(--primary); color: white; transform: translateX(-2px); }
    .page-title { font-family: var(--font-display); font-size: 1.5rem; margin: 0; letter-spacing: 1px; color: var(--text); }
    .logout-header-btn {
      width: 44px; height: 44px; border-radius: 12px; border: none;
      background: rgba(239, 68, 68, 0.1); color: var(--danger);
      font-size: 1.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    }
    .logout-header-btn:hover { background: var(--danger); color: white; }
    
    /* Profile Card */
    .profile-card {
      background: white;
      border-radius: var(--radius);
      padding: 28px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
      border: 1px solid #E2E8F0;
      box-shadow: var(--shadow);
    }
    .avatar-wrapper {
      position: relative; width: 100px; height: 100px; margin: 0 auto 16px;
    }
    .avatar {
      width: 100px; height: 100px; border-radius: 50%;
      border: 3px solid var(--primary);
      box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
      object-fit: cover;
    }
    .level-badge {
      position: absolute; bottom: -4px; right: -4px;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; font-family: var(--font-display); font-size: 0.85rem;
      padding: 4px 10px; border-radius: 20px;
      box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
      border: 2px solid white;
    }
    .nickname-row { position: relative; display: flex; justify-content: center; align-items: center; margin: 0 0 2px 0; }
    .nickname { font-family: var(--font-display); font-size: 1.4rem; letter-spacing: 0.5px; color: var(--text); line-height: 1.2; }
    .edit-nickname-btn {
      position: relative; margin-left: 6px;
      width: 24px; height: 24px; border-radius: 50%; border: none;
      background: rgba(124, 58, 237, 0.1); color: var(--primary);
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; transition: all 0.2s ease;
    }
    .edit-nickname-btn:hover {
      background: var(--primary); color: white; transform: scale(1.1);
    }
    .username { color: var(--text-light); font-size: 0.9rem; margin-bottom: 6px; }
    
    /* Title Badge */
    .title-display { margin-top: 8px; }
    .title-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, #EDE9FE, #DDD6FE);
      border: 1px solid #A78BFA;
      color: var(--primary); padding: 6px 14px; border-radius: 20px;
      font-size: 0.85rem; font-weight: 600;
      transition: all 0.2s ease;
    }
    .title-badge:hover {
      background: var(--primary); color: white;
      transform: translateY(-1px);
    }
    
    /* Stats Row */
    .stats-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 24px; }
    .stat-box {
      background: #F8FAFC;
      border-radius: 12px; padding: 16px 12px;
      border: 1px solid #E2E8F0;
      transition: all 0.2s ease;
    }
    .stat-box:hover { background: white; transform: translateY(-2px); box-shadow: var(--shadow); }
    .stat-icon { font-size: 1.3rem; margin-bottom: 6px; }
    .stat-icon.coins { color: var(--warning); }
    .stat-icon.draws { color: var(--secondary); }
    .stat-value { font-family: var(--font-display); font-size: 1.5rem; margin-bottom: 2px; }
    .stat-value.coins { color: var(--warning); }
    .stat-label { color: var(--text-light); font-size: 0.8rem; }
    
    /* Exp Bar */
    .exp-section { margin-top: 20px; }
    .exp-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.85rem; }
    .exp-text { color: var(--text-light); }
    .exp-percent { color: var(--primary); font-weight: 600; }
    .exp-bar {
      height: 10px; background: #E2E8F0;
      border-radius: 5px; overflow: hidden;
    }
    .exp-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      border-radius: 5px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Inventory Section */
    .section-card {
      background: white;
      border-radius: var(--radius); margin-top: 20px;
      padding: 20px; border: 1px solid #E2E8F0;
      box-shadow: var(--shadow);
    }
    .section-title {
      font-family: var(--font-display); font-size: 1rem;
      margin: 0 0 16px 0; display: flex; align-items: center; gap: 8px;
      letter-spacing: 0.5px; color: var(--text);
    }
    .inventory-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
    .inv-item {
      background: #F8FAFC;
      border-radius: 10px; padding: 12px 6px;
      text-align: center; border: 1px solid #E2E8F0;
      transition: all 0.2s ease; cursor: pointer;
    }
    .inv-item:hover { transform: translateY(-3px); box-shadow: var(--shadow); }
    .inv-item.N { border-color: var(--r-n); }
    .inv-item.N:hover { background: rgba(100,116,139,0.1); }
    .inv-item.R { border-color: var(--r-r); }
    .inv-item.R:hover { background: rgba(59,130,246,0.1); }
    .inv-item.SR { border-color: var(--r-sr); }
    .inv-item.SR:hover { background: rgba(139,92,246,0.1); }
    .inv-item.SSR { border-color: var(--r-ssr); }
    .inv-item.SSR:hover { background: rgba(245,158,11,0.1); }
    .inv-item.UR { border-color: var(--r-ur); }
    .inv-item.UR:hover { background: rgba(236,72,153,0.1); }
    .inv-rarity { font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
    .inv-rarity.N { color: var(--r-n); }
    .inv-rarity.R { color: var(--r-r); }
    .inv-rarity.SR { color: var(--r-sr); }
    .inv-rarity.SSR { color: var(--r-ssr); }
    .inv-rarity.UR { 
      background: linear-gradient(90deg, #EC4899, #F59E0B, #8B5CF6);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
    .inv-count { font-size: 0.8rem; color: var(--text-light); }
    .total-inv { text-align: center; margin-top: 12px; font-size: 0.85rem; color: var(--text-light); }
    
    /* Action Buttons */
    .action-grid { display: flex; justify-content: center; margin-top: 20px; }
    .btn {
      padding: 14px 20px; border-radius: 12px; font-weight: 600;
      font-family: var(--font-body); font-size: 0.95rem;
      cursor: pointer; border: none; transition: all 0.2s ease;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn:active { transform: scale(0.97); }
    .btn-primary {
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      color: white; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);
    }
    .btn-primary:hover { box-shadow: 0 6px 16px rgba(124, 58, 237, 0.4); transform: translateY(-2px); }
    .btn-secondary {
      background: #F1F5F9; color: var(--text);
      border: 1px solid #E2E8F0;
    }
    .btn-secondary:hover { background: #E2E8F0; }
    
    /* Modal */
    .modal {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px); display: none; justify-content: center; align-items: center;
      z-index: 2000; opacity: 0; transition: opacity 0.25s ease;
    }
    .modal.show { display: flex; opacity: 1; }
    .modal-content {
      background: white;
      border-radius: var(--radius); width: 90%; max-width: 400px;
      padding: 24px; position: relative;
      border: 1px solid #E2E8F0;
      box-shadow: 0 20px 40px rgba(0,0,0,0.15);
      transform: scale(0.9); transition: transform 0.25s ease;
    }
  .modal.show .modal-content, .modal.show .admin-modal-content { transform: scale(1); }
    .modal-close {
      position: absolute; top: 16px; right: 16px;
      background: none; border: none; color: var(--text-light);
      font-size: 1.2rem; cursor: pointer; padding: 4px; transition: color 0.2s;
    }
    .modal-close:hover { color: var(--danger); }
    .modal-title { font-family: var(--font-display); font-size: 1.2rem; margin: 0 0 20px 0; color: var(--text); }
    
    /* About Panel - Inline */
    .about-panel {
      background: white;
      border-radius: var(--radius);
      border: 1px solid #E2E8F0;
      margin-top: 24px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }
    .about-header {
      background: linear-gradient(90deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.05));
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      color: var(--primary);
      border-bottom: 1px solid #E2E8F0;
    }
    .about-header i { font-size: 1rem; }
    .about-content { padding: 16px; }
    .about-title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px; color: var(--text);
    }
    .about-version {
      font-family: var(--font-body);
      font-size: 0.75rem;
      color: var(--text-light);
      font-weight: 400;
    }
    .about-desc {
      font-size: 0.85rem;
      color: var(--text-light);
      margin-bottom: 12px;
    }
    .about-tech {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .tech-tag {
      background: rgba(124, 58, 237, 0.1);
      color: var(--primary);
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .about-features {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .feature-item {
      font-size: 0.8rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .feature-item i { color: var(--success); font-size: 0.75rem; }
    .about-footer {
      padding: 12px 16px;
      font-size: 0.7rem;
      color: var(--text-muted);
      opacity: 0.6;
      text-align: center;
      border-top: 1px solid rgba(124, 58, 237, 0.1);
    }
    
    /* Title List */
    .title-list { max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .title-item {
      padding: 12px 16px; border-radius: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      display: flex; justify-content: space-between; align-items: center;
      cursor: pointer; transition: all 0.2s ease;
    }
    .title-item:hover { background: rgba(124, 58, 237, 0.15); border-color: var(--primary); }
    .title-item.active { background: rgba(124, 58, 237, 0.2); border-color: var(--primary); }
    .title-item-name { font-weight: 600; }
    .title-item .check { color: var(--success); display: none; }
    .title-item.active .check { display: block; }
    .no-title { text-align: center; color: var(--text-muted); padding: 20px; }
    
    /* Reward List */
    .reward-list { max-height: 350px; overflow-y: auto; }
    .reward-item {
      padding: 14px; border-radius: 10px; margin-bottom: 10px;
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06);
      display: flex; justify-content: space-between; align-items: center;
    }
    .reward-item.reached { border-color: rgba(16, 185, 129, 0.3); background: rgba(16, 185, 129, 0.08); }
    .reward-level { font-family: var(--font-display); font-size: 1rem; }
    .reward-item.reached .reward-level { color: var(--success); }
    .reward-item:not(.reached) .reward-level { color: var(--text-muted); }
    .reward-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 2px; }
    .reward-btn {
      padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 0.85rem;
      cursor: pointer; border: none; transition: all 0.2s;
    }
    .reward-btn.claim { background: var(--success); color: white; }
    .reward-btn.claim:hover { background: #059669; }
    .reward-btn.disabled { background: rgba(255,255,255,0.1); color: var(--text-muted); cursor: not-allowed; }
    
    /* Toast */
    .toast {
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px);
      background: rgba(30, 41, 59, 0.95); color: white;
      padding: 12px 24px; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
      font-size: 0.9rem; z-index: 3000;
      opacity: 0; transition: all 0.3s ease;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
    .toast.success { border-color: var(--success); }
    .toast.error { border-color: var(--danger); }
    
    /* Loading skeleton */
    .skeleton { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="page-header">
      <button class="back-btn" onclick="window.location.href='/'" aria-label="返回首页">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h1 class="page-title">个人档案</h1>
      <button class="logout-header-btn" onclick="App.logout()" aria-label="退出登录">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>

    <div class="profile-card">
      <div class="avatar-wrapper">
        <img class="avatar" id="profileAvatar" src="https://api.dicebear.com/7.x/adventurer/svg?seed=default" alt="用户头像">
        <span class="level-badge" id="profileLevelBadge">Lv.1</span>
      </div>
      <div class="nickname-row">
        <h2 class="nickname" id="profileNickname">加载中...</h2>
        <button class="edit-nickname-btn" onclick="App.editProfile()" aria-label="修改昵称">
          <i class="fas fa-edit"></i>
        </button>
      </div>
      <div class="username">@<span id="profileUsername">...</span></div>
      <div class="title-display">
        <span class="title-badge" id="currentTitleBadge" style="display:none;cursor:pointer;" onclick="App.openTitleModal()">
          <i class="fas fa-crown"></i> <span id="titleName"></span>
        </span>
        <span class="title-badge" id="noTitleBadge" style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.1);color:var(--text-muted);cursor:pointer;" onclick="App.openTitleModal()">
          <i class="fas fa-crown"></i> 暂无称号
        </span>
      </div>

      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-icon coins"><i class="fas fa-coins"></i></div>
          <div class="stat-value coins" id="profileCoins">-</div>
          <div class="stat-label">当前积分</div>
        </div>
        <div class="stat-box" onclick="App.openRewardModal()" style="cursor:pointer;">
          <div class="stat-icon" style="color:var(--warning);"><i class="fas fa-gift"></i></div>
          <div class="stat-value" style="color:var(--warning);">等级奖励</div>
          <div class="stat-label">查看奖励</div>
        </div>
      </div>

      <div class="exp-section">
        <div class="exp-header">
          <span class="exp-text">经验值: <span id="profileExp">0</span> / <span id="profileExpNext">100</span></span>
          <span class="exp-percent" id="profileExpPercent">0%</span>
        </div>
        <div class="exp-bar">
          <div class="exp-fill" id="profileExpFill" style="width:0%"></div>
        </div>
      </div>
    </div>

    <div class="section-card">
      <h3 class="section-title"><i class="fas fa-layer-group"></i> 卡片收集统计</h3>
      <div class="inventory-grid">
        <div class="inv-item N"><div class="inv-rarity N">N</div><div class="inv-count" id="invCountN">0</div></div>
        <div class="inv-item R"><div class="inv-rarity R">R</div><div class="inv-count" id="invCountR">0</div></div>
        <div class="inv-item SR"><div class="inv-rarity SR">SR</div><div class="inv-count" id="invCountSR">0</div></div>
        <div class="inv-item SSR"><div class="inv-rarity SSR">SSR</div><div class="inv-count" id="invCountSSR">0</div></div>
        <div class="inv-item UR"><div class="inv-rarity UR">UR</div><div class="inv-count" id="invCountUR">0</div></div>
      </div>
      <div class="total-inv">召唤总数: <strong id="profileTotalCards">0</strong></div>
    </div>

    <!-- 关于面板 - 内联展示 -->
    <div class="about-panel">
      <div class="about-header">
        <i class="fas fa-cube"></i>
        <span>关于系统</span>
      </div>
      <div class="about-content">
        <div class="about-title">Chouka 抽卡系统 <span class="about-version">v1.0</span></div>
        <div class="about-desc">基于 Cloudflare Workers 的轻量级二次元抽卡系统</div>
        <div class="about-tech">
          <span class="tech-tag"><i class="fas fa-cloud"></i> Workers</span>
          <span class="tech-tag"><i class="fas fa-database"></i> D1</span>
          <span class="tech-tag"><i class="fas fa-hdd"></i> R2</span>
          <span class="tech-tag"><i class="fab fa-github"></i> GitHub</span>
        </div>
        <div class="about-features">
          <div class="feature-item"><i class="fas fa-check-circle"></i> 常驻池与限定池抽卡</div>
          <div class="feature-item"><i class="fas fa-check-circle"></i> 卡片合成系统</div>
          <div class="feature-item"><i class="fas fa-check-circle"></i> 玩家共建图片库</div>
          <div class="feature-item"><i class="fas fa-check-circle"></i> 等级称号与奖励</div>
        </div>
      </div>
      <div class="about-footer">
        &copy; 2026 Chouka
      </div>
    </div>

  </div>

  <!-- 称号管理弹窗 -->
  <div id="titleModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="titleModalTitle">
    <div class="modal-content">
      <button class="modal-close" onclick="App.closeTitleModal()" aria-label="关闭"><i class="fas fa-times"></i></button>
      <h3 class="modal-title" id="titleModalTitle"><i class="fas fa-crown"></i> 称号管理</h3>
      <div class="title-list" id="titleList"></div>
      <button class="btn btn-secondary" style="width:100%;margin-top:16px;" onclick="App.equipTitle(null)">卸下当前称号</button>
    </div>
  </div>

  <!-- 等级奖励弹窗 -->
  <div id="rewardModal" class="modal" role="dialog" aria-modal="true" aria-labelledby="rewardModalTitle">
    <div class="modal-content">
      <button class="modal-close" onclick="App.closeRewardModal()" aria-label="关闭"><i class="fas fa-times"></i></button>
      <h3 class="modal-title" id="rewardModalTitle"><i class="fas fa-gift"></i> 等级奖励</h3>
      <div class="reward-list" id="rewardList"></div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script>
    const MILESTONES = {
      5: { coins: 500, title: '新手收藏家' },
      10: { coins: 1000, title: '初级收藏家' },
      20: { coins: 2000, title: '高级收藏家' },
      30: { coins: 3000, title: '资深收藏家' },
      50: { coins: 5000, title: '传说人物' },
      100: { coins: 10000, title: '卡片之神' }
    };
    
    const App = {
      username: localStorage.getItem('moe_username'),
      token: localStorage.getItem('moe_token'),
      
      async init() {
        const token = localStorage.getItem('moe_token');
        if (!token) {
          window.location.href = '/';
          return;
        }
        this.token = token;
        await Promise.all([this.fetchUserInfo(), this.fetchInventory()]);
      },

      async fetchUserInfo() {
        try {
          const res = await fetch('/user/info', { headers: { 'X-Session-Token': this.token } });
          const data = await res.json();
          if (data && data.username) {
            this.updateUI(data);
          } else {
            this.logout();
          }
        } catch(e) { 
          console.error(e);
          this.showToast('加载失败', 'error');
        }
      },

      async fetchInventory() {
        try {
          const res = await fetch('/user/inventory', { headers: { 'X-Session-Token': this.token } });
          const data = await res.json();
          if (data) this.updateInventoryUI(data);
        } catch(e) { console.error('Failed to load inventory', e); }
      },

      updateUI(user) {
        document.getElementById('profileNickname').textContent = user.nickname || user.username;
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileCoins').textContent = (user.coins || 0).toLocaleString();
        document.getElementById('profileLevelBadge').textContent = 'Lv.' + (user.level || 1);

        const avatar = document.getElementById('profileAvatar');
        if (avatar && user.avatar) avatar.src = user.avatar;

        const exp = user.exp || 0;
        const next = user.required_exp_next || 100;
        const progress = user.level_progress || 0;
        
        document.getElementById('profileExp').textContent = exp.toLocaleString();
        document.getElementById('profileExpNext').textContent = next.toLocaleString();
        document.getElementById('profileExpPercent').textContent = progress + '%';
        document.getElementById('profileExpFill').style.width = progress + '%';

        const titleBadge = document.getElementById('currentTitleBadge');
        const noTitleBadge = document.getElementById('noTitleBadge');
        if (user.title && user.title.name) {
          document.getElementById('titleName').textContent = user.title.name;
          titleBadge.style.display = 'inline-flex';
          noTitleBadge.style.display = 'none';
        } else {
          titleBadge.style.display = 'none';
          noTitleBadge.style.display = 'inline-flex';
        }
      },

      updateInventoryUI(inv) {
        ['N', 'R', 'SR', 'SSR', 'UR'].forEach(r => {
          const el = document.getElementById('invCount' + r);
          if(el) el.textContent = (inv[r] || 0).toLocaleString();
        });
        const total = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        const el = document.getElementById('profileTotalCards');
        if(el) el.textContent = total.toLocaleString();
      },

      openTitleModal() {
        const modal = document.getElementById('titleModal');
        const list = document.getElementById('titleList');
        list.innerHTML = '<div class="no-title">加载中...</div>';
        modal.classList.add('show');

        fetch('/user/titles', { headers: { 'X-Session-Token': this.token } })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.titles.length > 0) {
              list.innerHTML = data.titles.map(t => \`
                <div class="title-item \${t.is_equipped ? 'active' : ''}" onclick="App.equipTitle('\${t.title_id}')" role="button" tabindex="0">
                  <span class="title-item-name">\${t.title_id}</span>
                  <i class="fas fa-check-circle check"></i>
                </div>
              \`).join('');
            } else {
              list.innerHTML = '<div class="no-title">你还没有获得任何称号<br>请努力升级或完成成就！</div>';
            }
          })
          .catch(() => { list.innerHTML = '<div class="no-title">加载失败</div>'; });
      },

      closeTitleModal() {
        document.getElementById('titleModal').classList.remove('show');
      },

      openRewardModal() {
        const modal = document.getElementById('rewardModal');
        const list = document.getElementById('rewardList');
        const currentLevel = parseInt(document.getElementById('profileLevelBadge').textContent.replace('Lv.','')) || 1;
        const claimedRewards = window.__userInfo?.claimedRewards || [];
        
        let html = '';
        for (const [lvl, reward] of Object.entries(MILESTONES)) {
          const level = parseInt(lvl);
          const isReached = currentLevel >= level;
          const isClaimed = claimedRewards.includes(level);
          let desc = \`金币 \${reward.coins}\`;
          if (reward.title) desc += \` + 称号 [\${reward.title}]\`;
          
          html += \`
            <div class="reward-item \${isReached ? 'reached' : ''}">
              <div>
                <div class="reward-level">Lv.\${level}</div>
                <div class="reward-desc">\${desc}</div>
              </div>
              \${isClaimed 
                ? '<span class="reward-btn disabled" style="background:#9CA3AF;">已领取</span>'
                : isReached 
                  ? \`<button class="reward-btn claim" onclick="App.claimReward(\${level})">领取</button>\` 
                  : '<span class="reward-btn disabled">未达标</span>'
              }
            </div>\`;
        }
        list.innerHTML = html;
        modal.classList.add('show');
      },

      closeRewardModal() {
        document.getElementById('rewardModal').classList.remove('show');
      },

      async claimReward(level) {
        if(!confirm(\`确定领取 Lv.\${level} 的奖励吗？\`)) return;
        try {
          const res = await fetch('/user/claim-reward', {
            method: 'POST',
            headers: { 'X-Session-Token': this.token },
            body: JSON.stringify({ targetLevel: level })
          });
          const data = await res.json();
          if(data.success) {
            this.showToast('领取成功！', 'success');
            // 更新本地已领取奖励列表
            if (window.__userInfo && !window.__userInfo.claimedRewards.includes(level)) {
              window.__userInfo.claimedRewards.push(level);
            }
            // 重新打开弹窗显示已领取状态
            this.openRewardModal();
            this.fetchUserInfo();
          } else {
            const msg = data.error === '奖励已领取' ? '该奖励已经领取过了' : data.error;
            this.showToast(msg, 'error');
          }
        } catch(e) { this.showToast('网络错误', 'error'); }
      },

      async equipTitle(titleId) {
        try {
          const res = await fetch('/user/equip-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Session-Token': this.token },
            body: JSON.stringify({ titleId })
          });
          const data = await res.json();
          if (data.success) {
            this.closeTitleModal();
            this.showToast(data.message, 'success');
            this.fetchUserInfo();
          } else {
            this.showToast(data.error || '操作失败', 'error');
          }
        } catch(e) { this.showToast('网络错误', 'error'); }
      },

      async editProfile() {
        const current = document.getElementById('profileNickname').textContent;
        const newNick = prompt('输入新昵称 (最多20字符):', current);
        if (newNick && newNick !== current) {
          if(newNick.length > 20) { this.showToast('昵称过长', 'error'); return; }
          try {
            const res = await fetch('/user/update-profile', {
              method: 'POST',
              headers: { 'X-Session-Token': this.token },
              body: JSON.stringify({ nickname: newNick })
            });
            const data = await res.json();
            if(data.success) {
              document.getElementById('profileNickname').textContent = data.nickname;
              this.showToast('修改成功', 'success');
            } else { this.showToast(data.error || '修改失败', 'error'); }
          } catch(e) { this.showToast('网络错误', 'error'); }
        }
      },

      logout() {
        if(confirm('确定要退出登录吗？')) {
          localStorage.removeItem('moe_username');
          localStorage.removeItem('moe_token');
          window.location.href = '/';
        }
      },

      showToast(msg, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.className = 'toast ' + type + ' show';
        setTimeout(() => { toast.classList.remove('show'); }, 2500);
      }
    };

    window.onload = () => App.init();
  </script>
</body>
</html>
  `;
}