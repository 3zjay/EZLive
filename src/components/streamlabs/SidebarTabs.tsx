'use client';

import React, { useState } from 'react';
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
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { ChatMessage, NewsTickerConfig, StreamlabsBanner, BrandKit } from '@/types/streamlabs';
import { Scene, ScoreboardState, SourceType } from '@/types/broadcast';

interface SidebarTabsProps {
  // Chat
  chatMessages: ChatMessage[];
  highlightedChat: ChatMessage | null;
  onHighlightChat: (msg: ChatMessage | null) => void;
  onSendChatMessage: (text: string) => void;

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
  onOpenSourceProperties: (id: string) => void;

  // Scoreboard
  scoreboard: ScoreboardState;
  onChangeScoreboard: (update: Partial<ScoreboardState>) => void;

  // Audio Mixer
  micVolume: number;
  micMuted: boolean;
  onChangeMicVolume: (vol: number) => void;
  onToggleMicMute: () => void;
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
  onOpenSourceProperties,
  scoreboard,
  onChangeScoreboard,
  micVolume,
  micMuted,
  onChangeMicVolume,
  onToggleMicMute,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'ticker' | 'brand' | 'obs' | 'scoreboard' | 'mixer'>('chat');
  const [chatInputText, setChatInputText] = useState('');
  const [bannerTitle, setBannerTitle] = useState('HOOP TIMES CHAMPIONSHIP');
  const [bannerSubtitle, setBannerSubtitle] = useState('LIVE FROM MAIN GYM COURT');

  const activeScene = scenes.find((s) => s.id === activeSceneId) || scenes[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    onSendChatMessage(chatInputText.trim());
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

  return (
    <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-xs select-none z-20">
      {/* Streamlabs Tab Navigation Icons */}
      <div className="flex items-center justify-between bg-slate-950 border-b border-slate-800 px-1 py-1 overflow-x-auto">
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
          onClick={() => setActiveTab('scoreboard')}
          className={`flex-1 py-2 px-1 rounded-lg flex flex-col items-center gap-1 font-bold text-[10px] transition ${
            activeTab === 'scoreboard'
              ? 'bg-slate-800 text-rose-400 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Basketball Scoreboard Controller"
        >
          <Tv size={14} />
          <span>Scores</span>
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
      </div>

      {/* --- TAB CONTENT BODY --- */}
      <div className="flex-1 overflow-y-auto p-3 text-slate-200">
        {/* 1. CHAT & SHOW ON STREAM */}
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="font-extrabold uppercase text-[11px] text-slate-300">
                  Stream Chat & Highlights
                </span>
                <span className="text-[10px] text-sky-400 font-bold bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800/50">
                  Unified
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Hover or tap any comment to click <b>&quot;Show on Stream&quot;</b> and project it onto the broadcast canvas.
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
                        className={`text-[9px] font-bold px-1 rounded uppercase ${
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

                    {/* Show on Stream Button (Flagship Streamlabs feature) */}
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
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-800 flex gap-1.5">
              <input
                type="text"
                placeholder="Type comment or highlight..."
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
          <div className="space-y-4">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
              <div className="font-bold text-slate-100 text-xs">Logo Watermark</div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Logo URL or Path</label>
                <input
                  type="text"
                  value={brandKit.logoUrl}
                  onChange={(e) => onUpdateBrandKit({ ...brandKit, logoUrl: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1">Position on Canvas</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onUpdateBrandKit({ ...brandKit, logoPosition: pos })}
                      className={`py-1.5 px-2 rounded-lg font-bold text-[10px] capitalize transition border ${
                        brandKit.logoPosition === pos
                          ? 'bg-sky-600 border-sky-400 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-slate-100 text-xs">Brand Colors</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Primary Color</label>
                  <input
                    type="text"
                    value={brandKit.primaryColor}
                    onChange={(e) => onUpdateBrandKit({ ...brandKit, primaryColor: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Accent Color</label>
                  <input
                    type="text"
                    value={brandKit.accentColor}
                    onChange={(e) => onUpdateBrandKit({ ...brandKit, accentColor: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. OBS SCENES & SOURCES */}
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

            {/* Add Source Quick Buttons */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <div className="font-bold text-slate-400 text-[10px] uppercase mb-1.5">+ Add Source to Scene</div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => onAddSource('browser_url')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-sky-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Browser Source (URL)
                </button>
                <button
                  onClick={() => onAddSource('camera')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-emerald-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Camera Source
                </button>
                <button
                  onClick={() => onAddSource('scoreboard')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-rose-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Scoreboard HUD
                </button>
                <button
                  onClick={() => onAddSource('text')}
                  className="py-1.5 px-2 bg-slate-900 hover:bg-slate-850 rounded-lg text-purple-400 font-bold text-[10px] text-left border border-slate-800"
                >
                  + Text / Lower-Third
                </button>
              </div>
            </div>

            {/* Current Scene Sources */}
            <div className="space-y-1">
              <div className="font-bold text-slate-400 text-[10px] uppercase">Active Layers</div>
              {activeScene.sources.map((src) => {
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
                    <span className="font-bold truncate max-w-[150px]">{src.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSourceVisibility(src.id);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400"
                      >
                        {src.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenSourceProperties(src.id);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-400"
                      >
                        <Settings2 size={12} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSource(src.id);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-rose-400"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. BASKETBALL SCOREBOARD OPERATOR */}
        {activeTab === 'scoreboard' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {/* Away */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <input
                  type="text"
                  value={scoreboard.awayTeam}
                  onChange={(e) => onChangeScoreboard({ awayTeam: e.target.value })}
                  className="w-full bg-transparent text-center font-black text-xs text-slate-300 uppercase focus:outline-none mb-1"
                />
                <div className="text-3xl font-black text-sky-400 font-mono mb-2">{scoreboard.awayScore}</div>
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => onChangeScoreboard({ awayScore: scoreboard.awayScore + 1 })}
                    className="flex-1 py-1 bg-sky-600 rounded font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => onChangeScoreboard({ awayScore: scoreboard.awayScore + 2 })}
                    className="flex-1 py-1 bg-sky-600 rounded font-bold"
                  >
                    +2
                  </button>
                  <button
                    onClick={() => onChangeScoreboard({ awayScore: scoreboard.awayScore + 3 })}
                    className="flex-1 py-1 bg-sky-600 rounded font-bold"
                  >
                    +3
                  </button>
                  <button
                    onClick={() => onChangeScoreboard({ awayScore: Math.max(0, scoreboard.awayScore - 1) })}
                    className="px-2 py-1 bg-slate-800 rounded font-bold text-slate-400"
                  >
                    -1
                  </button>
                </div>
              </div>

              {/* Home */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-center">
                <input
                  type="text"
                  value={scoreboard.homeTeam}
                  onChange={(e) => onChangeScoreboard({ homeTeam: e.target.value })}
                  className="w-full bg-transparent text-center font-black text-xs text-slate-300 uppercase focus:outline-none mb-1"
                />
                <div className="text-3xl font-black text-rose-400 font-mono mb-2">{scoreboard.homeScore}</div>
                <div className="flex justify-center gap-1">
                  <button
                    onClick={() => onChangeScoreboard({ homeScore: scoreboard.homeScore + 1 })}
                    className="flex-1 py-1 bg-rose-600 rounded font-bold"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => onChangeScoreboard({ homeScore: scoreboard.homeScore + 2 })}
                    className="flex-1 py-1 bg-rose-600 rounded font-bold"
                  >
                    +2
                  </button>
                  <button
                    onClick={() => onChangeScoreboard({ homeScore: scoreboard.homeScore + 3 })}
                    className="flex-1 py-1 bg-rose-600 rounded font-bold"
                  >
                    +3
                  </button>
                  <button
                    onClick={() => onChangeScoreboard({ homeScore: Math.max(0, scoreboard.homeScore - 1) })}
                    className="px-2 py-1 bg-slate-800 rounded font-bold text-slate-400"
                  >
                    -1
                  </button>
                </div>
              </div>
            </div>

            {/* Clock Controls */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
              <button
                onClick={() => onChangeScoreboard({ isClockRunning: !scoreboard.isClockRunning })}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold transition shadow ${
                  scoreboard.isClockRunning
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {scoreboard.isClockRunning ? <Pause size={14} /> : <Play size={14} />}
                <span>{scoreboard.isClockRunning ? 'Pause' : 'Start'}</span>
              </button>

              <div className="text-center font-mono font-black text-2xl text-slate-100">
                {scoreboard.gameClock}
              </div>

              <button
                onClick={() => onChangeScoreboard({ gameClock: '10:00', isClockRunning: false })}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                title="Reset Clock to 10:00"
              >
                <RotateCcw size={15} />
              </button>
            </div>
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
                  {micMuted ? 'MUTED' : 'LIVE'}
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={100}
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
                <span className="text-[10px] font-bold text-emerald-400">0 dB</span>
              </div>
              <input type="range" min={0} max={100} defaultValue={100} className="w-full accent-emerald-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
