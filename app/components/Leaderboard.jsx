export default function Leaderboard({ showcase = [] }) {
  const cards = showcase.slice(0, 6);

  return (
    <div className="card">
      <h3 style={{ marginBottom: 12 }}>最新掉落</h3>
      {cards.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>暂无掉落记录</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
          {cards.map((card, i) => (
            <div key={i} style={{ borderRadius: 'var(--radius-sm)', overflow: 'hidden', background: 'var(--bg)', padding: 6, textAlign: 'center' }}>
              {card.url ? (
                <img src={card.url} alt="" style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', borderRadius: 6, marginBottom: 4 }} loading="lazy" />
              ) : (
                <div style={{ aspectRatio: '3/4', background: 'var(--border)', borderRadius: 6, marginBottom: 4 }} />
              )}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>{card.username || '匿名'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
