'use client';

import React from 'react';
import { Mic, MicOff, Eye, EyeOff, Layout, Columns, PictureInPicture, Grid2X2 } from 'lucide-react';
import { ParticipantFeed, StageLayout } from '@/types/streamlabs';

interface BackstageStripProps {
  participants: ParticipantFeed[];
  layout: StageLayout;
  onToggleOnStage: (id: string) => void;
  onToggleMute: (id: string) => void;
  onChangeLayout: (layout: StageLayout) => void;
}

export const BackstageStrip: React.FC<BackstageStripProps> = ({
  participants,
  layout,
  onToggleOnStage,
  onToggleMute,
  onChangeLayout,
}) => {
  return (
    <div className="h-20 bg-slate-950 border-t border-slate-800 px-3 flex items-center justify-between gap-3 select-none z-20">
      {/* Participant / Source Thumbnails (Host, Screen Share, Guests) */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 pl-1">
          FEEDS
        </div>

        {participants.map((p) => (
          <div
            key={p.id}
            className={`relative w-32 h-16 rounded-xl border flex flex-col justify-between p-1.5 transition-all shadow-sm ${
              p.onStage
                ? 'bg-slate-900 border-emerald-500 ring-1 ring-emerald-500/40'
                : 'bg-slate-950/80 border-slate-800 opacity-60 hover:opacity-100'
            }`}
          >
            {/* Top row: Label & Stage Indicator */}
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-slate-200 truncate max-w-[70px]">{p.name}</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  p.onStage ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
            </div>

            {/* Bottom row: Show/Hide from Stream button + Mute button */}
            <div className="flex items-center justify-between gap-1 mt-auto">
              <button
                onClick={() => onToggleOnStage(p.id)}
                className={`flex-1 py-0.5 px-1 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition ${
                  p.onStage
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={p.onStage ? 'Remove from Main Canvas' : 'Add to Main Canvas'}
              >
                {p.onStage ? <Eye size={11} /> : <EyeOff size={11} />}
                <span>{p.onStage ? 'On Stream' : 'Backstage'}</span>
              </button>

              <button
                onClick={() => onToggleMute(p.id)}
                className={`p-1 rounded transition ${
                  p.muted
                    ? 'bg-rose-950 text-rose-400 border border-rose-800'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={p.muted ? 'Unmute' : 'Mute'}
              >
                {p.muted ? <MicOff size={11} /> : <Mic size={11} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Streamlabs Stage Layout Switcher */}
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
        <button
          onClick={() => onChangeLayout('solo')}
          className={`p-1.5 rounded-lg transition ${
            layout === 'solo'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Solo Layout (Single Full Feed)"
        >
          <Layout size={15} />
        </button>

        <button
          onClick={() => onChangeLayout('split')}
          className={`p-1.5 rounded-lg transition ${
            layout === 'split'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Split Layout (Side-by-Side Dual Feeds)"
        >
          <Columns size={15} />
        </button>

        <button
          onClick={() => onChangeLayout('pip')}
          className={`p-1.5 rounded-lg transition ${
            layout === 'pip'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Picture-in-Picture (Corner Camera Feed)"
        >
          <PictureInPicture size={15} />
        </button>

        <button
          onClick={() => onChangeLayout('grid')}
          className={`p-1.5 rounded-lg transition ${
            layout === 'grid'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white'
          }`}
          title="Grid Layout (Up to 4 feeds)"
        >
          <Grid2X2 size={15} />
        </button>
      </div>
    </div>
  );
};
