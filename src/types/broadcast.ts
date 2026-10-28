export interface ScoreboardState {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: number;
  gameClock: string; // "MM:SS"
  isClockRunning: boolean;
  shotClock: number;
  homeFouls: number;
  awayFouls: number;
  homeTimeouts: number;
  awayTimeouts: number;
  bannerText: string;
  sponsorName: string;
  possession: 'home' | 'away' | 'none';
}

export type SourceType = 'camera' | 'browser_url' | 'image' | 'text' | 'scoreboard' | 'color_solid';

export interface BaseSource {
  id: string;
  name: string;
  type: SourceType;
  visible: boolean;
  locked: boolean;
  x: number;       // In 1920x1080 canvas coordinates
  y: number;       // In 1920x1080 canvas coordinates
  width: number;   // In 1920x1080 canvas coordinates
  height: number;  // In 1920x1080 canvas coordinates
  opacity: number; // 0 to 1
  zIndex: number;
}

export interface CameraSource extends BaseSource {
  type: 'camera';
  fit: 'cover' | 'contain' | 'fill';
  facingMode?: 'environment' | 'user';
  deviceId?: string;
}

export interface BrowserUrlSource extends BaseSource {
  type: 'browser_url';
  url: string;
  customCss?: string;
  syncDataBridge?: boolean;
}

export interface ImageSource extends BaseSource {
  type: 'image';
  url: string; // Data URL or HTTPS URL
  fit: 'contain' | 'cover' | 'fill';
}

export interface TextSource extends BaseSource {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '900';
  color: string;
  backgroundColor: string;
  padding: number;
  borderRadius: number;
}

export interface ScoreboardSource extends BaseSource {
  type: 'scoreboard';
  theme: 'espn' | 'hooptimes' | 'minimal';
  scale: number;
}

export interface ColorSolidSource extends BaseSource {
  type: 'color_solid';
  color: string;
  borderRadius: number;
}

export type Source =
  | CameraSource
  | BrowserUrlSource
  | ImageSource
  | TextSource
  | ScoreboardSource
  | ColorSolidSource;

export interface Scene {
  id: string;
  name: string;
  sources: Source[];
}

// Transition settings
export type TransitionType = 'cut' | 'fade';

export interface StreamSettings {
  rtmpsUrl: string;
  streamKey: string;
  whipUrl: string;
  targetResolution: '1080p60' | '1080p30' | '720p60' | '720p30';
  overlayUrl: string;
  usePostMessageBridge: boolean;
  transitionType: TransitionType;
  transitionDurationMs: number;
}

export interface AudioMeterData {
  volume: number;
  isClipping: boolean;
}
