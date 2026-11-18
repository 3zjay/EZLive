'use client';

import React, { useState } from 'react';
import { ScoreboardState } from '@/types/broadcast';
import { resolveScoreboardSessionUser } from '@/services/scoreboardSync';
import { ExternalLink } from 'lucide-react';

interface ScoreboardControllerProps {
  scoreboard?: ScoreboardState;
  onChange?: (update: Partial<ScoreboardState>) => void;
  sessionUser?: string;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ScoreboardController: React.FC<ScoreboardControllerProps> = ({
  sessionUser,
  isOpen,
  onToggleOpen,
}) => {
  const [subMode, setSubMode] = useState<'control' | 'shotclock'>('control');
  const activeUser = resolveScoreboardSessionUser(
    sessionUser,
    typeof window !== 'undefined' ? localStorage.getItem('hc_session_user') : null
  );
  const iframeSrc = `/overlays/${subMode}.html?user=${encodeURIComponent(activeUser)}&embed=1`;

  return (
    <div className="bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-2.5 flex flex-col gap-2 text-white select-none z-20 w-full md:w-96 h-full">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#e8430a]" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">
            Hoop Culture Scoreboard
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSubMode('control')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              subMode === 'control' ? 'bg-[#e8430a] text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setSubMode('shotclock')}
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              subMode === 'shotclock' ? 'bg-[#e8430a] text-white' : 'bg-slate-800 text-slate-400'
            }`}
          >
            Shot
          </button>
          <a
            href={`/overlays/${subMode}.html?user=${encodeURIComponent(activeUser)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sky-400 hover:text-sky-300"
            title="Open Full Controller"
          >
            <ExternalLink size={12} />
          </a>
          <button
            onClick={onToggleOpen}
            className="text-[11px] font-bold text-sky-400 hover:text-sky-300 md:hidden"
          >
            {isOpen ? 'Minimize' : 'Expand'}
          </button>
        </div>
      </div>

      <div className={`${isOpen ? 'flex' : 'hidden md:flex'} flex-1 min-h-[420px] flex-col`}>
        <iframe
          key={`${subMode}-${activeUser}`}
          src={iframeSrc}
          className="w-full flex-1 h-full rounded-xl border border-slate-800 bg-[#0d1117]"
          allow="camera; microphone; autoplay"
          title="Hoop Culture Scoreboard Controller"
        />
      </div>
    </div>
  );
};
