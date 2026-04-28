import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

const SHOP_ITEMS = [
  { rarity: 'R', price: 150, label: 'R 卡片' },
  { rarity: 'SR', price: 600, label: 'SR 卡片' },
  { rarity: 'SSR', price: 2500, label: 'SSR 卡片' },
  { rarity: 'UR', price: 10000, label: 'UR 卡片' },
];

export default function ShopPanel() {
  const { user, refreshUser } = useAuth();
  const [buying, setBuying] = useState(null);

  async function handleBuy(rarity) {
    setBuying(rarity);
    try {
      await api.shopBuy(rarity);
      await refreshUser();
    } catch (e) {}
    setBuying(null);
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>商店</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
        {SHOP_ITEMS.map(item => (
          <button
            key={item.rarity}
            className={`badge badge-${item.rarity}`}
            onClick={() => handleBuy(item.rarity)}
            disabled={buying === item.rarity || (user?.coins || 0) < item.price}
            style={{
              padding: '12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              opacity: (user?.coins || 0) < item.price ? 0.4 : 1,
              fontSize: '0.9rem',
            }}
          >
            <div>{item.label}</div>
            <div style={{ marginTop: 4 }}>🪙 {item.price}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
