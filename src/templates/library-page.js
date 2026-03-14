// =========================================
// 图库页模板
// =========================================

import { NEUTRAL_CSS } from './components.js';

export function getLibraryPage(items, pager) {
  const LIBRARY_CSS = `
  <style>
    body { padding-top: 70px; height: 100vh; overflow: hidden; }
    .nav { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: rgba(255,255,255,0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(0,0,0,0.05); z-index: 100; padding: 0 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .virtual-scroll-container { position: relative; width: 100%; height: calc(100vh - 70px); overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .virtual-scroll-content { position: relative; width: 100%; }
    .masonry-container { max-width: 1400px; margin: 0 auto; padding: 20px; column-count: 2; column-gap: 16px; }
    @media (min-width: 640px) { .masonry-container { column-count: 3; } }
    @media (min-width: 1024px) { .masonry-container { column-count: 4; } }
    @media (min-width: 1280px) { .masonry-container { column-count: 5; } }
    .item { break-inside: avoid; margin-bottom: 16px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 2px 5px rgba(0,0,0,0.03); transition: transform 0.3s ease, box-shadow 0.3s ease; cursor: zoom-in; position: relative; opacity: 0; animation: fadeIn 0.4s ease forwards; }
    @keyframes fadeIn { to { opacity: 1; } }
    .item:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); border-color: var(--primary); z-index: 2; }
    .img-wrapper { width: 100%; min-height: 120px; background: linear-gradient(110deg, #f0f0f0 8%, #e8e8e8 18%, #f0f0f0 33%); background-size: 200% 100%; animation: shimmer 1.5s infinite linear; position: relative; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
    .img-wrapper.loaded { background: transparent; animation: none; min-height: 0; }
    .item img { width: 100%; height: auto; display: block; opacity: 0; transition: opacity 0.3s ease; }
    .item img.loaded { opacity: 1; }
    .item-user { padding: 10px 12px; background: white; font-size: 0.85rem; color: var(--text-main); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F1F5F9; }
    .user-tag { font-weight: bold; color: #64748B; display: flex; align-items: center; gap: 6px; }
    #backToTop { position: fixed; bottom: 30px; right: 30px; width: 50px; height: 50px; border-radius: 50%; background: var(--primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; cursor: pointer; box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4); opacity: 0; pointer-events: none; transition: 0.3s; z-index: 90; border: none; }
    #backToTop.show { opacity: 1; pointer-events: auto; }
    #backToTop:active { transform: scale(0.95); }
    .empty-state { text-align: center; padding: 100px 20px; color: #94A3B8; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; }
    .empty-state i { font-size: 4rem; margin-bottom: 20px; color: #E2E8F0; }
.modal-img { max-width: 90vw; max-height: 85vh; width: auto; height: auto; border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); animation: imgZoomIn 0.2s ease; display: block; }
    @keyframes imgZoomIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .modal-close-img { position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; font-size: 1.2rem; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
    .modal-close-img:hover { background: rgba(239,68,68,0.9); }
  </style>
  `;

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>图库 - 无限滚动</title>
  <link rel="stylesheet" href="https://cdn.bootcdn.net/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  ${NEUTRAL_CSS}
  ${LIBRARY_CSS}
</head>
<body>
  <nav class="nav">
    <div>
      <a href="/" class="btn secondary" style="padding: 8px 16px; font-size:0.9rem; border-radius:10px;">
        <i class="fas fa-arrow-left"></i> <span style="display:none; display:inline-block @media(min-width:400px);">返回</span>
      </a>
    </div>
    <div style="font-weight:bold; color:var(--text-main);">图库</div>
    <div style="width: 60px;"></div>
  </nav>

  <div class="virtual-scroll-container" id="scrollContainer">
    <div class="virtual-scroll-content" id="scrollContent">
      <div class="masonry-container" id="masonryContainer">
        ${items.length === 0 ? `
          <div class="empty-state">
            <i class="fas fa-images"></i>
            <h3>暂无图片</h3>
            <p>快去首页抽取卡片吧！</p>
          </div>
        ` : ''}
        
        <!-- 修复点：onclick="VirtualScroll.show(...)" -->
        ${items.map((item, index) => `
          <div class="item" data-index="${index}" onclick="VirtualScroll.show('${item.url}')" style="opacity:1">
            <div class="img-wrapper">
               <img src="${item.url}" loading="lazy" decoding="async" onload="this.classList.add('loaded'); this.parentElement.classList.add('loaded')" onerror="this.src='https://img-blog.csdnimg.cn/img_convert/083d1f361962735e55265cb38868d583.gif'; this.onerror=null;" alt="Image by ${item.username}">
            </div>
            <div class="item-user">
              <div class="user-tag"><i class="fas fa-user-circle"></i> ${item.username}</div>
              <div style="font-size:0.7rem; color:#CBD5E1;">${new Date(item.ts).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })}</div>
            </div>
          </div>
        `).join('')}
        

      </div>
    </div>
  </div>

  <button id="backToTop" onclick="document.getElementById('scrollContainer').scrollTo({top: 0, behavior: 'smooth'})">
    <i class="fas fa-arrow-up"></i>
  </button>

  <div id="imgModal" class="modal" onclick="if(event.target === this) this.classList.remove('show')">
    <button class="modal-close-img" onclick="document.getElementById('imgModal').classList.remove('show')"><i class="fas fa-times"></i></button>
    <img id="bigImg" class="modal-img" alt="预览" onload="this.classList.add('loaded')">
  </div>

  <script>
    const VirtualScroll = {
      currentPage: ${pager.currentPage},
      totalPages: ${pager.totalPages},
      totalItems: ${pager.totalItems},
      allItems: ${JSON.stringify(items)},
      
      pageSize: 24,
      isLoading: false,
      lastRenderedIndex: -1, 

      init() {
        this.setupImageLazyLoad(); 
        this.lastRenderedIndex = this.allItems.length - 1; 
        this.setupBackToTop();
        
        if (this.currentPage < this.totalPages) {
          this.setupInfiniteScroll();
        }
      },
      
      renderNewItems() {
        const masonryContainer = document.getElementById('masonryContainer');
        
        for (let i = this.lastRenderedIndex + 1; i < this.allItems.length; i++) {
            const item = this.allItems[i];
            if (!item) continue;

            const itemElement = this.createItemElement(item, i);
            masonryContainer.appendChild(itemElement);
        }
        this.lastRenderedIndex = this.allItems.length - 1;
      },
      
      createItemElement(item, index) {
        const div = document.createElement('div');
        div.className = 'item';
        div.style.animationDelay = \`\${Math.min(index * 0.03, 0.5)}s\`;
        div.dataset.index = index;
        div.onclick = () => this.show(item.url);
        
        const imgWrapper = document.createElement('div');
        imgWrapper.className = 'img-wrapper';
        
        const img = document.createElement('img');
        img.src = item.url; 
        img.loading = "lazy";
        img.decoding = "async";
        img.alt = 'Image by ' + (item.username || 'Unknown');
        img.onload = () => { img.classList.add('loaded'); imgWrapper.classList.add('loaded'); };
        img.onerror = () => { 
          img.src = 'https://img-blog.csdnimg.cn/img_convert/083d1f361962735e55265cb38868d583.gif';
          img.onerror = null;
        };
        imgWrapper.appendChild(img);
        
        const itemUser = document.createElement('div');
        itemUser.className = 'item-user';
        
        const userTag = document.createElement('div');
        userTag.className = 'user-tag';
        userTag.innerHTML = '<i class="fas fa-user-circle"></i> ' + escapeHtml(item.username || 'Unknown');
        
        const dateDiv = document.createElement('div');
        dateDiv.style.fontSize = '0.7rem';
        dateDiv.style.color = '#CBD5E1';
        dateDiv.textContent = item.ts ? new Date(item.ts).toLocaleDateString() : '';
        
        itemUser.appendChild(userTag);
        itemUser.appendChild(dateDiv);
        
        div.appendChild(imgWrapper);
        div.appendChild(itemUser);
        
        return div;
      },
      
      setupInfiniteScroll() {
        const scrollContainer = document.getElementById('scrollContainer');
        
        // 使用滚动事件监听代替 IntersectionObserver
        const handleScroll = () => {
          if (this.isLoading || this.currentPage >= this.totalPages) return;
          
          const scrollTop = scrollContainer.scrollTop;
          const scrollHeight = scrollContainer.scrollHeight;
          const clientHeight = scrollContainer.clientHeight;
          
          // 距离底部 300px 时触发加载
          if (scrollTop + clientHeight >= scrollHeight - 300) {
            this.loadMore();
          }
        };
        
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        this.scrollHandler = handleScroll;
      },
      
      async loadMore() {
        if (this.isLoading || this.currentPage >= this.totalPages) return;
        this.isLoading = true;
        
        const nextPage = this.currentPage + 1;
        
        try {
          const response = await fetch(\`/api/library/items?page=\${nextPage}&pageSize=\${this.pageSize}\`);
          if (!response.ok) {
            throw new Error(\`HTTP error! status: \${response.status}\`);
          }
          const data = await response.json();
          
          // 更新总页数（后端可能重新计算）
          if (data.pagination) {
            this.totalPages = data.pagination.totalPages;
            this.totalItems = data.pagination.totalItems;
          }
          
          if (data.items && data.items.length > 0) {
            // 防止重复添加（根据 URL 去重）
            const existingUrls = new Set(this.allItems.map(item => item.url));
            const newItems = data.items.filter(item => !existingUrls.has(item.url));
            
            if (newItems.length > 0) {
              this.allItems = this.allItems.concat(newItems);
              this.currentPage = data.pagination ? data.pagination.currentPage : nextPage;
              this.renderNewItems();
            } else if (this.currentPage < this.totalPages) {
              // 如果没有新数据但还有下一页，尝试继续加载
              this.currentPage = nextPage;
              if (this.currentPage < this.totalPages) {
                setTimeout(() => this.loadMore(), 100);
              }
            }
          } else {
             this.currentPage = this.totalPages; 
          }
        } catch (error) {
          console.error('加载更多失败:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      setupBackToTop() {
        const btn = document.getElementById('backToTop');
        const container = document.getElementById('scrollContainer');
        container.onscroll = () => {
             if (container.scrollTop > 300) btn.classList.add('show');
             else btn.classList.remove('show');
        };
      },
      
      setupImageLazyLoad() {
        // 图片已经使用 loading="lazy"，这里可以添加额外的懒加载逻辑
        // 例如，观察图片进入视口时加载高清版本
      },
      
      show(url) {
        const modal = document.getElementById('imgModal');
        const img = document.getElementById('bigImg');
        img.classList.remove('loaded');
        img.style.opacity = '0';
        img.onload = () => { img.style.opacity = '1'; };
        img.src = url;
        modal.classList.add('show');
      }
    };
    
    document.addEventListener("DOMContentLoaded", () => {
      VirtualScroll.init();
    });
  </script>
</body>
</html>
  `;
}