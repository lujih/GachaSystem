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
    <div className="min-h-screen bg-surface flex items-center justify-center px-3 md:px-4 relative overflow-hidden">
      <div className="fixed top-[-20%] right-[-20%] w-[60vw] h-[60vw] md:w-96 md:h-96 bg-primary-fixed rounded-full blur-[60px] md:blur-[100px] opacity-50 pointer-events-none" />
      <div className="fixed bottom-[-20%] left-[-20%] w-[60vw] h-[60vw] md:w-96 md:h-96 bg-secondary-fixed rounded-full blur-[60px] md:blur-[100px] opacity-50 pointer-events-none" />

      <div className="relative w-full max-w-sm md:max-w-md">
        <div className="absolute inset-0 bg-primary translate-x-1.5 md:translate-x-2 translate-y-1.5 md:translate-y-2 rounded-2xl md:rounded-[32px]" />

        <div className="relative bg-surface-container-lowest border-2 md:border-[3px] border-primary rounded-2xl md:rounded-[32px] overflow-hidden">
          <div className="p-6 md:p-8 text-center">
            <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 rounded-full bg-primary border-4 border-on-primary-container flex items-center justify-center shadow-[3px_3px_0px_0px_#770143] md:shadow-[4px_4px_0px_0px_#770143]">
              <span className="material-symbols-outlined text-3xl md:text-4xl text-on-primary symbol-filled">auto_awesome</span>
            </div>
            <h1 className="font-headline-lg text-2xl md:text-display-lg text-primary drop-shadow-[2px_2px_0px_#ff77af]">
              KiraKira 抽卡
            </h1>
            <p className="font-body-md text-xs md:text-body-md text-on-surface-variant mt-1 md:mt-2">
              {mode === 'login' ? '欢迎回来，收藏家！' : '加入冒险吧！'}
            </p>
          </div>

          <div className="px-4 md:px-8 pb-6 md:pb-8">
            <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
              <div>
                <label className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest mb-1 md:mb-2 block">
                  用户名
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="3-20位字母数字下划线"
                  required
                  minLength={3}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-sm md:text-body-md text-on-primary-fixed placeholder-primary/60 transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[3px_3px_0px_0px_#006783] md:focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-0.5"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest mb-1 md:mb-2 block">
                    昵称
                  </label>
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="可选"
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-sm md:text-body-md text-on-primary-fixed placeholder-primary/60 transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[3px_3px_0px_0px_#006783] md:focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-0.5"
                  />
                </div>
              )}

              <div>
                <label className="font-label-bold text-[10px] md:text-label-bold text-on-surface-variant uppercase tracking-widest mb-1 md:mb-2 block">
                  密码
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少6位"
                  required
                  minLength={6}
                  className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-sm md:text-body-md text-on-primary-fixed placeholder-primary/60 transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[3px_3px_0px_0px_#006783] md:focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-0.5"
                />
              </div>

              {error && (
                <div className="p-2.5 md:p-3 rounded-xl bg-error-container border-2 border-error text-on-error-container text-xs md:text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary text-on-primary font-button-text text-sm md:text-button-text py-3 md:py-4 rounded-full border-4 border-on-primary-container shadow-[4px_4px_0px_0px_#770143] md:shadow-[6px_6px_0px_0px_#770143] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-1 md:gap-2">
                  {submitting ? (
                    <span className="material-symbols-outlined animate-spin text-base md:text-lg">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined symbol-filled text-base md:text-lg">
                      {mode === 'login' ? 'login' : 'person_add'}
                    </span>
                  )}
                  {submitting ? '处理中...' : mode === 'login' ? '登录' : '注册'}
                </span>
              </button>

              <p className="text-center text-xs md:text-sm text-on-surface-variant">
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
