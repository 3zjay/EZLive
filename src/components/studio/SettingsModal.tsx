'use client';

import React, { useState } from 'react';
import { X, Camera, Mic, Link as LinkIcon, Radio, ShieldAlert, Check, HelpCircle } from 'lucide-react';
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
}) => {
  const [activeTab, setActiveTab] = useState<'video' | 'overlay' | 'facebook'>('video');
  const [localSettings, setLocalSettings] = useState<StreamSettings>(settings);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(localSettings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <h2 className="text-base font-extrabold text-white tracking-wide">
              STUDIO & BROADCAST SETTINGS
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
            className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'video'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera size={14} /> Camera & Audio
          </button>

          <button
            onClick={() => setActiveTab('overlay')}
            className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'overlay'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon size={14} /> Scoreboard Overlay
          </button>

          <button
            onClick={() => setActiveTab('facebook')}
            className={`py-3 px-4 font-bold text-xs uppercase tracking-wider border-b-2 flex items-center gap-2 transition ${
              activeTab === 'facebook'
                ? 'border-sky-500 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio size={14} /> Facebook Live (RTMPS)
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm text-slate-300">
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
                  <option value="">Default Environment (Rear Camera)</option>
                  {videoDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Camera ${dev.deviceId.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mount iPad on tripod facing center court. Safari automatically requests 1080p landscape framing.
                </p>
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

          {/* TAB 2: Scoreboard Overlay */}
          {activeTab === 'overlay' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
                  Existing Vercel Scoreboard Overlay URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={localSettings.overlayUrl}
                    onChange={(e) => setLocalSettings({ ...localSettings, overlayUrl: e.target.value })}
                    placeholder="https://your-scoreboard.vercel.app/overlay"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-500"
                  />
                  <button
                    onClick={() => setLocalSettings({ ...localSettings, overlayUrl: '/scoreboard' })}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-700 text-slate-200"
                  >
                    Use Built-in Demo
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Loads your existing scoreboard. The second tablet updates this URL during the game.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-200">
                      Enable PostMessage / Real-time Data Bridge
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Syncs scores into the Canvas compositor so they appear in the encoded MP4 video.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.usePostMessageBridge}
                    onChange={(e) => setLocalSettings({ ...localSettings, usePostMessageBridge: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="text-xs text-sky-300/90 bg-sky-950/40 p-3 rounded-lg border border-sky-800/40 flex items-start gap-2">
                  <HelpCircle size={16} className="shrink-0 mt-0.5 text-sky-400" />
                  <span>
                    When your scoreboard changes (via the 2nd tablet), it emits updates via PostMessage or Firebase, which the video compositor bakes into every recorded frame at 60 FPS.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Facebook Live */}
          {activeTab === 'facebook' && (
            <div className="space-y-4">
              <div className="bg-amber-950/30 border border-amber-800/50 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
                <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <div className="font-bold mb-0.5">Facebook Live RTMPS Ingestion Notice</div>
                  <div>
                    Mobile browsers cannot open direct TCP RTMPS sockets due to sandbox security. The stream is sent via WebRTC (WHIP) to a lightweight cloud relay which forwards RTMPS to Facebook.
                  </div>
                </div>
              </div>

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
                <p className="text-[11px] text-slate-500 mt-1">
                  Obtain from Facebook Live Producer (Page / Group live dashboard). Stream keys should never be shared publicly.
                </p>
              </div>

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
