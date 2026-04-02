// =========================================
// 图库页模板 - 重写版（修复分页断裂 + 事件覆盖 + 图片显示问题）
// =========================================

import { NEUTRAL_CSS } from './components.js';

export function getLibraryPage(items, pager) {
  const LIBRARY_CSS = `
  <style>
    body { padding-top: 70px; height: 100vh; overflow: hidden; }
    .nav { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 100; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .virtual-scroll-container { position: relative; width: 100%; height: calc(100vh - 70px); overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .masonry-container { max-width: 1400px; margin: 0 auto; padding: 20px; column-count: 2; column-gap: 16px; }
    @media (min-width: 640px) { .masonry-container { column-count: 3; } }
    @media (min-width: 1024px) { .masonry-container { column-count: 4; } }
    @media (min-width: 1280px) { .masonry-container { column-count: 5; } }
    .item { break-inside: avoid; margin-bottom: 16px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); cursor: zoom-in; position: relative; }
    .item:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); border-color: var(--primary); z-index: 2; }
    .item img { width: 100%; height: auto; display: block; }
    .item-user { padding: 10px 12px; background: white; font-size: 0.85rem; color: var(--text-main); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; }
    .user-tag { font-weight: bold; color: #64748B; display: flex; align-items: center; gap: 6px; }
    #backToTop { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); opacity: 0; pointer-events: none; transition: 0.3s; z-index: 90; border: none; }
    #backToTop.show { opacity: 1; pointer-events: auto; }
    .modal { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 200; justify-content: center; align-items: center; }
    .modal.show { display: flex; }
    .modal-img { max-width: 90vw; max-height: 85vh; width: auto; height: auto; border-radius: 8px; }
    .modal-close-img { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.2rem; cursor: pointer; z-index: 210; }
  </style>
  `;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>图库</title>
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  ${NEUTRAL_CSS}
  ${LIBRARY_CSS}
</head>
<body>
  <nav class="nav">
    <div>
      <a href="/" class="btn secondary" style="padding: 8px 16px; font-size:0.9rem; border-radius:10px;">
        <i class="fas fa-arrow-left"></i> 返回
      </a>
    </div>
    <div style="font-weight:bold; color:var(--text-main);">图库</div>
    <div style="width: 60px;"></div>
  </nav>

  <div class="virtual-scroll-container" id="scrollContainer">
    <div class="masonry-container" id="masonryContainer">
      ${items.length === 0 ? '<div class="empty-state"><p>暂无图片</p></div>' : ''}
      ${items.map((item) => {
        const ts = item.ts ? new Date(item.ts).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '';
        return `
        <div class="item">
          <img src="${item.url}" loading="lazy" decoding="async" alt="${item.username || ''}" onclick="VirtualScroll.show('${item.url}')">
          <div class="item-user">
            <div class="user-tag"><i class="fas fa-user-circle"></i> ${item.username || ''}</div>
            <div style="font-size:0.7rem;color:#CBD5E1;">${ts}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>

  <button id="backToTop"><i class="fas fa-arrow-up"></i></button>
  <div id="imgModal" class="modal">
    <button class="modal-close-img" onclick="document.getElementById('imgModal').classList.remove('show')"><i class="fas fa-times"></i></button>
    <img id="bigImg" class="modal-img">
  </div>

  <script>
    const VirtualScroll = {
      allItems: ${JSON.stringify(items)},
      cursor: ${JSON.stringify(pager.cursor)},
      totalItems: ${pager.totalItems},
      pageSize: 24,
      isLoading: false,
      hasMore: ${pager.cursor !== null},

      init() {
        const c = document.getElementById('scrollContainer');
        c.addEventListener('scroll', () => {
          const b = document.getElementById('backToTop');
          b.classList.toggle('show', c.scrollTop > 300);
          if (this.hasMore && !this.isLoading && c.scrollTop + c.clientHeight >= c.scrollHeight - 300) {
            this.loadMore();
          }
        }, { passive: true });
      },

      async loadMore() {
        if (this.isLoading || !this.hasMore) return;
        this.isLoading = true;
        try {
          const url = this.cursor
            ? \`/api/library/items?cursor=\${this.cursor}&pageSize=\${this.pageSize}\`
            : \`/api/library/items?pageSize=\${this.pageSize}\`;
          const res = await fetch(url);
          const data = await res.json();
          if (data.pagination) {
            this.cursor = data.pagination.cursor;
            this.hasMore = data.pagination.hasMore;
            this.totalItems = data.pagination.totalItems;
          }
          if (data.items && data.items.length > 0) {
            const urls = new Set(this.allItems.map(i => i.url));
            const fresh = data.items.filter(i => !urls.has(i.url));
            if (fresh.length > 0) {
              this.allItems = this.allItems.concat(fresh);
              const mc = document.getElementById('masonryContainer');
              fresh.forEach(item => {
                const ts = item.ts ? new Date(item.ts).toLocaleDateString() : '';
                mc.insertAdjacentHTML('beforeend', \`
                  <div class="item">
                    <img src="\${item.url}" loading="lazy" decoding="async" onclick="VirtualScroll.show('\${item.url}')">
                    <div class="item-user">
                      <div class="user-tag"><i class="fas fa-user-circle"></i> \${item.username || ''}</div>
                      <div style="font-size:0.7rem;color:#CBD5E1;">\${ts}</div>
                    </div>
                  </div>\`);
              });
            }
          }
        } catch (e) {
          console.error('加载失败:', e);
        } finally {
          this.isLoading = false;
        }
      },

      show(url) {
        const m = document.getElementById('imgModal');
        document.getElementById('bigImg').src = url;
        m.classList.add('show');
      }
    };

    document.addEventListener('DOMContentLoaded', () => VirtualScroll.init());
  </script>
</body>
</html>
  `;
}
