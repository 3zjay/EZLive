'use client';

import React from 'react';
import { ScoreboardState } from '@/types/broadcast';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';

interface ScoreboardControllerProps {
  scoreboard: ScoreboardState;
  onChange: (update: Partial<ScoreboardState>) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ScoreboardController: React.FC<ScoreboardControllerProps> = ({
  scoreboard,
  onChange,
  isOpen,
  onToggleOpen,
}) => {
  const addScore = (team: 'home' | 'away', delta: number) => {
    if (team === 'home') {
      onChange({ homeScore: Math.max(0, scoreboard.homeScore + delta) });
    } else {
      onChange({ awayScore: Math.max(0, scoreboard.awayScore + delta) });
    }
  };

  const toggleClock = () => {
    onChange({ isClockRunning: !scoreboard.isClockRunning });
  };

  const togglePossession = () => {
    const next = scoreboard.possession === 'home' ? 'away' : scoreboard.possession === 'away' ? 'none' : 'home';
    onChange({ possession: next });
  };

  const nextPeriod = () => {
    onChange({ period: scoreboard.period + 1 });
  };

  const prevPeriod = () => {
    onChange({ period: Math.max(1, scoreboard.period - 1) });
  };

  return (
    <div className="bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-3 flex flex-col gap-2.5 text-white select-none z-20 w-full md:w-80">
      <div className="flex items-center justify-between pb-1 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          <span className="text-xs font-black tracking-wider uppercase text-slate-200">
            Live Scoreboard Controller
          </span>
        </div>
        <button
          onClick={onToggleOpen}
          className="text-[11px] font-bold text-sky-400 hover:text-sky-300 md:hidden"
        >
          {isOpen ? 'Minimize' : 'Expand'}
        </button>
      </div>

      <div className={`${isOpen ? 'flex' : 'hidden md:flex'} flex-col gap-3`}>
        {/* Teams & Scores Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Away Team Box */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
            <input
              type="text"
              value={scoreboard.awayTeam}
              onChange={(e) => onChange({ awayTeam: e.target.value })}
              className="w-full bg-transparent text-center font-bold text-xs uppercase text-slate-300 focus:outline-none focus:text-white border-b border-transparent focus:border-sky-500 pb-1 mb-1"
            />
            <div className="text-3xl font-black text-sky-400 mb-2 font-mono">
              {scoreboard.awayScore}
            </div>
            <div className="flex items-center gap-1 w-full justify-center">
              <button
                onClick={() => addScore('away', 1)}
                className="flex-1 py-1 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-bold transition shadow"
              >
                +1
              </button>
              <button
                onClick={() => addScore('away', 2)}
                className="flex-1 py-1 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-bold transition shadow"
              >
                +2
              </button>
              <button
                onClick={() => addScore('away', 3)}
                className="flex-1 py-1 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-bold transition shadow"
              >
                +3
              </button>
              <button
                onClick={() => addScore('away', -1)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400"
              >
                -1
              </button>
            </div>
            <div className="flex items-center justify-between w-full mt-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400 font-bold">FOULS</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onChange({ awayFouls: Math.max(0, (scoreboard.awayFouls || 0) - 1) })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-bold"
                >
                  -
                </button>
                <span className="font-mono font-black text-sky-300 w-4 text-center">{scoreboard.awayFouls || 0}</span>
                <button
                  onClick={() => onChange({ awayFouls: (scoreboard.awayFouls || 0) + 1 })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-sky-300 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Home Team Box */}
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex flex-col items-center">
            <input
              type="text"
              value={scoreboard.homeTeam}
              onChange={(e) => onChange({ homeTeam: e.target.value })}
              className="w-full bg-transparent text-center font-bold text-xs uppercase text-slate-300 focus:outline-none focus:text-white border-b border-transparent focus:border-rose-500 pb-1 mb-1"
            />
            <div className="text-3xl font-black text-rose-400 mb-2 font-mono">
              {scoreboard.homeScore}
            </div>
            <div className="flex items-center gap-1 w-full justify-center">
              <button
                onClick={() => addScore('home', 1)}
                className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold transition shadow"
              >
                +1
              </button>
              <button
                onClick={() => addScore('home', 2)}
                className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold transition shadow"
              >
                +2
              </button>
              <button
                onClick={() => addScore('home', 3)}
                className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 rounded-lg text-xs font-bold transition shadow"
              >
                +3
              </button>
              <button
                onClick={() => addScore('home', -1)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-400"
              >
                -1
              </button>
            </div>
            <div className="flex items-center justify-between w-full mt-2 pt-1.5 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400 font-bold">FOULS</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onChange({ homeFouls: Math.max(0, (scoreboard.homeFouls || 0) - 1) })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-bold"
                >
                  -
                </button>
                <span className="font-mono font-black text-rose-300 w-4 text-center">{scoreboard.homeFouls || 0}</span>
                <button
                  onClick={() => onChange({ homeFouls: (scoreboard.homeFouls || 0) + 1 })}
                  className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-rose-300 font-bold"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Game Clock & Period Bar */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleClock}
              className={`p-2 rounded-xl font-bold transition shadow ${
                scoreboard.isClockRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
              title={scoreboard.isClockRunning ? 'Pause Clock' : 'Start Clock'}
            >
              {scoreboard.isClockRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Game Clock</div>
              <input
                type="text"
                value={scoreboard.gameClock}
                onChange={(e) => onChange({ gameClock: e.target.value })}
                className="bg-transparent font-mono font-bold text-base text-slate-100 focus:outline-none w-16"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevPeriod}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="text-center px-1">
              <div className="text-[10px] font-bold text-slate-400">PERIOD</div>
              <div className="text-sm font-black text-amber-400">
                {scoreboard.period <= 4 ? `Q${scoreboard.period}` : `OT${scoreboard.period - 4}`}
              </div>
            </div>
            <button
              onClick={nextPeriod}
              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={togglePossession}
            className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
              scoreboard.possession !== 'none'
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Toggle Possession"
          >
            <ArrowLeftRight size={12} />
            <span className="text-[10px] uppercase">
              {scoreboard.possession === 'none' ? 'Poss' : scoreboard.possession}
            </span>
          </button>
        </div>

        {/* Broadcast & Venue Info */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Broadcast</label>
            <input
              type="text"
              value={scoreboard.rp1Value ?? scoreboard.broadcast ?? ''}
              placeholder="Facebook"
              onChange={(e) =>
                onChange({
                  rp1Title: scoreboard.rp1Title || 'BROADCAST',
                  rp1Value: e.target.value,
                  broadcast: e.target.value,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
          <div>
            <label className="block text-[9px] font-bold uppercase text-slate-400 mb-0.5">Venue</label>
            <input
              type="text"
              value={scoreboard.rp2Value ?? scoreboard.venue ?? ''}
              placeholder="Audley"
              onChange={(e) =>
                onChange({
                  rp2Title: scoreboard.rp2Title || 'VENUE',
                  rp2Value: e.target.value,
                  venue: e.target.value,
                })
              }
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Quick Reset & Sponsor Info */}
        <div className="flex items-center justify-between text-xs pt-1">
          <button
            onClick={() => onChange({ gameClock: '10:00', isClockRunning: false })}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition text-[11px]"
          >
            <RotateCcw size={12} /> Reset 10:00
          </button>

          <span className="text-[11px] text-slate-500">Auto-synced to Live Stream</span>
        </div>
      </div>
    </div>
  );
};
