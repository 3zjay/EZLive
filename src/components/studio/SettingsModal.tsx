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
            <FacebookDestinationManager
              localSettings={localSettings}
              setLocalSettings={setLocalSettings}
              showStreamKey={showStreamKey}
              setShowStreamKey={setShowStreamKey}
            />
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


interface FbGroup {
  id: string;
  name: string;
  privacy?: string;
  administrator?: boolean;
}

interface FbPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
}

const FacebookDestinationManager: React.FC<{
  localSettings: StreamSettings;
  setLocalSettings: React.Dispatch<React.SetStateAction<StreamSettings>>;
  showStreamKey: boolean;
  setShowStreamKey: (show: boolean) => void;
}> = ({ localSettings, setLocalSettings, showStreamKey, setShowStreamKey }) => {
  const [groups, setGroups] = React.useState<FbGroup[]>([]);
  const [pages, setPages] = React.useState<FbPage[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState('');

  const fb = localSettings.fbSettings || {
    mode: 'auto',
    destinationType: 'group',
    userToken: '',
    selectedPageId: '',
    selectedPageName: '',
    selectedPageToken: '',
    selectedGroupId: '',
    selectedGroupName: '',
    groupStreamKey: '',
    broadcastTitle: '🏀 Hoop Culture Live - Court 1',
    broadcastDescription: 'Streaming live with official NBA Scorebug 2 overlay',
  };

  const destinationType = fb.destinationType || 'group';

  // 1. Load cached token or listen for OAuth messages
  React.useEffect(() => {
    const token = fb.userToken || (typeof window !== 'undefined' ? localStorage.getItem('fb_user_access_token') || '' : '');
    const savedName = typeof window !== 'undefined' ? localStorage.getItem('fb_user_name') || '' : '';
    const savedPic = typeof window !== 'undefined' ? localStorage.getItem('fb_user_picture') || '' : '';

    if (token) {
      if (!fb.userToken || !fb.userName) {
        setLocalSettings((prev) => ({
          ...prev,
          fbSettings: {
            ...(prev.fbSettings || fb),
            userToken: token,
            userName: prev.fbSettings?.userName || savedName,
            userPicture: prev.fbSettings?.userPicture || savedPic,
          },
        }));
      }
      fetchDestinations(token);
    }

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'FB_AUTH_SUCCESS') {
        const { token: authTok, user: authUser } = event.data;
        if (authTok) {
          try {
            localStorage.setItem('fb_user_access_token', authTok);
            if (authUser?.name) localStorage.setItem('fb_user_name', authUser.name);
            if (authUser?.picture) localStorage.setItem('fb_user_picture', authUser.picture);
          } catch {}

          setLocalSettings((prev) => ({
            ...prev,
            fbSettings: {
              ...(prev.fbSettings || fb),
              userToken: authTok,
              userName: authUser?.name || 'Facebook User',
              userPicture: authUser?.picture || '',
              destinationType: 'group',
              mode: 'auto',
            },
          }));

          setStatusMsg(`✓ Successfully linked Facebook account (${authUser?.name || 'User'})!`);
          fetchDestinations(authTok);
        }
      } else if (event.data?.type === 'FB_AUTH_ERROR') {
        setStatusMsg(`Facebook Login Error: ${event.data.error || 'Login window closed'}`);
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  const fetchDestinations = async (token?: string) => {
    const activeToken = token || fb.userToken || (typeof window !== 'undefined' ? localStorage.getItem('fb_user_access_token') : null);
    if (!activeToken) {
      setStatusMsg('Connect your Facebook account first.');
      return;
    }

    setIsLoading(true);
    setStatusMsg('Fetching Facebook Groups & Pages...');

    try {
      // 1. Fetch Groups
      const groupRes = await fetch('/api/facebook/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_groups', userAccessToken: activeToken }),
      });
      const groupData = await groupRes.json();
      if (groupData.groups) {
        setGroups(groupData.groups);
        if (groupData.groups.length > 0 && !fb.selectedGroupId) {
          setLocalSettings((prev) => ({
            ...prev,
            fbSettings: {
              ...(prev.fbSettings || fb),
              selectedGroupId: groupData.groups[0].id,
              selectedGroupName: groupData.groups[0].name,
            },
          }));
        }
      }

      // 2. Fetch Pages
      const pageRes = await fetch('/api/facebook/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_pages', userAccessToken: activeToken }),
      });
      const pageData = await pageRes.json();
      if (pageData.pages) {
        setPages(pageData.pages);
        if (pageData.pages.length > 0 && (!fb.selectedPageId || fb.selectedPageId === 'page-hoopculture')) {
          setLocalSettings((prev) => ({
            ...prev,
            fbSettings: {
              ...(prev.fbSettings || fb),
              selectedPageId: pageData.pages[0].id,
              selectedPageName: pageData.pages[0].name,
              selectedPageToken: pageData.pages[0].access_token,
            },
          }));
        }
      }

      setStatusMsg('');
    } catch (e: any) {
      setStatusMsg('Failed to fetch Facebook destinations: ' + e?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectFacebook = () => {
    setIsLoading(true);
    setStatusMsg('Opening Facebook authentication popup...');
    const width = 600;
    const height = 750;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const customAppId = fb.appId ? `?app_id=${encodeURIComponent(fb.appId)}` : '';

    const popup = window.open(
      `/api/auth/facebook/login${customAppId}`,
      'FacebookOAuth',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=no`
    );

    if (!popup || popup.closed) {
      alert('Pop-up was blocked. Please allow popups for ezlive.vercel.app to log into Facebook.');
      setIsLoading(false);
      return;
    }

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleDisconnectFacebook = () => {
    try {
      localStorage.removeItem('fb_user_access_token');
      localStorage.removeItem('fb_user_name');
      localStorage.removeItem('fb_user_picture');
    } catch {}

    setLocalSettings((prev) => ({
      ...prev,
      fbSettings: {
        ...(prev.fbSettings || fb),
        userToken: '',
        userName: '',
        userPicture: '',
        selectedGroupId: '',
        selectedGroupName: '',
        destinationType: 'stream_key',
        mode: 'manual',
      },
    }));

    setGroups([]);
    setPages([]);
    setStatusMsg('Disconnected from Facebook.');
  };

  const isConnected = Boolean(fb.userToken || (typeof window !== 'undefined' && localStorage.getItem('fb_user_access_token')));

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Account Connection Ribbon */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {fb.userPicture ? (
            <img
              src={fb.userPicture}
              alt={fb.userName || 'Facebook Avatar'}
              className="w-9 h-9 rounded-full border-2 border-indigo-500 shadow object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#1877f2] flex items-center justify-center font-black text-white text-base shadow">
              f
            </div>
          )}
          <div>
            <div className="font-extrabold text-white text-xs flex items-center gap-2">
              <span>{isConnected ? fb.userName || 'Connected Facebook Account' : 'Facebook Live Integration'}</span>
              {isConnected && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[9px] uppercase font-bold tracking-wider border border-emerald-500/30">
                  LINKED
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              {isConnected
                ? 'Stream directly to your groups & pages without stream keys'
                : 'Direct OAuth linking to stream to your Facebook Groups & Pages'}
            </div>
          </div>
        </div>

        {isConnected ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchDestinations()}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700 text-sky-400 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <span>{isLoading ? 'Refreshing...' : '🔄 Refresh Groups'}</span>
            </button>
            <button
              type="button"
              onClick={handleDisconnectFacebook}
              className="px-2 py-1.5 text-rose-400 hover:text-rose-300 text-xs font-bold hover:underline"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleConnectFacebook}
            disabled={isLoading}
            className="px-3.5 py-2 bg-[#1877f2] hover:bg-[#166fe5] active:scale-[0.98] text-white rounded-lg text-xs font-bold transition shadow-lg flex items-center gap-2"
          >
            <span className="font-black text-sm">f</span>
            <span>{isLoading ? 'Opening...' : 'Connect Facebook Account'}</span>
          </button>
        )}
      </div>

      {/* Optional Meta App ID override */}
      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
        <span>Meta App Configuration:</span>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Meta App ID (optional override)"
            value={fb.appId || ''}
            onChange={(e) => {
              const val = e.target.value.trim();
              setLocalSettings((prev) => ({
                ...prev,
                fbSettings: { ...(prev.fbSettings || fb), appId: val },
              }));
            }}
            className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300 font-mono w-48 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {statusMsg && (
        <div className="p-2 bg-sky-950/40 border border-sky-800 rounded-lg text-[11px] text-sky-300">
          {statusMsg}
        </div>
      )}

      {/* 2. Stream Destination Selector (Group / Page / Timeline / Stream Key) */}
      <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
        <label className="block text-slate-400 font-bold uppercase text-[10px] tracking-wider">
          Choose Facebook Destination
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Option 1: Group Stream Key (Instant Test / Streamlabs Standard) */}
          <button
            type="button"
            onClick={() =>
              setLocalSettings((prev) => ({
                ...prev,
                fbSettings: { ...(prev.fbSettings || fb), destinationType: 'stream_key', mode: 'manual' },
              }))
            }
            className={`p-2.5 rounded-xl border text-center font-bold transition ${
              destinationType === 'stream_key'
                ? 'bg-amber-950/60 border-amber-500 text-amber-300 ring-1 ring-amber-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-sm mb-0.5">🔑</div>
            <div className="text-xs">Group Stream Key</div>
            <div className="text-[9px] text-amber-400 font-extrabold uppercase mt-0.5 tracking-wider">⚡ Instant (No Login)</div>
          </button>

          {/* Option 2: Facebook Group (OAuth API) */}
          <button
            type="button"
            onClick={() =>
              setLocalSettings((prev) => ({
                ...prev,
                fbSettings: { ...(prev.fbSettings || fb), destinationType: 'group', mode: 'auto' },
              }))
            }
            className={`p-2.5 rounded-xl border text-center font-bold transition ${
              destinationType === 'group'
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-sm mb-0.5">👥</div>
            <div className="text-xs">Facebook Group</div>
            <div className="text-[9px] text-slate-500 uppercase mt-0.5">Via Meta API</div>
          </button>

          {/* Option 3: Facebook Page */}
          <button
            type="button"
            onClick={() =>
              setLocalSettings((prev) => ({
                ...prev,
                fbSettings: { ...(prev.fbSettings || fb), destinationType: 'page', mode: 'auto' },
              }))
            }
            className={`p-2.5 rounded-xl border text-center font-bold transition ${
              destinationType === 'page'
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-sm mb-0.5">📄</div>
            <div className="text-xs">Facebook Page</div>
            <div className="text-[9px] text-slate-500 uppercase mt-0.5">Pages API</div>
          </button>

          {/* Option 4: Personal Timeline */}
          <button
            type="button"
            onClick={() =>
              setLocalSettings((prev) => ({
                ...prev,
                fbSettings: { ...(prev.fbSettings || fb), destinationType: 'timeline', mode: 'auto' },
              }))
            }
            className={`p-2.5 rounded-xl border text-center font-bold transition ${
              destinationType === 'timeline'
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/50'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="text-sm mb-0.5">👤</div>
            <div className="text-xs">My Timeline</div>
            <div className="text-[9px] text-slate-500 uppercase mt-0.5">Personal</div>
          </button>
        </div>

        {/* --- VIEW A: FACEBOOK GROUP SELECTOR --- */}
        {destinationType === 'group' && (
          <div className="space-y-2 pt-1">
            <label className="block text-slate-300 font-bold">Select Facebook Group</label>
            {groups.length > 0 ? (
              <select
                value={fb.selectedGroupId}
                onChange={(e) => {
                  const grp = groups.find((g) => g.id === e.target.value);
                  setLocalSettings((prev) => ({
                    ...prev,
                    fbSettings: {
                      ...(prev.fbSettings || fb),
                      selectedGroupId: e.target.value,
                      selectedGroupName: grp?.name || '',
                    },
                  }));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="" disabled>-- Select a Facebook Group --</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    👥 {g.name} {g.administrator ? '(Admin)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  No Facebook Groups detected yet. If testing now, select <strong className="text-amber-400">Group Stream Key</strong> above to stream directly to your Facebook Group in seconds!
                </p>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => fetchDestinations()}
                    className="text-sky-400 underline font-bold text-[11px]"
                  >
                    Fetch my groups now
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- VIEW B: FACEBOOK PAGE SELECTOR --- */}
        {destinationType === 'page' && (
          <div className="space-y-2 pt-1">
            <label className="block text-slate-300 font-bold">Select Facebook Page</label>
            {pages.length > 0 ? (
              <select
                value={fb.selectedPageId}
                onChange={(e) => {
                  const pg = pages.find((p) => p.id === e.target.value);
                  setLocalSettings((prev) => ({
                    ...prev,
                    fbSettings: {
                      ...(prev.fbSettings || fb),
                      selectedPageId: e.target.value,
                      selectedPageName: pg?.name || '',
                      selectedPageToken: pg?.access_token || '',
                    },
                  }));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-semibold focus:outline-none focus:border-indigo-500"
              >
                <option value="" disabled>-- Select a Facebook Page --</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>
                    📄 {p.name} {p.category ? `(${p.category})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  No Facebook Pages detected for this account.
                </p>
                {isConnected && (
                  <button
                    type="button"
                    onClick={() => fetchDestinations()}
                    className="text-sky-400 underline font-bold text-[11px]"
                  >
                    Fetch my pages now
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- VIEW C: GROUP STREAM KEY (INSTANT TEST MODE) --- */}
        {destinationType === 'stream_key' && (
          <div className="space-y-3 pt-1 bg-slate-900/70 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <span>⚡ Fast 3-Step Testing Guide for Facebook Groups:</span>
            </div>
            <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1">
              <li>Open your <strong>Facebook Group</strong> in a browser or Facebook app.</li>
              <li>Click <strong>&quot;Live Video&quot;</strong> $\rightarrow$ select <strong>&quot;Streaming Software&quot;</strong>.</li>
              <li>Copy your <strong>Stream Key</strong> and paste it below:</li>
            </ol>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Facebook Ingest Server URL
              </label>
              <input
                type="text"
                readOnly
                value="rtmps://live-api-s.facebook.com:443/rtmp/"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-400 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Facebook Group Stream Key
              </label>
              <div className="relative">
                <input
                  type={showStreamKey ? 'text' : 'password'}
                  value={fb.groupStreamKey || localSettings.streamKey || ''}
                  onChange={(e) => {
                    const key = e.target.value;
                    setLocalSettings((prev) => ({
                      ...prev,
                      streamKey: key,
                      fbSettings: { ...(prev.fbSettings || fb), groupStreamKey: key },
                    }));
                  }}
                  placeholder="FB-xxxxxxxx-xxxx-xxxx"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowStreamKey(!showStreamKey)}
                  className="absolute right-2 top-2 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300"
                >
                  {showStreamKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broadcast Title & Description */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-slate-400 font-bold mb-1">Live Broadcast Title</label>
            <input
              type="text"
              value={fb.broadcastTitle}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  fbSettings: { ...(prev.fbSettings || fb), broadcastTitle: e.target.value },
                }))
              }
              placeholder="e.g. 🏀 Hoop Culture Championship: Ricky D's vs Harina"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 font-bold mb-1">Live Description</label>
            <textarea
              rows={2}
              value={fb.broadcastDescription}
              onChange={(e) =>
                setLocalSettings((prev) => ({
                  ...prev,
                  fbSettings: { ...(prev.fbSettings || fb), broadcastDescription: e.target.value },
                }))
              }
              placeholder="Live streaming with real-time NBA scoreboard overlay"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
