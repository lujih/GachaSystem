import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import Header from '~/components/Header';
import { api } from '~/lib/api';

export default function Admin() {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', content: '' });

  async function handleVerify() {
    setError('');
    try {
      const res = await api.adminVerify(password);
      if (res.success) {
        setAuthed(true);
        handleLoadUsers();
      }
    } catch (e) {
      setError('密码错误');
    }
  }

  async function handleLoadUsers(page = 1) {
    try {
      const res = await api.adminUsers(password, page);
      setUsers(res.users || []);
    } catch (e) {}
  }

  async function handleLoadUploads(status = 'pending') {
    try {
      const res = await api.adminUploads(password, status);
      setUploads(res.uploads || []);
    } catch (e) {}
  }

  if (!authed) {
    return (
      <div className="container">
        <Header />
        <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
          <h2 style={{ marginBottom: 16 }}>管理员登录</h2>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="管理员密码" style={{ marginBottom: 12 }} />
          {error && <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-primary" onClick={handleVerify} style={{ width: '100%' }}>验证</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />
      <h2 style={{ marginBottom: 16 }}>管理后台</h2>

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: 'var(--card-bg)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {['users', 'uploads', 'announcement'].map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'users') handleLoadUsers(); if (t === 'uploads') handleLoadUploads(); }}
            style={{ flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer', background: tab === t ? 'var(--primary)' : 'transparent', color: tab === t ? 'white' : 'var(--text-main)', fontWeight: 600, fontSize: '0.9rem' }}
          >
            {t === 'users' ? '用户' : t === 'uploads' ? '审核' : '公告'}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div>
          {users.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{u.nickname || u.username}</strong>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>Lv.{u.level} · 🪙 {u.coins} · 抽卡{u.draw_count}次</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'uploads' && (
        <div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
            {['pending', 'approved', 'rejected'].map(s => (
              <button key={s} className="btn btn-outline" onClick={() => handleLoadUploads(s)} style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                {s === 'pending' ? '待审核' : s === 'approved' ? '已通过' : '已拒绝'}
              </button>
            ))}
          </div>
          {uploads.map(u => (
            <div key={u.id} className="card" style={{ marginBottom: 8, display: 'flex', gap: 12, alignItems: 'center' }}>
              <img src={u.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 6 }} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '0.85rem' }}>{u.username} · <span className={`badge badge-${u.rarity || 'N'}`}>{u.rarity || 'N'}</span></p>
              </div>
              {u.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-primary" onClick={async () => { await api.adminReviewUpload(password, u.id, 'approved'); handleLoadUploads(); }} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>通过</button>
                  <button className="btn" style={{ background: 'var(--danger)', color: 'white', padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '0.85rem' }} onClick={async () => { await api.adminReviewUpload(password, u.id, 'rejected'); handleLoadUploads(); }}>拒绝</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'announcement' && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>发布公告</h3>
          <input className="input" value={announcement.title} onChange={e => setAnnouncement({ ...announcement, title: e.target.value })} placeholder="标题" style={{ marginBottom: 12 }} />
          <textarea className="input" value={announcement.content} onChange={e => setAnnouncement({ ...announcement, content: e.target.value })} placeholder="内容" rows={4} style={{ marginBottom: 12 }} />
          <button className="btn btn-primary" onClick={async () => { await api.adminSaveAnnouncement(password, { ...announcement, enabled: true }); alert('已保存'); }}>
            保存公告
          </button>
        </div>
      )}
    </div>
  );
}
