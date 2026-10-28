'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Settings2,
  Video,
  Globe,
  Image as ImageIcon,
  Type,
  Layout,
  Palette,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Scene, SourceType, TransitionType } from '@/types/broadcast';

interface ObsDocksProps {
  scenes: Scene[];
  activeSceneId: string;
  selectedSourceId: string | null;
  transitionType: TransitionType;
  transitionDurationMs: number;
  onSelectScene: (id: string) => void;
  onAddScene: (name: string) => void;
  onDeleteScene: (id: string) => void;
  onRenameScene: (id: string, newName: string) => void;
  onReorderScene: (id: string, direction: 'up' | 'down') => void;
  onSelectSource: (id: string | null) => void;
  onAddSource: (type: SourceType) => void;
  onDeleteSource: (id: string) => void;
  onToggleSourceVisibility: (id: string) => void;
  onToggleSourceLock: (id: string) => void;
  onReorderSource: (id: string, direction: 'up' | 'down') => void;
  onOpenSourceProperties: (id: string) => void;
  onChangeTransition: (type: TransitionType, durationMs: number) => void;
}

export const ObsDocks: React.FC<ObsDocksProps> = ({
  scenes,
  activeSceneId,
  selectedSourceId,
  transitionType,
  transitionDurationMs,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onRenameScene,
  onReorderScene,
  onSelectSource,
  onAddSource,
  onDeleteSource,
  onToggleSourceVisibility,
  onToggleSourceLock,
  onReorderSource,
  onOpenSourceProperties,
  onChangeTransition,
}) => {
  const [showAddSourceMenu, setShowAddSourceMenu] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingSceneName, setEditingSceneName] = useState('');

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  // Sort sources reversed by zIndex for display so topmost layer is at top of list (standard OBS behavior)
  const displaySources = activeScene?.sources ? [...activeScene.sources].sort((a, b) => b.zIndex - a.zIndex) : [];

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case 'camera':
        return <Video size={13} className="text-emerald-400" />;
      case 'browser_url':
        return <Globe size={13} className="text-sky-400" />;
      case 'image':
        return <ImageIcon size={13} className="text-amber-400" />;
      case 'text':
        return <Type size={13} className="text-purple-400" />;
      case 'scoreboard':
        return <Layout size={13} className="text-rose-400" />;
      case 'color_solid':
        return <Palette size={13} className="text-slate-400" />;
    }
  };

  const handleStartRename = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setEditingSceneName(scene.name);
  };

  const handleCommitRename = (id: string) => {
    if (editingSceneName.trim()) {
      onRenameScene(id, editingSceneName.trim());
    }
    setEditingSceneId(null);
  };

  return (
    <div className="h-56 bg-slate-950 border-t border-slate-800 flex divide-x divide-slate-850 select-none z-20 text-xs">
      {/* --- DOCK 1: SCENES --- */}
      <div className="w-1/3 md:w-72 flex flex-col bg-slate-950">
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 font-extrabold uppercase tracking-wider text-[11px] text-slate-400 flex items-center justify-between">
          <span>Scenes</span>
          <span className="text-[10px] text-slate-500 font-medium">{scenes.length} Total</span>
        </div>

        {/* Scene List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {scenes.map((scene) => {
            const isActive = scene.id === activeSceneId;
            return (
              <div
                key={scene.id}
                onClick={() => onSelectScene(scene.id)}
                onDoubleClick={() => handleStartRename(scene)}
                className={`group px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                  isActive
                    ? 'bg-red-600 text-white font-bold shadow'
                    : 'bg-slate-900/60 hover:bg-slate-850 text-slate-300'
                }`}
              >
                {editingSceneId === scene.id ? (
                  <input
                    type="text"
                    value={editingSceneName}
                    autoFocus
                    onChange={(e) => setEditingSceneName(e.target.value)}
                    onBlur={() => handleCommitRename(scene.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitRename(scene.id);
                    }}
                    className="w-full bg-slate-950 text-white px-1 py-0.5 rounded border border-sky-400 focus:outline-none text-xs"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className="flex items-center gap-2 truncate">
                    <span className="truncate">{scene.name}</span>
                  </div>
                )}
                <span className={`text-[10px] ${isActive ? 'text-red-200' : 'text-slate-500'}`}>
                  {scene.sources?.length ?? 0} src
                </span>
              </div>
            );
          })}
        </div>

        {/* Scene Control Toolbar */}
        <div className="p-1 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => {
                const name = prompt('Enter new scene name:', `Scene ${scenes.length + 1}`);
                if (name) onAddScene(name);
              }}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
              title="Add New Scene"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => {
                if (scenes.length <= 1) {
                  alert('Cannot delete the only scene.');
                  return;
                }
                if (confirm(`Delete active scene "${activeScene.name}"?`)) {
                  onDeleteScene(activeSceneId);
                }
              }}
              className="p-1.5 hover:bg-slate-800 hover:text-rose-400 rounded"
              title="Delete Scene"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onReorderScene(activeSceneId, 'up')}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
              title="Move Scene Up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => onReorderScene(activeSceneId, 'down')}
              className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
              title="Move Scene Down"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* --- DOCK 2: SOURCES (For active scene) --- */}
      <div className="flex-1 flex flex-col bg-slate-950 relative">
        <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 font-extrabold uppercase tracking-wider text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Sources</span>
            <span className="text-[10px] text-sky-400 font-bold bg-sky-950/60 px-1.5 py-0.2 rounded border border-sky-800/40">
              {activeScene.name}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">Topmost layer first</span>
        </div>

        {/* Source List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {displaySources.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-4">
              <p>No sources in this scene.</p>
              <button
                onClick={() => setShowAddSourceMenu(true)}
                className="mt-2 text-sky-400 hover:underline font-bold"
              >
                + Add your first source
              </button>
            </div>
          ) : (
            displaySources.map((source) => {
              const isSelected = source.id === selectedSourceId;
              return (
                <div
                  key={source.id}
                  onClick={() => onSelectSource(source.id)}
                  onDoubleClick={() => onOpenSourceProperties(source.id)}
                  className={`px-2 py-1.5 rounded-lg flex items-center justify-between transition cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-800 border-sky-500 text-white shadow-sm ring-1 ring-sky-500/40'
                      : 'bg-slate-900/60 border-transparent hover:bg-slate-850 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="shrink-0">{getSourceIcon(source.type)}</span>
                    <span className={`truncate ${!source.visible ? 'line-through text-slate-500' : ''}`}>
                      {source.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Visibility Toggle */}
                    <button
                      onClick={() => onToggleSourceVisibility(source.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title={source.visible ? 'Hide Source' : 'Show Source'}
                    >
                      {source.visible ? <Eye size={12} /> : <EyeOff size={12} className="text-slate-600" />}
                    </button>

                    {/* Lock Toggle */}
                    <button
                      onClick={() => onToggleSourceLock(source.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title={source.locked ? 'Unlock Source' : 'Lock Source'}
                    >
                      {source.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                    </button>

                    {/* Properties Button */}
                    <button
                      onClick={() => onOpenSourceProperties(source.id)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                      title="Source Properties"
                    >
                      <Settings2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Source Control Toolbar */}
        <div className="p-1 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-0.5 relative">
            <button
              onClick={() => setShowAddSourceMenu(!showAddSourceMenu)}
              className="p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-bold flex items-center gap-1 text-[11px] px-2 shadow"
              title="Add New Source"
            >
              <Plus size={13} />
              <span>Add Source</span>
            </button>

            {selectedSourceId && (
              <button
                onClick={() => onDeleteSource(selectedSourceId)}
                className="p-1.5 hover:bg-slate-800 hover:text-rose-400 rounded"
                title="Delete Selected Source"
              >
                <Trash2 size={14} />
              </button>
            )}

            {selectedSourceId && (
              <button
                onClick={() => onOpenSourceProperties(selectedSourceId)}
                className="p-1.5 hover:bg-slate-800 hover:text-sky-300 rounded"
                title="Edit Properties"
              >
                <Settings2 size={14} />
              </button>
            )}

            {/* Add Source Popup Menu (OBS-Style) */}
            {showAddSourceMenu && (
              <div className="absolute bottom-10 left-0 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 space-y-1 z-50 text-slate-200">
                <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Add OBS Source
                </div>

                <button
                  onClick={() => {
                    onAddSource('browser_url');
                    setShowAddSourceMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition text-xs"
                >
                  <Globe size={15} className="text-sky-400" />
                  <div>
                    <div className="font-bold text-slate-200">Browser Source (URL Overlay)</div>
                    <div className="text-[10px] text-slate-400">Scoreboards, Vercel web overlays, widgets</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAddSource('camera');
                    setShowAddSourceMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition text-xs"
                >
                  <Video size={15} className="text-emerald-400" />
                  <div>
                    <div className="font-bold text-slate-200">Video Capture Device (Camera)</div>
                    <div className="text-[10px] text-slate-400">iPad rear wide-angle court camera</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAddSource('image');
                    setShowAddSourceMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition text-xs"
                >
                  <ImageIcon size={15} className="text-amber-400" />
                  <div>
                    <div className="font-bold text-slate-200">Image / Sponsor Watermark</div>
                    <div className="text-[10px] text-slate-400">PNG, JPG logo or sponsor banner</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAddSource('text');
                    setShowAddSourceMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition text-xs"
                >
                  <Type size={15} className="text-purple-400" />
                  <div>
                    <div className="font-bold text-slate-200">Text / Lower-Third</div>
                    <div className="text-[10px] text-slate-400">Custom labels, interview lower-thirds</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAddSource('scoreboard');
                    setShowAddSourceMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition text-xs"
                >
                  <Layout size={15} className="text-rose-400" />
                  <div>
                    <div className="font-bold text-slate-200">Basketball Scoreboard HUD</div>
                    <div className="text-[10px] text-slate-400">Built-in 60 FPS live broadcast bar</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    onAddSource('color_solid');
                    setShowAddSourceMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2.5 transition text-xs"
                >
                  <Palette size={15} className="text-slate-400" />
                  <div>
                    <div className="font-bold text-slate-200">Color Source (Solid Banner)</div>
                    <div className="text-[10px] text-slate-400">Background cards and accent stripes</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {selectedSourceId && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onReorderSource(selectedSourceId, 'up')}
                className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
                title="Bring Forward (Up)"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => onReorderSource(selectedSourceId, 'down')}
                className="p-1.5 hover:bg-slate-800 hover:text-white rounded"
                title="Send Backward (Down)"
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- DOCK 3: TRANSITIONS & PROGRAM CONTROLS --- */}
      <div className="w-48 hidden md:flex flex-col bg-slate-950 p-2.5 justify-between">
        <div>
          <div className="font-extrabold uppercase tracking-wider text-[11px] text-slate-400 mb-2">
            Scene Transition
          </div>

          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              onClick={() => onChangeTransition('cut', 0)}
              className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition ${
                transitionType === 'cut'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Zap size={12} />
              <span>Cut</span>
            </button>
            <button
              onClick={() => onChangeTransition('fade', 400)}
              className={`py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition ${
                transitionType === 'fade'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles size={12} />
              <span>Fade</span>
            </button>
          </div>

          {transitionType === 'fade' && (
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>Duration</span>
                <span className="font-mono text-sky-400">{transitionDurationMs}ms</span>
              </div>
              <input
                type="range"
                min={100}
                max={1500}
                step={50}
                value={transitionDurationMs}
                onChange={(e) => onChangeTransition('fade', parseInt(e.target.value, 10))}
                className="w-full accent-sky-500"
              />
            </div>
          )}
        </div>

        <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-850">
          Double-click source or scene to edit properties.
        </div>
      </div>
    </div>
  );
};
