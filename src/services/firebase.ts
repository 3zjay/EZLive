import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import { Scene, ScoreboardState, StreamSettings } from '@/types/broadcast';
import { BrandKit } from '@/types/streamlabs';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyCYw1Wg2YMdd3M6GRlA-dThBhjaYG7bys8',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'hoop-culture-scoreboard.firebaseapp.com',
  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
    'https://hoop-culture-scoreboard-default-rtdb.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hoop-culture-scoreboard',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'hoop-culture-scoreboard.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '953830619002',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:953830619002:web:e154a9c5118e7a0105c8c3',
};

// Initialize Firebase once
const defaultApp = getApps().find((a) => a.name === '[DEFAULT]');
export const app = defaultApp || initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export const googleProvider = new GoogleAuthProvider();
// Request YouTube scopes during Google Sign-In so the operator's YouTube channel & stream key
// can be auto-linked to their cloud profile immediately in a single sign-in!
googleProvider.addScope('https://www.googleapis.com/auth/youtube');
googleProvider.addScope('https://www.googleapis.com/auth/youtube.readonly');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const youtubeGoogleProvider = new GoogleAuthProvider();
youtubeGoogleProvider.addScope('https://www.googleapis.com/auth/youtube');
youtubeGoogleProvider.addScope('https://www.googleapis.com/auth/youtube.readonly');
youtubeGoogleProvider.setCustomParameters({ prompt: 'select_account' });

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
  // Streamlabs-style Cloud Profile Connected Accounts
  connectedAccounts?: {
    google?: {
      connected: boolean;
      email: string;
      name: string;
      avatar?: string;
      updatedAt?: number;
    };
    facebook?: {
      connected: boolean;
      userId?: string;
      userName?: string;
      userEmail?: string;
      userPicture?: string;
      userToken?: string;
      selectedPageId?: string;
      selectedPageName?: string;
      selectedPageToken?: string;
      selectedGroupId?: string;
      selectedGroupName?: string;
      groupStreamKey?: string;
      destinationType?: 'page' | 'group' | 'timeline' | 'stream_key';
      updatedAt?: number;
    };
    youtube?: {
      connected: boolean;
      channelId?: string;
      channelTitle?: string;
      channelAvatar?: string;
      streamKey?: string;
      rtmpUrl?: string;
      accessToken?: string;
      updatedAt?: number;
    };
    customRtmp?: {
      enabled: boolean;
      serverUrl: string;
      streamKey: string;
    };
  };
}

/**
 * Sanitizes an email or UID into a safe Firebase Realtime Database key.
 * Keying by email ensures that whether an operator logs in via Google, Facebook, or League Email
 * on any device (phone, Fold 8 Ultra, tablet, or laptop), they share the exact same Cloud Profile!
 */
export function getCloudProfileKey(emailOrUid?: string | null, fallbackUid?: string): string {
  const raw = (emailOrUid || fallbackUid || 'default').toLowerCase().trim();
  return raw.replace(/[\.\#\$\[\]@\/]/g, '_');
}

/**
 * Removes undefined values recursively before writing to Firebase RTDB
 */
function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Hydrate browser localStorage from a loaded Cloud Profile so all components
 * (GoLiveModal, SettingsModal, StudioPage, ScoreboardSync) immediately have the
 * user's Facebook token, Page/Group, YouTube Stream Key, Custom RTMP, and Scenes on any new device!
 */
export function hydrateLocalStorageFromCloudProfile(profile: UserSessionProfile): void {
  if (typeof window === 'undefined' || !profile) return;
  try {
    const localKey = `ezlive_operator_profile_${profile.uid}`;
    localStorage.setItem(localKey, JSON.stringify(profile));
    if (profile.email) {
      localStorage.setItem('hc_session_user', profile.email);
      localStorage.setItem(`ezlive_operator_profile_${getCloudProfileKey(profile.email)}`, JSON.stringify(profile));
    }

    const fb = profile.connectedAccounts?.facebook || profile.streamSettings?.fbSettings;
    if (fb) {
      if (fb.userToken) localStorage.setItem('fb_user_access_token', fb.userToken);
      if (fb.userName) localStorage.setItem('fb_user_name', fb.userName);
      if (fb.userPicture) localStorage.setItem('fb_user_picture', fb.userPicture);
      if (fb.groupStreamKey) localStorage.setItem('hc_fb_stream_key', fb.groupStreamKey);
    }

    const yt = profile.connectedAccounts?.youtube || profile.streamSettings?.ytSettings;
    if (yt) {
      if (yt.streamKey) localStorage.setItem('hc_yt_stream_key', yt.streamKey);
      if (yt.accessToken) localStorage.setItem('yt_access_token', yt.accessToken);
      if (yt.channelTitle) localStorage.setItem('yt_channel_title', yt.channelTitle);
    }

    const customRtmp = profile.connectedAccounts?.customRtmp || profile.streamSettings?.customRtmpSettings;
    if (customRtmp) {
      if (customRtmp.serverUrl) localStorage.setItem('hc_custom_rtmp_url', customRtmp.serverUrl);
      if (customRtmp.streamKey) localStorage.setItem('hc_custom_rtmp_key', customRtmp.streamKey);
    }

    // Merge into ezlive_settings_v1
    const existingSettingsRaw = localStorage.getItem('ezlive_settings_v1');
    const existingSettings: Partial<StreamSettings> = existingSettingsRaw ? JSON.parse(existingSettingsRaw) : {};
    const mergedSettings: Partial<StreamSettings> = {
      ...existingSettings,
      ...(profile.streamSettings || {}),
      scoreboardSessionUser:
        profile.streamSettings?.scoreboardSessionUser ||
        profile.email ||
        existingSettings.scoreboardSessionUser ||
        'isidro.pascua@gmail.com',
      fbSettings: {
        mode: 'auto',
        userToken: fb?.userToken || existingSettings.fbSettings?.userToken || '',
        userName: fb?.userName || existingSettings.fbSettings?.userName || '',
        userPicture: fb?.userPicture || existingSettings.fbSettings?.userPicture || '',
        selectedPageId: fb?.selectedPageId || existingSettings.fbSettings?.selectedPageId || '',
        selectedPageName: fb?.selectedPageName || existingSettings.fbSettings?.selectedPageName || '',
        selectedPageToken: fb?.selectedPageToken || existingSettings.fbSettings?.selectedPageToken || '',
        selectedGroupId: fb?.selectedGroupId || existingSettings.fbSettings?.selectedGroupId || '',
        selectedGroupName: fb?.selectedGroupName || existingSettings.fbSettings?.selectedGroupName || '',
        groupStreamKey: fb?.groupStreamKey || existingSettings.fbSettings?.groupStreamKey || '',
        destinationType:
          (fb?.destinationType as 'page' | 'group' | 'timeline' | 'stream_key') ||
          existingSettings.fbSettings?.destinationType ||
          'page',
        broadcastTitle:
          profile.streamSettings?.fbSettings?.broadcastTitle ||
          existingSettings.fbSettings?.broadcastTitle ||
          '🏀 Hoop Culture Live Broadcast',
        broadcastDescription:
          profile.streamSettings?.fbSettings?.broadcastDescription ||
          existingSettings.fbSettings?.broadcastDescription ||
          'Streaming live from EZLiveStudio by HoopCulture',
      },
      ytSettings: {
        enabled: Boolean(yt?.streamKey || existingSettings.ytSettings?.enabled),
        streamKey: yt?.streamKey || existingSettings.ytSettings?.streamKey || '',
        channelId: yt?.channelId || existingSettings.ytSettings?.channelId || '',
        channelTitle: yt?.channelTitle || existingSettings.ytSettings?.channelTitle || '',
        channelAvatar: yt?.channelAvatar || existingSettings.ytSettings?.channelAvatar || '',
        rtmpUrl: yt?.rtmpUrl || existingSettings.ytSettings?.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2/',
        accessToken: yt?.accessToken || existingSettings.ytSettings?.accessToken || '',
      },
      customRtmpSettings: {
        enabled: Boolean(customRtmp?.enabled || existingSettings.customRtmpSettings?.enabled),
        serverUrl: customRtmp?.serverUrl || existingSettings.customRtmpSettings?.serverUrl || '',
        streamKey: customRtmp?.streamKey || existingSettings.customRtmpSettings?.streamKey || '',
      },
    };
    localStorage.setItem('ezlive_settings_v1', JSON.stringify(mergedSettings));

    if (profile.savedScenes && profile.savedScenes.length > 0) {
      localStorage.setItem('ezlive_scenes_v4', JSON.stringify(profile.savedScenes));
    }
  } catch (e) {
    console.warn('[CloudProfile] Hydration warning:', e);
  }
}

/**
 * Automatically provision / fetch the user's YouTube Channel & Reusable Stream Key
 * when a Google OAuth access token with YouTube scope is obtained, and save to Cloud Profile.
 */
export async function autoLinkYouTubeToProfile(
  user: User,
  accessToken: string
): Promise<{
  channelId?: string;
  channelTitle?: string;
  channelAvatar?: string;
  streamKey?: string;
  rtmpUrl?: string;
} | null> {
  if (!accessToken) return null;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yt_access_token', accessToken);
    }
    const res = await fetch('/api/youtube/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'connect_profile',
        accessToken,
      }),
    });
    const data = await res.json();
    if (data && (data.streamKey || data.channel)) {
      const ytInfo = {
        channelId: data.channel?.id || '',
        channelTitle: data.channel?.title || user.displayName || 'YouTube Channel',
        channelAvatar: data.channel?.avatar || user.photoURL || '',
        streamKey: data.streamKey || '',
        rtmpUrl: data.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2/',
      };
      if (typeof window !== 'undefined') {
        if (ytInfo.streamKey) localStorage.setItem('hc_yt_stream_key', ytInfo.streamKey);
        if (ytInfo.channelTitle) localStorage.setItem('yt_channel_title', ytInfo.channelTitle);
      }
      await saveOperatorSession(user.uid, {
        email: user.email || undefined,
        connectedAccounts: {
          youtube: {
            connected: true,
            ...ytInfo,
            accessToken,
            updatedAt: Date.now(),
          },
        },
      });
      return ytInfo;
    }
  } catch (e) {
    console.warn('[YouTube AutoLink] Warning:', e);
  }
  return null;
}

/**
 * Automatically fetch the user's managed Facebook Pages & Groups using their long-lived token
 * and persist the default Page/Group into their Cloud Profile.
 */
export async function autoLinkFacebookToProfile(
  uid: string,
  email: string,
  fbToken: string,
  fbUser: { id?: string; name?: string; email?: string; picture?: string }
): Promise<void> {
  if (!fbToken) return;
  try {
    let firstPage: { id: string; name: string; access_token: string } | null = null;
    let firstGroup: { id: string; name: string } | null = null;

    const pRes = await fetch('/api/facebook/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_pages', userAccessToken: fbToken }),
    });
    const pData = await pRes.json();
    if (pData.pages && pData.pages.length > 0) {
      firstPage = pData.pages[0];
    }

    const gRes = await fetch('/api/facebook/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get_groups', userAccessToken: fbToken }),
    });
    const gData = await gRes.json();
    if (gData.groups && gData.groups.length > 0) {
      firstGroup = gData.groups[0];
    }

    await saveOperatorSession(uid, {
      email: email || fbUser.email || undefined,
      connectedAccounts: {
        facebook: {
          connected: true,
          userId: fbUser.id || '',
          userName: fbUser.name || 'Facebook User',
          userEmail: fbUser.email || email || '',
          userPicture: fbUser.picture || '',
          userToken: fbToken,
          selectedPageId: firstPage?.id || undefined,
          selectedPageName: firstPage?.name || undefined,
          selectedPageToken: firstPage?.access_token || undefined,
          selectedGroupId: firstGroup?.id || undefined,
          selectedGroupName: firstGroup?.name || undefined,
          destinationType: firstPage ? 'page' : firstGroup ? 'group' : 'page',
          updatedAt: Date.now(),
        },
      },
    });
  } catch (e) {
    console.warn('[Facebook AutoLink] Warning:', e);
  }
}

/**
 * Check for pending Google OAuth Redirect result (used when mobile/WebView falls back to signInWithRedirect)
 */
export async function checkGoogleRedirectResult(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken || '';
      await syncUserRecord(result.user);
      if (accessToken) {
        await autoLinkYouTubeToProfile(result.user, accessToken);
      }
      return result.user;
    }
  } catch (err) {
    console.warn('Redirect result check warning:', err);
  }
  return null;
}

/**
 * Sign in with Google Account (with automatic YouTube channel linking & mobile redirect fallback)
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || '';
    await syncUserRecord(result.user);
    if (accessToken) {
      // Non-blocking background link of YouTube channel & persistent stream key
      autoLinkYouTubeToProfile(result.user, accessToken).catch(() => {});
    }
    return result.user;
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code || '';
    // If popup was blocked on mobile/WebView, seamlessly fall back to signInWithRedirect
    if (
      errCode === 'auth/popup-blocked' ||
      errCode === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

/**
 * Connect YouTube Channel via Google OAuth & return accessToken for YouTube Data API v3
 */
export async function connectYouTubeWithGoogle(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, youtubeGoogleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const accessToken = credential?.accessToken || '';
    await syncUserRecord(result.user);
    if (accessToken) {
      await autoLinkYouTubeToProfile(result.user, accessToken);
    }
    return { user: result.user, accessToken };
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code || '';
    if (
      errCode === 'auth/popup-blocked' ||
      errCode === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, youtubeGoogleProvider);
      throw new Error('Redirecting to Google to authorize YouTube Live...');
    }
    throw error;
  }
}

/**
 * Sign in with Facebook Account using our server-side Graph API OAuth (/api/auth/facebook/login)
 * This works across Web, Mobile, and Android WebView AND simultaneously grants a 60-day
 * Facebook Live token with Pages & Groups access in one single step!
 */
export async function signInWithFacebook(): Promise<User | null> {
  if (typeof window === 'undefined') return null;

  const isMobileOrAndroidApp =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Boolean((window as any).EZLiveNativeRTMP) ||
    /Android|iPhone|iPad|iPod|Mobile|EZLiveAndroidApp/i.test(navigator.userAgent);

  return new Promise<User | null>((resolve, reject) => {
    const w = 620;
    const h = 720;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const returnTo = encodeURIComponent(window.location.pathname || '/studio');
    const loginUrl = `/api/auth/facebook/login?return_to=${returnTo}`;

    // On Android WebView or mobile phones/tablets, use direct same-window redirect so it never gets stuck in an uncloseable popup tab
    if (isMobileOrAndroidApp) {
      window.location.href = loginUrl;
      resolve(null);
      return;
    }

    const popup = window.open(
      loginUrl,
      'EZLiveFacebookAuth',
      `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes`
    );

    if (!popup) {
      window.location.href = loginUrl;
      resolve(null);
      return;
    }

    let settled = false;
    let authChannel: BroadcastChannel | null = null;

    const cleanup = () => {
      window.removeEventListener('message', handleMsg);
      if (authChannel) {
        try {
          authChannel.close();
        } catch {}
      }
      clearInterval(pollTimer);
    };

    const completeWithFbPayload = async (
      token: string,
      fbUser: { id?: string; name?: string; email?: string; picture?: string }
    ) => {
      if (settled) return;
      settled = true;
      cleanup();

      const email = (fbUser.email || '').trim().toLowerCase();
      const safeUid = email
        ? 'fb_' + email.replace(/[\.\#\$\[\]@]/g, '_')
        : `fb_${fbUser.id || Date.now()}`;

      const userObj: unknown = {
        uid: safeUid,
        email: email || `${fbUser.id || 'user'}@facebook.com`,
        displayName: fbUser.name || 'Facebook Operator',
        photoURL: fbUser.picture || '',
        emailVerified: true,
      };

      try {
        localStorage.setItem('fb_user_access_token', token);
        if (fbUser.name) localStorage.setItem('fb_user_name', fbUser.name);
        if (fbUser.picture) localStorage.setItem('fb_user_picture', fbUser.picture);
        localStorage.setItem('ezlive_custom_auth_user', JSON.stringify(userObj));
      } catch {}

      await syncUserRecord(userObj as User);
      await autoLinkFacebookToProfile(safeUid, email, token, fbUser);
      resolve(userObj as User);
    };

    const handleMsg = (event: MessageEvent) => {
      if (event.data?.type === 'FB_AUTH_SUCCESS') {
        const { token, user } = event.data;
        if (token) {
          completeWithFbPayload(token, user || {});
        }
      } else if (event.data?.type === 'FB_AUTH_ERROR') {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(event.data.error || 'Facebook authentication failed.'));
        }
      }
    };

    window.addEventListener('message', handleMsg);

    try {
      authChannel = new BroadcastChannel('ezlive_auth_channel');
      authChannel.onmessage = (event) => {
        if (event.data?.type === 'FB_AUTH_SUCCESS' && event.data?.token) {
          completeWithFbPayload(event.data.token, event.data.user || {});
        }
      };
    } catch {}

    const pollTimer = setInterval(() => {
      // Also check if callback wrote to localStorage directly
      try {
        const freshJson = localStorage.getItem('fb_auth_callback_payload');
        if (freshJson) {
          localStorage.removeItem('fb_auth_callback_payload');
          const parsed = JSON.parse(freshJson);
          if (parsed.token) {
            completeWithFbPayload(parsed.token, parsed.user || {});
            return;
          }
        }
      } catch {}

      if (popup.closed && !settled) {
        settled = true;
        cleanup();
        reject(new Error('Facebook sign-in window was closed.'));
      }
    }, 600);
  });
}

/**
 * Connect Facebook Live via Popup & return accessToken
 */
export async function connectFacebookLiveWithPopup(): Promise<{ user: User; accessToken: string }> {
  const u = await signInWithFacebook();
  const token = (typeof window !== 'undefined' ? localStorage.getItem('fb_user_access_token') : '') || '';
  if (!u) {
    throw new Error('Facebook connection cancelled');
  }
  return { user: u, accessToken: token };
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
  } catch (firebaseErr: unknown) {
    // 2. Fall back to authoritative league credentials (same as HoopCultureScoreboard/login.html)
    const isLeagueAdmin =
      (cleanEmail === 'admin@hoopculture.ca' || cleanEmail === 'isidro.pascua@gmail.com') &&
      (password === 'hoopculture2026' || password === 'admin2026');
    if (isLeagueAdmin) {
      const safeUid = 'league_' + cleanEmail.replace(/[\.\#\$\[\]@]/g, '_');
      const leagueUser: unknown = {
        uid: safeUid,
        email: cleanEmail,
        displayName: cleanEmail.includes('isidro') ? 'Isidro Pascua (Commissioner)' : 'League Administrator',
        photoURL: '',
        emailVerified: true,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('ezlive_custom_auth_user', JSON.stringify(leagueUser));
        } catch {}
      }
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
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('ezlive_custom_auth_user');
    } catch {}
  }
  try {
    await firebaseSignOut(auth);
  } catch {}
}

/**
 * Sync user record with Firebase Realtime Database Cloud Profile (`states/ezlive_profiles/{profileKey}`)
 * and hydrate local storage so logging in on ANY new device restores Facebook, YouTube, stream keys, court, and scenes!
 */
export async function syncUserRecord(
  user: User,
  assignedCourt: string = 'Court 1 — Championship Hardwood'
): Promise<UserSessionProfile> {
  const cloudKey = getCloudProfileKey(user.email, user.uid);
  const localKey = `ezlive_operator_profile_${user.uid}`;
  let existingLocal: Partial<UserSessionProfile> = {};
  let existingCloud: Partial<UserSessionProfile> = {};

  if (typeof window !== 'undefined') {
    try {
      const stored =
        localStorage.getItem(localKey) ||
        localStorage.getItem(`ezlive_operator_profile_${cloudKey}`);
      if (stored) {
        existingLocal = JSON.parse(stored);
      }
    } catch {}
  }

  // 1. Pull operator's Cloud Profile from Firebase Realtime Database
  try {
    const cloudRef = ref(rtdb, `states/ezlive_profiles/${cloudKey}`);
    const snap = await get(cloudRef);
    if (snap.exists()) {
      existingCloud = snap.val() as Partial<UserSessionProfile>;
    }
  } catch (e) {
    console.warn('[CloudProfile] RTDB fetch warning:', e);
  }

  // Also capture any existing local Facebook/YouTube tokens on this device so they get uploaded to the Cloud Profile
  let localFbToken = '';
  let localFbName = '';
  let localFbPic = '';
  let localFbKey = '';
  let localYtKey = '';
  let localYtTitle = '';
  let localCustomUrl = '';
  let localCustomKey = '';
  let localSettingsObj: Partial<StreamSettings> = {};

  if (typeof window !== 'undefined') {
    try {
      localFbToken = localStorage.getItem('fb_user_access_token') || '';
      localFbName = localStorage.getItem('fb_user_name') || '';
      localFbPic = localStorage.getItem('fb_user_picture') || '';
      localFbKey = localStorage.getItem('hc_fb_stream_key') || '';
      localYtKey = localStorage.getItem('hc_yt_stream_key') || '';
      localYtTitle = localStorage.getItem('yt_channel_title') || '';
      localCustomUrl = localStorage.getItem('hc_custom_rtmp_url') || '';
      localCustomKey = localStorage.getItem('hc_custom_rtmp_key') || '';
      const rawSet = localStorage.getItem('ezlive_settings_v1');
      if (rawSet) localSettingsObj = JSON.parse(rawSet);
    } catch {}
  }

  const cloudFb = existingCloud.connectedAccounts?.facebook || existingCloud.streamSettings?.fbSettings;
  const localFb = existingLocal.connectedAccounts?.facebook || localSettingsObj.fbSettings;

  const mergedFb = {
    connected: Boolean(cloudFb?.userToken || localFb?.userToken || localFbToken || cloudFb?.groupStreamKey || localFbKey),
    userId: cloudFb?.userId || localFb?.userId || '',
    userName: cloudFb?.userName || localFb?.userName || localFbName || '',
    userEmail: cloudFb?.userEmail || user.email || '',
    userPicture: cloudFb?.userPicture || localFb?.userPicture || localFbPic || '',
    userToken: cloudFb?.userToken || localFb?.userToken || localFbToken || '',
    selectedPageId: cloudFb?.selectedPageId || localFb?.selectedPageId || '',
    selectedPageName: cloudFb?.selectedPageName || localFb?.selectedPageName || '',
    selectedPageToken: cloudFb?.selectedPageToken || localFb?.selectedPageToken || '',
    selectedGroupId: cloudFb?.selectedGroupId || localFb?.selectedGroupId || '',
    selectedGroupName: cloudFb?.selectedGroupName || localFb?.selectedGroupName || '',
    groupStreamKey: cloudFb?.groupStreamKey || localFb?.groupStreamKey || localFbKey || '',
    destinationType:
      (cloudFb?.destinationType as 'page' | 'group' | 'timeline' | 'stream_key') ||
      (localFb?.destinationType as 'page' | 'group' | 'timeline' | 'stream_key') ||
      'page',
    updatedAt: Date.now(),
  };

  const cloudYt = existingCloud.connectedAccounts?.youtube || existingCloud.streamSettings?.ytSettings;
  const localYt = existingLocal.connectedAccounts?.youtube || localSettingsObj.ytSettings;

  const mergedYt = {
    connected: Boolean(cloudYt?.streamKey || localYt?.streamKey || localYtKey),
    channelId: cloudYt?.channelId || localYt?.channelId || '',
    channelTitle: cloudYt?.channelTitle || localYt?.channelTitle || localYtTitle || '',
    channelAvatar: cloudYt?.channelAvatar || localYt?.channelAvatar || '',
    streamKey: cloudYt?.streamKey || localYt?.streamKey || localYtKey || '',
    rtmpUrl: cloudYt?.rtmpUrl || localYt?.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2/',
    accessToken: cloudYt?.accessToken || localYt?.accessToken || '',
    updatedAt: Date.now(),
  };

  const cloudCustom = existingCloud.connectedAccounts?.customRtmp || existingCloud.streamSettings?.customRtmpSettings;
  const localCustom = existingLocal.connectedAccounts?.customRtmp || localSettingsObj.customRtmpSettings;

  const mergedCustom = {
    enabled: Boolean(cloudCustom?.enabled ?? localCustom?.enabled ?? false),
    serverUrl: cloudCustom?.serverUrl || localCustom?.serverUrl || localCustomUrl || '',
    streamKey: cloudCustom?.streamKey || localCustom?.streamKey || localCustomKey || '',
  };

  const mergedStreamSettings: Partial<StreamSettings> = {
    ...localSettingsObj,
    ...(existingLocal.streamSettings || {}),
    ...(existingCloud.streamSettings || {}),
    scoreboardSessionUser:
      existingCloud.streamSettings?.scoreboardSessionUser ||
      user.email ||
      existingLocal.streamSettings?.scoreboardSessionUser ||
      'isidro.pascua@gmail.com',
    fbSettings: {
      mode: 'auto',
      broadcastTitle:
        existingCloud.streamSettings?.fbSettings?.broadcastTitle ||
        localSettingsObj.fbSettings?.broadcastTitle ||
        '🏀 Hoop Culture Live Broadcast',
      broadcastDescription:
        existingCloud.streamSettings?.fbSettings?.broadcastDescription ||
        localSettingsObj.fbSettings?.broadcastDescription ||
        'Streaming live from EZLiveStudio by HoopCulture',
      ...mergedFb,
    },
    ytSettings: {
      enabled: mergedYt.connected,
      ...mergedYt,
    },
    customRtmpSettings: mergedCustom,
  };

  const profile: UserSessionProfile = {
    uid: user.uid,
    displayName: user.displayName || existingCloud.displayName || existingLocal.displayName || 'Court Operator',
    email: user.email || existingCloud.email || existingLocal.email || '',
    photoURL: user.photoURL || existingCloud.photoURL || existingLocal.photoURL || '',
    role: 'operator',
    assignedCourt: existingCloud.assignedCourt || existingLocal.assignedCourt || assignedCourt,
    activeGym: existingCloud.activeGym || existingLocal.activeGym || 'Hoop Culture Arena',
    lastLogin: Date.now(),
    savedScenes: existingCloud.savedScenes || existingLocal.savedScenes,
    scoreboardPreset: existingCloud.scoreboardPreset || existingLocal.scoreboardPreset,
    streamSettings: mergedStreamSettings,
    brandKit: existingCloud.brandKit || existingLocal.brandKit,
    connectedAccounts: {
      google: {
        connected: Boolean(user.email),
        email: user.email || existingCloud.email || '',
        name: user.displayName || existingCloud.displayName || '',
        avatar: user.photoURL || existingCloud.photoURL || '',
        updatedAt: Date.now(),
      },
      facebook: mergedFb,
      youtube: mergedYt,
      customRtmp: mergedCustom,
    },
  };

  // 2. Hydrate localStorage on this device from the merged Cloud Profile
  hydrateLocalStorageFromCloudProfile(profile);

  // 3. Persist merged profile back to Firebase Realtime Database
  try {
    const cloudRef = ref(rtdb, `states/ezlive_profiles/${cloudKey}`);
    await set(cloudRef, stripUndefined(profile));
  } catch (e) {
    console.warn('[CloudProfile] RTDB save warning:', e);
  }

  return profile;
}

/**
 * Save per-person session data (scenes, court, Facebook/YouTube stream settings, brandKit)
 * to both localStorage AND Firebase Realtime Database Cloud Profile!
 */
export async function saveOperatorSession(
  uid: string,
  data: {
    email?: string;
    assignedCourt?: string;
    scenes?: Scene[];
    scoreboard?: Partial<ScoreboardState>;
    settings?: Partial<StreamSettings>;
    brandKit?: Partial<BrandKit>;
    connectedAccounts?: Partial<NonNullable<UserSessionProfile['connectedAccounts']>>;
  }
): Promise<UserSessionProfile | null> {
  if (typeof window === 'undefined') return null;
  try {
    const existing = await getOperatorSession(uid, data.email);
    const email = data.email || existing?.email || auth.currentUser?.email || localStorage.getItem('hc_session_user') || '';
    const cloudKey = getCloudProfileKey(email, uid);

    const nextSettings: Partial<StreamSettings> | undefined = data.settings
      ? { ...(existing?.streamSettings || {}), ...data.settings }
      : existing?.streamSettings;

    // Synchronize connectedAccounts whenever streamSettings or connectedAccounts are updated
    const prevAccounts = existing?.connectedAccounts || {};
    const fbFromSettings = nextSettings?.fbSettings;
    const ytFromSettings = nextSettings?.ytSettings;
    const customFromSettings = nextSettings?.customRtmpSettings;

    const updatedAccounts: NonNullable<UserSessionProfile['connectedAccounts']> = {
      ...prevAccounts,
      ...(data.connectedAccounts || {}),
      facebook: {
        ...(prevAccounts.facebook || { connected: false }),
        ...(fbFromSettings
          ? {
              connected: Boolean(fbFromSettings.userToken || fbFromSettings.groupStreamKey || prevAccounts.facebook?.userToken),
              userToken: fbFromSettings.userToken || prevAccounts.facebook?.userToken || '',
              userName: fbFromSettings.userName || prevAccounts.facebook?.userName || '',
              userPicture: fbFromSettings.userPicture || prevAccounts.facebook?.userPicture || '',
              selectedPageId: fbFromSettings.selectedPageId || prevAccounts.facebook?.selectedPageId || '',
              selectedPageName: fbFromSettings.selectedPageName || prevAccounts.facebook?.selectedPageName || '',
              selectedPageToken: fbFromSettings.selectedPageToken || prevAccounts.facebook?.selectedPageToken || '',
              selectedGroupId: fbFromSettings.selectedGroupId || prevAccounts.facebook?.selectedGroupId || '',
              selectedGroupName: fbFromSettings.selectedGroupName || prevAccounts.facebook?.selectedGroupName || '',
              groupStreamKey: fbFromSettings.groupStreamKey || prevAccounts.facebook?.groupStreamKey || '',
              destinationType:
                (fbFromSettings.destinationType as 'page' | 'group' | 'timeline' | 'stream_key') ||
                prevAccounts.facebook?.destinationType ||
                'page',
              updatedAt: Date.now(),
            }
          : {}),
        ...(data.connectedAccounts?.facebook || {}),
      },
      youtube: {
        ...(prevAccounts.youtube || { connected: false }),
        ...(ytFromSettings
          ? {
              connected: Boolean(ytFromSettings.streamKey || prevAccounts.youtube?.streamKey),
              streamKey: ytFromSettings.streamKey || prevAccounts.youtube?.streamKey || '',
              channelId: ytFromSettings.channelId || prevAccounts.youtube?.channelId || '',
              channelTitle: ytFromSettings.channelTitle || prevAccounts.youtube?.channelTitle || '',
              channelAvatar: ytFromSettings.channelAvatar || prevAccounts.youtube?.channelAvatar || '',
              rtmpUrl: ytFromSettings.rtmpUrl || prevAccounts.youtube?.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2/',
              accessToken: ytFromSettings.accessToken || prevAccounts.youtube?.accessToken || '',
              updatedAt: Date.now(),
            }
          : {}),
        ...(data.connectedAccounts?.youtube || {}),
      },
      customRtmp: {
        enabled: Boolean(
          data.connectedAccounts?.customRtmp?.enabled ??
            customFromSettings?.enabled ??
            prevAccounts.customRtmp?.enabled
        ),
        serverUrl:
          data.connectedAccounts?.customRtmp?.serverUrl ??
          customFromSettings?.serverUrl ??
          prevAccounts.customRtmp?.serverUrl ??
          '',
        streamKey:
          data.connectedAccounts?.customRtmp?.streamKey ??
          customFromSettings?.streamKey ??
          prevAccounts.customRtmp?.streamKey ??
          '',
      },
    };

    const updated: UserSessionProfile = {
      ...(existing || {
        uid,
        displayName: auth.currentUser?.displayName || 'Court Operator',
        email,
        photoURL: auth.currentUser?.photoURL || '',
        role: 'operator' as const,
        assignedCourt: 'Court 1 — Championship Hardwood',
        activeGym: 'Hoop Culture Arena',
        lastLogin: Date.now(),
      }),
      ...(data.assignedCourt ? { assignedCourt: data.assignedCourt } : {}),
      ...(data.scenes ? { savedScenes: data.scenes } : {}),
      ...(data.scoreboard ? { scoreboardPreset: data.scoreboard } : {}),
      ...(nextSettings ? { streamSettings: nextSettings } : {}),
      ...(data.brandKit ? { brandKit: data.brandKit } : {}),
      connectedAccounts: updatedAccounts,
      lastLogin: Date.now(),
    };

    hydrateLocalStorageFromCloudProfile(updated);

    // Push update to Firebase Realtime Database Cloud Profile
    try {
      const cloudRef = ref(rtdb, `states/ezlive_profiles/${cloudKey}`);
      await update(cloudRef, stripUndefined(updated) as unknown as Record<string, unknown>);
    } catch (rtdbErr) {
      console.warn('[CloudProfile] RTDB update warning:', rtdbErr);
    }

    return updated;
  } catch (err) {
    console.warn('Operator session save error:', err);
    return null;
  }
}

/**
 * Retrieve operator session profile from Firebase RTDB Cloud Profile (falling back to local cache)
 */
export async function getOperatorSession(uid: string, email?: string | null): Promise<UserSessionProfile | null> {
  if (typeof window === 'undefined') return null;
  const resolvedEmail = email || auth.currentUser?.email || localStorage.getItem('hc_session_user') || '';
  const cloudKey = getCloudProfileKey(resolvedEmail, uid);

  // 1. Check Firebase RTDB Cloud Profile first so new devices get latest cloud settings
  try {
    const cloudRef = ref(rtdb, `states/ezlive_profiles/${cloudKey}`);
    const snap = await get(cloudRef);
    if (snap.exists()) {
      const cloudProf = snap.val() as UserSessionProfile;
      hydrateLocalStorageFromCloudProfile(cloudProf);
      return cloudProf;
    }
  } catch {}

  // 2. Fallback to localStorage
  try {
    const stored =
      localStorage.getItem(`ezlive_operator_profile_${uid}`) ||
      localStorage.getItem(`ezlive_operator_profile_${cloudKey}`);
    if (stored) {
      return JSON.parse(stored) as UserSessionProfile;
    }
  } catch {}
  return null;
}

/**
 * Listen to auth state transitions
 */
export function onAuthChanged(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
