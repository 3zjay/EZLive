import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, get, Unsubscribe, Database } from 'firebase/database';
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

export function parseQuarterValue(q: unknown): number {
  if (typeof q === 'number' && !isNaN(q)) {
    return q === 0 ? 1 : q;
  }
  if (typeof q === 'string') {
    const up = q.trim().toUpperCase();
    if (up === 'OT' || up === '1OT') return 5;
    if (up === '2OT') return 6;
    if (up === '3OT') return 7;
    const parsed = parseInt(up, 10);
    if (!isNaN(parsed)) return parsed === 0 ? 1 : parsed;
  }
  return 1;
}

export const DEFAULT_SCOREBOARD_STATE: ScoreboardState = {
  homeTeam: 'HOME',
  awayTeam: 'AWAY',
  homeName: 'HOME',
  awayName: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  period: 1,
  gameClock: '10:00',
  isClockRunning: false,
  shotRunning: false,
  shotClock: 24,
  homeFouls: 0,
  awayFouls: 0,
  homeTimeouts: 2,
  awayTimeouts: 2,
  bannerText: 'BROADCAST: Facebook',
  sponsorName: 'VENUE: Audley',
  rp1Title: 'BROADCAST',
  rp1Value: 'Facebook',
  rp2Title: 'VENUE',
  rp2Value: 'Audley',
  broadcast: 'Facebook',
  venue: 'Audley',
  possession: 'none',
  periodDisabled: false,
  shotClockDisabled: false,
  aiSyncEnabled: false,
  aiSyncActive: false,
  gameClockStream: null,
  shotClockStream: null,
  homeScoreStream: null,
  awayScoreStream: null,
  periodStream: null,
  enabledCrops: { clock: true, shot: true, home: true, away: true, period: true },
  invertStates: { home: false, away: false, clock: false, shot: false, period: false },
};

/**
 * Converts raw state object S from HoopCultureScoreboard into EZLive ScoreboardState
 */
export function normalizeScoreboardState(raw: any, syncSource: ScoreboardState['syncSource'] = 'firebase_rtdb'): ScoreboardState {
  if (!raw || typeof raw !== 'object') {
    return {
      ...DEFAULT_SCOREBOARD_STATE,
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

  const rp1Title = raw.rp1Title ?? 'BROADCAST';
  const rp1Value = raw.rp1Value !== undefined ? raw.rp1Value : raw.broadcast;
  const rp2Title = raw.rp2Title ?? 'VENUE';
  const rp2Value = raw.rp2Value !== undefined ? raw.rp2Value : raw.venue;

  // Handle banner text / sponsors from rp1 / rp2
  let bannerText = raw.bannerText || '';
  if (!bannerText && (rp1Title || rp1Value)) {
    bannerText = `${rp1Title || 'BROADCAST'}: ${rp1Value || ''}`.trim();
  }

  let sponsorName = raw.sponsorName || '';
  if (!sponsorName && (rp2Title || rp2Value)) {
    sponsorName = `${rp2Title || 'VENUE'}: ${rp2Value || ''}`.trim();
  }

  const periodNum = parseQuarterValue(raw.quarter ?? raw.period);
  const homeAbbr = String(raw.homeAbbr || raw.homeTeam || raw.homeName || 'HOME').trim();
  const awayAbbr = String(raw.awayAbbr || raw.awayTeam || raw.awayName || 'AWAY').trim();

  return {
    homeTeam: homeAbbr,
    awayTeam: awayAbbr,
    homeName: String(raw.homeName || raw.homeAbbr || raw.homeTeam || 'HOME').trim(),
    awayName: String(raw.awayName || raw.awayAbbr || raw.awayTeam || 'AWAY').trim(),
    homeScore: Number(raw.homeScore) || 0,
    awayScore: Number(raw.awayScore) || 0,
    period: periodNum,
    gameClock,
    isClockRunning: Boolean(raw.gameRunning ?? raw.isClockRunning ?? raw.clockRunning),
    shotRunning: Boolean(raw.shotRunning ?? raw.clockRunning ?? raw.gameRunning),
    shotClock: Number(raw.shotSeconds ?? raw.shotClock ?? 24),
    homeFouls: Number(raw.homeFouls) || 0,
    awayFouls: Number(raw.awayFouls) || 0,
    homeTimeouts: Number(raw.homeTimeouts) || 2,
    awayTimeouts: Number(raw.awayTimeouts) || 2,
    bannerText,
    sponsorName,
    rp1Title,
    rp1Value: rp1Value ?? undefined,
    rp2Title,
    rp2Value: rp2Value ?? undefined,
    broadcast: raw.broadcast ?? rp1Value ?? undefined,
    venue: raw.venue ?? rp2Value ?? undefined,
    barColor: raw.barColor,
    possession,
    // Extra styling & overlay flags from HoopCultureScoreboard
    homeColor: raw.homeColor || '#f5c842',
    awayColor: raw.awayColor || '#c8102e',
    homeLogo: raw.homeLogo || raw.homeLogoThumb || null,
    awayLogo: raw.awayLogo || raw.awayLogoThumb || null,
    homeAbbr,
    awayAbbr,
    quarter: periodNum,
    gameSeconds: typeof raw.gameSeconds === 'number' ? raw.gameSeconds : 600,
    shotSeconds: typeof raw.shotSeconds === 'number' ? raw.shotSeconds : 24,
    homeRecord: raw.homeRecord || '0-0',
    awayRecord: raw.awayRecord || '0-0',
    periodDisabled: Boolean(raw.periodDisabled),
    shotClockDisabled: Boolean(raw.shotClockDisabled),
    aiSyncEnabled: raw.aiSyncEnabled !== undefined ? Boolean(raw.aiSyncEnabled) : undefined,
    aiSyncActive: raw.aiSyncActive !== undefined ? Boolean(raw.aiSyncActive) : (raw.streamActive !== undefined ? Boolean(raw.streamActive) : undefined),
    gameClockStream: raw.gameClockStream !== undefined ? raw.gameClockStream : undefined,
    shotClockStream: raw.shotClockStream !== undefined ? raw.shotClockStream : undefined,
    homeScoreStream: raw.homeScoreStream !== undefined ? raw.homeScoreStream : undefined,
    awayScoreStream: raw.awayScoreStream !== undefined ? raw.awayScoreStream : undefined,
    periodStream: raw.periodStream !== undefined ? raw.periodStream : undefined,
    enabledCrops: raw.enabledCrops,
    invertStates: raw.invertStates,
    syncSource,
    lastSyncTimestamp: Date.now(),
  };
}

export type ScoreboardSyncListener = (state: ScoreboardState) => void;
export type ScoreboardStreamListener = (streamData: Record<string, any>) => void;

class ScoreboardSyncManager {
  private listeners: Set<ScoreboardSyncListener> = new Set();
  private streamListeners: Set<ScoreboardStreamListener> = new Set();
  private currentState: ScoreboardState | null = null;
  private latestOcrState: {
    aiSyncActive: boolean;
    gameClockStream: string | null;
    shotClockStream: string | null;
    homeScoreStream: string | null;
    awayScoreStream: string | null;
    periodStream: string | null;
    enabledCrops?: ScoreboardState['enabledCrops'];
    invertStates?: ScoreboardState['invertStates'];
  } = {
    aiSyncActive: false,
    gameClockStream: null,
    shotClockStream: null,
    homeScoreStream: null,
    awayScoreStream: null,
    periodStream: null,
  };
  private lastDedicatedShotCamTime = 0;
  private currentSessionUser: string = 'default';
  private currentSafeKey: string = 'default';

  // Firebase Realtime DB references
  private scoreboardApp: FirebaseApp | null = null;
  private scoreboardDb: Database | null = null;
  private rtdbUnsubscribe: Unsubscribe | null = null;
  private rtdbOcrUnsubscribe: Unsubscribe | null = null;

  // Local Broadcast Channels
  private hcBroadcastChannel: BroadcastChannel | null = null;
  private legacyBroadcastChannel: BroadcastChannel | null = null;
  private ocrBroadcastChannel: BroadcastChannel | null = null;
  private ezBroadcastChannel: BroadcastChannel | null = null;
  private channelsInitialized = false;

  // Local SSE Fallback
  private eventSource: EventSource | null = null;

  // Status indicators
  public isConnected: boolean = false;
  public connectionType: 'firebase_rtdb' | 'broadcast_channel' | 'local_sse' | 'disconnected' = 'disconnected';
  public lastSyncTime: number = 0;

  constructor() {
    this.initFirebase();
    this.initBroadcastChannels();
    this.setSessionUser('isidro.pascua@gmail.com');
  }

  private ensureInitialized() {
    if (typeof window === 'undefined') return;
    if (!this.scoreboardDb) {
      this.initFirebase();
    }
    if (!this.channelsInitialized) {
      this.initBroadcastChannels();
    }
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

  private handleIncomingHcMessage(msg: any, defaultUser?: string) {
    if (!msg || typeof msg !== 'object') return;
    if (typeof msg._ezSender === 'string' && msg._ezSender.startsWith('ezlive_sync')) return;
    if (msg.type === 'state' && msg.data) {
      const msgUser = sanitizeSessionKey(msg.user || defaultUser || '');
      if (!this.currentSafeKey || this.currentSafeKey === 'default' || !msg.user || msgUser === this.currentSafeKey) {
        const normalized = normalizeScoreboardState(msg.data, 'broadcast_channel');
        normalized.syncKey = msgUser || this.currentSafeKey;
        this.handleStateUpdate(normalized, 'broadcast_channel');
      }
    } else if (msg.type === 'stream' || msg.type === 'ocr') {
      const ocrPayload = msg.data || msg;
      this.handleOcrStreamUpdate(ocrPayload);
    } else if (msg.gameClockStream !== undefined || msg.shotClockStream !== undefined) {
      this.handleOcrStreamUpdate(msg);
    }
  }

  private handleOcrStreamUpdate(streamData: Record<string, any>) {
    if (!streamData || typeof streamData !== 'object') return;
    const role = streamData.role || 'all';

    if (streamData.streamActive === false) {
      if (role === 'shot') {
        this.latestOcrState.shotClockStream = null;
      } else if (role === 'main') {
        this.latestOcrState.gameClockStream = null;
        this.latestOcrState.homeScoreStream = null;
        this.latestOcrState.awayScoreStream = null;
        this.latestOcrState.periodStream = null;
      } else {
        this.latestOcrState.aiSyncActive = false;
        this.latestOcrState.gameClockStream = null;
        this.latestOcrState.shotClockStream = null;
        this.latestOcrState.homeScoreStream = null;
        this.latestOcrState.awayScoreStream = null;
        this.latestOcrState.periodStream = null;
      }
    } else {
      this.latestOcrState.aiSyncActive = true;
      const isLocalShotOnly =
        role === 'shot' &&
        streamData.homeScoreStream === undefined &&
        streamData.awayScoreStream === undefined &&
        streamData.gameClockStream === undefined &&
        streamData.periodStream === undefined;

      if (!isLocalShotOnly) {
        if (streamData.gameClockStream !== undefined) this.latestOcrState.gameClockStream = streamData.gameClockStream;
        if (streamData.homeScoreStream !== undefined) this.latestOcrState.homeScoreStream = streamData.homeScoreStream;
        if (streamData.awayScoreStream !== undefined) this.latestOcrState.awayScoreStream = streamData.awayScoreStream;
        if (streamData.periodStream !== undefined) this.latestOcrState.periodStream = streamData.periodStream;
      }

      if (role === 'shot') {
        this.lastDedicatedShotCamTime = Date.now();
      }
      if (streamData.shotClockStream !== undefined) {
        if (role === 'shot' || !isLocalShotOnly || Date.now() - this.lastDedicatedShotCamTime > 45000) {
          this.latestOcrState.shotClockStream = streamData.shotClockStream;
        }
      }

      if (streamData.enabledCrops) {
        this.latestOcrState.enabledCrops = { ...this.latestOcrState.enabledCrops, ...streamData.enabledCrops };
        if (!isLocalShotOnly) {
          if (streamData.enabledCrops.clock === false) this.latestOcrState.gameClockStream = null;
          if (streamData.enabledCrops.home === false) this.latestOcrState.homeScoreStream = null;
          if (streamData.enabledCrops.away === false) this.latestOcrState.awayScoreStream = null;
          if (streamData.enabledCrops.period === false) this.latestOcrState.periodStream = null;
        }
        if (streamData.enabledCrops.shot === false && (role === 'shot' || !isLocalShotOnly || Date.now() - this.lastDedicatedShotCamTime > 45000)) {
          this.latestOcrState.shotClockStream = null;
        }
      }
      if (streamData.invertStates) {
        this.latestOcrState.invertStates = { ...this.latestOcrState.invertStates, ...streamData.invertStates };
      }
    }

    // Update optical crop fields in-place for compositor consumers without re-triggering React state updates at 10 FPS
    const targetState: ScoreboardState = this.currentState || { ...DEFAULT_SCOREBOARD_STATE };
    targetState.aiSyncActive = this.latestOcrState.aiSyncActive;
    targetState.gameClockStream = this.latestOcrState.gameClockStream;
    targetState.shotClockStream = this.latestOcrState.shotClockStream;
    targetState.homeScoreStream = this.latestOcrState.homeScoreStream;
    targetState.awayScoreStream = this.latestOcrState.awayScoreStream;
    targetState.periodStream = this.latestOcrState.periodStream;
    if (this.latestOcrState.enabledCrops !== undefined) {
      targetState.enabledCrops = this.latestOcrState.enabledCrops;
    }
    if (this.latestOcrState.invertStates !== undefined) {
      targetState.invertStates = this.latestOcrState.invertStates;
    }
    targetState.lastSyncTimestamp = Date.now();
    this.currentState = targetState;

    // Notify stream listeners (e.g. VideoCompositor)
    this.streamListeners.forEach((listener) => {
      try {
        listener(streamData);
      } catch (err) {
        console.error('[ScoreboardSync] Stream listener callback error:', err);
      }
    });
  }

  private initBroadcastChannels() {
    if (typeof window === 'undefined') return;
    this.channelsInitialized = true;

    // 1. Listen to HoopCultureScoreboard's native BroadcastChannels
    try {
      this.hcBroadcastChannel = new BroadcastChannel('hc_scoreboard_sync');
      this.hcBroadcastChannel.onmessage = (event) => this.handleIncomingHcMessage(event.data);
    } catch (e) {
      console.warn('[ScoreboardSync] BroadcastChannel (hc_scoreboard_sync) unavailable:', e);
    }

    try {
      this.legacyBroadcastChannel = new BroadcastChannel('basketball_scoreboard');
      this.legacyBroadcastChannel.onmessage = (event) => this.handleIncomingHcMessage(event.data);
    } catch {}

    try {
      this.ocrBroadcastChannel = new BroadcastChannel('ocr_stream');
      this.ocrBroadcastChannel.onmessage = (event) => {
        if (!event.data || (typeof event.data._ezSender === 'string' && event.data._ezSender.startsWith('ezlive_sync'))) return;
        this.handleOcrStreamUpdate(event.data.data || event.data);
      };
    } catch {}

    // 2. Also listen to EZLive's channel ('ezlive_scoreboard_channel')
    try {
      this.ezBroadcastChannel = new BroadcastChannel('ezlive_scoreboard_channel');
      this.ezBroadcastChannel.onmessage = (event) => {
        if (!event.data || (typeof event.data._ezSender === 'string' && event.data._ezSender.startsWith('ezlive_sync'))) return;
        if (event.data.type === 'EZ_SCOREBOARD_UPDATE' && event.data.payload) {
          const normalized = normalizeScoreboardState(event.data.payload, 'broadcast_channel');
          this.handleStateUpdate(normalized, 'broadcast_channel');
        }
      };
    } catch (e) {}

    // 3. Listen to localStorage ('bball_v3') updates across tabs on same device
    window.addEventListener('storage', (e) => {
      if (e.key === 'bball_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && typeof parsed === 'object') {
            const normalized = normalizeScoreboardState(parsed, 'broadcast_channel');
            this.handleStateUpdate(normalized, 'broadcast_channel');
          }
        } catch {}
      }
    });

    // 4. Listen to window postMessage for embedded overlays / iframes
    window.addEventListener('message', (event) => {
      if (!event.data) return;
      if (typeof event.data._ezSender === 'string' && event.data._ezSender.startsWith('ezlive_sync')) return;
      if (event.data.type === 'EZ_SCOREBOARD_UPDATE' && event.data.payload) {
        const normalized = normalizeScoreboardState(event.data.payload, 'broadcast_channel');
        this.handleStateUpdate(normalized, 'broadcast_channel');
      } else {
        this.handleIncomingHcMessage(event.data);
      }
    });
  }

  /**
   * Set the active operator email or court session to sync with.
   * e.g. "isidro.pascua@gmail.com" or "court-1" or "default" (auto-discovers active room)
   */
  public setSessionUser(userEmailOrSession: string) {
    this.ensureInitialized();
    const safeKey = sanitizeSessionKey(userEmailOrSession);
    if (this.currentSafeKey === safeKey && this.isConnected && this.rtdbUnsubscribe) {
      return;
    }

    this.currentSessionUser = userEmailOrSession || 'default';
    this.currentSafeKey = safeKey;

    if (!safeKey || safeKey === 'default') {
      this.discoverAndConnectFirebase();
      return;
    }

    // Reconnect Firebase RTDB listener to the new session path: states/{safeKey} and ocr/{safeKey}
    this.connectFirebaseRTDB(safeKey);
  }

  private async discoverAndConnectFirebase() {
    this.ensureInitialized();
    if (!this.scoreboardDb) return;

    try {
      const statesSnap = await get(ref(this.scoreboardDb, 'states'));
      const all = statesSnap.val();
      if (!all || typeof all !== 'object') {
        this.connectFirebaseRTDB('isidro_pascua@gmail_com');
        return;
      }

      const keys = Object.keys(all).filter((k) => k !== 'default' && k !== 'ezlive_profiles');
      if (keys.length === 0) {
        this.connectFirebaseRTDB('isidro_pascua@gmail_com');
        return;
      }

      let bestKey: string | null = null;
      let highestScore = -1;

      keys.forEach((k) => {
        const room = all[k];
        if (!room || typeof room !== 'object') return;
        let score = 0;
        if ((room.awayScore || 0) > 0 || (room.homeScore || 0) > 0) score += 1000;
        if (room.awayAbbr && room.awayAbbr !== 'AWAY') score += 500;
        if (room.homeAbbr && room.homeAbbr !== 'HOME') score += 500;
        if (room.gameRunning || room.shotRunning) score += 200;
        if (k === 'isidro_pascua@gmail_com') score += 2000;
        const ts = room.shotLeaderTime || room.lastUpdate || 0;
        if (ts > 0) score += Math.min(500, Math.floor(ts / 10000000000));

        if (score > highestScore) {
          highestScore = score;
          bestKey = k;
        }
      });

      this.connectFirebaseRTDB(bestKey || 'isidro_pascua@gmail_com');
    } catch {
      this.connectFirebaseRTDB('isidro_pascua@gmail_com');
    }
  }

  private connectFirebaseRTDB(safeKey: string) {
    this.ensureInitialized();
    if (!this.scoreboardDb) return;

    if (this.rtdbUnsubscribe) {
      this.rtdbUnsubscribe();
      this.rtdbUnsubscribe = null;
    }
    if (this.rtdbOcrUnsubscribe) {
      this.rtdbOcrUnsubscribe();
      this.rtdbOcrUnsubscribe = null;
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

      const ocrRef = ref(this.scoreboardDb, `ocr/${safeKey}`);
      this.rtdbOcrUnsubscribe = onValue(
        ocrRef,
        (snapshot) => {
          if (snapshot.exists()) {
            this.handleOcrStreamUpdate(snapshot.val());
          }
        },
        () => {}
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
          } else if (msg.type === 'stream' && msg.data) {
            this.handleOcrStreamUpdate(msg.data);
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
    // Preserve active optical stream crops unless explicitly disabled
    const merged: ScoreboardState = {
      ...state,
      aiSyncActive: state.aiSyncActive ?? (this.latestOcrState.aiSyncActive || Boolean(state.aiSyncEnabled)),
      gameClockStream: state.enabledCrops?.clock === false ? null : (state.gameClockStream !== undefined ? state.gameClockStream : this.latestOcrState.gameClockStream),
      shotClockStream: state.enabledCrops?.shot === false ? null : (state.shotClockStream !== undefined ? state.shotClockStream : this.latestOcrState.shotClockStream),
      homeScoreStream: state.enabledCrops?.home === false ? null : (state.homeScoreStream !== undefined ? state.homeScoreStream : this.latestOcrState.homeScoreStream),
      awayScoreStream: state.enabledCrops?.away === false ? null : (state.awayScoreStream !== undefined ? state.awayScoreStream : this.latestOcrState.awayScoreStream),
      periodStream: state.enabledCrops?.period === false ? null : (state.periodStream !== undefined ? state.periodStream : this.latestOcrState.periodStream),
      enabledCrops: state.enabledCrops ?? this.latestOcrState.enabledCrops,
      invertStates: state.invertStates ?? this.latestOcrState.invertStates,
    };

    this.currentState = merged;
    this.isConnected = true;
    this.connectionType = source;
    this.lastSyncTime = Date.now();

    this.listeners.forEach((listener) => {
      try {
        listener(merged);
      } catch (err) {
        console.error('[ScoreboardSync] Listener callback error:', err);
      }
    });
  }

  public subscribe(listener: ScoreboardSyncListener): () => void {
    this.ensureInitialized();
    this.listeners.add(listener);
    if (this.currentState) {
      listener(this.currentState);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribeStream(listener: ScoreboardStreamListener): () => void {
    this.ensureInitialized();
    this.streamListeners.add(listener);
    if (this.latestOcrState.aiSyncActive) {
      listener({ ...this.latestOcrState, streamActive: true });
    }
    return () => {
      this.streamListeners.delete(listener);
    };
  }

  public getLatestOcrStream() {
    return this.latestOcrState;
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
