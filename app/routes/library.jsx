import { useLoaderData, useSearchParams } from '@remix-run/react';
import Header from '~/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

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

const RARITY_FILTERS = [
  { value: '', label: '全部' },
  { value: 'N', label: 'N' },
  { value: 'R', label: 'R' },
  { value: 'SR', label: 'SR' },
  { value: 'SSR', label: 'SSR' },
  { value: 'UR', label: 'UR' },
];

export default function Library() {
  const { items, page, totalPages, rarity } = useLoaderData();
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="min-h-screen gradient-bg">
      <Header />

      <main className="max-w-6xl mx-auto px-4 pt-20 pb-24">
        <Card className="glass border-indigo-200/50 overflow-hidden">
          <div className="h-1 gradient-primary" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🖼️</span> 图库
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-6">
              {RARITY_FILTERS.map(f => (
                <Button
                  key={f.value}
                  variant={rarity === f.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSearchParams(f.value ? { rarity: f.value, page: '1' } : { page: '1' })}
                  className={rarity === f.value ? 'gradient-primary text-white' : 'bg-white/50'}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-5xl mb-4">🖼️</p>
                <p>暂无图片</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-white/50 border border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-white text-sm font-medium truncate">{item.username || '匿名'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams({ page: String(page - 1), ...(rarity && { rarity }) })}
                  disabled={page <= 1}
                  className="bg-white/50"
                >
                  上一页
                </Button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchParams({ page: String(page + 1), ...(rarity && { rarity }) })}
                  disabled={page >= totalPages}
                  className="bg-white/50"
                >
                  下一页
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
