'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  auth,
  onAuthChanged,
  signInWithGoogle,
  signInWithFacebook,
  logoutUser,
  getOperatorSession,
  syncUserRecord,
  saveOperatorSession,
  UserSessionProfile,
} from '@/services/firebase';
import { Scene, ScoreboardState, StreamSettings } from '@/types/broadcast';
import { scoreboardSync } from '@/services/scoreboardSync';

interface AuthContextType {
  user: User | null;
  profile: UserSessionProfile | null;
  loading: boolean;
  authError: string | null;
  signInGoogle: () => Promise<User | null>;
  signInFacebook: () => Promise<User | null>;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
  updateAssignedCourt: (courtName: string) => Promise<void>;
  saveSessionState: (data: {
    scenes?: Scene[];
    scoreboard?: Partial<ScoreboardState>;
    settings?: Partial<StreamSettings>;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  authError: null,
  signInGoogle: async () => null,
  signInFacebook: async () => null,
  clearAuthError: () => {},
  signOut: async () => {},
  updateAssignedCourt: async () => {},
  saveSessionState: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserSessionProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const prof = await getOperatorSession(firebaseUser.uid);
          if (prof) {
            setProfile(prof);
          } else {
            const synced = await syncUserRecord(firebaseUser);
            setProfile(synced);
          }
          if (firebaseUser.email) {
            scoreboardSync.setSessionUser(firebaseUser.email);
          }
        } catch (err) {
          console.warn('Error fetching operator session:', err);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
          scoreboardSync.setSessionUser(u.email);
        }
        return u;
      }
      return null;
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError(`Domain authorization notice: "${window.location.hostname}" must be added to Authorized Domains in Firebase Authentication console.`);
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled: The Google popup window was closed.');
      } else if (err?.code === 'auth/popup-blocked') {
        setAuthError('Popup blocked by browser. Please allow popups for this site to sign in with Google.');
      } else {
        setAuthError(err?.message || 'Failed to authenticate with Google.');
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
          scoreboardSync.setSessionUser(u.email);
        }
        return u;
      }
      return null;
    } catch (err: any) {
      console.error('Facebook Sign-In failed:', err);
      setAuthError(err?.message || 'Failed to authenticate with Facebook.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const signOut = async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
    setAuthError(null);
  };

  const updateAssignedCourt = async (courtName: string) => {
    if (!user) return;
    setProfile((prev) => (prev ? { ...prev, assignedCourt: courtName } : null));
    await saveOperatorSession(user.uid, { assignedCourt: courtName });
  };

  const saveSessionState = async (data: {
    scenes?: Scene[];
    scoreboard?: Partial<ScoreboardState>;
    settings?: Partial<StreamSettings>;
  }) => {
    if (!user) return;
    await saveOperatorSession(user.uid, data);
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
        clearAuthError,
        signOut,
        updateAssignedCourt,
        saveSessionState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
