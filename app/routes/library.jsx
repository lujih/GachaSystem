import { useLoaderData, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import GachaCard from '~/components/GachaCard';
import CardDetailDialog from '~/components/CardDetailDialog';
import { rarityBg, RARITY_ORDER } from '~/lib/rarity';

export async function loader({ request, context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { items: [], total: 0, page: 1, totalPages: 0, rarity: '', mode: 'all', rarityCounts: {} };
  }
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const rarity = url.searchParams.get('rarity');
  const mode = url.searchParams.get('mode') || 'all';
  const sort = url.searchParams.get('sort') || 'newest';
  const search = url.searchParams.get('search')?.trim();
  const period = url.searchParams.get('period') || 'all';
  const offset = (page - 1) * limit;

  // 获取当前登录用户（middleware 注入）
  const currentUser = context?.data?.currentUser || null;
  // "我的收藏" 模式必须验证 userId 与当前登录用户一致
  const isMine = mode === 'mine' && currentUser;
  const isBookmarks = mode === 'bookmarks' && currentUser;

  const baseSelect = 'SELECT g.id, g.url, g.user_id, g.username, g.rarity, g.source_name, g.created_at';
  let query = `${baseSelect} FROM gallery g`;
  let countQuery = 'SELECT COUNT(*) as total FROM gallery g';
  let rarityCountQuery = 'SELECT g.rarity, COUNT(*) as count FROM gallery g';
  const params = [];
  const countParams = [];
  const conds = [];

  if (isBookmarks) {
    query = 'SELECT g.id, g.url, g.user_id, g.username, g.rarity, g.source_name, g.created_at FROM gallery g INNER JOIN card_bookmarks b ON g.id = b.gallery_id AND b.user_id = ?';
    countQuery = 'SELECT COUNT(*) as total FROM gallery g INNER JOIN card_bookmarks b ON g.id = b.gallery_id AND b.user_id = ?';
    rarityCountQuery = 'SELECT g.rarity, COUNT(*) as count FROM gallery g INNER JOIN card_bookmarks b ON g.id = b.gallery_id AND b.user_id = ?';
    params.push(currentUser.id);
    countParams.push(currentUser.id);
  }
  if (rarity) { conds.push('g.rarity = ?'); params.push(rarity.toUpperCase()); countParams.push(rarity.toUpperCase()); }
  if (isMine) { conds.push('g.user_id = ?'); params.push(currentUser.id); countParams.push(currentUser.id); }
  if (search) { conds.push('g.username LIKE ?'); params.push(`%${search}%`); countParams.push(`%${search}%`); }
  if (period && period !== 'all') {
    const now = Date.now();
    const PERIOD_MS = { today: 86400000, week: 604800000, month: 2592000000 };
    const ms = PERIOD_MS[period];
    if (ms) { conds.push('g.created_at > ?'); params.push(now - ms); countParams.push(now - ms); }
  }
  if (conds.length) {
    query += ' WHERE ' + conds.join(' AND ');
    countQuery += ' WHERE ' + conds.join(' AND ');
    rarityCountQuery += ' WHERE ' + conds.join(' AND ');
  }

  const ORDER = { newest: 'g.created_at DESC', oldest: 'g.created_at ASC', rarity: "CASE g.rarity WHEN 'UR' THEN 1 WHEN 'SSR' THEN 2 WHEN 'SR' THEN 3 WHEN 'R' THEN 4 ELSE 5 END, g.created_at DESC" };
  const orderBy = ORDER[sort] || ORDER.newest;

  const globalRarityQuery = 'SELECT rarity, COUNT(*) as count FROM gallery GROUP BY rarity';

  const [itemsResult, countResult, rarityCountsResult, globalRarityResult] = await Promise.all([
    env.DB.prepare(`${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
    env.DB.prepare(countQuery).bind(...countParams).first(),
    env.DB.prepare(`${rarityCountQuery} GROUP BY rarity`).bind(...countParams).all(),
    env.DB.prepare(globalRarityQuery).all(),
  ]);

  const rarityCounts = {};
  if (rarityCountsResult.results) {
    rarityCountsResult.results.forEach(r => { rarityCounts[r.rarity] = r.count; });
  }
  const globalRarityCounts = {};
  let globalTotal = 0;
  if (globalRarityResult.results) {
    globalRarityResult.results.forEach(r => { globalRarityCounts[r.rarity] = r.count; globalTotal += r.count; });
  }

  return {
    items: itemsResult.results || [],
    total: countResult?.total || 0,
    page,
    totalPages: Math.ceil((countResult?.total || 0) / limit),
    rarity: rarity || '',
    mode: isBookmarks ? 'bookmarks' : isMine ? 'mine' : 'all',
    sort,
    search: search || '',
    period,
    rarityCounts,
    globalRarityCounts,
    globalTotal,
  };
}

export default function Library() {
  const { items, total, page, totalPages, rarity, mode, sort, search, period, rarityCounts, globalRarityCounts, globalTotal } = useLoaderData();
  const [, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState(null);
  const [searchInput, setSearchInput] = useState(search);
  const [likedIds, setLikedIds] = useState(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});
  const [tabMode, setTabMode] = useState(mode || 'all');

  const allCount = Object.values(rarityCounts).reduce((s, n) => s + n, 0);
  const isMine = tabMode === 'mine';
  const isBookmarks = tabMode === 'bookmarks';

  // 获取当前用户的点赞和书签列表
  useEffect(() => {
    if (!user) { setLikedIds(new Set()); setBookmarkedIds(new Set()); return; }
    Promise.all([
      api.getMyLikes().catch(() => ({ likedIds: [] })),
      api.getMyBookmarks().catch(() => ({ bookmarkedIds: [] })),
    ]).then(([likes, bookmarks]) => {
      setLikedIds(new Set(likes?.likedIds || []));
      setBookmarkedIds(new Set(bookmarks?.bookmarkedIds || []));
    });
  }, [user?.id]);

  // 获取当前页卡片的点赞数（边缘缓存）
  useEffect(() => {
    const ids = items.map(i => i.id).filter(Boolean);
    if (ids.length === 0) return;
    api.getLikeCounts(ids).then(res => {
      if (res?.counts) setLikeCounts(prev => ({ ...prev, ...res.counts }));
    }).catch(() => {});
  }, [items.map(i => i.id).join(',')]);

  // 切换 Tab 并重新加载数据
  function switchTab(newMode) {
    setTabMode(newMode);
    const p = new URLSearchParams();
    p.set('page', '1');
    p.set('sort', sort);
    if (newMode !== 'all') p.set('mode', newMode);
    if (rarity) p.set('rarity', rarity);
    window.location.search = p.toString();
  }

  // 构建 URL 参数（保持当前筛选状态）
  function buildParams(overrides = {}) {
    return {
      page: '1',
      ...(tabMode !== 'all' && { mode: tabMode }),
      ...(rarity && { rarity }),
      ...(search && { search }),
      ...(period && period !== 'all' && { period }),
      ...overrides,
    };
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearchParams(buildParams({ search: searchInput || undefined, sort, ...(rarity && { rarity }) }));
  }

  const handleLikeToggle = useCallback(async (galleryId) => {
    if (!user) return;
    const isLiked = likedIds.has(galleryId);
    try {
      const res = isLiked ? await api.unlikeCard(galleryId) : await api.likeCard(galleryId);
      setLikedIds(prev => {
        const next = new Set(prev);
        if (res.liked) next.add(galleryId); else next.delete(galleryId);
        return next;
      });
      setLikeCounts(prev => ({ ...prev, [galleryId]: res.likeCount }));
    } catch {}
  }, [user, likedIds]);

  const handleBookmarkToggle = useCallback(async (galleryId) => {
    if (!user) return;
    const isBookmarked = bookmarkedIds.has(galleryId);
    try {
      const res = isBookmarked ? await api.unbookmarkCard(galleryId) : await api.bookmarkCard(galleryId);
      setBookmarkedIds(prev => {
        const next = new Set(prev);
        if (res.bookmarked) next.add(galleryId); else next.delete(galleryId);
        return next;
      });
    } catch {}
  }, [user, bookmarkedIds]);

  return (
    <div className="min-h-screen bg-surface-bright bg-halftone relative">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <span className="material-symbols-outlined absolute top-20 left-10 text-primary-container/20 symbol-filled" style={{ fontSize: 64 }}>stars</span>
        <span className="material-symbols-outlined absolute bottom-40 right-20 text-tertiary-fixed/30 symbol-filled" style={{ fontSize: 96 }}>stars</span>
      </div>

      <Header activeTab="图鉴" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 md:px-margin pt-[72px] md:pt-[88px] pb-[100px] md:pb-12">
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 md:mb-6 gap-2 md:gap-sm pt-4 md:pt-md">
          <div>
            <h1 className="font-headline-lg md:text-display-lg text-display-lg text-on-surface drop-shadow-[2px_2px_0px_#dbbfc7] mb-1 md:mb-xs">
              {isBookmarks ? '我的书签' : isMine ? '我的收藏' : '全服图鉴'}
            </h1>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="inline-flex items-center gap-1 md:gap-xs bg-primary-container text-on-primary-container font-label-bold text-[10px] md:text-label-bold px-2 md:px-sm py-1 md:py-xs rounded-full border-2 border-on-primary-container shadow-[2px_2px_0px_0px_#770143]">
                <span className="material-symbols-outlined text-sm md:text-[18px] symbol-filled">style</span>
                {allCount} 张{isBookmarks ? '已书签' : isMine ? '已收集' : '总图鉴'}
              </div>
              {/* Tab 切换 */}
              <div className="flex gap-1 bg-surface-container p-0.5 rounded-full border border-outline-variant">
                <button
                  onClick={() => switchTab('all')}
                  className={`font-label-bold text-[10px] md:text-xs px-2.5 py-1 rounded-full transition-all ${!isMine && !isBookmarks ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  全服
                </button>
                {user && (
                  <>
                    <button
                      onClick={() => switchTab('mine')}
                      className={`font-label-bold text-[10px] md:text-xs px-2.5 py-1 rounded-full transition-all ${isMine ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      我的
                    </button>
                    <button
                      onClick={() => switchTab('bookmarks')}
                      className={`font-label-bold text-[10px] md:text-xs px-2.5 py-1 rounded-full transition-all ${isBookmarks ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      书签
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 稀有度统计 */}
          <div className="flex gap-1.5 md:gap-2">
            {RARITY_ORDER.map(r => {
              const my = rarityCounts[r] || 0;
              const global = globalRarityCounts[r] || 0;
              const pct = global > 0 ? Math.min(Math.round((my / global) * 100), 100) : 0;
              return (
                <div key={r} className="text-center min-w-[40px]">
                  <span className={`inline-block text-[9px] md:text-[10px] font-black text-white px-1.5 py-0.5 rounded ${rarityBg(r)}`}>{r}</span>
                  <p className="text-[10px] md:text-xs font-bold text-on-surface-variant mt-0.5">
                    {isMine ? `${my}/${global}` : my}
                  </p>
                  {isMine && global > 0 && (
                    <div className="w-full h-1 bg-surface-variant rounded-full mt-0.5 overflow-hidden">
                      <div className={`h-full ${rarityBg(r)} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 收集进度总览（我的收藏模式） */}
          {isMine && globalTotal > 0 && (
            <div className="mt-2 md:mt-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] md:text-xs text-on-surface-variant">收集进度</span>
                <span className="text-[10px] md:text-xs font-bold text-primary">{allCount} / {globalTotal}</span>
                <span className="text-[10px] md:text-xs text-outline">({globalTotal > 0 ? Math.round((allCount / globalTotal) * 100) : 0}%)</span>
              </div>
              <div className="w-full h-1.5 md:h-2 bg-surface-variant rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all" style={{ width: `${globalTotal > 0 ? Math.min((allCount / globalTotal) * 100, 100) : 0}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* 筛选栏 */}
        <section className="flex flex-col gap-2 md:gap-sm mb-4 md:mb-6">
          <div className="flex flex-wrap gap-2 md:gap-md items-center justify-between">
            {/* 稀有度筛选 */}
            <div className="flex flex-wrap gap-2 md:gap-md items-center">
              <div className="flex gap-1 md:gap-xs bg-surface-container p-1 md:p-xs rounded-full border-2 border-surface-variant shadow-[2px_2px_0px_0px_#dad9de]">
                {['', 'UR', 'SSR', 'SR', 'R', 'N'].map(r => (
                  <button
                    key={r || 'all'}
                    onClick={() => setSearchParams(buildParams(r ? { rarity: r, sort } : { sort }))}
                    className={`font-label-bold text-[10px] md:text-label-bold px-2 md:px-md py-1 md:py-xs rounded-full border-2 transition-all duration-200 hover:-translate-y-1 active:translate-y-0 ${
                      rarity === r
                        ? 'bg-tertiary text-on-tertiary border-on-tertiary-container shadow-[2px_2px_0px_0px_#473a00]'
                        : 'bg-surface-bright text-on-surface border-outline-variant hover:bg-surface-variant'
                    }`}
                  >
                    {r || '全部'}
                  </button>
                ))}
              </div>
              {rarity && (
                <span className="text-xs text-on-surface-variant">
                  {total} 张
                </span>
              )}
            </div>
            {/* 排序 */}
            <select
              value={sort}
              onChange={e => setSearchParams(buildParams({ sort: e.target.value, ...(rarity && { rarity }) }))}
              className="text-xs font-label-bold bg-surface-container text-on-surface border-2 border-outline-variant rounded-full px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="newest">最新获得</option>
              <option value="oldest">最早获得</option>
              <option value="rarity">稀有度优先</option>
              <option value="hot">最热门</option>
            </select>
          </div>
          {/* 搜索 + 时间筛选 */}
          <div className="flex flex-wrap gap-2 items-center">
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="搜索用户名..."
                className="text-xs bg-surface-container text-on-surface border-2 border-outline-variant rounded-full px-3 py-1.5 outline-none w-32 md:w-40 focus:border-primary transition-colors"
              />
              <button type="submit" className="text-xs bg-surface-container text-on-surface border-2 border-outline-variant rounded-full px-2.5 py-1.5 hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-sm">search</span>
              </button>
              {search && (
                <button type="button" onClick={() => { setSearchInput(''); setSearchParams(buildParams({ sort, ...(rarity && { rarity }) })); }} className="text-xs text-on-surface-variant hover:text-on-surface">
                  ✕
                </button>
              )}
            </form>
            <select
              value={period}
              onChange={e => setSearchParams(buildParams({ period: e.target.value, sort, ...(rarity && { rarity }) }))}
              className="text-xs font-label-bold bg-surface-container text-on-surface border-2 border-outline-variant rounded-full px-3 py-1.5 outline-none cursor-pointer"
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="week">本周</option>
              <option value="month">本月</option>
            </select>
          </div>
          {rarity && (
            <span className="text-xs text-on-surface-variant">
              筛选 {rarity}：{total} 张
            </span>
          )}
        </section>

        {/* 卡片网格 */}
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-block bg-surface-container-low rounded-2xl border-2 border-outline-variant p-8 shadow-[2px_2px_0px_0px_rgba(136,113,120,0.1)]">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">style</span>
              <p className="text-sm text-on-surface-variant font-medium">{rarity ? `暂无 ${rarity} 卡片` : '暂无收藏'}</p>
              <p className="text-xs text-on-surface-variant/60 mt-1">去抽卡获取你的第一张卡片吧！</p>
              <a href="/" className="inline-block mt-4 bg-primary text-on-primary font-button-text text-xs px-5 py-2 rounded-full border-2 border-on-primary-container shadow-[2px_2px_0px_0px_#770143] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all no-underline">
                去抽卡
              </a>
            </div>
          </div>
        ) : (
          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-md">
            {items.map(item => (
              <GachaCard
                key={item.id}
                card={{
                  id: item.id,
                  rarity: item.rarity || 'N',
                  imageUrl: item.url,
                  name: item.source_name || item.username || '未知来源',
                  likeCount: likeCounts[item.id] ?? (item.like_count || 0),
                  isLiked: likedIds.has(item.id),
                  isBookmarked: bookmarkedIds.has(item.id),
                }}
                onClick={() => setSelectedCard({
                  rarity: item.rarity || 'N',
                  imageUrl: item.url,
                  name: item.source_name || item.username || '未知来源',
                  time: item.created_at,
                })}
                onLikeToggle={handleLikeToggle}
                onBookmarkToggle={handleBookmarkToggle}
              />
            ))}
          </section>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-6 md:mt-xl flex justify-center items-center gap-3 pb-6 md:pb-xl">
            <button
              onClick={() => setSearchParams(buildParams({ page: String(page - 1), sort, ...(rarity && { rarity }) }))}
              disabled={page <= 1}
              className="font-button-text text-xs md:text-sm px-4 py-2 rounded-full border-2 border-outline-variant bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-variant active:bg-surface-container-high transition-colors"
            >
              上一页
            </button>
            <span className="text-xs text-on-surface-variant font-label-bold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setSearchParams(buildParams({ page: String(page + 1), sort, ...(rarity && { rarity }) }))}
              disabled={page >= totalPages}
              className="font-button-text text-xs md:text-sm px-4 py-2 rounded-full border-2 border-outline-variant bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-variant active:bg-surface-container-high transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </main>

      <BottomNav activeTab="图鉴" />

      {selectedCard && (
        <CardDetailDialog
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
