import { Link, useNavigate } from '@remix-run/react';
import { useAuth } from '~/hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 0', marginBottom: 20,
    }}>
      <div>
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900 }}>
            <span style={{ color: 'var(--primary)' }}>Chouka</span> 抽卡
          </h1>
        </Link>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>二次元抽卡系统</p>
      </div>
      <nav style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <Link to="/library" style={{ color: 'var(--text-light)', textDecoration: 'none', fontSize: '0.9rem' }}>图库</Link>
        {user ? (
          <>
            <Link to="/profile" style={{ color: 'var(--text-light)', textDecoration: 'none', fontSize: '0.9rem' }}>
              {user.nickname || user.username}
              {user.title && <span style={{ color: 'var(--warning)', marginLeft: 4, fontSize: '0.75rem' }}>{user.title.name}</span>}
            </Link>
            <span style={{ color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600 }}>🪙 {user.coins}</span>
            <span style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>Lv.{user.level}</span>
            <button className="btn btn-outline" onClick={logout} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>退出</button>
          </>
        ) : (
          <button className="btn btn-primary" onClick={() => navigate('/login')} style={{ padding: '8px 18px', fontSize: '0.9rem' }}>登录</button>
        )}
      </nav>
    </header>
  );
}
