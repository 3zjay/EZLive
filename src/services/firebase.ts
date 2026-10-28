import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Scene, ScoreboardState, StreamSettings } from '@/types/broadcast';
import { BrandKit } from '@/types/streamlabs';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCYw1Wg2YMdd3M6GRlA-dThBhjaYG7bys8',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'hoop-culture-scoreboard.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hoop-culture-scoreboard',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hoop-culture-scoreboard.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '953830619002',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:953830619002:web:e154a9c5118e7a0105c8c3',
};

// Initialize Firebase once
const defaultApp = getApps().find((a) => a.name === '[DEFAULT]');
export const app = defaultApp || initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const facebookProvider = new FacebookAuthProvider();
facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');

export interface UserSessionProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'operator' | 'admin' | 'guest';
  assignedCourt: string;
  activeGym?: string;
  lastLogin: unknown;
  savedScenes?: Scene[];
  scoreboardPreset?: Partial<ScoreboardState>;
  streamSettings?: Partial<StreamSettings>;
  brandKit?: Partial<BrandKit>;
}

/**
 * Sign in with Google Account
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserRecord(result.user);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign in with Facebook Account
 */
export async function signInWithFacebook(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    await syncUserRecord(result.user);
    return result.user;
  } catch (error) {
    console.error('Facebook Sign-In Error:', error);
    throw error;
  }
}

/**
 * Sign in with League Email & Password (matching Hoop Culture Scoreboard production standard)
 */
export async function signInWithLeagueCredentials(email: string, password: string): Promise<User | null> {
  const cleanEmail = email.trim().toLowerCase();
  
  // 1. Try Firebase Auth email/password first
  try {
    const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
    await syncUserRecord(res.user);
    return res.user;
  } catch (firebaseErr: any) {
    // 2. Fall back to authoritative league credentials (same as HoopCultureScoreboard/login.html)
    const isLeagueAdmin = (cleanEmail === 'admin@hoopculture.ca' || cleanEmail === 'isidro.pascua@gmail.com') && (password === 'hoopculture2026' || password === 'admin2026');
    if (isLeagueAdmin) {
      const safeUid = 'league_' + cleanEmail.replace(/[\.\#\$\[\]@]/g, '_');
      const leagueUser: any = {
        uid: safeUid,
        email: cleanEmail,
        displayName: cleanEmail.includes('isidro') ? 'Isidro Pascua (Commissioner)' : 'League Administrator',
        photoURL: '',
        emailVerified: true,
      };
      await syncUserRecord(leagueUser as User);
      return leagueUser as User;
    }
    throw firebaseErr;
  }
}

/**
 * Log out of current session
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Ensure user session profile exists in local cache (0ms instant, no disabled Firestore hanging)
 */
export async function syncUserRecord(user: User, assignedCourt: string = 'Court 1 - Main Gymnasium'): Promise<UserSessionProfile> {
  const profileKey = `ezlive_operator_profile_${user.uid}`;
  let existing: Partial<UserSessionProfile> = {};

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(profileKey);
      if (stored) {
        existing = JSON.parse(stored);
      }
    } catch (e) {}
  }

  const profile: UserSessionProfile = {
    uid: user.uid,
    displayName: user.displayName || existing.displayName || 'Court Operator',
    email: user.email || existing.email || '',
    photoURL: user.photoURL || existing.photoURL || '',
    role: 'operator',
    assignedCourt: existing.assignedCourt || assignedCourt,
    activeGym: existing.activeGym || 'Hoop Culture Arena',
    lastLogin: Date.now(),
    savedScenes: existing.savedScenes,
    scoreboardPreset: existing.scoreboardPreset,
    streamSettings: existing.streamSettings,
    brandKit: existing.brandKit,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(profileKey, JSON.stringify(profile));
    } catch (e) {}
  }

  return profile;
}

/**
 * Save per-person session data (scenes, court, score preferences)
 */
export async function saveOperatorSession(
  uid: string,
  data: {
    assignedCourt?: string;
    scenes?: Scene[];
    scoreboard?: Partial<ScoreboardState>;
    settings?: Partial<StreamSettings>;
    brandKit?: Partial<BrandKit>;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const key = `ezlive_operator_profile_${uid}`;
    const existing = await getOperatorSession(uid);
    const updated: UserSessionProfile = {
      ...(existing || {
        uid,
        displayName: 'Court Operator',
        email: '',
        photoURL: '',
        role: 'operator' as const,
        assignedCourt: 'Court 1 - Main Gymnasium',
        activeGym: 'Hoop Culture Arena',
        lastLogin: Date.now(),
      }),
      ...data,
      lastLogin: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.warn('Operator session save error:', err);
  }
}

/**
 * Retrieve operator session profile from local cache
 */
export async function getOperatorSession(uid: string): Promise<UserSessionProfile | null> {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(`ezlive_operator_profile_${uid}`);
    if (stored) {
      return JSON.parse(stored) as UserSessionProfile;
    }
  } catch (e) {}
  return null;
}

/**
 * Listen to auth state transitions
 */
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
