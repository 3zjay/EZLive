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

interface AuthContextType {
  user: User | null;
  profile: UserSessionProfile | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInFacebook: () => Promise<void>;
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
  signInGoogle: async () => {},
  signInFacebook: async () => {},
  signOut: async () => {},
  updateAssignedCourt: async () => {},
  saveSessionState: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserSessionProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const signInGoogle = async () => {
    setLoading(true);
    try {
      const u = await signInWithGoogle();
      if (u) {
        const prof = await syncUserRecord(u);
        setProfile(prof);
      }
    } finally {
      setLoading(false);
    }
  };

  const signInFacebook = async () => {
    setLoading(true);
    try {
      const u = await signInWithFacebook();
      if (u) {
        const prof = await syncUserRecord(u);
        setProfile(prof);
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await logoutUser();
    setUser(null);
    setProfile(null);
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
        signInGoogle,
        signInFacebook,
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
