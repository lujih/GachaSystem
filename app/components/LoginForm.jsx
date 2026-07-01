import { useState } from 'react';
import { useAuth } from '~/hooks/useAuth';

export default function LoginForm() {
  const { login, register } = useAuth();
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-base text-on-primary-fixed placeholder-primary/60 transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[3px_3px_0px_0px_#006783]";

  return (
    <div className="min-h-screen bg-anime-sky px-4 py-12">
      <div className="mx-auto max-w-[420px]">
        <div className="bg-surface-container-lowest border-2 border-primary rounded-2xl overflow-hidden">
          <div className="pt-8 pb-2 px-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary border-4 border-on-primary-container flex items-center justify-center shadow-[3px_3px_0px_0px_#770143]">
              <span className="material-symbols-outlined text-3xl text-on-primary symbol-filled">auto_awesome</span>
            </div>
            <h1 className="text-2xl font-extrabold text-primary drop-shadow-[2px_2px_0px_#ff77af]">
              KiraKira 抽卡
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              {mode === 'login' ? '欢迎回来，收藏家！' : '加入冒险吧！'}
            </p>
          </div>

          <div className="px-6 pb-8 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                  用户名
                </label>
                <input
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="3-20位字母数字下划线"
                  required
                  minLength={3}
                  disabled={submitting}
                  className={inputClass}
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                    昵称
                  </label>
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="可选"
                    disabled={submitting}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="至少6位"
                  required
                  minLength={6}
                  disabled={submitting}
                  className={inputClass}
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-error-container border-2 border-error text-on-error-container text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold text-base py-4 rounded-full border-4 border-pink-300 shadow-[4px_4px_0px_0px_#770143] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all"
              >
                <span className="flex items-center justify-center gap-2">
                  {submitting ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined symbol-filled">
                      {mode === 'login' ? 'login' : 'person_add'}
                    </span>
                  )}
                  {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
                </span>
              </button>

              <p className="text-center text-sm text-on-surface-variant">
                {mode === 'login' ? '没有账号？' : '已有账号？'}
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-primary hover:text-primary-container font-bold ml-1 transition-colors"
                >
                  {mode === 'login' ? '去注册' : '去登录'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
