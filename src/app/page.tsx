'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoCompositor } from '@/services/compositor';
import { BroadcastRecorder, RecordingState } from '@/services/recorder';
import { OverlayBridge } from '@/services/overlayBridge';
import { SceneConfig, ScoreboardState, StreamSettings } from '@/types/broadcast';
import { TopBar } from '@/components/studio/TopBar';
import { PreviewStage } from '@/components/studio/PreviewStage';
import { SceneSwitcher } from '@/components/studio/SceneSwitcher';
import { ScoreboardController } from '@/components/studio/ScoreboardController';
import { SettingsModal } from '@/components/studio/SettingsModal';

const DEFAULT_SCENES: SceneConfig[] = [
  {
    id: 'game',
    name: 'Game Action',
    description: 'Court Camera + Scoreboard',
    hasCamera: true,
    showScoreboard: true,
    showSponsor: true,
    showLowerThird: false,
  },
  {
    id: 'intro',
    name: 'Pregame Intro',
    description: 'Matchup Graphics + Branding',
    hasCamera: false,
    showScoreboard: false,
    showSponsor: true,
    showLowerThird: false,
  },
  {
    id: 'interview',
    name: 'Sideline Interview',
    description: 'Camera + Lower-Third Graphic',
    hasCamera: true,
    showScoreboard: false,
    showSponsor: true,
    showLowerThird: true,
    lowerThirdTitle: 'COACH MARCUS STERLING',
    lowerThirdSubtitle: 'Head Coach • Northside Ballers',
  },
  {
    id: 'sponsor',
    name: 'Sponsor Spotlight',
    description: 'Full-Screen Sponsor Partner',
    hasCamera: false,
    showScoreboard: false,
    showSponsor: true,
    showLowerThird: false,
  },
  {
    id: 'halftime',
    name: 'Halftime Break',
    description: 'Halftime Scores & Summary',
    hasCamera: false,
    showScoreboard: false,
    showSponsor: true,
    showLowerThird: false,
  },
];

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
};

export default function BroadcastStudioPage() {
  // Elements
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Engine references
  const compositorRef = useRef<VideoCompositor | null>(null);
  const recorderRef = useRef<BroadcastRecorder | null>(null);
  const bridgeRef = useRef<OverlayBridge | null>(null);

  // Media Streams & Devices
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);

  // Component States
  const [scenes] = useState<SceneConfig[]>(DEFAULT_SCENES);
  const [activeScene, setActiveScene] = useState<SceneConfig>(DEFAULT_SCENES[0]);
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_SCOREBOARD);
  const [settings, setSettings] = useState<StreamSettings>(DEFAULT_SETTINGS);

  // Hardware status
  const [hasCamera, setHasCamera] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fps, setFps] = useState(60);

  // Device lists
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(true);
  const [showIframePreview, setShowIframePreview] = useState(false);

  // Broadcast & Recording
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    durationSeconds: 0,
    recordedBytes: 0,
    mimeType: '',
  });
  const [isStreaming, setIsStreaming] = useState(false);

  // 1. Initialize Video Compositor & Overlay Bridge
  useEffect(() => {
    if (!canvasRef.current) return;

    // Create Compositor
    const comp = new VideoCompositor(canvasRef.current, activeScene, scoreboard);
    comp.start();
    compositorRef.current = comp;

    // Create Recorder
    const rec = new BroadcastRecorder();
    rec.onStateChange((state) => {
      setRecordingState(state);
    });
    recorderRef.current = rec;

    // Create Overlay Bridge for sync
    const bridge = new OverlayBridge();
    const unsubscribe = bridge.subscribe((update) => {
      setScoreboard((prev) => {
        const next = { ...prev, ...update };
        comp.updateScoreboard(next);
        return next;
      });
    });
    bridgeRef.current = bridge;

    // FPS monitoring loop
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

  // Helper to setup Audio VU Meter
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

  // 2. Camera & Microphone Initialization
  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment', videoDevId?: string, audioDevId?: string) => {
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const is1080p = settings.targetResolution.startsWith('1080');
      const is60fps = settings.targetResolution.endsWith('60');

      const videoConstraints: MediaTrackConstraints = {
        facingMode: videoDevId ? undefined : facing,
        deviceId: videoDevId ? { exact: videoDevId } : undefined,
        width: { ideal: is1080p ? 1920 : 1280 },
        height: { ideal: is1080p ? 1080 : 720 },
        frameRate: { ideal: is60fps ? 60 : 30 },
      };

      const audioConstraints: MediaTrackConstraints = {
        deviceId: audioDevId ? { exact: audioDevId } : undefined,
        echoCancellation: false, // Turn off echo cancellation for gym court acoustic fidelity
        noiseSuppression: false,
        autoGainControl: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
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

      // Setup Audio VU Meter
      setupAudioMeter(stream);

      // Refresh device lists
      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch (err) {
      console.error('Camera/Microphone access failed:', err);
      // Fallback: try video only without audio
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        if (compositorRef.current && videoRef.current) {
          compositorRef.current.setVideoSource(videoRef.current);
        }
        setHasCamera(true);
        setHasAudio(false);
      } catch (videoOnlyErr) {
        console.error('Video only access also failed:', videoOnlyErr);
      }
    }
  }, [settings.targetResolution, setupAudioMeter]);

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

  // Flip Camera Front / Back
  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedVideoDeviceId('');
    startCamera(nextFacing);
  };

  // Switch Scene
  const handleSelectScene = (scene: SceneConfig) => {
    setActiveScene(scene);
    if (compositorRef.current) {
      compositorRef.current.setScene(scene);
    }
  };

  // Scoreboard Update
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

  // Game clock countdown in background if running
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
        recorderRef.current.downloadRecording('hooptimes_game_recording');
      }
    } else {
      // Get composite stream with microphone mixed in
      const compositeStream = compositorRef.current.getCompositeStream(mediaStreamRef.current);
      const success = recorderRef.current.start(compositeStream);
      if (!success) {
        alert('Could not start recording. Check browser permissions and format support.');
      }
    }
  };

  const handleDownloadRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.downloadRecording('hooptimes_game_recording');
    }
  };

  // Streaming Handler (Simulated / WHIP relay test)
  const handleToggleStreaming = () => {
    if (isStreaming) {
      setIsStreaming(false);
    } else {
      if (!settings.streamKey && !settings.whipUrl) {
        setIsSettingsOpen(true);
        alert('Please configure your Facebook Live Stream Key or WHIP Relay URL in Settings.');
        return;
      }
      setIsStreaming(true);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* Top Application Bar */}
      <TopBar
        hasCamera={hasCamera}
        hasAudio={hasAudio}
        audioLevel={audioLevel}
        recordingState={recordingState}
        isStreaming={isStreaming}
        fps={fps}
        onToggleRecording={handleToggleRecording}
        onDownloadRecording={handleDownloadRecording}
        onToggleStreaming={handleToggleStreaming}
        onOpenSettings={() => setIsSettingsOpen(true)}
        facingMode={facingMode}
        onFlipCamera={handleFlipCamera}
      />

      {/* Main Studio Center Viewport */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* OBS 16:9 Program Preview Stage */}
        <PreviewStage
          canvasRef={canvasRef}
          videoRef={videoRef}
          activeScene={activeScene}
          overlayUrl={settings.overlayUrl}
          showIframePreview={showIframePreview}
          onToggleIframePreview={() => setShowIframePreview(!showIframePreview)}
          onRefreshIframe={() => {}}
        />

        {/* Live Scoreboard Operator Controller (Right Side on Tablet) */}
        <ScoreboardController
          scoreboard={scoreboard}
          onChange={handleScoreboardChange}
          isOpen={isScoreboardOpen}
          onToggleOpen={() => setIsScoreboardOpen(!isScoreboardOpen)}
        />
      </div>

      {/* OBS-Style Touch Scene Switcher Bar (Bottom) */}
      <SceneSwitcher
        scenes={scenes}
        activeSceneId={activeScene.id}
        onSelectScene={handleSelectScene}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(s) => setSettings(s)}
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
      />
    </div>
  );
}
