'use client';

import React, { useRef, useState } from 'react';
import { Maximize2, Minimize2, Grid, Eye, RefreshCw } from 'lucide-react';
import { SceneConfig } from '@/types/broadcast';

interface PreviewStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeScene: SceneConfig;
  overlayUrl?: string;
  showIframePreview?: boolean;
  onToggleIframePreview?: () => void;
  onRefreshIframe?: () => void;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  canvasRef,
  videoRef,
  activeScene,
  overlayUrl,
  showIframePreview = false,
  onToggleIframePreview,
  onRefreshIframe,
}) => {
  const [showGrid, setShowGrid] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* Hidden Source Video Element (Receives raw camera MediaStream) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="hidden"
      />

      {/* 16:9 Stage Container */}
      <div className="relative w-full h-full max-w-[1920px] max-h-[1080px] aspect-video flex items-center justify-center">
        {/* Main 60 FPS Composited Canvas (This is the exact stream sent to Recorder & Facebook Live) */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full object-contain shadow-2xl"
        />

        {/* Live Vercel Iframe Overlay Inspector (Optional side-by-side or layered inspection) */}
        {showIframePreview && overlayUrl && (
          <div className="absolute inset-0 pointer-events-auto z-10">
            <iframe
              src={overlayUrl}
              className="w-full h-full border-0 bg-transparent"
              title="Vercel Live Overlay"
              allow="camera; microphone"
            />
          </div>
        )}

        {/* Framing Guides (Tripod Alignment for Basketball Courts) */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none z-20 grid grid-cols-3 grid-rows-3 border border-white/20">
            <div className="border-r border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            <div className="border-b border-white/15" />
            <div className="border-r border-b border-white/15" />
            {/* Center crosshair */}
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

        {/* Top Left: Program / Active Scene Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
          <div className="px-2.5 py-1 bg-red-600/90 text-white text-[11px] font-black uppercase tracking-widest rounded-md shadow backdrop-blur-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            PROGRAM
          </div>
          <div className="px-2.5 py-1 bg-slate-900/80 text-slate-200 text-xs font-bold rounded-md border border-slate-700/80 backdrop-blur-sm">
            {activeScene.name}
          </div>
        </div>

        {/* Top Right: Viewport Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          {overlayUrl && onToggleIframePreview && (
            <button
              onClick={onToggleIframePreview}
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 backdrop-blur-sm border ${
                showIframePreview
                  ? 'bg-sky-600/90 border-sky-400 text-white shadow'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Toggle Live Iframe Inspector"
            >
              <Eye size={14} />
              <span className="hidden sm:inline text-[11px]">Iframe Inspect</span>
            </button>
          )}

          {overlayUrl && onRefreshIframe && (
            <button
              onClick={onRefreshIframe}
              className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 backdrop-blur-sm transition"
              title="Reload Overlay"
            >
              <RefreshCw size={14} />
            </button>
          )}

          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border backdrop-blur-sm transition ${
              showGrid
                ? 'bg-sky-600/90 border-sky-400 text-white'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle Tripod Framing Grid"
          >
            <Grid size={15} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-700 backdrop-blur-sm transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
};
