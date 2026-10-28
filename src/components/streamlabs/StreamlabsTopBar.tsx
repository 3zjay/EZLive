'use client';

import React from 'react';
import { Radio, Circle, Settings, Download, UserPlus, Monitor, Video, PanelRight, PanelRightClose, Activity } from 'lucide-react';
import { RecordingState } from '@/services/recorder';
import { StreamDestinations } from '@/types/streamlabs';

interface StreamlabsTopBarProps {
  hasCamera: boolean;
  hasAudio: boolean;
  audioLevel: number;
  recordingState: RecordingState;
  isStreaming: boolean;
  isScreenSharing: boolean;
  fps: number;
  destinations: StreamDestinations;
  onToggleRecording: () => void;
  onDownloadRecording: () => void;
  onToggleStreaming: () => void;
  onToggleScreenShare: () => void;
  onOpenSettings: () => void;
  onOpenGuestInvite: () => void;
  facingMode: 'environment' | 'user';
  onFlipCamera: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  scoreboardSyncUser?: string;
  isScoreboardConnected?: boolean;
}

export const StreamlabsTopBar: React.FC<StreamlabsTopBarProps> = ({
  hasCamera,
  audioLevel,
  recordingState,
  isStreaming,
  isScreenSharing,
  fps,
  destinations,
  onToggleRecording,
  onDownloadRecording,
  onToggleStreaming,
  onToggleScreenShare,
  onOpenSettings,
  onOpenGuestInvite,
  onFlipCamera,
  isSidebarOpen,
  onToggleSidebar,
  scoreboardSyncUser,
  isScoreboardConnected,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <header className="h-14 bg-[#080605] border-b border-[#2a1e14] px-3 flex items-center justify-between text-white select-none z-30">
      {/* Brand & Studio Status */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b1a] via-[#e8430a] to-[#c8841a] shadow-md shadow-[#e8430a]/20 font-black text-white text-sm">
          HC
        </div>
        <div>
          <div className="text-xs font-black tracking-tight flex items-center gap-1.5">
            <span>EZLiveStudio</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#e8430a]/20 text-[#ff6b1a] border border-[#e8430a]/30">
              BY HOOP CULTURE
            </span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="text-[#ff6b1a] font-mono">{fps} FPS</span>
            <span>•</span>
            <span className="text-slate-400">
              {destinations.facebook.enabled ? 'FB: ' + destinations.facebook.pageName : 'Direct Output'}
            </span>
          </div>
        </div>
      </div>

      {/* Center Tools: Guest Invite, Screen Share & Scoreboard Sync Pill */}
      <div className="flex items-center gap-2">
        {/* Scoreboard Sync Pill */}
        <button
          onClick={onOpenSettings}
          title="Click to manage Scoreboard Sync"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-sm ${
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
          <span className="font-mono text-[10px] truncate max-w-[140px]">
            {isScoreboardConnected ? (scoreboardSyncUser || 'Scoreboard Live') : 'Offline Scoreboard'}
          </span>
        </button>

        <button
          onClick={onOpenGuestInvite}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-xs font-bold transition shadow-sm"
          title="Invite Co-Host or Sideline Reporter via WebRTC"
        >
          <UserPlus size={14} className="text-sky-400" />
          <span className="hidden sm:inline">Invite Guest</span>
        </button>

        <button
          onClick={onToggleScreenShare}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border shadow-sm ${
            isScreenSharing
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-200'
          }`}
          title="Share Tablet or Computer Screen"
        >
          <Monitor size={14} className={isScreenSharing ? 'text-white' : 'text-amber-400'} />
          <span className="hidden sm:inline">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>

        {hasCamera && (
          <button
            onClick={onFlipCamera}
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white transition"
            title="Flip Camera (Front / Rear Court)"
          >
            <Video size={14} />
          </button>
        )}

        {/* Audio VU Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 border border-slate-850 px-2 py-1 rounded-lg">
          <div className="w-12 h-1.5 bg-slate-950 rounded-full overflow-hidden p-0.2">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                audioLevel > 80 ? 'bg-rose-500' : audioLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, audioLevel)}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400">MIC</span>
        </div>
      </div>

      {/* Right Actions: Record, Go Live, Settings */}
      <div className="flex items-center gap-2">
        {/* Recording Timer */}
        {recordingState.isRecording && (
          <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-800 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-rose-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>REC {formatDuration(recordingState.durationSeconds)}</span>
            <span className="hidden sm:inline text-[9px] text-rose-400">({formatSize(recordingState.recordedBytes)})</span>
          </div>
        )}

        {/* Record Button */}
        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
            recordingState.isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
          }`}
        >
          <Circle size={13} className={recordingState.isRecording ? 'fill-white' : 'fill-rose-500 text-rose-500'} />
          <span>{recordingState.isRecording ? 'Stop REC' : 'Record'}</span>
        </button>

        {/* Download Recording if available */}
        {!recordingState.isRecording && recordingState.recordedBytes > 0 && (
          <button
            onClick={onDownloadRecording}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow"
            title="Download Saved Game Video"
          >
            <Download size={13} />
            <span className="hidden sm:inline">MP4</span>
          </button>
        )}

        {/* Go Live (Facebook Live Relay) */}
        <button
          onClick={onToggleStreaming}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black tracking-wide transition shadow-lg active:scale-95 ${
            isStreaming
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-950/60'
              : 'bg-gradient-to-r from-[#ff6b1a] to-[#e8430a] hover:from-[#ff8533] hover:to-[#ff5714] text-white shadow-[#e8430a]/30'
          }`}
        >
          <Radio size={13} />
          <span>{isStreaming ? 'END LIVE' : 'GO LIVE'}</span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-300 hover:text-white transition"
          title="Studio Settings"
        >
          <Settings size={15} />
        </button>

        {/* Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg border transition ${
            isSidebarOpen
              ? 'bg-[#e8430a]/20 border-[#e8430a]/40 text-[#ff6b1a]'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
          }`}
          title={isSidebarOpen ? 'Close Docks Sidebar' : 'Open Docks Sidebar'}
        >
          {isSidebarOpen ? <PanelRightClose size={15} /> : <PanelRight size={15} />}
        </button>
      </div>
    </header>
  );
};
