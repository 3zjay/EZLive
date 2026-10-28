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
  signInGoogle: () => Promise<void>;
  signInFacebook: () => Promise<void>;
  signInAsOperator: (email: string, displayName?: string) => Promise<void>;
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
  signInGoogle: async () => {},
  signInFacebook: async () => {},
  signInAsOperator: async () => {},
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

  const signInAsOperator = async (email: string, displayName?: string) => {
    const cleanEmail = (email || 'isidro.pascua@gmail.com').trim();
    const cleanName = displayName || (cleanEmail.toLowerCase().includes('isidro') ? 'Isidro Pascua (Commissioner)' : 'Court Operator');
    const safeUid = 'op_' + cleanEmail.replace(/[\.\#\$\[\]@]/g, '_');

    try {
      localStorage.setItem('hc_session_user', cleanEmail);
    } catch (e) {}

    const mockUser: any = {
      uid: safeUid,
      email: cleanEmail,
      displayName: cleanName,
      photoURL: '',
      emailVerified: true,
    };

    const mockProfile: UserSessionProfile = {
      uid: safeUid,
      displayName: cleanName,
      email: cleanEmail,
      photoURL: '',
      role: 'operator',
      assignedCourt: 'Court 1 - Main Gymnasium',
      activeGym: 'Hoop Culture Arena',
      lastLogin: Date.now(),
    };

    setUser(mockUser as User);
    setProfile(mockProfile);
    scoreboardSync.setSessionUser(cleanEmail);
    setAuthError(null);
  };

  useEffect(() => {
    // 1. Check saved operator session in localStorage (cross-app sync with HoopCultureScoreboard)
    try {
      const savedUser = localStorage.getItem('hc_session_user');
      if (savedUser) {
        signInAsOperator(savedUser);
      }
    } catch (e) {}

    // 2. Listen to Firebase Auth state
    const unsubscribe = onAuthChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const prof = await getOperatorSession(firebaseUser.uid);
          if (prof) {
            setProfile(prof);
          } else {
            const synced = await syncUserRecord(firebaseUser);
            setProfile(synced);
          }
          if (firebaseUser.email) {
            try {
              localStorage.setItem('hc_session_user', firebaseUser.email);
            } catch (e) {}
            scoreboardSync.setSessionUser(firebaseUser.email);
          }
        } catch (err) {
          console.warn('Error fetching operator session:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInGoogle = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const u = await signInWithGoogle();
      if (u) {
        const prof = await syncUserRecord(u);
        setProfile(prof);
        if (u.email) {
          try {
            localStorage.setItem('hc_session_user', u.email);
          } catch (e) {}
          scoreboardSync.setSessionUser(u.email);
        }
      }
    } catch (err: any) {
      console.warn('Google Sign-In failed or was blocked:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError('Local domain not authorized in Google OAuth. Click Quick Sign-In below to enter directly as Isidro Pascua.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setAuthError('Google sign-in popup was closed.');
      } else {
        setAuthError(err?.message || 'Authentication error. Use 1-Click Quick Sign-In below.');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInFacebook = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const u = await signInWithFacebook();
      if (u) {
        const prof = await syncUserRecord(u);
        setProfile(prof);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Facebook authentication error.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearAuthError = () => setAuthError(null);

  const signOut = async () => {
    try {
      localStorage.removeItem('hc_session_user');
    } catch (e) {}
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
        signInAsOperator,
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
