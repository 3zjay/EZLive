'use client';

import React, { useState } from 'react';
import {
  X,
  Camera,
  Link as LinkIcon,
  Radio,
  Check,
  HelpCircle,
  FolderArchive,
  Download,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { StreamSettings } from '@/types/broadcast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StreamSettings;
  onSaveSettings: (settings: StreamSettings) => void;
  videoDevices: MediaDeviceInfo[];
  audioDevices: MediaDeviceInfo[];
  selectedVideoDeviceId: string;
  selectedAudioDeviceId: string;
  onSelectVideoDevice: (deviceId: string) => void;
  onSelectAudioDevice: (deviceId: string) => void;
  onExportScenes: () => void;
  onImportScenes: (jsonString: string) => void;
  onResetScenes: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  videoDevices,
  audioDevices,
  selectedVideoDeviceId,
  selectedAudioDeviceId,
  onSelectVideoDevice,
  onSelectAudioDevice,
  onExportScenes,
  onImportScenes,
  onResetScenes,
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'overlay' | 'facebook' | 'scenes'>('video');
  const [localSettings, setLocalSettings] = useState<StreamSettings>(settings);
  const [prevSettings, setPrevSettings] = useState<StreamSettings>(settings);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setLocalSettings(settings);
  }

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        onImportScenes(content);
        onClose();
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h2 className="text-sm font-extrabold text-white tracking-wide uppercase">
              STUDIO & OBS BROADCAST SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            onClick={() => setActiveTab('video')}
            className={`py-3 px-3.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'video'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera size={14} /> Camera & Audio
          </button>

          <button
            onClick={() => setActiveTab('overlay')}
            className={`py-3 px-3.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'overlay'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon size={14} /> Scoreboard Sync
          </button>

          <button
            onClick={() => setActiveTab('facebook')}
            className={`py-3 px-3.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'facebook'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={14} /> Facebook Live
          </button>

          <button
            onClick={() => setActiveTab('scenes')}
            className={`py-3 px-3.5 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'scenes'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive size={14} /> Scene Collections
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-slate-300">
          {/* TAB 1: Camera & Audio */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                  Camera Source (iPad Wide-Angle / Rear Court Lens)
                </label>
                <select
                  value={selectedVideoDeviceId}
                  onChange={(e) => onSelectVideoDevice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-medium focus:outline-none focus:border-sky-500"
                >
                  <option value="">Default Environment (Rear Court Camera)</option>
                  {videoDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Camera ${dev.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                  Microphone Source
                </label>
                <select
                  value={selectedAudioDeviceId}
                  onChange={(e) => onSelectAudioDevice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-medium focus:outline-none focus:border-sky-500"
                >
                  <option value="">Default Microphone</option>
                  {audioDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Microphone ${dev.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                  Broadcast & Recording Profile
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['1080p60', '1080p30', '720p60', '720p30'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLocalSettings({ ...localSettings, targetResolution: mode })}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-bold text-left transition ${
                        localSettings.targetResolution === mode
                          ? 'bg-sky-500/20 border-sky-400 text-white ring-1 ring-sky-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div>{mode}</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        {mode.startsWith('1080') ? 'Full HD Broadcast' : 'Low-Bandwidth Fallback'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Scoreboard Sync (Hoop Culture Realtime Integration) */}
          {activeTab === 'overlay' && (
            <div className="space-y-4">
              {/* Email / Session Pairing */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                    Scoreboard Pairing Account (Google Email / Session)
                  </label>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-500/30">
                    Auto-Paired
                  </span>
                </div>
                <input
                  type="text"
                  value={localSettings.scoreboardSessionUser || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, scoreboardSessionUser: e.target.value })}
                  placeholder="e.g. isidro.pascua@gmail.com or court-1"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-xs font-mono focus:outline-none focus:border-orange-500"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Both tablets sync automatically when logged into the same Google account. Tablet 1 writes live game clocks & scores, and this broadcast studio streams them into your 60 FPS video canvas.
                </p>
              </div>

              {/* Sync Channel Selector */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  Connection Pipeline
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, scoreboardSyncMode: 'auto' })}
                    className={`p-2.5 rounded-xl border text-left font-bold transition ${
                      (!localSettings.scoreboardSyncMode || localSettings.scoreboardSyncMode === 'auto')
                        ? 'border-orange-500 bg-orange-950/40 text-orange-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>Auto-Detect (Recommended)</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">Firebase RTDB + Local 0ms BroadcastChannel</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocalSettings({ ...localSettings, scoreboardSyncMode: 'local_sse' })}
                    className={`p-2.5 rounded-xl border text-left font-bold transition ${
                      localSettings.scoreboardSyncMode === 'local_sse'
                        ? 'border-orange-500 bg-orange-950/40 text-orange-300'
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>Local Gym Server (:3000)</div>
                    <div className="text-[10px] font-normal text-slate-400 mt-0.5">Offline gym hotspot (Node.js SSE stream)</div>
                  </button>
                </div>
              </div>

              {/* The 4 Official Overlay URLs */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  The 4 Official Hoop Culture Overlays
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const u = `https://scoreboard.hoopculture.ca/nbc?user=${encodeURIComponent(localSettings.scoreboardSessionUser || 'default')}`;
                      setLocalSettings({ ...localSettings, overlayUrl: u });
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-left"
                  >
                    <div className="font-bold text-orange-400">1. NBC Pro Scorebug</div>
                    <div className="text-[10px] font-mono text-slate-400">/nbc</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const u = `https://scoreboard.hoopculture.ca/fullscreen?user=${encodeURIComponent(localSettings.scoreboardSessionUser || 'default')}`;
                      setLocalSettings({ ...localSettings, overlayUrl: u });
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-left"
                  >
                    <div className="font-bold text-amber-400">2. Full-Width Lower Third</div>
                    <div className="text-[10px] font-mono text-slate-400">/fullscreen</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const u = `https://scoreboard.hoopculture.ca/nbaoverlay?user=${encodeURIComponent(localSettings.scoreboardSessionUser || 'default')}`;
                      setLocalSettings({ ...localSettings, overlayUrl: u });
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-left"
                  >
                    <div className="font-bold text-sky-400">3. Classic NBA Bug</div>
                    <div className="text-[10px] font-mono text-slate-400">/nbaoverlay</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const u = `https://scoreboard.hoopculture.ca/nbaoverlay2?user=${encodeURIComponent(localSettings.scoreboardSessionUser || 'default')}`;
                      setLocalSettings({ ...localSettings, overlayUrl: u });
                    }}
                    className="p-2 bg-slate-900 hover:bg-slate-850 rounded-xl border border-slate-800 text-left"
                  >
                    <div className="font-bold text-purple-400">4. Compact Neon Bug</div>
                    <div className="text-[10px] font-mono text-slate-400">/nbaoverlay2</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Facebook Live */}
          {activeTab === 'facebook' && (
            <div className="space-y-4">
              {/* Connection Mode Toggle */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      fbSettings: {
                        ...(localSettings.fbSettings || {
                          userToken: '',
                          selectedPageId: 'page-hooptimes',
                          selectedPageName: 'Hoop Times Live',
                          selectedPageToken: '',
                          broadcastTitle: 'Live Basketball Game - Hoop Times',
                          broadcastDescription: 'Streaming live from gym court',
                        }),
                        mode: 'auto',
                      },
                    })
                  }
                  className={`flex-1 py-2 text-center rounded-lg font-bold text-xs transition ${
                    (localSettings.fbSettings?.mode ?? 'auto') === 'auto'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ⚡ Streamlabs Auto-Connect (Pages API)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      fbSettings: {
                        ...(localSettings.fbSettings || {
                          userToken: '',
                          selectedPageId: '',
                          selectedPageName: '',
                          selectedPageToken: '',
                          broadcastTitle: '',
                          broadcastDescription: '',
                        }),
                        mode: 'manual',
                      },
                    })
                  }
                  className={`flex-1 py-2 text-center rounded-lg font-bold text-xs transition ${
                    localSettings.fbSettings?.mode === 'manual'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Manual Stream Key
                </button>
              </div>

              {/* STREAMLABS AUTO-CONNECT VIEW */}
              {(localSettings.fbSettings?.mode ?? 'auto') === 'auto' ? (
                <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div>
                      <div className="font-extrabold text-white text-xs">Facebook Page Destination</div>
                      <div className="text-[10px] text-slate-400">Stream directly to your basketball league Facebook Page</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-[10px] font-bold">
                      Connected
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Select Facebook Page
                    </label>
                    <select
                      value={localSettings.fbSettings?.selectedPageId || 'page-hooptimes'}
                      onChange={(e) => {
                        const pageId = e.target.value;
                        const pageName = e.target.options[e.target.selectedIndex].text;
                        setLocalSettings({
                          ...localSettings,
                          fbSettings: {
                            ...(localSettings.fbSettings || {
                              mode: 'auto',
                              userToken: '',
                              selectedPageToken: '',
                              broadcastTitle: '',
                              broadcastDescription: '',
                            }),
                            mode: 'auto',
                            selectedPageId: pageId,
                            selectedPageName: pageName,
                          },
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs font-semibold focus:outline-none focus:border-sky-500"
                    >
                      <option value="page-hooptimes">🏀 Hoop Times Live Broadcasts (Primary Page)</option>
                      <option value="page-youth-league">🏆 Hoop Times Youth Basketball Academy</option>
                      <option value="page-court1">📍 Gym Court 1 - Main Showcase</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Broadcast Title (Appears on Facebook Feed)
                    </label>
                    <input
                      type="text"
                      value={localSettings.fbSettings?.broadcastTitle || 'Hoop Times Live: Finals Showcase'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          fbSettings: {
                            ...(localSettings.fbSettings || {
                              mode: 'auto',
                              userToken: '',
                              selectedPageId: 'page-hooptimes',
                              selectedPageName: 'Hoop Times Live',
                              selectedPageToken: '',
                              broadcastDescription: '',
                            }),
                            mode: 'auto',
                            broadcastTitle: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase">
                      Broadcast Description
                    </label>
                    <textarea
                      rows={2}
                      value={localSettings.fbSettings?.broadcastDescription || 'Live basketball coverage streaming directly from our tablet broadcast studio.'}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          fbSettings: {
                            ...(localSettings.fbSettings || {
                              mode: 'auto',
                              userToken: '',
                              selectedPageId: 'page-hooptimes',
                              selectedPageName: 'Hoop Times Live',
                              selectedPageToken: '',
                              broadcastTitle: '',
                            }),
                            mode: 'auto',
                            broadcastDescription: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-none focus:border-sky-500 resize-none"
                    />
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-sky-400 font-medium">
                      ✓ When you tap &quot;Go Live&quot;, EZ Studio automatically creates the Meta live event and grabs the ingest URL.
                    </span>
                  </div>
                </div>
              ) : (
                /* MANUAL STREAM KEY VIEW */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                      Facebook RTMPS Ingest URL
                    </label>
                    <input
                      type="text"
                      value={localSettings.rtmpsUrl}
                      onChange={(e) => setLocalSettings({ ...localSettings, rtmpsUrl: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                      Facebook Stream Key
                    </label>
                    <div className="relative">
                      <input
                        type={showStreamKey ? 'text' : 'password'}
                        value={localSettings.streamKey}
                        onChange={(e) => setLocalSettings({ ...localSettings, streamKey: e.target.value })}
                        placeholder="FB-12345678-xxxx-xxxx"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500 pr-16"
                      />
                      <button
                        type="button"
                        onClick={() => setShowStreamKey(!showStreamKey)}
                        className="absolute right-2.5 top-2.5 text-[11px] font-bold text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
                      >
                        {showStreamKey ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                  WebRTC WHIP Relay Gateway Endpoint
                </label>
                <input
                  type="text"
                  value={localSettings.whipUrl}
                  onChange={(e) => setLocalSettings({ ...localSettings, whipUrl: e.target.value })}
                  placeholder="https://relay.yourdomain.com/whip or local relay"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Scene Collections */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="font-bold text-slate-200 text-xs uppercase tracking-wider">
                OBS Scene Collection Management
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onExportScenes}
                  className="p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-200 transition"
                >
                  <Download size={22} className="text-sky-400" />
                  <span className="font-bold">Export Scene Collection</span>
                  <span className="text-[10px] text-slate-500">Download scenes and layouts as JSON</span>
                </button>

                <label className="p-4 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-200 transition cursor-pointer">
                  <Upload size={22} className="text-emerald-400" />
                  <span className="font-bold">Import Scene Collection</span>
                  <span className="text-[10px] text-slate-500">Load previously saved scene JSON</span>
                  <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
                </label>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Reset all scenes and sources to default basketball setup?')) {
                      onResetScenes();
                      onClose();
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl font-bold text-rose-300 flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw size={14} />
                  <span>Reset to Default Basketball Layout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500">Config persists locally in browser storage</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white rounded-xl transition shadow"
            >
              {saveSuccess ? <Check size={14} /> : null}
              <span>{saveSuccess ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
