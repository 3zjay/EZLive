'use client';

import React, { useState, useEffect } from 'react';
import { ScoreboardState } from '@/types/broadcast';
import { Play, Pause, RotateCcw } from 'lucide-react';

export default function ScoreboardOverlayPage() {
  const [scoreboard, setScoreboard] = useState<ScoreboardState>({
    homeTeam: 'Lakers',
    awayTeam: 'Warriors',
    homeScore: 84,
    awayScore: 82,
    period: 4,
    gameClock: '02:45',
    isClockRunning: false,
    shotClock: 24,
    homeFouls: 4,
    awayFouls: 3,
    homeTimeouts: 2,
    awayTimeouts: 3,
    bannerText: 'HOOP TIMES TOURNAMENT • FINALS',
    sponsorName: 'HOOP TIMES',
    possession: 'home',
  });

  const [showControls, setShowControls] = useState(true);

  // Broadcast state changes to parent/listening broadcast studios
  const broadcastUpdate = (newState: ScoreboardState) => {
    setScoreboard(newState);

    // 1. Post to parent window (if loaded inside iframe)
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'EZ_SCOREBOARD_UPDATE',
          payload: newState,
        },
        '*'
      );
    }

    // 2. BroadcastChannel for same-origin tabs
    try {
      const channel = new BroadcastChannel('ezlive_scoreboard_channel');
      channel.postMessage({
        type: 'EZ_SCOREBOARD_UPDATE',
        payload: newState,
      });
      channel.close();
    } catch {}
  };

  // Clock countdown timer simulation
  useEffect(() => {
    if (!scoreboard.isClockRunning) return;

    const interval = setInterval(() => {
      setScoreboard((prev) => {
        const parts = prev.gameClock.split(':');
        let mins = parseInt(parts[0], 10) || 0;
        let secs = parseInt(parts[1], 10) || 0;

        let totalSecs = mins * 60 + secs;
        if (totalSecs <= 0) {
          const finished = { ...prev, isClockRunning: false, gameClock: '00:00' };
          broadcastUpdate(finished);
          return finished;
        }

        totalSecs -= 1;
        const newMins = Math.floor(totalSecs / 60);
        const newSecs = totalSecs % 60;
        const clockStr = `${newMins.toString().padStart(2, '0')}:${newSecs.toString().padStart(2, '0')}`;

        const updated = { ...prev, gameClock: clockStr };
        broadcastUpdate(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scoreboard.isClockRunning]);

  const updateScore = (team: 'home' | 'away', delta: number) => {
    const next = {
      ...scoreboard,
      homeScore: team === 'home' ? Math.max(0, scoreboard.homeScore + delta) : scoreboard.homeScore,
      awayScore: team === 'away' ? Math.max(0, scoreboard.awayScore + delta) : scoreboard.awayScore,
    };
    broadcastUpdate(next);
  };

  const toggleClock = () => {
    broadcastUpdate({
      ...scoreboard,
      isClockRunning: !scoreboard.isClockRunning,
    });
  };

  const changePeriod = (delta: number) => {
    broadcastUpdate({
      ...scoreboard,
      period: Math.max(1, scoreboard.period + delta),
    });
  };

  return (
    <div className="min-h-screen bg-transparent p-4 flex flex-col items-center justify-start text-white font-sans select-none">
      {/* Sleek Scoreboard Widget (Identical to what OBS Browser Source would render) */}
      <div className="w-full max-w-4xl bg-slate-900/95 border-2 border-slate-700/80 rounded-2xl shadow-2xl p-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4">
          {/* Away Team */}
          <div className="flex-1 bg-slate-800/90 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
            <div>
              <div className="text-xl font-black tracking-wider text-slate-100 uppercase">{scoreboard.awayTeam}</div>
              <div className="text-xs font-semibold text-slate-400">FLS: {scoreboard.awayFouls} • TO: {scoreboard.awayTimeouts}</div>
            </div>
            <div className="text-4xl font-black text-sky-400 bg-slate-950 px-4 py-1 rounded-lg border border-sky-500/30">
              {scoreboard.awayScore}
            </div>
          </div>

          {/* Clock & Period */}
          <div className="flex flex-col items-center justify-center px-6 py-2 bg-slate-950 rounded-xl border border-slate-800">
            <div className="text-amber-400 text-sm font-bold tracking-widest">
              {scoreboard.period <= 4 ? `PERIOD ${scoreboard.period}` : `OT ${scoreboard.period - 4}`}
            </div>
            <div className={`text-3xl font-mono font-black ${scoreboard.isClockRunning ? 'text-emerald-400' : 'text-slate-100'}`}>
              {scoreboard.gameClock}
            </div>
          </div>

          {/* Home Team */}
          <div className="flex-1 bg-slate-800/90 rounded-xl p-3 border border-slate-700/60 flex items-center justify-between">
            <div className="text-4xl font-black text-rose-400 bg-slate-950 px-4 py-1 rounded-lg border border-rose-500/30">
              {scoreboard.homeScore}
            </div>
            <div className="text-right">
              <div className="text-xl font-black tracking-wider text-slate-100 uppercase">{scoreboard.homeTeam}</div>
              <div className="text-xs font-semibold text-slate-400">FLS: {scoreboard.homeFouls} • TO: {scoreboard.homeTimeouts}</div>
            </div>
          </div>
        </div>

        {/* Sponsor & Ticker */}
        <div className="mt-2 text-center text-xs font-medium text-slate-400 tracking-wider">
          {scoreboard.bannerText}
        </div>
      </div>

      {/* Floating Toggle for Second Tablet Controller */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="mt-6 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-full border border-slate-700 text-slate-300 transition"
      >
        {showControls ? 'Hide Second-Tablet Controls' : 'Show Second-Tablet Controls (Operator Panel)'}
      </button>

      {/* Second Tablet Score Operator Controls */}
      {showControls && (
        <div className="mt-4 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-sm font-bold text-sky-400 mb-3 uppercase tracking-wider text-center">
            Second Tablet Controller Simulator (Operator Interface)
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Away Controls */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-center">
              <div className="font-bold text-slate-200 mb-2">{scoreboard.awayTeam}</div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => updateScore('away', 1)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold text-white shadow text-sm"
                >
                  +1
                </button>
                <button
                  onClick={() => updateScore('away', 2)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold text-white shadow text-sm"
                >
                  +2
                </button>
                <button
                  onClick={() => updateScore('away', 3)}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold text-white shadow text-sm"
                >
                  +3
                </button>
                <button
                  onClick={() => updateScore('away', -1)}
                  className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-slate-300 text-sm"
                >
                  -1
                </button>
              </div>
            </div>

            {/* Home Controls */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-center">
              <div className="font-bold text-slate-200 mb-2">{scoreboard.homeTeam}</div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => updateScore('home', 1)}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold text-white shadow text-sm"
                >
                  +1
                </button>
                <button
                  onClick={() => updateScore('home', 2)}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold text-white shadow text-sm"
                >
                  +2
                </button>
                <button
                  onClick={() => updateScore('home', 3)}
                  className="px-3 py-2 bg-rose-600 hover:bg-rose-500 rounded-lg font-bold text-white shadow text-sm"
                >
                  +3
                </button>
                <button
                  onClick={() => updateScore('home', -1)}
                  className="px-2.5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-bold text-slate-300 text-sm"
                >
                  -1
                </button>
              </div>
            </div>
          </div>

          {/* Clock & Period Action Buttons */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={toggleClock}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm shadow transition ${
                scoreboard.isClockRunning
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {scoreboard.isClockRunning ? <Pause size={16} /> : <Play size={16} />}
              {scoreboard.isClockRunning ? 'Stop Clock' : 'Start Clock'}
            </button>

            <button
              onClick={() => changePeriod(1)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-xs text-slate-200"
            >
              Next Period
            </button>

            <button
              onClick={() => broadcastUpdate({ ...scoreboard, gameClock: '10:00' })}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-xs text-slate-300"
            >
              <RotateCcw size={14} /> Reset 10:00
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
