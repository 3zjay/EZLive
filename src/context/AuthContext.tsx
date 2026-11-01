'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  onAuthChanged,
  signInWithGoogle,
  signInWithFacebook,
  signInWithLeagueCredentials,
  checkGoogleRedirectResult,
  autoLinkFacebookToProfile,
  logoutUser,
  syncUserRecord,
  saveOperatorSession,
  UserSessionProfile,
} from '@/services/firebase';
import { Scene, ScoreboardState, StreamSettings } from '@/types/broadcast';
import { BrandKit } from '@/types/streamlabs';
import { scoreboardSync } from '@/services/scoreboardSync';

interface AuthContextType {
  user: User | null;
  profile: UserSessionProfile | null;
  loading: boolean;
  authError: string | null;
  signInGoogle: () => Promise<User | null>;
  signInFacebook: () => Promise<User | null>;
  signInWithCredentials: (email: string, password: string) => Promise<User | null>;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
  updateAssignedCourt: (courtName: string) => Promise<void>;
  saveSessionState: (data: {
    scenes?: Scene[];
    scoreboard?: Partial<ScoreboardState>;
    settings?: Partial<StreamSettings>;
    brandKit?: Partial<BrandKit>;
    connectedAccounts?: Partial<NonNullable<UserSessionProfile['connectedAccounts']>>;
  }) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  signInGoogle: async () => null,
  signInFacebook: async () => null,
  signInWithCredentials: async () => null,
  clearAuthError: () => {},
  signOut: async () => {},
  updateAssignedCourt: async () => {},
  saveSessionState: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserSessionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if returning from a Google OAuth redirect or Facebook OAuth callback
    checkGoogleRedirectResult().then((redirectUser) => {
      if (redirectUser) {
        setUser(redirectUser);
        syncUserRecord(redirectUser).then((prof) => setProfile(prof));
      }
    });

    // Check if Facebook OAuth just completed in same-window redirect mode
    try {
      const fbPayloadRaw = localStorage.getItem('fb_auth_callback_payload');
      if (fbPayloadRaw) {
        localStorage.removeItem('fb_auth_callback_payload');
        const parsed = JSON.parse(fbPayloadRaw);
        if (parsed?.token && parsed?.user) {
          const email = (parsed.user.email || '').trim().toLowerCase();
          const safeUid = email
            ? 'fb_' + email.replace(/[\.\#\$\[\]@]/g, '_')
            : `fb_${parsed.user.id || Date.now()}`;
          const fbAuthUser: unknown = {
            uid: safeUid,
            email: email || `${parsed.user.id || 'user'}@facebook.com`,
            displayName: parsed.user.name || 'Facebook Operator',
            photoURL: parsed.user.picture || '',
            emailVerified: true,
          };
          localStorage.setItem('ezlive_custom_auth_user', JSON.stringify(fbAuthUser));
          autoLinkFacebookToProfile(safeUid, email, parsed.token, parsed.user).then(() => {
            syncUserRecord(fbAuthUser as User).then((prof) => {
              setUser(fbAuthUser as User);
              setProfile(prof);
            });
          });
        }
      }
    } catch {}

    // 2. Check existing session in localStorage
    try {
      const savedUser = localStorage.getItem('hc_session_user');
      if (savedUser) {
        scoreboardSync.setSessionUser(savedUser);
      }
    } catch {}

    // 3. Listen to Firebase Auth state (with fallback to saved custom League/Facebook session)
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          // Always sync against Firebase RTDB Cloud Profile so new devices pull Facebook/YouTube/keys!
          const synced = await syncUserRecord(firebaseUser);
          setProfile(synced);
          if (firebaseUser.email) {
            try {
              localStorage.setItem('hc_session_user', firebaseUser.email);
            } catch {}
            scoreboardSync.setSessionUser(firebaseUser.email);
          }
        } catch (err) {
          console.warn('Error syncing operator session:', err);
        }
      } else {
        // Check if logged in via League Credentials or Facebook Graph OAuth
        let customUser: User | null = null;
        try {
          const rawCustom = localStorage.getItem('ezlive_custom_auth_user');
          if (rawCustom) {
            customUser = JSON.parse(rawCustom) as User;
          }
        } catch {}

        if (customUser) {
          setUser(customUser);
          try {
            const synced = await syncUserRecord(customUser);
            setProfile(synced);
            if (customUser.email) {
              localStorage.setItem('hc_session_user', customUser.email);
              scoreboardSync.setSessionUser(customUser.email);
            }
          } catch {}
        } else {
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (!user) return;
    const synced = await syncUserRecord(user);
    setProfile(synced);
  };

  const signInGoogle = async (): Promise<User | null> => {
    setLoading(true);
    setAuthError(null);
    try {
      const u = await signInWithGoogle();
      if (u) {
        setUser(u);
        const prof = await syncUserRecord(u);
        setProfile(prof);
        if (u.email) {
          try {
            localStorage.setItem('hc_session_user', u.email);
          } catch {}
          scoreboardSync.setSessionUser(u.email);
        }
        return u;
      }
      return null;
    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);
      const errCode = (err as { code?: string })?.code || '';
      const errMsg = (err as { message?: string })?.message || '';
      if (errCode === 'auth/unauthorized-domain') {
        setAuthError(
          `Google OAuth domain authorization needed for "${window.location.hostname}". You can sign in instantly with Facebook or League Credentials below.`
        );
      } else if (errCode === 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in window was closed.');
      } else if (errCode === 'auth/popup-blocked') {
        setAuthError('Popup blocked by browser. Redirecting to Google Sign-In...');
      } else {
        setAuthError(errMsg || 'Failed to authenticate with Google.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInFacebook = async (): Promise<User | null> => {
    setLoading(true);
    setAuthError(null);
    try {
      const u = await signInWithFacebook();
      if (u) {
        setUser(u);
        const prof = await syncUserRecord(u);
        setProfile(prof);
        if (u.email) {
          try {
            localStorage.setItem('hc_session_user', u.email);
          } catch {}
          scoreboardSync.setSessionUser(u.email);
        }
        return u;
      }
      return null;
    } catch (err: unknown) {
      console.error('Facebook Sign-In failed:', err);
      const errMsg = (err as { message?: string })?.message || '';
      setAuthError(errMsg || 'Failed to authenticate with Facebook.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInWithCredentials = async (email: string, password: string): Promise<User | null> => {
    setLoading(true);
    setAuthError(null);
    try {
      const u = await signInWithLeagueCredentials(email, password);
      if (u) {
        setUser(u);
        const prof = await syncUserRecord(u);
        setProfile(prof);
        if (u.email) {
          try {
            localStorage.setItem('hc_session_user', u.email);
          } catch {}
          scoreboardSync.setSessionUser(u.email);
        }
        return u;
      }
      return null;
    } catch (err: unknown) {
      console.error('League login failed:', err);
      setAuthError('Invalid League credentials. Please verify your email and password.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const signOut = async () => {
    try {
      localStorage.removeItem('hc_session_user');
      localStorage.removeItem('ezlive_custom_auth_user');
    } catch {}
    await logoutUser();
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  const updateAssignedCourt = async (courtName: string) => {
    if (!user) return;
    setProfile((prev) => (prev ? { ...prev, assignedCourt: courtName } : null));
    const updated = await saveOperatorSession(user.uid, { email: user.email || undefined, assignedCourt: courtName });
    if (updated) setProfile(updated);
  };

  const saveSessionState = async (data: {
    scenes?: Scene[];
    scoreboard?: Partial<ScoreboardState>;
    settings?: Partial<StreamSettings>;
    brandKit?: Partial<BrandKit>;
    connectedAccounts?: Partial<NonNullable<UserSessionProfile['connectedAccounts']>>;
  }) => {
    const uid = user?.uid || 'default_operator';
    const email = user?.email || (typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') || '' : '');
    const updated = await saveOperatorSession(uid, { ...data, email: email || undefined });
    if (updated) {
      setProfile(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        signInGoogle,
        signInFacebook,
        signInWithCredentials,
        clearAuthError,
        signOut,
        updateAssignedCourt,
        saveSessionState,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
