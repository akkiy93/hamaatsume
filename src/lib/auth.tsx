import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, LOGIN_FUNCTION_URL } from './supabase';

interface AuthCtx {
  session: Session | null;
  loading: boolean;
  login: (nickname: string, passphrase: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(nickname: string, passphrase: string) {
    const res = await fetch(LOGIN_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      },
      body: JSON.stringify({ nickname, passphrase }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'login failed' }));
      throw new Error(err.error ?? 'login failed');
    }
    const { email, token_hash } = (await res.json()) as { email: string; token_hash: string };
    const { error } = await supabase.auth.verifyOtp({
      type: 'email',
      email,
      token_hash,
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return <Ctx.Provider value={{ session, loading, login, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
