import { Scene, ScoreboardSource, ScoreboardState, Source } from '@/types/broadcast';
import { BrandKit, ChatMessage, NewsTickerConfig, StageLayout, StreamlabsBanner } from '@/types/streamlabs';

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;
  private streamCanvas: HTMLCanvasElement;
  private streamCtx: CanvasRenderingContext2D;
  private activeCtx: CanvasRenderingContext2D;

  private get ctx(): CanvasRenderingContext2D {
    return this.activeCtx;
  }

  private videoElement: HTMLVideoElement | null = null;
  private screenShareElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private targetFps: number = 60; // 60 FPS sports broadcast default
  private width: number = 1920;
  private height: number = 1080;
  // Dedicated stream broadcast resolution (defaults to Full HD 1080p @ 60 FPS sports broadcast standard)
  private streamWidth: number = 1920;
  private streamHeight: number = 1080;

  // Scene transition state
  private currentScene: Scene;
  private previousScene: Scene | null = null;
  private transitionAlpha: number = 1;
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 400; // ms

  // Audio Context and destination stream
  private audioContext: AudioContext | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private audioDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private compositeStream: MediaStream | null = null;

  // Streamlabs Features (clean defaults, no demo text)
  public layout: StageLayout = 'solo';
  public highlightedChat: ChatMessage | null = null;
  public tickerConfig: NewsTickerConfig = {
    enabled: false,
    text: '',
    speed: 120, // px per second
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    textColor: '#f8fafc',
    fontSize: 20,
  };
  public activeBanner: StreamlabsBanner | null = null;
  public brandKit: BrandKit = {
    logoUrl: '',
    logoPosition: 'top-right',
    logoWidth: 180,
    logoHeight: 60,
    primaryColor: '#e8430a',
    accentColor: '#f59e0b',
    backgroundType: 'dark',
  };

  // Scoreboard state reference
  private scoreboard: ScoreboardState;

  // Image cache
  private imageCache: Map<string, HTMLImageElement> = new Map();

  // Metrics
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = performance.now();
  public currentFps: number = 0;

  // Ticker offset tracking
  private tickerOffset: number = 0;
  private lastTickerTimestamp: number = performance.now();
  private lastStreamFrameTime: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    initialScene: Scene,
    initialScoreboard: ScoreboardState
  ) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!context) {
      throw new Error('Failed to obtain 2D rendering context from canvas');
    }
    this.previewCtx = context;
    this.activeCtx = context;

    // Dedicated offscreen canvas for broadcasting stream to Facebook Live (includes Scoreboard HUD)
    // 1280x720 (720p60) is the official broadcast standard for Facebook Live and guarantees 2.5-3.5 Mbps bitrate
    this.streamCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : ({} as HTMLCanvasElement);
    if (typeof this.streamCanvas.getContext === 'function') {
      this.streamCanvas.width = this.streamWidth;
      this.streamCanvas.height = this.streamHeight;
      this.streamCtx = this.streamCanvas.getContext('2d', { alpha: false })!;
    } else {
      this.streamCtx = context;
    }

    this.currentScene = initialScene;
    this.scoreboard = initialScoreboard;
  }

  public setVideoSource(video: HTMLVideoElement | null) {
    this.videoElement = video;
  }

  public setScreenShareSource(video: HTMLVideoElement | null) {
    this.screenShareElement = video;
  }

  public updateScoreboard(scoreboard: ScoreboardState) {
    this.scoreboard = scoreboard;
  }

  public setTargetFps(fps: number) {
    const newFps = fps > 0 ? fps : 30;
    if (this.targetFps !== newFps) {
      this.targetFps = newFps;
      this.resetCompositeStream();
    }
  }

  public resetCompositeStream() {
    if (this.compositeStream) {
      try {
        this.compositeStream.getTracks().forEach((t) => t.stop());
      } catch {}
      this.compositeStream = null;
    }
  }

  public setScene(scene: Scene, durationMs: number = 400) {
    if (this.currentScene.id === scene.id) {
      this.currentScene = scene;
      return;
    }
    if (durationMs <= 0) {
      this.currentScene = scene;
      this.previousScene = null;
      this.isTransitioning = false;
      this.transitionAlpha = 1;
      return;
    }
    this.previousScene = this.currentScene;
    this.currentScene = scene;
    this.transitionDuration = durationMs;
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionAlpha = 0;
  }

  public updateCurrentScene(scene: Scene) {
    this.currentScene = scene;
  }

  public start() {
    if (this.animationFrameId !== null) return;
    const renderLoop = (timestamp: number) => {
      this.render(timestamp);
      this.animationFrameId = requestAnimationFrame(renderLoop);
    };
    this.animationFrameId = requestAnimationFrame(renderLoop);
  }

  public stop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  public getCompositeStream(micStream?: MediaStream | null): MediaStream {
    // If previous compositeStream tracks are still active and have audio, reuse
    if (this.compositeStream) {
      const vTrack = this.compositeStream.getVideoTracks()[0];
      const aTrack = this.compositeStream.getAudioTracks()[0];
      if (vTrack && vTrack.readyState === 'live' && aTrack && aTrack.readyState === 'live') {
        return this.compositeStream;
      }
    }

    const targetCanvas = (this.streamCanvas && this.streamCanvas.width > 0) ? this.streamCanvas : this.canvas;
    const canvasWithCapture = targetCanvas as HTMLCanvasElement & {
      captureStream?(fps?: number): MediaStream;
      mozCaptureStream?(fps?: number): MediaStream;
    };

    const streamFps = this.targetFps || 30;
    const canvasStream = canvasWithCapture.captureStream
      ? canvasWithCapture.captureStream(streamFps)
      : canvasWithCapture.mozCaptureStream
        ? canvasWithCapture.mozCaptureStream(streamFps)
        : new MediaStream();

    const videoTrack = canvasStream.getVideoTracks()[0];
    const tracks: MediaStreamTrack[] = [videoTrack];

    if (micStream && micStream.getAudioTracks().length > 0) {
      // Direct track addition avoids AudioContext suspension on mobile iOS Safari / Android Chrome
      tracks.push(micStream.getAudioTracks()[0]);
    } else {
      // Generate synthetic silent audio track so MediaRecorder and Facebook Live RTMP always have audio
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0; // complete silence
        osc.connect(gain);
        const dest = ctx.createMediaStreamDestination();
        gain.connect(dest);
        osc.start();
        const silentTrack = dest.stream.getAudioTracks()[0];
        if (silentTrack) {
          tracks.push(silentTrack);
        }
      } catch (err) {
        console.warn('AudioContext silent fallback error:', err);
      }
    }

    this.compositeStream = new MediaStream(tracks);
    return this.compositeStream;
  }

  private render(timestamp: number) {
    this.frameCount++;
    if (timestamp - this.lastFpsUpdateTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdateTime));
      this.frameCount = 0;
      this.lastFpsUpdateTime = timestamp;
    }

    if (this.isTransitioning) {
      const elapsed = timestamp - this.transitionStartTime;
      this.transitionAlpha = Math.min(1, elapsed / this.transitionDuration);
      if (this.transitionAlpha >= 1) {
        this.isTransitioning = false;
        this.previousScene = null;
      }
    }

    // 1. Render Preview Stage (phone screen: camera + overlays via DOM iframe, NO canvas duplicate)
    this.activeCtx = this.previewCtx;
    this.renderStage(false, timestamp);

    // 2. Render Broadcast Stream Stage (off-screen canvas captured for Facebook Live: camera + synced HUD)
    // Strictly throttled to targetFps (e.g. 30 FPS) so high-refresh screens (90Hz/120Hz) do not flood Facebook with 72-120 FPS
    const streamIntervalMs = 1000 / (this.targetFps || 30);
    if (this.streamCtx && this.streamCtx !== this.previewCtx) {
      if (timestamp - this.lastStreamFrameTime >= streamIntervalMs - 3) {
        this.lastStreamFrameTime = timestamp;
        this.activeCtx = this.streamCtx;
        this.streamCtx.save();
        this.streamCtx.scale(this.streamWidth / this.width, this.streamHeight / this.height);
        this.renderStage(true, timestamp);
        this.streamCtx.restore();
      }
    }
  }

  public setStreamResolution(width: number, height: number) {
    if (this.streamWidth !== width || this.streamHeight !== height) {
      this.streamWidth = width;
      this.streamHeight = height;
      if (this.streamCanvas) {
        this.streamCanvas.width = width;
        this.streamCanvas.height = height;
      }
      this.resetCompositeStream();
    }
  }

  private renderStage(isStream: boolean, timestamp: number) {
    const { ctx, width, height } = this;

    // 1. Base Stage Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // 2. Render previous scene if transitioning
    if (this.isTransitioning && this.previousScene) {
      ctx.save();
      ctx.globalAlpha = 1 - this.transitionAlpha;
      this.renderSceneSources(this.previousScene, isStream);
      ctx.restore();
    }

    // 3. Render current active scene
    ctx.save();
    if (this.isTransitioning) {
      ctx.globalAlpha = this.transitionAlpha;
    }
    this.renderSceneSources(this.currentScene, isStream);
    ctx.restore();

    // 4. Streamlabs Overlay Layer: Active Banners
    if (this.activeBanner && this.activeBanner.enabled) {
      this.drawStreamlabsBanner(this.activeBanner);
    }

    // 5. Streamlabs Overlay Layer: "Show on Stream" Highlighted Chat Comment
    if (this.highlightedChat) {
      this.drawHighlightedChatCard(this.highlightedChat);
    }

    // 6. Streamlabs Overlay Layer: Brand Kit Logo Watermark
    if (this.brandKit.logoUrl) {
      this.drawBrandLogo();
    }

    // 7. Streamlabs Overlay Layer: Smooth Scrolling News Ticker
    if (this.tickerConfig.enabled) {
      this.drawScrollingTicker(timestamp);
    }
  }

  private renderSceneSources(scene: Scene, isStream: boolean) {
    const sorted = [...scene.sources].sort((a, b) => a.zIndex - b.zIndex);
    for (const source of sorted) {
      if (!source.visible) continue;
      this.renderSource(source, isStream);
    }
  }

  private renderSource(source: Source, isStream: boolean) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, source.opacity ?? 1));

    switch (source.type) {
      case 'camera':
        this.drawCameraSource(source);
        break;
      case 'scoreboard':
        this.drawScoreboardSource(source);
        break;
      case 'text':
        this.drawTextSource(source);
        break;
      case 'image':
        this.drawImageSource(source);
        break;
      case 'color_solid':
        this.drawColorSolidSource(source);
        break;
      case 'browser_url':
        if (isStream) {
          this.drawBrowserSourcePlaceholder(source);
        }
        break;
    }

    ctx.restore();
  }

  // --- Camera Rendering with Multi-Layout Support (Solo, Split, PIP) ---
  private drawCameraSource(source: Source) {
    if (source.type !== 'camera') return;
    const { ctx } = this;

    const hasCameraFeed =
      this.videoElement &&
      (this.videoElement.videoWidth > 0 || this.videoElement.readyState >= 2);

    if (!this.videoElement || !hasCameraFeed) {
      ctx.fillStyle = '#090d16';
      ctx.fillRect(source.x, source.y, source.width, source.height);
      ctx.fillStyle = '#334155';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'CONNECTING CAMERA...',
        source.x + source.width / 2,
        source.y + source.height / 2
      );
      return;
    }

    // Layout Mode: SOLO
    if (this.layout === 'solo') {
      this.drawVideoAspectFit(this.videoElement, source.x, source.y, source.width, source.height, source.fit);
      return;
    }

    // Layout Mode: SPLIT (Two equal side-by-side feeds)
    if (this.layout === 'split') {
      const halfW = source.width / 2 - 12;
      // Feed 1 (Host Camera)
      this.drawVideoAspectFit(this.videoElement, source.x + 8, source.y + 40, halfW, source.height - 80, 'cover');

      // Feed 2 (Screen share or secondary guest feed)
      const feed2 = this.screenShareElement && this.screenShareElement.readyState >= 2 ? this.screenShareElement : this.videoElement;
      this.drawVideoAspectFit(feed2, source.x + halfW + 24, source.y + 40, halfW, source.height - 80, 'cover');
      return;
    }

    // Layout Mode: PIP (Picture-In-Picture in corner)
    if (this.layout === 'pip') {
      // Main background (e.g. court or screen)
      const bgVideo = this.screenShareElement && this.screenShareElement.readyState >= 2 ? this.screenShareElement : this.videoElement;
      this.drawVideoAspectFit(bgVideo, source.x, source.y, source.width, source.height, 'cover');

      // Corner Host Camera Box
      const pipW = 480;
      const pipH = 270;
      const pipX = source.x + source.width - pipW - 40;
      const pipY = source.y + source.height - pipH - 80;

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 24;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      this.roundRect(ctx, pipX, pipY, pipW, pipH, 16);
      ctx.stroke();
      ctx.clip();
      this.drawVideoAspectFit(this.videoElement, pipX, pipY, pipW, pipH, 'cover');
      ctx.restore();
      return;
    }

    // Default Fallback
    this.drawVideoAspectFit(this.videoElement, source.x, source.y, source.width, source.height, source.fit);
  }

  private drawVideoAspectFit(
    video: HTMLVideoElement,
    x: number,
    y: number,
    w: number,
    h: number,
    fit: 'cover' | 'contain' | 'fill' = 'cover'
  ) {
    const { ctx } = this;
    const vWidth = video.videoWidth || 1920;
    const vHeight = video.videoHeight || 1080;

    let sx = 0,
      sy = 0,
      sWidth = vWidth,
      sHeight = vHeight;

    if (fit === 'cover') {
      const vAspect = vWidth / vHeight;
      const tAspect = w / h;
      if (vAspect > tAspect) {
        sWidth = vHeight * tAspect;
        sx = (vWidth - sWidth) / 2;
      } else {
        sHeight = vWidth / tAspect;
        sy = (vHeight - sHeight) / 2;
      }
    }

    ctx.drawImage(video, sx, sy, sWidth, sHeight, x, y, w, h);
  }

  // --- Scoreboard HUD Source (With 4 Hoop Culture Themes) ---
  private drawScoreboardSource(source: Source) {
    if (source.type !== 'scoreboard') return;

    const sbSource = source as ScoreboardSource;
    switch (sbSource.theme) {
      case 'nbaoverlay2':
      case 'nba_neon':
        this.drawNbaOverlay2Theme(sbSource);
        break;
      case 'fullscreen_bar':
        this.drawFullscreenBarTheme(sbSource);
        break;
      case 'nba_classic':
        this.drawNbaClassicTheme(sbSource);
        break;
      case 'nbc':
      default:
        this.drawNbcTheme(sbSource);
        break;
    }
  }

  private darkenColor(hex: string, pct = 0.5): string {
    if (!hex || hex[0] !== '#' || hex.length < 7) return '#111111';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r * pct)}, ${Math.round(g * pct)}, ${Math.round(b * pct)})`;
  }

  private getOrLoadImage(url?: string | null): HTMLImageElement | null {
    if (!url) return null;
    let img = this.imageCache.get(url);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = url;
      this.imageCache.set(url, img);
    }
    return img.complete && img.naturalWidth > 0 ? img : null;
  }

  // ?? THEME 1: NBC / NBA Pro Broadcast Bug (/nbc) ???????????????????????????
  private drawNbcTheme(source: ScoreboardSource) {
    const { ctx } = this;
    const sb = this.scoreboard;
    const scale = source.scale || 1;
    const barWidth = source.width || 1040 * scale;
    const barHeight = source.height || 116 * scale;
    const barX = source.x;
    const barY = source.y;
    const radius = 12 * scale;

    const homeColor = sb.homeColor || '#f5c842';
    const awayColor = sb.awayColor || '#c8102e';

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
    ctx.shadowBlur = 24 * scale;
    ctx.shadowOffsetY = 6 * scale;

    // Outer container background
    ctx.fillStyle = 'rgba(10, 14, 24, 0.95)';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Metallic border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2 * scale;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.stroke();

    const segW = (barWidth - 260 * scale) / 2;

    // ? TOP STRIP: Segmented Team Accent Lines
    const stripH = 5 * scale;
    ctx.fillStyle = homeColor;
    this.roundRect(ctx, barX, barY, segW, stripH, [radius, 0, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(barX + segW, barY, 260 * scale, stripH);

    ctx.fillStyle = awayColor;
    this.roundRect(ctx, barX + segW + 260 * scale, barY, segW, stripH, [0, radius, 0, 0]);
    ctx.fill();

    // ? HOME TEAM BLOCK (Left)
    const homeLogoImg = this.getOrLoadImage(sb.homeLogo);
    const logoSize = 52 * scale;
    const logoY = barY + (barHeight - logoSize) / 2 + 2 * scale;

    // Home Logo Circle
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(barX + 40 * scale, barY + barHeight / 2 + 2 * scale, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    if (homeLogoImg) {
      ctx.clip();
      ctx.drawImage(homeLogoImg, barX + 40 * scale - logoSize / 2, logoY, logoSize, logoSize);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(sb.homeTeam.slice(0, 3).toUpperCase(), barX + 40 * scale, barY + barHeight / 2 + 7 * scale);
    }
    ctx.restore();

    // Home Text Details
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(26 * scale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(sb.homeTeam.toUpperCase(), barX + 76 * scale, barY + barHeight * 0.46);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 ${Math.round(13 * scale)}px sans-serif`;
    ctx.fillText(`FOULS: ${sb.homeFouls}  ?  TO: ${sb.homeTimeouts}`, barX + 76 * scale, barY + barHeight * 0.74);

    // Possession Arrow Home
    if (sb.possession === 'home') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(barX + segW - 100 * scale, barY + barHeight / 2 - 7 * scale);
      ctx.lineTo(barX + segW - 112 * scale, barY + barHeight / 2);
      ctx.lineTo(barX + segW - 100 * scale, barY + barHeight / 2 + 7 * scale);
      ctx.fill();
    }

    // Home Score Box
    ctx.fillStyle = '#070a12';
    this.roundRect(ctx, barX + segW - 88 * scale, barY + 14 * scale, 80 * scale, barHeight - 28 * scale, 8 * scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(40 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${sb.homeScore}`, barX + segW - 48 * scale, barY + barHeight * 0.67);

    // ? CENTER BLOCK: Clock, Period & Shot Clock
    const centerBlockX = barX + segW;
    const centerW = 260 * scale;

    ctx.fillStyle = '#05070d';
    ctx.fillRect(centerBlockX, barY + stripH, centerW, barHeight - stripH);

    // Period Indicator (Q1 / Q2 / Q3 / Q4 / OT)
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(17 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    const periodStr = sb.period <= 4 ? `PERIOD ${sb.period}` : `OT ${sb.period - 4}`;
    ctx.fillText(periodStr, centerBlockX + centerW / 2, barY + barHeight * 0.36);

    // Game Clock
    ctx.fillStyle = sb.isClockRunning ? '#22c55e' : '#ffffff';
    ctx.font = `900 ${Math.round(36 * scale)}px monospace`;
    ctx.fillText(sb.gameClock, centerBlockX + centerW / 2 - 28 * scale, barY + barHeight * 0.80);

    // Shot Clock Pill
    const scW = 46 * scale;
    const scH = 34 * scale;
    const scX = centerBlockX + centerW - scW - 16 * scale;
    const scY = barY + barHeight * 0.50;
    const scNum = sb.shotClock;
    const scColor = scNum <= 5 ? '#ef4444' : '#f97316';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.roundRect(ctx, scX, scY, scW, scH, 6 * scale);
    ctx.fill();
    ctx.strokeStyle = scColor;
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();

    ctx.fillStyle = scColor;
    ctx.font = `900 ${Math.round(22 * scale)}px monospace`;
    ctx.fillText(`${scNum}`, scX + scW / 2, scY + scH * 0.72);

    // ? AWAY TEAM BLOCK (Right)
    const awayX = centerBlockX + centerW;

    // Away Score Box
    ctx.fillStyle = '#070a12';
    this.roundRect(ctx, awayX + 8 * scale, barY + 14 * scale, 80 * scale, barHeight - 28 * scale, 8 * scale);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(40 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${sb.awayScore}`, awayX + 48 * scale, barY + barHeight * 0.67);

    // Possession Arrow Away
    if (sb.possession === 'away') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(awayX + 100 * scale, barY + barHeight / 2 - 7 * scale);
      ctx.lineTo(awayX + 112 * scale, barY + barHeight / 2);
      ctx.lineTo(awayX + 100 * scale, barY + barHeight / 2 + 7 * scale);
      ctx.fill();
    }

    // Away Text Details
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(26 * scale)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(sb.awayTeam.toUpperCase(), awayX + segW - 76 * scale, barY + barHeight * 0.46);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 ${Math.round(13 * scale)}px sans-serif`;
    ctx.fillText(`FOULS: ${sb.awayFouls}  ?  TO: ${sb.awayTimeouts}`, awayX + segW - 76 * scale, barY + barHeight * 0.74);

    // Away Logo Circle
    const awayLogoImg = this.getOrLoadImage(sb.awayLogo);
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(awayX + segW - 40 * scale, barY + barHeight / 2 + 2 * scale, logoSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    if (awayLogoImg) {
      ctx.clip();
      ctx.drawImage(awayLogoImg, awayX + segW - 40 * scale - logoSize / 2, logoY, logoSize, logoSize);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(sb.awayTeam.slice(0, 3).toUpperCase(), awayX + segW - 40 * scale, barY + barHeight / 2 + 7 * scale);
    }
    ctx.restore();

    ctx.restore();
  }

  // ?? THEME 2: Classic NBA Scorebug (/nbaoverlay) ???????????????????????????
  private drawNbaClassicTheme(source: ScoreboardSource) {
    const { ctx } = this;
    const sb = this.scoreboard;
    const scale = source.scale || 1;
    const barWidth = source.width || 880 * scale;
    const barHeight = source.height || 100 * scale;
    const barX = source.x;
    const barY = source.y;
    const radius = 10 * scale;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 18 * scale;

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Top Header Ticker
    const topH = 26 * scale;
    ctx.fillStyle = '#0f172a';
    this.roundRect(ctx, barX, barY, barWidth, topH, [radius, radius, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(
      (sb.bannerText || 'HOOP CULTURE NETWORK ? LIVE BROADCAST').toUpperCase(),
      barX + barWidth / 2,
      barY + topH * 0.70
    );

    const mainY = barY + topH;
    const mainH = barHeight - topH;
    const sideW = (barWidth - 220 * scale) / 2;

    // Home Block
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, barX, mainY, sideW, mainH, [0, 0, 0, radius]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(28 * scale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(sb.homeTeam.toUpperCase(), barX + 24 * scale, mainY + mainH * 0.62);

    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 ${Math.round(36 * scale)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${sb.homeScore}`, barX + sideW - 20 * scale, mainY + mainH * 0.66);

    // Center Clock
    const cX = barX + sideW;
    const cW = 220 * scale;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(cX, mainY, cW, mainH);

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(14 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`Q${sb.period}  ?  :${sb.shotClock}`, cX + cW / 2, mainY + mainH * 0.38);

    ctx.fillStyle = sb.isClockRunning ? '#22c55e' : '#ffffff';
    ctx.font = `900 ${Math.round(30 * scale)}px monospace`;
    ctx.fillText(sb.gameClock, cX + cW / 2, mainY + mainH * 0.82);

    // Away Block
    const aX = cX + cW;
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, aX, mainY, sideW, mainH, [0, 0, radius, 0]);
    ctx.fill();

    ctx.fillStyle = '#f43f5e';
    ctx.font = `900 ${Math.round(36 * scale)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${sb.awayScore}`, aX + 20 * scale, mainY + mainH * 0.66);

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(28 * scale)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(sb.awayTeam.toUpperCase(), aX + sideW - 24 * scale, mainY + mainH * 0.62);

    ctx.restore();
  }

  // --- THEME 1 / MAIN OVERLAY: NBA Scorebug 2 (/nbaoverlay2) ---
  // Exact 1:1 pixel-perfect replica of https://scoreboard.hoopculture.ca/nbaoverlay2
  private drawNbaOverlay2Theme(source: ScoreboardSource) {
    const { ctx } = this;
    const sb = this.scoreboard;
    const scale = source.scale || 1;

    // Height in CSS is 5.5vw. On 1920 width, 1vw = 19.2px -> 5.5vw = ~106px
    const barHeight = Math.round((source.height || 106) * scale);
    const radius = Math.round(10 * scale);

    const homeColor = sb.homeColor || '#f5c842';
    const awayColor = sb.awayColor || '#b4283c';

    // Segment widths proportional to basketball-nbaoverlay2.html
    const logoW = Math.round(116 * scale);
    const scoreW = Math.round(96 * scale);
    const infoW = Math.round(180 * scale);
    const totalW = logoW + scoreW + logoW + scoreW + infoW; // ~604px

    // Placement: centered horizontally by default, bottom margin 38px (bottom: 2vw in CSS)
    const barX = source.x !== undefined ? source.x : Math.round((this.width - totalW) / 2);
    const barY = source.y !== undefined ? source.y : Math.round(this.height - barHeight - (38 * scale));

    ctx.save();

    // 1. Box Shadow (0 0.4vw 2.5vw rgba(0,0,0,0.85))
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.round(25 * scale);
    ctx.shadowOffsetY = Math.round(8 * scale);

    // Rounded Pill Base
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, totalW, barHeight, radius);
    ctx.fillStyle = '#16202e';
    ctx.fill();
    ctx.shadowColor = 'transparent';

    // Clip to rounded pill container
    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, barX, barY, totalW, barHeight, radius);
    ctx.clip();

    let curX = barX;

    // --- SEGMENT 1: HOME LOGO (darkened home color) ---
    const hDarkBg = this.darkenColor(homeColor, 0.35);
    ctx.fillStyle = hDarkBg;
    ctx.fillRect(curX, barY, logoW, barHeight);

    // Right border with homeColor accent (0.18vw solid ${homeColor}88)
    ctx.fillStyle = homeColor + '88';
    ctx.fillRect(curX + logoW - Math.round(3.5 * scale), barY, Math.round(3.5 * scale), barHeight);

    // Home Logo Image
    const homeLogoImg = this.getOrLoadImage(sb.homeLogo);
    if (homeLogoImg && homeLogoImg.complete && homeLogoImg.naturalWidth > 0) {
      const maxDim = Math.round(102 * scale);
      const aspect = homeLogoImg.naturalWidth / homeLogoImg.naturalHeight;
      let drawW = maxDim;
      let drawH = maxDim;
      if (aspect > 1) {
        drawH = maxDim / aspect;
      } else {
        drawW = maxDim * aspect;
      }
      const imgX = curX + (logoW - drawW) / 2;
      const imgY = barY + (barHeight - drawH) / 2;
      ctx.drawImage(homeLogoImg, imgX, imgY, drawW, drawH);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = `700 ${Math.round(10 * scale)}px 'Barlow Condensed', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOGO', curX + logoW / 2, barY + barHeight / 2);
    }
    curX += logoW;

    // --- SEGMENT 2: HOME SCORE BLOCK (homeColor background) ---
    ctx.fillStyle = homeColor;
    ctx.fillRect(curX, barY, scoreW, barHeight);

    // Possession Dot (0.4vw dot with white glow)
    if (sb.possession === 'home') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6 * scale;
      ctx.beginPath();
      ctx.arc(curX + (12 * scale), barY + (20 * scale), 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }

    // Score Number (Teko 700 bold, 3.6vw = 69px)
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(69 * scale)}px 'Teko', 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${sb.homeScore}`, curX + scoreW / 2, barY + Math.round(barHeight * 0.70));

    // Fouls Label (0.62vw = 12px, font-weight 800)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `800 ${Math.round(12 * scale)}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`FOULS: ${sb.homeFouls || 0}`, curX + scoreW / 2, barY + Math.round(barHeight * 0.88));
    curX += scoreW;

    // --- SEGMENT 3: CENTER DIVIDER / AWAY LOGO (darkened away color) ---
    const aDarkBg = this.darkenColor(awayColor, 0.35);
    ctx.fillStyle = aDarkBg;
    ctx.fillRect(curX, barY, logoW, barHeight);

    // Left and Right Borders with awayColor accent (0.18vw solid ${awayColor}88)
    ctx.fillStyle = awayColor + '88';
    ctx.fillRect(curX, barY, Math.round(3.5 * scale), barHeight);
    ctx.fillRect(curX + logoW - Math.round(3.5 * scale), barY, Math.round(3.5 * scale), barHeight);

    // Away Logo Image
    const awayLogoImg = this.getOrLoadImage(sb.awayLogo);
    if (awayLogoImg && awayLogoImg.complete && awayLogoImg.naturalWidth > 0) {
      const maxDim = Math.round(102 * scale);
      const aspect = awayLogoImg.naturalWidth / awayLogoImg.naturalHeight;
      let drawW = maxDim;
      let drawH = maxDim;
      if (aspect > 1) {
        drawH = maxDim / aspect;
      } else {
        drawW = maxDim * aspect;
      }
      const imgX = curX + (logoW - drawW) / 2;
      const imgY = barY + (barHeight - drawH) / 2;
      ctx.drawImage(awayLogoImg, imgX, imgY, drawW, drawH);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = `700 ${Math.round(10 * scale)}px 'Barlow Condensed', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('LOGO', curX + logoW / 2, barY + barHeight / 2);
    }
    curX += logoW;

    // --- SEGMENT 4: AWAY SCORE BLOCK (awayColor background) ---
    ctx.fillStyle = awayColor;
    ctx.fillRect(curX, barY, scoreW, barHeight);

    // Possession Dot (0.4vw dot with white glow)
    if (sb.possession === 'away') {
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6 * scale;
      ctx.beginPath();
      ctx.arc(curX + scoreW - (12 * scale), barY + (20 * scale), 4 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
    }

    // Score Number (Teko 700 bold, 3.6vw = 69px)
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(69 * scale)}px 'Teko', 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${sb.awayScore}`, curX + scoreW / 2, barY + Math.round(barHeight * 0.70));

    // Fouls Label (0.62vw = 12px, font-weight 800)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = `800 ${Math.round(12 * scale)}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`FOULS: ${sb.awayFouls || 0}`, curX + scoreW / 2, barY + Math.round(barHeight * 0.88));
    curX += scoreW;

    // --- SEGMENT 5: RIGHT INFO SEGMENT (#16202e) ---
    ctx.fillStyle = '#16202e';
    ctx.fillRect(curX, barY, infoW, barHeight);

    const PERIODS = ['1ST', '2ND', '3RD', '4TH', 'OT', '2OT'];
    const pIdx = (sb.quarter ?? sb.period) - 1;
    const periodText = pIdx >= 0 && pIdx < PERIODS.length ? PERIODS[pIdx] : (sb.period > 0 ? `Q${sb.period}` : '1ST');

    // Left sub-column: Period & Clock (stacked vertically, exact basketball-nbaoverlay2 layout)
    const pX = curX + Math.round(25 * scale);

    // Period Text (italic bold Barlow Condensed 900, 1.45vw = 28px)
    ctx.fillStyle = '#ffffff';
    ctx.font = `italic 900 ${Math.round(28 * scale)}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(periodText, pX, barY + Math.round(barHeight * 0.42));

    // Game Clock (Teko 700 tabular-nums, 2.3vw = 44px, directly underneath period)
    ctx.fillStyle = (sb.gameSeconds !== undefined && sb.gameSeconds <= 30) ? '#ff5f5f' : '#ffffff';
    ctx.font = `700 ${Math.round(44 * scale)}px 'Teko', 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(sb.gameClock, pX, barY + Math.round(barHeight * 0.86));

    // Vertical Divider Line (60% height, centered)
    const divX = curX + Math.round(112 * scale);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fillRect(divX, barY + Math.round(barHeight * 0.20), 1, Math.round(barHeight * 0.60));

    // Right sub-column: Shot Clock
    const sX = curX + Math.round(146 * scale);

    // SHOT Label (0.45vw = 9px, letter-spacing, uppercase)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.font = `800 ${Math.round(9 * scale)}px 'Barlow Condensed', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('SHOT', sX, barY + Math.round(barHeight * 0.34));

    // SHOT Number (Teko 700 tabular-nums, 2.9vw = 56px)
    const shotSec = sb.shotSeconds !== undefined ? sb.shotSeconds : sb.shotClock;
    ctx.fillStyle = shotSec <= 5 ? '#e84040' : '#f5c842';
    ctx.font = `700 ${Math.round(56 * scale)}px 'Teko', 'Barlow Condensed', sans-serif`;
    ctx.fillText(`${shotSec}`, sX, barY + Math.round(barHeight * 0.86));

    ctx.restore(); // restore clipping
    ctx.restore(); // restore outer canvas state
  }

  // Backward compatibility alias
  private drawNbaNeonTheme(source: ScoreboardSource) {
    this.drawNbaOverlay2Theme(source);
  }


  private drawFullscreenBarTheme(source: ScoreboardSource) {
    const { ctx } = this;
    const sb = this.scoreboard;
    const scale = source.scale || 1;
    const barWidth = 1920;
    const barHeight = 124 * scale;
    const barX = 0;
    const barY = this.height - barHeight;

    ctx.save();

    // Dark luxury gradient
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barHeight);
    grad.addColorStop(0, 'rgba(12, 10, 8, 0.98)');
    grad.addColorStop(1, 'rgba(4, 3, 2, 0.99)');
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Top gold/fire accent line
    const lineGrad = ctx.createLinearGradient(0, 0, barWidth, 0);
    lineGrad.addColorStop(0, sb.homeColor || '#f5c842');
    lineGrad.addColorStop(0.5, '#ff6b1a');
    lineGrad.addColorStop(1, sb.awayColor || '#c8102e');
    ctx.fillStyle = lineGrad;
    ctx.fillRect(barX, barY, barWidth, 4 * scale);

    const mainH = barHeight - 26 * scale;
    const midX = barWidth / 2;

    // ?? HOME (Left) ??
    const homeLogoImg = this.getOrLoadImage(sb.homeLogo);
    if (homeLogoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(80 * scale, barY + mainH / 2, 36 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(homeLogoImg, 80 * scale - 36 * scale, barY + mainH / 2 - 36 * scale, 72 * scale, 72 * scale);
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(36 * scale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(sb.homeTeam.toUpperCase(), 140 * scale, barY + mainH * 0.58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 ${Math.round(14 * scale)}px sans-serif`;
    ctx.fillText(`REC: ${sb.homeRecord || '0-0'}  ?  FLS: ${sb.homeFouls}`, 140 * scale, barY + mainH * 0.85);

    // Home Score
    ctx.fillStyle = '#ff8c42';
    ctx.font = `900 ${Math.round(52 * scale)}px monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${sb.homeScore}`, midX - 180 * scale, barY + mainH * 0.70);

    // ?? CENTER (Clock, Period, Shot Clock) ??
    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(18 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    const periodLabel = sb.period <= 4 ? `PERIOD ${sb.period}` : `OVERTIME ${sb.period - 4}`;
    ctx.fillText(periodLabel, midX, barY + mainH * 0.34);

    ctx.fillStyle = sb.isClockRunning ? '#22c55e' : '#ffffff';
    ctx.font = `900 ${Math.round(44 * scale)}px monospace`;
    ctx.fillText(sb.gameClock, midX, barY + mainH * 0.74);

    ctx.fillStyle = '#ef4444';
    ctx.font = `900 ${Math.round(18 * scale)}px monospace`;
    ctx.fillText(`SHOT: ${sb.shotClock}`, midX, barY + mainH * 0.94);

    // ?? AWAY (Right) ??
    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 ${Math.round(52 * scale)}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`${sb.awayScore}`, midX + 180 * scale, barY + mainH * 0.70);

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(36 * scale)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(sb.awayTeam.toUpperCase(), barWidth - 140 * scale, barY + mainH * 0.58);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `700 ${Math.round(14 * scale)}px sans-serif`;
    ctx.fillText(`FLS: ${sb.awayFouls}  ?  REC: ${sb.awayRecord || '0-0'}`, barWidth - 140 * scale, barY + mainH * 0.85);

    const awayLogoImg = this.getOrLoadImage(sb.awayLogo);
    if (awayLogoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(barWidth - 80 * scale, barY + mainH / 2, 36 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.clip();
      ctx.drawImage(awayLogoImg, barWidth - 80 * scale - 36 * scale, barY + mainH / 2 - 36 * scale, 72 * scale, 72 * scale);
      ctx.restore();
    }

    // ?? BOTTOM STRIPE: Sponsor & Broadcast Crawl ??
    const crawlY = barY + barHeight - 24 * scale;
    ctx.fillStyle = '#060402';
    ctx.fillRect(barX, crawlY, barWidth, 24 * scale);

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(11 * scale)}px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'center';
    const crawlText = sb.bannerText || '?? HOOP CULTURE NETWORK ? DMC BASKETBALL HOUSE LEAGUE ? OFFICIAL GAME OVERLAY';
    ctx.fillText(crawlText.toUpperCase(), barWidth / 2, crawlY + 16 * scale);

    ctx.restore();
  }


  // --- Text Source ---
  private drawTextSource(source: Source) {
    if (source.type !== 'text') return;
    const { ctx } = this;
    ctx.save();

    if (source.backgroundColor && source.backgroundColor !== 'transparent') {
      ctx.fillStyle = source.backgroundColor;
      this.roundRect(ctx, source.x, source.y, source.width, source.height, source.borderRadius || 0);
      ctx.fill();
    }

    ctx.fillStyle = source.color || '#ffffff';
    const weight = source.fontWeight || 'bold';
    const size = source.fontSize || 24;
    const family = source.fontFamily || 'sans-serif';
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
      source.text,
      source.x + source.width / 2,
      source.y + source.height / 2
    );

    ctx.restore();
  }

  // --- Image Source ---
  private drawImageSource(source: Source) {
    if (source.type !== 'image' || !source.url) return;
    let img = this.imageCache.get(source.url);

    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = source.url;
      this.imageCache.set(source.url, img);
    }

    if (!img.complete || img.naturalWidth === 0) return;

    const { ctx } = this;
    ctx.save();
    ctx.drawImage(img, source.x, source.y, source.width, source.height);
    ctx.restore();
  }

  // --- Color Solid Source ---
  private drawColorSolidSource(source: Source) {
    if (source.type !== 'color_solid') return;
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = source.color;
    if (source.borderRadius) {
      this.roundRect(ctx, source.x, source.y, source.width, source.height, source.borderRadius);
      ctx.fill();
    } else {
      ctx.fillRect(source.x, source.y, source.width, source.height);
    }
    ctx.restore();
  }

  // --- Browser Source (Vercel URL Overlay) ---
  private drawBrowserSourcePlaceholder(source: Source) {
    if (source.type !== 'browser_url') return;
    if (source.syncDataBridge) {
      let theme: any = 'nbaoverlay2';
      const u = (source.url || '').toLowerCase();
      if (u.includes('nbaoverlay2')) {
        theme = 'nbaoverlay2';
      } else if (u.includes('fullscreen')) {
        theme = 'fullscreen_bar';
      } else if (u.includes('nbaoverlay')) {
        theme = 'nba_classic';
      } else if (u.includes('nbc')) {
        theme = 'nbc';
      }

      let width = 604;
      let height = 106;
      let x = Math.round((this.width - width) / 2);
      let y = Math.round(this.height - height - 38);

      if (theme === 'fullscreen_bar') {
        width = 1920;
        height = 124;
        x = 0;
        y = 1080 - 124;
      } else if (theme === 'nbc') {
        width = 1040;
        height = 116;
        x = Math.round((this.width - width) / 2);
        y = 40;
      } else if (theme === 'nba_classic') {
        width = 880;
        height = 100;
        x = Math.round((this.width - width) / 2);
        y = 40;
      }

      const mockScoreboardSource: Source = {
        id: `${source.id}-hud`,
        name: 'Synced HUD',
        type: 'scoreboard',
        visible: true,
        locked: true,
        x,
        y,
        width,
        height,
        opacity: 1,
        zIndex: source.zIndex,
        theme,
        scale: 1,
      };
      this.drawScoreboardSource(mockScoreboardSource);
    }
  }

  // --- STREAMLABS FEATURE: Smooth Scrolling News Ticker ---
  private drawScrollingTicker(timestamp: number) {
    const { ctx, width, height } = this;
    const tickerH = 46;
    const tickerY = height - tickerH;

    const dt = (timestamp - this.lastTickerTimestamp) / 1000;
    this.lastTickerTimestamp = timestamp;

    this.tickerOffset -= this.tickerConfig.speed * dt;

    ctx.save();
    // Ticker Background Bar
    ctx.fillStyle = this.tickerConfig.backgroundColor;
    ctx.fillRect(0, tickerY, width, tickerH);

    // Accent line
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, tickerY, width, 3);

    // Badge on left
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(0, tickerY, 140, tickerH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('LIVE UPDATES', 70, tickerY + tickerH / 2);

    // Scrolling text in clipped region
    ctx.save();
    ctx.beginPath();
    ctx.rect(150, tickerY, width - 150, tickerH);
    ctx.clip();

    ctx.fillStyle = this.tickerConfig.textColor;
    ctx.font = `bold ${this.tickerConfig.fontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const textWidth = ctx.measureText(this.tickerConfig.text).width;
    const cycleWidth = textWidth + 300;

    if (this.tickerOffset < -cycleWidth) {
      this.tickerOffset = width - 150;
    }

    ctx.fillText(this.tickerConfig.text, 150 + this.tickerOffset, tickerY + tickerH / 2 + 1);
    // Draw duplicate for smooth continuous loop
    ctx.fillText(this.tickerConfig.text, 150 + this.tickerOffset + cycleWidth, tickerY + tickerH / 2 + 1);

    ctx.restore();
    ctx.restore();
  }

  // --- STREAMLABS FEATURE: "Show on Stream" Highlighted Chat Comment ---
  private drawHighlightedChatCard(chat: ChatMessage) {
    const { ctx, width, height } = this;
    const cardW = 720;
    const cardH = 110;
    const cardX = (width - cardW) / 2;
    const cardY = height - cardH - 70; // Positioned right above ticker

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 6;

    // Card background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Platform accent stripe (Facebook = blue, YouTube = red, Twitch = purple)
    const stripeColor =
      chat.platform === 'facebook'
        ? '#1877f2'
        : chat.platform === 'youtube'
          ? '#ff0000'
          : chat.platform === 'twitch'
            ? '#9146ff'
            : '#38bdf8';

    ctx.fillStyle = stripeColor;
    this.roundRect(ctx, cardX, cardY, 12, cardH, [16, 0, 0, 16]);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.stroke();

    // Sender Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(chat.sender, cardX + 32, cardY + 18);

    // Platform Tag
    ctx.fillStyle = stripeColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(chat.platform.toUpperCase(), cardX + cardW - 110, cardY + 22);

    // Message text
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 20px sans-serif';
    ctx.fillText(chat.message, cardX + 32, cardY + 54);

    ctx.restore();
  }

  // --- STREAMLABS FEATURE: Static Lower-Third Banner ---
  private drawStreamlabsBanner(banner: StreamlabsBanner) {
    const { ctx, height } = this;
    const boxW = 860;
    const boxH = 120;
    const boxX = 80;
    const boxY = height - boxH - 70; // Above ticker

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, 16);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    this.roundRect(ctx, boxX, boxY, 14, boxH, [16, 0, 0, 16]);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 34px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(banner.title, boxX + 36, boxY + 22);

    if (banner.subtitle) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(banner.subtitle, boxX + 36, boxY + 68);
    }

    ctx.restore();
  }

  // --- Brand Kit Logo Watermark ---
  private drawBrandLogo() {
    let img = this.imageCache.get(this.brandKit.logoUrl);
    if (!img) {
      img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = this.brandKit.logoUrl;
      this.imageCache.set(this.brandKit.logoUrl, img);
    }
    if (!img.complete || img.naturalWidth === 0) return;

    const { ctx, width, height } = this;
    const w = this.brandKit.logoWidth || 180;
    const h = this.brandKit.logoHeight || 60;
    let x = 40;
    let y = 40;

    if (this.brandKit.logoPosition === 'top-right') {
      x = width - w - 40;
      y = 40;
    } else if (this.brandKit.logoPosition === 'bottom-left') {
      x = 40;
      y = height - h - 70;
    } else if (this.brandKit.logoPosition === 'bottom-right') {
      x = width - w - 40;
      y = height - h - 70;
    }

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number | number[]
  ) {
    let tl = 0,
      tr = 0,
      br = 0,
      bl = 0;
    if (typeof r === 'number') {
      tl = tr = br = bl = r;
    } else if (Array.isArray(r)) {
      tl = r[0] ?? 0;
      tr = r[1] ?? 0;
      br = r[2] ?? 0;
      bl = r[3] ?? 0;
    }

    ctx.beginPath();
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }
}
