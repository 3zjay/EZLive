export type StageLayout = 'solo' | 'split' | 'pip' | 'grid';

export interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  message: string;
  platform: 'facebook' | 'youtube' | 'twitch' | 'studio';
  timestamp: string;
}

export interface NewsTickerConfig {
  enabled: boolean;
  text: string;
  speed: number; // pixels per second
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

export interface StreamlabsBanner {
  id: string;
  enabled: boolean;
  title: string;
  subtitle?: string;
  theme: 'modern' | 'sports' | 'minimal' | 'breaking';
}

export interface BrandKit {
  logoUrl: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  logoWidth: number;
  logoHeight: number;
  primaryColor: string;
  accentColor: string;
  backgroundType: 'dark' | 'gradient' | 'sports' | 'custom';
  customBackgroundUrl?: string;
}

export interface AudioChannel {
  id: string;
  name: string;
  volume: number; // 0 to 100
  muted: boolean;
  level: number; // 0 to 100 VU
}

export interface StreamDestinations {
  facebook: {
    enabled: boolean;
    destinationType?: 'page' | 'group' | 'timeline' | 'stream_key';
    pageName?: string;
    pageId?: string;
    pageToken?: string;
    groupName?: string;
    groupId?: string;
    streamKey?: string;
    rtmpsUrl?: string;
    title?: string;
    description?: string;
    liveVideoId?: string;
    permalinkUrl?: string;
    connectedUserName?: string;
    connectedUserToken?: string;
  };
  youtube: {
    enabled: boolean;
    title: string;
    streamKey?: string;
  };
  twitch: {
    enabled: boolean;
    channel: string;
    streamKey?: string;
  };
  customRtmp: {
    enabled: boolean;
    url: string;
    streamKey: string;
  };
}

export interface ParticipantFeed {
  id: string;
  name: string;
  role: 'host' | 'guest' | 'screenshare';
  onStage: boolean;
  videoTrack?: MediaStreamTrack;
  audioTrack?: MediaStreamTrack;
  hasAudio: boolean;
  hasVideo: boolean;
  muted: boolean;
  avatarUrl?: string;
}
