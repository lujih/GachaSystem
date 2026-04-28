import { useState, useEffect } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { api } from '~/lib/api';

export default function Inventory() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState({ N: 0, R: 0, SR: 0, SSR: 0, UR: 0 });
  const [crafting, setCrafting] = useState(false);

  useEffect(() => {
    if (!user) return;
    api.getInventory().then(res => setInventory(res.data || res)).catch(() => {});
  }, [user]);

  async function handleCraft(rarity) {
    setCrafting(true);
    try {
      const res = await api.craft(rarity);
      if (res.success) {
        const inv = await api.getInventory();
        setInventory(inv.data || inv);
      }
    } catch (e) {}
    setCrafting(false);
  }

  const craftOptions = [
    { target: 'R', source: 'N' },
    { target: 'SR', source: 'R' },
    { target: 'SSR', source: 'SR' },
    { target: 'UR', source: 'SSR' },
  ];

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>背包</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {['N', 'R', 'SR', 'SSR', 'UR'].map(r => (
          <span key={r} className={`badge badge-${r}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
            {r}: {inventory[r] || 0}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {craftOptions.map(o => (
          <button
            key={o.target}
            className="btn btn-outline"
            onClick={() => handleCraft(o.target)}
            disabled={crafting || (inventory[o.source] || 0) < 5}
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
          >
            5×{o.source} → 1×{o.target}
          </button>
        ))}
      </div>
    </div>
  );
}
