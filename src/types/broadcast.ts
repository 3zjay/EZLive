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
  // Enhanced properties from HoopCultureScoreboard
  homeColor?: string;
  awayColor?: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeAbbr?: string;
  awayAbbr?: string;
  quarter?: number;
  gameSeconds?: number;
  shotSeconds?: number;
  homeRecord?: string;
  awayRecord?: string;
  syncKey?: string;
  syncSource?: 'firebase_rtdb' | 'broadcast_channel' | 'local_sse' | 'manual';
  lastSyncTimestamp?: number;
}

export type SourceType = 'camera' | 'browser_url' | 'image' | 'text' | 'scoreboard' | 'color_solid' | 'video_media';

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
  mirror?: boolean;
}

export interface VideoMediaSource extends BaseSource {
  type: 'video_media';
  url: string;
  loop: boolean;
  muted: boolean;
  fit: 'cover' | 'contain' | 'fill';
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

export type ScoreboardTheme =
  | 'nbaoverlay2'    // Primary Theme: Main NBA Scorebug 2 (/nbaoverlay2)
  | 'nbc'            // NBC / NBA Pro Broadcast Bug (/nbc)
  | 'nba_classic'    // Classic NBA Scorebug (/nbaoverlay)
  | 'nba_neon'       // Compact Neon Bug (alias for nbaoverlay2)
  | 'fullscreen_bar' // Full-Width Lower Third Bar (/fullscreen)
  | 'espn'           // Legacy fallback
  | 'hooptimes'      // Legacy fallback
  | 'minimal';       // Legacy fallback

export interface ScoreboardSource extends BaseSource {
  type: 'scoreboard';
  theme: ScoreboardTheme;
  scale: number;
}

export interface ColorSolidSource extends BaseSource {
  type: 'color_solid';
  color: string;
  borderRadius: number;
}

export type Source =
  | CameraSource
  | VideoMediaSource
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
export type TransitionType = 'cut' | 'fade' | 'slide' | 'zoom';

export interface FacebookLiveSettings {
  mode: 'auto' | 'manual';
  destinationType?: 'group' | 'page' | 'timeline' | 'stream_key';
  userToken: string;
  userName?: string;
  userPicture?: string;
  appId?: string;
  selectedPageId: string;
  selectedPageName: string;
  selectedPageToken: string;
  selectedGroupId?: string;
  selectedGroupName?: string;
  groupStreamKey?: string;
  broadcastTitle: string;
  broadcastDescription: string;
  activeLiveVideoId?: string;
  permalinkUrl?: string;
}

export interface YouTubeLiveSettings {
  enabled: boolean;
  mode?: 'auto' | 'manual';
  accessToken?: string;
  channelId?: string;
  channelTitle?: string;
  channelAvatar?: string;
  broadcastTitle?: string;
  broadcastDescription?: string;
  privacyStatus?: 'public' | 'unlisted' | 'private';
  latencyPreference?: 'ultraLow' | 'low' | 'normal';
  streamKey: string;
  rtmpUrl?: string; // Default 'rtmp://a.rtmp.youtube.com/live2/'
  activeBroadcastId?: string;
  liveChatId?: string;
  watchUrl?: string;
}

export type StreamBandwidthPreset = 'eco_720' | 'balanced_720' | 'high_1080' | 'pro_1080_60';

export interface StreamSettings {
  rtmpsUrl: string;
  streamKey: string;
  whipUrl: string;
  relayUrl?: string;
  targetResolution: '1080p60' | '1080p30' | '720p60' | '720p30';
  overlayUrl: string;
  usePostMessageBridge: boolean;
  transitionType: TransitionType;
  transitionDurationMs: number;
  fbSettings?: FacebookLiveSettings;
  ytSettings?: YouTubeLiveSettings;
  bandwidthPreset?: StreamBandwidthPreset;
  broadcastTitle?: string;
  broadcastDescription?: string;
  // Scoreboard Sync Preferences
  scoreboardSessionUser?: string;
  scoreboardSyncMode?: 'auto' | 'firebase_rtdb' | 'local_sse' | 'broadcast_channel' | 'manual';
  localScoreboardIp?: string;
}

export interface AudioMeterData {
  volume: number;
  isClipping: boolean;
}
