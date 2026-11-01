import { ScoreboardState } from '@/types/broadcast';
import { scoreboardSync, normalizeScoreboardState } from '@/services/scoreboardSync';

export type ScoreboardUpdateListener = (state: Partial<ScoreboardState>) => void;

export class OverlayBridge {
  private listeners: Set<ScoreboardUpdateListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private hcBroadcastChannel: BroadcastChannel | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private unsubscribeSync: (() => void) | null = null;
  private lastKnownState: Partial<ScoreboardState> = {};

  constructor() {
    this.setupListeners();
  }

  public subscribe(listener: ScoreboardUpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private toHoopCulturePayload(state: Partial<ScoreboardState>) {
    const merged = { ...this.lastKnownState, ...state };
    this.lastKnownState = merged;

    let gameSeconds = 600;
    if (typeof merged.gameClock === 'string' && merged.gameClock.includes(':')) {
      const [m, s] = merged.gameClock.split(':');
      gameSeconds = (parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0);
    }

    const hcData: Record<string, unknown> = {};
    if (merged.homeTeam !== undefined) hcData.homeAbbr = merged.homeTeam;
    if (merged.awayTeam !== undefined) hcData.awayAbbr = merged.awayTeam;
    if (merged.homeScore !== undefined) hcData.homeScore = merged.homeScore;
    if (merged.awayScore !== undefined) hcData.awayScore = merged.awayScore;
    if (merged.homeFouls !== undefined) hcData.homeFouls = merged.homeFouls;
    if (merged.awayFouls !== undefined) hcData.awayFouls = merged.awayFouls;
    if (merged.homeColor !== undefined) hcData.homeColor = merged.homeColor;
    if (merged.awayColor !== undefined) hcData.awayColor = merged.awayColor;
    if (merged.homeLogo !== undefined) hcData.homeLogo = merged.homeLogo;
    if (merged.awayLogo !== undefined) hcData.awayLogo = merged.awayLogo;
    if (merged.homeRecord !== undefined) hcData.homeRecord = merged.homeRecord;
    if (merged.awayRecord !== undefined) hcData.awayRecord = merged.awayRecord;
    if (merged.period !== undefined) hcData.quarter = merged.period;
    if (merged.gameClock !== undefined) hcData.gameSeconds = gameSeconds;
    if (merged.isClockRunning !== undefined) {
      hcData.gameRunning = merged.isClockRunning;
      hcData.clockRunning = merged.isClockRunning;
    }
    if (merged.shotClock !== undefined) hcData.shotSeconds = merged.shotClock;
    if (merged.possession !== undefined) {
      hcData.possession = merged.possession === 'none' ? null : merged.possession;
    }
    const rawMerged = merged as Record<string, unknown>;
    if (rawMerged.rp1Title !== undefined) hcData.rp1Title = rawMerged.rp1Title;
    if (rawMerged.rp1Value !== undefined) hcData.rp1Value = rawMerged.rp1Value;
    if (rawMerged.rp2Title !== undefined) hcData.rp2Title = rawMerged.rp2Title;
    if (rawMerged.rp2Value !== undefined) hcData.rp2Value = rawMerged.rp2Value;
    if (rawMerged.barColor !== undefined) hcData.barColor = rawMerged.barColor;

    return hcData;
  }

  public broadcast(state: Partial<ScoreboardState>) {
    // 1. Broadcast to local subscribers
    this.listeners.forEach((listener) => listener(state));

    const hcData = this.toHoopCulturePayload(state);

    // 2. Broadcast via BroadcastChannel (cross-tab on same device)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'EZ_SCOREBOARD_UPDATE',
          payload: state,
        });
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 2b. Broadcast via Hoop Culture native channel ('hc_scoreboard_sync') for HTML overlay iframes
    if (this.hcBroadcastChannel) {
      try {
        this.hcBroadcastChannel.postMessage({
          type: 'state',
          data: hcData,
        });
      } catch (e) {
        console.warn('hc_scoreboard_sync BroadcastChannel error:', e);
      }
    }

    // 3. Post to parent / child iframes
    if (typeof window !== 'undefined') {
      window.postMessage(
        {
          type: 'EZ_SCOREBOARD_UPDATE',
          payload: state,
        },
        '*'
      );

      // Also post directly into all overlay iframes on the stage
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          iframe.contentWindow?.postMessage(
            {
              type: 'state',
              data: hcData,
            },
            '*'
          );
        });
      } catch {}
    }
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    // Connect to the unified ScoreboardSyncManager
    this.unsubscribeSync = scoreboardSync.subscribe((liveState) => {
      this.lastKnownState = { ...this.lastKnownState, ...liveState };
      this.notify(liveState);

      // Also push liveState to any active overlay iframes so they stay 100% synced
      const hcData = this.toHoopCulturePayload(liveState);
      try {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach((iframe) => {
          iframe.contentWindow?.postMessage(
            {
              type: 'state',
              data: hcData,
            },
            '*'
          );
        });
      } catch {}
    });

    // Cross-tab BroadcastChannel
    try {
      this.broadcastChannel = new BroadcastChannel('ezlive_scoreboard_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'EZ_SCOREBOARD_UPDATE') {
          this.notify(event.data.payload);
        }
      };
      this.hcBroadcastChannel = new BroadcastChannel('hc_scoreboard_sync');
    } catch {
      // BroadcastChannel not available in older environments
    }

    // Window postMessage listener (for iframes or cross-origin overlays)
    this.messageHandler = (event: MessageEvent) => {
      if (!event.data) return;

      // Handle standard EZ format
      if (event.data.type === 'EZ_SCOREBOARD_UPDATE' && event.data.payload) {
        this.notify(event.data.payload);
        return;
      }

      // Handle Hoop Culture format
      if (event.data.type === 'state' && event.data.data) {
        const normalized = normalizeScoreboardState(event.data.data, 'broadcast_channel');
        this.notify(normalized);
        return;
      }

      // Handle generic scoreboard event structures
      if (typeof event.data === 'object') {
        const payload: Partial<ScoreboardState> = {};
        let foundScoreData = false;

        if (typeof event.data.homeScore === 'number') {
          payload.homeScore = event.data.homeScore;
          foundScoreData = true;
        }
        if (typeof event.data.awayScore === 'number') {
          payload.awayScore = event.data.awayScore;
          foundScoreData = true;
        }
        if (typeof event.data.period === 'number') {
          payload.period = event.data.period;
          foundScoreData = true;
        }
        if (typeof event.data.gameClock === 'string') {
          payload.gameClock = event.data.gameClock;
          foundScoreData = true;
        }
        if (typeof event.data.homeTeam === 'string') {
          payload.homeTeam = event.data.homeTeam;
          foundScoreData = true;
        }
        if (typeof event.data.awayTeam === 'string') {
          payload.awayTeam = event.data.awayTeam;
          foundScoreData = true;
        }

        if (foundScoreData) {
          this.notify(payload);
        }
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private notify(data: Partial<ScoreboardState>) {
    this.listeners.forEach((listener) => listener(data));
  }

  public destroy() {
    if (this.unsubscribeSync) {
      this.unsubscribeSync();
      this.unsubscribeSync = null;
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    if (this.hcBroadcastChannel) {
      this.hcBroadcastChannel.close();
      this.hcBroadcastChannel = null;
    }
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.listeners.clear();
  }
}
