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
    <div className="min-h-screen bg-surface bg-halftone flex items-center justify-center p-4 relative">
      {/* Decorative Background */}
      <div className="fixed top-[-10%] right-[-5%] w-96 h-96 bg-primary-fixed rounded-full blur-[100px] opacity-60 pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-96 h-96 bg-secondary-fixed rounded-full blur-[100px] opacity-60 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Hard Shadow */}
        <div className="absolute inset-0 bg-primary translate-x-2 translate-y-2 rounded-[32px]" />

        {/* Main Card */}
        <div className="relative bg-surface-container-lowest border-[3px] border-primary rounded-[32px] overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary border-4 border-on-primary-container flex items-center justify-center shadow-[4px_4px_0px_0px_#770143]">
              <span className="material-symbols-outlined text-4xl text-on-primary symbol-filled">auto_awesome</span>
            </div>
            <h1 className="font-display-lg text-display-lg text-primary drop-shadow-[2px_2px_0px_#ff77af]">
              KiraKira Gacha
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {mode === 'login' ? 'Welcome back, Collector!' : 'Join the adventure!'}
            </p>
          </div>

          {/* Form */}
          <div className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                  Username
                </label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="3-20 characters"
                  required
                  minLength={3}
                  className="w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-on-primary-fixed placeholder-primary transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-1"
                />
              </div>

              {mode === 'register' && (
                <div>
                  <label className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                    Nickname
                  </label>
                  <input
                    value={nickname}
                    onChange={e => setNickname(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-on-primary-fixed placeholder-primary transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-1"
                  />
                </div>
              )}

              <div>
                <label className="font-label-bold text-label-bold text-on-surface-variant uppercase tracking-widest mb-2 block">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-full bg-primary-fixed border-2 border-primary-fixed-dim focus:border-secondary focus:ring-0 focus:outline-none font-body-md text-on-primary-fixed placeholder-primary transition-all shadow-[2px_2px_0px_0px_#ffb0cb] focus:shadow-[4px_4px_0px_0px_#006783] focus:-translate-y-1"
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
                className="w-full bg-primary text-on-primary font-button-text text-button-text py-4 rounded-full border-4 border-on-primary-container shadow-[6px_6px_0px_0px_#770143] hover:shadow-none hover:translate-x-[6px] hover:translate-y-[6px] transition-all relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {submitting ? (
                    <span className="material-symbols-outlined animate-spin">refresh</span>
                  ) : (
                    <span className="material-symbols-outlined symbol-filled">
                      {mode === 'login' ? 'login' : 'person_add'}
                    </span>
                  )}
                  {submitting ? 'Processing...' : mode === 'login' ? 'Login' : 'Register'}
                </span>
              </button>

              <p className="text-center text-sm text-on-surface-variant">
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                  className="text-primary hover:text-primary-container font-bold ml-1 transition-colors"
                >
                  {mode === 'login' ? 'Register' : 'Login'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
