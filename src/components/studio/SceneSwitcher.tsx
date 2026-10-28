'use client';

import React from 'react';
import { SceneConfig, SceneType } from '@/types/broadcast';
import { Play, Sparkles, UserCheck, Award, Coffee, Tv } from 'lucide-react';

interface SceneSwitcherProps {
  scenes: SceneConfig[];
  activeSceneId: SceneType;
  onSelectScene: (scene: SceneConfig) => void;
}

export const SceneSwitcher: React.FC<SceneSwitcherProps> = ({
  scenes,
  activeSceneId,
  onSelectScene,
}) => {
  const getIcon = (id: SceneType) => {
    switch (id) {
      case 'game':
        return <Play size={18} className="fill-current" />;
      case 'intro':
        return <Sparkles size={18} />;
      case 'interview':
        return <UserCheck size={18} />;
      case 'sponsor':
        return <Award size={18} />;
      case 'halftime':
        return <Coffee size={18} />;
      default:
        return <Tv size={18} />;
    }
  };

  return (
    <div className="bg-slate-950/95 border-t border-slate-800 p-2.5 flex items-center justify-between gap-3 overflow-x-auto select-none z-20">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">
        <span>SCENES</span>
      </div>

      <div className="flex items-center gap-2.5 flex-1 max-w-4xl">
        {scenes.map((scene) => {
          const isActive = scene.id === activeSceneId;
          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(scene)}
              className={`flex-1 min-w-[130px] h-14 rounded-xl px-3 py-1.5 flex flex-col items-center justify-center gap-1 transition-all duration-150 active:scale-95 border ${
                isActive
                  ? 'bg-gradient-to-b from-red-600 to-rose-700 border-red-400 text-white shadow-lg shadow-rose-950/60 ring-2 ring-red-500/40'
                  : 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  {getIcon(scene.id)}
                </span>
                <span className="font-extrabold text-xs tracking-wide uppercase">
                  {scene.name}
                </span>
              </div>
              <span className={`text-[10px] truncate max-w-[120px] ${isActive ? 'text-rose-100 font-medium' : 'text-slate-500'}`}>
                {scene.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Transition Mode Badge */}
      <div className="hidden lg:flex flex-col items-end text-[11px] text-slate-400 pr-2">
        <span className="text-slate-500 font-semibold uppercase text-[10px]">TRANSITION</span>
        <span className="text-sky-400 font-bold">Auto Cross-Fade (400ms)</span>
      </div>
    </div>
  );
};
