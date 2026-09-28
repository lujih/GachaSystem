import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '~/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      setLoading(false);
      return;
    }
    api.getUserInfo()
      .then(res => {
        const data = res.data || res;
        setUser(data);
      })
      .catch((e) => {
        // 仅在明确 401（会话已失效/被吊销）时清 token；
        // 网络或 5xx 错误必须保留，否则一次抖动就会把用户踢出登录态
        if (e?.status === 401) localStorage.removeItem('sessionToken');
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await api.login({ username, password });
    localStorage.setItem('sessionToken', res.token);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (username, password, nickname) => {
    const res = await api.register({ username, password, nickname });
    if (res.success) {
      return await login(username, password);
    }
    return res;
  }, [login]);

  const logout = useCallback(async () => {
    // 必须先吊销服务端会话：token 存 localStorage 只清本地的话，
    // 该 token 在会话到期前（7 天）仍可被任何人使用
    try {
      await api.logout();
    } catch {
      /* 吊销失败也要清本地，避免用户被困在登不出的状态 */
    }
    localStorage.removeItem('sessionToken');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await api.getUserInfo();
      const data = res.data || res;
      setUser(data);
    } catch (e) { /* ignore */ }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, refreshUser }), [user, loading, login, register, logout, refreshUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
