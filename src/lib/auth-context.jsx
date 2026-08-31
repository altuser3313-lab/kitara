'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchAuthSession, getCurrentUser, signIn as cognitoSignIn, signOut as cognitoSignOut } from 'aws-amplify/auth';
import { configureAmplify, isCognitoConfigured } from './amplify';
import { login as apiLogin, fetchMe, clearToken, getToken } from './api';

const AuthContext = createContext(null);

export const demoAccounts = {
  customer: { email: 'customer@katara.demo', password: 'katara1234' },
  pharmacy: { email: 'pharmacy@katara.demo', password: 'katara1234' },
  admin: { email: 'admin@katara.demo', password: 'katara1234' }
};

function roleFromGroups(groups = []) {
  const normalized = groups.map((g) => String(g).toLowerCase());
  if (normalized.includes('admins') || normalized.includes('admin')) return 'admin';
  if (normalized.includes('pharmacies') || normalized.includes('pharmacy')) return 'pharmacy';
  return 'customer';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiDown, setApiDown] = useState(false);

  useEffect(() => {
    async function restore() {
      configureAmplify();

      if (isCognitoConfigured()) {
        try {
          const current = await getCurrentUser();
          const session = await fetchAuthSession();
          const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
          setUser({
            name: current.signInDetails?.loginId || current.username,
            email: current.signInDetails?.loginId,
            role: roleFromGroups(groups),
            mode: 'cognito'
          });
        } catch {
          setUser(null);
        }
        setLoading(false);
        return;
      }

      if (getToken()) {
        try {
          const me = await fetchMe();
          setUser({ ...me, mode: 'api' });
        } catch (error) {
          if (error.status === 0) setApiDown(true);
          clearToken();
          setUser(null);
        }
      }
      setLoading(false);
    }

    restore();
  }, []);

  async function signIn({ email, password, role = 'customer' }) {
    if (isCognitoConfigured()) {
      configureAmplify();
      const result = await cognitoSignIn({ username: email, password });
      if (!result.isSignedIn) return { ok: false, nextStep: result.nextStep };
      const current = await getCurrentUser();
      const session = await fetchAuthSession();
      const groups = session.tokens?.accessToken?.payload?.['cognito:groups'] || [];
      const nextUser = {
        name: current.signInDetails?.loginId || current.username,
        email,
        role: roleFromGroups(groups),
        mode: 'cognito'
      };
      setUser(nextUser);
      return { ok: true, user: nextUser };
    }

    const credentials = email && password ? { email, password } : demoAccounts[role];
    const me = await apiLogin(credentials);
    const nextUser = { ...me, mode: 'api' };
    setApiDown(false);
    setUser(nextUser);
    return { ok: true, user: nextUser };
  }

  async function signOut() {
    if (isCognitoConfigured()) await cognitoSignOut();
    clearToken();
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, loading, apiDown, signIn, signOut, cognitoReady: isCognitoConfigured() }),
    [user, loading, apiDown]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
