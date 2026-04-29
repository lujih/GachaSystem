import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
      .catch(() => {
        // Don't remove token on network/server error — keep user logged in
        // Only remove if explicitly 401
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

  const logout = useCallback(() => {
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
