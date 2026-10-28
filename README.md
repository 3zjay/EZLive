# EZLive — Web Broadcast Studio

A lightweight, high-performance, cross-platform OBS/Streamlabs-style Progressive Web Application (PWA) built for basketball live streaming, multi-scene production, real-time scoreboard overlays, and high-definition game recording directly from an iPad, mobile device, or laptop browser.

[![Production Deployment](https://img.shields.io/badge/Vercel-ezlive.vercel.app-black?logo=vercel)](https://ezlive.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com)

---

## 🏀 Core Highlights

- **Tablet-First Broadcasting**: Walk into a gym with just an iPad Pro on a tripod. No laptop, external hardware encoder, or home computer required.
- **Streamlabs & OBS Workflow**: Backstage feeds strip, multi-feed scene switcher, stage preview with red drag-and-resize bounding box handles, source layer ordering, and layout modes (Solo, Split, PiP, Grid).
- **Live Scoreboard HUD & Bridge**: Seamless zero-delay sync with external Vercel scoreboards (e.g. `scoreboard.hoopculture.ca`) via `postMessage`, `BroadcastChannel`, and real-time state listeners rendered directly onto the 60 FPS Canvas compositor.
- **Direct Local MP4 Recording**: High-bitrate H.264/MP4 recording (`MediaRecorder`) mixed directly from the composited canvas and court microphone, downloading ready-to-edit game footage instantly.
- **Remote Guest Greenroom (`/guest`)**: WebRTC guest link generator allowing courtside commentators or interviewees to join the broadcast with zero software installation.
- **Automated Facebook Live Integration**: Streamlabs-style Facebook Page connect flow via Meta Graph API (`/api/facebook/live`) with direct WHIP/RTMPS streaming relay configuration.
- **PWA Ready**: Installable to iOS/Android home screens as a standalone full-screen native-like app with SSL camera/mic permissions.

---

## 🚀 Live Studio URL

- **Production App**: [https://ezlive.vercel.app](https://ezlive.vercel.app)
- **Scoreboard Operator Simulator**: [https://ezlive.vercel.app/scoreboard](https://ezlive.vercel.app/scoreboard)
- **Guest Greenroom**: [https://ezlive.vercel.app/guest](https://ezlive.vercel.app/guest)

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 + Lucide React Icons
- **Compositor**: Custom 60 FPS HTML5 Canvas 2D engine with aspect-ratio fitting and multi-layer blending
- **Video Transport**: MediaStream API, MediaRecorder, WebRTC / WHIP relay support
- **Hosting & CI/CD**: Vercel connected to GitHub repository `3zjay/EZLive`

---

## 📋 Getting Started Locally

```bash
# Clone the repository
git clone https://github.com/3zjay/EZLive.git
cd EZLive

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

To test on a physical iPad or smartphone on the local network, ensure HTTPS or access the live Vercel deployment at [https://ezlive.vercel.app](https://ezlive.vercel.app).
