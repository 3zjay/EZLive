'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoCompositor } from '@/services/compositor';
import { BroadcastRecorder, RecordingState } from '@/services/recorder';
import { OverlayBridge } from '@/services/overlayBridge';
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

const INITIAL_SCOREBOARD: ScoreboardState = {
  homeTeam: 'Lakers',
  awayTeam: 'Warriors',
  homeScore: 84,
  awayScore: 82,
  period: 4,
  gameClock: '02:45',
  isClockRunning: false,
  shotClock: 24,
  homeFouls: 4,
  awayFouls: 3,
  homeTimeouts: 2,
  awayTimeouts: 3,
  bannerText: 'HOOP TIMES BASKETBALL LEAGUE • LIVE BROADCAST',
  sponsorName: 'HOOP TIMES MEDIA',
  possession: 'home',
};

const DEFAULT_SETTINGS: StreamSettings = {
  rtmpsUrl: 'rtmps://live-api-s.facebook.com:443/rtmp/',
  streamKey: '',
  whipUrl: 'https://relay.hooptimes.live/whip',
  targetResolution: '1080p60',
  overlayUrl: '/scoreboard',
  usePostMessageBridge: true,
  transitionType: 'fade',
  transitionDurationMs: 400,
  fbSettings: {
    mode: 'auto',
    userToken: '',
    selectedPageId: 'page-hooptimes',
    selectedPageName: 'Hoop Times Live Broadcasts',
    selectedPageToken: '',
    broadcastTitle: 'Hoop Times Championship Finals - Court 1',
    broadcastDescription: 'Streaming live directly from tablet studio to Facebook Page',
  },
};

const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'Coach Dave',
    platform: 'facebook',
    message: 'Defense is locking it down in the 4th! Let’s go Warriors! 🔥',
    timestamp: 'Just now',
  },
  {
    id: 'msg-2',
    sender: 'HoopFan24',
    platform: 'youtube',
    message: 'Marcus with the clutch three-pointer! Unbelievable shot! 🏀',
    timestamp: '1m ago',
  },
  {
    id: 'msg-3',
    sender: 'Sarah Jenkins',
    platform: 'facebook',
    message: 'Great stream quality from the gym today! Crisp broadcast.',
    timestamp: '2m ago',
  },
];

export default function StreamlabsBroadcastStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);

  // Engine references
  const compositorRef = useRef<VideoCompositor | null>(null);
  const recorderRef = useRef<BroadcastRecorder | null>(null);
  const bridgeRef = useRef<OverlayBridge | null>(null);

  // Streams
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  // State: OBS Scenes & Sources
  const [scenes, setScenes] = useState<Scene[]>(() => SceneStorage.loadScenes());
  const [activeSceneId, setActiveSceneId] = useState<string>(
    () => SceneStorage.loadScenes()[0]?.id || DEFAULT_OBS_SCENES[0].id
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // State: Scoreboard & Settings
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_SCOREBOARD);
  const [settings, setSettings] = useState<StreamSettings>(DEFAULT_SETTINGS);

  // State: Streamlabs Layout & Backstage Feeds
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
      name: 'Scoreboard Screen',
      role: 'screenshare',
      onStage: false,
      hasAudio: false,
      hasVideo: true,
      muted: true,
    },
  ]);

  // State: Streamlabs Features (Chat, Ticker, Banners, Brand Kit)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_CHAT_MESSAGES);
  const [highlightedChat, setHighlightedChat] = useState<ChatMessage | null>(null);
  const [tickerConfig, setTickerConfig] = useState<NewsTickerConfig>({
    enabled: true,
    text: '🏀 HOOP TIMES BASKETBALL TOURNAMENT • FINALS SHOWCASE • STREAMING LIVE TO FACEBOOK • LIKE & SHARE THE STREAM!',
    speed: 120,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    textColor: '#f8fafc',
    fontSize: 20,
  });
  const [activeBanner, setActiveBanner] = useState<StreamlabsBanner | null>(null);
  const [brandKit, setBrandKit] = useState<BrandKit>({
    logoUrl: '/icon.svg',
    logoPosition: 'top-right',
    logoWidth: 180,
    logoHeight: 60,
    primaryColor: '#0284c7',
    accentColor: '#f59e0b',
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

  // State: Recording & Streaming
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationSeconds: 0,
    recordedBytes: 0,
    mimeType: '',
  });
  const [isStreaming, setIsStreaming] = useState(false);

  // Active scene helper
  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  const updateScenes = (newScenes: Scene[]) => {
    setScenes(newScenes);
    SceneStorage.saveScenes(newScenes);
    const updatedActive = newScenes.find((s) => s.id === activeSceneId);
    if (updatedActive && compositorRef.current) {
      compositorRef.current.updateCurrentScene(updatedActive);
    }
  };

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
    const unsubscribe = bridge.subscribe((update) => {
      setScoreboard((prev) => {
        const next = { ...prev, ...update };
        comp.updateScoreboard(next);
        return next;
      });
    });
    bridgeRef.current = bridge;

    const fpsInterval = setInterval(() => {
      if (compositorRef.current) {
        setFps(compositorRef.current.currentFps);
      }
    }, 1000);

    return () => {
      clearInterval(fpsInterval);
      unsubscribe();
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
      audioLevelInterval.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 100);
    } catch (e) {
      console.warn('Audio meter setup warning:', e);
    }
  }, []);

  // Camera Initialization
  const startCamera = useCallback(
    async (facing: 'environment' | 'user' = 'environment', videoDevId?: string, audioDevId?: string) => {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }

        const is1080p = settings.targetResolution.startsWith('1080');
        const is60fps = settings.targetResolution.endsWith('60');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: videoDevId ? undefined : facing,
            deviceId: videoDevId ? { exact: videoDevId } : undefined,
            width: { ideal: is1080p ? 1920 : 1280 },
            height: { ideal: is1080p ? 1080 : 720 },
            frameRate: { ideal: is60fps ? 60 : 30 },
          },
          audio: {
            deviceId: audioDevId ? { exact: audioDevId } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });

        mediaStreamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
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
        prev.map((p) => (p.role === 'screenshare' ? { ...p, onStage: false } : p))
      );
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        if (screenShareVideoRef.current) {
          screenShareVideoRef.current.srcObject = stream;
          await screenShareVideoRef.current.play().catch(() => {});
        }
        if (compositorRef.current && screenShareVideoRef.current) {
          compositorRef.current.setScreenShareSource(screenShareVideoRef.current);
        }
        setIsScreenSharing(true);
        setParticipants((prev) =>
          prev.map((p) => (p.role === 'screenshare' ? { ...p, onStage: true } : p))
        );
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (err) {
        console.warn('Screen share cancelled:', err);
      }
    }
  };

  // Backstage participant toggles
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

  // Chat message send
  const handleSendChatMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: 'Studio Host',
      platform: 'studio',
      message: text,
      timestamp: 'Just now',
    };
    setChatMessages((prev) => [newMsg, ...prev]);
  };

  // OBS Scene Actions
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setSelectedSourceId(null);
    const targetScene = scenes.find((s) => s.id === sceneId);
    if (targetScene && compositorRef.current) {
      const duration = settings.transitionType === 'cut' ? 0 : settings.transitionDurationMs;
      compositorRef.current.setScene(targetScene, duration);
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
          visible: true,
          locked: true,
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          opacity: 1,
          zIndex: 1,
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

  const handleAddSource = (type: SourceType) => {
    const highestZ = activeScene.sources.reduce((max, s) => Math.max(max, s.zIndex), 0);
    const newZ = highestZ + 1;
    const timestamp = Date.now();

    let newSource: Source;
    switch (type) {
      case 'browser_url':
        newSource = {
          id: `src-browser-${timestamp}`,
          name: 'Browser Source (Vercel URL)',
          type: 'browser_url',
          visible: true,
          locked: false,
          url: settings.overlayUrl || '/scoreboard',
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          opacity: 1,
          zIndex: newZ,
          syncDataBridge: true,
        };
        break;
      case 'camera':
        newSource = {
          id: `src-cam-${timestamp}`,
          name: 'Camera Source',
          type: 'camera',
          visible: true,
          locked: false,
          x: 0,
          y: 0,
          width: 1920,
          height: 1080,
          opacity: 1,
          zIndex: newZ,
          fit: 'cover',
          facingMode: 'environment',
        };
        break;
      case 'image':
        newSource = {
          id: `src-img-${timestamp}`,
          name: 'Image / Sponsor Watermark',
          type: 'image',
          visible: true,
          locked: false,
          url: '/icon.svg',
          x: 1600,
          y: 40,
          width: 260,
          height: 140,
          opacity: 1,
          zIndex: newZ,
          fit: 'contain',
        };
        break;
      case 'text':
        newSource = {
          id: `src-text-${timestamp}`,
          name: 'Text / Lower-Third',
          type: 'text',
          visible: true,
          locked: false,
          text: 'LIVE BASKETBALL BROADCAST',
          fontSize: 28,
          fontFamily: 'sans-serif',
          fontWeight: 'bold',
          color: '#ffffff',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          padding: 16,
          borderRadius: 10,
          x: 80,
          y: 920,
          width: 600,
          height: 80,
          opacity: 1,
          zIndex: newZ,
        };
        break;
      case 'scoreboard':
        newSource = {
          id: `src-sb-${timestamp}`,
          name: 'Basketball Scoreboard HUD',
          type: 'scoreboard',
          visible: true,
          locked: false,
          x: 480,
          y: 40,
          width: 960,
          height: 120,
          opacity: 1,
          zIndex: newZ,
          theme: 'hooptimes',
          scale: 1,
        };
        break;
      case 'color_solid':
        newSource = {
          id: `src-color-${timestamp}`,
          name: 'Color Solid Banner',
          type: 'color_solid',
          visible: true,
          locked: false,
          color: '#0f172a',
          borderRadius: 12,
          x: 100,
          y: 100,
          width: 500,
          height: 100,
          opacity: 0.9,
          zIndex: newZ,
        };
        break;
    }

    const updatedScene = {
      ...activeScene,
      sources: [...activeScene.sources, newSource],
    };
    updateScenes(scenes.map((s) => (s.id === activeScene.id ? updatedScene : s)));
    setSelectedSourceId(newSource.id);
  };

  const handleDeleteSource = (sourceId: string) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.filter((s) => s.id !== sourceId),
    };
    updateScenes(scenes.map((s) => (s.id === activeScene.id ? updatedScene : s)));
    if (selectedSourceId === sourceId) setSelectedSourceId(null);
  };

  const handleToggleSourceVisibility = (sourceId: string) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.map((s) => (s.id === sourceId ? { ...s, visible: !s.visible } : s)),
    };
    updateScenes(scenes.map((s) => (s.id === activeScene.id ? updatedScene : s)));
  };

  const handleUpdateSourceTransform = (
    sourceId: string,
    update: { x: number; y: number; width: number; height: number }
  ) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.map((s) => (s.id === sourceId ? { ...s, ...update } : s)),
    };
    updateScenes(scenes.map((s) => (s.id === activeScene.id ? updatedScene : s)));
  };

  const handleOpenSourceProperties = (sourceId: string) => {
    const target = activeScene.sources.find((s) => s.id === sourceId);
    if (target) {
      setEditingSource(target);
      setIsSourcePropsOpen(true);
    }
  };

  const handleSaveSourceProperties = (updated: Source) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.map((s) => (s.id === updated.id ? updated : s)),
    };
    updateScenes(scenes.map((s) => (s.id === activeScene.id ? updatedScene : s)));
  };

  // Scoreboard changes
  const handleScoreboardChange = (update: Partial<ScoreboardState>) => {
    const next = { ...scoreboard, ...update };
    setScoreboard(next);
    if (compositorRef.current) {
      compositorRef.current.updateScoreboard(next);
    }
    if (bridgeRef.current && settings.usePostMessageBridge) {
      bridgeRef.current.broadcast(update);
    }
  };

  // Clock countdown loop
  useEffect(() => {
    if (!scoreboard.isClockRunning) return;
    const interval = setInterval(() => {
      setScoreboard((prev) => {
        const parts = prev.gameClock.split(':');
        const mins = parseInt(parts[0], 10) || 0;
        const secs = parseInt(parts[1], 10) || 0;
        let total = mins * 60 + secs;
        if (total <= 0) {
          const ended = { ...prev, isClockRunning: false, gameClock: '00:00' };
          if (compositorRef.current) compositorRef.current.updateScoreboard(ended);
          return ended;
        }
        total -= 1;
        const newM = Math.floor(total / 60);
        const newS = total % 60;
        const clockStr = `${newM.toString().padStart(2, '0')}:${newS.toString().padStart(2, '0')}`;
        const updated = { ...prev, gameClock: clockStr };
        if (compositorRef.current) compositorRef.current.updateScoreboard(updated);
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [scoreboard.isClockRunning]);

  // Recording Handlers
  const handleToggleRecording = async () => {
    if (!recorderRef.current || !compositorRef.current) return;
    if (recordingState.isRecording) {
      const blob = await recorderRef.current.stop();
      if (blob) {
        recorderRef.current.downloadRecording('streamlabs_game_recording');
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
      recorderRef.current.downloadRecording('streamlabs_game_recording');
    }
  };

  // Streaming Handlers (Streamlabs Meta API Auto-Connect)
  const handleToggleStreaming = async () => {
    if (isStreaming) {
      if (settings.fbSettings?.activeLiveVideoId && settings.fbSettings.selectedPageToken) {
        try {
          await fetch('/api/facebook/live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'end_live',
              pageAccessToken: settings.fbSettings.selectedPageToken,
              liveVideoId: settings.fbSettings.activeLiveVideoId,
            }),
          });
        } catch (e) {
          console.warn('Failed to cleanly end Facebook Live via API:', e);
        }
      }
      setIsStreaming(false);
    } else {
      setIsStreaming(true);
    }
  };

  const destinations: StreamDestinations = {
    facebook: {
      enabled: isStreaming,
      pageName: settings.fbSettings?.selectedPageName || 'Hoop Times Live',
      pageId: settings.fbSettings?.selectedPageId || 'page-hooptimes',
    },
    youtube: {
      enabled: false,
      title: 'YouTube Stream',
    },
    twitch: {
      enabled: false,
      channel: 'HoopTimes',
    },
    customRtmp: {
      enabled: false,
      url: settings.rtmpsUrl,
      streamKey: settings.streamKey,
    },
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* Hidden Source Elements */}
      <video ref={screenShareVideoRef} autoPlay playsInline muted className="hidden" />

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
        onToggleRecording={handleToggleRecording}
        onDownloadRecording={handleDownloadRecording}
        onToggleStreaming={handleToggleStreaming}
        onToggleScreenShare={handleToggleScreenShare}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuestInvite={() => setIsGuestInviteOpen(true)}
        facingMode={facingMode}
        onFlipCamera={handleFlipCamera}
      />

      {/* Main Studio Middle Zone: Program Preview Stage + Streamlabs Right Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main 16:9 Broadcast Stage Canvas with Bounding Box & Interactive Layers */}
        <PreviewStage
          canvasRef={canvasRef}
          videoRef={videoRef}
          activeScene={activeScene}
          selectedSourceId={selectedSourceId}
          onSelectSource={setSelectedSourceId}
          onUpdateSourceTransform={handleUpdateSourceTransform}
        />

        {/* Streamlabs Toolset Sidebar (Chat, Ticker, Brand, OBS, Scores, Mixer) */}
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
        />
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

      {/* Studio Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
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
          a.download = `streamlabs_scenes_${new Date().toISOString().slice(0, 10)}.json`;
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
          const defaults = SceneStorage.resetToDefaults();
          updateScenes(defaults);
          handleSelectScene(defaults[0].id);
        }}
      />
    </div>
  );
}
