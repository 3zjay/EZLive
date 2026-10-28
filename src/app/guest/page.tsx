'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, CheckCircle } from 'lucide-react';

export default function GuestJoinPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [guestName, setGuestName] = useState('Sideline Reporter');
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {});

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 font-black text-slate-950 flex items-center justify-center text-base">
            S
          </div>
          <span className="font-extrabold text-sm tracking-wide uppercase">
            Streamlabs Guest Greenroom
          </span>
        </div>

        {/* Camera Preview */}
        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`} />
          {isVideoOff && <div className="text-slate-500 font-bold text-sm">Camera Disabled</div>}

          {/* Status Badge */}
          <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5 text-xs font-bold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{joined ? 'Backstage Ready' : 'Testing Preview'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full transition ${
              isMuted ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>

          <button
            onClick={() => setIsVideoOff(!isVideoOff)}
            className={`p-3 rounded-full transition ${
              isVideoOff ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/50' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>
        </div>

        {/* Guest Name & Join Action */}
        {!joined ? (
          <div className="w-full space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 text-left">
                Your Name / Role
              </label>
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={() => setJoined(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black text-sm text-white transition shadow-lg shadow-emerald-950/40"
            >
              Enter Backstage Greenroom
            </button>
          </div>
        ) : (
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 w-full flex items-center justify-between text-left">
            <div>
              <div className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                <CheckCircle size={14} /> Connected Backstage
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                The studio host can now bring you onto the live stream.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
