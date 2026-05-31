import { useLoaderData, useSearchParams } from '@remix-run/react';
import { useState } from 'react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import GachaCard from '~/components/GachaCard';
import CardDetailDialog from '~/components/CardDetailDialog';
import { rarityBg, RARITY_ORDER } from '~/lib/rarity';

export async function loader({ request, context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { items: [], total: 0, page: 1, totalPages: 0, rarity: '', rarityCounts: {} };
  }
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const rarity = url.searchParams.get('rarity');
  const offset = (page - 1) * limit;

  let query = 'SELECT id, url, user_id, username, rarity, created_at FROM gallery';
  let countQuery = 'SELECT COUNT(*) as total FROM gallery';
  const params = [];
  const countParams = [];

  if (rarity) {
    query += ' WHERE rarity = ?';
    countQuery += ' WHERE rarity = ?';
    params.push(rarity.toUpperCase());
    countParams.push(rarity.toUpperCase());
  }

  const [itemsResult, countResult, rarityCountsResult] = await Promise.all([
    env.DB.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
    env.DB.prepare(countQuery).bind(...countParams).first(),
    env.DB.prepare('SELECT rarity, COUNT(*) as count FROM gallery GROUP BY rarity').all(),
  ]);

  const rarityCounts = {};
  if (rarityCountsResult.results) {
    rarityCountsResult.results.forEach(r => { rarityCounts[r.rarity] = r.count; });
  }

  return {
    items: itemsResult.results || [],
    total: countResult?.total || 0,
    page,
    totalPages: Math.ceil((countResult?.total || 0) / limit),
    rarity: rarity || '',
    rarityCounts,
  };
}

export default function Library() {
  const { items, total, page, totalPages, rarity, rarityCounts } = useLoaderData();
  const [, setSearchParams] = useSearchParams();
  const [selectedCard, setSelectedCard] = useState(null);

  const allCount = Object.values(rarityCounts).reduce((s, n) => s + n, 0);

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
              我的收藏
            </h1>
            <div className="inline-flex items-center gap-1 md:gap-xs bg-primary-container text-on-primary-container font-label-bold text-[10px] md:text-label-bold px-2 md:px-sm py-1 md:py-xs rounded-full border-2 border-on-primary-container shadow-[2px_2px_0px_0px_#770143]">
              <span className="material-symbols-outlined text-sm md:text-[18px] symbol-filled">style</span>
              {allCount} 张已收集
            </div>
          </div>

          {/* 稀有度统计 */}
          <div className="flex gap-1.5 md:gap-2">
            {RARITY_ORDER.map(r => (
              <div key={r} className="text-center">
                <span className={`inline-block text-[9px] md:text-[10px] font-black text-white px-1.5 py-0.5 rounded ${rarityBg(r)}`}>{r}</span>
                <p className="text-[10px] md:text-xs font-bold text-on-surface-variant mt-0.5">{rarityCounts[r] || 0}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 筛选栏 */}
        <section className="flex flex-col gap-2 md:gap-sm mb-4 md:mb-6">
          <h2 className="font-label-bold text-[10px] md:text-label-bold text-outline uppercase tracking-widest pl-1 md:pl-xs">按稀有度筛选</h2>
          <div className="flex flex-wrap gap-2 md:gap-md items-center">
            <div className="flex gap-1 md:gap-xs bg-surface-container p-1 md:p-xs rounded-full border-2 border-surface-variant shadow-[2px_2px_0px_0px_#dad9de]">
              {['', 'UR', 'SSR', 'SR', 'R', 'N'].map(r => (
                <button
                  key={r || 'all'}
                  onClick={() => setSearchParams(r ? { rarity: r, page: '1' } : { page: '1' })}
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
                筛选 {rarity}：{total} 张
              </span>
            )}
          </div>
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
                  rarity: item.rarity || 'N',
                  imageUrl: item.url,
                  name: item.username || '匿名',
                }}
                onClick={() => setSelectedCard({
                  rarity: item.rarity || 'N',
                  imageUrl: item.url,
                  name: item.username || '匿名',
                  time: item.created_at,
                })}
              />
            ))}
          </section>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="mt-6 md:mt-xl flex justify-center items-center gap-3 pb-6 md:pb-xl">
            <button
              onClick={() => setSearchParams({ page: String(page - 1), ...(rarity && { rarity }) })}
              disabled={page <= 1}
              className="font-button-text text-xs md:text-sm px-4 py-2 rounded-full border-2 border-outline-variant bg-surface-container text-on-surface disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-variant active:bg-surface-container-high transition-colors"
            >
              上一页
            </button>
            <span className="text-xs text-on-surface-variant font-label-bold">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setSearchParams({ page: String(page + 1), ...(rarity && { rarity }) })}
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
