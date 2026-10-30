'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  Circle,
  Settings,
  RotateCcw,
  Download,
  UserPlus,
  Monitor,
  PanelRight,
  PanelRightClose,
  Activity,
  ChevronDown,
  LogIn,
  Mic,
  MicOff,
  Zap,
  Columns,
  LayoutPanelTop,
} from 'lucide-react';
import { RecordingState } from '@/services/recorder';
import { StreamDestinations } from '@/types/streamlabs';
import { User } from 'firebase/auth';
import { UserSessionProfile } from '@/services/firebase';

interface StreamlabsTopBarProps {
  hasCamera: boolean;
  hasAudio: boolean;
  micMuted?: boolean;
  onToggleMicMute?: () => void;
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
  // Auth & Court Props
  user?: User | null;
  profile?: UserSessionProfile | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  assignedCourt?: string;
  onUpdateAssignedCourt?: (court: string) => void;
  courtOptions?: string[];
  relayStats?: { connected: boolean; mbSent: string; status: string };
  destinationsSummary?: string;
  isStudioMode?: boolean;
  onToggleStudioMode?: () => void;
  bottomPanelMode?: 'obs' | 'streamlabs';
  onToggleBottomPanelMode?: () => void;
  onTriggerInstantReplay?: () => void;
}

export const StreamlabsTopBar: React.FC<StreamlabsTopBarProps> = ({
  hasCamera,
  micMuted = false,
  onToggleMicMute,
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
  user,
  onOpenAuthModal,
  onSignOut,
  assignedCourt,
  onUpdateAssignedCourt,
  courtOptions = [
    'Court 1 — Championship Hardwood',
    'Court 2 — South Annex Gym',
    'Court 3 — Showcase Arena',
    'Court 4 — Training Court',
  ],
  relayStats,
  destinationsSummary,
  isStudioMode,
  onToggleStudioMode,
  bottomPanelMode = 'obs',
  onToggleBottomPanelMode,
  onTriggerInstantReplay,
}) => {
  const [isCourtDropdownOpen, setIsCourtDropdownOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Destination status badge text
  const getDestinationBadge = () => {
    if (destinations.facebook.pageName) {
      return `FB: ${destinations.facebook.pageName}`;
    }
    if (destinations.facebook.groupName) {
      return `FB: ${destinations.facebook.groupName}`;
    }
    if (destinations.facebook.destinationType === 'page') {
      return 'FB Page';
    }
    if (destinations.facebook.destinationType === 'group') {
      return 'FB Group';
    }
    return 'Direct Output';
  };

  return (
    <header className="h-11 sm:h-12 bg-[#080605] border-b border-[#2a1e14] px-2 sm:px-3 flex items-center justify-between gap-1.5 text-white select-none z-30 shrink-0 overflow-x-auto no-scrollbar">
      {/* LEFT: Brand Identity & Active Court Switcher */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/" className="flex items-center gap-1.5 group shrink-0">
          <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-[#ff6b1a] via-[#e8430a] to-[#c8841a] shadow-md shadow-[#e8430a]/20 font-black text-white text-xs sm:text-sm">
            HC
          </div>
          <div className="hidden xs:block sm:block">
            <div className="text-[11px] sm:text-xs font-black tracking-tight flex items-center gap-1 leading-none">
              <span>EZLive</span>
              <span className="hidden md:inline">Studio</span>
              <span className="text-[8px] sm:text-[9px] font-bold px-1 py-0.2 rounded bg-[#e8430a]/20 text-[#ff6b1a] border border-[#e8430a]/30">
                PRO
              </span>
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              <span className="text-[#ff6b1a]">{fps} FPS</span>
              <span className="hidden lg:inline">•</span>
              <span className="hidden lg:inline text-slate-300 truncate max-w-[120px]">{getDestinationBadge()}</span>
            </div>
          </div>
        </Link>

        {/* Court Dropdown Selector */}
        {assignedCourt && onUpdateAssignedCourt && (
          <div className="relative hidden lg:block">
            <button
              onClick={() => setIsCourtDropdownOpen(!isCourtDropdownOpen)}
              className="flex items-center gap-1 bg-[#140f0c] hover:bg-[#1f1712] border border-[#ff6b1a]/30 text-[#ff6b1a] px-2 py-1 rounded-lg text-[11px] font-bold transition shadow-sm whitespace-nowrap"
            >
              <span>🏀 {assignedCourt.split('—')[0].trim()}</span>
              <ChevronDown size={11} className={isCourtDropdownOpen ? 'rotate-180' : ''} />
            </button>

            {isCourtDropdownOpen && (
              <div className="absolute top-9 left-0 w-64 bg-[#100d0a] border border-[#3a2818] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                <div className="px-3 py-1.5 text-[10px] font-black tracking-wider uppercase text-slate-500 border-b border-[#2a1e14]">
                  Switch Broadcast Court
                </div>
                {courtOptions.map((court) => (
                  <button
                    key={court}
                    onClick={() => {
                      onUpdateAssignedCourt(court);
                      setIsCourtDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-bold transition flex items-center justify-between ${
                      assignedCourt === court
                        ? 'bg-[#e8430a]/20 text-[#ff6b1a]'
                        : 'text-slate-300 hover:bg-[#1a1410]'
                    }`}
                  >
                    <span>{court}</span>
                    {assignedCourt === court && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e8430a]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CENTER: Scoreboard Live Sync & Mobile/Tablet Camera & Replay Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Scoreboard Sync Status Pill */}
        <button
          onClick={onOpenSettings}
          title="Scoreboard Realtime Sync Status (Click to manage)"
          className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] sm:text-xs font-bold transition shadow-sm whitespace-nowrap ${
            isScoreboardConnected
              ? 'bg-emerald-950/60 border-emerald-600/60 text-emerald-300 hover:bg-emerald-900/60'
              : 'bg-amber-950/50 border-amber-600/50 text-amber-300 hover:bg-amber-900/50'
          }`}
        >
          <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
            {isScoreboardConnected && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 ${isScoreboardConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </span>
          <Activity size={11} className="hidden sm:inline" />
          <span className="font-mono text-[10px] truncate max-w-[65px] sm:max-w-[110px]">
            {isScoreboardConnected ? (scoreboardSyncUser ? scoreboardSyncUser.split('@')[0] : 'Synced') : 'Pair Score'}
          </span>
        </button>

        {/* Flip Camera (Prominent for Mobile / Tablet Court Operators) */}
        {hasCamera && (
          <button
            onClick={onFlipCamera}
            className="flex items-center gap-1 px-2 py-1 bg-[#140f0c] hover:bg-[#1f1712] border border-[#ff6b1a]/40 text-[#ff6b1a] rounded-lg text-[11px] font-bold transition shadow-sm active:scale-95 whitespace-nowrap"
            title="Flip Camera (Front / Rear Court)"
          >
            <RotateCcw size={12} className="text-[#ff6b1a]" />
            <span className="hidden sm:inline">Flip</span>
          </button>
        )}

        {/* Mute / Unmute Microphone Toggle Button */}
        {onToggleMicMute && (
          <button
            onClick={onToggleMicMute}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition shadow-sm active:scale-95 whitespace-nowrap ${
              micMuted
                ? 'bg-rose-950/90 hover:bg-rose-900 border border-rose-500 text-rose-300'
                : 'bg-[#140f0c] hover:bg-[#1f1712] border border-emerald-500/40 text-emerald-300'
            }`}
            title={micMuted ? 'Microphone is MUTED (Click to unmute)' : 'Microphone is LIVE (Click to mute)'}
          >
            {micMuted ? (
              <>
                <MicOff size={12} className="text-rose-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase text-rose-300 hidden xs:inline">
                  MUTED
                </span>
              </>
            ) : (
              <>
                <Mic size={12} className="text-emerald-400" />
                <div className="w-6 sm:w-8 h-1.5 bg-[#080605] rounded-full overflow-hidden p-0.2 border border-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      audioLevel > 80 ? 'bg-rose-500' : audioLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, audioLevel)}%` }}
                  />
                </div>
              </>
            )}
          </button>
        )}

        {/* OBS Instant Replay (10s Slow-Mo) */}
        {onTriggerInstantReplay && (
          <button
            onClick={onTriggerInstantReplay}
            className="flex items-center gap-1 px-2 py-1 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 rounded-lg text-[11px] font-bold transition shadow-sm active:scale-95 whitespace-nowrap"
            title="Play 10-Second Slow-Motion Instant Replay"
          >
            <Zap size={12} className="text-amber-400" />
            <span className="hidden md:inline">Replay</span>
          </button>
        )}

        {/* OBS Studio Mode Toggle */}
        {onToggleStudioMode && (
          <button
            onClick={onToggleStudioMode}
            className={`hidden md:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition border whitespace-nowrap ${
              isStudioMode
                ? 'bg-amber-600 border-amber-400 text-white shadow'
                : 'bg-[#140f0c] hover:bg-[#1f1712] border-[#2a1e14] text-slate-300'
            }`}
            title="Toggle OBS Studio Mode (Dual Preview & Program Monitors)"
          >
            <Columns size={12} />
            <span className="hidden xl:inline">Studio</span>
          </button>
        )}

        {/* Bottom Panel Switcher (OBS Classic Docks vs Backstage Strip) */}
        {onToggleBottomPanelMode && (
          <button
            onClick={onToggleBottomPanelMode}
            className="hidden lg:flex items-center gap-1 px-2 py-1 bg-[#140f0c] hover:bg-[#1f1712] border border-[#2a1e14] rounded-lg text-[11px] font-bold text-slate-200 transition whitespace-nowrap"
            title="Switch between OBS 5-Dock Panel and Streamlabs Backstage Strip"
          >
            <LayoutPanelTop size={12} className="text-[#ff6b1a]" />
            <span className="hidden xl:inline">{bottomPanelMode === 'obs' ? 'OBS Docks' : 'Backstage'}</span>
          </button>
        )}

        {/* Invite Guest (WebRTC Co-Host) */}
        <button
          onClick={onOpenGuestInvite}
          className="hidden xl:flex items-center gap-1 px-2 py-1 bg-[#140f0c] hover:bg-[#1f1712] text-slate-200 border border-[#2a1e14] rounded-lg text-[11px] font-bold transition shadow-sm whitespace-nowrap"
          title="Invite Guest / Sideline Reporter via WebRTC"
        >
          <UserPlus size={12} className="text-sky-400" />
          <span>Guest</span>
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`hidden xl:flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold transition border shadow-sm whitespace-nowrap ${
            isScreenSharing
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-[#140f0c] hover:bg-[#1f1712] border-[#2a1e14] text-slate-200'
          }`}
          title="Share Tablet or Computer Screen"
        >
          <Monitor size={12} className={isScreenSharing ? 'text-white' : 'text-amber-400'} />
          <span>{isScreenSharing ? 'Stop' : 'Share'}</span>
        </button>
      </div>

      {/* RIGHT: Record, Go Live, Operator Account & Settings */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Recording Timer */}
        {recordingState.isRecording && (
          <div className="hidden sm:flex items-center gap-1 bg-rose-950/70 border border-rose-800 px-2 py-1 rounded-lg text-[10px] font-mono font-bold text-rose-300 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>{formatDuration(recordingState.durationSeconds)}</span>
          </div>
        )}

        {/* Record Button */}
        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] font-bold transition shadow whitespace-nowrap ${
            recordingState.isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-[#140f0c] hover:bg-[#1f1712] text-slate-200 border border-[#2a1e14]'
          }`}
          title={recordingState.isRecording ? 'Stop Local MP4 Recording' : 'Start Local MP4 Recording'}
        >
          <Circle size={11} className={recordingState.isRecording ? 'fill-white' : 'fill-rose-500 text-rose-500'} />
          <span className="hidden sm:inline">{recordingState.isRecording ? 'Stop' : 'REC'}</span>
        </button>

        {/* Download Recording */}
        {!recordingState.isRecording && recordingState.recordedBytes > 0 && (
          <button
            onClick={onDownloadRecording}
            className="flex items-center gap-1 px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition shadow"
            title="Download Saved Game Video"
          >
            <Download size={12} />
            <span className="hidden sm:inline">MP4</span>
          </button>
        )}

        {/* GO LIVE BUTTON */}
        <button
          onClick={onToggleStreaming}
          className={`flex items-center gap-1 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black tracking-wide transition shadow-lg active:scale-95 whitespace-nowrap ${
            isStreaming
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-950/60'
              : 'bg-gradient-to-r from-[#ff6b1a] to-[#e8430a] hover:from-[#ff8533] hover:to-[#ff5714] text-white shadow-[#e8430a]/30'
          }`}
        >
          <Radio size={12} />
          <span>
            {isStreaming
              ? relayStats && parseFloat(relayStats.mbSent) > 0
                ? `LIVE • ${relayStats.mbSent}M`
                : `END (${destinationsSummary || 'LIVE'})`
              : 'GO LIVE'}
          </span>
        </button>

        {/* Operator Profile / Login Button */}
        {user ? (
          <div className="hidden xl:flex items-center gap-1.5 bg-[#140f0c] border border-[#2a1e14] px-2 py-1 rounded-lg">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={user.displayName || 'Operator'} className="w-4 h-4 rounded-full border border-[#ff6b1a]" />
            ) : (
              <div className="w-4 h-4 rounded-full bg-[#e8430a] text-white flex items-center justify-center text-[9px] font-bold">
                {(user.displayName || 'O')[0].toUpperCase()}
              </div>
            )}
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[75px]">{user.displayName?.split(' ')[0] || 'Operator'}</span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-slate-500 hover:text-white text-[10px] ml-0.5"
                title="Sign Out"
              >
                ✕
              </button>
            )}
          </div>
        ) : onOpenAuthModal ? (
          <button
            onClick={onOpenAuthModal}
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#e8430a] hover:bg-[#ff6b1a] text-white font-bold text-[11px] shadow transition whitespace-nowrap"
          >
            <LogIn size={11} />
            <span>Sign In</span>
          </button>
        ) : null}

        {/* Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 bg-[#140f0c] hover:bg-[#1f1712] border border-[#2a1e14] rounded-lg text-slate-300 hover:text-white transition"
          title="Broadcast & Overlay Settings"
        >
          <Settings size={14} />
        </button>

        {/* Streamlabs Sidebar Toggle */}
        <button
          onClick={onToggleSidebar}
          className={`p-1.5 rounded-lg border transition ${
            isSidebarOpen
              ? 'bg-[#ff6b1a]/20 border-[#ff6b1a] text-[#ff6b1a]'
              : 'bg-[#140f0c] hover:bg-[#1f1712] border-[#2a1e14] text-slate-400'
          }`}
          title={isSidebarOpen ? 'Hide Streamlabs Panels' : 'Show Streamlabs Panels'}
        >
          {isSidebarOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />}
        </button>
      </div>
    </header>
  );
};
