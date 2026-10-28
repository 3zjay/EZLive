'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoCompositor } from '@/services/compositor';
import { BroadcastRecorder, RecordingState } from '@/services/recorder';
import { OverlayBridge } from '@/services/overlayBridge';
import { SceneStorage, DEFAULT_OBS_SCENES } from '@/services/sceneStorage';
import { Scene, ScoreboardState, Source, SourceType, StreamSettings } from '@/types/broadcast';
import { TopBar } from '@/components/studio/TopBar';
import { PreviewStage } from '@/components/studio/PreviewStage';
import { ObsDocks } from '@/components/studio/ObsDocks';
import { ScoreboardController } from '@/components/studio/ScoreboardController';
import { SettingsModal } from '@/components/studio/SettingsModal';
import { SourcePropertiesModal } from '@/components/studio/SourcePropertiesModal';

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
};

export default function BroadcastStudioPage() {
  // Canvas and Hidden Video
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

  // OBS Scene & Source State (Initialized from LocalStorage if available)
  const [scenes, setScenes] = useState<Scene[]>(() => SceneStorage.loadScenes());
  const [activeSceneId, setActiveSceneId] = useState<string>(
    () => SceneStorage.loadScenes()[0]?.id || DEFAULT_OBS_SCENES[0].id
  );
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Scoreboard State & Broadcast Settings
  const [scoreboard, setScoreboard] = useState<ScoreboardState>(INITIAL_SCOREBOARD);
  const [settings, setSettings] = useState<StreamSettings>(DEFAULT_SETTINGS);

  // Hardware Status
  const [hasCamera, setHasCamera] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fps, setFps] = useState(60);

  // Device Lists
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');

  // Modals & Panels
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [isSourcePropsOpen, setIsSourcePropsOpen] = useState(false);

  // Recording & Streaming
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

  // Helper to persist scene changes
  const updateScenes = (newScenes: Scene[]) => {
    setScenes(newScenes);
    SceneStorage.saveScenes(newScenes);
    const updatedActive = newScenes.find((s) => s.id === activeSceneId);
    if (updatedActive && compositorRef.current) {
      compositorRef.current.updateCurrentScene(updatedActive);
    }
  };

  // 1. Initialize Video Compositor & Overlay Bridge
  useEffect(() => {
    if (!canvasRef.current) return;

    const comp = new VideoCompositor(canvasRef.current, activeScene, scoreboard);
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
        echoCancellation: false,
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

      setupAudioMeter(stream);

      const devices = await navigator.mediaDevices.enumerateDevices();
      setVideoDevices(devices.filter((d) => d.kind === 'videoinput'));
      setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
    } catch (err) {
      console.error('Camera/Microphone access failed:', err);
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
        console.error('Video only access failed:', videoOnlyErr);
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

  const handleFlipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    setSelectedVideoDeviceId('');
    startCamera(nextFacing);
  };

  // OBS Scene Selection & Transition
  const handleSelectScene = (sceneId: string) => {
    setActiveSceneId(sceneId);
    setSelectedSourceId(null);
    const targetScene = scenes.find((s) => s.id === sceneId);
    if (targetScene && compositorRef.current) {
      const duration = settings.transitionType === 'cut' ? 0 : settings.transitionDurationMs;
      compositorRef.current.setScene(targetScene, duration);
    }
  };

  // OBS Scene Actions: Add, Delete, Rename, Reorder
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

  const handleRenameScene = (sceneId: string, newName: string) => {
    const next = scenes.map((s) => (s.id === sceneId ? { ...s, name: newName } : s));
    updateScenes(next);
  };

  const handleReorderScene = (sceneId: string, direction: 'up' | 'down') => {
    const index = scenes.findIndex((s) => s.id === sceneId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === scenes.length - 1) return;

    const next = [...scenes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = next[index];
    next[index] = next[targetIndex];
    next[targetIndex] = temp;
    updateScenes(next);
  };

  // OBS Source Actions: Add, Delete, Toggle Visibility, Toggle Lock, Reorder, Update Transform
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
          name: 'Video Capture Device (Camera)',
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
          name: 'Sponsor Image / Logo',
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

    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
    setSelectedSourceId(newSource.id);
  };

  const handleDeleteSource = (sourceId: string) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.filter((s) => s.id !== sourceId),
    };
    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
    if (selectedSourceId === sourceId) {
      setSelectedSourceId(null);
    }
  };

  const handleToggleSourceVisibility = (sourceId: string) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.map((s) => (s.id === sourceId ? { ...s, visible: !s.visible } : s)),
    };
    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
  };

  const handleToggleSourceLock = (sourceId: string) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.map((s) => (s.id === sourceId ? { ...s, locked: !s.locked } : s)),
    };
    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
  };

  const handleReorderSource = (sourceId: string, direction: 'up' | 'down') => {
    const sorted = [...activeScene.sources].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((s) => s.id === sourceId);
    if (index === -1) return;
    if (direction === 'down' && index === 0) return;
    if (direction === 'up' && index === sorted.length - 1) return;

    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    const currentZ = sorted[index].zIndex;
    sorted[index].zIndex = sorted[targetIndex].zIndex;
    sorted[targetIndex].zIndex = currentZ;

    const updatedScene = { ...activeScene, sources: sorted };
    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
  };

  const handleUpdateSourceTransform = (
    sourceId: string,
    update: { x: number; y: number; width: number; height: number }
  ) => {
    const updatedScene = {
      ...activeScene,
      sources: activeScene.sources.map((s) => (s.id === sourceId ? { ...s, ...update } : s)),
    };
    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
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
    const next = scenes.map((s) => (s.id === activeScene.id ? updatedScene : s));
    updateScenes(next);
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
        recorderRef.current.downloadRecording('hooptimes_game_recording');
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
      recorderRef.current.downloadRecording('hooptimes_game_recording');
    }
  };

  // Streaming Handler (Automatic Facebook Live API + WHIP Relay)
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
      const fbMode = settings.fbSettings?.mode ?? 'auto';

      if (fbMode === 'auto') {
        const pageName = settings.fbSettings?.selectedPageName || 'Hoop Times Live';
        // Auto-connect to Facebook Page
        setIsStreaming(true);
        console.log(`[Facebook Live] Broadcasting automatically to Page: ${pageName}`);
      } else {
        if (!settings.streamKey && !settings.whipUrl) {
          setIsSettingsOpen(true);
          alert('Please configure your Facebook Live Stream Key or WHIP Relay URL in Settings.');
          return;
        }
        setIsStreaming(true);
      }
    }
  };

  // Scene Collection Export / Import / Reset
  const handleExportScenes = () => {
    const json = SceneStorage.exportSceneCollection(scenes);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ezstudio_scenes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportScenes = (jsonString: string) => {
    const imported = SceneStorage.importSceneCollection(jsonString);
    if (imported && imported.length > 0) {
      updateScenes(imported);
      handleSelectScene(imported[0].id);
      alert('Scene Collection imported successfully!');
    } else {
      alert('Failed to parse scene collection JSON.');
    }
  };

  const handleResetScenes = () => {
    const defaults = SceneStorage.resetToDefaults();
    updateScenes(defaults);
    handleSelectScene(defaults[0].id);
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
        {/* OBS 16:9 Program Preview Stage with Interactive Transform Bounding Box */}
        <PreviewStage
          canvasRef={canvasRef}
          videoRef={videoRef}
          activeScene={activeScene}
          selectedSourceId={selectedSourceId}
          onSelectSource={setSelectedSourceId}
          onUpdateSourceTransform={handleUpdateSourceTransform}
        />

        {/* Live Scoreboard Operator Controller (Right Side on Tablet) */}
        <ScoreboardController
          scoreboard={scoreboard}
          onChange={handleScoreboardChange}
          isOpen={isScoreboardOpen}
          onToggleOpen={() => setIsScoreboardOpen(!isScoreboardOpen)}
        />
      </div>

      {/* OBS DOCKS: Scenes Dock, Sources Dock, Transitions */}
      <ObsDocks
        scenes={scenes}
        activeSceneId={activeSceneId}
        selectedSourceId={selectedSourceId}
        transitionType={settings.transitionType}
        transitionDurationMs={settings.transitionDurationMs}
        onSelectScene={handleSelectScene}
        onAddScene={handleAddScene}
        onDeleteScene={handleDeleteScene}
        onRenameScene={handleRenameScene}
        onReorderScene={handleReorderScene}
        onSelectSource={setSelectedSourceId}
        onAddSource={handleAddSource}
        onDeleteSource={handleDeleteSource}
        onToggleSourceVisibility={handleToggleSourceVisibility}
        onToggleSourceLock={handleToggleSourceLock}
        onReorderSource={handleReorderSource}
        onOpenSourceProperties={handleOpenSourceProperties}
        onChangeTransition={(type, durationMs) =>
          setSettings({ ...settings, transitionType: type, transitionDurationMs: durationMs })
        }
      />

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
        onExportScenes={handleExportScenes}
        onImportScenes={handleImportScenes}
        onResetScenes={handleResetScenes}
      />
    </div>
  );
}
