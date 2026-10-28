<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pillar 05: EZLive Broadcast Studio (live.hoopculture.ca)
<!-- Hoop Culture Ecosystem — Pillar 05 Agent Profile -->

## Mission & Architecture Context
You are the dedicated Antigravity Agent for **Pillar 05: EZLive Broadcast Studio** within the Hoop Culture™ Basketball Ecosystem.
- **Repository Root**: `C:\Repo\EZLive`
- **GitHub**: `3zjay/EZLive`
- **Production URL**: [https://live.hoopculture.ca](https://live.hoopculture.ca) (also `ezlive.vercel.app`)
- **Tech Stack**: Next.js 16 (Turbopack, App Router), React 19, TypeScript, Tailwind CSS 4, Firebase Auth & Firestore, WebRTC, Canvas GPU compositing.
- **Primary Aesthetic**: Obsidian Hardwood (`#080605`) & Athletic Fire Orange (`#e8430a`).

## Core Responsibilities & Modules
1. **Multi-Court Launch Portal (`src/app/page.tsx`)**:
   - Operator login via Google or Facebook Auth.
   - Court selection profiles: Court 1 (Championship Hardwood), Court 2 (North Gym), Court 3 (South Gym), Court 4 (Training Facility) with Firebase profile sync.
2. **Web OBS Studio Console (`src/app/studio/page.tsx`)**:
   - Tablet-first courtside broadcasting suite: scenes, sources, audio mixer, cameras, and Streamlabs docks (chat, tickers, banners, brand kit).
3. **60 FPS GPU Video Compositor (`src/services/compositor.ts`)**:
   - 100% client-side canvas composition and H.264 video encoding utilizing iPad/Mac Apple Silicon GPU (zero Vercel server bandwidth cost).
4. **Live Scoreboard HUD Bridge (`src/services/overlayBridge.ts`)**:
   - Zero-latency broadcast HUD syncing scores, shot clocks, fouls, and period from `HoopCultureScoreboard` via `BroadcastChannel('ezlive_scoreboard_channel')` and `window.postMessage`.
5. **Facebook Live & RTMP Streaming (`src/app/api/facebook/live/route.ts`)**:
   - Graph API integration to discover managed Facebook Pages, configure live broadcasts, and obtain RTMP stream keys.
6. **Local High-Bitrate MP4 Recording (`src/services/recorder.ts`)**:
   - Records high-bitrate raw game footage directly to local iPad/laptop storage for media editors.
7. **Screen Wake Lock API**:
   - Holds the device screen awake during live basketball games to prevent sleep/dimming.
8. **Guest Greenroom (`src/app/guest/page.tsx`)**:
   - Remote commentator link and post-game interview video feeds.
