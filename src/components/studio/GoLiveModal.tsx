'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Check,
  Eye,
  EyeOff,
  Layers,
  Sparkles,
  FileText,
  Users,
  Key,
  RefreshCw,
  ExternalLink,
  LogIn,
} from 'lucide-react';
import { ScoreboardState, StreamBandwidthPreset, StreamSettings } from '@/types/broadcast';
import { connectYouTubeWithGoogle, autoLinkFacebookToProfile } from '@/services/firebase';
import { useAuth } from '@/context/AuthContext';

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StreamSettings;
  scoreboard: ScoreboardState;
  onSaveSettings?: (settings: StreamSettings) => void;
  onConfirmGoLive: (config: {
    title: string;
    description: string;
    facebookEnabled: boolean;
    facebookDestinationType: 'page' | 'group' | 'stream_key';
    facebookPageId?: string;
    facebookPageName?: string;
    facebookPageToken?: string;
    facebookGroupId?: string;
    facebookGroupName?: string;
    facebookKey: string;
    youtubeEnabled: boolean;
    youtubeKey: string;
    customRtmpEnabled?: boolean;
    customRtmpUrl?: string;
    customRtmpKey?: string;
    bandwidthPreset: StreamBandwidthPreset;
    bitrateKbps: number;
    fps: number;
    width?: number;
    height?: number;
  }) => void;
}

const QUALITY_PRESETS: {
  id: StreamBandwidthPreset;
  name: string;
  badge: string;
  resolution: string;
  width: number;
  height: number;
  fps: number;
  bitrateKbps: number;
  description: string;
  dataUsage: string;
}[] = [
  {
    id: 'high_1080',
    name: '🏆 Pro Broadcast 1080p 60 FPS (Capped at 4.2 Mbps)',
    badge: '1080p @ 60 FPS',
    resolution: '1080p @ 60fps • 4.2 Mbps Cap',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrateKbps: 4200,
    description: 'Pristine Full HD 1080p at 60 FPS capped strictly at 4.2 Mbps. Eliminates bloated bandwidth while preserving razor-sharp hardwood lines and scoreboard clarity.',
    dataUsage: '~1.8 GB / hour',
  },
  {
    id: 'balanced_720',
    name: '⚡ High-Speed 720p 60 FPS (Capped at 3.0 Mbps)',
    badge: '720p @ 60 FPS',
    resolution: '720p @ 60fps • 3.0 Mbps Cap',
    width: 1280,
    height: 720,
    fps: 60,
    bitrateKbps: 3000,
    description: 'Fluid 60 FPS sports motion with a light 3.0 Mbps footprint. Ideal for venue Wi-Fi or LTE hotspots.',
    dataUsage: '~1.3 GB / hour',
  },
  {
    id: 'eco_720',
    name: '🌿 Eco 720p 30 FPS (Capped at 2.0 Mbps)',
    badge: '720p @ 30 FPS',
    resolution: '720p @ 30fps • 2.0 Mbps Cap',
    width: 1280,
    height: 720,
    fps: 30,
    bitrateKbps: 2000,
    description: 'Conservative bandwidth mode for crowded gyms or weak cellular connections.',
    dataUsage: '~0.9 GB / hour',
  },
];

export const GoLiveModal: React.FC<GoLiveModalProps> = ({
  isOpen,
  onClose,
  settings,
  scoreboard,
  onSaveSettings,
  onConfirmGoLive,
}) => {
  const { user, profile, saveSessionState } = useAuth();
  const [ytStatusMsg, setYtStatusMsg] = useState<string>('');
  const [cloudSavedFlash, setCloudSavedFlash] = useState<boolean>(false);

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

  // Facebook Settings & Destination Selection
  const fb = settings.fbSettings;
  const [fbEnabled, setFbEnabled] = useState(true);
  const [fbDestType, setFbDestType] = useState<'page' | 'group' | 'stream_key'>(
    fb?.destinationType === 'group' || fb?.destinationType === 'stream_key' ? fb.destinationType : 'page'
  );

  const cleanInitialKey = (key?: string) => {
    if (!key) return '';
    // If it contains query parameters (like ?s_bl= or &a=), it is an ephemeral single-use session key from a previous live broadcast, NOT a persistent reusable stream key.
    if (key.includes('?') || key.includes('s_vt=')) return '';
    return key;
  };

  const initialFbKey =
    cleanInitialKey(fb?.groupStreamKey) ||
    cleanInitialKey(profile?.connectedAccounts?.facebook?.groupStreamKey) ||
    cleanInitialKey(settings.streamKey) ||
    (typeof window !== 'undefined' ? cleanInitialKey(localStorage.getItem('hc_fb_stream_key') || '') : '');
  const [fbKey, setFbKey] = useState(initialFbKey);
  const [showFbKey, setShowFbKey] = useState(false);

  // Facebook Graph API OAuth Pages & Groups
  const [fbUserToken, setFbUserToken] = useState<string>(
    fb?.userToken ||
      profile?.connectedAccounts?.facebook?.userToken ||
      (typeof window !== 'undefined' ? localStorage.getItem('fb_user_access_token') || '' : '')
  );
  const [fbUserName, setFbUserName] = useState<string>(
    fb?.userName ||
      profile?.connectedAccounts?.facebook?.userName ||
      (typeof window !== 'undefined' ? localStorage.getItem('fb_user_name') || '' : '')
  );
  const [pages, setPages] = useState<{ id: string; name: string; access_token: string; category?: string }[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string>(
    fb?.selectedPageId || profile?.connectedAccounts?.facebook?.selectedPageId || ''
  );
  const [groups, setGroups] = useState<{ id: string; name: string; administrator?: boolean }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>(
    fb?.selectedGroupId || profile?.connectedAccounts?.facebook?.selectedGroupId || ''
  );
  const [isLoadingFb, setIsLoadingFb] = useState(false);

  // YouTube Settings
  const initialYtKey =
    settings.ytSettings?.streamKey ||
    profile?.connectedAccounts?.youtube?.streamKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('hc_yt_stream_key') || '' : '');
  const [ytEnabled, setYtEnabled] = useState(Boolean(initialYtKey));
  const [ytKey, setYtKey] = useState(initialYtKey);
  const [showYtKey, setShowYtKey] = useState(false);
  const [ytChannelName, setYtChannelName] = useState(
    settings.ytSettings?.channelTitle ||
      profile?.connectedAccounts?.youtube?.channelTitle ||
      (typeof window !== 'undefined' ? localStorage.getItem('yt_channel_title') || '' : '')
  );
  const [isConnectingYt, setIsConnectingYt] = useState(false);

  // Custom RTMP / RTMPS Settings (Twitch, Kick, Restream, Custom Server)
  const initialCustomUrl =
    settings.customRtmpSettings?.serverUrl ||
    profile?.connectedAccounts?.customRtmp?.serverUrl ||
    (typeof window !== 'undefined' ? localStorage.getItem('hc_custom_rtmp_url') || '' : '');
  const initialCustomKey =
    settings.customRtmpSettings?.streamKey ||
    profile?.connectedAccounts?.customRtmp?.streamKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('hc_custom_rtmp_key') || '' : '');
  const [customRtmpEnabled, setCustomRtmpEnabled] = useState(
    Boolean(settings.customRtmpSettings?.enabled || profile?.connectedAccounts?.customRtmp?.enabled)
  );
  const [customRtmpUrl, setCustomRtmpUrl] = useState(initialCustomUrl);
  const [customRtmpKey, setCustomRtmpKey] = useState(initialCustomKey);
  const [showCustomKey, setShowCustomKey] = useState(false);

  // Re-sync local state whenever Cloud Profile or Settings load/update
  useEffect(() => {
    const cloudFb = profile?.connectedAccounts?.facebook || settings.fbSettings;
    if (cloudFb) {
      if (cloudFb.userToken && !fbUserToken) setFbUserToken(cloudFb.userToken);
      if (cloudFb.userName && !fbUserName) setFbUserName(cloudFb.userName);
      if (cloudFb.selectedPageId && !selectedPageId) setSelectedPageId(cloudFb.selectedPageId);
      if (cloudFb.selectedGroupId && !selectedGroupId) setSelectedGroupId(cloudFb.selectedGroupId);
      if (cloudFb.groupStreamKey && !fbKey) setFbKey(cleanInitialKey(cloudFb.groupStreamKey));
    }
    const cloudYt = profile?.connectedAccounts?.youtube || settings.ytSettings;
    if (cloudYt) {
      if (cloudYt.streamKey && !ytKey) {
        setYtKey(cloudYt.streamKey);
        setYtEnabled(true);
      }
      if (cloudYt.channelTitle && !ytChannelName) {
        setYtChannelName(cloudYt.channelTitle);
      }
    }
    const cloudCustom = profile?.connectedAccounts?.customRtmp || settings.customRtmpSettings;
    if (cloudCustom) {
      if (cloudCustom.serverUrl && !customRtmpUrl) setCustomRtmpUrl(cloudCustom.serverUrl);
      if (cloudCustom.streamKey && !customRtmpKey) setCustomRtmpKey(cloudCustom.streamKey);
      if (cloudCustom.enabled) setCustomRtmpEnabled(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, settings]);

  const handleAutoProvisionYouTube = async () => {
    setIsConnectingYt(true);
    setYtStatusMsg('Connecting Google & YouTube Live...');
    try {
      const { user: ytUser, accessToken } = await connectYouTubeWithGoogle();
      if (accessToken) {
        // 1. Try connect_profile first to fetch existing reusable stream key or create one
        const res = await fetch('/api/youtube/live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'connect_profile',
            accessToken,
            title: title || 'Hoop Culture Live Championship',
            description: description || 'Live courtside broadcast from EZLiveStudio by HoopCulture',
          }),
        });
        const data = await res.json();
        const chName = data.channel?.title || ytUser?.displayName || 'YouTube Live';
        setYtChannelName(chName);

        if (data.streamKey) {
          setYtKey(data.streamKey);
          setYtEnabled(true);
          setYtStatusMsg(`✓ Linked ${chName} & synced persistent Stream Key to your Cloud Profile!`);
          try {
            localStorage.setItem('hc_yt_stream_key', data.streamKey);
            localStorage.setItem('yt_channel_title', chName);
          } catch {}
          await saveSessionState({
            connectedAccounts: {
              youtube: {
                connected: true,
                channelId: data.channel?.id || '',
                channelTitle: chName,
                channelAvatar: data.channel?.avatar || ytUser?.photoURL || '',
                streamKey: data.streamKey,
                rtmpUrl: data.rtmpUrl || 'rtmp://a.rtmp.youtube.com/live2/',
                accessToken,
                updatedAt: Date.now(),
              },
            },
          });
        } else if (data.warning || data.error) {
          setYtStatusMsg(
            `Linked ${chName}, but ${data.warning || data.error} — You can also paste your Stream Key from studio.youtube.com below.`
          );
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'YouTube OAuth connection failed';
      setYtStatusMsg(msg);
      console.warn('YouTube OAuth provision warning:', e);
    } finally {
      setIsConnectingYt(false);
    }
  };

  // Bandwidth & Quality (defaults to Full HD 1080p 60 FPS sports broadcast)
  const [qualityPreset, setQualityPreset] = useState<StreamBandwidthPreset>(
    settings.bandwidthPreset || 'high_1080'
  );
  const selectedPresetObj = QUALITY_PRESETS.find((p) => p.id === qualityPreset) || QUALITY_PRESETS[0];
  const [bitrateCapKbps, setBitrateCapKbps] = useState<number>(selectedPresetObj.bitrateKbps);

  const handleSelectPreset = (presetId: StreamBandwidthPreset) => {
    setQualityPreset(presetId);
    const found = QUALITY_PRESETS.find((p) => p.id === presetId);
    if (found) setBitrateCapKbps(found.bitrateKbps);
  };

  // Cloud Relay Health Telemetry (or Native Android On-Device RTMP check)
  const isNativeAndroidRtmp =
    typeof window !== 'undefined' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Boolean((window as any).EZLiveNativeRTMP) || navigator.userAgent.includes('EZLiveAndroidApp'));
  const [relayStatus, setRelayStatus] = useState<'checking' | 'ready' | 'waking'>(
    isNativeAndroidRtmp ? 'ready' : 'checking'
  );

  const fetchFacebookDestinations = async (token?: string) => {
    const activeToken =
      token || fbUserToken || (typeof window !== 'undefined' ? localStorage.getItem('fb_user_access_token') || '' : '');
    if (!activeToken) return;

    setIsLoadingFb(true);
    try {
      // 1. Fetch Facebook Pages
      const pRes = await fetch('/api/facebook/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_pages', userAccessToken: activeToken }),
      });
      const pData = await pRes.json();
      if (pData.pages && pData.pages.length > 0) {
        setPages(pData.pages);
        if (!selectedPageId || selectedPageId === 'page-hoopculture') {
          setSelectedPageId(pData.pages[0].id);
        }
      }

      // 2. Fetch Facebook Groups
      const gRes = await fetch('/api/facebook/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_groups', userAccessToken: activeToken }),
      });
      const gData = await gRes.json();
      if (gData.groups && gData.groups.length > 0) {
        setGroups(gData.groups);
        if (!selectedGroupId) {
          setSelectedGroupId(gData.groups[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch Facebook destinations:', e);
    } finally {
      setIsLoadingFb(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const relayUrl =
      settings.relayUrl ||
      (typeof window !== 'undefined' ? localStorage.getItem('hc_relay_url') || '' : '') ||
      'https://ezlive-relay.onrender.com';

    const checkHealth = async () => {
      if (isNativeAndroidRtmp) {
        if (isMounted) setRelayStatus('ready');
        return;
      }
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

    // Fetch Facebook Pages if token exists
    if (fbUserToken) {
      fetchFacebookDestinations(fbUserToken);
    }

    const handleAuthMsg = (event: MessageEvent) => {
      if (event.data?.type === 'FB_AUTH_SUCCESS') {
        const { token, user: fbAuthUser } = event.data;
        if (token) {
          setFbUserToken(token);
          if (fbAuthUser?.name) setFbUserName(fbAuthUser.name);
          try {
            localStorage.setItem('fb_user_access_token', token);
            if (fbAuthUser?.name) localStorage.setItem('fb_user_name', fbAuthUser.name);
            if (fbAuthUser?.picture) localStorage.setItem('fb_user_picture', fbAuthUser.picture);
          } catch {}
          fetchFacebookDestinations(token);
          if (user) {
            autoLinkFacebookToProfile(user.uid, user.email || '', token, fbAuthUser || {}).catch(() => {});
          }
        }
      }
    };
    window.addEventListener('message', handleAuthMsg);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('ezlive_auth_channel');
      bc.onmessage = handleAuthMsg;
    } catch {}

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('message', handleAuthMsg);
      if (bc) {
        try {
          bc.close();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, settings.relayUrl]);

  if (!isOpen) return null;

  const handleConnectFacebook = () => {
    const w = 650;
    const h = 700;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    const popup = window.open(
      '/api/auth/facebook/login?return_to=%2Fstudio',
      'FacebookLoginPopup',
      `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no`
    );
    if (!popup) {
      window.location.href = '/api/auth/facebook/login?return_to=%2Fstudio';
    }
  };


  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  const isFbReady =
    fbEnabled &&
    ((fbDestType === 'page' && (selectedPageId || fbKey.trim())) ||
      (fbDestType === 'group' && (selectedGroupId || fbKey.trim())) ||
      (fbDestType === 'stream_key' && fbKey.trim()));

  const isYtReady = ytEnabled && ytKey.trim().length > 0;
  const isCustomReady = customRtmpEnabled && customRtmpUrl.trim().length > 0 && customRtmpKey.trim().length > 0;
  const hasAtLeastOneDestination = isFbReady || isYtReady || isCustomReady;
  const activeDestCount = [isFbReady, isYtReady, isCustomReady].filter(Boolean).length;
  const isDualStream = activeDestCount >= 2;

  const handleFillGameInfo = () => {
    const autoTitle = `🏀 ${scoreboard.homeTeam || 'HOME'} vs ${scoreboard.awayTeam || 'AWAY'} | Hoop Culture Live`;
    setTitle(autoTitle);
  };

  const buildMergedSettings = () => {
    const cleanedKey = cleanInitialKey(fbKey.trim());
    const nextSettings: StreamSettings = {
      ...settings,
      streamKey: cleanedKey || settings.streamKey,
      broadcastTitle: title,
      broadcastDescription: description,
      bandwidthPreset: qualityPreset,
      fbSettings: {
        ...(settings.fbSettings || {
          mode: 'auto',
          userToken: '',
          selectedPageId: '',
          selectedPageName: '',
          selectedPageToken: '',
          broadcastTitle: '',
          broadcastDescription: '',
        }),
        userToken: fbUserToken || settings.fbSettings?.userToken || '',
        userName: fbUserName || settings.fbSettings?.userName || '',
        destinationType: fbDestType,
        selectedPageId: selectedPageId || settings.fbSettings?.selectedPageId || '',
        selectedPageName: selectedPage?.name || settings.fbSettings?.selectedPageName || '',
        selectedPageToken: selectedPage?.access_token || settings.fbSettings?.selectedPageToken || '',
        selectedGroupId: selectedGroupId || settings.fbSettings?.selectedGroupId,
        selectedGroupName: selectedGroup?.name || settings.fbSettings?.selectedGroupName,
        groupStreamKey: cleanedKey || settings.fbSettings?.groupStreamKey,
      },
      ytSettings: {
        ...(settings.ytSettings || { enabled: false, streamKey: '' }),
        enabled: ytEnabled && ytKey.trim().length > 0,
        streamKey: ytKey.trim(),
        channelTitle: ytChannelName || settings.ytSettings?.channelTitle || '',
      },
      customRtmpSettings: {
        enabled: isCustomReady,
        serverUrl: customRtmpUrl.trim(),
        streamKey: customRtmpKey.trim(),
      },
    };
    return nextSettings;
  };

  const handleSaveToCloudProfile = async () => {
    const nextSettings = buildMergedSettings();
    if (onSaveSettings) {
      onSaveSettings(nextSettings);
    }
    await saveSessionState({ settings: nextSettings });
    setCloudSavedFlash(true);
    setTimeout(() => setCloudSavedFlash(false), 2000);
  };

  const handleConfirm = () => {
    if (!hasAtLeastOneDestination) return;

    const cleanedKey = cleanInitialKey(fbKey.trim());

    if (typeof window !== 'undefined') {
      if (cleanedKey) {
        localStorage.setItem('hc_fb_stream_key', cleanedKey);
      } else {
        localStorage.removeItem('hc_fb_stream_key');
      }
      if (ytKey.trim()) localStorage.setItem('hc_yt_stream_key', ytKey.trim());
      if (customRtmpUrl.trim()) localStorage.setItem('hc_custom_rtmp_url', customRtmpUrl.trim());
      if (customRtmpKey.trim()) localStorage.setItem('hc_custom_rtmp_key', customRtmpKey.trim());
      localStorage.setItem('ezlive_stream_title', title);
      localStorage.setItem('ezlive_stream_desc', description);
    }

    const nextSettings = buildMergedSettings();
    if (onSaveSettings) {
      onSaveSettings(nextSettings);
    }
    saveSessionState({ settings: nextSettings }).catch(() => {});

    onConfirmGoLive({
      title,
      description,
      facebookEnabled: fbEnabled,
      facebookDestinationType: fbDestType,
      facebookPageId: selectedPageId,
      facebookPageName: selectedPage?.name || fb?.selectedPageName || '',
      facebookPageToken: selectedPage?.access_token || fb?.selectedPageToken || '',
      facebookGroupId: selectedGroupId,
      facebookGroupName: selectedGroup?.name || fb?.selectedGroupName || '',
      facebookKey: cleanedKey,
      youtubeEnabled: ytEnabled && ytKey.trim().length > 0,
      youtubeKey: ytKey.trim(),
      customRtmpEnabled: isCustomReady,
      customRtmpUrl: customRtmpUrl.trim(),
      customRtmpKey: customRtmpKey.trim(),
      bandwidthPreset: qualityPreset,
      bitrateKbps: bitrateCapKbps || selectedPresetObj.bitrateKbps,
      fps: selectedPresetObj.fps,
      width: selectedPresetObj.width,
      height: selectedPresetObj.height,
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
                Choose destinations (Facebook Page / Group &amp; YouTube), set broadcast title, and optimize streaming bandwidth.
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
          {/* Streamlabs Cloud Profile Sync Ribbon */}
          <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-sky-950/50 border border-emerald-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow shadow-emerald-400" />
              <div>
                <div className="font-bold text-white text-[11px] flex items-center gap-1.5">
                  <span>☁️ Streamlabs Cloud Profile Sync Active</span>
                  {user?.email && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
                      {user.email}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">
                  Your Facebook Pages/Groups, YouTube Stream Key &amp; RTMP settings automatically sync to any phone, tablet, or laptop you sign into.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveToCloudProfile}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow transition shrink-0"
            >
              <Check size={11} />
              <span>{cloudSavedFlash ? 'Synced to Cloud!' : 'Save to Cloud Profile'}</span>
            </button>
          </div>

          {/* Section 1: Stream Details (Title & Description) */}
          <div className="bg-slate-900/80 border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-400" /> Broadcast Title &amp; Info
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

          {/* Section 2: Destinations (Facebook Page / Group + YouTube) */}
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
              className={`border rounded-xl p-3.5 transition space-y-3 ${
                fbEnabled
                  ? 'bg-blue-950/20 border-blue-600/50 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800 opacity-70'
              }`}
            >
              {/* Card Header & Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#1877f2] flex items-center justify-center text-white font-black text-xs shadow">
                    f
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs">Facebook Live</span>
                    <span className="text-[10px] text-slate-400 ml-2">
                      {fbDestType === 'page'
                        ? selectedPage?.name ? `Page: ${selectedPage.name}` : 'Facebook Page'
                        : fbDestType === 'group'
                          ? selectedGroup?.name ? `Group: ${selectedGroup.name}` : 'Facebook Group'
                          : 'Stream Key'}
                    </span>
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
                <div className="space-y-2.5 pt-1">
                  {/* Destination Type Sub-Tabs (Facebook Page, Group, or Stream Key) */}
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFbDestType('page')}
                      className={`flex-1 py-1.5 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition ${
                        fbDestType === 'page'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText size={12} />
                      <span>Facebook Page</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFbDestType('group')}
                      className={`flex-1 py-1.5 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition ${
                        fbDestType === 'group'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users size={12} />
                      <span>Facebook Group</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFbDestType('stream_key')}
                      className={`flex-1 py-1.5 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 transition ${
                        fbDestType === 'stream_key'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Key size={12} />
                      <span>Stream Key</span>
                    </button>
                  </div>

                  {/* --- SUBVIEW 1: FACEBOOK PAGE --- */}
                  {fbDestType === 'page' && (
                    <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <FileText size={11} className="text-blue-400" /> Select Target Facebook Page
                        </label>
                        {fbUserToken ? (
                          <button
                            type="button"
                            onClick={() => fetchFacebookDestinations()}
                            disabled={isLoadingFb}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                          >
                            <RefreshCw size={10} className={isLoadingFb ? 'animate-spin' : ''} />
                            <span>{isLoadingFb ? 'Refreshing...' : 'Refresh Pages'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleConnectFacebook}
                            className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30"
                          >
                            <LogIn size={10} /> Connect Facebook
                          </button>
                        )}
                      </div>

                      {pages.length > 0 ? (
                        <select
                          value={selectedPageId}
                          onChange={(e) => setSelectedPageId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="" disabled>-- Select a Facebook Page --</option>
                          {pages.map((p) => (
                            <option key={p.id} value={p.id}>
                              📄 {p.name} {p.category ? `(${p.category})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-[11px] text-slate-400 space-y-2">
                          <p>
                            {fbUserToken
                              ? 'No managed Facebook Pages found on this account. You can paste your Page Stream Key below:'
                              : 'Connect your Facebook account to pick your Page automatically, or paste your Page Stream Key below:'}
                          </p>
                        </div>
                      )}

                      {/* Manual / Persistent Page Stream Key Override */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span>Page Stream Key (From Meta Business Suite / Live Producer):</span>
                          {selectedPageId && !fbKey.trim() && (
                            <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                              <Check size={10} /> Auto-Generate via API
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showFbKey ? 'text' : 'password'}
                            value={fbKey}
                            onChange={(e) => setFbKey(e.target.value)}
                            placeholder={selectedPageId ? 'Optional: Paste persistent Page Stream Key...' : 'Paste Facebook Page Stream Key...'}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 pr-9 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFbKey(!showFbKey)}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                          >
                            {showFbKey ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUBVIEW 2: FACEBOOK GROUP --- */}
                  {fbDestType === 'group' && (
                    <div className="space-y-2 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                          <Users size={11} className="text-blue-400" /> Select Target Facebook Group
                        </label>
                        {fbUserToken && (
                          <button
                            type="button"
                            onClick={() => fetchFacebookDestinations()}
                            disabled={isLoadingFb}
                            className="text-[10px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                          >
                            <RefreshCw size={10} className={isLoadingFb ? 'animate-spin' : ''} />
                            <span>{isLoadingFb ? 'Refreshing...' : 'Refresh Groups'}</span>
                          </button>
                        )}
                      </div>

                      {groups.length > 0 ? (
                        <select
                          value={selectedGroupId}
                          onChange={(e) => setSelectedGroupId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold text-xs focus:outline-none focus:border-blue-500"
                        >
                          <option value="" disabled>-- Select a Facebook Group --</option>
                          {groups.map((g) => (
                            <option key={g.id} value={g.id}>
                              👥 {g.name} {g.administrator ? '(Admin)' : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          To stream to a Facebook Group, you can paste the Group Stream Key below:
                        </p>
                      )}

                      <div className="pt-1">
                        <div className="relative">
                          <input
                            type={showFbKey ? 'text' : 'password'}
                            value={fbKey}
                            onChange={(e) => setFbKey(e.target.value)}
                            placeholder={selectedGroupId ? 'Optional: Paste Group Stream Key...' : 'Paste Facebook Group Stream Key...'}
                            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 pr-9 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFbKey(!showFbKey)}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                          >
                            {showFbKey ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* --- SUBVIEW 3: STREAM KEY --- */}
                  {fbDestType === 'stream_key' && (
                    <div className="space-y-1.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Direct Facebook Stream Key (Page, Group, or Profile):</span>
                        {fbKey.trim() && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check size={11} /> Ready
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showFbKey ? 'text' : 'password'}
                          value={fbKey}
                          onChange={(e) => setFbKey(e.target.value)}
                          placeholder="Paste Facebook Live Stream Key..."
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 pr-9 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFbKey(!showFbKey)}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                        >
                          {showFbKey ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  )}
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
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between bg-slate-950/70 px-3 py-2 rounded-lg border border-slate-800">
                    <div className="text-[11px] text-slate-300">
                      {ytChannelName ? (
                        <span className="text-emerald-400 font-bold">✓ Connected: {ytChannelName}</span>
                      ) : (
                        <span>Auto-create YouTube Live broadcast &amp; fetch stream key via Google OAuth:</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAutoProvisionYouTube}
                      disabled={isConnectingYt}
                      className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] flex items-center gap-1 shadow transition shrink-0"
                    >
                      <LogIn size={11} />
                      <span>{isConnectingYt ? 'Connecting...' : 'Auto-Connect YouTube'}</span>
                    </button>
                  </div>
                  {ytStatusMsg && (
                    <div className="p-2 rounded-lg bg-slate-950/90 border border-slate-700 text-[10px] text-amber-300 font-medium">
                      {ytStatusMsg}
                    </div>
                  )}
                  <div className="relative">
                    <input
                      type={showYtKey ? 'text' : 'password'}
                      value={ytKey}
                      onChange={(e) => setYtKey(e.target.value)}
                      placeholder="Or paste YouTube Live Stream Key (e.g. xxxx-xxxx-xxxx-xxxx)..."
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
                    <span>Supports OAuth Auto-Create or OBS Manual Stream Key from YouTube Studio</span>
                    {ytKey.trim() ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={11} /> Ready
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">Connect or paste key</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Destination 3: Custom RTMP / RTMPS Server Card */}
            <div
              className={`border rounded-xl p-3.5 transition ${
                customRtmpEnabled
                  ? 'bg-purple-950/20 border-purple-500/50 shadow-sm'
                  : 'bg-slate-900/40 border-slate-800 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white font-black text-[10px] shadow">
                    RTMP
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs">Custom RTMP / RTMPS Server</span>
                    <span className="text-[10px] text-slate-400 ml-2">Twitch, Kick, Restream, or Custom Ingest</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customRtmpEnabled}
                    onChange={(e) => setCustomRtmpEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {customRtmpEnabled && (
                <div className="mt-2 space-y-2">
                  <div>
                    <input
                      type="text"
                      value={customRtmpUrl}
                      onChange={(e) => setCustomRtmpUrl(e.target.value)}
                      placeholder="RTMP Server URL (e.g. rtmp://live.twitch.tv/app/ or rtmps://...)"
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type={showCustomKey ? 'text' : 'password'}
                      value={customRtmpKey}
                      onChange={(e) => setCustomRtmpKey(e.target.value)}
                      placeholder="Paste RTMP Stream Key..."
                      className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 pr-9 text-white font-mono text-[11px] placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCustomKey(!showCustomKey)}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                    >
                      {showCustomKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                    <span>Works with any RTMP / RTMPS endpoint simultaneously</span>
                    {isCustomReady ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check size={11} /> Ready
                      </span>
                    ) : (
                      <span className="text-amber-400 font-medium">Enter Server URL &amp; Stream Key</span>
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
                <Radio size={13} className="text-emerald-400" /> Bandwidth &amp; Stream Quality
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {selectedPresetObj.dataUsage}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {QUALITY_PRESETS.map((preset) => {
                const isSelected = qualityPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
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

            {/* Quick Bitrate Ceiling Caps */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                  <Radio size={12} className="text-emerald-400" /> Bitrate Ceiling Cap:
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400">
                  {bitrateCapKbps} kbps ({(bitrateCapKbps / 1000).toFixed(1)} Mbps)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[2200, 3000, 4200, 5000].map((bps) => (
                  <button
                    key={bps}
                    type="button"
                    onClick={() => setBitrateCapKbps(bps)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition ${
                      bitrateCapKbps === bps
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow'
                        : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {(bps / 1000).toFixed(1)} Mbps
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RTMP Engine Status Banner (Native Android On-Device Engine vs Web Cloud Relay) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5">
            <div className="mt-0.5">
              {isNativeAndroidRtmp || relayStatus === 'ready' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              ) : relayStatus === 'waking' ? (
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              ) : (
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              {isNativeAndroidRtmp ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 text-[11px]">
                      Android Native RTMP Engine:{' '}
                      <span className="text-emerald-400">Direct On-Device RTMP / RTMPS (No Cloud Relay Needed)</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    ⚡ <strong>100% Standalone Native Android Broadcast</strong>: Your phone/tablet streams H.264 directly to Facebook, YouTube, and Custom RTMP from the device hardware with zero external relay server required.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-300 text-[11px]">
                      Render Cloud Relay (Web Browser Mode):{' '}
                      {relayStatus === 'ready' ? (
                        <span className="text-emerald-400">Online &amp; Active (Zero-CPU Passthrough)</span>
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
                    💡 <strong>Browser Mode</strong>: Uses the cloud relay because desktop/iOS browsers block direct TCP RTMP sockets. (Install the Android APK for direct on-device RTMP!)
                  </p>
                </>
              )}
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
                  ? `🚀 GO LIVE TO BOTH (${selectedPage ? selectedPage.name : 'PAGE'} + YT @ ${selectedPresetObj.badge})`
                  : fbEnabled
                    ? `🚀 GO LIVE TO ${selectedPage ? selectedPage.name.toUpperCase() : 'FACEBOOK PAGE'} (@ ${selectedPresetObj.badge})`
                    : `🚀 GO LIVE TO YOUTUBE (@ ${selectedPresetObj.badge})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
