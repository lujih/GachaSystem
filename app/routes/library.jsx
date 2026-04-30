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
      {/* FX Layer */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <span className="material-symbols-outlined absolute top-20 left-10 text-primary-container/20 symbol-filled" style={{ fontSize: 64 }}>stars</span>
        <span className="material-symbols-outlined absolute bottom-40 right-20 text-tertiary-fixed/30 symbol-filled" style={{ fontSize: 96 }}>stars</span>
      </div>

      <Header activeTab="Gallery" />

      <main className="relative z-10 max-w-7xl mx-auto px-gutter md:px-margin pt-[88px] pb-[120px]">
        {/* Header */}
        <section className="flex flex-col md:flex-row justify-between items-start md:items-end mb-lg gap-sm pt-md">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface drop-shadow-[2px_2px_0px_#dbbfc7] mb-xs">
              My Collection
            </h1>
            <div className="inline-flex items-center gap-xs bg-primary-container text-on-primary-container font-label-bold text-label-bold px-sm py-xs rounded-full border-2 border-on-primary-container shadow-[2px_2px_0px_0px_#770143]">
              <span className="material-symbols-outlined text-[18px] symbol-filled">style</span>
              {items.length} Cards Acquired
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="flex flex-col gap-sm mb-lg">
          <h2 className="font-label-bold text-label-bold text-outline uppercase tracking-widest pl-xs">Filter By</h2>
          <div className="flex flex-wrap gap-md items-center">
            <div className="flex gap-xs bg-surface-container p-xs rounded-full border-2 border-surface-variant shadow-[2px_2px_0px_0px_#dad9de]">
              {['', 'SSR', 'SR', 'R', 'N'].map(r => (
                <button
                  key={r || 'all'}
                  onClick={() => setSearchParams(r ? { rarity: r, page: '1' } : { page: '1' })}
                  className={`font-label-bold text-label-bold px-md py-xs rounded-full border-2 transition-transform hover:-translate-y-1 ${
                    rarity === r
                      ? 'bg-tertiary text-on-tertiary border-on-tertiary-container shadow-[2px_2px_0px_0px_#473a00]'
                      : 'bg-surface-bright text-on-surface border-outline-variant hover:bg-surface-variant'
                  }`}
                >
                  {r || 'All'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Character Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-md">
          {items.map(item => (
            <GachaCard
              key={item.id}
              card={{
                rarity: 'N',
                imageUrl: item.url,
                name: item.username || 'Anonymous',
              }}
            />
          ))}
        </section>

        {/* Load More */}
        {totalPages > 1 && (
          <div className="mt-xl flex justify-center pb-xl">
            <button
              onClick={() => setSearchParams({ page: String(page + 1), ...(rarity && { rarity }) })}
              disabled={page >= totalPages}
              className="bg-tertiary-fixed text-on-tertiary-fixed-variant font-button-text text-button-text px-xl py-sm rounded-full border-[3px] border-on-tertiary-fixed-variant shadow-[6px_6px_0px_0px_#a63067] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all duration-150 flex items-center gap-sm group"
            >
              <span className="material-symbols-outlined group-hover:animate-spin symbol-filled">autorenew</span>
              Load More Characters
            </button>
          </div>
        )}
      </main>

      <BottomNav activeTab="Gallery" />
    </div>
  );
}
