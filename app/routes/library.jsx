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

  // 非"我的"模式下，globalRarityCounts 就是 rarityCounts，跳过额外查询
  const queries = [
    env.DB.prepare(`${query} ORDER BY ${orderBy} LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
    env.DB.prepare(countQuery).bind(...countParams).first(),
    env.DB.prepare(`${rarityCountQuery} GROUP BY rarity`).bind(...countParams).all(),
  ];
  if (isMine) queries.push(env.DB.prepare('SELECT rarity, COUNT(*) as count FROM gallery GROUP BY rarity').all());

  const [itemsResult, countResult, rarityCountsResult, globalRarityResult] = await Promise.all(queries);

  const rarityCounts = {};
  if (rarityCountsResult.results) {
    rarityCountsResult.results.forEach(r => { rarityCounts[r.rarity] = r.count; });
  }
  const globalRarityCounts = isMine ? {} : { ...rarityCounts };
  let globalTotal = isMine ? 0 : Object.values(rarityCounts).reduce((s, n) => s + n, 0);
  if (isMine && globalRarityResult?.results) {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [selectedCard, setSelectedCard] = useState(null);
  const [searchInput, setSearchInput] = useState(search);
  const [likedIds, setLikedIds] = useState(new Set());
  const [bookmarkedIds, setBookmarkedIds] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});

  const allCount = Object.values(rarityCounts).reduce((s, n) => s + n, 0);
  const isMine = mode === 'mine';
  const isBookmarks = mode === 'bookmarks';

  // 获取当前用户的点赞和书签列表（合并请求）
  useEffect(() => {
    if (!user) { setLikedIds(new Set()); setBookmarkedIds(new Set()); return; }
    api.getMyInteractions().then(res => {
      setLikedIds(new Set(res?.likedIds || []));
      setBookmarkedIds(new Set(res?.bookmarkedIds || []));
    }).catch(() => {});
  }, [user?.id]);

  // 获取当前页卡片的点赞数（边缘缓存）
  const itemIds = items.map(i => i.id);
  useEffect(() => {
    const ids = itemIds.filter(Boolean);
    if (ids.length === 0) return;
    api.getLikeCounts(ids).then(res => {
      if (res?.counts) setLikeCounts(prev => ({ ...prev, ...res.counts }));
    }).catch(() => {});
  }, [itemIds.join(',')]);

  // 构建 URL 参数：以当前筛选为基础，overrides 覆盖特定字段
  function buildParams(overrides = {}) {
    const base = {};
    if (mode && mode !== 'all') base.mode = mode;
    if (rarity) base.rarity = rarity;
    if (search) base.search = search;
    if (period && period !== 'all') base.period = period;
    return { page: '1', ...base, ...overrides };
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
        {/* 标题 + Tab 切换 */}
        <section className="pt-4 md:pt-md mb-4 md:mb-6">
          <h1 className="font-headline-lg md:text-display-lg text-display-lg text-on-surface drop-shadow-[2px_2px_0px_#dbbfc7] mb-3">
            {isBookmarks ? '我的书签' : isMine ? '我的收藏' : '全服图鉴'}
          </h1>
          {/* Tab 切换 — 醒目 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1 bg-surface-container p-1 rounded-full border-2 border-outline-variant shadow-[2px_2px_0px_0px_#dad9de]">
              {[
                { key: 'all', label: '全服', icon: 'public' },
                ...(user ? [
                  { key: 'mine', label: '我的', icon: 'person' },
                  { key: 'bookmarks', label: '书签', icon: 'bookmark' },
                ] : []),
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => {
                    const p = buildParams({ sort });
                    if (t.key === 'all') delete p.mode; else p.mode = t.key;
                    setSearchParams(p);
                  }}
                  className={`flex items-center gap-1 font-label-bold text-xs md:text-sm px-3 md:px-4 py-1.5 rounded-full transition-all ${
                    mode === t.key || (t.key === 'all' && !isMine && !isBookmarks)
                      ? 'bg-primary text-on-primary shadow-[2px_2px_0px_0px_#770143]'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="inline-flex items-center gap-1 bg-primary-container text-on-primary-container font-label-bold text-xs md:text-sm px-3 py-1.5 rounded-full border-2 border-on-primary-container shadow-[2px_2px_0px_0px_#770143]">
              <span className="material-symbols-outlined text-sm symbol-filled">style</span>
              {allCount}
            </div>
          </div>
          {/* 稀有度统计条 */}
          <div className="flex gap-2 md:gap-3 flex-wrap">
            {RARITY_ORDER.map(r => {
              const my = rarityCounts[r] || 0;
              const global = globalRarityCounts[r] || 0;
              const pct = global > 0 ? Math.min(Math.round((my / global) * 100), 100) : 0;
              return (
                <div key={r} className="flex items-center gap-1.5">
                  <span className={`inline-block text-[10px] font-black text-white px-1.5 py-0.5 rounded ${rarityBg(r)}`}>{r}</span>
                  <span className="text-xs font-bold text-on-surface-variant">
                    {isMine ? `${my}/${global}` : my}
                  </span>
                  {isMine && global > 0 && (
                    <div className="w-12 h-1.5 bg-surface-variant rounded-full overflow-hidden">
                      <div className={`h-full ${rarityBg(r)} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* 收集进度条（我的收藏模式） */}
          {isMine && globalTotal > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-on-surface-variant">收集进度</span>
                <span className="text-xs font-bold text-primary">{allCount} / {globalTotal}</span>
                <span className="text-xs text-outline">({Math.round((allCount / globalTotal) * 100)}%)</span>
              </div>
              <div className="w-full h-2 bg-surface-variant rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all" style={{ width: `${Math.min((allCount / globalTotal) * 100, 100)}%` }} />
              </div>
            </div>
          )}
        </section>

        {/* 筛选栏 — 一行紧凑布局 */}
        <section className="flex flex-wrap items-center gap-2 mb-4 md:mb-6">
          {/* 稀有度筛选 */}
          <div className="flex gap-0.5 bg-surface-container p-0.5 rounded-full border border-outline-variant">
            {['', 'UR', 'SSR', 'SR', 'R', 'N'].map(r => (
              <button
                key={r || 'all'}
                onClick={() => {
                  const p = buildParams({ sort });
                  if (r) p.rarity = r; else delete p.rarity;
                  setSearchParams(p);
                }}
                className={`text-[10px] md:text-xs font-label-bold px-2 py-1 rounded-full transition-all ${
                  rarity === r
                    ? 'bg-tertiary text-on-tertiary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {r || '全部'}
              </button>
            ))}
          </div>
          {/* 排序 */}
          <select
            value={sort}
            onChange={e => setSearchParams(buildParams({ sort: e.target.value, ...(rarity && { rarity }) }))}
            className="text-xs font-label-bold bg-surface-container text-on-surface border border-outline-variant rounded-full px-3 py-1 outline-none cursor-pointer"
          >
            <option value="newest">最新</option>
            <option value="oldest">最早</option>
            <option value="rarity">稀有度</option>
          </select>
          {/* 时间 */}
          <select
            value={period}
            onChange={e => setSearchParams(buildParams({ period: e.target.value, sort, ...(rarity && { rarity }) }))}
            className="text-xs font-label-bold bg-surface-container text-on-surface border border-outline-variant rounded-full px-3 py-1 outline-none cursor-pointer"
          >
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
          {/* 搜索 */}
          <form onSubmit={handleSearch} className="flex items-center gap-1 ml-auto">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="搜索用户..."
              className="text-xs bg-surface-container text-on-surface border border-outline-variant rounded-full px-3 py-1 outline-none w-28 md:w-40 focus:border-primary transition-colors"
            />
            <button type="submit" className="text-xs bg-surface-container text-on-surface border border-outline-variant rounded-full px-2 py-1 hover:bg-surface-variant transition-colors">
              <span className="material-symbols-outlined text-sm">search</span>
            </button>
            {search && (
              <button type="button" onClick={() => { setSearchInput(''); setSearchParams(buildParams({ sort, ...(rarity && { rarity }) })); }} className="text-xs text-on-surface-variant hover:text-on-surface px-1">
                ✕
              </button>
            )}
          </form>
          {/* 活动筛选指示 */}
          {(rarity || search || period !== 'all') && (
            <div className="w-full flex items-center gap-2 text-[10px] md:text-xs text-on-surface-variant">
              {rarity && <span className="bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full">{rarity} · {total} 张</span>}
              {search && <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full">"{search}"</span>}
              {period !== 'all' && <span className="bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full">{{ today: '今天', week: '本周', month: '本月' }[period]}</span>}
            </div>
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
          <div className="mt-6 md:mt-xl flex justify-center items-center gap-1.5 md:gap-2 pb-6 md:pb-xl">
            <button
              onClick={() => setSearchParams(buildParams({ page: String(page - 1), sort, ...(rarity && { rarity }) }))}
              disabled={page <= 1}
              className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full border border-outline-variant bg-surface-container text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p;
              if (totalPages <= 7) p = i + 1;
              else if (page <= 4) p = i + 1;
              else if (page >= totalPages - 3) p = totalPages - 6 + i;
              else p = page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setSearchParams(buildParams({ page: String(p), sort, ...(rarity && { rarity }) }))}
                  className={`w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full text-xs font-label-bold transition-all ${
                    p === page
                      ? 'bg-primary text-on-primary shadow-[2px_2px_0px_0px_#770143]'
                      : 'border border-outline-variant bg-surface-container text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setSearchParams(buildParams({ page: String(page + 1), sort, ...(rarity && { rarity }) }))}
              disabled={page >= totalPages}
              className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center rounded-full border border-outline-variant bg-surface-container text-on-surface disabled:opacity-30 disabled:cursor-not-allowed hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
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
