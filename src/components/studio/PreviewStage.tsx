'use client';

import React, { useRef, useState } from 'react';
import { Maximize2, Minimize2, Grid, Lock, Camera, Monitor, RefreshCw, RotateCcw, Zap, Sliders, SunMedium, Flashlight, FlipHorizontal, Focus, Sparkles, X } from 'lucide-react';
import { Scene, Source } from '@/types/broadcast';

export interface ProCameraCapabilities {
  zoomSupported: boolean;
  zoomMin: number;
  zoomMax: number;
  torchSupported: boolean;
  focusModes: string[];
  exposureModes: string[];
  exposureCompMin: number;
  exposureCompMax: number;
  whiteBalanceModes: string[];
}

export interface ProCameraSettings {
  zoom: number;
  panX: number;
  panY: number;
  torch: boolean;
  focusMode: 'continuous' | 'manual' | 'single-shot';
  exposureCompensation: number;
  whiteBalanceMode: 'continuous' | 'manual';
  colorTemperature: number;
  brightness: number;
  contrast: number;
  saturation: number;
  mirror: boolean;
  resolutionPreset: '720p30' | '1080p30' | '1080p60';
}

interface PreviewStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeScene: Scene;
  selectedSourceId: string | null;
  onSelectSource: (id: string | null) => void;
  onUpdateSourceTransform: (id: string, update: { x: number; y: number; width: number; height: number }) => void;
  hasCamera?: boolean;
  isScreenSharing?: boolean;
  cameraError?: string | null;
  videoDevices?: MediaDeviceInfo[];
  selectedVideoDeviceId?: string;
  onSelectVideoDevice?: (deviceId: string) => void;
  onRetryCamera?: () => void;
  onToggleScreenShare?: () => void;
  onFlipCamera?: () => void;
  onTriggerInstantReplay?: () => void;
  onOpenScoreboardControl?: () => void;
  isStreaming?: boolean;
  cameraCapabilities?: ProCameraCapabilities;
  proCameraSettings?: ProCameraSettings;
  onUpdateProCamera?: (partial: Partial<ProCameraSettings>) => void;
  onSelectCameraResolution?: (preset: '720p30' | '1080p30' | '1080p60') => void;
}

const PreviewStageComponent: React.FC<PreviewStageProps> = ({
  canvasRef,
  videoRef,
  activeScene,
  selectedSourceId,
  onSelectSource,
  onUpdateSourceTransform,
  hasCamera = true,
  isScreenSharing = false,
  cameraError,
  videoDevices = [],
  selectedVideoDeviceId = '',
  onSelectVideoDevice,
  onRetryCamera,
  onToggleScreenShare,
  onFlipCamera,
  onTriggerInstantReplay,
  onOpenScoreboardControl,
  isStreaming = false,
  cameraCapabilities,
  proCameraSettings,
  onUpdateProCamera,
  onSelectCameraResolution,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showProCamDrawer, setShowProCamDrawer] = useState(false);
  const [isConnectingCam, setIsConnectingCam] = useState(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Dragging state for bounding box
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const sources = activeScene?.sources || [];
  const selectedSource = sources.find((s) => s.id === selectedSourceId);
  const hasCameraSourceInScene = sources.some((s) => s.type === 'camera' && s.visible);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Convert client mouse/touch event to 1920x1080 canvas coordinates
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!stageBoxRef.current) return { x: 0, y: 0 };
    const rect = stageBoxRef.current.getBoundingClientRect();
    const scaleX = 1920 / rect.width;
    const scaleY = 1080 / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent, handle: string | null) => {
    if (!selectedSource || selectedSource.locked) return;
    e.stopPropagation();
    setIsDragging(true);
    setDragHandle(handle);

    const coords = getCanvasCoords(e.clientX, e.clientY);
    dragStartRef.current = {
      mouseX: coords.x,
      mouseY: coords.y,
      startX: selectedSource.x,
      startY: selectedSource.y,
      startW: selectedSource.width,
      startH: selectedSource.height,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !selectedSource || !dragStartRef.current || selectedSource.locked) return;
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const dx = coords.x - dragStartRef.current.mouseX;
    const dy = coords.y - dragStartRef.current.mouseY;

    const { startX, startY, startW, startH } = dragStartRef.current;

    let newX = startX;
    let newY = startY;
    let newW = startW;
    let newH = startH;

    if (dragHandle === 'body') {
      newX = Math.round(startX + dx);
      newY = Math.round(startY + dy);
    } else if (dragHandle === 'br') {
      newW = Math.max(40, Math.round(startW + dx));
      newH = Math.max(30, Math.round(startH + dy));
    } else if (dragHandle === 'bl') {
      const possibleW = Math.max(40, Math.round(startW - dx));
      newX = Math.round(startX + (startW - possibleW));
      newW = possibleW;
      newH = Math.max(30, Math.round(startH + dy));
    } else if (dragHandle === 'tr') {
      newW = Math.max(40, Math.round(startW + dx));
      const possibleH = Math.max(30, Math.round(startH - dy));
      newY = Math.round(startY + (startH - possibleH));
      newH = possibleH;
    } else if (dragHandle === 'tl') {
      const possibleW = Math.max(40, Math.round(startW - dx));
      const possibleH = Math.max(30, Math.round(startH - dy));
      newX = Math.round(startX + (startW - possibleW));
      newY = Math.round(startY + (startH - possibleH));
      newW = possibleW;
      newH = possibleH;
    }

    onUpdateSourceTransform(selectedSource.id, {
      x: newX,
      y: newY,
      width: newW,
      height: newH,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragHandle(null);
      dragStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Convert 1920x1080 canvas coords to % of stage for DOM elements
  const toPercent = (val: number, max: number) => `${(val / max) * 100}%`;

  // Two-finger Pinch-to-Zoom on mobile/foldable court screens
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && onUpdateProCamera && proCameraSettings) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDistRef.current = Math.hypot(dx, dy);
      pinchStartZoomRef.current = proCameraSettings.zoom || 1;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current && onUpdateProCamera) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStartDistRef.current;
      const nextZoom = Math.max(1, Math.min(10, Number((pinchStartZoomRef.current * ratio).toFixed(2))));
      onUpdateProCamera({ zoom: nextZoom });
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
  };

  const formatLensLabel = (dev: MediaDeviceInfo, idx: number): string => {
    const raw = (dev.label || `Camera ${idx + 1}`).trim();
    const lower = raw.toLowerCase();
    if (lower.includes('ultra') || lower.includes('0.5') || lower.includes('0.6') || lower.includes('wide-angle')) {
      return `0.6x Ultra-Wide (${raw})`;
    }
    if (lower.includes('tele') || lower.includes('periscope') || lower.includes('3x') || lower.includes('5x')) {
      return `Telephoto (${raw})`;
    }
    if (lower.includes('front') || lower.includes('user') || lower.includes('selfie') || lower.includes('cover')) {
      return `Front / Cover (${raw})`;
    }
    if (lower.includes('back') || lower.includes('rear') || lower.includes('environment')) {
      return `Rear Lens ${idx + 1} (${raw})`;
    }
    return raw;
  };

  // Map scoreboard.hoopculture.ca overlay URLs directly to our local copied /overlays/*.html files
  const resolveOverlayUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    try {
      const lower = rawUrl.toLowerCase();
      if (lower.includes('scoreboard.hoopculture.ca') || lower.startsWith('/overlays/')) {
        const parsed = new URL(rawUrl, typeof window !== 'undefined' ? window.location.origin : 'https://live.hoopculture.ca');
        const userParam = parsed.searchParams.get('user') || 'isidro.pascua@gmail.com';
        const path = parsed.pathname.toLowerCase();
        if (path.includes('nbaoverlay2')) {
          return `/overlays/nbaoverlay2.html?user=${encodeURIComponent(userParam)}`;
        }
        if (path.includes('fullscreen')) {
          return `/overlays/fullscreen.html?user=${encodeURIComponent(userParam)}`;
        }
        if (path.includes('nbc')) {
          return `/overlays/nbc.html?user=${encodeURIComponent(userParam)}`;
        }
        if (path.includes('nbaoverlay')) {
          return `/overlays/nbaoverlay.html?user=${encodeURIComponent(userParam)}`;
        }
      }
    } catch {}
    return rawUrl;
  };

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full h-full min-h-0 min-w-0 bg-black flex items-center justify-center overflow-hidden select-none p-1 sm:p-2"
      onClick={() => onSelectSource(null)}
    >
      {/* 16:9 Stage Viewport Container — Responsive for Phone, iPad & Desktop */}
      <div
        ref={stageBoxRef}
        className="relative aspect-video w-full max-w-full max-h-full flex items-center justify-center bg-slate-950 shadow-2xl touch-none rounded-lg overflow-hidden border border-[#2a1e14]"
        style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Composited Canvas */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className="w-full h-full object-contain pointer-events-none"
          style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
        />

        {/* Interactive Camera / Screen Share Quick-Connect Card when no camera feed is active */}
        {hasCameraSourceInScene && !hasCamera && !isScreenSharing && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 z-40 flex items-center justify-center p-4 pointer-events-auto"
          >
            <div className="bg-[#120d0a]/95 border border-[#3a2818] rounded-2xl p-4 sm:p-5 max-w-md w-full text-center shadow-2xl backdrop-blur-md space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#e8430a]/20 border border-[#e8430a]/40 text-[#ff6b1a] flex items-center justify-center mx-auto">
                <Camera size={20} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Connect Video Source
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {cameraError || 'Select a webcam / USB capture card below, or share your screen to start broadcasting.'}
                </p>
              </div>

              {videoDevices.length > 0 && onSelectVideoDevice && (
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => onSelectVideoDevice(e.target.value)}
                  className="w-full bg-[#080605] border border-[#2a1e14] rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-[#ff6b1a]"
                >
                  <option value="">Default Camera / Webcam</option>
                  {videoDevices.map((dev, idx) => (
                    <option key={dev.deviceId || idx} value={dev.deviceId}>
                      {dev.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                {onRetryCamera && (
                  <button
                    type="button"
                    disabled={isConnectingCam}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setIsConnectingCam(true);
                      try {
                        await onRetryCamera();
                      } finally {
                        setTimeout(() => setIsConnectingCam(false), 900);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#e8430a] hover:bg-[#ff6b1a] disabled:opacity-50 text-white font-black text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                  >
                    <RefreshCw size={13} className={isConnectingCam ? 'animate-spin' : ''} />
                    <span>{isConnectingCam ? 'Connecting Camera...' : 'Connect Camera'}</span>
                  </button>
                )}
                {onToggleScreenShare && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleScreenShare();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#1b1410] hover:bg-[#261c16] border border-[#3a2818] text-amber-300 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                  >
                    <Monitor size={13} />
                    <span>Share Screen Instead</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Genuine HTML Scoreboard Overlays & Browser URL Sources */}
        {sources
          .filter(
            (s): s is Extract<Source, { type: 'browser_url' }> =>
              s.type === 'browser_url' && s.visible && Boolean(s.url)
          )
          .map((source) => {
            const resolvedSrc = resolveOverlayUrl(source.url);
            return (
              <div
                key={`${source.id}-${resolvedSrc}`}
                className="absolute pointer-events-none inset-0 w-full h-full"
                style={{
                  opacity: source.opacity,
                  zIndex: source.zIndex + 10,
                  transform: 'translateZ(0)',
                  backfaceVisibility: 'hidden',
                }}
              >
                <iframe
                  src={resolvedSrc}
                  className="w-full h-full border-0 bg-transparent pointer-events-none"
                  title={source.name}
                  allow="camera; microphone; autoplay"
                />
              </div>
            );
          })}

        {/* OBS Interactive Red Bounding Box & Transform Handles */}
        {selectedSource && selectedSource.visible && (
          <div
            className={`absolute border-2 ${
              selectedSource.locked ? 'border-amber-500/80' : 'border-red-500'
            } z-30 transition-none touch-none`}
            style={{
              left: toPercent(selectedSource.x, 1920),
              top: toPercent(selectedSource.y, 1080),
              width: toPercent(selectedSource.width, 1920),
              height: toPercent(selectedSource.height, 1080),
              cursor: selectedSource.locked ? 'default' : 'move',
            }}
            onPointerDown={(e) => handlePointerDown(e, 'body')}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Tag with Source Name and Dimensions */}
            <div className="absolute -top-6 left-0 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-t flex items-center gap-1.5 whitespace-nowrap shadow select-none">
              {selectedSource.locked && <Lock size={10} />}
              <span>{selectedSource.name}</span>
              <span className="text-red-200 font-mono text-[9px]">
                ({selectedSource.width}×{selectedSource.height})
              </span>
            </div>

            {/* Corner Resize Handles - Enhanced with 36x36px touch hit targets for iPad */}
            {!selectedSource.locked && (
              <>
                <div
                  className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-red-600 rounded-sm cursor-nwse-resize shadow touch-none before:content-[''] before:absolute before:-inset-3 before:cursor-nwse-resize"
                  onPointerDown={(e) => handlePointerDown(e, 'tl')}
                />
                <div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-red-600 rounded-sm cursor-nesw-resize shadow touch-none before:content-[''] before:absolute before:-inset-3 before:cursor-nesw-resize"
                  onPointerDown={(e) => handlePointerDown(e, 'tr')}
                />
                <div
                  className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-red-600 rounded-sm cursor-nesw-resize shadow touch-none before:content-[''] before:absolute before:-inset-3 before:cursor-nesw-resize"
                  onPointerDown={(e) => handlePointerDown(e, 'bl')}
                />
                <div
                  className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-red-600 rounded-sm cursor-nwse-resize shadow touch-none before:content-[''] before:absolute before:-inset-3 before:cursor-nwse-resize"
                  onPointerDown={(e) => handlePointerDown(e, 'br')}
                />
              </>
            )}
          </div>
        )}

        {/* Framing & Court Grid */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-3 grid-rows-3 border border-white/20">
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15 relative flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border border-sky-400/50 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              </div>
            </div>
            <div className="border-b border-white/15" />
            <div className="border-r border-white/15" />
            <div className="border-r border-white/15" />
            <div />
          </div>
        )}

        {/* Program Active Scene Badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 sm:gap-2 z-20 pointer-events-none">
          <div
            className={`px-2 py-0.5 sm:px-2.5 sm:py-1 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest rounded-md shadow flex items-center gap-1 ${
              isStreaming ? 'bg-rose-600 ring-1 ring-rose-400' : 'bg-red-600'
            }`}
          >
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white animate-pulse" />
            {isStreaming ? 'ON AIR (RTMP)' : 'PROGRAM'}
          </div>
          <div className="px-2 py-0.5 sm:px-2.5 sm:py-1 bg-slate-900/90 text-slate-200 text-[10px] sm:text-xs font-bold rounded-md border border-slate-700/80 backdrop-blur-sm truncate max-w-[140px] sm:max-w-none">
            {activeScene.name}
          </div>
        </div>

        {/* Viewport Control & Native Camera Action Pills */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-1.5 sm:gap-2 z-30"
        >
          {/* Quick Optical / Digital Zoom Pills on Stage (1x, 2x, 3x, 5x) — Available on All Devices */}
          {hasCamera && proCameraSettings && onUpdateProCamera && (
            <div className="flex items-center bg-slate-950/90 border border-slate-700/80 rounded-lg p-0.5 backdrop-blur-md shadow">
              {[1, 2, 3, 5].map((z) => {
                const isActive = Math.abs((proCameraSettings.zoom || 1) - z) < 0.25;
                return (
                  <button
                    key={z}
                    type="button"
                    onClick={() => onUpdateProCamera({ zoom: z, ...(z === 1 ? { panX: 0, panY: 0 } : {}) })}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-black transition ${
                      isActive
                        ? 'bg-[#e8430a] text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title={`${z}x Court Zoom`}
                  >
                    {z}x
                  </button>
                );
              })}
            </div>
          )}

          {/* Pro Camera Settings Drawer Button (Fold 8 Ultra / Multi-Lens / Exposure / Torch / Pan) */}
          {proCameraSettings && onUpdateProCamera && (
            <button
              type="button"
              onClick={() => setShowProCamDrawer(!showProCamDrawer)}
              className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border backdrop-blur-sm transition flex items-center gap-1 text-[10px] sm:text-xs font-bold shadow active:scale-95 ${
                showProCamDrawer
                  ? 'bg-[#e8430a] border-[#ff6b1a] text-white'
                  : 'bg-slate-900/85 hover:bg-slate-800 text-sky-300 border-sky-500/40'
              }`}
              title="Pro Camera Controls (Multi-Lens, Zoom, Exposure, Torch, White Balance)"
            >
              <Camera size={13} />
              <span>Pro Cam</span>
              {proCameraSettings.zoom > 1.05 && (
                <span className="px-1 py-0.2 bg-black/40 rounded text-[9px] font-mono text-amber-300">
                  {proCameraSettings.zoom.toFixed(1)}x
                </span>
              )}
            </button>
          )}

          {onFlipCamera && hasCamera && (
            <button
              type="button"
              onClick={onFlipCamera}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-900/85 hover:bg-slate-800 text-[#ff6b1a] rounded-lg border border-[#ff6b1a]/40 backdrop-blur-sm transition flex items-center gap-1 text-[10px] sm:text-xs font-bold shadow active:scale-95"
              title="Flip Front / Rear Camera"
            >
              <RotateCcw size={13} />
              <span className="hidden xs:inline">Flip</span>
            </button>
          )}

          {onTriggerInstantReplay && (
            <button
              type="button"
              onClick={onTriggerInstantReplay}
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-amber-950/85 hover:bg-amber-900 text-amber-300 rounded-lg border border-amber-500/40 backdrop-blur-sm transition flex items-center gap-1 text-[10px] sm:text-xs font-bold shadow active:scale-95"
              title="10s Slow-Mo Instant Replay"
            >
              <Zap size={13} className="text-amber-400" />
              <span className="hidden xs:inline">10s Replay</span>
            </button>
          )}

          {onOpenScoreboardControl && (
            <button
              type="button"
              onClick={onOpenScoreboardControl}
              className="xl:hidden px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-900/85 hover:bg-slate-800 text-emerald-300 rounded-lg border border-emerald-500/40 backdrop-blur-sm transition flex items-center gap-1 text-[10px] sm:text-xs font-bold shadow active:scale-95"
              title="Open Scoreboard & Streamlabs Controls"
            >
              <Sliders size={13} />
              <span className="hidden sm:inline">Score / Tools</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border backdrop-blur-sm transition ${
              showGrid
                ? 'bg-sky-600 border-sky-400 text-white'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle Basketball Court Alignment Grid"
          >
            <Grid size={14} />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 backdrop-blur-sm transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>

        {/* Pro Camera HUD Drawer (Multi-Lens Switcher, Smooth Optical/Digital Zoom, Pan, Exposure, Torch, Color Grade) */}
        {showProCamDrawer && proCameraSettings && onUpdateProCamera && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-12 right-2 sm:right-3 z-40 w-80 sm:w-96 max-h-[82%] overflow-y-auto bg-[#0e0a08]/95 border border-[#3a2818] rounded-2xl p-3.5 text-slate-100 shadow-2xl backdrop-blur-xl space-y-3"
          >
            <div className="flex items-center justify-between border-b border-[#2a1e14] pb-2">
              <div className="flex items-center gap-2">
                <Camera size={15} className="text-[#ff6b1a]" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Pro Camera Studio Controls
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProCamDrawer(false)}
                className="p-1 rounded-lg bg-[#1c140f] hover:bg-[#2a1e14] text-slate-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            {/* 1. Physical Lens / Camera Hardware Selector (Fold 8 Ultra Multi-Lens Array) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Physical Camera / Lens</span>
                {onRetryCamera && (
                  <button
                    type="button"
                    onClick={onRetryCamera}
                    className="text-[#ff6b1a] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={10} /> Re-sync Lens
                  </button>
                )}
              </div>
              <select
                value={selectedVideoDeviceId}
                onChange={(e) => onSelectVideoDevice && onSelectVideoDevice(e.target.value)}
                className="w-full bg-[#16100c] border border-[#2f2219] rounded-xl px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#ff6b1a]"
              >
                <option value="">Auto Primary Lens (Environment / Rear)</option>
                {videoDevices.map((dev, idx) => (
                  <option key={dev.deviceId || idx} value={dev.deviceId}>
                    {formatLensLabel(dev, idx)}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Sensor Resolution & Frame Rate */}
            {onSelectCameraResolution && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Sensor Capture Mode
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: '720p30', label: '720p • 30fps', sub: 'Battery Saver' },
                      { id: '1080p30', label: '1080p • 30fps', sub: 'Full HD Crisp' },
                      { id: '1080p60', label: '1080p • 60fps', sub: 'Ultra Pro 60' },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectCameraResolution(preset.id)}
                      className={`p-1.5 rounded-xl border text-center transition ${
                        proCameraSettings.resolutionPreset === preset.id
                          ? 'bg-[#e8430a]/20 border-[#ff6b1a] text-white'
                          : 'bg-[#16100c] border-[#2a1e14] text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="text-[11px] font-black">{preset.label}</div>
                      <div className="text-[9px] opacity-75">{preset.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Optical + Digital Smooth Zoom (1.0x - 10.0x) */}
            <div className="space-y-1.5 bg-[#140e0b] p-2.5 rounded-xl border border-[#261b13]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                  Zoom ({cameraCapabilities?.zoomSupported ? 'Hardware Optical + Digital' : 'High-Precision Digital'})
                </span>
                <span className="text-xs font-black font-mono text-[#ff6b1a]">
                  {proCameraSettings.zoom.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.1}
                value={proCameraSettings.zoom}
                onChange={(e) => {
                  const z = parseFloat(e.target.value);
                  onUpdateProCamera({ zoom: z, ...(z <= 1.05 ? { panX: 0, panY: 0 } : {}) });
                }}
                className="w-full accent-[#e8430a] cursor-pointer"
              />
              <div className="flex items-center justify-between gap-1 pt-1">
                {[1, 1.5, 2, 3, 5, 8, 10].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => onUpdateProCamera({ zoom: z, ...(z === 1 ? { panX: 0, panY: 0 } : {}) })}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-black border transition ${
                      Math.abs(proCameraSettings.zoom - z) < 0.15
                        ? 'bg-[#e8430a] border-[#ff6b1a] text-white'
                        : 'bg-[#1d1410] border-[#2f2219] text-slate-300 hover:text-white'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>

              {/* Court Pan X / Y when zoomed in */}
              {proCameraSettings.zoom > 1.05 && (
                <div className="pt-2 mt-2 border-t border-[#261b13] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>Court Horizontal Pan (Left / Right)</span>
                    <button
                      type="button"
                      onClick={() => onUpdateProCamera({ panX: 0, panY: 0 })}
                      className="text-[9px] text-amber-400 hover:underline"
                    >
                      Center
                    </button>
                  </div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={proCameraSettings.panX}
                    onChange={(e) => onUpdateProCamera({ panX: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="text-[10px] text-slate-400 font-bold">Court Vertical Tilt (Up / Down)</div>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={proCameraSettings.panY}
                    onChange={(e) => onUpdateProCamera({ panY: parseFloat(e.target.value) })}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* 4. Gym Lighting Exposure & Brightness / Contrast / Saturation */}
            <div className="space-y-2 bg-[#140e0b] p-2.5 rounded-xl border border-[#261b13]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                  <SunMedium size={12} className="text-amber-400" /> Gym Lighting & Color Grade
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateProCamera({
                      exposureCompensation: 0,
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                    })
                  }
                  className="text-[10px] text-slate-400 hover:text-white"
                >
                  Reset
                </button>
              </div>

              {cameraCapabilities && cameraCapabilities.exposureCompMax > cameraCapabilities.exposureCompMin && (
                <div className="space-y-0.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Hardware EV Exposure</span>
                    <span className="font-mono text-amber-300">
                      {proCameraSettings.exposureCompensation > 0 ? `+${proCameraSettings.exposureCompensation.toFixed(1)}` : proCameraSettings.exposureCompensation.toFixed(1)} EV
                    </span>
                  </div>
                  <input
                    type="range"
                    min={cameraCapabilities.exposureCompMin}
                    max={cameraCapabilities.exposureCompMax}
                    step={0.25}
                    value={proCameraSettings.exposureCompensation}
                    onChange={(e) => onUpdateProCamera({ exposureCompensation: parseFloat(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              )}

              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Brightness</span>
                  <span className="font-mono text-slate-200">{proCameraSettings.brightness}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={150}
                  step={2}
                  value={proCameraSettings.brightness}
                  onChange={(e) => onUpdateProCamera({ brightness: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#e8430a] cursor-pointer"
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Contrast</span>
                  <span className="font-mono text-slate-200">{proCameraSettings.contrast}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={150}
                  step={2}
                  value={proCameraSettings.contrast}
                  onChange={(e) => onUpdateProCamera({ contrast: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#e8430a] cursor-pointer"
                />
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Hardwood Saturation</span>
                  <span className="font-mono text-slate-200">{proCameraSettings.saturation}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={160}
                  step={2}
                  value={proCameraSettings.saturation}
                  onChange={(e) => onUpdateProCamera({ saturation: parseInt(e.target.value, 10) })}
                  className="w-full accent-[#e8430a] cursor-pointer"
                />
              </div>
            </div>

            {/* 5. Focus Lock, Torch / Flash, Mirror & Quick Actions */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateProCamera({
                    focusMode: proCameraSettings.focusMode === 'continuous' ? 'manual' : 'continuous',
                  })
                }
                className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition ${
                  proCameraSettings.focusMode === 'continuous'
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                }`}
              >
                <Focus size={14} />
                <span>{proCameraSettings.focusMode === 'continuous' ? 'AF Continuous' : 'AF Locked'}</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateProCamera({ torch: !proCameraSettings.torch })}
                className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition ${
                  proCameraSettings.torch
                    ? 'bg-amber-500 border-amber-300 text-black font-black'
                    : 'bg-[#16100c] border-[#2a1e14] text-slate-300 hover:text-white'
                }`}
              >
                <Flashlight size={14} />
                <span>{proCameraSettings.torch ? 'Torch ON' : 'Torch OFF'}</span>
              </button>

              <button
                type="button"
                onClick={() => onUpdateProCamera({ mirror: !proCameraSettings.mirror })}
                className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition ${
                  proCameraSettings.mirror
                    ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                    : 'bg-[#16100c] border-[#2a1e14] text-slate-300 hover:text-white'
                }`}
              >
                <FlipHorizontal size={14} />
                <span>{proCameraSettings.mirror ? 'Mirrored' : 'Normal Flip'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const PreviewStage = React.memo(PreviewStageComponent);
