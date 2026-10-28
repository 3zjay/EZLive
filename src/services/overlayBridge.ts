import { ScoreboardState } from '@/types/broadcast';
import { scoreboardSync, normalizeScoreboardState } from '@/services/scoreboardSync';

export type ScoreboardUpdateListener = (state: Partial<ScoreboardState>) => void;

export class OverlayBridge {
  private listeners: Set<ScoreboardUpdateListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private unsubscribeSync: (() => void) | null = null;

  constructor() {
    this.setupListeners();
  }

  public subscribe(listener: ScoreboardUpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(state: Partial<ScoreboardState>) {
    // 1. Broadcast to local subscribers
    this.listeners.forEach((listener) => listener(state));

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

    // 3. Post to parent / child iframes
    if (typeof window !== 'undefined') {
      window.postMessage(
        {
          type: 'EZ_SCOREBOARD_UPDATE',
          payload: state,
        },
        '*'
      );
    }
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    // Connect to the unified ScoreboardSyncManager
    this.unsubscribeSync = scoreboardSync.subscribe((liveState) => {
      this.notify(liveState);
    });

    // Cross-tab BroadcastChannel
    try {
      this.broadcastChannel = new BroadcastChannel('ezlive_scoreboard_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data && event.data.type === 'EZ_SCOREBOARD_UPDATE') {
          this.notify(event.data.payload);
        }
      };
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
    if (this.messageHandler && typeof window !== 'undefined') {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.listeners.clear();
  }
}
