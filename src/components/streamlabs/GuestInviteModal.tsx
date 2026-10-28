'use client';

import React, { useState } from 'react';
import { X, Copy, Check, Shield, Users } from 'lucide-react';

interface GuestInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuestInviteModal: React.FC<GuestInviteModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.origin : 'https://ezlive.vercel.app';
  const guestLink = `${currentHost}/guest?room=hooptimes-court1`;

  const handleCopy = () => {
    navigator.clipboard.writeText(guestLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 select-none text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white tracking-wide uppercase">
              Streamlabs Instant Guest Invite
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-slate-300">
          <p className="text-xs text-slate-400">
            Send this link to a sideline reporter, co-host, or guest. They can join your broadcast from any phone, tablet, or laptop <b>without downloading any software</b>.
          </p>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Guest Direct Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={guestLink}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center gap-1 transition shadow"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start gap-2.5 text-slate-400 text-[11px]">
            <Shield size={16} className="text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-slate-200 mb-0.5">Backstage Screening Room</div>
              <div>
                Guests will enter backstage first. You have complete control to toggle them onto the live stream canvas whenever you are ready.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
