'use client';

import React, { useMemo } from 'react';
import { scoreboardSync, resolveScoreboardSessionUser } from '@/services/scoreboardSync';

export default function ScoreboardOverlayPage() {
  const activeUser = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return resolveScoreboardSessionUser(
        params.get('user'),
        localStorage.getItem('hc_session_user'),
        scoreboardSync.getSessionInfo().sessionUser
      );
    }
    return 'isidro.pascua@gmail.com';
  }, []);

  return (
    <div className="w-screen h-screen bg-[#0d1117] overflow-hidden">
      <iframe
        src={`/overlays/control.html?user=${encodeURIComponent(activeUser)}`}
        className="w-full h-full border-0 bg-[#0d1117]"
        allow="camera; microphone; autoplay; clipboard-read; clipboard-write"
        title="Hoop Culture Scoreboard Control"
      />
    </div>
  );
}
