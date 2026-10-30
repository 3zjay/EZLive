'use client';

import React, { useState } from 'react';
import { X, Check, Upload, Maximize, AlignCenter, AlignVerticalSpaceAround } from 'lucide-react';
import { CameraSource, Source } from '@/types/broadcast';

interface SourcePropertiesModalProps {
  source: Source | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSource: Source) => void;
}

export const SourcePropertiesModal: React.FC<SourcePropertiesModalProps> = ({
  source,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localSource, setLocalSource] = useState<Source | null>(source);
  const [prevSource, setPrevSource] = useState<Source | null>(source);

  // Synchronize state when source changes without direct effect setState
  if (source !== prevSource) {
    setPrevSource(source);
    setLocalSource(source ? { ...source } : null);
  }

  if (!isOpen || !localSource) return null;

  const handleSave = () => {
    onSave(localSource);
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl && localSource.type === 'image') {
        setLocalSource({
          ...localSource,
          url: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Quick positioning helpers
  const fitToScreen = () => {
    setLocalSource({
      ...localSource,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });
  };

  const centerHorizontal = () => {
    setLocalSource({
      ...localSource,
      x: Math.round((1920 - localSource.width) / 2),
    });
  };

  const centerVertical = () => {
    setLocalSource({
      ...localSource,
      y: Math.round((1080 - localSource.height) / 2),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h3 className="font-extrabold text-sm text-white tracking-wide uppercase">
              Source Properties: {localSource.name}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-slate-300">
          {/* 1. General Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Source Name</label>
              <input
                type="text"
                value={localSource.name}
                onChange={(e) => setLocalSource({ ...localSource, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-400 mb-1">Opacity: {Math.round((localSource.opacity ?? 1) * 100)}%</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={localSource.opacity ?? 1}
                onChange={(e) => setLocalSource({ ...localSource, opacity: parseFloat(e.target.value) })}
                className="w-full mt-2 accent-sky-500"
              />
            </div>
          </div>

          {/* 2. Type-Specific Settings */}
          {/* BROWSER URL SOURCE */}
          {localSource.type === 'browser_url' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-400 uppercase text-[11px]">Official Scoreboard Overlay Presets</span>
                <span className="text-[10px] text-slate-400 font-mono">scoreboard.hoopculture.ca</span>
              </div>

              {/* 1-Click Official Overlay Presets */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const email = (localSource.url?.includes('user=') ? new URL(localSource.url).searchParams.get('user') : null) || (typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') : null) || 'isidro.pascua@gmail.com';
                    setLocalSource({
                      ...localSource,
                      name: 'NBA Scorebug 2 Overlay (/nbaoverlay2)',
                      url: `https://scoreboard.hoopculture.ca/nbaoverlay2?user=${encodeURIComponent(email)}`,
                      x: 0,
                      y: 0,
                      width: 1920,
                      height: 1080,
                      locked: true,
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.url?.includes('/nbaoverlay2')
                      ? 'border-emerald-500 bg-emerald-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-emerald-400">★ 1. NBA Scorebug 2</span>
                  <span className="text-[10px] text-slate-400">Main bottom pill (/nbaoverlay2) synced via login</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const email = (localSource.url?.includes('user=') ? new URL(localSource.url).searchParams.get('user') : null) || (typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') : null) || 'isidro.pascua@gmail.com';
                    setLocalSource({
                      ...localSource,
                      name: 'Fullscreen Lower Third Overlay (/fullscreen)',
                      url: `https://scoreboard.hoopculture.ca/fullscreen?user=${encodeURIComponent(email)}`,
                      x: 0,
                      y: 0,
                      width: 1920,
                      height: 1080,
                      locked: true,
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.url?.includes('/fullscreen')
                      ? 'border-orange-500 bg-orange-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-amber-400">2. Full-Width Lower Third</span>
                  <span className="text-[10px] text-slate-400">Full 1920px bottom bar (/fullscreen)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const email = (localSource.url?.includes('user=') ? new URL(localSource.url).searchParams.get('user') : null) || (typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') : null) || 'isidro.pascua@gmail.com';
                    setLocalSource({
                      ...localSource,
                      name: 'Classic NBA Overlay (/nbaoverlay)',
                      url: `https://scoreboard.hoopculture.ca/nbaoverlay?user=${encodeURIComponent(email)}`,
                      x: 0,
                      y: 0,
                      width: 1920,
                      height: 1080,
                      locked: true,
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.url?.includes('/nbaoverlay?')
                      ? 'border-orange-500 bg-orange-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-sky-400">3. Classic NBA Scorebug</span>
                  <span className="text-[10px] text-slate-400">Top split bug (/nbaoverlay)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const email = (localSource.url?.includes('user=') ? new URL(localSource.url).searchParams.get('user') : null) || (typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') : null) || 'isidro.pascua@gmail.com';
                    setLocalSource({
                      ...localSource,
                      name: 'NBC Pro Broadcast Overlay (/nbc)',
                      url: `https://scoreboard.hoopculture.ca/nbc?user=${encodeURIComponent(email)}`,
                      x: 0,
                      y: 0,
                      width: 1920,
                      height: 1080,
                      locked: true,
                    });
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.url?.includes('/nbc')
                      ? 'border-orange-500 bg-orange-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-orange-400">4. NBC Pro Broadcast Bug</span>
                  <span className="text-[10px] text-slate-400">Segmented top bug (/nbc)</span>
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Active Overlay URL (Linked via Login)</label>
                <input
                  type="url"
                  value={localSource.url}
                  onChange={(e) => setLocalSource({ ...localSource, url: e.target.value })}
                  placeholder="https://scoreboard.hoopculture.ca/nbaoverlay2?user=..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Streams live scores, team logos, and timers directly from scoreboard.hoopculture.ca via your login.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-slate-200">Broadcast Canvas Sync Bridge</div>
                  <div className="text-[10px] text-slate-400">Automatically composites score state onto live recording and RTMP stream</div>
                </div>
                <input
                  type="checkbox"
                  checked={localSource.syncDataBridge ?? true}
                  onChange={(e) => setLocalSource({ ...localSource, syncDataBridge: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                />
              </div>
            </div>
          )}

          {/* SCOREBOARD SOURCE THEME SELECTOR */}
          {localSource.type === 'scoreboard' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-orange-400 uppercase text-[11px] flex items-center justify-between">
                <span>Hoop Culture Overlay Theme</span>
                <span className="text-[10px] text-slate-400 font-mono">60 FPS In-Stream</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocalSource({ ...localSource, theme: 'nbaoverlay2', width: 604, height: 106, x: 658, y: 934 })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.theme === 'nbaoverlay2' || localSource.theme === 'nba_neon'
                      ? 'border-emerald-500 bg-emerald-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-emerald-400">★ 1. NBA Scorebug 2 (/nbaoverlay2)</span>
                  <span className="text-[10px] text-slate-400">Official Hoop Culture bottom pill with dual logos, Teko font & fouls</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocalSource({ ...localSource, theme: 'fullscreen_bar', width: 1920, height: 124, x: 0, y: 956 })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.theme === 'fullscreen_bar'
                      ? 'border-orange-500 bg-orange-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-amber-400">2. Full-Width Lower Third</span>
                  <span className="text-[10px] text-slate-400">Full 1920px bottom bar (/fullscreen) with sponsor & venue crawl</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocalSource({ ...localSource, theme: 'nba_classic', width: 880, height: 100, x: (1920 - 880) / 2, y: 40 })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.theme === 'nba_classic'
                      ? 'border-orange-500 bg-orange-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-sky-400">3. Classic NBA Scorebug</span>
                  <span className="text-[10px] text-slate-400">Top banner (/nbaoverlay) with split Home/Away columns</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLocalSource({ ...localSource, theme: 'nbc', width: 1040, height: 116, x: (1920 - 1040) / 2, y: 40 })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition ${
                    localSource.theme === 'nbc'
                      ? 'border-orange-500 bg-orange-950/40 text-white'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-xs text-orange-400">4. NBC Pro Broadcast Bug</span>
                  <span className="text-[10px] text-slate-400">Segmented top bug (/nbc) with team colors & shot clock</span>
                </button>
              </div>

              <div className="pt-1">
                <label className="block font-bold text-slate-400 text-xs mb-1">Scale Multiplier</label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={localSource.scale || 1}
                  onChange={(e) => setLocalSource({ ...localSource, scale: parseFloat(e.target.value) || 1 })}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>0.5x</span>
                  <span>Scale: {(localSource.scale || 1).toFixed(2)}x</span>
                  <span>1.5x</span>
                </div>
              </div>
            </div>
          )}

          {/* TEXT SOURCE */}
          {localSource.type === 'text' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-purple-400 uppercase text-[11px]">Text Source Settings</div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Text Content</label>
                <input
                  type="text"
                  value={localSource.text}
                  onChange={(e) => setLocalSource({ ...localSource, text: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-medium text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Font Size (px)</label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={localSource.fontSize}
                    onChange={(e) => setLocalSource({ ...localSource, fontSize: parseInt(e.target.value, 10) || 24 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Text Color</label>
                  <input
                    type="text"
                    value={localSource.color}
                    onChange={(e) => setLocalSource({ ...localSource, color: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Background Color</label>
                  <input
                    type="text"
                    value={localSource.backgroundColor}
                    onChange={(e) => setLocalSource({ ...localSource, backgroundColor: e.target.value })}
                    placeholder="e.g. rgba(0,0,0,0.8)"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* IMAGE SOURCE */}
          {localSource.type === 'image' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-amber-400 uppercase text-[11px]">Image / Logo Settings</div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Upload File (from iPad Photos / Disk)</label>
                <label className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-850 hover:bg-slate-800 border border-dashed border-slate-700 rounded-xl cursor-pointer text-slate-200">
                  <Upload size={14} />
                  <span>Choose Image File (PNG, JPG, SVG)</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Or Paste Image URL</label>
                <input
                  type="url"
                  value={localSource.url}
                  onChange={(e) => setLocalSource({ ...localSource, url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* COLOR SOLID SOURCE */}
          {localSource.type === 'color_solid' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-slate-400 uppercase text-[11px]">Solid Color Banner Settings</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Color / Hex</label>
                  <input
                    type="text"
                    value={localSource.color}
                    onChange={(e) => setLocalSource({ ...localSource, color: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Corner Radius (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={localSource.borderRadius}
                    onChange={(e) => setLocalSource({ ...localSource, borderRadius: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CAMERA SOURCE */}
          {localSource.type === 'camera' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-emerald-400 uppercase text-[11px]">Camera Video Settings</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Aspect Fit Mode</label>
                  <select
                    value={localSource.fit}
                    onChange={(e) => setLocalSource({ ...localSource, fit: e.target.value as CameraSource['fit'] })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="cover">Cover (Fill screen)</option>
                    <option value="contain">Contain (Letterbox)</option>
                    <option value="fill">Stretch</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">Lens</label>
                  <select
                    value={localSource.facingMode ?? 'environment'}
                    onChange={(e) => setLocalSource({ ...localSource, facingMode: e.target.value as CameraSource['facingMode'] })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none"
                  >
                    <option value="environment">Rear Court Lens</option>
                    <option value="user">Front User Lens</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="font-bold text-slate-300">Horizontal Mirror (Flip Left/Right)</span>
                <input
                  type="checkbox"
                  checked={localSource.mirror ?? false}
                  onChange={(e) => setLocalSource({ ...localSource, mirror: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-500"
                />
              </div>
            </div>
          )}

          {/* VIDEO MEDIA SOURCE */}
          {localSource.type === 'video_media' && (
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-amber-400 uppercase text-[11px]">Video Media / Sponsor Commercial Settings</div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Video File URL (MP4 / WebM)</label>
                <input
                  type="url"
                  value={localSource.url}
                  onChange={(e) => setLocalSource({ ...localSource, url: e.target.value })}
                  placeholder="https://example.com/intro.mp4"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSource.loop ?? true}
                    onChange={(e) => setLocalSource({ ...localSource, loop: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="font-bold text-slate-300">Loop Video Continuously</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSource.muted ?? true}
                    onChange={(e) => setLocalSource({ ...localSource, muted: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="font-bold text-slate-300">Mute Video Track</span>
                </label>
              </div>
            </div>
          )}

          {/* 3. Transform Coordinates (X, Y, W, H) */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-400 uppercase text-[11px]">Position & Transform (1080p Canvas)</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={centerHorizontal}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  title="Center Horizontally"
                >
                  <AlignCenter size={14} />
                </button>
                <button
                  type="button"
                  onClick={centerVertical}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  title="Center Vertically"
                >
                  <AlignVerticalSpaceAround size={14} />
                </button>
                <button
                  type="button"
                  onClick={fitToScreen}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
                  title="Fit to Screen"
                >
                  <Maximize size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500">X (px)</label>
                <input
                  type="number"
                  value={localSource.x}
                  onChange={(e) => setLocalSource({ ...localSource, x: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Y (px)</label>
                <input
                  type="number"
                  value={localSource.y}
                  onChange={(e) => setLocalSource({ ...localSource, y: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Width (px)</label>
                <input
                  type="number"
                  value={localSource.width}
                  onChange={(e) => setLocalSource({ ...localSource, width: parseInt(e.target.value, 10) || 100 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500">Height (px)</label>
                <input
                  type="number"
                  value={localSource.height}
                  onChange={(e) => setLocalSource({ ...localSource, height: parseInt(e.target.value, 10) || 100 })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-white font-bold transition shadow"
          >
            <Check size={14} />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
