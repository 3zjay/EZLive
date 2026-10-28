export interface ScoreboardState {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: number;
  gameClock: string; // "MM:SS" or "SS.S"
  isClockRunning: boolean;
  shotClock: number; // e.g. 24 or 14
  homeFouls: number;
  awayFouls: number;
  homeTimeouts: number;
  awayTimeouts: number;
  bannerText: string;
  sponsorName: string;
  possession: 'home' | 'away' | 'none';
}

export type SceneType = 'game' | 'intro' | 'interview' | 'sponsor' | 'halftime';

export interface SceneConfig {
  id: SceneType;
  name: string;
  description: string;
  hasCamera: boolean;
  showScoreboard: boolean;
  showSponsor: boolean;
  showLowerThird: boolean;
  lowerThirdTitle?: string;
  lowerThirdSubtitle?: string;
  backgroundTitle?: string;
  backgroundSubtitle?: string;
}

export interface StreamSettings {
  rtmpsUrl: string;
  streamKey: string;
  whipUrl: string;
  targetResolution: '1080p60' | '1080p30' | '720p60' | '720p30';
  overlayUrl: string;
  usePostMessageBridge: boolean;
}

export interface AudioMeterData {
  volume: number; // 0 to 100
  isClipping: boolean;
}
