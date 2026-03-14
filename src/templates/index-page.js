// =========================================
// 首页模板
// =========================================

export function getIndexPage(siteStartTime) {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>抽卡系统</title>
  <!-- 替换为国内 BootCDN 源 -->
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script src="https://cdn.bootcdn.net/ajax/libs/marked/12.0.1/marked.min.js"></script>
  ${NEUTRAL_CSS}
  <style>
    body { padding: 20px 20px 60px 20px; display: flex; flex-direction: column; align-items: center; }
    .header { width: 100%; max-width: 900px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 10px; }
    .logo-container { display: flex; flex-direction: column; }
    .logo { font-size: 1.6rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; line-height: 1.2; }
    .logo span { color: var(--primary); }
    .logo-subtitle { font-size: 0.85rem; color: var(--text-light); margin-top: 4px; font-weight: 500; }
    .header-right { display: flex; align-items: center; }
    .user-pill {
      background: white;
      padding: 8px 16px 8px 12px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      font-size: 0.9rem;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .user-pill:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
      transform: translateY(-1px);
    }
    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 1rem;
    }
    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .user-name {
      font-weight: 700;
      color: var(--text-main);
    }
    .user-chevron { font-size: 0.8rem; color: #94A3B8; margin-left: 4px; }
    .user-level-badge { background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 1px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: bold; }
    .main-grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 24px; }
    @media(min-width: 768px) { .main-grid { grid-template-columns: 360px 1fr; align-items: start; } }
    .gacha-card { background: white; border-radius: var(--radius); border: 1px solid #E2E8F0; padding: 6px; box-shadow: var(--shadow); }
    .stage { position: relative; aspect-ratio: 3/4; width: 100%; background: #F8FAFC; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(#CBD5E1 1px, transparent 1px); background-size: 20px 20px; }
    .stage img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: 0.3s; }
    .stage img.show { opacity: 1; }
    .panel-container { display: flex; flex-direction: column; gap: 24px; }
    .box-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; font-weight: 800; font-size: 1rem; padding: 0 4px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; }
    /* 精选图库特定样式 - 确保6张图片整齐排列 */
    #showcaseGrid {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 768px) {
      #showcaseGrid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    @media (max-width: 480px) {
      #showcaseGrid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
      }
    }
.grid-item { border-radius: 8px; overflow: hidden; background: #F1F5F9; cursor: pointer; border: 1px solid #E2E8F0; transition: 0.2s; aspect-ratio: 1; }
    .grid-item:hover { border-color: var(--primary); transform: translateY(-2px); }
    .grid-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .input-group input { width: 100%; padding: 12px; border: 2px solid #E2E8F0; border-radius: 10px; font-family: var(--font); font-size: 1rem; text-align: center; color: var(--text-main); margin-bottom: 20px; outline: none; background: #F8FAFC; }
    .input-group input:focus { border-color: var(--primary); background: white; }
    .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #1E293B; color: white; padding: 10px 20px; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); font-size: 0.9rem; display: flex; align-items: center; gap: 10px; z-index: 3000; animation: slideDown 0.3s; backdrop-filter: blur(10px); background: rgba(30, 41, 59, 0.88); border: 1px solid rgba(255,255,255,0.12); }
    @keyframes slideDown { from { transform: translate(-50%, -50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
    .log-container { padding: 20px; text-align: left; }
    .log-header { font-size: 1rem; font-weight: 800; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: var(--primary); }
    .log-item { padding-left: 16px; border-left: 2px solid #E2E8F0; margin-bottom: 15px; position: relative; }
    .log-item::before { content: ''; position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); border: 2px solid white; }
    .log-meta { font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
    .log-ver { font-weight: bold; color: var(--text-main); background: #F1F5F9; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
    .log-ver.todo {background: #F3E8FF;color: #7E22CE;border-color: #D8B4FE;box-shadow: 0 0 5px rgba(168, 85, 247, 0.2);}
    .log-tag { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 12px; font-size: 0.65rem; font-weight: bold; color: white; text-shadow: 0 1px 1px rgba(0,0,0,0.2); white-space: nowrap; }
    .log-content { font-size: 0.9rem; line-height: 1.5; color: var(--text-main); white-space: pre-wrap; }
    .log-toggle { text-align: center; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0; color: var(--text-light); cursor: pointer; font-size: 0.85rem; }
    .log-list.collapsed .log-item:nth-child(n+4) { display: none; }
    .md-content { text-align: left; padding: 10px; background: #F8FAFC; border-radius: 8px; border: 1px solid #E2E8F0; max-height: 60vh; overflow-y: auto; color: var(--text-main); line-height: 1.6; }
    .md-content h1, .md-content h2, .md-content h3 { margin-top: 1em; margin-bottom: 0.5em; color: var(--primary-dark); }
    .md-content h1 { font-size: 1.5em; border-bottom: 2px solid #E2E8F0; padding-bottom: 5px; }
    .md-content h2 { font-size: 1.3em; }
    .md-content p { margin-bottom: 1em; }
    .md-content ul, .md-content ol { padding-left: 20px; margin-bottom: 1em; }
    .md-content li { margin-bottom: 5px; }
    .md-content code { background: #E2E8F0; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #D97706; }
    .md-content blockquote { border-left: 4px solid var(--primary); margin: 0; padding-left: 10px; color: var(--text-light); background: #EFF6FF; padding: 8px; border-radius: 4px; }
    .md-content img { max-width: 100%; border-radius: 6px; }
    .admin-textarea { width: 100%; height: 200px; padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; font-family: monospace; resize: vertical; margin-bottom: 10px; }
    .toggle-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; background: #F1F5F9; padding: 10px; border-radius: 8px; }
  </style>
</head>
<body>
  <header class="header">
    <!-- 修改处：添加 onclick 事件和 cursor 样式 -->
    <div class="logo-container" onclick="App.openAdmin()" style="cursor: pointer;" title="点击进入管理面板">
      <div class="logo"><i class="fas fa-cube"></i> Gacha<span>System</span></div>
      <div class="logo-subtitle">抽卡收集系统</div>
    </div>
    <div class="header-right">
<div class="user-pill" onclick="window.location.href='/user/profile'">
          <img class="user-avatar" id="navAvatar" src="https://api.dicebear.com/7.x/adventurer/svg?seed=default" />
          <div class="user-info">
           <span class="user-name" id="navNickname">游客</span>
<div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span class="user-level-badge" id="navLevel">Lv.1</span>
            </div>
         </div>
         <i class="fas fa-chevron-right user-chevron"></i>
       </div>
    </div>
  </header>

  <div class="main-grid">
    <div class="gacha-card">
      <div class="banner-tabs">
        <div class="banner-tab active" id="tab-std" onclick="App.switchPool('std')">
            <span>常驻池</span>
        </div>
        <div class="banner-tab" id="tab-ltd" onclick="App.togglePoolDropdown()">
            <span>限定池 <i class="fas fa-chevron-down" style="font-size:0.7rem; margin-left:3px; transition:transform 0.2s;" id="poolDropdownArrow"></i></span>
            <span class="pool-info-tag" id="ltdCostDisplay">500pts</span>
        </div>
        <!-- 限定池下拉弹窗 -->
        <div id="poolDropdown" style="display:none; position:absolute; top:100%; left:0; right:0; background:linear-gradient(135deg, #FEF2F2, #FFF5F5); border:2px solid #FECACA; border-radius:12px; margin-top:8px; padding:8px; box-shadow:0 10px 25px rgba(239,68,68,0.15); z-index:100; max-height:250px; overflow-y:auto;">
          <div id="poolDropdownList" style="display:flex; flex-direction:column; gap:6px;">
            <!-- 动态填充 -->
          </div>
        </div>
      </div>
      <div class="stage" id="stage">
        <div id="rarityTag" class="rarity-tag">SSR</div>
        <div class="placeholder" id="placeholder">
          <i class="fas fa-gamepad"></i>
          <div>准备召唤</div>
        </div>
        <div class="loading-spinner" id="loadingSpinner">
          <i class="fas fa-circle-notch"></i>
          <div class="loading-text">召唤中...</div>
        </div>
        <img id="resultImg" alt="Result">
      </div>
      <div class="actions">
        <button class="btn" onclick="App.draw()" id="drawBtn">
          <i class="fas fa-bolt"></i> <span>召唤</span>
        </button>
        <button class="btn secondary" onclick="App.openCraft()" style="background:#FFF7ED; border-color:#FED7AA;">
          <i class="fas fa-flask"></i>
        </button>
        <button class="btn secondary" onclick="App.openShop()">
          <i class="fas fa-store"></i>
        </button>
        <button class="btn secondary" onclick="App.openDice()" style="background:#F0F9FF; border-color:#BAE6FD;">
          <i class="fas fa-dice"></i>
        </button>
        <button class="btn secondary" onclick="App.checkIn()" style="background:#ECFDF5; border-color:#6EE7B7; color:#059669;">
          <i class="fas fa-calendar-check"></i>
        </button>
        <button class="btn secondary" onclick="App.openUpload()" style="background:#F3E8FF; border-color:#C4B5FD; color:#7C3AED;">
          <i class="fas fa-cloud-upload-alt"></i>
        </button>
        <a href="/library" class="btn secondary"><i class="fas fa-th-large"></i></a>
      </div>
    </div>

    <div class="panel-container">
      <div class="showcase-box">
        <div class="box-header">
          <span><i class="fas fa-star" style="color:#F59E0B"></i> 精选图库</span>
          <i class="fas fa-rotate" id="refreshBtn" style="cursor:pointer; font-size:0.9rem; color:#94A3B8" onclick="App.loadShowcase()"></i>
        </div>
        <div class="grid" id="showcaseGrid">
          <div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;">加载中...</div>
        </div>
      </div>
      <div class="glass-card log-container">
        <div class="log-header"><i class="fas fa-code-branch"></i> 更新履历</div>
        <div id="logList" class="log-list collapsed">
          <div style="text-align:center; color:#94A3B8;">加载中...</div>
        </div>
        <div class="log-toggle" id="logToggle" onclick="App.toggleLog()" style="display:none">
          <span>展开更多</span> <i class="fas fa-chevron-down"></i>
        </div>
      </div>
    </div>
    <div id="siteRuntime" class="site-runtime"></div>
  </div>

  <div id="authModal" class="modal">
    <div class="modal-content">
      <h3 style="margin-top:0; color:var(--text-main)">身份验证</h3>
      <div class="auth-tabs">
         <div class="auth-tab active" id="tab-login" onclick="App.switchAuth('login')">登录</div>
         <div class="auth-tab" id="tab-register" onclick="App.switchAuth('register')">注册</div>
      </div>
      
      <div id="authForm">
        <div class="input-group">
            <input type="text" id="authUsername" placeholder="账号 (英文/数字)">
        </div>
        <div class="input-group" id="nickGroup" style="display:none;">
            <input type="text" id="authNickname" placeholder="昵称 (显示名)">
        </div>
        <div class="input-group">
            <input type="password" id="authPassword" placeholder="密码">
        </div>
      </div>
      
      <button class="btn" style="width:100%;" onclick="App.doAuth()">确认提交</button>
    </div>
  </div>

  <div id="craftModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>卡片合成</h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;">消耗5张低阶卡片，进行一次高阶召唤。</p>
      <div class="shop-grid">
        <div class="shop-item" id="craft-item-R" onclick="App.doCraft('R')"><div style="font-weight:bold; color:#3B82F6">R</div><div class="shop-cost">消耗: 5 N</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 N: <span id="invN">0</span></div></div>
        <div class="shop-item" id="craft-item-SR" onclick="App.doCraft('SR')"><div style="font-weight:bold; color:#8B5CF6">SR</div><div class="shop-cost">消耗: 5 R</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 R: <span id="invR">0</span></div></div>
        <div class="shop-item" id="craft-item-SSR" onclick="App.doCraft('SSR')"><div style="font-weight:bold; color:#F59E0B">SSR</div><div class="shop-cost">消耗: 5 SR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 SR: <span id="invSR">0</span></div></div>
        <div class="shop-item" id="craft-item-UR" onclick="App.doCraft('UR')"><div style="font-weight:bold; color:#EF4444">UR</div><div class="shop-cost">消耗: 5 SSR</div><div style="font-size:0.75rem; color:#94A3B8; margin-top:4px;">持有 SSR: <span id="invSSR">0</span></div></div>
      </div>
    </div>
  </div>

  <div id="shopModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="text-align:center; margin-bottom:15px;">
        <h3 style="margin:0 0 10px 0;">积分商店</h3>
        <div style="font-size:1.1rem; font-weight:bold; color:#F59E0B; background:#FEF3C7; padding:8px 16px; border-radius:10px; display:inline-flex; align-items:center; gap:8px; box-shadow:0 3px 6px rgba(245,158,11,0.3);">
           <i class="fas fa-coins"></i> <span id="shopBalance">0</span>
        </div>
      </div>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px; text-align:center;">消耗积分购买指定等级的卡包。</p>
      <div class="shop-grid" id="shopContent"></div>
    </div>
  </div>

  <div id="diceModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <h3>猜大小</h3>
      <p style="color:var(--text-light); font-size:0.9rem;">小(1-3) 或 大(4-6)，赔率1:1。</p>
      <div class="dice-stage"><i class="fas fa-dice-d6" id="diceIcon"></i></div>
      <div class="input-group" style="margin-bottom:10px;"><input type="number" id="betInput" placeholder="下注金额 (10-1000)"></div>
      <div class="bet-controls">
        <button class="bet-btn small" onclick="App.playDice('small')"><div>押小 (1-3)</div></button>
        <button class="bet-btn big" onclick="App.playDice('big')"><div>押大 (4-6)</div></button>
      </div>
      <div id="diceMsg" style="margin-top:15px; font-weight:bold; height:20px; color:#334155;"></div>
    </div>
  </div>

  <div id="uploadModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      
      <h3 style="margin-top:0; color:var(--text-main);">
        <i class="fas fa-cloud-upload-alt" style="color:#7C3AED; margin-right:8px;"></i>上传图片
      </h3>
      <p style="color:var(--text-light); font-size:0.9rem; margin-bottom:20px;">
        分享你的收藏到图鉴池（需审核）
      </p>

      <!-- 拖拽上传区 -->
      <div class="upload-drop-zone" id="uploadDropZone">
        <i class="fas fa-images upload-icon"></i>
        <div style="color:var(--text-main); font-weight:600; margin-bottom:4px;">点击或拖拽图片到此处</div>
        <div style="font-size:0.8rem; color:#9CA3AF;">支持 JPG, PNG, GIF, WebP (Max 5MB)</div>
        <input type="file" id="uploadInput" accept="image/jpeg,image/png,image/gif,image/webp" style="display:none;">
      </div>

      <!-- 图片预览区 -->
      <div class="upload-preview-container" id="uploadPreview">
        <div class="upload-remove-btn" onclick="App.clearUpload()" title="移除图片">
          <i class="fas fa-times"></i>
        </div>
        <img id="uploadPreviewImg" class="upload-preview-img">
      </div>

      <div style="margin-top: 20px;">
        <label style="display:block; margin-bottom:8px; color:var(--text-main); font-weight:600; font-size:0.9rem;">
          期望稀有度
        </label>
        <div class="form-select-wrapper">
          <select id="uploadRarity" class="form-select">
            <option value="N">N (普通)</option>
            <option value="R">R (稀有)</option>
            <option value="SR">SR (超稀有)</option>
            <option value="SSR">SSR (特级超稀有)</option>
            <option value="UR">UR (极度稀有)</option>
          </select>
          <i class="fas fa-chevron-down select-arrow"></i>
        </div>
      </div>

      <button class="btn" style="width:100%; background:linear-gradient(135deg, #8B5CF6, #6D28D9); box-shadow:0 4px 0 #5B21B6;" onclick="App.doUpload()" id="uploadBtn">
        <i class="fas fa-paper-plane"></i> 提交审核
      </button>
      
      <div id="uploadMsg" style="margin-top:15px; font-weight:bold; height:20px; font-size:0.9rem; transition:0.3s;"></div>
    </div>
  </div>

  <div id="rulesModal" class="modal">
    <div class="modal-content">
      <button class="modal-close-btn" onclick="App.closeRulesToProfile()"><i class="fas fa-times"></i></button>
      <h3>积分规则</h3>
      <p style="font-size:0.9rem; color:#94A3B8; margin-bottom:15px;">积分可用于在商店购买物品。</p>
      <div style="background:#F8FAFC; padding:10px; border-radius:12px; border:1px solid #E2E8F0;">
        <table class="rules-table">
          <thead><tr><th>行为</th><th>获得积分</th></tr></thead>
          <tbody>
            <tr><td>N</td><td style="font-weight:bold;">+5</td></tr>
            <tr><td>R</td><td style="font-weight:bold;">+10</td></tr>
            <tr><td>SR</td><td style="font-weight:bold;">+30</td></tr>
            <tr><td>SSR</td><td style="font-weight:bold;">+100</td></tr>
            <tr><td>UR</td><td style="font-weight:bold; color:#EF4444">+500</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <div id="adminModal" class="modal admin-modal">
    <div class="modal-content admin-modal-content" style="max-width:720px;">
      <div class="admin-modal-header">
        <h3><i class="fas fa-cog"></i>管理面板</h3>
        <button class="admin-modal-close" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      </div>
      <div class="admin-modal-body">
        <div id="adminLogin">
          <div class="input-group"><input type="password" id="adminPass" class="admin-input" placeholder="请输入管理员密码..."></div>
          <button class="admin-btn primary" style="width:100%; margin-top:12px;" onclick="App.verifyAdmin()">确认</button>
        </div>
        <div id="adminPanel" style="display:none; text-align:left;">
          <div class="admin-tabs">
            <button class="admin-tab active" onclick="App.switchAdminTab('log')" id="tab-log"><i class="fas fa-list-alt"></i>更新日志</button>
            <button class="admin-tab" onclick="App.switchAdminTab('users')" id="tab-users"><i class="fas fa-users"></i>用户管理</button>
            <button class="admin-tab" onclick="App.switchAdminTab('uploads')" id="tab-uploads"><i class="fas fa-upload"></i>上传审核<span class="admin-tab-badge" id="uploadsCountBadge" style="display:none;">0</span></button>
            <button class="admin-tab" onclick="App.switchAdminTab('ann')" id="tab-ann"><i class="fas fa-bullhorn"></i>系统公告</button>
          </div>
          <div id="view-log">
            <div class="admin-section-title">
              <span><i class="fas fa-edit" style="color:#F59E0B;margin-right:8px;"></i>快速添加</span>
            </div>
            <div class="quick-add-form">
              <div class="quick-add-row">
                <input type="text" id="quickLogContent" class="admin-input" placeholder="输入更新内容..." style="flex:1;">
                <select id="quickLogTag" class="admin-input" style="width:100px;">
                  <option value="optimization">优化</option>
                  <option value="feature">功能</option>
                  <option value="bugfix">修复</option>
                  <option value="refactor">重构</option>
                  <option value="todo">待办</option>
                </select>
                <button class="admin-btn primary small" onclick="App.quickAddLog()">+ 添加</button>
              </div>
            </div>
            <div class="admin-section-title" style="margin-top:20px;">
              <span><i class="fas fa-list" style="color:#F59E0B;margin-right:8px;"></i>完整列表</span>
              <button class="admin-btn secondary small" onclick="App.addAdminRow()">+ 新增一行</button>
            </div>
            <div class="admin-scroll">
              <table class="admin-table" id="adminTable"><thead><tr><th width="100">日期</th><th>内容</th><th width="100">标签</th><th width="50"></th></tr></thead><tbody id="adminTbody"></tbody></table>
            </div>
            <button class="admin-btn primary" style="width:100%; margin-top:16px;" onclick="App.saveAdminLog()">保存更改</button>
          </div>
          <div id="view-users" style="display:none;">
            <div class="user-stats-grid">
              <div class="user-stat-card total">
                <div class="stat-icon"><i class="fas fa-users"></i></div>
                <div class="stat-value" id="statTotalUsers">-</div>
                <div class="stat-label">总用户数</div>
              </div>
              <div class="user-stat-card today">
                <div class="stat-icon"><i class="fas fa-user-plus"></i></div>
                <div class="stat-value" id="statTodayUsers">-</div>
                <div class="stat-label">今日新增</div>
              </div>
              <div class="user-stat-card active">
                <div class="stat-icon"><i class="fas fa-clock"></i></div>
                <div class="stat-value" id="statActiveUsers">-</div>
                <div class="stat-label">今日活跃</div>
              </div>
            </div>
            <div class="user-search-box">
              <i class="fas fa-search"></i>
              <input type="text" id="userSearchInput" placeholder="搜索用户名或昵称..." oninput="App.filterUsers(this.value)">
            </div>
            <div class="admin-scroll">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th width="60">用户</th>
                    <th>等级</th>
                    <th>召唤数</th>
                    <th>积分</th>
                    <th>注册时间</th>
                    <th>最后登录</th>
                    <th width="90">操作</th>
                  </tr>
                </thead>
                <tbody id="userTbody">
                  <tr><td colspan="7" style="text-align:center; padding:40px; color:#64748B;"><i class="fas fa-spinner fa-spin" style="margin-right:8px;"></i>加载中...</td></tr>
                </tbody>
              </table>
            </div>
            <div class="user-pagination">
              <div class="user-pagination-info" id="paginationInfo">共 - 条记录</div>
              <div class="user-pagination-btns">
                <button id="prevPageBtn" onclick="App.changePage(-1)" disabled><i class="fas fa-chevron-left"></i> 上一页</button>
                <button id="nextPageBtn" onclick="App.changePage(1)" disabled>下一页 <i class="fas fa-chevron-right"></i></button>
              </div>
            </div>
          </div>
          <div id="view-uploads" style="display:none;">
            <div class="admin-section-title">
              <span><i class="fas fa-cloud-upload-alt" style="color:var(--primary);margin-right:8px;"></i>待审核上传</span>
              <div style="display:flex; gap:8px; align-items:center;">
                <select id="uploadStatusFilter" onchange="App.loadAdminUploads()" class="admin-input" style="width:auto; padding:6px 12px;">
                  <option value="pending">待审核</option>
                  <option value="approved">已通过</option>
                  <option value="rejected">已拒绝</option>
                </select>
                <button class="admin-btn secondary small" onclick="App.loadAdminUploads()"><i class="fas fa-sync"></i></button>
              </div>
            </div>
            <div id="uploadsContainer" class="admin-scroll" style="min-height:200px;">
              <div style="text-align:center; padding:60px; color:#64748B;">
                <i class="fas fa-images" style="font-size:2.5rem; margin-bottom:16px; display:block; opacity:0.5;"></i>
                加载中...
              </div>
            </div>
          </div>
          <div id="view-ann" style="display:none;">
            <div class="admin-section-title">
              <span><i class="fas fa-bullhorn" style="color:var(--primary);margin-right:8px;"></i>系统公告</span>
            </div>
            
            <div class="quick-publish-form">
              <div class="quick-publish-row">
                <input type="text" id="annTitleInput" class="admin-input" placeholder="公告标题..." style="flex:1;">
              </div>
              <div class="quick-publish-row" style="margin-top:10px;">
                <textarea id="annContentInput" class="admin-textarea" placeholder="公告内容（支持Markdown）..." style="flex:1;min-height:100px;resize:vertical;"></textarea>
              </div>
            </div>
            
            <div style="display:flex; gap:12px; margin-top:16px;">
              <button class="admin-btn primary" style="flex:2" onclick="App.publishAnnouncement()">
                <i class="fas fa-paper-plane"></i> 发布公告
              </button>
              <button class="admin-btn secondary" style="flex:1" onclick="App.previewAnnouncement()">
                <i class="fas fa-eye"></i> 预览
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="announcementModal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
      <button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>
      <div style="text-align: center; margin-bottom: 15px;">
        <i class="fas fa-bullhorn" style="font-size: 2rem; color: var(--primary);"></i>
        <h3 id="annTitle" style="margin: 10px 0 0 0;">公告</h3>
      </div>
      <div id="annContent" class="md-content">
      </div>
      <div style="margin-top: 20px;">
        <button class="btn" style="width: 100%;" onclick="App.closeAnnouncement()">我知道了</button>
      </div>
    </div>
  </div>

  <div id="imgModal" class="modal" onclick="if(event.target === this) this.classList.remove('show')">
    <button class="modal-close-img" onclick="document.getElementById('imgModal').classList.remove('show')"><i class="fas fa-times"></i></button>
    <img id="bigImg" class="modal-img" alt="预览">
  </div>

  <script>
    // HTML 转义函数，防止 XSS
    function escapeHtml(str) {
      if (str == null) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    const App = {
      username: localStorage.getItem('moe_username'),
      nickname: null, loading: false, adminPwd: null, logsData: [], currentAdminTab: 'log', inventory: {},
      currentPool: 'std',
      currentLimitedPool: '${CONFIG.LIMITED.DEFAULT_POOL}',
      limitedPools: [],
      authMode: 'login', 
      coins: 0,
      
      vibrate(type) {
        if (!navigator.vibrate) return;
        const patterns = {
          tap: 10,               // 普通点击
          success: [10, 30, 10], // 成功/抽到卡
          failure: [30, 50, 30], // 失败/报错
          heavy: 50              // 重要操作
        };
        try { navigator.vibrate(patterns[type] || 10); } catch(e){}
      },
      animate(elId, type) {
        const el = document.getElementById(elId);
        if(!el) return;
        const cls = type === 'error' ? 'anim-shake' : 'anim-pop';
        el.classList.remove('anim-shake', 'anim-pop');
        void el.offsetWidth; // 触发重绘
        el.classList.add(cls);
        // 动画结束后移除类，以便下次触发
        setTimeout(() => el.classList.remove(cls), 400);
      },
      async init() {
        this.initTheme();
        await this.fetchUserInfo();
        this.fetchInventory(); 
        this.loadShowcase();
        this.loadChangelog();
        this.checkAnnouncement();
        // 预加载限定池数据，避免首次点击卡顿
        if (this.username) {
          this.loadLimitedPools();
        }
      },
      // [优化] 限定池相关状态缓存
      _poolsCache: null,
      _poolsLoading: false,
      _poolsLastFetch: 0,
      
switchPool(pool) {
        if(this.loading) return;
        this.currentPool = pool;
        const isLtd = pool === 'ltd';
        
        // 1. 更新标签页样式
        document.querySelectorAll('.banner-tab').forEach(el => el.classList.remove('active', 'limited'));
        const activeTab = document.getElementById('tab-' + pool);
        activeTab.classList.add('active');
        if (isLtd) activeTab.classList.add('limited');
        
        // 2. 隐藏限定池选择器（不触发列表刷新）
        const poolDropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        if (poolDropdown) {
          poolDropdown.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
        
        // 3. 更新按钮样式与图标
        const btn = document.getElementById('drawBtn');
        const icon = isLtd ? 'fa-star' : 'fa-bolt';
        btn.className = isLtd ? 'btn limited-btn' : 'btn';
        btn.innerHTML = \`<i class="fas \${icon}"></i> 召唤\`;
      },
      
      togglePoolDropdown() {
        const dropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        const isVisible = dropdown.style.display === 'block';
        
        if (!isVisible) {
          // 只有在已经是限定池模式时才展开下拉
          if (this.currentPool === 'ltd') {
            dropdown.style.display = 'block';
            if (arrow) arrow.style.transform = 'rotate(180deg)';
            this.loadLimitedPools(false, true);
          } else {
            // 切换到限定池模式但不展开下拉
            this.switchPool('ltd');
          }
        } else {
          // 收起下拉
          dropdown.style.display = 'none';
          if (arrow) arrow.style.transform = 'rotate(0deg)';
          if (this._closeDropdownHandler) {
            document.removeEventListener('click', this._closeDropdownHandler);
            this._closeDropdownHandler = null;
          }
        }
      },
      
      expandPoolDropdown() {
        const dropdown = document.getElementById('poolDropdown');
        const arrow = document.getElementById('poolDropdownArrow');
        if (dropdown.style.display !== 'block') {
          dropdown.style.display = 'block';
          if (arrow) arrow.style.transform = 'rotate(180deg)';
          // 点击外部关闭
          this._closeDropdownHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target.id !== 'tab-ltd') {
              dropdown.style.display = 'none';
              if (arrow) arrow.style.transform = 'rotate(0deg)';
              document.removeEventListener('click', this._closeDropdownHandler);
              this._closeDropdownHandler = null;
            }
          };
          requestAnimationFrame(() => {
            document.addEventListener('click', this._closeDropdownHandler);
          });
        }
      },
      
      async loadLimitedPools(forceRefresh = false, expandDropdown = false) {
        if (!this.username || this._poolsLoading) return;
        
        // 检查缓存（5分钟内有效）
        const now = Date.now();
        const cacheValid = this._poolsCache && (now - this._poolsLastFetch < 300000);
        
        if (!forceRefresh && cacheValid && this.limitedPools) {
          // 使用缓存，只更新UI
          this._renderPoolList();
          // 需要展开时展开
          if (expandDropdown) {
            this.expandPoolDropdown();
          }
          return;
        }
        
        this._poolsLoading = true;
        
        try {
          const res = await fetch('/limited/pools', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          
          if (data.success && data.pools) {
            this._poolsCache = data.pools;
            this._poolsLastFetch = now;
            this.limitedPools = data.pools;
            
            // [修复] 只在首次加载或当前选择无效时才设置默认池
            // 避免覆盖用户已做的选择
            const currentPoolValid = this.currentLimitedPool && 
                                     data.pools.find(p => p.id === this.currentLimitedPool);
            if (!currentPoolValid) {
              console.log('[LoadPools] Setting default pool:', data.defaultPool, 
                          'previous:', this.currentLimitedPool);
              this.currentLimitedPool = data.defaultPool;
            } else {
              console.log('[LoadPools] Keeping current pool:', this.currentLimitedPool);
            }
            
            // 使用 requestAnimationFrame 渲染，避免阻塞
            requestAnimationFrame(() => {
              this._renderPoolList();
              // 加载完成后展开下拉
              if (expandDropdown) {
                this.expandPoolDropdown();
              }
            });
          }
        } catch (e) { 
          console.error('Load pools failed', e);
          // 缓存失败时如果有旧缓存，继续使用
          if (this._poolsCache) {
            requestAnimationFrame(() => this._renderPoolList());
          }
        } finally {
          this._poolsLoading = false;
        }
      },
      
      // [优化] 渲染池列表（使用CSS类优化性能）
      _renderPoolList() {
        const listEl = document.getElementById('poolDropdownList');
        if (!listEl || !this.limitedPools) return;
        
        const currentPool = this.currentLimitedPool;
        const pools = this.limitedPools;
        
        // 构建HTML字符串（一次性插入）
        const html = pools.map(p => {
          const isActive = p.id === currentPool;
          const isAvailable = p.available;
          const statusText = p.available ? (typeof p.count === 'number' ? p.count + '张' : p.count) : '暂无图片';
          
          return \`
            <div class="pool-item \${isActive ? 'active' : ''} \${isAvailable ? '' : 'unavailable'}" 
                 onclick="App.selectPool('\${p.id}')"
                 data-pool-id="\${p.id}">
              <div class="pool-item-header">
                <span class="pool-name">\${p.name}</span>
                <span class="pool-status">\${statusText}</span>
              </div>
              <div class="pool-desc">\${p.description || ''}</div>
            </div>
          \`;
        }).join('');
        
        listEl.innerHTML = html;
      },
      
      // [优化] 选择池（不重新加载列表，只更新样式）
      selectPool(poolId) {
        console.log('[selectPool] Called with poolId:', poolId);
        if (this.currentLimitedPool === poolId) {
          // 如果点击的是已选中的池，直接关闭下拉
          document.getElementById('poolDropdown').style.display = 'none';
          const arrow = document.getElementById('poolDropdownArrow');
          if (arrow) arrow.style.transform = 'rotate(0deg)';
          return;
        }
        
        // [修复] 更新当前选中的池
        this.currentLimitedPool = poolId;
        console.log('[selectPool] Set currentLimitedPool to:', this.currentLimitedPool);
        
        // [修复] 同时更新缓存中的选择，防止loadLimitedPools重置
        if (this._poolsCache) {
          this._poolsLastFetch = Date.now();
        }
        
        console.log('[PoolSelect] Selected pool:', poolId, 'currentLimitedPool:', this.currentLimitedPool);
        
        // 关闭下拉菜单
        document.getElementById('poolDropdown').style.display = 'none';
        const arrow = document.getElementById('poolDropdownArrow');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
        
        // 显示提示
        const pool = this.limitedPools?.find(p => p.id === poolId);
        if (pool) {
          this.toast(\`已切换至: \${pool.name}\`, 'ok');
        }
        
        // [优化] 只更新UI样式，不重新请求数据
        requestAnimationFrame(() => this._updatePoolSelection(poolId));
      },
      
      // [优化] 更新池选中状态（仅修改CSS类）
      _updatePoolSelection(selectedId) {
        const listEl = document.getElementById('poolDropdownList');
        if (!listEl) return;
        
        const items = listEl.querySelectorAll('.pool-item');
        items.forEach(item => {
          const poolId = item.dataset.poolId;
          if (poolId === selectedId) {
            item.classList.add('active');
          } else {
            item.classList.remove('active');
          }
        });
      },
      switchAuth(mode) {
        this.authMode = mode;
        document.getElementById('tab-login').classList.toggle('active', mode === 'login');
        document.getElementById('tab-register').classList.toggle('active', mode === 'register');
        document.getElementById('nickGroup').style.display = mode === 'register' ? 'block' : 'none';
      },
      async fetchUserInfo() {
        if (!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        try {
          const res = await fetch('/user/info', { headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if (data && data.username) { 
              this.username = data.username; 
              this.nickname = data.nickname;
              // 强制转成数字，避免出现 undefined / NaN
              this.coins = Number.isFinite(Number(data.coins)) ? Number(data.coins) : 0;
              this.updateUI(data); 
          } else { 
              localStorage.removeItem('moe_username');
              this.username = null;
              document.getElementById('authModal').classList.add('show'); 
          }
        } catch(e) {}
      },
      async fetchInventory() {
          if (!this.username) return;
          try {
              const res = await fetch('/user/inventory', { headers: { 'X-User-ID': this.username } });
              const data = await res.json();
              if (data) {
                  this.inventory = data; // 更新内存中的库存
                  this.updateProfileStats(); // 如果个人资料页开着，更新数字
                  this.updateCraftStates();  // 如果合成页开着，更新按钮状态
              }
          } catch(e) { console.error('Inv load failed', e); }
      },
      updateUI(user) {
        // 保存用户信息供奖励弹窗使用
        window.__userInfo = user;
        
        // --- 1. 更新顶部导航栏 (Header) ---
        // 必须做非空检查，防止报错中断代码执行
        const navNick = document.getElementById('navNickname');
        if (navNick) navNick.innerText = user.nickname || user.username;

        const navAvatar = document.getElementById('navAvatar');
        if (navAvatar && user.avatar) navAvatar.src = user.avatar;

        const navLevel = document.getElementById('navLevel');
        if (navLevel) navLevel.innerText = 'Lv.' + (user.level || 1);

        // --- 2. 更新本地状态 (仅基础数据) ---
        // 注意：库存数据(this.inventory)不再此处更新，改为由 fetchInventory 独立处理
        this.coins = Number.isFinite(Number(user.coins)) ? Number(user.coins) : 0;

        // --- 3. 更新个人资料页的基础信息 (如果DOM存在) ---
        // 即使个人页模态框未打开，这些元素也可能存在于 DOM 中，安全起见都尝试更新
        const elProfileCoins = document.getElementById('profileCoins');
        if (elProfileCoins) elProfileCoins.innerText = this.coins;

        const elProfileLevel = document.getElementById('profileLevel');
        if (elProfileLevel) elProfileLevel.innerText = user.level || 1;

        const elProfileCount = document.getElementById('profileCount');
        if (elProfileCount) elProfileCount.innerText = user.drawCount || 0;
        
        const elProfileNick = document.getElementById('profileNickname');
        if (elProfileNick) elProfileNick.innerText = user.nickname || user.username;
        
        const elProfileUser = document.getElementById('profileUsername');
        if (elProfileUser) elProfileUser.innerText = user.username;

        // --- 4. 更新经验条 ---
        const exp = user.exp || 0;
        const next = user.required_exp_next || 100;
        const progress = user.level_progress || 0;

        const elExp = document.getElementById('profileExp');
        if (elExp) elExp.innerText = exp;
        
        const elExpNext = document.getElementById('profileExpNext');
        if (elExpNext) elExpNext.innerText = next;
        
        const elProgText = document.getElementById('profileLevelProgress');
        if (elProgText) elProgText.innerText = progress + '%';
        
        const elProgBar = document.getElementById('profileExpBar');
        if (elProgBar) elProgBar.style.width = progress + '%';

        // --- 5. Update title display ---
        const titleEl = document.getElementById('currentTitleDisplay');
        if (titleEl) {
            if (user.title && user.title.name) {
                titleEl.innerHTML = \`<span class="title-badge" style="background:linear-gradient(135deg, #3B82F6, #8B5CF6); font-size:1rem; padding:4px 10px;">\${escapeHtml(user.title.name)}</span>\`;
            } else {
                titleEl.innerHTML = '<span style="color:#CBD5E1; font-weight:normal;">No title</span>';
            }
        }
      },
      updateProfileStats() {
        const inv = this.inventory;
        const setText = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.innerText = val;
        };
        setText('invCountN', inv.N || 0);
        setText('invCountR', inv.R || 0);
        setText('invCountSR', inv.SR || 0);
        setText('invCountSSR', inv.SSR || 0);
        setText('invCountUR', inv.UR || 0);
        
        const totalCards = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        setText('totalCards', totalCards);
        
        const profileCountEl = document.getElementById('profileCount');
        const drawCount = profileCountEl ? (parseInt(profileCountEl.innerText) || 0) : 0;
        const level = Math.floor(drawCount / 50) + 1;
        setText('profileLevel', level);
      },
      showMoreStats() {
        const inv = this.inventory;
        const totalCards = (inv.N || 0) + (inv.R || 0) + (inv.SR || 0) + (inv.SSR || 0) + (inv.UR || 0);
        const drawCount = parseInt(document.getElementById('profileCount').innerText) || 0;
        const coins = parseInt(document.getElementById('profileCoins').innerText) || 0;
        
        const successRate = drawCount > 0 ? '~' + Math.round((totalCards / drawCount) * 100) + '%' : 'N/A';
        const avgCoins = drawCount > 0 ? Math.round(coins / drawCount) : 'N/A';
        
        const statsHtml = '<div style="text-align:left; font-size:0.9rem;">' +
          '<div style="margin-bottom:10px;"><strong>卡片总数:</strong> ' + totalCards + '</div>' +
          '<div style="margin-bottom:10px;"><strong>卡片分布:</strong></div>' +
          '<div style="display:grid; grid-template-columns:repeat(5, 1fr); gap:5px; margin-bottom:15px;">' +
            '<div style="text-align:center; padding:5px; background:#F1F5F9; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#64748B;">N</div>' +
              '<div style="font-weight:bold;">' + (inv.N || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#DBEAFE; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#1E40AF;">R</div>' +
              '<div style="font-weight:bold;">' + (inv.R || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#EDE9FE; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#5B21B6;">SR</div>' +
              '<div style="font-weight:bold;">' + (inv.SR || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#FEF3C7; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#92400E;">SSR</div>' +
              '<div style="font-weight:bold;">' + (inv.SSR || 0) + '</div>' +
            '</div>' +
            '<div style="text-align:center; padding:5px; background:#FEE2E2; border-radius:4px;">' +
              '<div style="font-size:0.7rem; color:#991B1B;">UR</div>' +
              '<div style="font-weight:bold;">' + (inv.UR || 0) + '</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-bottom:10px;"><strong>召唤成功率:</strong> ' + successRate + '</div>' +
          '<div style="margin-bottom:10px;"><strong>平均每次召唤获币:</strong> ' + avgCoins + '</div>' +
        '</div>';
        
        this.showStatsModal('详细统计', statsHtml);
      },
      showStatsModal(title, content) {
        const existingModal = document.getElementById('statsModal');
        if (existingModal) {
          const newModal = existingModal.cloneNode(false);
          existingModal.parentNode.replaceChild(newModal, existingModal);
          existingModal.remove();
        }
        
        const modalHtml = '<div class="modal show" id="statsModal" data-dynamic="true">' +
          '<div class="modal-content" style="max-width:500px;">' +
            '<button class="modal-close-btn" onclick="App.closeModals()"><i class="fas fa-times"></i></button>' +
            '<h3 style="margin-top:0;">' + title + '</h3>' +
            content +
            '<div style="margin-top:20px; text-align:center;">' +
              '<button class="btn" onclick="App.closeModals()" style="padding:8px 20px;">关闭</button>' +
            '</div>' +
          '</div>' +
        '</div>';
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('statsModal');
        if (modal) {
          const backdropClickHandler = function(e) {
            if (e.target === this) {
              App.closeModals();
            }
          };
          modal.addEventListener('click', backdropClickHandler);
          modal._backdropClickHandler = backdropClickHandler;
        }
      },
      editProfile() {
        const currentNickname = document.getElementById('profileNickname').innerText;
        const newNickname = prompt('输入新昵称 (最多20个字符):', currentNickname);
        if (newNickname && newNickname !== currentNickname && newNickname.length <= 20) {
          this.toast('更新个人资料中...', 'info');
          document.getElementById('profileNickname').innerText = newNickname;
          document.getElementById('navNickname').innerText = newNickname;
          this.toast('个人资料已更新！', 'ok');
        } else if (newNickname && newNickname.length > 20) {
          this.toast('昵称太长 (最多20个字符)', 'warn');
        }
      },
      shareProfile() {
        const nickname = document.getElementById('profileNickname').innerText;
        const drawCount = document.getElementById('profileCount').innerText;
        const coins = document.getElementById('profileCoins').innerText;
        const shareText = nickname + ' 的抽卡档案！召唤次数: ' + drawCount + ', 积分: ' + coins + '。快来玩吧：' + window.location.origin;
        
        if (navigator.share) {
          navigator.share({ title: nickname + " 的抽卡档案", text: shareText, url: window.location.origin }).catch(err => {
            this.copyToClipboard(shareText);
          });
        } else {
          this.copyToClipboard(shareText);
        }
      },
      copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
          this.toast('链接已复制到剪贴板！', 'ok');
        }).catch(err => {
          this.toast('复制失败', 'warn');
        });
      },
      async checkIn() {
        if(this.loading) return;
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        
        this.loading = true;
        try {
            const res = await fetch('/user/check-in', { 
                method: 'POST', 
                headers: { 'X-User-ID': this.username } 
            });
            const data = await res.json();
            
            if(data.success) {
                const bonus = data.checkIn.streakBonus > 0 ? \` (连签奖励 +\${data.checkIn.streakBonus})\` : '';
                this.toast(\`签到成功！金币 +\${data.checkIn.coins}\${bonus}\`, 'ok');
                this.fetchUserInfo(); // 刷新金币显示
            } else {
                this.toast(data.error === '今日已签到' ? '今天已经签到过了' : data.error, 'warn');
            }
        } catch(e) {
            this.toast('网络请求失败', 'warn');
        } finally {
            this.loading = false;
        }
      },
      toggleTheme() {
        const currentTheme = localStorage.getItem('moe_theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('moe_theme', newTheme);
        this.applyTheme(newTheme);
        this.toast('已切换至' + (newTheme === 'dark' ? '深色' : '浅色') + '模式', 'ok');
      },
      applyTheme(theme) {
        if (theme === 'dark') {
          document.documentElement.style.setProperty('--bg-color', '#0F172A');
          document.documentElement.style.setProperty('--card-bg', 'rgba(30, 41, 59, 0.95)');
          document.documentElement.style.setProperty('--text-main', '#F1F5F9');
          document.documentElement.style.setProperty('--text-light', '#94A3B8');
        } else {
          document.documentElement.style.setProperty('--bg-color', '#F8FAFC');
          document.documentElement.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.95)');
          document.documentElement.style.setProperty('--text-main', '#334155');
          document.documentElement.style.setProperty('--text-light', '#94A3B8');
        }
      },
      initTheme() {
        const savedTheme = localStorage.getItem('moe_theme') || 'light';
        this.applyTheme(savedTheme);
      },
      updateCraftStates() {
         const inv = this.inventory;
         document.getElementById('invN').innerText = inv.N || 0; document.getElementById('craft-item-R').classList.toggle('can-craft', (inv.N || 0) >= 5);
         document.getElementById('invR').innerText = inv.R || 0; document.getElementById('craft-item-SR').classList.toggle('can-craft', (inv.R || 0) >= 5);
         document.getElementById('invSR').innerText = inv.SR || 0; document.getElementById('craft-item-SSR').classList.toggle('can-craft', (inv.SR || 0) >= 5);
         document.getElementById('invSSR').innerText = inv.SSR || 0; document.getElementById('craft-item-UR').classList.toggle('can-craft', (inv.SSR || 0) >= 5);
      },
      mapError(err) {
        const map = {
          '积分不足': '积分不足！',
          'Username Taken': '用户名或昵称已被占用',
          'Nickname Taken': '用户名或昵称已被占用',
          '用户不存在': '用户不存在',
          'Invalid Password': '密码错误',
          '认证失败': '认证失败',
          'Missing fields': '请填写完整信息',
          '凭证无效': '账号或密码错误',
          'Invalid level': '无效的等级',
          'Level not reached yet': '尚未达到该等级',
          '奖励已领取': '奖励已领取',
          'No special reward for this level': '该等级没有特殊奖励'
        };
        return map[err] || err;
      },
      async doAuth() {
        const u = document.getElementById('authUsername').value.trim();
        const p = document.getElementById('authPassword').value;
        const n = document.getElementById('authNickname').value.trim();
        
        if (this.authMode === 'register') {
             if (!u || !p || !n) return this.toast('请填写完整信息', 'warn');
             try {
                const res = await fetch('/auth/register', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, nickname: n, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.toast('注册成功，请登录', 'ok'); 
                    this.switchAuth('login');
                } else { 
                    this.toast(this.mapError(d.error), 'warn'); 
                }
             } catch(e) { this.toast('网络错误', 'warn'); }
        } else {
             if (!u || !p) return this.toast('请输入账号和密码', 'warn');
             try {
                const res = await fetch('/auth/login', { 
                    method: 'POST', 
                    body: JSON.stringify({ username: u, password: p }) 
                });
                const d = await res.json();
                if(d.success) { 
                    this.username = d.user.username;
                    localStorage.setItem('moe_username', d.user.username);
                    this.updateUI(d.user);
                    document.getElementById('authModal').classList.remove('show');
                } else { 
                    this.toast(this.mapError(d.error || '连接失败'), 'warn'); 
                }
             } catch(e) { this.toast('网络错误', 'warn'); }
        }
      },
      async checkAnnouncement() {
        try {
          const res = await fetch('/announcement');
          const data = await res.json();
          if (data.enabled) {
            const lastReadId = localStorage.getItem('moe_ann_read');
            if (lastReadId !== String(data.id)) {
              this.showAnnouncementModal(data);
              this.currentAnnId = data.id; 
            }
          }
        } catch(e) {}
      },
      showAnnouncementModal(data) {
        document.getElementById('annTitle').innerText = data.title || '公告';
        document.getElementById('annContent').innerHTML = marked.parse(data.content || '');
        document.getElementById('announcementModal').classList.add('show');
      },
      closeAnnouncement() {
        if (this.currentAnnId) {
            localStorage.setItem('moe_ann_read', String(this.currentAnnId));
        }
        document.getElementById('announcementModal').classList.remove('show');
      },
      previewAnnouncement() {
        const content = document.getElementById('annContentInput').value;
        const title = document.getElementById('annTitleInput').value;
        if (!title && !content) return this.toast('请先输入内容', 'warn');
        this.showAnnouncementModal({ title: title || '公告', content: content || '无内容', isPreview: true });
      },
      async loadAdminAnnouncement() {
        try {
            const res = await fetch('/announcement');
            const data = await res.json();
            document.getElementById('annTitleInput').value = data?.title ?? '';
            document.getElementById('annContentInput').value = data?.content ?? '';
        } catch(e) { this.toast('加载失败', 'warn'); }
      },
      async publishAnnouncement() {
        const title = document.getElementById('annTitleInput').value.trim();
        const content = document.getElementById('annContentInput').value.trim();
        
        if (!title) return this.toast('请输入公告标题', 'warn');
        if (!content) return this.toast('请输入公告内容', 'warn');
        
        try {
          const res = await fetch('/admin/save-announcement', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              password: this.adminPwd, 
              announcement: { title, content, enabled: true }
            }) 
          });
          const d = await res.json();
          if (d.success) {
            this.toast('公告发布成功！', 'ok');
            this.loadAdminAnnouncement();
          } else {
            this.toast(this.mapError(d.error) || '发布失败', 'warn');
          }
        } catch(e) { 
          this.toast('网络错误', 'warn'); 
        }
      },
      async loadChangelog() {
        try {
          const res = await fetch('/changelog', { headers: { 'X-Admin-Mode': 'true' } });
          this.logsData = await res.json(); 
          const list = document.getElementById('logList');
          const tagLabels = {
            'optimization': { text: '优化', color: '#3B82F6', icon: 'fas fa-bolt' },
            'feature': { text: '功能', color: '#10B981', icon: 'fas fa-star' },
            'bugfix': { text: '修复', color: '#EF4444', icon: 'fas fa-bug' },
            'todo': { text: '待办', color: '#8B5CF6', icon: 'fas fa-thumbtack' },
            'documentation': { text: '文档', color: '#94A3B8', icon: 'fas fa-book' },
            'refactor': { text: '重构', color: '#F59E0B', icon: 'fas fa-code-branch' }
          };
          if(this.logsData && this.logsData.length) {
            list.innerHTML = this.logsData.map(log => {
              const tag = log.tag || 'optimization';
              const tagInfo = tagLabels[tag] || tagLabels.optimization;
              return \`<div class="log-item"><div class="log-meta"><span>\${escapeHtml(log.date)}</span> <span class="log-tag" style="background:\${tagInfo.color}"><i class="\${tagInfo.icon}"></i> \${tagInfo.text}</span></div><div class="log-content">\${escapeHtml(log.content)}</div></div>\`;
            }).join('');
            if (this.logsData.length > 3) document.getElementById('logToggle').style.display = 'block';
          }
        } catch(e) {}
      },
      toggleLog() { const list = document.getElementById('logList'); const btn = document.getElementById('logToggle'); list.classList.toggle('collapsed'); btn.innerHTML = list.classList.contains('collapsed') ? ('展开更多 <i class="fas fa-chevron-down"></i>') : ('收起列表 <i class="fas fa-chevron-up"></i>'); },
      async draw() {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        
        if (this.currentPool === 'ltd') {
             // [修复] 使用 this.coins 而不是查找不存在的 DOM 元素
             const currentCoins = this.coins;
             const cost = ${CONFIG.LIMITED.COST};
             if (currentCoins < cost) return this.toast('积分不足！', 'warn');
        }

        this.loading = true;
        const btn = document.getElementById('drawBtn');
        const img = document.getElementById('resultImg');
        const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        img.classList.remove('show');
        tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');

        try {
          let url = '/draw';
          let method = 'GET';
          let body = null;
          console.log('[DrawDebug] currentPool:', this.currentPool, 'currentLimitedPool:', this.currentLimitedPool);
          if (this.currentPool === 'ltd') {
              url = '/draw/limited';
              method = 'POST';
              // [修复] 确保使用当前选中的池，如果没有则使用后端返回的默认池
              const poolId = this.currentLimitedPool;
              console.log('[DrawDebug] Preparing limited draw, currentLimitedPool:', this.currentLimitedPool);
              if (!poolId) {
                console.warn('[DrawDebug] Warning: currentLimitedPool is empty!');
              }
              body = JSON.stringify({ poolId: poolId });
              console.log('[DrawDebug] Request body:', body);
          }

          const fetchOptions = { method: method, headers: { 'X-User-ID': this.username, 'Content-Type': 'application/json' } };
          if (body) fetchOptions.body = body;
          const res = await fetch(url, fetchOptions);
          const data = await res.json();
          
          if(data.error) {
              if (data.error === 'USER_NOT_FOUND') {
                   document.getElementById('authModal').classList.add('show');
                   throw new Error('请登录或注册');
              }
              throw this.mapError(data.error);
          }
          this.handleDrawResult(data, img, tag, btn);
         } catch(e) {
           this.loading = false;
           document.getElementById('loadingSpinner').classList.remove('show');
           this.switchPool(this.currentPool);
           this.toast(e.message || e.toString(), 'warn');
         }
      },
      async doCraft(target) {
        if(this.loading) return;
        if(!this.username) { document.getElementById('authModal').classList.add('show'); return; }
        const costMap = { 'R': 'N', 'SR': 'R', 'SSR': 'SR', 'UR': 'SSR' };
        if ((this.inventory[costMap[target]] || 0) < 5) return this.toast('需要 5 张 ' + costMap[target], 'warn');
        
        if(!confirm('确定消耗5张低阶卡合成1张 ' + target + ' 吗？')) return;
        
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');
        btn.innerHTML = '<i class="fas fa-flask fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');
        try {
          const res = await fetch('/user/craft', { method: 'POST', body: JSON.stringify({ targetRarity: target }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
           if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, true);
        } catch(e) { this.loading = false; document.getElementById('loadingSpinner').classList.remove('show'); this.switchPool(this.currentPool); this.toast(e.message, 'warn'); this.fetchUserInfo(); }
      },
      handleDrawResult(data, img, tag, btn, isSpecial = false) {
           img.src = data.card ? data.card.imageUrl : data.imageUrl;
           
           const onImageLoad = () => {
               if (!img || !document.body.contains(img)) return;
               img.classList.add('show');
               const placeholder = document.getElementById('placeholder');
               const spinner = document.getElementById('loadingSpinner');
               const btn = document.getElementById('drawBtn');
               const tag = document.getElementById('rarityTag');
               if (placeholder) placeholder.style.display = 'none';
               if (spinner) spinner.classList.remove('show');
               this.loading = false;
              
              const icon = this.currentPool === 'ltd' ? 'fa-star' : 'fa-bolt';
              if (btn) btn.innerHTML = \`<i class="fas \${icon}"></i> 再召唤\`;

              const rarity = data.card?.rarity || data.rarity;
              if (rarity && tag) { 
                  tag.innerText = rarity; 
                  tag.className = 'rarity-tag r-' + rarity.toLowerCase(); 
                  tag.classList.add('show'); 
              }
             
             if(data.success) { 
                 // 1. 成功反馈
                 this.vibrate('success');
                 this.animate('drawBtn', 'success'); 
                 this.toast(isSpecial || this.currentPool === 'ltd' ? '召唤成功！' : '召唤成功', 'ok'); 

                 // 2. [关键优化] 直接使用后端返回的数据更新 UI，不再发起 fetch
                 let newCoins = data.userCoins !== undefined ? data.userCoins : data.newBalance;
                 // 容错：后端字段缺失或类型异常时，避免把 undefined 写进 this.coins
                 newCoins = Number.isFinite(Number(newCoins)) ? Number(newCoins) : null;
                 if (newCoins !== undefined) {
                    this.coins = newCoins === null ? this.coins : newCoins;
                    const pCoins = document.getElementById('profileCoins');
                    if (pCoins) pCoins.innerText = this.coins;
                 }
                 
                 // 3. 处理升级信息
                 if (data.levelUp) {
                     const { newLevel, reward } = data.levelUp;
                     this.toast(\`恭喜升级到 Lv.\${newLevel}！获得 \${reward} 金币\`, 'ok');
                     const pLevel = document.getElementById('profileLevel');
                     if(pLevel) pLevel.innerText = newLevel;
                     const navLevel = document.getElementById('navLevel');
                     if(navLevel) navLevel.innerText = 'Lv.' + newLevel;
                 }

                 // 4. [关键优化] 本地更新库存，不刷新
                 // 普通抽卡/限定抽卡
                 if (data.rarity && !isSpecial) {
                     if (this.inventory) {
                         this.inventory[data.rarity] = (this.inventory[data.rarity] || 0) + 1;
                         // 只有当用户真的打开了个人资料页或者合成页时，才去更新具体的 DOM
                         if (document.getElementById('profileModal').classList.contains('show')) {
                             this.updateProfileStats();
                         }
                         if (document.getElementById('craftModal').classList.contains('show')) {
                             this.updateCraftStates();
                         }
                     }
                 }
                 // 合成操作 (后端返回了 craftResult 最好，如果没有则全量刷新)
                 else if (isSpecial && data.craftResult) {
                       if (this.inventory) {
                           this.inventory[data.craftResult.consumed] = Math.max(0, (this.inventory[data.craftResult.consumed] || 0) - 5);
                           this.inventory[data.craftResult.gained] = (this.inventory[data.craftResult.gained] || 0) + 1;
                           this.updateCraftStates();
                           
                           // 3秒后后台同步，确保数据一致性
                           setTimeout(() => this.fetchInventory(), 3000);
                       }
                 }
                 // 兜底：如果是复杂操作且没有详细数据，稍微延迟后刷新一次
                 else if (isSpecial) {
                     setTimeout(() => this.fetchInventory(), 500);
                 }

             } else { 
                 this.vibrate('failure');
                 this.toast('连接失败', 'warn'); 
             }
          };
          
          if (img.complete) onImageLoad(); else { 
              img.onload = onImageLoad; 
              img.onerror = () => { 
                  this.loading = false; 
                  this.vibrate('failure');
                  this.animate('drawBtn', 'error');
                  this.switchPool(this.currentPool); 
                  this.toast('图片加载失败', 'warn'); 
              }; 
          }
      },
      openCraft() { if(!this.username) return document.getElementById('authModal').classList.add('show'); this.updateCraftStates(); document.getElementById('craftModal').classList.add('show'); },
      openRules() { document.getElementById('profileModal').classList.remove('show'); document.getElementById('rulesModal').classList.add('show'); },
      closeRulesToProfile() { document.getElementById('rulesModal').classList.remove('show'); document.getElementById('profileModal').classList.add('show'); },
      openShop() {
        if(!this.username) return document.getElementById('authModal').classList.add('show');
        // 兜底：如果 coins 尚未正确初始化，视为 0，避免界面显示为 "undefined"
        const balance = Number.isFinite(Number(this.coins)) ? Number(this.coins) : 0;
        if(document.getElementById('shopBalance')) document.getElementById('shopBalance').innerText = balance;
        const packs = [{ id: 'R', color: '#3B82F6', price: 100 }, { id: 'SR', color: '#8B5CF6', price: 500 }, { id: 'SSR', color: '#F59E0B', price: 2000 }, { id: 'UR', color: '#EF4444', price: 8000 }];
        const container = document.getElementById('shopContent');
        if(container) {
            container.innerHTML = packs.map(p => {
                const can = balance >= p.price;
                return \`<div class="shop-item \${can?'':'disabled'}" \${can? \`onclick="App.buyPack('\${p.id}', \${p.price})"\` : ''}><div style="font-weight:900; font-size:1.5rem; color:\${p.color}">\${p.id}</div><div class="price-tag"><i class="fas fa-coins"></i> \${p.price}</div><div style="font-size:0.8rem; margin-top:5px; color:#94A3B8;">\${can?'购买':'积分不足'}</div></div>\`;
            }).join('');
        }
        document.getElementById('shopModal').classList.add('show');
      },
      async buyPack(rarity, price) {
        if(this.loading) return;
        if(!confirm('确定花费 ' + price + ' 积分吗？')) return;
        this.loading = true; this.closeModals();
        const btn = document.getElementById('drawBtn'); const img = document.getElementById('resultImg'); const tag = document.getElementById('rarityTag');
        const spinner = document.getElementById('loadingSpinner');
        const placeholder = document.getElementById('placeholder');
        btn.innerHTML = '<i class="fas fa-shopping-cart fa-spin"></i>'; img.classList.remove('show'); tag.classList.remove('show');
        placeholder.style.display = 'none';
        spinner.classList.add('show');
        try {
          const res = await fetch('/shop/buy', { method: 'POST', body: JSON.stringify({ targetRarity: rarity }), headers: { 'X-User-ID': this.username } });
          const data = await res.json();
          if(data.error) throw new Error(this.mapError(data.error));
          this.handleDrawResult(data, img, tag, btn, true);
        } catch(e) { this.loading = false; document.getElementById('loadingSpinner').classList.remove('show'); this.switchPool(this.currentPool); this.toast(e.message, 'warn'); }
      },
      openDice() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('diceModal').classList.add('show'); document.getElementById('diceIcon').className = 'fas fa-dice-d6'; document.getElementById('diceMsg').innerText = ''; },
      openUpload() { 
        if(!this.username) return document.getElementById('authModal').classList.add('show'); 
        
        const modal = document.getElementById('uploadModal');
        modal.classList.add('show'); 
        
        // 重置状态
        this.clearUpload();
        
        // 绑定拖拽事件 (只需要绑定一次，避免重复绑定)
        if (!this._uploadEventsBound) {
            const dropZone = document.getElementById('uploadDropZone');
            const input = document.getElementById('uploadInput');
            
            // 点击触发文件选择
            dropZone.onclick = (e) => {
                // 防止点击预览区的删除按钮冒泡触发
                if(e.target.closest('.upload-remove-btn')) return;
                input.click();
            };
            
            // 文件选择变化
            input.onchange = (e) => {
                if(e.target.files && e.target.files[0]) {
                    this.handleFileSelect(e.target.files[0]);
                }
            };
            
            // 拖拽进入
            dropZone.ondragover = (e) => { 
                e.preventDefault(); 
                dropZone.classList.add('drag-over');
            };
            
            // 拖拽离开
            dropZone.ondragleave = () => { 
                dropZone.classList.remove('drag-over'); 
            };
            
            // 放置文件
            dropZone.ondrop = (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if(e.dataTransfer.files && e.dataTransfer.files[0]) {
                    // 将拖拽的文件赋值给 input，方便后续统一处理
                    input.files = e.dataTransfer.files;
                    this.handleFileSelect(e.dataTransfer.files[0]);
                }
            };
            
            this._uploadEventsBound = true;
        }
      },
      // 处理文件选择并预览
      handleFileSelect(file) {
          const msg = document.getElementById('uploadMsg');
          const preview = document.getElementById('uploadPreview');
          const previewImg = document.getElementById('uploadPreviewImg');
          const dropZone = document.getElementById('uploadDropZone');

          // 基础校验
          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
          if(!allowedTypes.includes(file.type)) {
              this.showUploadMsg('不支持的文件类型 (仅限 JPG, PNG, GIF, WebP)', 'error');
              return;
          }
          if(file.size > 5 * 1024 * 1024) {
              this.showUploadMsg('文件过大，最大支持 5MB', 'error');
              return;
          }

          // 读取预览
          const reader = new FileReader();
          reader.onload = (e) => {
              previewImg.src = e.target.result;
              preview.style.display = 'block'; // 显示预览图
              dropZone.style.display = 'none'; // 隐藏上传框
              this.showUploadMsg('', 'normal'); // 清空错误
          };
          reader.readAsDataURL(file);
      },

      // 清除当前选择的文件
      clearUpload() {
          document.getElementById('uploadInput').value = '';
          document.getElementById('uploadPreview').style.display = 'none';
          document.getElementById('uploadDropZone').style.display = 'block';
          document.getElementById('uploadPreviewImg').src = '';
          this.showUploadMsg('', 'normal');
      },
      previewUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          document.getElementById('uploadPreviewImg').src = e.target.result;
          document.getElementById('uploadPreview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      },
      showUploadMsg(text, type) {
          const el = document.getElementById('uploadMsg');
          el.innerText = text;
          if (type === 'error') {
              el.style.color = '#EF4444';
              this.animate('uploadModal', 'error'); // 震动反馈
          } else if (type === 'success') {
              el.style.color = '#10B981';
          } else {
              el.style.color = '#334155';
          }
      },

      async doUpload() {
        if(this.loading) return;
        
        const input = document.getElementById('uploadInput');
        const rarity = document.getElementById('uploadRarity').value;
        const btn = document.getElementById('uploadBtn');
        
        if(!input.files || !input.files[0]) {
          this.showUploadMsg('请先选择一张图片', 'error');
          return;
        }
        
        const file = input.files[0];
        
        // 开始上传
        this.loading = true;
        this.showUploadMsg('正在上传到云端...', 'normal');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';
        
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('rarity', rarity);
          
          const res = await fetch('/user/upload', {
            method: 'POST',
            body: formData,
            headers: { 'X-User-ID': this.username }
          });
          
          const data = await res.json();
          
          if(data.error) {
            this.showUploadMsg(this.mapError(data.error), 'error');
            this.vibrate('failure');
          } else {
            this.showUploadMsg('上传成功！已进入审核队列', 'success');
            this.vibrate('success');
            // 成功动画
            const previewImg = document.getElementById('uploadPreviewImg');
            previewImg.style.transform = "scale(0.5)";
            previewImg.style.opacity = "0";
            previewImg.style.transition = "all 0.5s ease";

            setTimeout(() => {
                this.closeModals();
                this.toast('图片上传成功', 'ok');
            }, 1000);
          }
        } catch(e) {
          console.error(e);
          this.showUploadMsg('网络连接失败', 'error');
        } finally {
          this.loading = false;
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交审核';
        }
      },
      async playDice(prediction) {
        if(this.loading) return; 
        const bet = parseInt(document.getElementById('betInput').value); 
        if(!bet || bet < 10) {
            // [优化] 输入错误反馈
            this.vibrate('failure');
            this.animate('betInput', 'error');
            return this.toast('最小下注为 10', 'warn');
        }

        this.loading = true; 
        this.vibrate('tap'); // 点击反馈

        const icon = document.getElementById('diceIcon'); 
        const msg = document.getElementById('diceMsg'); 
        
        icon.classList.add('dice-result-anim'); 
        msg.innerText = '骰子转动中...';
        
        try {
          const res = await fetch('/game/dice', { method: 'POST', body: JSON.stringify({ betAmount: bet, prediction: prediction }), headers: { 'X-User-ID': this.username, 'Content-Type': 'application/json' } });
          const data = await res.json();
          setTimeout(() => {
             this.loading = false; 
             icon.classList.remove('dice-result-anim');
             
             if(data.error) { 
                 this.vibrate('failure');
                 msg.innerText = this.mapError(data.error); 
                 return; 
             }
             
             const diceIcons = ['one', 'two', 'three', 'four', 'five', 'six']; 
             icon.className = \`fas fa-dice-\${diceIcons[data.roll - 1]}\`;
             
             // [优化] 胜负反馈动画与震动
             if(data.isWin) { 
                 this.vibrate('success');
                 this.animate('diceIcon', 'success'); // 图标弹跳
                 msg.innerText = \`你赢了！ (+\${data.winAmount})\`; 
                 msg.style.color = '#10B981'; 
                 this.toast('运气爆棚！', 'ok'); 
             } else { 
                 this.vibrate('failure');
                 this.animate('diceIcon', 'error'); // 图标抖动
                 msg.innerText = '你输了'; 
                 msg.style.color = '#EF4444'; 
             }
             
             this.coins = data.newBalance;
             const pCoins = document.getElementById('profileCoins');
             if(pCoins) pCoins.innerText = data.newBalance;
          }, 600);
        } catch(e) { 
            this.loading = false; 
            icon.classList.remove('dice-result-anim'); 
            this.vibrate('failure');
            this.toast('网络错误', 'warn'); 
        }
      },
      async loadShowcase() {
        const grid = document.getElementById('showcaseGrid'); 
        const btn = document.getElementById('refreshBtn');
        
        // [交互] 点击刷新时的反馈
        if(btn) {
            this.vibrate('tap');
            btn.classList.remove('refresh-spin');
            void btn.offsetWidth;
            btn.classList.add('refresh-spin');
        }

        // [优化] 渲染骨架屏：生成6个占位方块，不再显示简单的"加载中"
        // 保持高度与实际图片一致 (aspect-ratio: 1)
        const skeletonHtml = Array(6).fill(0).map(() => 
            \`<div class="grid-item skeleton" style="aspect-ratio:1; border:none;"></div>\`
        ).join('');
        grid.innerHTML = skeletonHtml;

        try { 
            const res = await fetch('/showcase?t=' + Date.now()); 
            const data = await res.json(); 
            if(data.length) { 
                // 图片加载后渐显效果已在原有CSS (.grid-item img) 中定义
                grid.innerHTML = data.map(item => 
                    \`<div class="grid-item anim-pop" onclick="App.preview('\${item.imageUrl}')"><img src="\${item.imageUrl}" loading="lazy"></div>\`
                ).join(''); 
            } else {
                grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#94A3B8;">暂无数据</div>';
            }
        } catch(e) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:20px; color:#EF4444;">加载失败</div>';
        }
        if(btn) setTimeout(() => btn.classList.remove('refresh-spin'), 800);
      },
      openAdmin() { this.closeModals(); document.getElementById('adminModal').classList.add('show'); },
      async verifyAdmin() {
        const pwd = document.getElementById('adminPass').value;
        try {
            const res = await fetch('/admin/verify', { method: 'POST', body: JSON.stringify({password: pwd}) }); const d = await res.json();
            if(d.success) { this.adminPwd = pwd; document.getElementById('adminLogin').style.display = 'none'; document.getElementById('adminPanel').style.display = 'block'; this.switchAdminTab('log'); this.renderAdminTable(); } else { this.toast('密码错误', 'warn'); }
        } catch(e) { this.toast('网络错误', 'warn'); }
      },
      switchAdminTab(tab) { this.currentAdminTab = tab; document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active')); document.getElementById('tab-' + tab).classList.add('active'); document.getElementById('view-log').style.display = tab === 'log' ? 'block' : 'none'; document.getElementById('view-users').style.display = tab === 'users' ? 'block' : 'none'; document.getElementById('view-uploads').style.display = tab === 'uploads' ? 'block' : 'none'; document.getElementById('view-ann').style.display = tab === 'ann' ? 'block' : 'none'; if(tab === 'users') this.loadAdminUsers(); if(tab === 'uploads') this.loadAdminUploads(); if(tab === 'ann') this.loadAdminAnnouncement();},
      _userPageOffset: 0,
      _userPageLimit: 20,
      _allUsersCache: [],
      async loadAdminUsers() {
        const tbody = document.getElementById('userTbody');
        
        const skeletonRow = \`
            <tr>
                <td><div class="skeleton" style="height:36px; width:36px; border-radius:50%;"></div></td>
                <td><div class="skeleton" style="height:16px; width:60px;"></div></td>
                <td><div class="skeleton" style="height:16px; width:40px;"></div></td>
                <td><div class="skeleton" style="height:16px; width:60px;"></div></td>
                <td><div class="skeleton" style="height:14px; width:100px;"></div></td>
                <td><div class="skeleton" style="height:14px; width:100px;"></div></td>
                <td><div class="skeleton" style="height:24px; width:60px;"></div></td>
            </tr>
        \`;
        tbody.innerHTML = Array(5).fill(skeletonRow).join('');

        try { 
            const res = await fetch('/admin/users', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, limit: 1000, offset: 0 }) }); 
            const data = await res.json(); 
            if(data.success) {
              this._allUsersCache = data.users || [];
              this._userPageOffset = 0;
              this._userPageLimit = 20;
              
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const todayStr = today.toISOString().split('T')[0];
              const activeUsers = this._allUsersCache.filter(u => u.lastLoginDate && u.lastLoginDate.split('T')[0] === todayStr).length;
              
              document.getElementById('statTotalUsers').innerText = data.total || 0;
              document.getElementById('statTodayUsers').innerText = data.todayCount || 0;
              document.getElementById('statActiveUsers').innerText = activeUsers;
              
              this._renderUserTable();
              this._updatePagination(data.total);
            } else { 
                tbody.innerHTML = '<tr><td colspan="7" class="empty-state-card"><i class="fas fa-exclamation-circle"></i><p>加载失败: ' + escapeHtml(data.error || '未知错误') + '</p></td></tr>'; 
            }
        } catch(e) { 
            tbody.innerHTML = '<tr><td colspan="7" class="empty-state-card"><i class="fas fa-exclamation-circle"></i><p>网络错误</p></td></tr>';
        }
      },
      _renderUserTable() {
        const tbody = document.getElementById('userTbody');
        const searchVal = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
        
        let filteredUsers = this._allUsersCache;
        if (searchVal) {
          filteredUsers = this._allUsersCache.filter(u => 
            (u.username && u.username.toLowerCase().includes(searchVal)) || 
            (u.nickname && u.nickname.toLowerCase().includes(searchVal))
          );
        }
        
        const pagedUsers = filteredUsers.slice(this._userPageOffset, this._userPageOffset + this._userPageLimit);
        
        if (!pagedUsers.length) {
          tbody.innerHTML = '<tr><td colspan="7" class="empty-state-card"><i class="fas fa-users"></i><p>' + (searchVal ? '没有匹配的用户' : '暂无用户') + '</p></td></tr>';
          return;
        }
        
        tbody.innerHTML = pagedUsers.map(u => {
            const formatDate = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', {year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'}) : '-';
            const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 36 36'%3E%3Ccircle cx='18' cy='18' r='18' fill='%23475569'/%3E%3C/svg%3E";
            return \`<tr>
                <td><img src="\${escapeHtml(u.avatar || '')}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:2px solid #E2E8F0;" onerror="this.src='\${defaultAvatar}'" /></td>
                <td><div style="font-weight:600; color:#1E293B;">\${escapeHtml(u.username)}</div><div style="font-size:0.7rem; color:#64748B;">\${escapeHtml(u.nickname || '')}</div></td>
                <td><span class="user-level-badge"><i class="fas fa-star"></i> Lv.\${u.level || 1}</span></td>
                <td><span class="user-badge" style="background:rgba(99,102,241,0.15); color:#6366F1;">\${u.drawCount || 0}</span></td>
                <td><div class="user-coins-cell"><span class="coins-value">\${u.coins || 0}</span><button class="coins-edit-btn" onclick="App.adminEditPoints('\${escapeHtml(u.username)}')" title="修改积分"><i class="fas fa-pen"></i></button></div></td>
                <td style="font-size:0.75rem; color:#64748B;">\${formatDate(u.createdAt)}</td>
                <td style="font-size:0.75rem; color:#64748B;">\${formatDate(u.lastLoginDate)}</td>
                <td><div class="user-row-actions"><button class="delete-btn" onclick="App.deleteUser('\${escapeHtml(u.username)}')" title="删除用户"><i class="fas fa-trash"></i></button></div></td>
            </tr>\`;
        }).join('');
      },
      _updatePagination(total) {
        const infoEl = document.getElementById('paginationInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        
        const searchVal = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
        let filteredTotal = total;
        if (searchVal) {
          filteredTotal = this._allUsersCache.filter(u => 
            (u.username && u.username.toLowerCase().includes(searchVal)) || 
            (u.nickname && u.nickname.toLowerCase().includes(searchVal))
          ).length;
        }
        
        const start = this._userPageOffset + 1;
        const end = Math.min(this._userPageOffset + this._userPageLimit, filteredTotal);
        infoEl.innerText = \`共 \${filteredTotal} 条记录，显示 \${start}-\${end}\`;
        
        prevBtn.disabled = this._userPageOffset <= 0;
        nextBtn.disabled = this._userPageOffset + this._userPageLimit >= filteredTotal;
      },
      filterUsers(value) {
        this._userPageOffset = 0;
        this._renderUserTable();
        this._updatePagination(this._allUsersCache.length);
      },
      changePage(delta) {
        const searchVal = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
        let filteredTotal = this._allUsersCache.length;
        if (searchVal) {
          filteredTotal = this._allUsersCache.filter(u => 
            (u.username && u.username.toLowerCase().includes(searchVal)) || 
            (u.nickname && u.nickname.toLowerCase().includes(searchVal))
          ).length;
        }
        
        const newOffset = this._userPageOffset + (delta * this._userPageLimit);
        if (newOffset >= 0 && newOffset < filteredTotal) {
          this._userPageOffset = newOffset;
          this._renderUserTable();
          this._updatePagination(filteredTotal);
        }
      },
      async adminEditPoints(userId) { const val = prompt('输入要增加或减少的积分:'); if(!val) return; const amount = parseInt(val); if(isNaN(amount)) return; try { const res = await fetch('/admin/update-points', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: userId, amount: amount }) }); const d = await res.json(); if(d.success) { this.toast('保存成功！', 'ok'); this.loadAdminUsers(); } else { this.toast(d.error, 'warn'); } } catch(e) { this.toast('网络错误', 'warn'); } },
      async deleteUser(id) { if(!confirm('确定删除该用户吗？此操作不可逆。')) return; try { const res = await fetch('/admin/delete-user', { method: 'POST', body: JSON.stringify({ password: this.adminPwd, targetId: id }) }); const d = await res.json(); if(d.success) { this.toast('用户已删除', 'ok'); this.loadAdminUsers(); } else { this.toast('Error', 'warn'); } } catch(e) { this.toast('网络错误', 'warn'); } },
      async loadAdminUploads() {
        const container = document.getElementById('uploadsContainer');
        const status = document.getElementById('uploadStatusFilter').value;
        container.innerHTML = '<div style="text-align:center; padding:60px; color:#64748B;"><i class="fas fa-spinner fa-spin" style="font-size:2rem; margin-bottom:16px; display:block;"></i>加载中...</div>';
        try {
          const res = await fetch('/admin/uploads', {
            method: 'POST',
            body: JSON.stringify({ password: this.adminPwd, status })
          });
          const d = await res.json();
          if(d.success) {
            const badge = document.getElementById('uploadsCountBadge');
            if (d.total > 0) {
              badge.textContent = d.total;
              badge.style.display = 'inline-block';
            } else {
              badge.style.display = 'none';
            }
            if(!d.uploads || d.uploads.length === 0) {
              container.innerHTML = '<div style="text-align:center; padding:60px; color:#64748B;"><i class="fas fa-inbox" style="font-size:2.5rem; margin-bottom:16px; display:block; opacity:0.5;"></i>暂无' + (status === 'pending' ? '待审核' : status === 'approved' ? '已通过' : '已拒绝') + '的上传</div>';
              return;
            }
            let html = '<div class="uploads-grid">';
            d.uploads.forEach(u => {
              const dateStr = new Date(u.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
              const rarityClass = 'r-' + (u.rarity || 'N').toLowerCase();
              const rarityName = u.rarity || 'N';
              html += \`
                <div style="background:white; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; transition:all 0.2s;">
                  <div style="position:relative; aspect-ratio:1; background:#F1F5F9; cursor:pointer;" onclick="App.showImage('\${u.url}')">
                    <img src="\${u.url}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
                    <span class="rarity-tag \${rarityClass} show" style="position:absolute; top:8px; left:8px; font-size:0.75rem; padding:2px 8px;">\${rarityName}</span>
                  </div>
                  <div style="padding:12px;">
                    <div style="font-size:0.85rem; font-weight:600; color:#1E293B; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">\${u.username}</div>
                    <div style="font-size:0.7rem; color:#64748B; margin-bottom:10px;">\${dateStr}</div>
                    \${status === 'pending' ? \`
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                      <select id="rarity-\${u.id}" style="padding:6px 8px; border:1px solid #E2E8F0; border-radius:6px; font-size:0.75rem; background:white; color:#1E293B;">
                        <option value="N">N</option>
                        <option value="R">R</option>
                        <option value="SR">SR</option>
                        <option value="SSR">SSR</option>
                        <option value="UR" selected>UR</option>
                      </select>
                      <button class="admin-btn primary small" style="padding:6px 10px;" onclick="App.reviewUpload(\${u.id}, 'approved')">通过</button>
                      <button class="admin-btn secondary small" style="padding:6px 10px; grid-column:1/-1;" onclick="App.reviewUpload(\${u.id}, 'rejected')">拒绝</button>
                    </div>
                    \` : \`<div style="font-size:0.75rem; color:#64748B; text-align:center; padding:8px 0;">已\${status === 'approved' ? '通过' : '拒绝'}</div>\`}
                  </div>
                </div>
              \`;
            });
            html += '</div>';
            container.innerHTML = html;
          } else {
            container.innerHTML = '<div style="text-align:center; padding:60px; color:#EF4444;"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:16px; display:block;"></i>加载失败: ' + escapeHtml(d.error || 'Unknown') + '</div>';
          }
        } catch(e) {
          container.innerHTML = '<div style="text-align:center; padding:60px; color:#EF4444;"><i class="fas fa-exclamation-circle" style="font-size:2rem; margin-bottom:16px; display:block;"></i>网络错误</div>';
        }
      },
      async reviewUpload(uploadId, action) {
        const rarity = action === 'approved' ? document.getElementById('rarity-' + uploadId).value : null;
        try {
          const res = await fetch('/admin/review-upload', {
            method: 'POST',
            body: JSON.stringify({ password: this.adminPwd, uploadId, action, rarity })
          });
          const d = await res.json();
          if(d.success) {
            this.toast(action === 'approved' ? '已通过审核' : '已拒绝', 'ok');
            this.loadAdminUploads();
          } else {
            this.toast(d.error || '操作失败', 'warn');
          }
        } catch(e) {
          this.toast('网络错误', 'warn');
        }
      },
      renderAdminTable() { document.getElementById('adminTbody').innerHTML = this.logsData.map((log, idx) => \`<tr><td><input class="admin-input" value="\${escapeHtml(log.date)}" onchange="App.updateLog(\${idx}, 'date', this.value)"></td><td><input class="admin-input" value="\${escapeHtml(log.content)}" onchange="App.updateLog(\${idx}, 'content', this.value)"></td><td><select class="admin-input" style="padding:6px 8px;" onchange="App.updateLog(\${idx}, 'tag', this.value)"><option value="optimization" \${log.tag === 'optimization' ? 'selected' : ''}>优化</option><option value="feature" \${log.tag === 'feature' ? 'selected' : ''}>功能</option><option value="bugfix" \${log.tag === 'bugfix' ? 'selected' : ''}>修复</option><option value="todo" \${log.tag === 'todo' ? 'selected' : ''}>待办</option><option value="documentation" \${log.tag === 'documentation' ? 'selected' : ''}>文档</option><option value="refactor" \${log.tag === 'refactor' ? 'selected' : ''}>重构</option></select></td><td><button class="admin-btn danger small" style="padding:6px 10px;" onclick="App.delLog(\${idx})"><i class="fas fa-trash-alt"></i></button></td></tr>\`).join(''); },
      updateLog(idx, field, val) { this.logsData[idx][field] = val; },
      quickAddLog() {
        const content = document.getElementById('quickLogContent').value.trim();
        const tag = document.getElementById('quickLogTag').value;
        if (!content) return this.toast('请输入更新内容', 'warn');
        const today = new Date().toISOString().split('T')[0];
        
        this.logsData.unshift({ date: today, content, tag });
        this.renderAdminTable();
        document.getElementById('quickLogContent').value = '';
        this.toast('已添加到列表，请保存', 'ok');
      },
      addAdminRow() { this.logsData.unshift({date: new Date().toISOString().split('T')[0], content:'...', tag:'optimization'}); this.renderAdminTable(); }, delLog(idx) { this.logsData.splice(idx, 1); this.renderAdminTable(); },
      async saveAdminLog() { 
        try { 
          const res = await fetch('/admin/save-changelog', { 
            method: 'POST', 
            body: JSON.stringify({password: this.adminPwd, logs: this.logsData})
          }); 
          const d = await res.json();
          if(d.success) { 
            this.toast('保存成功！首页将在一分钟内自动更新。', 'ok');
            this.logsData = [...this.logsData];
            this.renderAdminTable();
            this.loadChangelog();
          } else { 
            this.toast(d.error || '保存失败', 'warn'); 
          } 
        } catch(e) { 
          this.toast('网络错误', 'warn'); 
        } 
      },
      openProfile() { if(!this.username) return document.getElementById('authModal').classList.add('show'); document.getElementById('profileModal').classList.add('show'); },
      closeModals() {
        document.querySelectorAll('.modal').forEach(m => {
          m.classList.remove('show');
          if (m.id === 'statsModal' || m.getAttribute('data-dynamic') === 'true') {
            if (m._backdropClickHandler) {
              m.removeEventListener('click', m._backdropClickHandler);
              delete m._backdropClickHandler;
            }
            setTimeout(() => {
              if (m.parentNode && (m.id === 'statsModal' || m.getAttribute('data-dynamic') === 'true')) {
                m.remove();
              }
            }, 300);
          }
        });
        setTimeout(() => {
          const statsModal = document.getElementById('statsModal');
          if (statsModal && statsModal.parentNode) {
            statsModal.remove();
          }
        }, 350);
      },
      logout() { if(confirm('确定要注销吗？')) { localStorage.removeItem('moe_username'); location.reload(); } },
      preview(src) { document.getElementById('bigImg').src=src; document.getElementById('imgModal').classList.add('show'); },
      toast(msg, type) { const div = document.createElement('div'); div.className = 'toast'; div.innerHTML = \`<span>\${type==='ok'?'✅':'⚠️'}</span> \${escapeHtml(msg)}\`; document.body.appendChild(div); setTimeout(() => div.remove(), 2500); }
    };
    window.onload = () => {
        document.getElementById('ltdCostDisplay').innerText = '${CONFIG.LIMITED.COST} pts';
        App.init();
        if (document.getElementById('siteRuntime')) {
            const startTime = parseInt('${siteStartTime}');
            const updateRuntime = () => {
                const diff = Date.now() - startTime;
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                let timeHtml = '';
                if (days > 0) {
                    timeHtml = \`<span class="highlight">\${days}</span>天 <span class="highlight">\${hours}</span>时 <span class="highlight">\${mins}</span>分\`;
                } else {
                    timeHtml = \`<span class="highlight">\${hours}</span>时 <span class="highlight">\${mins}</span>分\`;
                }
                document.getElementById('siteRuntime').innerHTML = \`
                    <div class="site-runtime-card">
                        <div class="site-runtime-icon"><i class="fas fa-heartbeat"></i></div>
                        <div class="site-runtime-info">
                            <div class="site-runtime-label">运行时长</div>
                            <div class="site-runtime-time">\${timeHtml}</div>
                        </div>
                    </div>
                \`;
            };
            updateRuntime();
            setInterval(updateRuntime, 60000);
        }
    };
  </script>
</body>
</html>
  `;
}