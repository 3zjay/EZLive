'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Check,
  Eye,
  EyeOff,
  Wifi,
  Gauge,
  ExternalLink,
  AlertCircle,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ScoreboardState, StreamBandwidthPreset, StreamSettings } from '@/types/broadcast';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StreamSettings;
  scoreboard: ScoreboardState;
  onConfirmGoLive: (config: {
    title: string;
    description: string;
    facebookEnabled: boolean;
    facebookKey: string;
    youtubeEnabled: boolean;
    youtubeKey: string;
    bandwidthPreset: StreamBandwidthPreset;
    bitrateKbps: number;
  }) => void;
}

const QUALITY_PRESETS: {
  id: StreamBandwidthPreset;
  name: string;
  badge: string;
  resolution: string;
  bitrateKbps: number;
  description: string;
  dataUsage: string;
}[] = [
  {
    id: 'eco_720',
    name: 'Eco / Gym Wi-Fi',
    badge: '1.5 Mbps',
    resolution: '720p @ 30fps',
    bitrateKbps: 1500,
    description: 'Lowest data usage & battery drain. Best for weak gym Wi-Fi or basement cellular.',
    dataUsage: '~0.7 GB / hour',
  },
  {
    id: 'balanced_720',
    name: 'Balanced HD',
    badge: '2.5 Mbps',
    resolution: '720p @ 30fps',
    bitrateKbps: 2500,
    description: 'Recommended for mobile phones/tablets & Render Free tier. Crisp, smooth, zero buffering.',
    dataUsage: '~1.1 GB / hour',
  },
  {
    id: 'high_1080',
    name: 'High Definition',
    badge: '4.0 Mbps',
    resolution: '1080p @ 30fps',
    bitrateKbps: 4000,
    description: 'Sharp 1080p for stable 5G cellular or gym fiber connections.',
    dataUsage: '~1.8 GB / hour',
  },
  {
    id: 'pro_1080_60',
    name: 'Pro Broadcast',
    badge: '6.0 Mbps',
    resolution: '1080p @ 60fps',
    bitrateKbps: 6000,
    description: 'Full 60fps broadcast motion. High upload bandwidth required.',
    dataUsage: '~2.7 GB / hour',
  },
];

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  isOpen,
  onClose,
  settings,
  scoreboard,
  onConfirmGoLive,
}) => {
  // Stream Details
  const defaultTitle =
    settings.broadcastTitle ||
    (typeof window !== 'undefined' ? localStorage.getItem('ezlive_stream_title') || '' : '') ||
    `🏀 ${scoreboard.homeTeam || 'HOME'} vs ${scoreboard.awayTeam || 'AWAY'} — Hoop Culture Live`;

  const defaultDesc =
    settings.broadcastDescription ||
    (typeof window !== 'undefined' ? localStorage.getItem('ezlive_stream_desc') || '' : '') ||
    'Live courtside basketball broadcast powered by Hoop Culture & EZLive. Real-time scores and stats.';

  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDesc);

  // Platform Destinations
  const initialFbKey =
    settings.fbSettings?.groupStreamKey ||
    settings.streamKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('hc_fb_stream_key') || '' : '');

  const initialYtKey =
    settings.ytSettings?.streamKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('hc_yt_stream_key') || '' : '');

  const [fbEnabled, setFbEnabled] = useState(true);
  const [fbKey, setFbKey] = useState(initialFbKey);
  const [showFbKey, setShowFbKey] = useState(false);

  const [ytEnabled, setYtEnabled] = useState(Boolean(initialYtKey));
  const [ytKey, setYtKey] = useState(initialYtKey);
  const [showYtKey, setShowYtKey] = useState(false);

  // Bandwidth & Quality
  const [qualityPreset, setQualityPreset] = useState<StreamBandwidthPreset>(
    settings.bandwidthPreset || 'balanced_720'
  );

  // Cloud Relay Health Telemetry (render awake check)
  const [relayStatus, setRelayStatus] = useState<'checking' | 'ready' | 'waking'>('checking');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const relayUrl =
      settings.relayUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('hc_relay_url') || '' : '') ||
      'https://ezlive-relay.onrender.com';

    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(`${relayUrl}/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok && isMounted) {
          setRelayStatus('ready');
          return;
        }
      } catch {
        if (isMounted) {
          setRelayStatus('waking');
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isOpen, settings.relayUrl]);

  if (!isOpen) return null;

  const selectedPresetObj = QUALITY_PRESETS.find((p) => p.id === qualityPreset) || QUALITY_PRESETS[1];

  const hasAtLeastOneDestination = (fbEnabled && fbKey.trim().length > 0) || (ytEnabled && ytKey.trim().length > 0);
  const isDualStream = fbEnabled && fbKey.trim().length > 0 && ytEnabled && ytKey.trim().length > 0;

  const handleFillGameInfo = () => {
    const autoTitle = `🏀 ${scoreboard.homeTeam || 'HOME'} vs ${scoreboard.awayTeam || 'AWAY'} | Hoop Culture Live`;
    setTitle(autoTitle);
  };

  const handleConfirm = () => {
    if (!hasAtLeastOneDestination) return;

    // Save remembered keys and details in localStorage for seamless next-game launch
    if (typeof window !== 'undefined') {
      if (fbKey.trim()) localStorage.setItem('hc_fb_stream_key', fbKey.trim());
      if (ytKey.trim()) localStorage.setItem('hc_yt_stream_key', ytKey.trim());
      localStorage.setItem('ezlive_stream_title', title);
      localStorage.setItem('ezlive_stream_desc', description);
    }

    onConfirmGoLive({
      title,
      description,
      facebookEnabled: fbEnabled && fbKey.trim().length > 0,
      facebookKey: fbKey.trim(),
      youtubeEnabled: ytEnabled && ytKey.trim().length > 0,
      youtubeKey: ytKey.trim(),
      bandwidthPreset: qualityPreset,
      bitrateKbps: selectedPresetObj.bitrateKbps,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 select-none">
      <div className="bg-[#0f141f] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#090d16] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#ff6b1a] to-[#e8430a] text-white flex items-center justify-center shadow-lg shadow-[#e8430a]/20">
              <Radio size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white tracking-wide uppercase">
                  GO LIVE BROADCAST SETUP
                </h2>
                {isDualStream ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-blue-600 to-red-600 text-white flex items-center gap-1 shadow">
                    <Layers size={10} /> DUAL STREAM ACTIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                    Streamlabs Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Choose destinations, set broadcast title, and optimize streaming bandwidth.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Section 1: Stream Details (Title & Description) */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" /> Broadcast Title & Info
              </label>
              <button
                type="button"
                onClick={handleFillGameInfo}
                className="text-[10px] text-amber-400 hover:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md transition"
              >
                Auto-fill from Scoreboard
              </button>
            </div>
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 🏀 DMC House League: Lions vs Cobras"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-white placeholder-slate-500 font-medium text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Stream description or game notes..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Dual Stream Destinations (Facebook & YouTube) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Layers size={13} className="text-sky-400" /> Stream Destinations (Multistreaming)
              </label>
              <span className="text-[10px] text-slate-400">
                Stream to 1 or both simultaneously
              </span>
            </div>

            {/* Destination 1: Facebook Live Card */}
            <div
              className={`border rounded-xl p-3.5 transition ${
                fbEnabled
                  ? 'bg-blue-950/20 border-blue-600/50 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#1877f2] flex items-center justify-center text-white font-black text-xs shadow">
                    f
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs">Facebook Live</span>
                    <span className="text-[10px] text-slate-400 ml-2">Page, Group, or Profile</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fbEnabled}
                    onChange={(e) => setFbEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {fbEnabled && (
                <div className="mt-2 space-y-1">
                  <div className="relative">
                    <input
                      type={showFbKey ? 'text' : 'password'}
                      value={fbKey}
                      onChange={(e) => setFbKey(e.target.value)}
                      placeholder="Paste Facebook Live Stream Key..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 pr-9 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFbKey(!showFbKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      {showFbKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>From Facebook Live Producer &gt; Stream Key</span>
                    {fbKey.trim() ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={11} /> Ready
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">Key required</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Destination 2: YouTube Live Card */}
            <div
              className={`border rounded-xl p-3.5 transition ${
                ytEnabled
                  ? 'bg-red-950/20 border-red-600/50 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#ff0000] flex items-center justify-center text-white font-black text-xs shadow">
                    ▶
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs">YouTube Live</span>
                    <span className="text-[10px] text-slate-400 ml-2">Channel Broadcast</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ytEnabled}
                    onChange={(e) => setYtEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {ytEnabled && (
                <div className="mt-2 space-y-1">
                  <div className="relative">
                    <input
                      type={showYtKey ? 'text' : 'password'}
                      value={ytKey}
                      onChange={(e) => setYtKey(e.target.value)}
                      placeholder="Paste YouTube Live Stream Key (e.g. xxxx-xxxx-xxxx-xxxx)..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 pr-9 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowYtKey(!showYtKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      {showYtKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>From YouTube Studio &gt; Create &gt; Go Live &gt; Stream Key</span>
                    {ytKey.trim() ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={11} /> Ready
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">Key required</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Bandwidth & Quality Controls */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Gauge size={13} className="text-emerald-400" /> Bandwidth &amp; Stream Quality
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedPresetObj.dataUsage}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {QUALITY_PRESETS.map((preset) => {
                const isSelected = qualityPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setQualityPreset(preset.id)}
                    className={`text-left p-2.5 rounded-xl border transition ${
                      isSelected
                        ? 'bg-emerald-950/20 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/40'
                        : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {preset.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          isSelected ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {preset.badge}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">{preset.resolution}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {preset.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cloud Relay & Free Tier Reality Check Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
            <div className="mt-0.5">
              {relayStatus === 'ready' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              ) : relayStatus === 'waking' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 text-[11px]">
                  Render Cloud Relay:{' '}
                  {relayStatus === 'ready' ? (
                    <span className="text-emerald-400">Online &amp; Active</span>
                  ) : relayStatus === 'waking' ? (
                    <span className="text-amber-400">Waking from Sleep (Ready soon)</span>
                  ) : (
                    <span className="text-slate-400">Checking...</span>
                  )}
                </span>
                <a
                  href={`${settings.relayUrl || 'https://ezlive-relay.onrender.com'}/logs`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-0.5"
                >
                  Relay Diagnostics <ExternalLink size={9} />
                </a>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                💡 <strong>Zero phone battery/bandwidth doubling</strong>: Your phone only uploads 1 video stream. The cloud relay duplicates it to both Facebook and YouTube in the cloud.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Button */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-[#090d16] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasAtLeastOneDestination}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-wide transition shadow-lg active:scale-95 ${
              hasAtLeastOneDestination
                ? isDualStream
                  ? 'bg-gradient-to-r from-blue-600 via-orange-500 to-red-600 hover:opacity-95 text-white shadow-orange-950/40'
                  : 'bg-gradient-to-r from-[#ff6b1a] to-[#e8430a] hover:from-[#ff8533] hover:to-[#ff5714] text-white shadow-[#e8430a]/40'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Radio size={14} />
            <span>
              {!hasAtLeastOneDestination
                ? 'Select a Destination & Enter Key'
                : isDualStream
                  ? `🚀 GO LIVE TO BOTH (DUAL STREAM @ ${selectedPresetObj.badge})`
                  : fbEnabled && fbKey.trim()
                    ? `🚀 GO LIVE TO FACEBOOK (@ ${selectedPresetObj.badge})`
                    : `🚀 GO LIVE TO YOUTUBE (@ ${selectedPresetObj.badge})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
