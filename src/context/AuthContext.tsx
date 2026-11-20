import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { apiRequest, setPendingPreferredRole } from '../lib/api';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signInWithGoogle: (preferredRole?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Pick<UserProfile, 'fullName' | 'bio' | 'gradeOrDepartment' | 'leaderboardOptIn'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('sc-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      window.localStorage.setItem('sc-theme', theme);
    } catch {
      // ignore storage restrictions
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }
    const data = await apiRequest<{ user: UserProfile }>('/auth/me');
    setProfile(data.user);
    setPendingPreferredRole(null);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthError(null);
      if (user) {
        try {
          const data = await apiRequest<{ user: UserProfile }>('/auth/me');
          setProfile(data.user);
          setPendingPreferredRole(null);
        } catch (err: any) {
          setAuthError(err?.message || 'Unable to synchronize account.');
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async (preferredRole?: UserRole) => {
    setAuthError(null);
    if (preferredRole) {
      setPendingPreferredRole(preferredRole);
    }
    try {
      await signInWithPopup(auth, googleAuthProvider);
      if (preferredRole) {
        // Also ensure role matches selection if user already existed
        const res = await apiRequest<{ user: UserProfile }>('/auth/role', {
          method: 'PATCH',
          body: JSON.stringify({ role: preferredRole }),
        });
        setProfile(res.user);
      }
    } catch (err: any) {
      setPendingPreferredRole(null);
      if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing.');
      } else {
        setAuthError(err?.message || 'Sign-in failed. Please try again.');
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setProfile(null);
  }, []);

  const switchRole = useCallback(async (role: UserRole) => {
    const res = await apiRequest<{ user: UserProfile }>('/auth/role', {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    setProfile(res.user);
  }, []);

  const updateProfile = useCallback(
    async (
      updates: Partial<
        Pick<
          UserProfile,
          'fullName' | 'bio' | 'gradeOrDepartment' | 'leaderboardOptIn'
        >
      >
    ) => {
      const res = await apiRequest<{ user: UserProfile }>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setProfile(res.user);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        loading,
        authError,
        theme,
        toggleTheme,
        signInWithGoogle,
        logout,
        switchRole,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
