const fs = require('fs');

// 1. Update PreviewStage.tsx for GPU layer isolation (anti-flicker on Samsung Fold)
const stagePath = 'C:/Repo/EZLive/src/components/studio/PreviewStage.tsx';
let stageContent = fs.readFileSync(stagePath, 'utf8');

stageContent = stageContent.replace(
  'className="relative w-full h-full max-w-[1920px] max-h-[1080px] aspect-video flex items-center justify-center bg-slate-950 shadow-2xl touch-none"',
  'className="relative w-full h-full max-w-[1920px] max-h-[1080px] aspect-video flex items-center justify-center bg-slate-950 shadow-2xl touch-none" style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}'
);

stageContent = stageContent.replace(
  'className="w-full h-full object-contain pointer-events-none"',
  'className="w-full h-full object-contain pointer-events-none" style={{ transform: "translateZ(0)", backfaceVisibility: "hidden" }}'
);

stageContent = stageContent.replace(
  'zIndex: source.zIndex + 10,\n              }}',
  'zIndex: source.zIndex + 10,\n                transform: "translateZ(0)",\n                backfaceVisibility: "hidden",\n              }}'
);
stageContent = stageContent.replace(
  'zIndex: source.zIndex + 10,\r\n              }}',
  'zIndex: source.zIndex + 10,\r\n                transform: "translateZ(0)",\r\n                backfaceVisibility: "hidden",\r\n              }}'
);

fs.writeFileSync(stagePath, stageContent, 'utf8');
console.log('Fixed PreviewStage.tsx GPU layer isolation for Samsung Fold anti-flicker');

// 2. Update src/app/studio/page.tsx - Throttle audioLevel & improve mobile MediaRecorder mime selection
const pagePath = 'C:/Repo/EZLive/src/app/studio/page.tsx';
let pageContent = fs.readFileSync(pagePath, 'utf8');

// Throttle audio level updates to eliminate 10Hz DOM thrashing
const oldAudioInterval = `      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
      }, 100);`;

const newAudioInterval = `      if (audioLevelInterval.current) clearInterval(audioLevelInterval.current);
      audioLevelInterval.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const newLevel = Math.min(100, Math.round((avg / 128) * 100));
        setAudioLevel((prev) => (Math.abs(prev - newLevel) > 15 ? newLevel : prev));
      }, 400);`;

pageContent = pageContent.replace(oldAudioInterval, newAudioInterval);

// Improve mobile mime types in startRelayPipeline
const oldMimePick = `          const mime = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=h264')
            ? 'video/webm;codecs=h264'
            : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
            ? 'video/webm;codecs=vp8'
            : 'video/webm';`;

const newMimePick = `          let mime = 'video/webm';
          if (typeof MediaRecorder !== 'undefined') {
            if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
              mime = 'video/webm;codecs=vp8,opus';
            } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
              mime = 'video/webm;codecs=h264,opus';
            } else if (MediaRecorder.isTypeSupported('video/webm')) {
              mime = 'video/webm';
            } else if (MediaRecorder.isTypeSupported('video/mp4')) {
              mime = 'video/mp4';
            }
          }`;

pageContent = pageContent.replace(oldMimePick, newMimePick);

fs.writeFileSync(pagePath, pageContent, 'utf8');
console.log('Fixed audioLevel interval and mobile mime types in studio/page.tsx');
