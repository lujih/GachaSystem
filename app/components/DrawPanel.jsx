import { useState } from 'react';
import { useGacha } from '~/hooks/useGacha';
import { useAuth } from '~/hooks/useAuth';

const RARITY_COLORS = { N: '#64748b', R: '#3b82f6', SR: '#8b5cf6', SSR: '#f59e0b', UR: '#ef4444' };

export default function DrawPanel() {
  const { user, refreshUser } = useAuth();
  const { drawing, lastDraw, draw, multiDraw, clearDraw } = useGacha();
  const [animating, setAnimating] = useState(false);

  async function handleDraw(type) {
    if (drawing) return;
    setAnimating(true);
    clearDraw();
    try {
      if (type === 'multi') await multiDraw(10);
      else await draw();
      setTimeout(async () => {
        try { await refreshUser(); } catch (e) {}
        setAnimating(false);
      }, 1200);
    } catch (e) {
      setAnimating(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>抽卡面板</h2>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => handleDraw('single')} disabled={drawing} style={{ flex: 1 }}>
          {drawing && !animating ? '抽卡中...' : animating ? '开卡中...' : '单抽 (免费)'}
        </button>
        <button className="btn btn-primary" onClick={() => handleDraw('multi')} disabled={drawing} style={{ flex: 1 }}>
          {drawing && !animating ? '抽卡中...' : animating ? '开卡中...' : '十连抽 (免费)'}
        </button>
      </div>

      {animating && !lastDraw && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-light)', fontSize: '1.2rem' }}>
          正在抽卡... 🎲
        </div>
      )}

      {lastDraw && !lastDraw.cards && (
        <div style={{ textAlign: 'center' }}>
          {lastDraw.card?.imageUrl ? (
            <img
              src={lastDraw.card.imageUrl}
              alt={lastDraw.card.rarity}
              style={{
                width: '100%', maxWidth: 300, borderRadius: 'var(--radius)',
                boxShadow: `0 0 20px ${RARITY_COLORS[lastDraw.card.rarity] || '#fff'}40`,
                marginBottom: 12,
              }}
            />
          ) : (
            <span className={`badge badge-${lastDraw.card?.rarity || 'N'}`} style={{ fontSize: '1.1rem', padding: '6px 16px' }}>
              {lastDraw.card?.rarity || 'N'}
            </span>
          )}
          {lastDraw.isPity && <p style={{ color: 'var(--warning)', marginTop: 8 }}>保底触发!</p>}
          {lastDraw.expGained != null && <p style={{ color: 'var(--text-light)', marginTop: 4 }}>+{lastDraw.expGained} 经验</p>}
          {lastDraw.levelUp && (
            <p style={{ color: 'var(--success)', marginTop: 4, fontWeight: 600 }}>
              升级! Lv.{lastDraw.levelUp.newLevel} (+{lastDraw.levelUp.reward} 金币)
            </p>
          )}
        </div>
      )}

      {lastDraw?.cards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
          {lastDraw.cards.map((c, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 8, borderRadius: 'var(--radius-sm)', background: `${RARITY_COLORS[c.rarity]}15` }}>
              {c.asset?.url ? (
                <img src={c.asset.url} alt={c.rarity} style={{ width: '100%', borderRadius: 6, marginBottom: 4 }} />
              ) : (
                <span className={`badge badge-${c.rarity}`}>{c.rarity}</span>
              )}
              {c.isPity && <span style={{ fontSize: '0.7rem', color: 'var(--warning)' }}>保底</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
