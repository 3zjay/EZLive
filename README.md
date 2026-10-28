# EZLiveStudio by HoopCulture

> The Cross-Platform, Tablet-First OBS Broadcasting Studio for Basketball Courtside Media. Mount on a tripod, select your court, overlay live scoreboards, and stream 1080p directly to Facebook Live and YouTube.

Part of the **Hoop Culture™ Ecosystem**:
- **Main Portal**: [hoopculture.ca](https://hoopculture.ca/)
- **Stats Engine**: [engine.hoopculture.ca](https://engine.hoopculture.ca/)
- **Media Lab**: [media.hoopculture.ca](https://media.hoopculture.ca/)
- **Live Scoreboard**: [scoreboard.hoopculture.ca](https://scoreboard.hoopculture.ca/)
- **Broadcast Studio**: [live.hoopculture.ca](https://ezlive.vercel.app/)

[![Vercel Deployment](https://img.shields.io/badge/Vercel-live.hoopculture.ca-black?logo=vercel)](https://ezlive.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind-4.0-e8430a?logo=tailwindcss)](https://tailwindcss.com)
[![Firebase Auth & Firestore](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-orange?logo=firebase)](https://firebase.google.com)

---

## 🏀 Core Highlights

- **EZLiveStudio by HoopCulture**: Rebranded with HoopCulture's signature dark hardwood and fire orange athletic aesthetic (`#080605` / `#e8430a`).
- **Multi-Court Session Management**: Multiple operators can broadcast from Court 1 (Championship), Court 2, Court 3, etc. independently with their assigned court profiles.
- **Per-Person Session & Firebase Sync**: Operators log in using Google or Facebook. Custom scenes, scoreboard links, and Facebook stream keys automatically sync to their profile in real-time.
- **Zero Vercel Bandwidth Cost**: 100% of 60 FPS video processing, canvas compositing, and 1080p H.264 encoding runs client-side on the iPad's Apple Silicon GPU.
- **Live Scoreboard HUD Bridge**: Real-time sync with `scoreboard.hoopculture.ca` via zero-delay event channels directly rendered into the canvas.
- **Local High-Bitrate MP4 Recording**: Saves raw game footage straight to the iPad's local storage for HoopCulture Media editing.
- **Screen Wake Lock API**: Holds screen wake lock so iPads never dim or sleep during live basketball games.

---

## 🚀 Live Endpoints

- **Landing Page & Multi-Court Portal**: [https://ezlive.vercel.app](https://ezlive.vercel.app)
- **Studio Console**: [https://ezlive.vercel.app/studio](https://ezlive.vercel.app/studio)
- **Scoreboard Operator Simulator**: [https://ezlive.vercel.app/scoreboard](https://ezlive.vercel.app/scoreboard)
- **Guest Greenroom**: [https://ezlive.vercel.app/guest](https://ezlive.vercel.app/guest)
