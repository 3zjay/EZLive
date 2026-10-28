import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, Unsubscribe, Database } from 'firebase/database';
import { ScoreboardState } from '@/types/broadcast';

// Official Hoop Culture Scoreboard Realtime Database configuration
export const SCOREBOARD_RTDB_CONFIG = {
  apiKey: "AIzaSyCYw1Wg2YMdd3M6GRlA-dThBhjaYG7bys8",
  authDomain: "hoop-culture-scoreboard.firebaseapp.com",
  databaseURL: "https://hoop-culture-scoreboard-default-rtdb.firebaseio.com",
  projectId: "hoop-culture-scoreboard",
  storageBucket: "hoop-culture-scoreboard.firebasestorage.app",
  messagingSenderId: "953830619002",
  appId: "1:953830619002:web:e154a9c5118e7a0105c8c3",
};

/**
 * Sanitizes an email address or session name into a Firebase Realtime Database safe path.
 * In Firebase RTDB, keys cannot contain '.', '#', '$', '[', or ']'.
 * e.g. "isidro.pascua@gmail.com" -> "isidro_pascua@gmail_com"
 */
export function sanitizeSessionKey(input: string): string {
  if (!input) return 'default';
  return input.toLowerCase().trim().replace(/[\.\#\$\[\]]/g, '_');
}

/**
 * Formats game seconds (e.g. 600) into "MM:SS" (e.g. "10:00")
 */
export function formatClockSeconds(totalSeconds?: number): string {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return '10:00';
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Converts raw state object S from HoopCultureScoreboard into EZLive ScoreboardState
 */
export function normalizeScoreboardState(raw: any, syncSource: ScoreboardState['syncSource'] = 'firebase_rtdb'): ScoreboardState {
  if (!raw || typeof raw !== 'object') {
    return {
      homeTeam: 'HOME',
      awayTeam: 'AWAY',
      homeScore: 0,
      awayScore: 0,
      period: 1,
      gameClock: '10:00',
      isClockRunning: false,
      shotClock: 24,
      homeFouls: 0,
      awayFouls: 0,
      homeTimeouts: 2,
      awayTimeouts: 2,
      bannerText: '',
      sponsorName: '',
      possession: 'none',
      syncSource,
      lastSyncTimestamp: Date.now(),
    };
  }

  // Handle game clock
  let gameClock = '10:00';
  if (typeof raw.gameClock === 'string' && raw.gameClock.includes(':')) {
    gameClock = raw.gameClock;
  } else if (typeof raw.gameSeconds === 'number') {
    gameClock = formatClockSeconds(raw.gameSeconds);
  }

  // Handle possession
  let possession: 'home' | 'away' | 'none' = 'none';
  if (raw.possession === 'home' || raw.possession === 'away') {
    possession = raw.possession;
  }

  // Handle banner text / sponsors from rp1 / rp2
  let bannerText = raw.bannerText || '';
  if (!bannerText && (raw.rp1Title || raw.rp1Value)) {
    bannerText = `${raw.rp1Title || 'BROADCAST'}: ${raw.rp1Value || ''}`.trim();
  }

  let sponsorName = raw.sponsorName || '';
  if (!sponsorName && (raw.rp2Title || raw.rp2Value)) {
    sponsorName = `${raw.rp2Title || 'VENUE'}: ${raw.rp2Value || ''}`.trim();
  }

  return {
    homeTeam: (raw.homeAbbr || raw.homeTeam || 'HOME').trim(),
    awayTeam: (raw.awayAbbr || raw.awayTeam || 'AWAY').trim(),
    homeScore: Number(raw.homeScore) || 0,
    awayScore: Number(raw.awayScore) || 0,
    period: Number(raw.quarter ?? raw.period) || 1,
    gameClock,
    isClockRunning: Boolean(raw.gameRunning ?? raw.isClockRunning),
    shotClock: Number(raw.shotSeconds ?? raw.shotClock ?? 24),
    homeFouls: Number(raw.homeFouls) || 0,
    awayFouls: Number(raw.awayFouls) || 0,
    homeTimeouts: Number(raw.homeTimeouts) || 2,
    awayTimeouts: Number(raw.awayTimeouts) || 2,
    bannerText,
    sponsorName,
    possession,
    // Extra styling attributes from HoopCultureScoreboard
    homeColor: raw.homeColor || '#f5c842',
    awayColor: raw.awayColor || '#c8102e',
    homeLogo: raw.homeLogoThumb || raw.homeLogo || null,
    awayLogo: raw.awayLogoThumb || raw.awayLogo || null,
    homeAbbr: raw.homeAbbr || raw.homeTeam || 'HOME',
    awayAbbr: raw.awayAbbr || raw.awayTeam || 'AWAY',
    quarter: Number(raw.quarter ?? raw.period) || 1,
    gameSeconds: typeof raw.gameSeconds === 'number' ? raw.gameSeconds : 600,
    shotSeconds: typeof raw.shotSeconds === 'number' ? raw.shotSeconds : 24,
    homeRecord: raw.homeRecord || '0-0',
    awayRecord: raw.awayRecord || '0-0',
    syncSource,
    lastSyncTimestamp: Date.now(),
  };
}

export type ScoreboardSyncListener = (state: ScoreboardState) => void;

class ScoreboardSyncManager {
  private listeners: Set<ScoreboardSyncListener> = new Set();
  private currentState: ScoreboardState | null = null;
  private currentSessionUser: string = 'default';
  private currentSafeKey: string = 'default';

  // Firebase Realtime DB references
  private scoreboardApp: FirebaseApp | null = null;
  private scoreboardDb: Database | null = null;
  private rtdbUnsubscribe: Unsubscribe | null = null;

  // Local Broadcast Channels
  private hcBroadcastChannel: BroadcastChannel | null = null;
  private ezBroadcastChannel: BroadcastChannel | null = null;

  // Local SSE Fallback
  private eventSource: EventSource | null = null;

  // Status indicators
  public isConnected: boolean = false;
  public connectionType: 'firebase_rtdb' | 'broadcast_channel' | 'local_sse' | 'disconnected' = 'disconnected';
  public lastSyncTime: number = 0;

  constructor() {
    this.initFirebase();
    this.initBroadcastChannels();
  }

  private initFirebase() {
    if (typeof window === 'undefined') return;
    try {
      const appName = 'hoopCultureScoreboardRTDB';
      const existing = getApps().find((a) => a.name === appName);
      this.scoreboardApp = existing || initializeApp(SCOREBOARD_RTDB_CONFIG, appName);
      this.scoreboardDb = getDatabase(this.scoreboardApp);
    } catch (err) {
      console.warn('[ScoreboardSync] Firebase RTDB init error:', err);
    }
  }

  private initBroadcastChannels() {
    if (typeof window === 'undefined') return;

    // 1. Listen to HoopCultureScoreboard's native BroadcastChannel ('hc_scoreboard_sync')
    try {
      this.hcBroadcastChannel = new BroadcastChannel('hc_scoreboard_sync');
      this.hcBroadcastChannel.onmessage = (event) => {
        if (!event.data) return;
        const msg = event.data;
        // Check message type: { type: 'state', user: fbUser, data: S }
        if (msg.type === 'state' && msg.data) {
          const msgUser = sanitizeSessionKey(msg.user || '');
          // If message belongs to active user or active user is default
          if (!this.currentSafeKey || this.currentSafeKey === 'default' || msgUser === this.currentSafeKey) {
            const normalized = normalizeScoreboardState(msg.data, 'broadcast_channel');
            normalized.syncKey = msgUser;
            this.handleStateUpdate(normalized, 'broadcast_channel');
          }
        }
      };
    } catch (e) {
      console.warn('[ScoreboardSync] BroadcastChannel (hc_scoreboard_sync) unavailable:', e);
    }

    // 2. Also listen to EZLive's legacy channel ('ezlive_scoreboard_channel')
    try {
      this.ezBroadcastChannel = new BroadcastChannel('ezlive_scoreboard_channel');
      this.ezBroadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'EZ_SCOREBOARD_UPDATE' && event.data.payload) {
          const normalized = normalizeScoreboardState(event.data.payload, 'broadcast_channel');
          this.handleStateUpdate(normalized, 'broadcast_channel');
        }
      };
    } catch (e) {}

    // 3. Listen to window postMessage for embedded overlays / iframes
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (event.data.type === 'EZ_SCOREBOARD_UPDATE' && event.data.payload) {
        const normalized = normalizeScoreboardState(event.data.payload, 'broadcast_channel');
        this.handleStateUpdate(normalized, 'broadcast_channel');
      } else if (event.data.type === 'state' && event.data.data) {
        const normalized = normalizeScoreboardState(event.data.data, 'broadcast_channel');
        this.handleStateUpdate(normalized, 'broadcast_channel');
      }
    });
  }

  /**
   * Set the active operator email or court session to sync with.
   * e.g. "isidro.pascua@gmail.com" or "court-1"
   */
  public setSessionUser(userEmailOrSession: string) {
    const safeKey = sanitizeSessionKey(userEmailOrSession);
    if (this.currentSafeKey === safeKey && this.isConnected) {
      return;
    }

    this.currentSessionUser = userEmailOrSession || 'default';
    this.currentSafeKey = safeKey;

    // Reconnect Firebase RTDB listener to the new session path: states/{safeKey}
    this.connectFirebaseRTDB(safeKey);
  }

  private connectFirebaseRTDB(safeKey: string) {
    if (!this.scoreboardDb) return;

    if (this.rtdbUnsubscribe) {
      this.rtdbUnsubscribe();
      this.rtdbUnsubscribe = null;
    }

    try {
      const stateRef = ref(this.scoreboardDb, `states/${safeKey}`);
      this.rtdbUnsubscribe = onValue(
        stateRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const rawData = snapshot.val();
            const normalized = normalizeScoreboardState(rawData, 'firebase_rtdb');
            normalized.syncKey = safeKey;
            this.handleStateUpdate(normalized, 'firebase_rtdb');
          }
        },
        (error) => {
          console.warn(`[ScoreboardSync] RTDB listener error for states/${safeKey}:`, error);
        }
      );
    } catch (err) {
      console.warn('[ScoreboardSync] Error connecting to RTDB:', err);
    }
  }

  /**
   * Connect to local gym Node.js server (Mode 1 / Offline gym hotspot)
   * e.g. http://localhost:3000 or http://192.168.137.1:3000
   */
  public connectLocalServer(hostUrl: string = 'http://localhost:3000') {
    if (typeof window === 'undefined') return;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    try {
      const cleanUrl = hostUrl.replace(/\/+$/, '');
      const sseUrl = `${cleanUrl}/events?user=${encodeURIComponent(this.currentSessionUser)}`;
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'state' && msg.data) {
            const normalized = normalizeScoreboardState(msg.data, 'local_sse');
            this.handleStateUpdate(normalized, 'local_sse');
          }
        } catch (e) {}
      };

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;
      };
    } catch (e) {
      console.warn('[ScoreboardSync] Local SSE connection error:', e);
    }
  }

  private handleStateUpdate(state: ScoreboardState, source: 'firebase_rtdb' | 'broadcast_channel' | 'local_sse') {
    this.currentState = state;
    this.isConnected = true;
    this.connectionType = source;
    this.lastSyncTime = Date.now();

    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[ScoreboardSync] Listener callback error:', err);
      }
    });
  }

  public subscribe(listener: ScoreboardSyncListener): () => void {
    this.listeners.add(listener);
    if (this.currentState) {
      listener(this.currentState);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): ScoreboardState | null {
    return this.currentState;
  }

  public getSessionInfo() {
    return {
      sessionUser: this.currentSessionUser,
      safeKey: this.currentSafeKey,
      isConnected: this.isConnected,
      connectionType: this.connectionType,
      lastSyncTime: this.lastSyncTime,
    };
  }
}

// Global Singleton Instance
export const scoreboardSync = new ScoreboardSyncManager();
