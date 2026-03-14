/**
 * 共享 UI 组件
 */

export const Html = {
  cardStat(rarity, count) {
    const labels = { N: 'N', R: 'R', SR: 'SR', SSR: 'SSR', UR: 'UR' };
    return `<div class="card-stat card-stat-${rarity.toLowerCase()}"><div class="card-stat-label card-stat-label-${rarity.toLowerCase()}">${labels[rarity]}</div><div class="card-stat-val" id="invCount${rarity}">${count || 0}</div></div>`;
  },
  rarityTag(rarity) {
    return `<span class="rarity-tag r-${rarity.toLowerCase()} show">${rarity}</span>`;
  },
  shopItem(id, color, price, canBuy) {
    return `<div class="shop-item ${canBuy ? '' : 'disabled'}" ${canBuy ? `onclick="App.buyPack('${id}', ${price})"` : ''}><div style="font-weight:900; font-size:1.5rem; color:${color}">${id}</div><div class="price-tag"><i class="fas fa-coins"></i> ${price}</div><div style="font-size:0.8rem; margin-top:5px; color:#94A3B8;">${canBuy ? '购买' : '积分不足'}</div></div>`;
  },
  gridItem(url, onclick) {
    return `<div class="grid-item" onclick="${onclick}"><img src="${url}" loading="lazy"></div>`;
  },
  invCount(rarity) {
    return `invCount${rarity}`;
  }
};

export const NEUTRAL_CSS = `
<style>
  :root {
    --primary: #3B82F6; --primary-dark: #2563EB; --secondary: #10B981;
    --bg-color: #F8FAFC; --card-bg: rgba(255, 255, 255, 0.95);
    --text-main: #334155; --text-light: #94A3B8; --danger: #EF4444;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --radius: 16px; 
    --font: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
    --r-n: #64748B; --r-r: #3B82F6; --r-sr: #8B5CF6; --r-ssr: #F59E0B; --r-ur: #EF4444;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    background-color: var(--bg-color);
    background-image: linear-gradient(#E2E8F0 1px, transparent 1px), linear-gradient(90deg, #E2E8F0 1px, transparent 1px);
    background-size: 30px 30px; color: var(--text-main); font-family: var(--font); margin: 0; min-height: 100vh; overflow-x: hidden;
  }
  .btn {
    background: var(--primary); color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; cursor: pointer; text-decoration: none;
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 0 var(--primary-dark); transition: all 0.15s ease; font-size: 0.95rem; font-family: var(--font);
  }
  .btn:hover { transform: translateY(-1px); box-shadow: 0 6px 0 var(--primary-dark); }
  .btn:active { transform: translateY(4px); box-shadow: 0 0 0 var(--primary-dark); }
  .btn.secondary { background: white; color: var(--text-main); border: 2px solid #E2E8F0; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .btn.secondary:hover { background: #F8FAFC; border-color: var(--primary); color: var(--primary); transform: translateY(-1px); box-shadow: 0 4px 8px rgba(59,130,246,0.15); }
  .btn.secondary:active { transform: translateY(2px); box-shadow: 0 0 0 #E2E8F0; }
  .btn.danger { background: var(--danger); box-shadow: 0 4px 0 #B91C1C; }
  .btn.danger:hover { background: #DC2626; }
  .btn.danger:active { transform: translateY(4px); box-shadow: 0 0 0 #B91C1C; }
  .glass-card { background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.55); border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden; }
  .modal { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: none; justify-content: center; align-items: center; z-index: 2000; opacity: 0; transition: 0.2s; }
  .modal.show { display: flex; opacity: 1; }
  .modal-content { background: rgba(255, 255, 255, 0.78); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); padding: 24px; border-radius: var(--radius); width: 90%; max-width: 450px; text-align: center; transform: scale(0.95); transition: 0.2s; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1); max-height: 90vh; overflow-y: auto; position: relative; border: 1px solid rgba(255, 255, 255, 0.5); }
  .modal.show .modal-content { transform: scale(1); }
  .placeholder { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-light); text-align: center; font-size: 0.9rem; }
  .placeholder i { font-size: 3rem; margin-bottom: 16px; display: block; color: #CBD5E1; }
  .loading-spinner { position: absolute; inset: 0; display: none; flex-direction: column; justify-content: center; align-items: center; color: var(--primary); text-align: center; font-size: 0.9rem; background: rgba(255,255,255,0.95); border-radius: var(--radius); z-index: 5; }
  .loading-spinner.show { display: flex; }
  .loading-spinner i { font-size: 3rem; margin-bottom: 16px; display: block; animation: spin 1s linear infinite; }
  .loading-spinner .loading-text { font-weight: 600; color: var(--text-main); }
  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .modal-close-btn { position: absolute; top: 16px; right: 16px; background: transparent; border: none; font-size: 1.2rem; color: var(--text-light); cursor: pointer; padding: 5px; z-index: 10; }
  .modal-close-btn:hover { color: var(--danger); transform: rotate(90deg); transition: 0.2s; }
  .actions { padding: 16px 10px 10px; display: grid; gap: 12px; grid-template-columns: 1fr 1fr 1fr; }
  #drawBtn { grid-column: 1 / -1; height: 54px; font-size: 1.1rem; box-shadow: 0 6px 0 var(--primary-dark); }
  #drawBtn:hover { transform: translateY(-2px); box-shadow: 0 8px 0 var(--primary-dark); }
  #drawBtn:active { transform: translateY(6px); box-shadow: 0 0 0 var(--primary-dark); }
  .actions .btn.secondary { padding: 8px 0; font-size: 1.2rem; transition: all 0.2s ease; }
  @media(min-width: 600px) { .actions { grid-template-columns: 2fr 1fr 1fr 1fr; } #drawBtn { grid-column: auto; height: auto; font-size: 0.95rem; } .actions .btn.secondary { font-size: 0.95rem; } }
  .rules-table { width: 100%; font-size: 0.85rem; border-collapse: collapse; margin-top: 10px; }
  .rules-table th { text-align: left; border-bottom: 2px solid #E2E8F0; padding: 6px; color: var(--primary); }
  .rules-table td { border-bottom: 1px solid #F1F5F9; padding: 6px; }
  .shop-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .shop-item { background: white; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px 15px; text-align: center; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: space-between; min-height: 140px; }
  .shop-item:hover { border-color: var(--primary); transform: translateY(-3px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }
  .shop-item i { font-size: 2rem; margin-bottom: 10px; color: var(--primary); }
  .shop-item.disabled { opacity: 0.6; filter: grayscale(1); cursor: not-allowed; border-color: #E2E8F0 !important; transform: none !important; box-shadow: none !important; }
  .price-tag { background: linear-gradient(135deg, #FEF3C7, #FDE68A); color: #D97706; padding: 6px 10px; border-radius: 8px; font-weight: bold; font-size: 0.9rem; margin-top: 10px; display: inline-block; box-shadow: 0 2px 4px rgba(217,119,6,0.2); border: 1px solid #FBBF24; }
  .shop-item.can-craft { border: 2px solid var(--secondary); background-color: #ECFDF5; box-shadow: 0 0 10px rgba(16, 185, 129, 0.3); animation: pulse 2s infinite; }
  @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
  .shop-cost { font-size: 0.8rem; color: var(--text-light); margin-top: 5px; }
  .rarity-tag { position: absolute; top: 10px; left: 10px; z-index: 10; padding: 4px 12px; border-radius: 8px; font-weight: 900; color: white; font-size: 1rem; text-shadow: 0 2px 4px rgba(0,0,0,0.5); opacity: 0; transform: scale(0.8); transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); border: 2px solid rgba(255,255,255,0.8); }
  .rarity-tag.show { opacity: 1; transform: scale(1); }
  .r-n { background: var(--r-n); } .r-r { background: var(--r-r); } .r-sr { background: var(--r-sr); } .r-ssr { background: linear-gradient(135deg, var(--r-ssr), #D97706); }
  .r-ur { background: linear-gradient(45deg, var(--r-ur), #EC4899, #8B5CF6); background-size: 200% 200%; animation: rainbow 3s ease infinite; border-color: #FFF; }
  @keyframes rainbow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
  .admin-modal-content { background: white; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 0; border-radius: 16px; width: 90%; max-width: 720px; max-height: 90vh; overflow: hidden; position: relative; border: 1px solid #E2E8F0; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); transform: scale(0.95); transition: transform 0.2s ease; }
  .admin-modal.show .admin-modal-content { transform: scale(1); }
  .admin-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; }
  .admin-modal-header h3 { margin: 0; font-size: 1.25rem; font-weight: 600; color: #1E293B; display: flex; align-items: center; gap: 10px; }
  .admin-modal-header h3 i { color: var(--primary); }
  .admin-modal-close { background: #F1F5F9; border: none; width: 36px; height: 36px; border-radius: 10px; color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .admin-modal-close:hover { background: #EF4444; color: white; transform: rotate(90deg); }
  .admin-modal-body { padding: 20px 24px; max-height: calc(90vh - 140px); overflow-y: auto; }
  .admin-tabs { display: flex; gap: 4px; background: #F1F5F9; padding: 4px; border-radius: 12px; margin-bottom: 20px; }
  .admin-tab { padding: 10px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; color: #64748B; transition: all 0.2s; border: none; background: transparent; display: flex; align-items: center; gap: 8px; }
  .admin-tab:hover { color: #1E293B; background: white; }
  .admin-tab.active { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; font-weight: 600; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3); }
  .admin-tab-badge { background: #EF4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; }
  .admin-input { width: 100%; padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem; background: white; color: #1E293B; transition: all 0.2s; }
  .admin-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
  .admin-input::placeholder { color: #94A3B8; }
  .admin-textarea { width: 100%; padding: 12px 14px; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem; background: white; color: #1E293B; min-height: 120px; resize: vertical; font-family: inherit; transition: all 0.2s; }
  .admin-textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
  .admin-textarea::placeholder { color: #94A3B8; }
  .admin-table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 12px 0; font-size: 0.85rem; }
  .admin-table th { color: #64748B; font-weight: 600; padding: 12px; text-align: left; border-bottom: 1px solid #E2E8F0; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .admin-table td { padding: 12px; border-bottom: 1px solid #F1F5F9; color: #1E293B; vertical-align: middle; }
  .admin-table tr:hover td { background: linear-gradient(90deg, rgba(124, 58, 237, 0.03) 0%, rgba(124, 58, 237, 0.08) 100%); }
  .admin-table tbody tr { transition: all 0.2s ease; }
  .admin-table tbody tr:hover { transform: translateX(2px); }
  
  .user-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .user-stat-card { background: linear-gradient(135deg, #fff 0%, #F8FAFC 100%); border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px; text-align: center; position: relative; overflow: hidden; }
  .user-stat-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; }
  .user-stat-card.total::before { background: linear-gradient(90deg, #6366F1, #8B5CF6); }
  .user-stat-card.today::before { background: linear-gradient(90deg, #10B981, #34D399); }
  .user-stat-card.active::before { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
  .user-stat-card .stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 0.9rem; }
  .user-stat-card.total .stat-icon { background: rgba(99, 102, 241, 0.1); color: #6366F1; }
  .user-stat-card.today .stat-icon { background: rgba(16, 185, 129, 0.1); color: #10B981; }
  .user-stat-card.active .stat-icon { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
  .user-stat-card .stat-value { font-size: 1.5rem; font-weight: 700; color: #1E293B; line-height: 1.2; }
  .user-stat-card .stat-label { font-size: 0.7rem; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  
  .user-search-box { position: relative; margin-bottom: 16px; }
  .user-search-box input { width: 100%; padding: 12px 16px 12px 40px; border: 2px solid #E2E8F0; border-radius: 10px; font-size: 0.9rem; transition: all 0.2s; background: #F8FAFC; }
  .user-search-box input:focus { outline: none; border-color: #8B5CF6; background: white; box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1); }
  .user-search-box i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; }
  
  .user-level-badge { display: inline-flex; align-items: center; gap: 4px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 2px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; }
  .user-level-badge i { font-size: 0.65rem; }
  
  .user-row-actions { display: flex; gap: 6px; }
  .user-row-actions button { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; border: none; cursor: pointer; }
  .user-row-actions .edit-btn { background: #EEF2FF; color: #6366F1; }
  .user-row-actions .edit-btn:hover { background: #6366F1; color: white; transform: scale(1.1); }
  .user-row-actions .delete-btn { background: #FEE2E2; color: #EF4444; }
  .user-row-actions .delete-btn:hover { background: #EF4444; color: white; transform: scale(1.1); }
  
  .user-coins-cell { display: flex; align-items: center; gap: 8px; }
  .user-coins-cell .coins-value { font-weight: 700; color: #F59E0B; font-size: 0.95rem; }
  .user-coins-cell .coins-edit-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: #FEF3C7; color: #D97706; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .user-coins-cell .coins-edit-btn:hover { background: #F59E0B; color: white; transform: scale(1.1); }
  
  .admin-table-scroll { max-height: 400px; overflow-y: auto; border-radius: 12px; border: 1px solid #E2E8F0; }
  .admin-table-scroll::-webkit-scrollbar { width: 6px; }
  .admin-table-scroll::-webkit-scrollbar-track { background: #F1F5F9; border-radius: 3px; }
  .admin-table-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
  .admin-table-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
  
  .empty-state-card { text-align: center; padding: 48px 24px; background: #F8FAFC; border-radius: 12px; border: 2px dashed #E2E8F0; }
  .empty-state-card i { font-size: 2.5rem; color: #CBD5E1; margin-bottom: 12px; display: block; }
  .empty-state-card p { color: #64748B; font-size: 0.9rem; margin: 0; }
  
  .user-pagination { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #E2E8F0; }
  .user-pagination-info { font-size: 0.8rem; color: #64748B; }
  .user-pagination-btns { display: flex; gap: 8px; }
  .user-pagination-btns button { padding: 8px 14px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; color: #64748B; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
  .user-pagination-btns button:hover:not(:disabled) { border-color: #8B5CF6; color: #8B5CF6; }
  .user-pagination-btns button:disabled { opacity: 0.5; cursor: not-allowed; }
  
  @media (max-width: 600px) {
    .user-stats-grid { grid-template-columns: 1fr; }
    .admin-table-scroll { max-height: 300px; }
  }
  .admin-table input { background: white; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; color: #1E293B; font-size: 0.85rem; }
  .admin-table input:focus { outline: none; border-color: var(--primary); }
  .admin-section-title { font-size: 0.9rem; font-weight: 600; color: #1E293B; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; }
  .admin-card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
  .admin-card:hover { border-color: var(--primary); }
  .form-label { display: block; font-size: 0.85rem; font-weight: 500; color: #64748B; margin-bottom: 8px; }
  .form-row { margin-bottom: 16px; }
  .switch { position: relative; display: inline-block; width: 48px; height: 26px; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .switch .slider { position: absolute; cursor: pointer; inset: 0; background: #CBD5E1; border-radius: 26px; transition: 0.3s; }
  .switch .slider:before { content: ""; position: absolute; height: 20px; width: 20px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
  .switch input:checked + .slider { background: var(--primary); }
  .switch input:checked + .slider:before { transform: translateX(22px); }
  .form-hint { font-size: 0.75rem; color: #94A3B8; margin-top: 6px; }
  .switch-wrapper { display: flex; flex-direction: column; gap: 8px; }
  @media (max-width: 480px) {
    .switch-wrapper { width: 100%; }
  }
  .admin-btn { padding: 10px 20px; border-radius: 10px; font-size: 0.875rem; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .admin-btn.primary { background: var(--primary); color: white; }
  .admin-btn.primary:hover { background: var(--primary-dark); box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3); transform: translateY(-1px); }
  .admin-btn.secondary { background: #F1F5F9; color: #64748B; }
  .admin-btn.secondary:hover { background: #E2E8F0; color: #1E293B; }
  .admin-btn.danger { background: #FEE2E2; color: #EF4444; }
  .admin-btn.danger:hover { background: #EF4444; color: white; }
  .admin-btn.small { padding: 6px 12px; font-size: 0.75rem; }
  .quick-add-form { background: #F8FAFC; border-radius: 12px; padding: 16px; border: 1px solid var(--primary-light); }
  .quick-add-row { display: flex; gap: 10px; align-items: center; }
  .quick-add-row input::placeholder { color: #94A3B8; }
  @media (max-width: 600px) { .quick-add-row { flex-wrap: wrap; } .quick-add-row input { width: 100%; flex: none; } }
  .quick-publish-form { background: #F0FDF4; border-radius: 12px; padding: 16px; border: 1px solid #86EFAC; margin-bottom: 16px; }
  .quick-publish-row { display: flex; gap: 10px; align-items: flex-start; }
  .quick-publish-row input::placeholder { color: #94A3B8; }
  .quick-publish-row textarea::placeholder { color: #94A3B8; }
  @media (max-width: 600px) { .quick-publish-row { flex-wrap: wrap; } .quick-publish-row input, .quick-publish-row textarea { width: 100%; flex: none; } }
  .admin-scroll { max-height: 400px; overflow-y: auto; border: 1px solid #E2E8F0; border-radius: 12px; background: white; }
  .admin-scroll::-webkit-scrollbar { width: 6px; }
  .admin-scroll::-webkit-scrollbar-track { background: transparent; }
  .admin-scroll::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 3px; }
  .admin-scroll::-webkit-scrollbar-thumb:hover { background: #94A3B8; }
  .uploads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding: 16px; }
  @media (max-width: 480px) {
    .uploads-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px; }
  }
  .user-pill { background: white; padding: 6px 14px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; }
  .title-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; color: white; font-size: 0.7rem; font-weight: bold; vertical-align: middle; margin-left: 6px; text-shadow: 0 1px 1px rgba(0,0,0,0.2); }
  .user-badge { background: #F1F5F9; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.75rem; }
  .user-row-meta { font-size: 0.75rem; color: #94A3B8; }
  .dice-stage { font-size: 5rem; color: var(--primary); margin: 20px 0; height: 80px; display: flex; align-items: center; justify-content: center; }
  .dice-result-anim { animation: shake 0.5s infinite; }
  @keyframes shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(10deg); } 50% { transform: rotate(0deg); } 75% { transform: rotate(-10deg); } 100% { transform: rotate(0deg); } }
  .bet-controls { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
  .bet-btn { padding: 15px; border-radius: 12px; font-weight: bold; font-size: 1.1rem; border: 2px solid transparent; cursor: pointer; transition: 0.2s; }
  .bet-btn.small { background: #E0F2FE; color: #0284C7; border-color: #BAE6FD; }
  .bet-btn.small:hover { background: #BAE6FD; }
  .bet-btn.big { background: #FEE2E2; color: #DC2626; border-color: #FECACA; }
  .bet-btn.big:hover { background: #FECACA; }
  .banner-tabs {display: flex;background: rgba(255,255,255,0.5);border-radius:12px;padding:4px;margin-bottom:12px;border:1px solid #E2E8F0; position:relative;}
  .banner-tab {flex:1;text-align:center;padding:8px;border-radius:8px;font-size:0.9rem;font-weight:800;cursor:pointer;color:var(--text-light);transition:0.2s;position:relative;overflow:hidden;}
  .banner-tab.active {background:white;color:var(--primary);box-shadow:0 2px 4px rgba(0,0,0,0.05);}
  .banner-tab.active.limited {color:#EF4444;}
  .btn.limited-btn {background: linear-gradient(45deg, #EF4444, #F59E0B);box-shadow: 0 4px 0 #B91C1C;border:none;}
  .btn.limited-btn:active {box-shadow: 0 0 0 #B91C1C;}
  .pool-info-tag {font-size: 0.7rem;background: rgba(0,0,0,0.05);padding: 2px 6px;border-radius: 4px;margin-left: 4px;vertical-align: middle;}
  .pool-item {padding:12px;border-radius:10px;cursor:pointer;transition:all 0.2s;background:white;border:2px solid #FECACA;display:flex;flex-direction:column;gap:4px;}
  .pool-item:hover {transform:translateY(-1px);box-shadow:0 2px 8px rgba(239,68,68,0.1);}
  .pool-item.active {background:linear-gradient(135deg,#EF4444,#F59E0B);border-color:transparent;color:white;}
  .pool-item.unavailable {opacity:0.6;background:#F3F4F6;border-color:#E5E7EB;}
  .pool-item.unavailable:hover {transform:none;box-shadow:none;}
  .pool-item-header {display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:0.95rem;}
  .pool-status {font-size:0.8rem;opacity:0.9;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:6px;}
  .pool-item.active .pool-status {background:rgba(255,255,255,0.25);}
  .pool-desc {font-size:0.8rem;opacity:0.8;line-height:1.3;}
  .auth-tabs { display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #E2E8F0; padding-bottom:10px; }
  .auth-tab { flex:1; padding:8px; cursor:pointer; font-weight:bold; color:var(--text-light); border-radius:8px; transition:0.2s; }
  .auth-tab.active { background:var(--bg-color); color:var(--primary); }
  .refresh-spin { animation: spin-once 0.8s ease-in-out; color: var(--primary) !important; }
  @keyframes spin-once { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .switch { position: relative; display: inline-block; width: 48px; height: 24px; vertical-align: middle; }
  .switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #CBD5E1; transition: .4s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
  input:checked + .slider { background-color: var(--secondary); }
  input:checked + .slider:before { transform: translateX(24px); }
  .title-list { display: grid; grid-template-columns: 1fr; gap: 8px; max-height: 300px; overflow-y: auto; margin-top: 10px; }
  .title-item { padding: 10px; border: 1px solid #E2E8F0; border-radius: 8px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
  .title-item:hover { background: #F8FAFC; border-color: var(--primary); }
  .title-item.active { background: #EFF6FF; border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
  .title-item.active i { color: var(--primary); }
  .title-text { font-weight: bold; color: var(--text-main); }
  .no-title-msg { text-align: center; color: #94A3B8; padding: 20px; font-size: 0.9rem; } 
  .form-row { margin-bottom: 15px; }
  .form-label { display: block; font-weight: bold; font-size: 0.9rem; color: var(--text-main); margin-bottom: 6px; }
  .form-hint { font-size: 0.75rem; color: var(--text-light); margin-top: 4px; }
  .skeleton { background: linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 37%, #E2E8F0 63%); background-size: 400% 100%; animation: skeleton-loading 1.4s ease infinite; border-radius: 8px; }
  @keyframes skeleton-loading { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
  .anim-shake { animation: shake-x 0.4s ease-in-out; }
  .anim-pop { animation: pop-scale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
  @keyframes shake-x { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  @keyframes pop-scale { 0% { transform: scale(0.95); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  @media (max-width: 480px) {
    .modal-content { width: 95%; padding: 16px; max-width: none; }
    .shop-grid { grid-template-columns: 1fr; }
    .grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; padding: 10px; }
    .actions { grid-template-columns: 1fr 1fr; gap: 8px; }
    #drawBtn { grid-column: 1 / -1; }
    .main-grid { grid-template-columns: 1fr; gap: 16px; }
    .header { flex-direction: row; gap: 12px; align-items: center; padding: 0 5px; max-width: 100%; }
    .logo-container { text-align: left; }
    .logo { font-size: 1.3rem; }
    .logo-subtitle { font-size: 0.75rem; margin-top: 2px; }
    .header-right { justify-content: flex-end; }
    .user-pill { font-size: 0.8rem; padding: 6px 12px 6px 8px; gap: 8px; margin: 0; flex-shrink: 0; flex-wrap: nowrap; white-space: nowrap; }
    .user-avatar { width: 28px; height: 28px; font-size: 0.8rem; flex-shrink: 0; }
    .user-info { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
    .user-name { font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; }
    .user-level-badge { font-size: 0.6rem; padding: 1px 4px; }
    .user-chevron { display: none; }
  }
  @media (max-width: 768px) { 
    .modal-content { max-width: 90%; } 
    .shop-grid { grid-template-columns: 1fr 1fr; } 
    .grid { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
    .admin-modal-content { max-width: 95%; max-height: 95vh; }
    .admin-modal-header { padding: 16px; }
    .admin-modal-header h3 { font-size: 1rem; }
    .admin-modal-body { padding: 16px; }
    .admin-tabs { flex-wrap: wrap; gap: 4px; padding: 4px; }
    .admin-tab { flex: 1 1 calc(50% - 4px); justify-content: center; padding: 10px 8px; font-size: 0.8rem; }
    .admin-tab i { display: none; }
    .admin-section-title { flex-direction: column; align-items: flex-start; gap: 10px; }
    .admin-scroll { max-height: 300px; }
    .admin-table { font-size: 0.75rem; }
    .admin-table th, .admin-table td { padding: 8px 4px; }
    .admin-table input { padding: 4px 6px; font-size: 0.75rem; }
    .form-row { flex-direction: column; gap: 16px !important; }
    #view-ann .form-row { gap: 12px; }
  }
  @media (max-width: 480px) {
    .admin-modal-content { border-radius: 12px; }
    .admin-tab { font-size: 0.75rem; padding: 8px 6px; }
    .admin-btn { width: 100%; justify-content: center; }
    .admin-btn.primary { order: -1; }
    #view-ann .form-row > div { width: 100%; }
    .switch { width: 100%; height: 36px; }
    .switch .slider { border-radius: 36px; }
    .switch .slider:before { width: 28px; height: 28px; }
    .switch input:checked + .slider:before { transform: translateX(28px); }
  }
  .upload-drop-zone { border: 2px dashed #C4B5FD; border-radius: 16px; padding: 30px 20px; text-align: center; background: #FAF5FF; cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; }
</style>
`;

export const PAGE_CSS = `
<style>
  .site-runtime-card { display: flex; align-items: center; gap: 16px; padding: 12px 18px; background: rgba(255,255,255,0.7); border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 16px; }
  .site-runtime-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; }
  .site-runtime-icon.time { background: #FEF3C7; color: #D97706; }
  .site-runtime-icon.users { background: #DBEAFE; color: #2563EB; }
  .site-runtime-icon.draws { background: #FEE2E2; color: #DC2626; }
  .site-runtime-label { font-size: 0.75rem; color: #64748B; font-weight: 500; }
  .site-runtime-time { font-size: 0.9rem; font-weight: 700; color: #1E293B; }
  @media (max-width: 480px) {
    .site-runtime-card { padding: 8px 14px; gap: 10px; }
    .site-runtime-icon { width: 24px; height: 24px; font-size: 0.65rem; }
    .site-runtime-label { font-size: 0.6rem; }
    .site-runtime-time { font-size: 0.75rem; }
  }
  @keyframes slideDown { from { transform: translate(-50%, -50px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
  .log-container { padding: 20px; text-align: left; }
  .log-header { font-size: 1rem; font-weight: 800; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; color: var(--primary); }
  .log-item { padding-left: 16px; border-left: 2px solid #E2E8F0; margin-bottom: 15px; position: relative; }
  .log-item::before { content: ''; position: absolute; left: -6px; top: 0; width: 10px; height: 10px; border-radius: 50%; background: var(--primary); border: 2px solid white; }
  .log-meta { font-size: 0.75rem; color: var(--text-light); margin-bottom: 4px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .log-ver { font-weight: bold; color: var(--text-main); background: #F1F5F9; padding: 2px 6px; border-radius: 4px; border: 1px solid transparent; }
  .log-ver.todo { background: #F3E8FF; color: #7E22CE; border-color: #D8B4FE; box-shadow: 0 0 5px rgba(168, 85, 247, 0.2); }
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
  .showcase-box { background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.55); border-radius: var(--radius); padding: 20px; box-shadow: var(--shadow); }
  .gacha-card { background: white; border-radius: var(--radius); border: 1px solid #E2E8F0; padding: 6px; box-shadow: var(--shadow); }
  .stage { position: relative; aspect-ratio: 3/4; width: 100%; background: #F8FAFC; border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; background-image: radial-gradient(#CBD5E1 1px, transparent 1px); background-size: 20px 20px; }
  .stage img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: 0.3s; }
  .stage img.show { opacity: 1; }
  .panel-container { display: flex; flex-direction: column; gap: 24px; }
  .header { width: 100%; max-width: 900px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding: 0 10px; }
  .logo-container { display: flex; flex-direction: column; }
  .logo { font-size: 1.6rem; font-weight: 900; color: var(--text-main); letter-spacing: -0.5px; line-height: 1.2; }
  .logo span { color: var(--primary); }
  .logo-subtitle { font-size: 0.85rem; color: var(--text-light); margin-top: 4px; font-weight: 500; }
  .header-right { display: flex; align-items: center; }
  .user-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; object-fit: cover; }
  .user-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
  .user-name { font-weight: 700; color: var(--text-main); }
  
  .user-chevron { font-size: 0.8rem; color: #94A3B8; margin-left: 4px; }
  .main-grid { width: 100%; max-width: 900px; display: grid; grid-template-columns: 1fr; gap: 24px; }
  @media(min-width: 768px) { .main-grid { grid-template-columns: 360px 1fr; align-items: start; } }
  .back-nav { margin-bottom: 20px; }
  .profile-header { text-align: center; margin-bottom: 30px; }
  .avatar-large { width: 100px; height: 100px; margin: 0 auto 15px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; color: white; box-shadow: 0 8px 20px rgba(59,130,246,0.3); object-fit: cover; }
  .exp-bar-container { background: white; padding: 15px; border-radius: 12px; border: 1px solid #E2E8F0; margin-bottom: 20px; }
  .exp-bar { height: 10px; background: #F1F5F9; border-radius: 5px; overflow: hidden; }
  .exp-bar-fill { height: 100%; background: linear-gradient(90deg, #3B82F6, #8B5CF6); width: 0%; transition: width 0.5s ease; }
  .cards-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .card-stat { padding: 8px; border-radius: 8px; text-align: center; }
  .card-stat-n { background: #F1F5F9; }
  .card-stat-r { background: #DBEAFE; }
  .card-stat-sr { background: #EDE9FE; }
  .card-stat-ssr { background: #FEF3C7; }
  .card-stat-ur { background: #FEE2E2; }
  .card-stat-label { font-size: 0.7rem; }
  .card-stat-label-n { color: #64748B; }
  .card-stat-label-r { color: #1E40AF; }
  .card-stat-label-sr { color: #5B21B6; }
  .card-stat-label-ssr { color: #92400E; }
  .card-stat-label-ur { color: #991B1B; }
  .card-stat-val { font-weight: bold; }
  .total-cards { text-align: center; margin-top: 10px; font-size: 0.8rem; color: #94A3B8; }
</style>
`;
