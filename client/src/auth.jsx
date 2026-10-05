import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // expired token anywhere in the app signs the user out
    if (!tokenStore.get()) { setReady(true); return; }
    api.me().then((r) => setUser(r.user)).catch(logout).finally(() => setReady(true));
  }, [logout]);

  const value = useMemo(() => {
    const accept = ({ token, user: u }) => { tokenStore.set(token); setUser(u); };
    return {
      user,
      ready,
      isAgent: user?.role === 'agent',
      login: async (email, password) => accept(await api.login(email, password)),
      register: async (name, email, password) => accept(await api.register(name, email, password)),
      logout,
    };
  }, [user, ready, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
