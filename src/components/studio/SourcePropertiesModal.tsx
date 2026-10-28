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
              <div className="font-bold text-sky-400 uppercase text-[11px]">Browser Source Settings</div>
              <div>
                <label className="block font-bold text-slate-400 mb-1">Overlay Webpage URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={localSource.url}
                    onChange={(e) => setLocalSource({ ...localSource, url: e.target.value })}
                    placeholder="https://your-scoreboard.vercel.app/overlay"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setLocalSource({ ...localSource, url: '/scoreboard' })}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl border border-slate-700 text-[11px]"
                  >
                    Demo URL
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Enter your Vercel scoreboard, tournament bracket, or web graphic URL.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="font-bold text-slate-200">PostMessage Video Sync</div>
                  <div className="text-[10px] text-slate-400">Syncs scores into the Canvas compositor output</div>
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
