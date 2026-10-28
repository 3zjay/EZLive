'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Tv,
  Radio,
  Video,
  Layers,
  Sparkles,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle2,
  HardDrive,
  Flame,
  ArrowRight,
  LogIn,
  LogOut,
} from 'lucide-react';

const ECOSYSTEM_LINKS = [
  { name: 'Hoop Culture Main', url: 'https://hoopculture.ca/', label: 'hoopculture.ca' },
  { name: 'Stats Engine', url: 'https://engine.hoopculture.ca/', label: 'engine.hoopculture.ca' },
  { name: 'Media Lab', url: 'https://media.hoopculture.ca/', label: 'media.hoopculture.ca' },
  { name: 'Live Scoreboard', url: 'https://scoreboard.hoopculture.ca/', label: 'scoreboard.hoopculture.ca' },
  { name: 'EZLive Studio', url: 'https://live.hoopculture.ca/', label: 'live.hoopculture.ca', active: true },
];

const COURTS = [
  { id: 'court-1', name: 'Court 1 — Championship Hardwood', status: 'Live Ready', color: 'border-orange-500' },
  { id: 'court-2', name: 'Court 2 — North Gym', status: 'Available', color: 'border-amber-500' },
  { id: 'court-3', name: 'Court 3 — South Gym', status: 'Available', color: 'border-slate-700' },
  { id: 'court-4', name: 'Court 4 — Training Facility', status: 'Available', color: 'border-slate-700' },
];

export default function LandingPage() {
  const router = useRouter();
  const [leagueEmail, setLeagueEmail] = useState('');
  const [leaguePassword, setLeaguePassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile, authError, clearAuthError, signInGoogle, signInFacebook, signInWithCredentials, signOut, updateAssignedCourt } = useAuth();
  const [selectedCourt, setSelectedCourt] = useState(profile?.assignedCourt || COURTS[0].name);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const handleSelectCourt = async (courtName: string) => {
    setSelectedCourt(courtName);
    if (user) {
      await updateAssignedCourt(courtName);
    }
  };

  return (
    <div className="min-h-screen bg-[#080605] text-[#f2ede8] font-sans overflow-x-hidden selection:bg-[#e8430a] selection:text-white">
      {/* Top Ecosystem Bar */}
      <div className="bg-[#100d0a] border-b border-[#2a1e14] px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-[#a09080]">
            <Flame size={14} className="text-[#e8430a]" />
            <span className="hidden sm:inline">HOOP CULTURE ECOSYSTEM:</span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {ECOSYSTEM_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target={link.active ? '_self' : '_blank'}
                  rel="noreferrer"
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 ${
                    link.active
                      ? 'bg-[#e8430a] text-white shadow-sm'
                      : 'text-[#a09080] hover:text-[#f2ede8] hover:bg-[#1a1410]'
                  }`}
                >
                  <span>{link.label}</span>
                  {!link.active && <ExternalLink size={9} className="opacity-60" />}
                </a>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.photoURL} alt={user.displayName || 'Operator'} className="w-5 h-5 rounded-full border border-[#ff6b1a]" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#e8430a] text-white flex items-center justify-center text-[10px] font-bold">
                    {(user.displayName || 'O')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-slate-300 font-bold text-xs">{user.displayName}</span>
                <button
                  onClick={() => signOut()}
                  className="text-slate-400 hover:text-white text-xs underline flex items-center gap-1 ml-2"
                >
                  <LogOut size={12} />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1a1410] border border-[#3a2818] text-[#ff6b1a] hover:border-[#ff6b1a] font-bold text-xs transition"
              >
                <LogIn size={12} />
                <span>Operator Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <header className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b1a] via-[#e8430a] to-[#c8841a] flex items-center justify-center shadow-lg shadow-[#e8430a]/20 font-black text-xl text-white">
            HC
          </div>
          <div>
            <div className="text-xl font-black tracking-tight leading-none text-white flex items-center gap-2">
              <span>EZLiveStudio</span>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-[#e8430a]/20 text-[#ff6b1a] border border-[#e8430a]/30">
                PRO 1080p
              </span>
            </div>
            <div className="text-[11px] font-bold tracking-widest text-[#a09080] uppercase mt-0.5">
              BY HOOP CULTURE™
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/studio"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#e8430a] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#ff8c00] text-white font-black text-sm tracking-wide shadow-xl shadow-[#e8430a]/25 transition active:scale-95"
          >
            <Radio size={16} className="animate-pulse" />
            <span>LAUNCH STUDIO</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 pt-10 pb-20 text-center">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#e8430a]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1410] border border-[#3a2818] text-[#ff6b1a] text-xs font-bold uppercase tracking-widest mb-6">
          <Sparkles size={13} />
          <span>The Courtside Broadcast Engine • live.hoopculture.ca</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight uppercase leading-[0.95] max-w-4xl mx-auto text-white">
          OBS Studio Inside Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff6b1a] via-[#e8430a] to-[#ff8c00]">iPad & Tablet</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-[#a09080] max-w-2xl mx-auto font-medium">
          Walk into the gym carrying only a tablet. Mount it on a tripod, select your court, connect live Vercel scoreboard overlays, and stream 1080p directly to Facebook Live and YouTube.
        </p>

        {/* Primary Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/studio"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#e8430a] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#ff8c00] text-white font-black text-base uppercase tracking-wider shadow-2xl shadow-[#e8430a]/40 transition active:scale-95"
          >
            <Radio size={20} className="animate-pulse" />
            <span>Open Broadcast Studio</span>
          </Link>

          {!user && (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#140f0c] hover:bg-[#1a1410] border border-[#3a2818] text-[#f2ede8] font-bold text-base transition shadow-lg"
            >
              <LogIn size={18} className="text-[#ff6b1a]" />
              <span>Operator Sign In</span>
            </button>
          )}

          <a
            href="https://scoreboard.hoopculture.ca"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-[#140f0c] hover:bg-[#1a1410] border border-[#3a2818] text-[#a09080] hover:text-white font-bold text-base transition shadow"
          >
            <Tv size={18} />
            <span>Test Live Scoreboard</span>
          </a>
        </div>

        {/* Operator Profile Card if Logged In */}
        {user && (
          <div className="mt-8 max-w-md mx-auto p-4 rounded-2xl bg-[#140f0c] border border-[#3a2818] text-left flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt={user.displayName || 'Operator'} className="w-12 h-12 rounded-xl border-2 border-[#ff6b1a]" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#e8430a] text-white flex items-center justify-center font-black text-lg">
                  {(user.displayName || 'O')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-black text-sm text-white">{user.displayName}</div>
                <div className="text-xs text-[#ff6b1a] font-bold flex items-center gap-1 mt-0.5">
                  <MapPin size={12} />
                  <span>{profile?.assignedCourt || selectedCourt}</span>
                </div>
              </div>
            </div>
            <Link
              href="/studio"
              className="px-4 py-2 bg-[#e8430a] hover:bg-[#ff6b1a] text-white text-xs font-black uppercase rounded-xl transition"
            >
              Enter Studio
            </Link>
          </div>
        )}
      </section>

      {/* Multi-Court Session Selector */}
      <section className="max-w-7xl mx-auto px-4 py-12 border-t border-[#2a1e14]">
        <div className="text-center max-w-xl mx-auto mb-10">
          <div className="text-xs font-black uppercase tracking-widest text-[#ff6b1a] mb-2">
            MULTI-COURT TOURNAMENT ARCHITECTURE
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
            Multiple Courts. Independent Operators.
          </h2>
          <p className="text-sm text-[#a09080] mt-2">
            Broadcasting 4 games simultaneously on a weekend? Each court has its own tablet operator, individual scoreboard feed, and custom stream destination.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COURTS.map((court) => {
            const isSelected = (profile?.assignedCourt || selectedCourt) === court.name;
            return (
              <div
                key={court.id}
                onClick={() => handleSelectCourt(court.name)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-[#1a1410] border-[#e8430a] ring-2 ring-[#e8430a]/40 shadow-xl'
                    : 'bg-[#100d0a] border-[#2a1e14] hover:border-[#3a2818]'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {court.status}
                  </span>
                </div>

                <div className="text-base font-black text-white">{court.name}</div>
                <div className="text-xs text-[#a09080] mt-1">
                  1080p60 Camera • Scoreboard Bridge • MP4 Rec
                </div>

                <div className="mt-4 pt-3 border-t border-[#2a1e14] flex items-center justify-between text-xs font-bold">
                  <span className={isSelected ? 'text-[#ff6b1a]' : 'text-slate-400'}>
                    {isSelected ? '✓ Assigned Court' : 'Click to Select'}
                  </span>
                  <Link
                    href="/studio"
                    className="text-[#ff6b1a] hover:underline"
                  >
                    Open Studio →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Breakdown: Why This Replaces OBS & Laptops */}
      <section className="max-w-7xl mx-auto px-4 py-16 border-t border-[#2a1e14]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#100d0a] border border-[#2a1e14]">
            <div className="w-12 h-12 rounded-xl bg-[#e8430a]/15 text-[#ff6b1a] flex items-center justify-center mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-black uppercase text-white mb-2">
              No Laptop. Zero Hardware Encoders.
            </h3>
            <p className="text-sm text-[#a09080]">
              Eliminates the heavy laptop, Camo Studio phone tethering, HDMI capture cards, and home RTX 3090 PCs. The iPad Pro handles 100% of the canvas rendering and encoding.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#100d0a] border border-[#2a1e14]">
            <div className="w-12 h-12 rounded-xl bg-[#c8841a]/15 text-amber-400 flex items-center justify-center mb-4">
              <Tv size={24} />
            </div>
            <h3 className="text-lg font-black uppercase text-white mb-2">
              Live Vercel Scoreboards
            </h3>
            <p className="text-sm text-[#a09080]">
              Direct real-time integration with <code className="text-amber-300">scoreboard.hoopculture.ca</code>. When the scorekeeper updates the game on a second tablet, the graphics update on stream instantly.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#100d0a] border border-[#2a1e14]">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-4">
              <HardDrive size={24} />
            </div>
            <h3 className="text-lg font-black uppercase text-white mb-2">
              Instant Local MP4 Recording
            </h3>
            <p className="text-sm text-[#a09080]">
              Records the full broadcast with overlays straight to your iPad Files or Photos app in high-bitrate MP4. Zero cloud storage fees; ready for Hoop Culture media production immediately.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a1e14] bg-[#100d0a] py-12 px-4 text-xs text-[#a09080]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#e8430a] text-white flex items-center justify-center font-black">
              HC
            </div>
            <div>
              <div className="font-black text-white text-sm">EZLiveStudio by HoopCulture™</div>
              <div className="text-[11px] text-[#a09080]">Powering basketball broadcasting worldwide • live.hoopculture.ca</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <a href="https://hoopculture.ca" className="hover:text-white transition">hoopculture.ca</a>
            <span>•</span>
            <a href="https://engine.hoopculture.ca" className="hover:text-white transition">engine.hoopculture.ca</a>
            <span>•</span>
            <a href="https://media.hoopculture.ca" className="hover:text-white transition">media.hoopculture.ca</a>
            <span>•</span>
            <a href="https://scoreboard.hoopculture.ca" className="hover:text-white transition">scoreboard.hoopculture.ca</a>
            <span>•</span>
            <Link href="/studio" className="text-[#ff6b1a] font-bold hover:underline">Studio Console</Link>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#140f0c] border border-[#3a2818] rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#e8430a] text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#e8430a]/30 font-black text-xl">
              HC
            </div>
            <h3 className="text-lg font-black text-[#f2ede8] uppercase tracking-wide">
              Operator Sign In
            </h3>
            <div className="text-[11px] font-bold text-[#ff6b1a] uppercase tracking-wider mb-3">
              Hoop Culture Ecosystem
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 bg-red-950/70 border border-red-500/50 rounded-xl text-left text-xs text-red-200 mb-4">
                <p className="font-semibold">{authError}</p>
              </div>
            )}

            <div className="space-y-2.5">
              <button
                onClick={async () => {
                  try {
                    const u = await signInGoogle();
                    if (u) {
                      setIsAuthModalOpen(false);
                      router.push('/studio');
                    }
                  } catch (e) {
                    // handled by authError
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    const u = await signInFacebook();
                    if (u) {
                      setIsAuthModalOpen(false);
                      router.push('/studio');
                    }
                  } catch (e) {
                    // handled by authError
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1877F2] text-white rounded-xl font-bold text-xs hover:bg-[#166fe5] transition shadow"
              >
                <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Continue with Facebook</span>
              </button>
            </div>

            <div className="flex items-center my-4">
              <div className="flex-1 border-b border-[#2a1e14]"></div>
              <span className="px-3 text-[10px] uppercase font-bold text-slate-500 tracking-wider">or league credentials</span>
              <div className="flex-1 border-b border-[#2a1e14]"></div>
            </div>

            {/* League Email & Password Login */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                try {
                  const u = await signInWithCredentials(leagueEmail, leaguePassword);
                  if (u) {
                    setIsAuthModalOpen(false);
                    router.push('/studio');
                  }
                } catch (err) {
                  // error handled by authError
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-3 text-left"
            >
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  League Email
                </label>
                <input
                  type="email"
                  required
                  value={leagueEmail}
                  onChange={(e) => setLeagueEmail(e.target.value)}
                  placeholder="admin@hoopculture.ca"
                  className="w-full bg-black/60 border border-[#3a2818] rounded-xl px-3 py-2 text-xs text-[#f2ede8] focus:outline-none focus:border-[#e8430a]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={leaguePassword}
                  onChange={(e) => setLeaguePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-black/60 border border-[#3a2818] rounded-xl px-3 py-2 text-xs text-[#f2ede8] focus:outline-none focus:border-[#e8430a]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !leagueEmail || !leaguePassword}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-[#e8430a] to-[#ff6b1a] hover:from-[#ff6b1a] hover:to-[#ff8c00] disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wide transition shadow"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In to Studio'}
              </button>
            </form>

            <button
              onClick={() => {
                clearAuthError();
                setIsAuthModalOpen(false);
              }}
              className="mt-4 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
