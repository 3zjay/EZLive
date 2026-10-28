'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Radio,
  Circle,
  Settings,
  Download,
  UserPlus,
  Monitor,
  Video,
  PanelRight,
  PanelRightClose,
  Activity,
  ChevronDown,
  LogIn,
  Users,
} from 'lucide-react';
import { RecordingState } from '@/services/recorder';
import { StreamDestinations } from '@/types/streamlabs';
import { User } from 'firebase/auth';
import { UserSessionProfile } from '@/services/firebase';

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
  // Auth & Court Props
  user?: User | null;
  profile?: UserSessionProfile | null;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  assignedCourt?: string;
  onUpdateAssignedCourt?: (court: string) => void;
  courtOptions?: string[];
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
  user,
  profile,
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
}) => {
  const [isCourtDropdownOpen, setIsCourtDropdownOpen] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Destination status badge text
  const getDestinationBadge = () => {
    if (destinations.facebook.enabled) {
      if (destinations.facebook.destinationType === 'group') {
        return `👥 FB: ${destinations.facebook.groupName || 'Group'}`;
      }
      if (destinations.facebook.destinationType === 'page') {
        return `📄 FB: ${destinations.facebook.pageName || 'Page'}`;
      }
      return 'FB Live';
    }
    return 'Direct Output';
  };

  return (
    <header className="h-13 bg-[#080605] border-b border-[#2a1e14] px-3 flex items-center justify-between text-white select-none z-30 shrink-0">
      {/* LEFT: Brand Identity & Active Court Switcher */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b1a] via-[#e8430a] to-[#c8841a] shadow-md shadow-[#e8430a]/20 font-black text-white text-sm">
            HC
          </div>
          <div>
            <div className="text-xs font-black tracking-tight flex items-center gap-1.5 leading-none">
              <span>EZLiveStudio</span>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#e8430a]/20 text-[#ff6b1a] border border-[#e8430a]/30">
                PRO
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              <span className="text-[#ff6b1a]">{fps} FPS</span>
              <span className="mx-1">•</span>
              <span className="text-slate-300">{getDestinationBadge()}</span>
            </div>
          </div>
        </Link>

        {/* Court Dropdown Selector */}
        {assignedCourt && onUpdateAssignedCourt && (
          <div className="relative hidden sm:block">
            <button
              onClick={() => setIsCourtDropdownOpen(!isCourtDropdownOpen)}
              className="flex items-center gap-1.5 bg-[#140f0c] hover:bg-[#1f1712] border border-[#ff6b1a]/30 text-[#ff6b1a] px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-sm"
            >
              <span>🏀 {assignedCourt.split('—')[0].trim()}</span>
              <ChevronDown size={12} className={isCourtDropdownOpen ? 'rotate-180' : ''} />
            </button>

            {isCourtDropdownOpen && (
              <div className="absolute top-10 left-0 w-64 bg-[#100d0a] border border-[#3a2818] rounded-xl shadow-2xl z-50 overflow-hidden py-1">
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

      {/* CENTER: Scoreboard Live Sync & Broadcast Tools */}
      <div className="flex items-center gap-2">
        {/* Scoreboard Sync Status Pill */}
        <button
          onClick={onOpenSettings}
          title="Scoreboard Realtime Sync Status (Click to manage)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition shadow-sm ${
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
          <span className="font-mono text-[10px] truncate max-w-[150px]">
            {isScoreboardConnected ? (scoreboardSyncUser || 'Scoreboard Live') : 'Pair Scoreboard'}
          </span>
        </button>

        {/* Invite Guest (WebRTC Co-Host) */}
        <button
          onClick={onOpenGuestInvite}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#140f0c] hover:bg-[#1f1712] text-slate-200 border border-[#2a1e14] rounded-lg text-xs font-bold transition shadow-sm"
          title="Invite Guest / Sideline Reporter via WebRTC"
        >
          <UserPlus size={13} className="text-sky-400" />
          <span>Invite Guest</span>
        </button>

        {/* Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition border shadow-sm ${
            isScreenSharing
              ? 'bg-sky-600 border-sky-400 text-white'
              : 'bg-[#140f0c] hover:bg-[#1f1712] border-[#2a1e14] text-slate-200'
          }`}
          title="Share Tablet or Computer Screen"
        >
          <Monitor size={13} className={isScreenSharing ? 'text-white' : 'text-amber-400'} />
          <span>{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
        </button>

        {/* Flip Camera */}
        {hasCamera && (
          <button
            onClick={onFlipCamera}
            className="p-1.5 bg-[#140f0c] hover:bg-[#1f1712] border border-[#2a1e14] rounded-lg text-slate-300 hover:text-white transition"
            title="Flip Camera (Front / Rear Court)"
          >
            <Video size={13} />
          </button>
        )}

        {/* Mic Level VU */}
        <div className="hidden xl:flex items-center gap-1.5 bg-[#100d0a] border border-[#2a1e14] px-2 py-1 rounded-lg">
          <div className="w-12 h-1.5 bg-[#080605] rounded-full overflow-hidden p-0.2">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                audioLevel > 80 ? 'bg-rose-500' : audioLevel > 50 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, audioLevel)}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-slate-500">MIC</span>
        </div>
      </div>

      {/* RIGHT: Record, Go Live, Operator Account & Settings */}
      <div className="flex items-center gap-2">
        {/* Recording Timer */}
        {recordingState.isRecording && (
          <div className="flex items-center gap-1.5 bg-rose-950/70 border border-rose-800 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-rose-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span>REC {formatDuration(recordingState.durationSeconds)}</span>
          </div>
        )}

        {/* Record Button */}
        <button
          onClick={onToggleRecording}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow ${
            recordingState.isRecording
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
              : 'bg-[#140f0c] hover:bg-[#1f1712] text-slate-200 border border-[#2a1e14]'
          }`}
        >
          <Circle size={13} className={recordingState.isRecording ? 'fill-white' : 'fill-rose-500 text-rose-500'} />
          <span>{recordingState.isRecording ? 'Stop REC' : 'Record'}</span>
        </button>

        {/* Download Recording */}
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

        {/* GO LIVE BUTTON */}
        <button
          onClick={onToggleStreaming}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-black tracking-wide transition shadow-lg active:scale-95 ${
            isStreaming
              ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse shadow-rose-950/60'
              : 'bg-gradient-to-r from-[#ff6b1a] to-[#e8430a] hover:from-[#ff8533] hover:to-[#ff5714] text-white shadow-[#e8430a]/30'
          }`}
        >
          <Radio size={13} />
          <span>{isStreaming ? 'END LIVE' : 'GO LIVE'}</span>
        </button>

        {/* Operator Profile / Login Button */}
        {user ? (
          <div className="hidden lg:flex items-center gap-1.5 bg-[#140f0c] border border-[#2a1e14] px-2 py-1 rounded-lg">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={user.displayName || 'Operator'} className="w-5 h-5 rounded-full border border-[#ff6b1a]" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[#e8430a] text-white flex items-center justify-center text-[10px] font-bold">
                {(user.displayName || 'O')[0].toUpperCase()}
              </div>
            )}
            <span className="text-[11px] font-bold text-slate-300 truncate max-w-[100px]">{user.displayName?.split(' ')[0] || 'Operator'}</span>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-slate-500 hover:text-white text-[10px] ml-1"
                title="Sign Out"
              >
                ✕
              </button>
            )}
          </div>
        ) : onOpenAuthModal ? (
          <button
            onClick={onOpenAuthModal}
            className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#e8430a] hover:bg-[#ff6b1a] text-white font-bold text-xs shadow transition"
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
          <Settings size={15} />
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
          {isSidebarOpen ? <PanelRightClose size={15} /> : <PanelRight size={15} />}
        </button>
      </div>
    </header>
  );
};
