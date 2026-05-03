import { useLoaderData, useSearchParams } from '@remix-run/react';
import Header from '~/components/Header';
import BottomNav from '~/components/BottomNav';
import GachaCard from '~/components/GachaCard';

export async function loader({ request, context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { items: [], total: 0, page: 1, totalPages: 0, rarity: '' };
  }
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;
  const rarity = url.searchParams.get('rarity');
  const offset = (page - 1) * limit;

  let query = 'SELECT id, url, user_id, username, created_at FROM gallery';
  let countQuery = 'SELECT COUNT(*) as total FROM gallery';
  const params = [];
  const countParams = [];

  if (rarity) {
    query += ' WHERE rarity = ?';
    countQuery += ' WHERE rarity = ?';
    params.push(rarity.toUpperCase());
    countParams.push(rarity.toUpperCase());
  }

  const [itemsResult, countResult] = await Promise.all([
    env.DB.prepare(`${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limit, offset).all(),
    env.DB.prepare(countQuery).bind(...countParams).first(),
  ]);

  return {
    items: itemsResult.results || [],
    total: countResult?.total || 0,
    page,
    totalPages: Math.ceil((countResult?.total || 0) / limit),
    rarity: rarity || '',
  };
}

export default function Library() {
  const { items, page, totalPages, rarity } = useLoaderData();
  const [, setSearchParams] = useSearchParams();

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
              {items.length} 张已收集
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 md:gap-sm mb-4 md:mb-6">
          <h2 className="font-label-bold text-[10px] md:text-label-bold text-outline uppercase tracking-widest pl-1 md:pl-xs">按稀有度筛选</h2>
          <div className="flex flex-wrap gap-2 md:gap-md items-center">
            <div className="flex gap-1 md:gap-xs bg-surface-container p-1 md:p-xs rounded-full border-2 border-surface-variant shadow-[2px_2px_0px_0px_#dad9de]">
              {['', 'SSR', 'SR', 'R', 'N'].map(r => (
                <button
                  key={r || 'all'}
                  onClick={() => setSearchParams(r ? { rarity: r, page: '1' } : { page: '1' })}
                  className={`font-label-bold text-[10px] md:text-label-bold px-2 md:px-md py-1 md:py-xs rounded-full border-2 transition-transform hover:-translate-y-1 ${
                    rarity === r
                      ? 'bg-tertiary text-on-tertiary border-on-tertiary-container shadow-[2px_2px_0px_0px_#473a00]'
                      : 'bg-surface-bright text-on-surface border-outline-variant hover:bg-surface-variant'
                  }`}
                >
                  {r || '全部'}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-md">
          {items.map(item => (
            <GachaCard
              key={item.id}
              card={{
                rarity: 'N',
                imageUrl: item.url,
                name: item.username || '匿名',
              }}
            />
          ))}
        </section>

        {totalPages > 1 && (
          <div className="mt-6 md:mt-xl flex justify-center pb-6 md:pb-xl">
            <button
              onClick={() => setSearchParams({ page: String(page + 1), ...(rarity && { rarity }) })}
              disabled={page >= totalPages}
              className="bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-xs md:text-button-text px-6 md:px-xl py-2 md:py-sm rounded-full border-[3px] border-on-tertiary-fixed-variant shadow-[4px_4px_0px_0px_#a63067] md:shadow-[6px_6px_0px_0px_#a63067] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all duration-150 flex items-center gap-1 md:gap-sm group"
            >
              <span className="material-symbols-outlined group-hover:animate-spin symbol-filled text-base md:text-lg">autorenew</span>
              加载更多
            </button>
          </div>
        )}
      </main>

      <BottomNav activeTab="图鉴" />
    </div>
  );
}
