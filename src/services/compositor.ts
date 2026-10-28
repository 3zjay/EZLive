import { Scene, ScoreboardState, Source } from '@/types/broadcast';
import { BrandKit, ChatMessage, NewsTickerConfig, StageLayout, StreamlabsBanner } from '@/types/streamlabs';

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement | null = null;
  private screenShareElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private targetFps: number = 60;
  private width: number = 1920;
  private height: number = 1080;

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

  // Streamlabs Features
  public layout: StageLayout = 'solo';
  public highlightedChat: ChatMessage | null = null;
  public tickerConfig: NewsTickerConfig = {
    enabled: true,
    text: '🏀 HOOP TIMES BASKETBALL LEAGUE • CHAMPIONSHIP FINALS • STREAMING LIVE TO FACEBOOK • SHARE THE STREAM WITH FAMILY & FRIENDS!',
    speed: 120, // px per second
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    textColor: '#f8fafc',
    fontSize: 20,
  };
  public activeBanner: StreamlabsBanner | null = null;
  public brandKit: BrandKit = {
    logoUrl: '/icon.svg',
    logoPosition: 'top-right',
    logoWidth: 180,
    logoHeight: 60,
    primaryColor: '#0284c7',
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
    this.ctx = context;
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

  public getCompositeStream(micStream: MediaStream | null): MediaStream {
    const canvasWithCapture = this.canvas as HTMLCanvasElement & {
      captureStream?(fps?: number): MediaStream;
      mozCaptureStream?(fps?: number): MediaStream;
    };

    const canvasStream = canvasWithCapture.captureStream
      ? canvasWithCapture.captureStream(this.targetFps)
      : canvasWithCapture.mozCaptureStream
        ? canvasWithCapture.mozCaptureStream(this.targetFps)
        : new MediaStream();

    const videoTrack = canvasStream.getVideoTracks()[0];

    if (micStream && micStream.getAudioTracks().length > 0) {
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.audioSourceNode = this.audioContext.createMediaStreamSource(micStream);
        this.audioDestinationNode = this.audioContext.createMediaStreamDestination();
        this.audioSourceNode.connect(this.audioDestinationNode);

        const mixedAudioTrack = this.audioDestinationNode.stream.getAudioTracks()[0];
        this.compositeStream = new MediaStream([videoTrack, mixedAudioTrack]);
      } catch (err) {
        console.warn('AudioContext mixing error, falling back to direct track addition:', err);
        const micAudioTrack = micStream.getAudioTracks()[0];
        this.compositeStream = new MediaStream([videoTrack, micAudioTrack]);
      }
    } else {
      this.compositeStream = new MediaStream([videoTrack]);
    }

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

    const { ctx, width, height } = this;

    // 1. Base Stage Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // 2. Render previous scene if transitioning
    if (this.isTransitioning && this.previousScene) {
      ctx.save();
      ctx.globalAlpha = 1 - this.transitionAlpha;
      this.renderSceneSources(this.previousScene);
      ctx.restore();
    }

    // 3. Render current active scene
    ctx.save();
    if (this.isTransitioning) {
      ctx.globalAlpha = this.transitionAlpha;
    }
    this.renderSceneSources(this.currentScene);
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

  private renderSceneSources(scene: Scene) {
    const sorted = [...scene.sources].sort((a, b) => a.zIndex - b.zIndex);
    for (const source of sorted) {
      if (!source.visible) continue;
      this.renderSource(source);
    }
  }

  private renderSource(source: Source) {
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
        this.drawBrowserSourcePlaceholder(source);
        break;
    }

    ctx.restore();
  }

  // --- Camera Rendering with Multi-Layout Support (Solo, Split, PIP) ---
  private drawCameraSource(source: Source) {
    if (source.type !== 'camera') return;
    const { ctx } = this;

    if (!this.videoElement || this.videoElement.readyState < 2) {
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

  // --- Scoreboard HUD Source ---
  private drawScoreboardSource(source: Source) {
    if (source.type !== 'scoreboard') return;
    const { ctx } = this;
    const sb = this.scoreboard;
    const scale = source.scale || 1;
    const barWidth = source.width;
    const barHeight = source.height;
    const barX = source.x;
    const barY = source.y;
    const radius = 12 * scale;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 20 * scale;
    ctx.shadowOffsetY = 5 * scale;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2 * scale;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.stroke();

    const segW = barWidth / 3;

    // Away Team
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, barX, barY, segW, barHeight, [radius, 0, 0, radius]);
    ctx.fill();

    if (sb.possession === 'away') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(barX + 16 * scale, barY + barHeight / 2 - 8 * scale);
      ctx.lineTo(barX + 26 * scale, barY + barHeight / 2);
      ctx.lineTo(barX + 16 * scale, barY + barHeight / 2 + 8 * scale);
      ctx.fill();
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(26 * scale)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(sb.awayTeam.toUpperCase(), barX + 36 * scale, barY + barHeight * 0.48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 ${Math.round(14 * scale)}px sans-serif`;
    ctx.fillText(`FLS: ${sb.awayFouls} • TO: ${sb.awayTimeouts}`, barX + 36 * scale, barY + barHeight * 0.76);

    ctx.fillStyle = '#0f172a';
    this.roundRect(ctx, barX + segW - 85 * scale, barY + 8 * scale, 75 * scale, barHeight - 16 * scale, 8 * scale);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = `900 ${Math.round(38 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${sb.awayScore}`, barX + segW - 47 * scale, barY + barHeight * 0.65);

    // Center Clock & Period
    const clockX = barX + segW;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(clockX, barY, segW, barHeight);

    ctx.fillStyle = '#f59e0b';
    ctx.font = `bold ${Math.round(18 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    const periodText = sb.period <= 4 ? `Q${sb.period}` : `OT${sb.period - 4}`;
    ctx.fillText(periodText, clockX + segW / 2, barY + barHeight * 0.36);

    ctx.fillStyle = sb.isClockRunning ? '#22c55e' : '#ffffff';
    ctx.font = `900 ${Math.round(34 * scale)}px monospace`;
    ctx.fillText(sb.gameClock, clockX + segW / 2, barY + barHeight * 0.80);

    // Home Team
    const homeX = barX + segW * 2;
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, homeX, barY, segW, barHeight, [0, radius, radius, 0]);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    this.roundRect(ctx, homeX + 10 * scale, barY + 8 * scale, 75 * scale, barHeight - 16 * scale, 8 * scale);
    ctx.fill();
    ctx.fillStyle = '#f43f5e';
    ctx.font = `900 ${Math.round(38 * scale)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${sb.homeScore}`, homeX + 47 * scale, barY + barHeight * 0.65);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(26 * scale)}px sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(sb.homeTeam.toUpperCase(), homeX + segW - 36 * scale, barY + barHeight * 0.48);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 ${Math.round(14 * scale)}px sans-serif`;
    ctx.fillText(`FLS: ${sb.homeFouls} • TO: ${sb.homeTimeouts}`, homeX + segW - 36 * scale, barY + barHeight * 0.76);

    if (sb.possession === 'home') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(homeX + segW - 16 * scale, barY + barHeight / 2 - 8 * scale);
      ctx.lineTo(homeX + segW - 26 * scale, barY + barHeight / 2);
      ctx.lineTo(homeX + segW - 16 * scale, barY + barHeight / 2 + 8 * scale);
      ctx.fill();
    }

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
      const mockScoreboardSource: Source = {
        id: `${source.id}-hud`,
        name: 'Synced HUD',
        type: 'scoreboard',
        visible: true,
        locked: true,
        x: source.x + (source.width - 960) / 2,
        y: source.y + 40,
        width: 960,
        height: 110,
        opacity: 1,
        zIndex: source.zIndex,
        theme: 'hooptimes',
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
