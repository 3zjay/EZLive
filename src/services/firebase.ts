import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
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
export const db = getFirestore(app);

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
 * Log out of current session
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Ensure user document exists in Firestore and sync metadata
 */
export async function syncUserRecord(user: User, assignedCourt: string = 'Court 1 - Main Gymnasium'): Promise<UserSessionProfile> {
  const localProfile: UserSessionProfile = {
    uid: user.uid,
    displayName: user.displayName || 'Court Operator',
    email: user.email || '',
    photoURL: user.photoURL || '',
    role: 'operator',
    assignedCourt,
    activeGym: 'Hoop Culture Arena',
    lastLogin: Date.now(),
  };

  try {
    const userRef = doc(db, 'ezlive_operators', user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, { ...localProfile, lastLogin: serverTimestamp() });
      return localProfile;
    } else {
      await updateDoc(userRef, {
        lastLogin: serverTimestamp(),
        displayName: user.displayName || snap.data()?.displayName || 'Court Operator',
        photoURL: user.photoURL || snap.data()?.photoURL || '',
      });
      return snap.data() as UserSessionProfile;
    }
  } catch (err) {
    console.warn('Firestore user record sync skipped (using local operator profile):', err);
    return localProfile;
  }
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
  try {
    const userRef = doc(db, 'ezlive_operators', uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Operator session save error (falling back to local cache):', err);
  }
}

/**
 * Retrieve operator session profile from Firestore
 */
export async function getOperatorSession(uid: string): Promise<UserSessionProfile | null> {
  try {
    const userRef = doc(db, 'ezlive_operators', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserSessionProfile;
    }
  } catch (err) {
    console.warn('Operator session load error:', err);
  }
  return null;
}

/**
 * Listen to auth state changes
 */
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
