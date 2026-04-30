import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';
import { useNavigate } from '@remix-run/react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

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
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <Card className="w-full max-w-md glass border-indigo-200/50 overflow-hidden">
        <div className="h-1 gradient-primary" />
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <span className="text-white text-3xl font-black">C</span>
          </div>
          <CardTitle className="text-2xl">
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Chouka
            </span>
            <span className="text-gray-800 ml-2">
              {mode === 'login' ? '登录' : '注册'}
            </span>
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">二次元抽卡系统</p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">用户名</label>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="3-20位字母数字下划线"
                required
                minLength={3}
                className="bg-white/50"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">昵称</label>
                <Input
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="可选"
                  className="bg-white/50"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">密码</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="至少6位"
                required
                minLength={6}
                className="bg-white/50"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 text-lg gradient-primary text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </Button>

            <p className="text-center text-sm text-gray-500">
              {mode === 'login' ? '没有账号？' : '已有账号？'}
              <button
                type="button"
                onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                className="text-indigo-600 hover:text-indigo-700 font-medium ml-1"
              >
                {mode === 'login' ? '去注册' : '去登录'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
