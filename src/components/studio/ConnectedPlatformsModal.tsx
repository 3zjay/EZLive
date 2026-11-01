'use client';

import React, { useState } from 'react';
import {
  X,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Cloud,
  Radio,
  Share2,
  Tv,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { StreamSettings } from '@/types/broadcast';
import { APP_FULL_VERSION } from '@/constants/version';

interface ConnectedPlatformsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StreamSettings;
  onSaveSettings: (settings: StreamSettings) => void;
}

export const ConnectedPlatformsModal: React.FC<ConnectedPlatformsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const { user, profile, refreshProfile, saveSessionState, signInFacebook } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [showYtKey, setShowYtKey] = useState(false);
  const [showCustomKey, setShowCustomKey] = useState(false);

  // Facebook Local States
  const cloudFb = profile?.connectedAccounts?.facebook || settings.fbSettings;
  const isFbConnected = Boolean(cloudFb?.connected || cloudFb?.userToken || cloudFb?.selectedPageId);
  const fbPageName = cloudFb?.selectedPageName || (isFbConnected ? 'HOOP Culture' : '');
  const fbUserName = cloudFb?.userName || user?.displayName || '';

  // YouTube Local States
  const cloudYt = profile?.connectedAccounts?.youtube || settings.ytSettings;
  const initialYtKey =
    cloudYt?.streamKey || (typeof window !== 'undefined' ? localStorage.getItem('hc_yt_stream_key') || '' : '');
  const [ytKeyInput, setYtKeyInput] = useState(initialYtKey);
  const isYtConnected = Boolean(ytKeyInput.trim() || cloudYt?.streamKey);

  // Custom RTMP Local States
  const cloudCustom = profile?.connectedAccounts?.customRtmp || settings.customRtmpSettings;
  const [customEnabled, setCustomEnabled] = useState(Boolean(cloudCustom?.enabled));
  const [customUrl, setCustomUrl] = useState(cloudCustom?.serverUrl || '');
  const [customKey, setCustomKey] = useState(cloudCustom?.streamKey || '');

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMsg('Synchronizing streaming platforms with Hoop Culture Cloud...');
    try {
      await refreshProfile();
      setStatusMsg('✓ Cloud Profile successfully synchronized across all devices!');
    } catch {
      setStatusMsg('Unable to refresh from cloud. Using locally cached platform credentials.');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setStatusMsg('');
      }, 3000);
    }
  };

  const handleSaveYouTubeKey = async (key: string) => {
    const cleanKey = key.trim();
    if (!cleanKey) {
      setStatusMsg('Please enter or paste your YouTube Stream Key.');
      return;
    }
    setYtKeyInput(cleanKey);
    try {
      localStorage.setItem('hc_yt_stream_key', cleanKey);
      localStorage.setItem('yt_channel_title', cloudYt?.channelTitle || 'YouTube Live');
    } catch {}

    const updatedYt = {
      connected: true,
      channelTitle: cloudYt?.channelTitle || user?.displayName || 'YouTube Live',
      streamKey: cleanKey,
      rtmpUrl: 'rtmp://a.rtmp.youtube.com/live2/',
      updatedAt: Date.now(),
    };

    await saveSessionState({
      connectedAccounts: {
        youtube: updatedYt,
      },
      settings: {
        ...settings,
        ytSettings: {
          ...settings.ytSettings,
          enabled: true,
          ...updatedYt,
        },
      },
    });

    onSaveSettings({
      ...settings,
      ytSettings: {
        ...settings.ytSettings,
        enabled: true,
        ...updatedYt,
      },
    });

    setStatusMsg('✓ YouTube Live Stream Key saved & synced to your Cloud Profile!');
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handlePasteClipboard = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          await handleSaveYouTubeKey(text.trim());
        } else {
          setStatusMsg('Clipboard is empty. Copy your Stream Key from YouTube Studio first.');
        }
      } catch {
        setStatusMsg('Clipboard permission not granted. Paste manually into the input box.');
      }
    }
  };

  const handleSaveCustomRtmp = async () => {
    const updatedCustom = {
      enabled: customEnabled,
      serverUrl: customUrl.trim(),
      streamKey: customKey.trim(),
    };

    await saveSessionState({
      connectedAccounts: {
        customRtmp: updatedCustom,
      },
      settings: {
        ...settings,
        customRtmpSettings: updatedCustom,
      },
    });

    onSaveSettings({
      ...settings,
      customRtmpSettings: updatedCustom,
    });

    setStatusMsg('✓ Custom RTMP destination saved to Cloud Profile!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0e0a08] border border-[#3a2818] rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-[#140f0c] border-b border-[#2a1e14] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ff6b1a] to-[#e8430a] flex items-center justify-center text-white shadow-md">
              <Share2 size={16} />
            </div>
            <div>
              <div className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>Connected Streaming Platforms</span>
                <span className="hidden sm:inline px-1.5 py-0.5 rounded bg-[#e8430a]/20 text-[#ff6b1a] border border-[#e8430a]/30 text-[9px] font-mono uppercase">
                  Streamlabs Cloud Sync
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Hold &amp; synchronize Facebook, YouTube &amp; RTMP across all your devices
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#1c140f] hover:bg-[#2a1e14] text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Cloud Account Sync Banner */}
          <div className="bg-[#140f0c] border border-[#2a1e14] rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Operator'}
                  className="w-9 h-9 rounded-full border border-[#ff6b1a]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#e8430a] text-white flex items-center justify-center font-bold text-sm">
                  {(user?.displayName || user?.email || 'O')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-black text-white text-sm flex items-center gap-1.5">
                  <span>{user?.displayName || 'Hoop Culture Operator'}</span>
                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Cloud Synced
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] font-mono truncate max-w-xs">
                  {user?.email || 'Logged in via Hoop Culture Ecosystem'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-[#1d1612] hover:bg-[#2a1f19] border border-[#3a2818] text-[#ff6b1a] font-bold text-xs flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Syncing...' : 'Sync from Cloud'}</span>
            </button>
          </div>

          {statusMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center gap-2 animate-fade-in">
              <Check size={14} className="text-emerald-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Destination 1: Facebook Live */}
          <div className="bg-[#120e0b] border border-[#261a12] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center text-white font-black text-sm shadow">
                  f
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Facebook Live</div>
                  <div className="text-[10px] text-slate-400">Broadcast directly to Facebook Pages &amp; Groups</div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 border ${
                  isFbConnected
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {isFbConnected ? (
                  <>
                    <Check size={11} className="text-blue-400" />
                    <span>Connected ({fbPageName || 'Page'})</span>
                  </>
                ) : (
                  <span>Not Connected</span>
                )}
              </span>
            </div>

            {isFbConnected ? (
              <div className="bg-[#0a0706] border border-[#22170f] rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Target Broadcast Page:</span>
                  <span className="font-black text-white bg-blue-900/40 px-2 py-0.5 rounded border border-blue-700/50">
                    {fbPageName || 'HOOP Culture'}
                  </span>
                </div>
                {fbUserName && (
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Authenticated Facebook Account:</span>
                    <span className="text-slate-300 font-medium">{fbUserName}</span>
                  </div>
                )}
                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => signInFacebook()}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition"
                  >
                    Switch Page / Re-authenticate Facebook
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0706] border border-[#22170f] rounded-lg p-3 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Connect your Facebook account to stream to your league pages.
                </span>
                <button
                  type="button"
                  onClick={() => signInFacebook()}
                  className="px-3 py-1.5 rounded-lg bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
                >
                  <span>Connect Facebook</span>
                </button>
              </div>
            )}
          </div>

          {/* Destination 2: YouTube Live */}
          <div className="bg-[#120e0b] border border-[#261a12] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#ff0000] flex items-center justify-center text-white font-black text-sm shadow">
                  ▶
                </div>
                <div>
                  <div className="font-bold text-white text-sm">YouTube Live</div>
                  <div className="text-[10px] text-slate-400">
                    High-bitrate 1080p 60 FPS live sports broadcasting
                  </div>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 border ${
                  isYtConnected
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {isYtConnected ? (
                  <>
                    <Check size={11} className="text-red-400" />
                    <span>Ready &amp; Synced</span>
                  </>
                ) : (
                  <span>Paste Key to Connect</span>
                )}
              </span>
            </div>

            <div className="bg-[#0a0706] border border-[#22170f] rounded-lg p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-300">
                  Persistent YouTube Live Stream Key (synced across all devices):
                </span>
                <a
                  href="https://studio.youtube.com/channel/UC/livestreaming"
                  target="_blank"
                  rel="noreferrer"
                  className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1 text-[10px] hover:underline"
                >
                  <ExternalLink size={11} />
                  <span>Open YouTube Studio</span>
                </a>
              </div>

              <div className="relative">
                <input
                  type={showYtKey ? 'text' : 'password'}
                  value={ytKeyInput}
                  onChange={(e) => setYtKeyInput(e.target.value)}
                  placeholder="Paste YouTube Stream Key (e.g. xxxx-xxxx-xxxx-xxxx-xxxx)..."
                  className="w-full bg-[#140e0b] border border-[#2a1e14] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500 pr-24"
                />
                <div className="absolute right-2 top-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold"
                  >
                    📋 Paste
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowYtKey(!showYtKey)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {showYtKey ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  Ingest URL: rtmp://a.rtmp.youtube.com/live2/
                </span>
                <button
                  type="button"
                  onClick={() => handleSaveYouTubeKey(ytKeyInput)}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1 shadow transition active:scale-95 cursor-pointer"
                >
                  <Check size={12} />
                  <span>Save Key to Cloud Profile</span>
                </button>
              </div>
            </div>
          </div>

          {/* Destination 3: Custom RTMP / Twitch / Kick */}
          <div className="bg-[#120e0b] border border-[#261a12] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#6441a5] flex items-center justify-center text-white font-black text-sm shadow">
                  <Tv size={16} />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">Custom RTMP / Twitch / Kick</div>
                  <div className="text-[10px] text-slate-400">Stream to any RTMP or RTMPS server endpoint</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={customEnabled}
                  onChange={(e) => setCustomEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#6441a5]"></div>
              </label>
            </div>

            {customEnabled && (
              <div className="bg-[#0a0706] border border-[#22170f] rounded-lg p-3 space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                    Server Ingest URL
                  </label>
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="rtmp://live.twitch.tv/app or rtmps://..."
                    className="w-full bg-[#140e0b] border border-[#2a1e14] rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#6441a5]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                    Stream Key
                  </label>
                  <div className="relative">
                    <input
                      type={showCustomKey ? 'text' : 'password'}
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="live_..."
                      className="w-full bg-[#140e0b] border border-[#2a1e14] rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#6441a5] pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomKey(!showCustomKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      {showCustomKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveCustomRtmp}
                    className="px-3 py-1 rounded-lg bg-[#6441a5] hover:bg-[#7d5bbe] text-white font-bold text-xs flex items-center gap-1 shadow transition"
                  >
                    <Check size={12} />
                    <span>Save RTMP to Cloud</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Streamlabs Cross-Device Explanatory Card */}
          <div className="bg-[#140f0c]/60 border border-[#2a1e14] rounded-xl p-3.5 space-y-1.5">
            <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
              <Cloud size={14} />
              <span>How Streamlabs Multi-Device Sync Works:</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When you link Facebook or save your YouTube key here, it is securely held in your{' '}
              <strong>Hoop Culture Cloud Profile</strong>. If you switch to another device (Samsung Fold 8 Ultra,
              courtside iPad, or laptop), simply sign into your account and all your streaming destinations will be
              instantly ready with zero manual re-entry.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 bg-[#140f0c] border-t border-[#2a1e14] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[10px] text-slate-500 font-mono">
            {APP_FULL_VERSION} • Hoop Culture Ecosystem
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#e8430a] hover:bg-[#ff6b1a] text-white font-black text-xs uppercase tracking-wider shadow transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
