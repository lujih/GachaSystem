import { useLoaderData, useSearchParams, Link } from '@remix-run/react';
import Header from '~/components/Header';

export async function loader({ request, context }) {
  const { env } = context.cloudflare;
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
    <div className="container">
      <Header />
      <h2 style={{ marginBottom: 16 }}>图库</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', 'N', 'R', 'SR', 'SSR', 'UR'].map(r => (
          <button
            key={r}
            className={`btn ${rarity === r ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSearchParams(r ? { rarity: r, page: '1' } : { page: '1' })}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            {r || '全部'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {items.map(item => (
          <div key={item.id} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--card-bg)', boxShadow: 'var(--shadow)' }}>
            <img src={item.url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover' }} loading="lazy" />
            <p style={{ padding: '6px 10px', fontSize: '0.8rem', color: 'var(--text-light)' }}>
              {item.username || '匿名'}
            </p>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {page > 1 && (
            <button className="btn btn-outline" onClick={() => setSearchParams({ page: String(page - 1), ...(rarity && { rarity }) })}>
              上一页
            </button>
          )}
          <span style={{ padding: '8px 16px', color: 'var(--text-light)', fontSize: '0.9rem' }}>
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <button className="btn btn-outline" onClick={() => setSearchParams({ page: String(page + 1), ...(rarity && { rarity }) })}>
              下一页
            </button>
          )}
        </div>
      )}
    </div>
  );
}
