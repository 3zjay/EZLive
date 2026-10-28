'use client';

import React, { useRef, useState } from 'react';
import { Maximize2, Minimize2, Grid, Lock } from 'lucide-react';
import { Scene, Source } from '@/types/broadcast';

interface PreviewStageProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeScene: Scene;
  selectedSourceId: string | null;
  onSelectSource: (id: string | null) => void;
  onUpdateSourceTransform: (id: string, update: { x: number; y: number; width: number; height: number }) => void;
}

export const PreviewStage: React.FC<PreviewStageProps> = ({
  canvasRef,
  videoRef,
  activeScene,
  selectedSourceId,
  onSelectSource,
  onUpdateSourceTransform,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageBoxRef = useRef<HTMLDivElement>(null);
  const [showGrid, setShowGrid] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Dragging state for bounding box
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number; startW: number; startH: number } | null>(null);

  const sources = activeScene?.sources || [];
  const selectedSource = sources.find((s) => s.id === selectedSourceId);

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
      // Reposition source
      newX = Math.round(startX + dx);
      newY = Math.round(startY + dy);
    } else if (dragHandle === 'br') {
      // Bottom-Right resize
      newW = Math.max(40, Math.round(startW + dx));
      newH = Math.max(30, Math.round(startH + dy));
    } else if (dragHandle === 'bl') {
      // Bottom-Left resize
      const possibleW = Math.max(40, Math.round(startW - dx));
      newX = Math.round(startX + (startW - possibleW));
      newW = possibleW;
      newH = Math.max(30, Math.round(startH + dy));
    } else if (dragHandle === 'tr') {
      // Top-Right resize
      newW = Math.max(40, Math.round(startW + dx));
      const possibleH = Math.max(30, Math.round(startH - dy));
      newY = Math.round(startY + (startH - possibleH));
      newH = possibleH;
    } else if (dragHandle === 'tl') {
      // Top-Left resize
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

  return (
    <div
      ref={containerRef}
      className="relative flex-1 bg-black flex items-center justify-center overflow-hidden select-none"
      onClick={() => onSelectSource(null)}
    >
      {/* Hidden Source Video Element (keeps decoding frames actively on iOS Safari WebKit) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          opacity: 0.001,
          pointerEvents: 'none',
          top: 0,
          left: 0,
          zIndex: -50,
        }}
      />

      {/* 16:9 Stage Viewport Container */}
      <div
        ref={stageBoxRef}
        className="relative w-full h-full max-w-[1920px] max-h-[1080px] aspect-video flex items-center justify-center bg-slate-950 shadow-2xl touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Main Composited 60 FPS Canvas */}
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full object-contain pointer-events-none"
        />

        {/* Live Browser Source (Vercel URL Overlays) Layered on Stage */}
        {sources
          .filter((s): s is Extract<Source, { type: 'browser_url' }> => s.type === 'browser_url' && s.visible)
          .map((source) => (
            <div
              key={source.id}
              className="absolute pointer-events-none"
              style={{
                left: toPercent(source.x, 1920),
                top: toPercent(source.y, 1080),
                width: toPercent(source.width, 1920),
                height: toPercent(source.height, 1080),
                opacity: source.opacity,
                zIndex: source.zIndex + 10,
              }}
            >
              <iframe
                src={source.url}
                className="w-full h-full border-0 bg-transparent pointer-events-none"
                title={source.name}
                allow="camera; microphone"
              />
            </div>
          ))}

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
        <div className="absolute top-3 left-3 flex items-center gap-2 z-20 pointer-events-none">
          <div className="px-2.5 py-1 bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-md shadow flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            PROGRAM
          </div>
          <div className="px-2.5 py-1 bg-slate-900/90 text-slate-200 text-xs font-bold rounded-md border border-slate-700/80 backdrop-blur-sm">
            {activeScene.name}
          </div>
        </div>

        {/* Viewport Control Buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg border backdrop-blur-sm transition ${
              showGrid
                ? 'bg-sky-600 border-sky-400 text-white'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Toggle Basketball Court Alignment Grid"
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
