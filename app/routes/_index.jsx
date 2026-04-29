import { useLoaderData } from '@remix-run/react';
import Header from '~/components/Header';
import DrawPanel from '~/components/DrawPanel';
import Leaderboard from '~/components/Leaderboard';
import Inventory from '~/components/Inventory';
import DiceGame from '~/components/DiceGame';
import ShopPanel from '~/components/ShopPanel';
import { useState } from 'react';

export async function loader({ context }) {
  const env = context?.cloudflare?.env;
  if (!env?.DB) {
    return { showcase: [], announcement: null };
  }
  try {
    const result = await env.DB.prepare(
      'SELECT g.*, u.username FROM gallery g LEFT JOIN users u ON g.user_id = u.id ORDER BY g.created_at DESC LIMIT 6'
    ).all();
    const announcement = await env.KV_CACHE?.get('system:announcement', { type: 'json' });
    return {
      showcase: result.results || [],
      announcement: announcement || null,
    };
  } catch (e) {
    return { showcase: [], announcement: null };
  }
}

export default function Index() {
  const { showcase, announcement } = useLoaderData();
  const [tab, setTab] = useState('draw');

  return (
    <div className="container">
      <Header />

      {announcement?.enabled && announcement?.content && (
        <div style={{
          background: 'var(--primary-light)', padding: '12px 16px', borderRadius: 'var(--radius-sm)',
          marginBottom: 20, borderLeft: '3px solid var(--primary)',
        }}>
          <strong>{announcement.title}</strong>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-light)', marginTop: 4 }}>{announcement.content}</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {[
          { key: 'draw', label: '抽卡' },
          { key: 'inventory', label: '背包' },
          { key: 'dice', label: '骰子' },
          { key: 'shop', label: '商店' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'var(--primary)' : 'transparent',
              color: tab === t.key ? 'white' : 'var(--text-main)',
              fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'draw' && <DrawPanel />}
      {tab === 'inventory' && <Inventory />}
      {tab === 'dice' && <DiceGame />}
      {tab === 'shop' && <ShopPanel />}

      <div style={{ marginTop: 20 }}>
        <Leaderboard showcase={showcase} />
      </div>
    </div>
  );
}
