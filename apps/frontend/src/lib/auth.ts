import { useMemo, useState } from 'react';

const STORAGE_KEY = 'qa-checklist-token';

export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || '');

  const auth = useMemo(() => ({
    token,
    login(tokenValue: string) {
      localStorage.setItem(STORAGE_KEY, tokenValue);
      setToken(tokenValue);
    },
    logout() {
      localStorage.removeItem(STORAGE_KEY);
      setToken('');
    }
  }), [token]);

  return auth;
}
