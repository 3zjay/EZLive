'use client';

import React from 'react';
import { Camera, Mic, Radio, Circle, Settings, Download, Video, Activity } from 'lucide-react';
import { RecordingState } from '@/services/recorder';

interface TopBarProps {
  hasCamera: boolean;
  hasAudio: boolean;
  audioLevel: number;
  recordingState: RecordingState;
  isStreaming: boolean;
  fps: number;
  onToggleRecording: () => void;
  onDownloadRecording: () => void;
  onToggleStreaming: () => void;
  onOpenSettings: () => void;
  facingMode: 'environment' | 'user';
  onFlipCamera: () => void;
  scoreboardSyncUser?: string;
  isScoreboardConnected?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  hasCamera,
  hasAudio,
  audioLevel,
  recordingState,
  isStreaming,
  fps,
  onToggleRecording,
  onDownloadRecording,
  onToggleStreaming,
  onOpenSettings,
  facingMode,
  onFlipCamera,
  scoreboardSyncUser,
  isScoreboardConnected,
}) => {
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <header className="h-16 bg-slate-950/95 border-b border-slate-800 px-4 flex items-center justify-between text-white select-none z-30">
      {/* Brand & Studio Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-600 shadow-lg shadow-orange-950/40 font-black text-lg tracking-tighter">
          HC
        </div>
        <div>
          <div className="text-sm font-extrabold tracking-tight flex items-center gap-2">
            <span>EZLIVE STUDIO</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
              1080p 60FPS
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>Hoop Culture Web OBS</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono font-medium">{fps} FPS</span>
          </div>
        </div>
      </div>

      {/* Center Group: Device Status & Scoreboard Sync Pill */}
      <div className="flex items-center gap-3">
        {/* Device & Hardware Status Indicators */}
        <div className="hidden md:flex items-center gap-4 bg-slate-900/90 py-1.5 px-3 rounded-xl border border-slate-800">
          {/* Camera Status */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`p-1 rounded-md ${hasCamera ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Camera size={15} />
            </div>
            <span className="text-slate-300 font-medium">
              {hasCamera ? (facingMode === 'environment' ? 'Rear (Court)' : 'Front') : 'No Camera'}
            </span>
            {hasCamera && (
              <button
                onClick={onFlipCamera}
                title="Flip Camera (Front/Rear)"
                className="ml-1 p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
              >
                <Video size={13} />
              </button>
            )}
          </div>

          <div className="w-px h-4 bg-slate-800" />

          {/* Microphone Level */}
          <div className="flex items-center gap-2 text-xs">
            <div className={`p-1 rounded-md ${hasAudio ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              <Mic size={15} />
            </div>
            <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 80 ? 'bg-rose-500' : audioLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, audioLevel)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Live Scoreboard Sync Indicator Pill */}
        <button
          onClick={onOpenSettings}
          title="Click to manage Scoreboard Sync"
          className={`hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
            isScoreboardConnected
              ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-amber-950/50 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
          }`}
        >
          <span className="relative flex h-2 w-2">
            {isScoreboardConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isScoreboardConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <Activity size={12} className={isScoreboardConnected ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="font-mono text-[11px] truncate max-w-[200px]">
            {isScoreboardConnected ? (scoreboardSyncUser || 'Scoreboard Live') : 'Standalone Mode'}
          </span>
        </button>
      </div>

      {/* Broadcast & Recording Master Controls */}
      <div className="flex items-center gap-2.5">
        {/* Recording Status & Action */}
        {recordingState.isRecording && (
          <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-800/80 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-rose-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span>REC {formatDuration(recordingState.durationSeconds)}</span>
            <span className="text-[10px] text-rose-400">({formatSize(recordingState.recordedBytes)})</span>
          </div>
        )}

        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${
            recordingState.isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Circle size={14} className={recordingState.isRecording ? 'fill-white' : 'fill-rose-500 text-rose-500'} />
          <span>{recordingState.isRecording ? 'Stop Recording' : 'Record Game'}</span>
        </button>

        {/* Download Recording if chunks exist and not recording */}
        {!recordingState.isRecording && recordingState.recordedBytes > 0 && (
          <button
            onClick={onDownloadRecording}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow"
            title="Download Saved Game Video"
          >
            <Download size={14} />
            <span>Save MP4</span>
          </button>
        )}

        {/* Go Live (Facebook Live Relay) */}
        <button
          onClick={onToggleStreaming}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-md active:scale-95 ${
            isStreaming
              ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
              : 'bg-[#e8430a] hover:bg-[#ff6b1a] text-white shadow-lg shadow-orange-950/40'
          }`}
        >
          <Radio size={14} />
          <span>{isStreaming ? 'End Live' : 'Go Live'}</span>
        </button>

        {/* Settings Modal Toggle */}
        <button
          onClick={onOpenSettings}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition border border-transparent hover:border-slate-700"
          title="Studio Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};
