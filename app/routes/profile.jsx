import { useLoaderData, useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import Inventory from '~/components/Inventory';
import { useState } from 'react';
import { api } from '~/lib/api';

export function loader() {
  return null;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('inventory');

  if (!user) {
    return (
      <div className="container">
        <Header />
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ marginBottom: 16, color: 'var(--text-light)' }}>请先登录</p>
          <button className="btn btn-primary" onClick={() => navigate('/login')}>去登录</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img
            src={`https://api.dicebear.com/7.x/adventurer/svg?seed=${user.username}`}
            alt=""
            style={{ width: 64, height: 64, borderRadius: '50%' }}
          />
          <div>
            <h2>{user.nickname || user.username}</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
              @{user.username} · Lv.{user.level} · 🪙 {user.coins}
            </p>
            {user.title && <span className="badge badge-SSR" style={{ marginTop: 4 }}>{user.title.name}</span>}
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
              抽卡次数: {user.drawCount || 0} · 胜场: {user.wins || 0}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {['inventory', 'activity'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: tab === t ? 'var(--primary)' : 'transparent',
              color: tab === t ? 'white' : 'var(--text-main)',
              fontWeight: 600, fontSize: '0.9rem',
            }}
          >
            {t === 'inventory' ? '背包' : '活动'}
          </button>
        ))}
      </div>

      {tab === 'inventory' && <Inventory />}
      {tab === 'activity' && (
        <div className="card">
          <h3>每日签到</h3>
          <p style={{ color: 'var(--text-light)', marginBottom: 12 }}>每天签到可以获得金币和经验奖励</p>
          <button className="btn btn-primary" onClick={async () => {
            try {
              await api.checkIn();
              await refreshUser();
            } catch (e) {}
          }}>
            签到
          </button>
        </div>
      )}
    </div>
  );
}
