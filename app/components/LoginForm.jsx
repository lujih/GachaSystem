import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { useNavigate } from '@remix-run/react';

export default function LoginForm() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password, nickname || username);
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
      <h2 style={{ marginBottom: 20, textAlign: 'center' }}>
        {mode === 'login' ? '登录' : '注册'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>用户名</label>
          <input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="3-20位字母数字下划线" required minLength={3} />
        </div>
        {mode === 'register' && (
          <div style={{ marginBottom: 12 }}>
            <label>昵称</label>
            <input className="input" value={nickname} onChange={e => setNickname(e.target.value)} placeholder="可选" />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label>密码</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="至少6位" required minLength={6} />
        </div>
        {error && <p style={{ color: 'var(--danger)', marginBottom: 12, fontSize: '0.9rem' }}>{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%' }}>
          {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 16, color: 'var(--text-light)', fontSize: '0.9rem' }}>
        {mode === 'login' ? '没有账号？' : '已有账号？'}
        <button
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          {mode === 'login' ? '去注册' : '去登录'}
        </button>
      </p>
    </div>
  );
}
