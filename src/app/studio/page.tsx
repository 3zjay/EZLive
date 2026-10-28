'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { VideoCompositor } from '@/services/compositor';
import { BroadcastRecorder, RecordingState } from '@/services/recorder';
import { OverlayBridge } from '@/services/overlayBridge';
import { scoreboardSync } from '@/services/scoreboardSync';
import { SceneStorage, DEFAULT_OBS_SCENES } from '@/services/sceneStorage';
import { Scene, ScoreboardState, Source, SourceType, StreamSettings } from '@/types/broadcast';
import {
  BrandKit,
  ChatMessage,
  NewsTickerConfig,
  ParticipantFeed,
  StageLayout,
  StreamDestinations,
  StreamlabsBanner,
} from '@/types/streamlabs';
import { StreamlabsTopBar } from '@/components/streamlabs/StreamlabsTopBar';
import { PreviewStage } from '@/components/studio/PreviewStage';
import { BackstageStrip } from '@/components/streamlabs/BackstageStrip';
import { SidebarTabs } from '@/components/streamlabs/SidebarTabs';
import { SettingsModal } from '@/components/studio/SettingsModal';
import { SourcePropertiesModal } from '@/components/studio/SourcePropertiesModal';
import { GuestInviteModal } from '@/components/streamlabs/GuestInviteModal';
import { GoLiveModal } from '@/components/studio/GoLiveModal';
import { StreamBandwidthPreset } from '@/types/broadcast';
import { useAuth } from '@/context/AuthContext';
import { LogIn, User as UserIcon, Shield, MapPin, ChevronDown, Zap } from 'lucide-react';

const INITIAL_SCOREBOARD: ScoreboardState = {
  homeTeam: 'HOME',
  awayTeam: 'AWAY',
  homeScore: 0,
  awayScore: 0,
  period: 1,
  quarter: 1,
  gameClock: '10:00',
  gameSeconds: 600,
  isClockRunning: false,
  shotClock: 24,
  shotSeconds: 24,
  homeFouls: 0,
  awayFouls: 0,
  homeTimeouts: 2,
  awayTimeouts: 2,
  homeColor: '#1a4fa0',
  awayColor: '#c8102e',
  homeAbbr: 'HOME',
  awayAbbr: 'AWAY',
  bannerText: '',
  sponsorName: '',
  possession: 'none',
};

const DEFAULT_SETTINGS: StreamSettings = {
  rtmpsUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
  streamKey: '',
  whipUrl: 'https://relay.hooptimes.live/whip',
  relayUrl: 'https://ezlive-relay.onrender.com',
  targetResolution: '1080p60',
  overlayUrl: 'https://scoreboard.hoopculture.ca',
  usePostMessageBridge: true,
  transitionType: 'fade',
  transitionDurationMs: 400,
  scoreboardSessionUser: 'isidro.pascua@gmail.com',
  scoreboardSyncMode: 'auto',
  fbSettings: {
    mode: 'manual',
    destinationType: 'stream_key',
    appId: '1519191979811970',
    selectedGroupId: '',
    selectedGroupName: '',
    groupStreamKey: '',
    userToken: '',
    selectedPageId: '',
    selectedPageName: '',
    selectedPageToken: '',
    broadcastTitle: 'Hoop Culture Live Broadcast',
    broadcastDescription: 'Streaming live directly from EZLiveStudio by HoopCulture',
  },
};

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'EZLive Studio',
    platform: 'studio',
    message: 'Broadcast studio ready. Facebook live comments will appear here.',
    timestamp: 'Just now',
  },
];

const COURT_OPTIONS = [
  'Court 1 — Championship Hardwood',
  'Court 2 — North Gym',
  'Court 3 — South Gym',
  'Court 4 — Training Facility',
];

export default function StudioPage() {
  const [leagueEmail, setLeagueEmail] = useState('');
  const [leaguePassword, setLeaguePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile, authError, clearAuthError, signInGoogle, signInFacebook, signInWithCredentials, signOut, updateAssignedCourt, saveSessionState } = useAuth();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);

  // Engine references
  const compositorRef = useRef<VideoCompositor | null>(null);
  const recorderRef = useRef<BroadcastRecorder | null>(null);
  const streamingSocketRef = useRef<WebSocket | null>(null);
  const streamingRecorderRef = useRef<MediaRecorder | null>(null);
  const isStreamingRef = useRef(false);

  // Go Live Setup Modal & Active Destination Telemetry
  const [isGoLiveModalOpen, setIsGoLiveModalOpen] = useState(false);
  const [streamDestinationsSummary, setStreamDestinationsSummary] = useState<string>('FB');

  // Relay Telemetry State (bytes sent & live status)
  const [relayStats, setRelayStats] = useState<{
    connected: boolean;
    mbSent: string;
    status: 'idle' | 'connecting' | 'streaming' | 'error';
  }>({
    connected: false,
    mbSent: '0.00',
    status: 'idle',
  });

  const startRelayPipeline = (
    options:
      | {
          targetRtmps?: string;
          targetKey?: string;
          facebookKey?: string;
          youtubeKey?: string;
          bitrateKbps?: number;
          fps?: number;
        }
      | string,
    fallbackKey?: string
  ) => {
    try {
      let fbKey = '';
      let ytKey = '';
      let targetRtmps = settings.rtmpsUrl;
      let bitrateKbps = 4500;
      let streamFps = 60; // 60 FPS sports broadcast default

      if (typeof options === 'string') {
        targetRtmps = options;
        fbKey = fallbackKey || '';
      } else {
        targetRtmps = options.targetRtmps || settings.rtmpsUrl;
        fbKey = options.facebookKey || options.targetKey || '';
        ytKey = options.youtubeKey || '';
        bitrateKbps = options.bitrateKbps || 4500;
        streamFps = options.fps || (bitrateKbps <= 1800 ? 30 : 60);
      }

      const relayUrl =
        settings.relayUrl ||
        (typeof window !== 'undefined' ? localStorage.getItem('hc_relay_url') || '' : '') ||
        'https://ezlive-relay.onrender.com';

      // Detect hardware H.264 support (Apple VideoToolbox on iPad / Snapdragon on Android)
      let mime = 'video/webm';
      let isH264 = false;
      if (typeof MediaRecorder !== 'undefined') {
        const h264Candidates = [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=avc1,opus',
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=h264,opus',
          'video/webm;codecs=h264',
        ];
        for (const candidate of h264Candidates) {
          if (MediaRecorder.isTypeSupported(candidate)) {
            mime = candidate;
            isH264 = true;
            break;
          }
        }
        if (!isH264) {
          if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
            mime = 'video/webm;codecs=vp8,opus';
          } else if (MediaRecorder.isTypeSupported('video/webm')) {
            mime = 'video/webm';
          }
        }
      }

      if (compositorRef.current) {
        compositorRef.current.setTargetFps(streamFps);
      }

      const compositeStream = compositorRef.current?.getCompositeStream(mediaStreamRef.current);

      if (!compositeStream) {
        console.warn('Composite stream not ready for relay streaming');
        return;
      }

      setRelayStats({ connected: false, mbSent: '0.00', status: 'connecting' });

      const cleanRelay = relayUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/$/, '');
      const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      const query = new URLSearchParams();
      if (fbKey) {
        query.set('fbKey', fbKey);
        query.set('streamKey', fbKey);
        query.set('rtmpsUrl', targetRtmps);
      }
      if (ytKey) {
        query.set('ytKey', ytKey);
        query.set('ytRtmpUrl', 'rtmp://a.rtmp.youtube.com/live2/');
        if (!fbKey) {
          query.set('streamKey', ytKey);
          query.set('rtmpsUrl', 'rtmp://a.rtmp.youtube.com/live2/');
        }
      }
      query.set('bitrate', String(bitrateKbps));
      query.set('fps', String(streamFps));
      query.set('isH264', isH264 ? '1' : '0');
      query.set('preset', 'ultrafast');

      const wsUrl = `${wsProtocol}//${cleanRelay}/live?${query.toString()}`;

      const ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      streamingSocketRef.current = ws;

      ws.onopen = () => {
        const destLabel =
          fbKey && ytKey ? 'Facebook + YouTube (Dual Stream)' : fbKey ? 'Facebook Live' : 'YouTube Live';
        console.log(`📡 Connected to EZLive Cloud Relay! Streaming canvas to ${destLabel} (${mime}, ${streamFps}fps, isH264=${isH264})...`);
        setRelayStats((prev) => ({ ...prev, connected: true, status: 'streaming' }));

        try {
          const rec = new MediaRecorder(compositeStream, {
            mimeType: mime,
            videoBitsPerSecond: bitrateKbps * 1000,
            audioBitsPerSecond: 128000,
          });

          rec.ondataavailable = async (e) => {
            if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              const buf = await e.data.arrayBuffer();
              ws.send(buf);
            }
          };

          rec.start(500); // 500ms chunk interval
          streamingRecorderRef.current = rec;
        } catch (recErr) {
          console.error('Failed to start MediaRecorder for streaming relay:', recErr);
          setRelayStats((prev) => ({ ...prev, status: 'error' }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'HEARTBEAT') {
            setRelayStats({
              connected: true,
              mbSent: msg.mbReceived || '0.00',
              status: 'streaming',
            });
          } else if (msg.type === 'STATUS') {
            console.log('Relay status:', msg.message);
          } else if (msg.type === 'FFMPEG_ERROR') {
            console.warn('Relay warning from FFmpeg:', msg.message);
          } else if (msg.type === 'FFMPEG_EXIT') {
            console.error('Relay FFmpeg exit:', msg);
            if (msg.code !== 0 && isStreamingRef.current) {
              alert(`Stream interrupted (FFmpeg code ${msg.code}):\n${msg.message}\n\nPlease check Facebook Live Producer or Stream Key.`);
              stopRelayPipeline();
              setIsStreaming(false);
              isStreamingRef.current = false;
            }
          }
        } catch {}
      };

      ws.onerror = (e) => {
        console.warn('Streaming Relay note:', e);
        setRelayStats((prev) => ({ ...prev, status: 'error' }));
      };

      ws.onclose = (e) => {
        console.log('Streaming Relay connection closed:', e.code, e.reason);
        if (isStreamingRef.current) {
          setRelayStats((prev) => ({ ...prev, connected: false, status: 'idle' }));
        }
      };
    } catch (err) {
      console.error('startRelayPipeline error:', err);
      setRelayStats((prev) => ({ ...prev, status: 'error' }));
    }
  };

  const stopRelayPipeline = () => {
    isStreamingRef.current = false;
    if (streamingRecorderRef.current) {
      try {
        if (streamingRecorderRef.current.state !== 'inactive') {
          streamingRecorderRef.current.stop();
        }
      } catch (e) {}
      streamingRecorderRef.current = null;
    }
    if (streamingSocketRef.current) {
      try {
        streamingSocketRef.current.close();
      } catch (e) {}
      streamingSocketRef.current = null;
    }
    setRelayStats({ connected: false, mbSent: '0.00', status: 'idle' });
  };
  const bridgeRef = useRef<OverlayBridge | null>(null);

  // Streams
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  // State: Core OBS & Streamlabs (persisted in browser storage)
  const [scenes, setScenes] = useState<Scene[]>(() => SceneStorage.loadScenes() || DEFAULT_OBS_SCENES);
  const [activeSceneId, setActiveSceneId] = useState<string>(() => scenes[0]?.id || 'scene-game');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_SCOREBOARD);
  const [settings, setSettings] = useState<StreamSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezlive_settings_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SETTINGS, ...parsed };
        }
      } catch {}
    }
    return DEFAULT_SETTINGS;
  });

  const handleSaveSettings = (newSettings: StreamSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ezlive_settings_v1', JSON.stringify(newSettings));
      } catch {}
    }
  };

  // Streamlabs Add-ons
  const [stageLayout, setStageLayout] = useState<StageLayout>('solo');
  const [participants, setParticipants] = useState<ParticipantFeed[]>([
    {
      id: 'feed-host',
      name: 'Host (Court 1)',
      role: 'host',
      onStage: true,
      hasAudio: true,
      hasVideo: true,
      muted: false,
    },
    {
      id: 'feed-guest-1',
      name: 'Sideline Reporter',
      role: 'guest',
      onStage: false,
      hasAudio: true,
      hasVideo: true,
      muted: false,
    },
    {
      id: 'feed-screen',
      name: 'Replay / Screen',
      role: 'screenshare',
      onStage: false,
      hasAudio: false,
      hasVideo: true,
      muted: true,
    },
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [highlightedChat, setHighlightedChat] = useState<ChatMessage | null>(null);
  const [tickerConfig, setTickerConfig] = useState<NewsTickerConfig>({
    enabled: false,
    text: '🏀 HOOP CULTURE BASKETBALL LEAGUE • CHAMPIONSHIP FINALS • STREAMING LIVE • LIKE & SHARE THE BROADCAST!',
    speed: 120,
    backgroundColor: 'rgba(8, 6, 5, 0.95)',
    textColor: '#f2ede8',
    fontSize: 20,
  });
  const [activeBanner, setActiveBanner] = useState<StreamlabsBanner | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>({
    logoUrl: '/icon.svg',
    logoPosition: 'top-right',
    logoWidth: 180,
    logoHeight: 60,
    primaryColor: '#e8430a',
    accentColor: '#ff6b1a',
    backgroundType: 'dark',
  });

  // State: Hardware & Status
  const [hasCamera, setHasCamera] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fps, setFps] = useState(60);
  const [micVolume, setMicVolume] = useState(100);
  const [micMuted, setMicMuted] = useState(false);

  // State: Devices & Modals
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuestInviteOpen, setIsGuestInviteOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isSourcePropsOpen, setIsSourcePropsOpen] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCourtDropdownOpen, setIsCourtDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Screen Wake Lock API ref for continuous iPad streaming
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wakeLockRef = useRef<any>(null);

  // State: Recording & Streaming
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationSeconds: 0,
    recordedBytes: 0,
    mimeType: '',
  });
  const [isStreaming, setIsStreaming] = useState(false);

  // Clean up any stale dummy IDs from previous sessions
  useEffect(() => {
    setSettings((prev) => {
      if (prev.fbSettings?.selectedPageId === 'page-hoopculture') {
        return {
          ...prev,
          fbSettings: {
            ...prev.fbSettings,
            selectedPageId: '',
            selectedPageName: '',
          },
        };
      }
      return prev;
    });
  }, []);

  // Auto-pair Scoreboard & Overlays with logged-in user email or assigned court
  useEffect(() => {
    let savedEmail = '';
    try {
      savedEmail = localStorage.getItem('hc_session_user') || '';
    } catch {}
    const emailOrCourt = user?.email || savedEmail || settings.scoreboardSessionUser || profile?.assignedCourt || 'isidro.pascua@gmail.com';
    if (emailOrCourt) {
      scoreboardSync.setSessionUser(emailOrCourt);
      setSettings((prev) => ({
        ...prev,
        scoreboardSessionUser: prev.scoreboardSessionUser || emailOrCourt,
      }));

      // Automatically sync any Hoop Culture browser overlay sources with the active login email!
      setScenes((prevScenes) => {
        let changed = false;
        const updatedScenes = prevScenes.map((scene) => {
          let sceneChanged = false;
          const updatedSources = scene.sources.map((source) => {
            if (source.type === 'browser_url' && source.url && source.url.includes('scoreboard.hoopculture.ca')) {
              try {
                const urlObj = new URL(source.url);
                if (urlObj.searchParams.get('user') !== emailOrCourt) {
                  urlObj.searchParams.set('user', emailOrCourt);
                  sceneChanged = true;
                  return { ...source, url: urlObj.toString() };
                }
              } catch {
                // If relative or invalid URL format
              }
            }
            return source;
          });
          if (sceneChanged) {
            changed = true;
            return { ...scene, sources: updatedSources };
          }
          return scene;
        });

        if (changed) {
          SceneStorage.saveScenes(updatedScenes);
          return updatedScenes;
        }
        return prevScenes;
      });
    }
  }, [user?.email, profile?.assignedCourt, settings.scoreboardSessionUser]);

  // Sync with Firebase profile on login
  useEffect(() => {
    if (profile) {
      if (profile.savedScenes && profile.savedScenes.length > 0) {
        setScenes(profile.savedScenes);
        setActiveSceneId(profile.savedScenes[0].id);
      }
      if (profile.scoreboardPreset) {
        setScoreboard((prev) => ({ ...prev, ...profile.scoreboardPreset }));
      }
      if (profile.streamSettings) {
        setSettings((prev) => ({ ...prev, ...profile.streamSettings }));
      }
      if (profile.brandKit) {
        setBrandKit((prev) => ({ ...prev, ...profile.brandKit }));
      }
    }
  }, [profile]);

  // Active scene helper
  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  const updateScenes = (newScenes: Scene[]) => {
    setScenes(newScenes);
    SceneStorage.saveScenes(newScenes);
    const updatedActive = newScenes.find((s) => s.id === activeSceneId);
    if (updatedActive && compositorRef.current) {
      compositorRef.current.updateCurrentScene(updatedActive);
    }
    if (user) {
      saveSessionState({ scenes: newScenes });
    }
  };

  // Screen Wake Lock to prevent iPad / phone screen from sleeping during broadcast
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && !wakeLockRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        wakeLockRef.current.addEventListener('release', () => {
          wakeLockRef.current = null;
        });
      }
    } catch (err) {
      console.warn('Wake Lock request skipped or unavailable:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.warn('Wake Lock release error:', err);
    }
  }, []);

  useEffect(() => {
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // 1. Initialize Compositor & Bridge
  useEffect(() => {
    if (!canvasRef.current) return;

    const comp = new VideoCompositor(canvasRef.current, activeScene, scoreboard);
    comp.layout = stageLayout;
    comp.tickerConfig = tickerConfig;
    comp.brandKit = brandKit;
    comp.start();
    compositorRef.current = comp;

    const rec = new BroadcastRecorder();
    rec.onStateChange((state) => {
      setRecordingState(state);
    });
    recorderRef.current = rec;

    const bridge = new OverlayBridge();
    const unsubscribeBridge = bridge.subscribe((update) => {
      setScoreboard((prev) => {
        const next = { ...prev, ...update };
        comp.updateScoreboard(next);
        return next;
      });
    });
    bridgeRef.current = bridge;

    // Connect real-time Firebase RTDB listener from Hoop Culture Scoreboard
    const unsubscribeScoreboard = scoreboardSync.subscribe((liveState) => {
      setScoreboard(liveState);
      comp.updateScoreboard(liveState);
    });

    const fpsInterval = setInterval(() => {
      if (compositorRef.current) {
        setFps(compositorRef.current.currentFps);
      }
    }, 1000);

    return () => {
      clearInterval(fpsInterval);
      unsubscribeBridge();
      unsubscribeScoreboard();
      bridge.destroy();
      comp.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync Streamlabs layout, ticker, highlighted chat to Compositor
  useEffect(() => {
    if (compositorRef.current) {
      compositorRef.current.layout = stageLayout;
      compositorRef.current.tickerConfig = tickerConfig;
      compositorRef.current.highlightedChat = highlightedChat;
      compositorRef.current.activeBanner = activeBanner;
      compositorRef.current.brandKit = brandKit;
    }
  }, [stageLayout, tickerConfig, highlightedChat, activeBanner, brandKit]);

  // Audio VU Meter Setup
  const setupAudioMeter = useCallback((stream: MediaStream) => {
    try {
      if (stream.getAudioTracks().length === 0) return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
      let lastLevel = 0;
      audioLevelInterval.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const newLevel = Math.min(100, Math.round((avg / 128) * 100));
        // Throttled delta update prevents 10Hz React DOM layout thrashing and canvas flickering
        if (Math.abs(newLevel - lastLevel) >= 12 || (newLevel === 0 && lastLevel > 0)) {
          lastLevel = newLevel;
          setAudioLevel(newLevel);
        }
      }, 300);
    } catch (e) {
      console.warn('Audio meter setup warning:', e);
    }
  }, []);

  // Camera Initialization with Robust Mobile & iOS Safari Fallbacks
  const startCamera = useCallback(
    async (facing: 'environment' | 'user' = 'environment', videoDevId?: string, audioDevId?: string) => {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        const is1080p = settings.targetResolution.startsWith('1080');
        const is60fps = settings.targetResolution.endsWith('60');

        let stream: MediaStream | null = null;

        // Attempt 1: High-resolution requested constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: videoDevId ? undefined : { ideal: facing },
              deviceId: videoDevId ? { exact: videoDevId } : undefined,
              width: { ideal: is1080p ? 1920 : 1280 },
              height: { ideal: is1080p ? 1080 : 720 },
              frameRate: { ideal: is60fps ? 60 : 30 },
            },
            audio: audioDevId
              ? { deviceId: { exact: audioDevId } }
              : true,
          });
        } catch (initialErr) {
          console.warn('High-res getUserMedia rejected, attempting relaxed mobile constraints:', initialErr);
          try {
            // Attempt 2: Relaxed resolution with audio for iPad/phones
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: facing } },
              audio: true,
            });
          } catch (audioErr) {
            console.warn('Audio+video rejected, attempting video only mode:', audioErr);
            // Attempt 3: Video only (e.g. if microphone permission denied on mobile)
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { ideal: facing } },
              audio: false,
            });
          }
        }

        if (!stream) {
          throw new Error('Unable to acquire media stream from device.');
        }

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.playsInline = true;
          await videoRef.current.play().catch((playErr) => {
            console.warn('Video auto-play caught:', playErr);
          });
        }

        if (compositorRef.current && videoRef.current) {
          compositorRef.current.setVideoSource(videoRef.current);
        }

        setHasCamera(stream.getVideoTracks().length > 0);
        setHasAudio(stream.getAudioTracks().length > 0);

        setupAudioMeter(stream);

        const devices = await navigator.mediaDevices.enumerateDevices();
        setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      } catch (err) {
        console.error('Camera access error:', err);
      }
    },
    [settings.targetResolution, setupAudioMeter]
  );

  const hasInitiatedCamera = useRef(false);
  useEffect(() => {
    if (!hasInitiatedCamera.current) {
      hasInitiatedCamera.current = true;
      startCamera(facingMode);
    }
    return () => {
      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera, facingMode]);

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedVideoDeviceId('');
    startCamera(nextFacing);
  };

  // Screen Share Toggle
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (compositorRef.current) {
        compositorRef.current.setScreenShareSource(null);
      }
      setIsScreenSharing(false);
      setParticipants((prev) =>
        prev.map((p) => (p.role === 'screenshare' ? { ...p, onStage: false, videoTrack: undefined } : p))
      );
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = stream;

        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = stream;
          await screenShareVideoRef.current.play().catch(() => {});
        }

        if (compositorRef.current && screenShareVideoRef.current) {
          compositorRef.current.setScreenShareSource(screenShareVideoRef.current);
        }

        setIsScreenSharing(true);
        const track = stream.getVideoTracks()[0];
        setParticipants((prev) =>
          prev.map((p) => (p.role === 'screenshare' ? { ...p, onStage: true, videoTrack: track } : p))
        );

        stream.getVideoTracks()[0].onended = () => {
          handleToggleScreenShare();
        };
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  };

  // Scene Switching
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setSelectedSourceId(null);
    const targetScene = scenes.find((s) => s.id === sceneId);
    if (targetScene && compositorRef.current) {
      compositorRef.current.setScene(targetScene, settings.transitionDurationMs);
    }
  };

  const handleAddScene = (name: string) => {
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name,
      sources: [
        {
          id: `src-cam-${Date.now()}`,
          name: 'Court Camera',
          type: 'camera',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          opacity: 1,
          zIndex: 1,
          visible: true,
          locked: false,
          fit: 'cover',
          facingMode: 'environment',
        },
      ],
    };
    const next = [...scenes, newScene];
    updateScenes(next);
    handleSelectScene(newScene.id);
  };

  const handleDeleteScene = (sceneId: string) => {
    if (scenes.length <= 1) return;
    const next = scenes.filter((s) => s.id !== sceneId);
    updateScenes(next);
    if (activeSceneId === sceneId) {
      handleSelectScene(next[0].id);
    }
  };

  // Source Operations
  const handleAddSource = (type: SourceType) => {
    let newSource: Source;
    const id = `src-${Date.now()}`;
    const highestZ = activeScene.sources.reduce((max, s) => Math.max(max, s.zIndex), 0);
    const newZ = highestZ + 1;

    switch (type) {
      case 'scoreboard':
        newSource = {
          id,
          name: 'Scoreboard HUD',
          type: 'scoreboard',
          x: 480,
          y: 40,
          width: 960,
          height: 120,
          opacity: 1,
          zIndex: newZ,
          visible: true,
          locked: false,
          theme: 'hooptimes',
          scale: 1,
        };
        break;
      case 'browser_url':
        const activeEmail = user?.email || settings.scoreboardSessionUser || 'isidro.pascua@gmail.com';
        newSource = {
          id,
          name: 'Hoop Culture Overlay',
          type: 'browser_url',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          opacity: 1,
          zIndex: newZ,
          visible: true,
          locked: true,
          url: `https://scoreboard.hoopculture.ca/nbaoverlay2?user=${encodeURIComponent(activeEmail)}`,
          syncDataBridge: true,
        };
        break;
      case 'text':
        newSource = {
          id,
          name: 'Court Label',
          type: 'text',
          x: 80,
          y: 920,
          width: 600,
          height: 80,
          opacity: 1,
          zIndex: newZ,
          visible: true,
          locked: false,
          text: 'HOOP CULTURE CHAMPIONSHIPS • COURT 1',
          fontSize: 28,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: '#e8430a',
          padding: 16,
          borderRadius: 10,
        };
        break;
      default:
        newSource = {
          id,
          name: 'Camera Feed',
          type: 'camera',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          opacity: 1,
          zIndex: newZ,
          visible: true,
          locked: false,
          fit: 'cover',
          facingMode: 'environment',
        };
    }

    const next = scenes.map((sc) => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: [...sc.sources, newSource],
        };
      }
      return sc;
    });

    updateScenes(next);
    setSelectedSourceId(id);
  };

  const handleDeleteSource = (sourceId: string) => {
    const next = scenes.map((sc) => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: sc.sources.filter((s) => s.id !== sourceId),
        };
      }
      return sc;
    });
    updateScenes(next);
    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    }
  };

  const handleToggleSourceVisibility = (sourceId: string) => {
    const next = scenes.map((sc) => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: sc.sources.map((s) => (s.id === sourceId ? { ...s, visible: !s.visible } : s)),
        };
      }
      return sc;
    });
    updateScenes(next);
  };

  const handleUpdateSourceTransform = (
    id: string,
    transform: { x: number; y: number; width: number; height: number }
  ) => {
    const next = scenes.map((sc) => {
      if (sc.id === activeSceneId) {
        return {
          ...sc,
          sources: sc.sources.map((s) => (s.id === id ? { ...s, ...transform } : s)),
        };
      }
      return sc;
    });
    updateScenes(next);
  };

  const handleOpenSourceProperties = (sourceId: string) => {
    const src = activeScene.sources.find((s) => s.id === sourceId);
    if (src) {
      setEditingSource(src);
      setIsSourcePropsOpen(true);
    }
  };

  const handleSaveSourceProperties = (updated: Source) => {
    const next = scenes.map((sc) => {
      if (sc.id === activeSceneId) {
        const updatedScene: Scene = {
          ...sc,
          sources: sc.sources.map((s) => (s.id === updated.id ? updated : s)),
        };
        return updatedScene;
      }
      return sc;
    });
    updateScenes(next);
  };

  // Scoreboard changes
  const handleScoreboardChange = (update: Partial<ScoreboardState>) => {
    setScoreboard((prev) => {
      const next = { ...prev, ...update };
      if (compositorRef.current) {
        compositorRef.current.updateScoreboard(next);
      }
      if (bridgeRef.current) {
        bridgeRef.current.broadcast(next);
      }
      if (user) {
        saveSessionState({ scoreboard: next });
      }
      return next;
    });
  };

  // Participant feeds
  const handleToggleOnStage = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, onStage: !p.onStage } : p))
    );
  };

  const handleToggleParticipantMute = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, muted: !p.muted } : p))
    );
  };

  // Chat
  const handleSendChatMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: user?.displayName || profile?.displayName || 'Court Producer',
      platform: 'facebook',
      message: text,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [newMsg, ...prev]);
  };

  // Recording
  const handleToggleRecording = async () => {
    if (!recorderRef.current || !compositorRef.current) return;

    if (recordingState.isRecording) {
      const blob = await recorderRef.current.stop();
      if (blob) {
        handleDownloadRecording();
      }
    } else {
      const compositeStream = compositorRef.current.getCompositeStream(mediaStreamRef.current);
      const success = recorderRef.current.start(compositeStream);
      if (!success) {
        alert('Could not start recording. Check browser permissions and format support.');
      }
    }
  };

  const handleDownloadRecording = () => {
    if (recorderRef.current) {
      const courtTag = (profile?.assignedCourt || 'Court1').replace(/[^a-zA-Z0-9]/g, '_');
      recorderRef.current.downloadRecording(`hoopculture_${courtTag}`);
    }
  };

  // Streaming to Facebook Live & YouTube Live (Multistreaming)
  const handleToggleStreaming = async () => {
    if (isStreaming) {
      if (typeof window !== 'undefined' && !confirm('Are you sure you want to end the live broadcast?')) {
        return;
      }
      // Ending stream
      const fb = settings.fbSettings;
      if (fb?.activeLiveVideoId) {
        try {
          const token = fb.selectedPageToken || fb.userToken || (typeof window !== 'undefined' ? localStorage.getItem('fb_user_access_token') : null);
          await fetch('/api/facebook/live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'end_live',
              liveVideoId: fb.activeLiveVideoId,
              userAccessToken: token,
              pageAccessToken: fb?.selectedPageToken,
            }),
          });
        } catch (e) {
          console.warn('Facebook live end error:', e);
        }
      }
      stopRelayPipeline();
      setIsStreaming(false);
      isStreamingRef.current = false;
      const updatedEnd: StreamSettings = {
        ...settings,
        fbSettings: settings.fbSettings ? { ...settings.fbSettings, activeLiveVideoId: undefined } : settings.fbSettings,
      };
      handleSaveSettings(updatedEnd);
    } else {
      // Open Streamlabs-style Go Live Setup & Destination Selection Modal
      setIsGoLiveModalOpen(true);
    }
  };

  const handleConfirmGoLive = async (config: {
    title: string;
    description: string;
    facebookEnabled: boolean;
    facebookKey: string;
    youtubeEnabled: boolean;
    youtubeKey: string;
    bandwidthPreset: StreamBandwidthPreset;
    bitrateKbps: number;
    fps: number;
  }) => {
    setIsGoLiveModalOpen(false);

    const updatedSettings: StreamSettings = {
      ...settings,
      broadcastTitle: config.title,
      broadcastDescription: config.description,
      bandwidthPreset: config.bandwidthPreset,
      streamKey: config.facebookKey || settings.streamKey,
      fbSettings: settings.fbSettings
        ? {
            ...settings.fbSettings,
            broadcastTitle: config.title,
            broadcastDescription: config.description,
            groupStreamKey: config.facebookKey,
          }
        : undefined,
      ytSettings: {
        enabled: config.youtubeEnabled,
        streamKey: config.youtubeKey,
      },
    };
    handleSaveSettings(updatedSettings);

    const summary =
      config.facebookEnabled && config.youtubeEnabled
        ? 'FB + YT'
        : config.facebookEnabled
          ? 'FB'
          : 'YT';
    setStreamDestinationsSummary(summary);

    startRelayPipeline({
      facebookKey: config.facebookEnabled ? config.facebookKey : '',
      youtubeKey: config.youtubeEnabled ? config.youtubeKey : '',
      bitrateKbps: config.bitrateKbps,
      fps: config.fps,
    });

    setIsStreaming(true);
    isStreamingRef.current = true;
  };

  const destinations: StreamDestinations = {
    facebook: {
      enabled: isStreaming,
      destinationType: settings.fbSettings?.destinationType || 'group',
      pageName: settings.fbSettings?.selectedPageName || 'Hoop Culture Live',
      pageId: settings.fbSettings?.selectedPageId || '',
      groupName: settings.fbSettings?.selectedGroupName || 'Community Group',
      groupId: settings.fbSettings?.selectedGroupId || '',
      streamKey: settings.fbSettings?.groupStreamKey || settings.streamKey,
      permalinkUrl: settings.fbSettings?.permalinkUrl,
    },
    youtube: {
      enabled: false,
      title: 'YouTube Stream',
    },
    twitch: {
      enabled: false,
      channel: 'HoopCulture',
    },
    customRtmp: {
      enabled: false,
      url: settings.rtmpsUrl,
      streamKey: settings.streamKey,
    },
  };

  return (
    <div className="flex flex-col h-full h-[100dvh] w-screen bg-[#080605] overflow-hidden font-sans select-none text-[#f2ede8]">
      {/* Hidden Source Elements */}
      <video
        ref={screenShareVideoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', width: '1px', height: '1px', opacity: 0.001, pointerEvents: 'none', top: 0, left: 0, zIndex: -50 }}
      />

      {/* Streamlabs Top Header Bar */}
      <StreamlabsTopBar
        hasCamera={hasCamera}
        hasAudio={hasAudio}
        audioLevel={audioLevel}
        recordingState={recordingState}
        isStreaming={isStreaming}
        isScreenSharing={isScreenSharing}
        fps={fps}
        destinations={destinations}
        relayStats={relayStats}
        destinationsSummary={streamDestinationsSummary}
        onToggleRecording={handleToggleRecording}
        onDownloadRecording={handleDownloadRecording}
        onToggleStreaming={handleToggleStreaming}
        onToggleScreenShare={handleToggleScreenShare}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuestInvite={() => setIsGuestInviteOpen(true)}
        facingMode={facingMode}
        onFlipCamera={handleFlipCamera}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        scoreboardSyncUser={settings.scoreboardSessionUser || user?.email || profile?.assignedCourt}
        isScoreboardConnected={scoreboard.syncSource !== undefined && scoreboard.syncSource !== 'manual'}
        user={user}
        profile={profile}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={() => signOut()}
        assignedCourt={profile?.assignedCourt || 'Court 1 — Championship Hardwood'}
        onUpdateAssignedCourt={updateAssignedCourt}
        courtOptions={COURT_OPTIONS}
      />

      {/* Main Studio Middle Zone: Program Preview Stage + Streamlabs Right Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main 16:9 Broadcast Stage Canvas with Bounding Box & Interactive Layers */}
        <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
          <PreviewStage
            canvasRef={canvasRef}
            videoRef={videoRef}
            activeScene={activeScene}
            selectedSourceId={selectedSourceId}
            onSelectSource={setSelectedSourceId}
            onUpdateSourceTransform={handleUpdateSourceTransform}
          />

           </div>

        {/* Streamlabs Toolset Sidebar (Desktop Side Panel or Mobile/Tablet Overlay Drawer) */}
        {isSidebarOpen && (
          <div className="fixed inset-y-0 right-0 z-40 md:relative md:inset-auto md:w-80 h-full shadow-2xl flex">
            {/* Mobile / Tablet Backdrop click to close */}
            <div
              className="fixed inset-0 bg-black/60 md:hidden z-30"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative z-40 w-80 max-w-[85vw] h-full flex flex-col bg-[#100d0a] border-l border-[#2a1e14]">
              <SidebarTabs
                chatMessages={chatMessages}
                highlightedChat={highlightedChat}
                onHighlightChat={setHighlightedChat}
                onSendChatMessage={handleSendChatMessage}
                tickerConfig={tickerConfig}
                onUpdateTicker={setTickerConfig}
                activeBanner={activeBanner}
                onToggleBanner={setActiveBanner}
                brandKit={brandKit}
                onUpdateBrandKit={setBrandKit}
                scenes={scenes}
                activeSceneId={activeSceneId}
                selectedSourceId={selectedSourceId}
                onSelectScene={handleSelectScene}
                onAddScene={handleAddScene}
                onDeleteScene={handleDeleteScene}
                onSelectSource={setSelectedSourceId}
                onAddSource={handleAddSource}
                onDeleteSource={handleDeleteSource}
                onToggleSourceVisibility={handleToggleSourceVisibility}
                onOpenSourceProperties={handleOpenSourceProperties}
                scoreboard={scoreboard}
                onChangeScoreboard={handleScoreboardChange}
                micVolume={micVolume}
                micMuted={micMuted}
                onChangeMicVolume={setMicVolume}
                onToggleMicMute={() => setMicMuted(!micMuted)}
                onClose={() => setIsSidebarOpen(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Streamlabs Dedicated Scenes Toolbar (Below Stage, 0% Video Occlusion) */}
      <div className="bg-[#0e0a08] border-t border-[#2a1e14] px-3 py-1.5 flex items-center justify-between text-xs select-none shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <span>SCENES</span>
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {scenes.map((sc) => {
              const isActive = sc.id === activeSceneId;
              let shortName = sc.name;
              if (sc.name.includes('Scorebug 2') || sc.id.includes('nba2')) shortName = '🏀 Scorebug 2';
              else if (sc.name.includes('Lower Third')) shortName = 'Lower Third';
              else if (sc.name.includes('Classic')) shortName = 'Classic NBA';
              else if (sc.name.includes('NBC')) shortName = 'NBC Pro';
              else if (sc.name.includes('Court') || sc.name.includes('Camera')) shortName = 'Court Only';
              else if (sc.name.includes('—')) shortName = sc.name.split('—')[1].trim().replace(/Overlay/gi, '').trim();
              return (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScene(sc.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#e8430a] text-white shadow-sm ring-1 ring-[#ff6b1a]'
                      : 'bg-[#140f0c] text-slate-300 hover:text-white hover:bg-[#1f1712] border border-[#2a1e14]'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  <span>{shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Broadcast Facebook Link when streaming */}
        {isStreaming && (
          <div className="flex items-center gap-2 pl-2">
            <span className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px] animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>LIVE ON FACEBOOK</span>
            </span>
            {settings.fbSettings?.permalinkUrl && (
              <a
                href={settings.fbSettings.permalinkUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-0.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg text-[10px] font-bold shadow transition flex items-center gap-1"
              >
                <span>View Group Post ↗</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Backstage Participant Strip & Layout Switcher (Solo, Split, PIP, Grid) */}
      <BackstageStrip
        participants={participants}
        layout={stageLayout}
        onToggleOnStage={handleToggleOnStage}
        onToggleMute={handleToggleParticipantMute}
        onChangeLayout={setStageLayout}
      />

      {/* Guest Invite Modal */}
      <GuestInviteModal isOpen={isGuestInviteOpen} onClose={() => setIsGuestInviteOpen(false)} />

      {/* Source Properties Modal */}
      <SourcePropertiesModal
        source={editingSource}
        isOpen={isSourcePropsOpen}
        onClose={() => setIsSourcePropsOpen(false)}
        onSave={handleSaveSourceProperties}
      />

      {/* Streamlabs-style Go Live Setup & Destination Selection Modal */}
      <GoLiveModal
        isOpen={isGoLiveModalOpen}
        onClose={() => setIsGoLiveModalOpen(false)}
        settings={settings}
        scoreboard={scoreboard}
        onConfirmGoLive={handleConfirmGoLive}
      />

      {/* Studio Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        videoDevices={videoDevices}
        audioDevices={audioDevices}
        selectedVideoDeviceId={selectedVideoDeviceId}
        selectedAudioDeviceId={selectedAudioDeviceId}
        onSelectVideoDevice={(id) => {
          setSelectedVideoDeviceId(id);
          startCamera(facingMode, id, selectedAudioDeviceId);
        }}
        onSelectAudioDevice={(id) => {
          setSelectedAudioDeviceId(id);
          startCamera(facingMode, selectedVideoDeviceId, id);
        }}
        onExportScenes={() => {
          const json = SceneStorage.exportSceneCollection(scenes);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `hoopculture_scenes_${new Date().toISOString().slice(0, 10)}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
        onImportScenes={(json) => {
          const imported = SceneStorage.importSceneCollection(json);
          if (imported) {
            updateScenes(imported);
            handleSelectScene(imported[0].id);
          }
        }}
        onResetScenes={() => {
          const defaults = SceneStorage.resetToDefaultScenes();
          updateScenes(defaults);
          handleSelectScene(defaults[0].id);
        }}
      />

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#140f0c] border border-[#3a2818] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#e8430a] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#e8430a]/30 font-black text-xl">
              HC
            </div>
            <h3 className="text-lg font-black text-[#f2ede8] uppercase tracking-wide">
              Operator Sign In
            </h3>
            <div className="text-[11px] font-bold text-[#ff6b1a] uppercase tracking-wider mb-3">
              Hoop Culture Ecosystem
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-left text-xs text-red-200 mb-4">
                <p className="font-semibold">{authError}</p>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={async () => {
                  try {
                    await signInGoogle();
                    setIsAuthModalOpen(false);
                  } catch (e) {
                    // handled by authError
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    await signInFacebook();
                    setIsAuthModalOpen(false);
                  } catch (e) {
                    // handled by authError
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1877F2] text-white rounded-xl font-bold text-xs hover:bg-[#166fe5] transition shadow"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Continue with Facebook</span>
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-b border-[#2a1e14]"></div>
              <span className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">or league credentials</span>
              <div className="flex-1 border-b border-[#2a1e14]"></div>
            </div>

            {/* League Email & Password Login */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  const u = await signInWithCredentials(leagueEmail, leaguePassword);
                  if (u) {
                    setIsAuthModalOpen(false);
                  }
                } catch (err) {
                  // error handled by authError
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-left"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  League Email
                </label>
                <input
                  type="email"
                  required
                  value={leagueEmail}
                  onChange={(e) => setLeagueEmail(e.target.value)}
                  placeholder="admin@hoopculture.ca"
                  className="w-full bg-black/60 border border-[#3a2818] rounded-xl px-3 py-2 text-xs text-[#f2ede8] focus:outline-none focus:border-[#e8430a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={leaguePassword}
                  onChange={(e) => setLeaguePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/60 border border-[#3a2818] rounded-xl px-3 py-2 text-xs text-[#f2ede8] focus:outline-none focus:border-[#e8430a]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !leagueEmail || !leaguePassword}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#e8430a] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#ff8c00] disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wide transition shadow"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In to Studio'}
              </button>
            </form>

            <button
              onClick={() => {
                clearAuthError();
                setIsAuthModalOpen(false);
              }}
              className="mt-4 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
