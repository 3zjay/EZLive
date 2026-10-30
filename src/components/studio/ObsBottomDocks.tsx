'use client';

import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Settings2,
  Sliders,
  Sparkles,
  Radio,
  Circle,
  Zap,
  Columns,
  Settings,
  Volume2,
  VolumeX,
  Film,
  Camera,
  Globe,
  Tv,
  Type,
  Image as ImageIcon,
  Square,
  ChevronDown,
  ChevronUp,
  Box,
} from 'lucide-react';
import { Scene, SourceType, TransitionType } from '@/types/broadcast';
import { RecordingState } from '@/services/recorder';

interface ObsBottomDocksProps {
  scenes: Scene[];
  activeSceneId: string;
  previewSceneId: string;
  isStudioMode: boolean;
  selectedSourceId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: (name: string) => void;
  onDuplicateScene: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onSelectSource: (id: string | null) => void;
  onAddSource: (type: SourceType) => void;
  onDeleteSource: (id: string) => void;
  onToggleSourceVisibility: (id: string) => void;
  onToggleSourceLock: (id: string) => void;
  onMoveSourceOrder: (id: string, direction: 'up' | 'down') => void;
  onOpenSourceProperties: (id: string) => void;

  // Audio Mixer
  audioLevel: number;
  micVolume: number;
  micMuted: boolean;
  onChangeMicVolume: (vol: number) => void;
  onToggleMicMute: () => void;

  // Transitions
  transitionType: TransitionType;
  transitionDurationMs: number;
  onChangeTransitionType: (type: TransitionType) => void;
  onChangeTransitionDuration: (ms: number) => void;
  onTriggerTransition: () => void;

  // Controls
  isStreaming: boolean;
  isYouTubeLive: boolean;
  isFacebookLive: boolean;
  recordingState: RecordingState;
  fps: number;
  onOpenGoLiveModal: () => void;
  onToggleRecording: () => void;
  onTriggerInstantReplay: () => void;
  onToggleStudioMode: () => void;
  onOpenSettings: () => void;

  // Collapsible Dock State for Tablet/Phone
  isCollapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const SOURCE_TYPE_OPTIONS: { type: SourceType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'camera', label: 'Video Capture Device (Camera)', icon: <Camera size={12} />, color: 'text-emerald-400' },
  { type: 'browser_url', label: 'Browser Source (Web URL)', icon: <Globe size={12} />, color: 'text-sky-400' },
  { type: 'scoreboard', label: 'HoopCulture Scoreboard HUD', icon: <Tv size={12} />, color: 'text-orange-400' },
  { type: 'video_media', label: 'Media Source (MP4 / Commercial)', icon: <Film size={12} />, color: 'text-amber-400' },
  { type: 'image', label: 'Image / Sponsor Logo (PNG)', icon: <ImageIcon size={12} />, color: 'text-pink-400' },
  { type: 'text', label: 'Text / Lower-Third Banner', icon: <Type size={12} />, color: 'text-purple-400' },
  { type: 'color_solid', label: 'Color Source (Solid Plate)', icon: <Square size={12} />, color: 'text-slate-300' },
];

type MobileDockTab = 'scenes' | 'sources' | 'mixer' | 'transitions' | 'controls';

export const ObsBottomDocks: React.FC<ObsBottomDocksProps> = ({
  scenes,
  activeSceneId,
  previewSceneId,
  isStudioMode,
  selectedSourceId,
  onSelectScene,
  onAddScene,
  onDuplicateScene,
  onDeleteScene,
  onSelectSource,
  onAddSource,
  onDeleteSource,
  onToggleSourceVisibility,
  onToggleSourceLock,
  onMoveSourceOrder,
  onOpenSourceProperties,
  audioLevel,
  micVolume,
  micMuted,
  onChangeMicVolume,
  onToggleMicMute,
  transitionType,
  transitionDurationMs,
  onChangeTransitionType,
  onChangeTransitionDuration,
  onTriggerTransition,
  isStreaming,
  isYouTubeLive,
  isFacebookLive,
  recordingState,
  fps,
  onOpenGoLiveModal,
  onToggleRecording,
  onTriggerInstantReplay,
  onToggleStudioMode,
  onOpenSettings,
  isCollapsed = false,
  onToggleCollapsed,
}) => {
  const [showAddSourceMenu, setShowAddSourceMenu] = useState(false);
  const [desktopAudioVol, setDesktopAudioVol] = useState(100);
  const [desktopAudioMuted, setDesktopAudioMuted] = useState(false);
  const [mobileDockTab, setMobileDockTab] = useState<MobileDockTab>('sources');

  const editingSceneId = isStudioMode ? previewSceneId : activeSceneId;
  const currentScene = scenes.find((s) => s.id === editingSceneId) || scenes[0];
  const sortedSources = [...(currentScene?.sources || [])].sort((a, b) => b.zIndex - a.zIndex);

  const handleSelectTab = (tab: MobileDockTab) => {
    setMobileDockTab(tab);
    if (isCollapsed && onToggleCollapsed) {
      onToggleCollapsed();
    }
  };

  return (
    <div className="bg-[#0c0907] border-t border-[#2a1e14] flex flex-col text-xs select-none z-30 shrink-0">
      {/* Tablet / Phone Compact OBS Dock Switcher & Collapse Bar */}
      <div className="h-8 bg-[#120d0a] border-b border-[#2a1e14] px-2 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {/* Mobile / Tablet Dock Selector Tabs (Hidden on xl where all 5 docks show side-by-side) */}
          <div className="flex xl:hidden items-center gap-1">
            {(
              [
                { id: 'scenes', label: 'Scenes', count: scenes.length, icon: <Layers size={11} /> },
                { id: 'sources', label: 'Sources', count: sortedSources.length, icon: <Box size={11} /> },
                { id: 'mixer', label: 'Audio Mixer', icon: <Sliders size={11} /> },
                { id: 'transitions', label: 'Transitions', icon: <Sparkles size={11} /> },
                { id: 'controls', label: 'OBS Controls', icon: <Radio size={11} /> },
              ] as { id: MobileDockTab; label: string; count?: number; icon: React.ReactNode }[]
            ).map((tab) => {
              const isActive = !isCollapsed && mobileDockTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 whitespace-nowrap transition ${
                    isActive
                      ? 'bg-[#e8430a] text-white shadow-sm'
                      : 'bg-[#1a130e] text-slate-300 hover:text-white border border-[#2a1e14]'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`px-1 rounded text-[9px] font-mono ${
                        isActive ? 'bg-black/30 text-white' : 'bg-black/50 text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Desktop XL Label */}
          <div className="hidden xl:flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">
            <Layers size={11} className="text-[#ff6b1a]" />
            <span>OBS Studio 5-Dock Console</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-mono">{currentScene?.name}</span>
          </div>
        </div>

        {/* Right Quick Status + Expand/Minimize Dock Button */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Mini Audio Meter when dock is collapsed */}
          {isCollapsed && (
            <button
              onClick={onToggleMicMute}
              className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1a130e] border border-[#2a1e14] text-[10px]"
            >
              {micMuted ? (
                <VolumeX size={11} className="text-rose-400" />
              ) : (
                <Volume2 size={11} className="text-emerald-400" />
              )}
              <div className="w-12 h-1.5 bg-black rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-400 transition-all duration-75"
                  style={{ width: `${micMuted ? 0 : Math.min(100, audioLevel)}%` }}
                />
              </div>
            </button>
          )}

          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="px-2.5 py-1 rounded-md bg-[#1b1410] hover:bg-[#261c16] border border-[#3a2818] text-slate-200 font-bold text-[10px] flex items-center gap-1 transition whitespace-nowrap"
              title={isCollapsed ? 'Expand OBS Docks' : 'Minimize OBS Docks for Maximum Camera View'}
            >
              {isCollapsed ? (
                <>
                  <ChevronUp size={12} className="text-[#ff6b1a]" />
                  <span>Open OBS Docks</span>
                </>
              ) : (
                <>
                  <ChevronDown size={12} className="text-[#ff6b1a]" />
                  <span>Hide Docks</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expandable OBS Docks Workspace */}
      {!isCollapsed && (
        <div className="h-36 sm:h-40 xl:h-44 grid grid-cols-1 xl:grid-cols-5 gap-1.5 p-1.5 overflow-hidden">
          {/* DOCK 1: SCENES */}
          <div
            className={`${
              mobileDockTab === 'scenes' ? 'flex' : 'hidden xl:flex'
            } bg-[#140f0c] border border-[#2a1e14] rounded-lg flex-col overflow-hidden`}
          >
            <div className="bg-[#1b1410] px-2.5 py-1 border-b border-[#2a1e14] flex items-center justify-between">
              <span className="font-black text-[10px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers size={11} className="text-[#ff6b1a]" />
                Scenes
              </span>
              {isStudioMode && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  STUDIO PREVIEW
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {scenes.map((sc) => {
                const isProgram = sc.id === activeSceneId;
                const isPreview = isStudioMode && sc.id === previewSceneId;
                return (
                  <button
                    key={sc.id}
                    onClick={() => onSelectScene(sc.id)}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between font-bold text-[11px] transition ${
                      isProgram
                        ? 'bg-[#e8430a]/25 text-white border border-[#e8430a]/60'
                        : isPreview
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50'
                          : 'text-slate-300 hover:bg-[#1f1712] border border-transparent'
                    }`}
                  >
                    <span className="truncate">{sc.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {isProgram && (
                        <span className="px-1 py-0.2 bg-[#e8430a] text-white rounded text-[8px] font-black uppercase">
                          LIVE
                        </span>
                      )}
                      {isPreview && !isProgram && (
                        <span className="px-1 py-0.2 bg-emerald-600 text-white rounded text-[8px] font-black uppercase">
                          PVW
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Scene Toolbar */}
            <div className="bg-[#100c0a] px-1.5 py-1 border-t border-[#2a1e14] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const name = prompt('New Scene Name:', `Scene ${scenes.length + 1}`);
                    if (name) onAddScene(name);
                  }}
                  className="px-2 py-1 hover:bg-[#241b15] rounded text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 font-bold text-[10px]"
                  title="Add Scene"
                >
                  <Plus size={12} />
                  <span>New Scene</span>
                </button>
                <button
                  onClick={() => onDuplicateScene(editingSceneId)}
                  className="p-1 hover:bg-[#241b15] rounded text-slate-300 hover:text-white transition"
                  title="Duplicate Scene"
                >
                  <Copy size={12} />
                </button>
              </div>
              {scenes.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`Delete scene "${currentScene.name}"?`)) {
                      onDeleteScene(editingSceneId);
                    }
                  }}
                  className="p-1 hover:bg-rose-950 rounded text-slate-400 hover:text-rose-400 transition"
                  title="Remove Scene"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* DOCK 2: SOURCES */}
          <div
            className={`${
              mobileDockTab === 'sources' ? 'flex' : 'hidden xl:flex'
            } bg-[#140f0c] border border-[#2a1e14] rounded-lg flex-col overflow-hidden relative`}
          >
            <div className="bg-[#1b1410] px-2.5 py-1 border-b border-[#2a1e14] flex items-center justify-between">
              <span className="font-black text-[10px] uppercase tracking-wider text-slate-300 truncate">
                Sources — {currentScene?.name}
              </span>
              <span className="text-[9px] text-slate-500 font-mono">{sortedSources.length} layers</span>
            </div>

            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {sortedSources.map((src) => {
                const isSelected = src.id === selectedSourceId;
                return (
                  <div
                    key={src.id}
                    onClick={() => onSelectSource(src.id)}
                    className={`px-2 py-1 rounded flex items-center justify-between cursor-pointer text-[11px] transition border ${
                      isSelected
                        ? 'bg-sky-950/50 border-sky-500/60 text-white font-bold'
                        : 'text-slate-300 hover:bg-[#1f1712] border-transparent'
                    }`}
                  >
                    <span className="truncate pr-2">{src.name}</span>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenSourceProperties(src.id)}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                        title="Source Properties"
                      >
                        <Settings2 size={12} />
                      </button>
                      <button
                        onClick={() => onToggleSourceVisibility(src.id)}
                        className={`p-1 hover:bg-slate-800 rounded ${
                          src.visible ? 'text-slate-300' : 'text-slate-600'
                        }`}
                        title={src.visible ? 'Hide Source' : 'Show Source'}
                      >
                        {src.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button
                        onClick={() => onToggleSourceLock(src.id)}
                        className={`p-1 hover:bg-slate-800 rounded ${
                          src.locked ? 'text-amber-400' : 'text-slate-500'
                        }`}
                        title={src.locked ? 'Unlock Position' : 'Lock Position'}
                      >
                        {src.locked ? <Lock size={12} /> : <Unlock size={12} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Source Popover Menu */}
            {showAddSourceMenu && (
              <div className="absolute bottom-8 left-1 right-1 bg-[#18120e] border border-[#3a2818] rounded-lg shadow-2xl p-1 z-50 max-h-32 overflow-y-auto space-y-0.5">
                <div className="px-2 py-0.5 text-[9px] font-black uppercase text-slate-400 border-b border-[#2a1e14]">
                  Add OBS Broadcast Layer
                </div>
                {SOURCE_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      onAddSource(opt.type);
                      setShowAddSourceMenu(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded hover:bg-[#261c16] flex items-center gap-2 text-[11px] font-bold text-slate-200 transition"
                  >
                    <span className={opt.color}>{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Source Toolbar */}
            <div className="bg-[#100c0a] px-1.5 py-1 border-t border-[#2a1e14] flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowAddSourceMenu(!showAddSourceMenu)}
                  className="px-2 py-0.5 hover:bg-[#241b15] rounded text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1 font-bold text-[10px]"
                  title="Add Source"
                >
                  <Plus size={12} />
                  <span>Add Layer</span>
                </button>
                {selectedSourceId && (
                  <>
                    <button
                      onClick={() => onMoveSourceOrder(selectedSourceId, 'up')}
                      className="p-1 hover:bg-[#241b15] rounded text-slate-300 hover:text-white"
                      title="Move Layer Up (Front)"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => onMoveSourceOrder(selectedSourceId, 'down')}
                      className="p-1 hover:bg-[#241b15] rounded text-slate-300 hover:text-white"
                      title="Move Layer Down (Back)"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      onClick={() => onOpenSourceProperties(selectedSourceId)}
                      className="p-1 hover:bg-[#241b15] rounded text-sky-400"
                      title="Properties"
                    >
                      <Settings2 size={12} />
                    </button>
                  </>
                )}
              </div>
              {selectedSourceId && (
                <button
                  onClick={() => onDeleteSource(selectedSourceId)}
                  className="p-1 hover:bg-rose-950 rounded text-slate-400 hover:text-rose-400"
                  title="Delete Selected Source"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          {/* DOCK 3: AUDIO MIXER */}
          <div
            className={`${
              mobileDockTab === 'mixer' ? 'flex' : 'hidden xl:flex'
            } bg-[#140f0c] border border-[#2a1e14] rounded-lg flex-col overflow-hidden`}
          >
            <div className="bg-[#1b1410] px-2.5 py-1 border-b border-[#2a1e14] flex items-center justify-between">
              <span className="font-black text-[10px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sliders size={11} className="text-emerald-400" />
                Audio Mixer
              </span>
              <span className="text-[9px] text-emerald-400 font-mono">48kHz Stereo</span>
            </div>

            <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto">
              {/* Mic / Aux Channel */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-200">Mic / Court Audio</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {micMuted ? '-∞ dB' : `${Math.round((micVolume - 100) * 0.4)} dB`}
                  </span>
                </div>

                {/* Real-time dB Meter Bar */}
                <div className="w-full h-2 bg-black rounded overflow-hidden p-0.5 border border-slate-800 flex gap-0.5">
                  <div
                    className={`h-full transition-all duration-75 rounded-sm ${
                      micMuted
                        ? 'bg-slate-700'
                        : audioLevel > 80
                          ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500'
                          : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    }`}
                    style={{ width: `${micMuted ? 0 : Math.min(100, audioLevel)}%` }}
                  />
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={onToggleMicMute}
                    className={`p-1 rounded border transition ${
                      micMuted
                        ? 'bg-rose-950/80 border-rose-700 text-rose-400'
                        : 'bg-slate-900 border-slate-700 text-emerald-400'
                    }`}
                    title={micMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {micMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={140}
                    value={micMuted ? 0 : micVolume}
                    onChange={(e) => onChangeMicVolume(parseInt(e.target.value, 10))}
                    className="flex-1 accent-emerald-500 h-1.5"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{micVolume}%</span>
                </div>
              </div>

              {/* Media / Overlay Audio Channel */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-200">Media / Replay Audio</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {desktopAudioMuted ? '-∞ dB' : '0.0 dB'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDesktopAudioMuted(!desktopAudioMuted)}
                    className={`p-1 rounded border transition ${
                      desktopAudioMuted
                        ? 'bg-rose-950/80 border-rose-700 text-rose-400'
                        : 'bg-slate-900 border-slate-700 text-sky-400'
                    }`}
                  >
                    {desktopAudioMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={desktopAudioMuted ? 0 : desktopAudioVol}
                    onChange={(e) => setDesktopAudioVol(parseInt(e.target.value, 10))}
                    className="flex-1 accent-sky-500 h-1.5"
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{desktopAudioVol}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* DOCK 4: SCENE TRANSITIONS */}
          <div
            className={`${
              mobileDockTab === 'transitions' ? 'flex' : 'hidden xl:flex'
            } bg-[#140f0c] border border-[#2a1e14] rounded-lg flex-col overflow-hidden`}
          >
            <div className="bg-[#1b1410] px-2.5 py-1 border-b border-[#2a1e14] flex items-center justify-between">
              <span className="font-black text-[10px] uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles size={11} className="text-amber-400" />
                Scene Transitions
              </span>
            </div>

            <div className="flex-1 p-2.5 flex flex-col justify-between">
              <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-0.5">Style</label>
                  <select
                    value={transitionType}
                    onChange={(e) => onChangeTransitionType(e.target.value as TransitionType)}
                    className="w-full bg-[#0c0907] border border-[#2a1e14] rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-[#ff6b1a]"
                  >
                    <option value="fade">Fade (Cross-Dissolve)</option>
                    <option value="cut">Cut (Instant Switch)</option>
                    <option value="slide">Slide Wipe (Sports Push)</option>
                    <option value="zoom">Zoom Broadcast Punch</option>
                  </select>
                </div>

                <div className="flex xl:flex-row flex-col xl:items-center justify-between gap-1">
                  <label className="text-[10px] text-slate-400 font-bold">Duration (ms)</label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    step={50}
                    value={transitionDurationMs}
                    onChange={(e) => onChangeTransitionDuration(parseInt(e.target.value, 10) || 300)}
                    className="w-full xl:w-20 bg-[#0c0907] border border-[#2a1e14] rounded-lg px-2 py-1 text-xs font-mono text-right text-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <button
                onClick={onTriggerTransition}
                className="w-full py-1.5 bg-gradient-to-r from-[#e8430a] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#ff8533] text-white font-black uppercase tracking-wider rounded-lg text-[11px] shadow-md transition active:scale-98"
              >
                {isStudioMode ? 'Transition PVW → Live' : 'Trigger Transition'}
              </button>
            </div>
          </div>

          {/* DOCK 5: BROADCAST CONTROLS */}
          <div
            className={`${
              mobileDockTab === 'controls' ? 'flex' : 'hidden xl:flex'
            } bg-[#140f0c] border border-[#2a1e14] rounded-lg flex-col overflow-hidden`}
          >
            <div className="bg-[#1b1410] px-2.5 py-1 border-b border-[#2a1e14] flex items-center justify-between">
              <span className="font-black text-[10px] uppercase tracking-wider text-slate-300">
                Controls
              </span>
              <span className="text-[9px] font-mono text-emerald-400">{fps} FPS • 0 dropped</span>
            </div>

            <div className="flex-1 p-2 grid grid-cols-2 xl:flex xl:flex-col justify-between gap-1">
              <button
                onClick={onOpenGoLiveModal}
                className={`w-full py-1.5 px-2.5 rounded-lg font-black text-[11px] flex items-center justify-between transition shadow ${
                  isStreaming
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Radio size={12} />
                  <span>{isStreaming ? 'Stop Stream' : 'Start Stream'}</span>
                </span>
                <span className="flex items-center gap-1 text-[9px]">
                  {isYouTubeLive && <span className="px-1 bg-red-800 rounded">YT</span>}
                  {isFacebookLive && <span className="px-1 bg-blue-800 rounded">FB</span>}
                </span>
              </button>

              <button
                onClick={onToggleRecording}
                className={`w-full py-1.5 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-between transition border ${
                  recordingState.isRecording
                    ? 'bg-rose-700 border-rose-500 text-white'
                    : 'bg-[#1b1410] hover:bg-[#241b15] border-[#2a1e14] text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Circle size={11} className={recordingState.isRecording ? 'fill-white' : 'fill-rose-500 text-rose-500'} />
                  <span>{recordingState.isRecording ? 'Stop REC' : 'Record MP4'}</span>
                </span>
              </button>

              <button
                onClick={onTriggerInstantReplay}
                className="w-full py-1.5 px-2.5 rounded-lg font-bold text-[11px] flex items-center justify-between bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 transition"
                title="Play 10-Second Slow-Motion Instant Replay on Broadcast"
              >
                <span className="flex items-center gap-1.5">
                  <Zap size={12} className="text-amber-400" />
                  <span>Instant Replay</span>
                </span>
                <span className="text-[9px] font-mono uppercase">10s</span>
              </button>

              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={onToggleStudioMode}
                  className={`py-1 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 border transition ${
                    isStudioMode
                      ? 'bg-amber-600 border-amber-400 text-white'
                      : 'bg-[#1b1410] hover:bg-[#241b15] border-[#2a1e14] text-slate-300'
                  }`}
                >
                  <Columns size={11} />
                  <span>Studio</span>
                </button>
                <button
                  onClick={onOpenSettings}
                  className="py-1 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 bg-[#1b1410] hover:bg-[#241b15] border border-[#2a1e14] text-slate-300 transition"
                >
                  <Settings size={11} />
                  <span>Setup</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
