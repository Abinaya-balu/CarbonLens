import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('carbonlens_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('carbonlens_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('carbonlens_token', token);
    else localStorage.removeItem('carbonlens_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('carbonlens_user', JSON.stringify(user));
    else localStorage.removeItem('carbonlens_user');
  }, [user]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthed: Boolean(token),
      login: ({ token: t, user: u }) => {
        setToken(t);
        setUser(u);
      },
      logout: () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('carbonlens_token');
        localStorage.removeItem('carbonlens_user');
      },
    }),
    [token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

