'use client';

import React, { useRef, useState } from 'react';
import {
  MessageSquare,
  Scroll,
  Palette,
  Layers,
  Sliders,
  Tv,
  Send,
  Eye,
  EyeOff,
  Trash2,
  Settings2,
  ExternalLink,
  X,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Zap,
  Upload,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, NewsTickerConfig, StreamlabsBanner, BrandKit } from '@/types/streamlabs';
import { Scene, ScoreboardState, SourceType } from '@/types/broadcast';
import { resolveScoreboardSessionUser } from '@/services/scoreboardSync';

interface SidebarTabsProps {
  // Chat
  chatMessages: ChatMessage[];
  highlightedChat: ChatMessage | null;
  onHighlightChat: (msg: ChatMessage | null) => void;
  onSendChatMessage: (text: string, platform?: 'facebook' | 'youtube') => void;

  // Ticker & Banners
  tickerConfig: NewsTickerConfig;
  onUpdateTicker: (config: NewsTickerConfig) => void;
  activeBanner: StreamlabsBanner | null;
  onToggleBanner: (banner: StreamlabsBanner | null) => void;

  // Brand Kit
  brandKit: BrandKit;
  onUpdateBrandKit: (kit: BrandKit) => void;

  // OBS Scenes & Sources
  scenes: Scene[];
  activeSceneId: string;
  selectedSourceId: string | null;
  onSelectScene: (id: string) => void;
  onAddScene: (name: string) => void;
  onDeleteScene: (id: string) => void;
  onSelectSource: (id: string | null) => void;
  onAddSource: (type: SourceType) => void;
  onDeleteSource: (id: string) => void;
  onToggleSourceVisibility: (id: string) => void;
  onToggleSourceLock?: (id: string) => void;
  onMoveSourceOrder?: (id: string, direction: 'up' | 'down') => void;
  onOpenSourceProperties: (id: string) => void;

  // Scoreboard
  scoreboard?: ScoreboardState;
  onChangeScoreboard?: (update: Partial<ScoreboardState>) => void;
  sessionUser?: string;
  onTriggerInstantReplay?: () => void;

  // Audio Mixer
  micVolume: number;
  micMuted: boolean;
  onChangeMicVolume: (vol: number) => void;
  onToggleMicMute: () => void;

  // Drawer / Mobile Close
  onClose?: () => void;
}

const DEFAULT_HOOP_CULTURE_LOGO = '/hoop-culture-logo2.png';
const DEFAULT_PRIMARY_COLOR = '#e8430a';
const DEFAULT_ACCENT_COLOR = '#ff6b1a';

function normalizeBrandLogoUrl(url?: string): string {
  const raw = (url || '').trim();
  if (!raw) return '';
  const pathOnly = raw.split('?')[0].toLowerCase();
  if (pathOnly === '/icon.svg' || pathOnly === 'icon.svg' || pathOnly.startsWith('/ezlive')) {
    return DEFAULT_HOOP_CULTURE_LOGO;
  }
  return raw;
}

function normalizeHexColor(value: string | undefined, fallback: string): string {
  const trimmed = (value || '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }
  return fallback;
}

export const SidebarTabs: React.FC<SidebarTabsProps> = ({
  chatMessages,
  highlightedChat,
  onHighlightChat,
  onSendChatMessage,
  tickerConfig,
  onUpdateTicker,
  activeBanner,
  onToggleBanner,
  brandKit,
  onUpdateBrandKit,
  scenes,
  activeSceneId,
  selectedSourceId,
  onSelectScene,
  onAddScene,
  onDeleteScene,
  onSelectSource,
  onAddSource,
  onDeleteSource,
  onToggleSourceVisibility,
  onToggleSourceLock,
  onMoveSourceOrder,
  onOpenSourceProperties,
  sessionUser,
  onTriggerInstantReplay,
  micVolume,
  micMuted,
  onChangeMicVolume,
  onToggleMicMute,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'ticker' | 'brand' | 'obs' | 'scoreboard' | 'mixer'>('scoreboard');
  const [scoreboardSubMode, setScoreboardSubMode] = useState<'control' | 'shotclock' | 'camera'>('control');
  const [chatInputText, setChatInputText] = useState('');
  const [chatPlatform, setChatPlatform] = useState<'youtube' | 'facebook'>('youtube');
  const [bannerTitle, setBannerTitle] = useState('HOOP CULTURE CHAMPIONSHIPS');
  const [bannerSubtitle, setBannerSubtitle] = useState('LIVE FROM MAIN GYM COURT');
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [failedPreviewSrc, setFailedPreviewSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isLogoEnabled = brandKit.logoEnabled !== false;
  const effectiveLogoUrl = normalizeBrandLogoUrl(brandKit.logoUrl);
  const logoOpacity = Math.min(1, Math.max(0.2, brandKit.logoOpacity ?? 0.92));
  const logoWidth = Math.min(280, Math.max(60, brandKit.logoWidth || 140));

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg|avif)$/i.test(file.name)) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, WebP, or SVG).');
      return;
    }

    setLogoUploadError(null);
    setFailedPreviewSrc(null);
    setIsProcessingLogo(true);

    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const reader = new FileReader();

    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        setIsProcessingLogo(false);
        setLogoUploadError('Could not read the selected image file.');
        return;
      }

      const img = new window.Image();
      img.onload = () => {
        try {
          const naturalW = img.naturalWidth || (isSvg ? 500 : 0);
          const naturalH = img.naturalHeight || (isSvg ? 500 : 0);

          if (!naturalW || !naturalH) {
            if (isSvg) {
              onUpdateBrandKit({
                ...brandKit,
                logoUrl: rawDataUrl,
                logoEnabled: true,
              });
              setIsProcessingLogo(false);
              return;
            }
            setIsProcessingLogo(false);
            setLogoUploadError('Could not determine uploaded image dimensions.');
            return;
          }

          const maxSide = 500;
          const longestSide = Math.max(naturalW, naturalH);
          const scale = isSvg ? maxSide / longestSide : Math.min(1, maxSide / longestSide);
          const targetW = Math.max(1, Math.round(naturalW * scale));
          const targetH = Math.max(1, Math.round(naturalH * scale));

          const offscreen = document.createElement('canvas');
          offscreen.width = targetW;
          offscreen.height = targetH;
          const offCtx = offscreen.getContext('2d');
          if (!offCtx) {
            throw new Error('Offscreen canvas 2D context unavailable');
          }

          offCtx.clearRect(0, 0, targetW, targetH);
          offCtx.drawImage(img, 0, 0, targetW, targetH);
          const pngDataUrl = offscreen.toDataURL('image/png');

          onUpdateBrandKit({
            ...brandKit,
            logoUrl: pngDataUrl,
            logoEnabled: true,
          });
        } catch {
          if (isSvg) {
            onUpdateBrandKit({
              ...brandKit,
              logoUrl: rawDataUrl,
              logoEnabled: true,
            });
          } else {
            setLogoUploadError('Failed to process image. Try a PNG, JPG, or WebP file.');
          }
        } finally {
          setIsProcessingLogo(false);
        }
      };

      img.onerror = () => {
        setIsProcessingLogo(false);
        setLogoUploadError('Failed to decode the selected image.');
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      setIsProcessingLogo(false);
      setLogoUploadError('Failed to read the selected file.');
    };

    reader.readAsDataURL(file);
  };

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];
  const sortedSources = [...(activeScene?.sources || [])].sort((a, b) => b.zIndex - a.zIndex);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    onSendChatMessage(chatInputText.trim(), chatPlatform);
    setChatInputText('');
  };

  const handleApplyBanner = () => {
    if (activeBanner) {
      onToggleBanner(null);
    } else {
      onToggleBanner({
        id: `banner-${Date.now()}`,
        enabled: true,
        title: bannerTitle,
        subtitle: bannerSubtitle,
        theme: 'sports',
      });
    }
  };

  const activeUser = resolveScoreboardSessionUser(
    sessionUser,
    typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') : null
  );
  const embeddedBoardUrl =
    scoreboardSubMode === 'camera'
      ? `/overlays/camera.html?user=${encodeURIComponent(activeUser)}`
      : `/overlays/${scoreboardSubMode}.html?user=${encodeURIComponent(activeUser)}&embed=1`;
  const popOutBoardUrl = `/overlays/${scoreboardSubMode}.html?user=${encodeURIComponent(activeUser)}`;

  return (
    <div className="w-full bg-slate-900 border-l border-slate-800 flex flex-col h-full text-xs select-none z-20">
      {/* Streamlabs Tab Navigation Icons */}
      <div className="flex items-center justify-between bg-slate-950 border-b border-slate-800 px-1 py-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('scoreboard')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'scoreboard'
              ? 'bg-slate-800 text-[#ff6b1a] border border-[#e8430a]/40'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Basketball Scoreboard & Shot Clock Controller"
        >
          <Tv size={14} />
          <span>Scores</span>
        </button>

        <button
          onClick={() => setActiveTab('obs')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'obs'
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="OBS Scenes & Sources"
        >
          <Layers size={14} />
          <span>OBS</span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'chat'
              ? 'bg-slate-800 text-sky-400 border border-sky-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Live Chat & Show on Stream"
        >
          <MessageSquare size={14} />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('ticker')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'ticker'
              ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Scrolling Ticker & Banners"
        >
          <Scroll size={14} />
          <span>Ticker</span>
        </button>

        <button
          onClick={() => setActiveTab('brand')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'brand'
              ? 'bg-slate-800 text-purple-400 border border-purple-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Brand Kit & Logos"
        >
          <Palette size={14} />
          <span>Brand</span>
        </button>

        <button
          onClick={() => setActiveTab('mixer')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'mixer'
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Audio Mixer"
        >
          <Sliders size={14} />
          <span>Audio</span>
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="py-1.5 px-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close Tools Panel"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* --- TAB CONTENT BODY --- */}
      <div
        className={
          activeTab === 'scoreboard'
            ? 'flex-1 flex flex-col overflow-hidden p-1.5 text-slate-200'
            : 'flex-1 overflow-y-auto p-3 text-slate-200'
        }
      >
        {/* 1. CHAT & SHOW ON STREAM */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-extrabold uppercase text-[11px] text-slate-300">
                  Unified YouTube & FB Chat
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-red-400 font-bold bg-red-950/70 px-1.5 py-0.5 rounded border border-red-800/50">
                    YT
                  </span>
                  <span className="text-[9px] text-blue-400 font-bold bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-800/50">
                    FB
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Tap any comment to click <b>&quot;Show on Stream&quot;</b> and project it onto the live broadcast.
              </p>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[360px]">
              {chatMessages.map((msg) => {
                const isHighlighted = highlightedChat?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    className={`p-2.5 rounded-xl border transition ${
                      isHighlighted
                        ? 'bg-sky-950/60 border-sky-400 shadow-md ring-1 ring-sky-400/50'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-100">{msg.sender}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          msg.platform === 'facebook'
                            ? 'bg-blue-900/60 text-blue-300'
                            : msg.platform === 'youtube'
                              ? 'bg-red-900/60 text-red-300'
                              : 'bg-purple-900/60 text-purple-300'
                        }`}
                      >
                        {msg.platform}
                      </span>
                    </div>

                    <p className="text-slate-300 text-xs mb-2">{msg.message}</p>

                    <button
                      onClick={() => onHighlightChat(isHighlighted ? null : msg)}
                      className={`w-full py-1 px-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition ${
                        isHighlighted
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-sky-600 hover:bg-sky-500 text-white'
                      }`}
                    >
                      {isHighlighted ? <EyeOff size={11} /> : <Eye size={11} />}
                      <span>{isHighlighted ? 'Hide from Stream' : 'Show on Stream'}</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Send manual announcement/chat message */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setChatPlatform('youtube')}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                    chatPlatform === 'youtube' ? 'bg-red-600 text-white' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  YouTube Tag
                </button>
                <button
                  type="button"
                  onClick={() => setChatPlatform('facebook')}
                  className={`flex-1 py-1 rounded text-[10px] font-bold transition ${
                    chatPlatform === 'facebook' ? 'bg-blue-600 text-white' : 'bg-slate-950 text-slate-400'
                  }`}
                >
                  Facebook Tag
                </button>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Type court announcement or chat..."
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  className="p-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition shadow"
                >
                  <Send size={13} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 2. TICKER & BANNERS */}
        {activeTab === 'ticker' && (
          <div className="space-y-4">
            {/* Scrolling News Ticker */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 text-xs">Scrolling News Ticker</div>
                  <div className="text-[10px] text-slate-500">Live running text across the bottom of the stream</div>
                </div>
                <input
                  type="checkbox"
                  checked={tickerConfig.enabled}
                  onChange={(e) => onUpdateTicker({ ...tickerConfig, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Ticker Text</label>
                <textarea
                  rows={3}
                  value={tickerConfig.text}
                  onChange={(e) => onUpdateTicker({ ...tickerConfig, text: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none font-medium"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Scroll Speed</span>
                  <span className="font-mono text-sky-400">{tickerConfig.speed} px/s</span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={300}
                  step={10}
                  value={tickerConfig.speed}
                  onChange={(e) => onUpdateTicker({ ...tickerConfig, speed: parseInt(e.target.value, 10) })}
                  className="w-full accent-sky-500"
                />
              </div>
            </div>

            {/* Static Lower-Third Banners */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-100 text-xs">Static Lower-Third Banner</div>
                <span className={`text-[10px] font-bold ${activeBanner ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {activeBanner ? 'ACTIVE ON STREAM' : 'OFF'}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Banner Title</label>
                <input
                  type="text"
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={handleApplyBanner}
                className={`w-full py-2 rounded-xl font-bold text-xs transition shadow ${
                  activeBanner
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-600 hover:bg-amber-500 text-white'
                }`}
              >
                {activeBanner ? 'Hide Banner from Stream' : 'Show Banner on Stream'}
              </button>
            </div>
          </div>
        )}

        {/* 3. BRAND KIT & THEMES */}
        {activeTab === 'brand' && (
          <div className="space-y-3">
            {/* Live Preview + Show/Hide Watermark */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-extrabold text-slate-100 text-xs">Hoop Culture Brand Kit</div>
                  <div className="text-[10px] text-slate-400">Live Broadcast Logo Watermark</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBrandKit({
                      ...brandKit,
                      logoEnabled: !isLogoEnabled,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1.5 border transition ${
                    isLogoEnabled
                      ? 'bg-[#e8430a]/20 border-[#e8430a]/60 text-[#ff6b1a] hover:bg-[#e8430a]/30'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {isLogoEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{isLogoEnabled ? 'Show Watermark' : 'Watermark Hidden'}</span>
                </button>
              </div>

              {/* Obsidian Court Backdrop Preview */}
              <div className="relative h-28 rounded-xl bg-[#080605] border border-[#2a1e14] flex items-center justify-center p-3 overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 50% 50%, rgba(232, 67, 10, 0.28), transparent 70%)',
                  }}
                />
                {effectiveLogoUrl && failedPreviewSrc !== effectiveLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={effectiveLogoUrl}
                    alt="Active Brand Logo Preview"
                    onError={() => setFailedPreviewSrc(effectiveLogoUrl)}
                    className="relative z-10 max-h-20 max-w-full object-contain transition-opacity duration-150"
                    style={{ opacity: isLogoEnabled ? logoOpacity : 0.18 }}
                  />
                ) : (
                  <span className="relative z-10 text-[11px] font-semibold text-slate-500">
                    {effectiveLogoUrl ? 'Unable to load preview image' : 'No watermark logo selected'}
                  </span>
                )}

                {!isLogoEnabled && (
                  <span className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[9px] font-extrabold uppercase tracking-wider text-slate-300">
                    Hidden on Stream
                  </span>
                )}

                <span className="absolute bottom-1.5 right-2 z-20 text-[9px] font-mono text-slate-400">
                  {brandKit.logoPosition} · {logoWidth}px · {Math.round(logoOpacity * 100)}%
                </span>
              </div>

              {/* Upload Custom Brand Logo */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isProcessingLogo}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#e8430a] to-[#ff6b1a] hover:brightness-110 disabled:opacity-60 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow transition"
                >
                  <Upload size={13} />
                  <span>{isProcessingLogo ? 'Optimizing Brand Logo...' : 'Upload Custom Brand Logo'}</span>
                </button>
                <p className="text-[10px] text-slate-500 mt-1 text-center">
                  Auto-scales to 500px max PNG preserving transparency &amp; aspect ratio
                </p>
                {logoUploadError && (
                  <p className="text-[10px] text-rose-400 font-semibold mt-1 text-center">{logoUploadError}</p>
                )}
              </div>

              {/* 1-Click Presets */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                  Quick Brand Presets
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUploadError(null);
                      setFailedPreviewSrc(null);
                      onUpdateBrandKit({
                        ...brandKit,
                        logoUrl: '/hoop-culture-logo2.png',
                        logoEnabled: true,
                      });
                    }}
                    className={`py-1.5 px-1.5 rounded-lg font-bold text-[10px] border transition text-center leading-tight ${
                      isLogoEnabled && effectiveLogoUrl === '/hoop-culture-logo2.png'
                        ? 'bg-[#e8430a] border-[#ff6b1a] text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    Hoop Culture Official
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLogoUploadError(null);
                      setFailedPreviewSrc(null);
                      onUpdateBrandKit({
                        ...brandKit,
                        logoUrl: '/hoop-culture-logo.jpg',
                        logoEnabled: true,
                      });
                    }}
                    className={`py-1.5 px-1.5 rounded-lg font-bold text-[10px] border transition text-center leading-tight ${
                      isLogoEnabled && effectiveLogoUrl === '/hoop-culture-logo.jpg'
                        ? 'bg-[#e8430a] border-[#ff6b1a] text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    Hoop Culture Emblem
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBrandKit({
                        ...brandKit,
                        logoEnabled: false,
                      })
                    }
                    className={`py-1.5 px-1.5 rounded-lg font-bold text-[10px] border transition text-center leading-tight ${
                      !isLogoEnabled
                        ? 'bg-rose-600 border-rose-400 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    Hide Logo
                  </button>
                </div>
              </div>

              {/* Custom Logo URL / Path Fallback */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">
                  Custom Logo URL or Path
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={brandKit.logoUrl}
                    placeholder="/hoop-culture-logo2.png or https://..."
                    onChange={(e) => {
                      setFailedPreviewSrc(null);
                      onUpdateBrandKit({ ...brandKit, logoUrl: e.target.value });
                    }}
                    className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff6b1a] font-mono"
                  />
                  {brandKit.logoUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setFailedPreviewSrc(null);
                        onUpdateBrandKit({ ...brandKit, logoUrl: '' });
                      }}
                      title="Clear Logo URL"
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Watermark Size, Opacity & Position */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-bold">Watermark Size</span>
                  <span className="font-mono text-[#ff6b1a]">{logoWidth}px</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={280}
                  step={4}
                  value={logoWidth}
                  onChange={(e) => {
                    const nextWidth = parseInt(e.target.value, 10);
                    onUpdateBrandKit({
                      ...brandKit,
                      logoWidth: nextWidth,
                      logoHeight: Math.round(nextWidth * 0.65),
                    });
                  }}
                  className="w-full accent-[#e8430a]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                  <span className="font-bold">Watermark Opacity</span>
                  <span className="font-mono text-[#ff6b1a]">{Math.round(logoOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1}
                  step={0.02}
                  value={logoOpacity}
                  onChange={(e) =>
                    onUpdateBrandKit({
                      ...brandKit,
                      logoOpacity: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-[#e8430a]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">
                  Position on Canvas
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onUpdateBrandKit({ ...brandKit, logoPosition: pos })}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[10px] capitalize transition border ${
                        brandKit.logoPosition === pos
                          ? 'bg-[#e8430a] border-[#ff6b1a] text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-100 text-xs">Brand Colors</div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBrandKit({
                      ...brandKit,
                      primaryColor: DEFAULT_PRIMARY_COLOR,
                      accentColor: DEFAULT_ACCENT_COLOR,
                    })
                  }
                  className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-bold text-[#ff6b1a] flex items-center gap-1 transition"
                >
                  <RotateCcw size={11} />
                  <span>Hoop Culture Default Colors</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Primary Color</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      aria-label="Primary Brand Color Swatch"
                      value={normalizeHexColor(brandKit.primaryColor, DEFAULT_PRIMARY_COLOR)}
                      onChange={(e) => onUpdateBrandKit({ ...brandKit, primaryColor: e.target.value })}
                      className="h-7 w-8 p-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      aria-label="Primary Brand Color Hex"
                      value={brandKit.primaryColor}
                      onChange={(e) => onUpdateBrandKit({ ...brandKit, primaryColor: e.target.value })}
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Accent Color</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      aria-label="Accent Brand Color Swatch"
                      value={normalizeHexColor(brandKit.accentColor, DEFAULT_ACCENT_COLOR)}
                      onChange={(e) => onUpdateBrandKit({ ...brandKit, accentColor: e.target.value })}
                      className="h-7 w-8 p-0.5 rounded bg-slate-900 border border-slate-700 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      aria-label="Accent Brand Color Hex"
                      value={brandKit.accentColor}
                      onChange={(e) => onUpdateBrandKit({ ...brandKit, accentColor: e.target.value })}
                      className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. OBS SCENES & ALL 7 SOURCES */}
        {activeTab === 'obs' && (
          <div className="space-y-3">
            {/* Scene Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-300 text-xs uppercase">Select Active Scene</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const name = prompt('Enter new scene name:', `Scene ${scenes.length + 1}`);
                      if (name) onAddScene(name);
                    }}
                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold"
                  >
                    + Add
                  </button>
                  {scenes.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm('Delete active scene?')) onDeleteScene(activeSceneId);
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded text-[10px]"
                      title="Delete Scene"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              </div>

              <select
                value={activeSceneId}
                onChange={(e) => onSelectScene(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none"
              >
                {scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sources.length} sources)
                  </option>
                ))}
              </select>
            </div>

            {/* Add Source Quick Buttons (All 7 OBS Source Types) */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-400 text-[10px] uppercase mb-1.5">+ Add OBS Source Layer</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddSource('camera')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-emerald-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Camera Device
                </button>
                <button
                  onClick={() => onAddSource('scoreboard')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-[#ff6b1a] font-bold text-[10px] text-left border border-slate-800"
                >
                  + Scoreboard HUD
                </button>
                <button
                  onClick={() => onAddSource('video_media')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-amber-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Video / Commercial
                </button>
                <button
                  onClick={() => onAddSource('image')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-pink-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Image / Sponsor PNG
                </button>
                <button
                  onClick={() => onAddSource('browser_url')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-sky-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Browser URL
                </button>
                <button
                  onClick={() => onAddSource('text')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-purple-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Text / Lower-Third
                </button>
                <button
                  onClick={() => onAddSource('color_solid')}
                  className="col-span-2 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded-lg text-slate-300 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Solid Color Plate / Dimmer
                </button>
              </div>
            </div>

            {/* Current Scene Sources with Z-order Up/Down & Lock */}
            <div className="space-y-1">
              <div className="font-bold text-slate-400 text-[10px] uppercase">Active Layers (Top to Bottom)</div>
              {sortedSources.map((src) => {
                const isSelected = src.id === selectedSourceId;
                return (
                  <div
                    key={src.id}
                    onClick={() => onSelectSource(src.id)}
                    className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-800 border-sky-400 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-bold truncate max-w-[125px]">{src.name}</span>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {onMoveSourceOrder && (
                        <>
                          <button
                            onClick={() => onMoveSourceOrder(src.id, 'up')}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                            title="Move Up"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            onClick={() => onMoveSourceOrder(src.id, 'down')}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                            title="Move Down"
                          >
                            <ArrowDown size={11} />
                          </button>
                        </>
                      )}
                      {onToggleSourceLock && (
                        <button
                          onClick={() => onToggleSourceLock(src.id)}
                          className={`p-1 hover:bg-slate-700 rounded ${
                            src.locked ? 'text-amber-400' : 'text-slate-500'
                          }`}
                          title={src.locked ? 'Unlock Layer' : 'Lock Layer'}
                        >
                          {src.locked ? <Lock size={11} /> : <Unlock size={11} />}
                        </button>
                      )}
                      <button
                        onClick={() => onToggleSourceVisibility(src.id)}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400"
                      >
                        {src.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                      </button>
                      <button
                        onClick={() => onOpenSourceProperties(src.id)}
                        className="p-1 hover:bg-slate-700 rounded text-sky-400"
                      >
                        <Settings2 size={11} />
                      </button>
                      <button
                        onClick={() => onDeleteSource(src.id)}
                        className="p-1 hover:bg-slate-700 rounded text-rose-400"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. INTEGRATED HOOP CULTURE SCOREBOARD SUITE */}
        {activeTab === 'scoreboard' && (
          <div className="flex-1 min-h-0 flex flex-col gap-1.5 h-full">
            <div className="flex items-center justify-between gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => setScoreboardSubMode('control')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-black text-[10px] whitespace-nowrap transition ${
                    scoreboardSubMode === 'control'
                      ? 'bg-[#e8430a] text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  🏀 Board
                </button>
                <button
                  type="button"
                  onClick={() => setScoreboardSubMode('shotclock')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-black text-[10px] whitespace-nowrap transition ${
                    scoreboardSubMode === 'shotclock'
                      ? 'bg-[#e8430a] text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  ⏱️ Shot Clock
                </button>
                <button
                  type="button"
                  onClick={() => setScoreboardSubMode('camera')}
                  className={`flex-1 py-1.5 px-1.5 rounded-lg font-black text-[10px] whitespace-nowrap transition ${
                    scoreboardSubMode === 'camera'
                      ? 'bg-[#e8430a] text-white shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  📷 AI Scan
                </button>
              </div>
              <a
                href={popOutBoardUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 bg-slate-900 hover:bg-slate-800 text-sky-400 rounded-lg border border-slate-800 shrink-0 transition"
                title="Pop out full Scoreboard Controller in new tab"
              >
                <ExternalLink size={12} />
              </a>
            </div>

            <iframe
              key={`${scoreboardSubMode}-${activeUser}`}
              src={embeddedBoardUrl}
              className="flex-1 w-full h-full min-h-[420px] rounded-xl border border-[#2a1e14] bg-[#0d1117]"
              allow="camera; microphone; autoplay; clipboard-read; clipboard-write"
              title="Hoop Culture Scoreboard Controller"
            />

            {/* Instant Replay Trigger Button */}
            {onTriggerInstantReplay && (
              <button
                onClick={onTriggerInstantReplay}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-[#e8430a] hover:from-amber-500 hover:to-[#ff6b1a] text-white font-black uppercase tracking-wider text-[11px] flex items-center justify-center gap-2 shadow-lg transition active:scale-98 shrink-0"
              >
                <Zap size={13} />
                <span>Play 10s Slow-Mo Instant Replay</span>
              </button>
            )}
          </div>
        )}

        {/* 6. AUDIO MIXER */}
        {activeTab === 'mixer' && (
          <div className="space-y-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Microphone (Court Audio)</span>
                <button
                  onClick={onToggleMicMute}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    micMuted ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400'
                  }`}
                >
                  {micMuted ? 'MUTED' : `${micVolume}%`}
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={140}
                value={micMuted ? 0 : micVolume}
                onChange={(e) => onChangeMicVolume(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Media / Screen Share Audio</span>
                <span className="text-[10px] font-bold text-slate-500">100%</span>
              </div>
              <input type="range" min={0} max={100} defaultValue={100} className="w-full accent-sky-500" />
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Master Output</span>
                <span className="text-[10px] font-bold text-emerald-400">0.0 dB</span>
              </div>
              <input type="range" min={0} max={100} defaultValue={100} className="w-full accent-emerald-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
