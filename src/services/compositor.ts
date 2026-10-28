import { SceneConfig, ScoreboardState } from '@/types/broadcast';

export class VideoCompositor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoElement: HTMLVideoElement | null = null;
  private animationFrameId: number | null = null;
  private targetFps: number = 60;
  private width: number = 1920;
  private height: number = 1080;

  // Scene transition state
  private currentScene: SceneConfig;
  private previousScene: SceneConfig | null = null;
  private transitionAlpha: number = 1; // 0 to 1
  private isTransitioning: boolean = false;
  private transitionStartTime: number = 0;
  private transitionDuration: number = 400; // ms

  // Audio Context and destination stream
  private audioContext: AudioContext | null = null;
  private audioSourceNode: MediaStreamAudioSourceNode | null = null;
  private audioDestinationNode: MediaStreamAudioDestinationNode | null = null;
  private compositeStream: MediaStream | null = null;

  // Current scoreboard state reference
  private scoreboard: ScoreboardState;

  // Metrics
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = performance.now();
  public currentFps: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    initialScene: SceneConfig,
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

  public updateScoreboard(scoreboard: ScoreboardState) {
    this.scoreboard = scoreboard;
  }

  public setScene(scene: SceneConfig) {
    if (this.currentScene.id === scene.id) return;
    this.previousScene = this.currentScene;
    this.currentScene = scene;
    this.isTransitioning = true;
    this.transitionStartTime = performance.now();
    this.transitionAlpha = 0;
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
    // Capture stream from canvas at desired FPS
    const canvasStream = (this.canvas as any).captureStream
      ? this.canvas.captureStream(this.targetFps)
      : (this.canvas as any).mozCaptureStream(this.targetFps);

    const videoTrack = canvasStream.getVideoTracks()[0];

    // If microphone audio is available, mix it into the stream
    if (micStream && micStream.getAudioTracks().length > 0) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
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
    // Measure FPS
    this.frameCount++;
    if (timestamp - this.lastFpsUpdateTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (timestamp - this.lastFpsUpdateTime));
      this.frameCount = 0;
      this.lastFpsUpdateTime = timestamp;
    }

    // Handle scene transition timing
    if (this.isTransitioning) {
      const elapsed = timestamp - this.transitionStartTime;
      this.transitionAlpha = Math.min(1, elapsed / this.transitionDuration);
      if (this.transitionAlpha >= 1) {
        this.isTransitioning = false;
        this.previousScene = null;
      }
    }

    const { ctx, width, height } = this;

    // 1. Draw Base Camera or Dark Stage Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    if (this.currentScene.hasCamera && this.videoElement && this.videoElement.readyState >= 2) {
      // Calculate aspect-fill framing
      const vWidth = this.videoElement.videoWidth || 1920;
      const vHeight = this.videoElement.videoHeight || 1080;
      const vAspect = vWidth / vHeight;
      const cAspect = width / height;

      let sx = 0, sy = 0, sWidth = vWidth, sHeight = vHeight;
      if (vAspect > cAspect) {
        // Video is wider than canvas
        sWidth = vHeight * cAspect;
        sx = (vWidth - sWidth) / 2;
      } else {
        // Video is taller than canvas
        sHeight = vWidth / cAspect;
        sy = (vHeight - sHeight) / 2;
      }

      ctx.save();
      if (this.isTransitioning) {
        ctx.globalAlpha = this.transitionAlpha;
      }
      ctx.drawImage(this.videoElement, sx, sy, sWidth, sHeight, 0, 0, width, height);
      ctx.restore();
    }

    // 2. Render Scene-Specific Graphics
    switch (this.currentScene.id) {
      case 'game':
        this.renderGameScene(ctx);
        break;
      case 'intro':
        this.renderIntroScene(ctx);
        break;
      case 'interview':
        this.renderInterviewScene(ctx);
        break;
      case 'sponsor':
        this.renderSponsorScene(ctx);
        break;
      case 'halftime':
        this.renderHalftimeScene(ctx);
        break;
    }

    // 3. Render Persistent Sponsor Bug if enabled
    if (this.currentScene.showSponsor && this.currentScene.id !== 'sponsor') {
      this.renderSponsorWatermark(ctx);
    }

    // 4. If transitioning, draw quick fade flash effect
    if (this.isTransitioning) {
      ctx.save();
      ctx.fillStyle = `rgba(0, 0, 0, ${(1 - this.transitionAlpha) * 0.4})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  // --- Basketball Game Scene: Pro Broadcast Scoreboard Bar ---
  private renderGameScene(ctx: CanvasRenderingContext2D) {
    const sb = this.scoreboard;
    const barWidth = 960;
    const barHeight = 84;
    const barX = (this.width - barWidth) / 2;
    const barY = 40;
    const radius = 12;

    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;

    // Scoreboard Container Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, radius);
    ctx.stroke();

    // Division Line Positions
    const awayX = barX;
    const awayWidth = 320;
    const clockX = barX + awayWidth;
    const clockWidth = 320;
    const homeX = clockX + clockWidth;
    const homeWidth = 320;

    // --- Away Team Segment ---
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, awayX, barY, awayWidth, barHeight, [radius, 0, 0, radius]);
    ctx.fill();

    // Possession indicator (Away)
    if (sb.possession === 'away') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(awayX + 16, barY + barHeight / 2 - 10);
      ctx.lineTo(awayX + 26, barY + barHeight / 2);
      ctx.lineTo(awayX + 16, barY + barHeight / 2 + 10);
      ctx.fill();
    }

    // Away Team Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(sb.awayTeam.toUpperCase(), awayX + 36, barY + 44);

    // Away Team Fouls & Timeouts
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`FLS: ${sb.awayFouls}  •  TO: ${sb.awayTimeouts}`, awayX + 36, barY + 68);

    // Away Score Badge
    ctx.fillStyle = '#0f172a';
    this.roundRect(ctx, awayX + awayWidth - 90, barY + 8, 80, barHeight - 16, 8);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sb.awayScore}`, awayX + awayWidth - 50, barY + 56);

    // --- Center Clock & Period Segment ---
    ctx.fillStyle = '#090d16';
    ctx.fillRect(clockX, barY, clockWidth, barHeight);

    // Period indicator
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    const periodText = sb.period <= 4 ? `Q${sb.period}` : `OT${sb.period - 4}`;
    ctx.fillText(periodText, clockX + clockWidth / 2, barY + 30);

    // Game Clock
    ctx.fillStyle = sb.isClockRunning ? '#22c55e' : '#ffffff';
    ctx.font = '900 38px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(sb.gameClock, clockX + clockWidth / 2, barY + 68);

    // Clock running status dot
    ctx.fillStyle = sb.isClockRunning ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(clockX + clockWidth / 2 + 75, barY + 58, 5, 0, Math.PI * 2);
    ctx.fill();

    // --- Home Team Segment ---
    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, homeX, barY, homeWidth, barHeight, [0, radius, radius, 0]);
    ctx.fill();

    // Home Score Badge
    ctx.fillStyle = '#0f172a';
    this.roundRect(ctx, homeX + 10, barY + 8, 80, barHeight - 16, 8);
    ctx.fill();
    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sb.homeScore}`, homeX + 50, barY + 56);

    // Home Team Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(sb.homeTeam.toUpperCase(), homeX + homeWidth - 36, barY + 44);

    // Home Team Fouls & Timeouts
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`FLS: ${sb.homeFouls}  •  TO: ${sb.homeTimeouts}`, homeX + homeWidth - 36, barY + 68);

    // Possession indicator (Home)
    if (sb.possession === 'home') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.moveTo(homeX + homeWidth - 16, barY + barHeight / 2 - 10);
      ctx.lineTo(homeX + homeWidth - 26, barY + barHeight / 2);
      ctx.lineTo(homeX + homeWidth - 16, barY + barHeight / 2 + 10);
      ctx.fill();
    }

    // Bottom Ticker Banner (Hoop Times live tournament banner)
    const tickerY = barY + barHeight + 6;
    const tickerHeight = 28;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    this.roundRect(ctx, barX + 140, tickerY, barWidth - 280, tickerHeight, 6);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(sb.bannerText || 'HOOP TIMES BASKETBALL LEAGUE • LIVE BROADCAST', barX + barWidth / 2, tickerY + 19);

    ctx.restore();
  }

  // --- Intro / Pregame Scene ---
  private renderIntroScene(ctx: CanvasRenderingContext2D) {
    ctx.save();
    // Gradient overlay background
    const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.96)');
    grad.addColorStop(0.5, 'rgba(30, 41, 59, 0.90)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Center Card
    const cardW = 1000;
    const cardH = 540;
    const cardX = (this.width - cardW) / 2;
    const cardY = (this.height - cardH) / 2;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 40;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.8)';
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    // League Title
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOOP TIMES BROADCAST NETWORK', this.width / 2, cardY + 70);

    // Main Matchup Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${this.scoreboard.awayTeam}  VS  ${this.scoreboard.homeTeam}`, this.width / 2, cardY + 160);

    // Subtitle / Status
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('GAME STARTING SHORTLY', this.width / 2, cardY + 230);

    // Court / Location Info
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Court 1 • Championship Showcase', this.width / 2, cardY + 280);

    // Presentation sponsor
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('PRESENTED BY', this.width / 2, cardY + 380);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.scoreboard.sponsorName || 'HOOP TIMES PARTNERS & SPONSORS', this.width / 2, cardY + 420);

    ctx.restore();
  }

  // --- Interview Scene: Lower Third ---
  private renderInterviewScene(ctx: CanvasRenderingContext2D) {
    const boxW = 860;
    const boxH = 130;
    const boxX = 80;
    const boxY = this.height - boxH - 80;
    const radius = 16;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 24;

    // Main Lower-Third Card
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    this.roundRect(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fill();

    // Accent Stripe
    ctx.fillStyle = '#f59e0b';
    this.roundRect(ctx, boxX, boxY, 14, boxH, [radius, 0, 0, radius]);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Speaker Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.currentScene.lowerThirdTitle || 'COACH MARCUS STERLING', boxX + 40, boxY + 54);

    // Speaker Role / Subtitle
    ctx.fillStyle = '#38bdf8';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.currentScene.lowerThirdSubtitle || 'Head Coach • Northside Ballers', boxX + 40, boxY + 92);

    // Sponsor Tag
    ctx.fillStyle = '#64748b';
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('LIVE SIDELINE INTERVIEW', boxX + boxW - 30, boxY + 52);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.scoreboard.sponsorName || 'EZ BROADCAST STUDIO', boxX + boxW - 30, boxY + 90);

    ctx.restore();
  }

  // --- Sponsor Spotlight Scene ---
  private renderSponsorScene(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.width, this.height);

    const cardW = 1100;
    const cardH = 620;
    const cardX = (this.width - cardW) / 2;
    const cardY = (this.height - cardH) / 2;

    const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');

    ctx.fillStyle = grad;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.fill();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 24);
    ctx.stroke();

    // Spotlight Header
    ctx.fillStyle = '#eab308';
    ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL SPONSOR SPOTLIGHT', this.width / 2, cardY + 90);

    // Sponsor Brand
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 76px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.scoreboard.sponsorName || 'ELITE SPORTS HYDRATION', this.width / 2, cardY + 220);

    // Tagline
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Fueling The Next Generation Of Basketball Champions', this.width / 2, cardY + 310);

    // Description text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Proud partner of the Hoop Times Basketball League', this.width / 2, cardY + 380);
    ctx.fillText('Visit our booth at the main entrance for complimentary court-side drinks', this.width / 2, cardY + 430);

    // Match status preview footer
    ctx.fillStyle = '#334155';
    this.roundRect(ctx, cardX + 100, cardY + 490, cardW - 200, 80, 16);
    ctx.fill();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`CURRENT SCORE:  ${this.scoreboard.awayTeam} ${this.scoreboard.awayScore}  —  ${this.scoreboard.homeScore} ${this.scoreboard.homeTeam}`, this.width / 2, cardY + 540);

    ctx.restore();
  }

  // --- Halftime / Break Scene ---
  private renderHalftimeScene(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
    ctx.fillRect(0, 0, this.width, this.height);

    const cardW = 1050;
    const cardH = 580;
    const cardX = (this.width - cardW) / 2;
    const cardY = (this.height - cardH) / 2;

    ctx.fillStyle = '#1e293b';
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();

    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.stroke();

    // Halftime Title
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HALFTIME BREAK', this.width / 2, cardY + 90);

    // Matchup Scores
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${this.scoreboard.awayTeam.toUpperCase()}`, cardX + 260, cardY + 200);
    ctx.fillText(`${this.scoreboard.homeTeam.toUpperCase()}`, cardX + cardW - 260, cardY + 200);

    ctx.font = '900 96px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${this.scoreboard.awayScore}`, cardX + 260, cardY + 310);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText(`${this.scoreboard.homeScore}`, cardX + cardW - 260, cardY + 310);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '900 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('VS', this.width / 2, cardY + 280);

    // Timer or return notice
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('SECOND HALF WILL RESUME SHORTLY', this.width / 2, cardY + 410);

    // Sponsor
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Presented by ${this.scoreboard.sponsorName || 'Hoop Times Media'}`, this.width / 2, cardY + 490);

    ctx.restore();
  }

  // --- Corner Sponsor Watermark Bug ---
  private renderSponsorWatermark(ctx: CanvasRenderingContext2D) {
    const bugW = 280;
    const bugH = 50;
    const bugX = this.width - bugW - 40;
    const bugY = 40;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.roundRect(ctx, bugX, bugY, bugW, bugH, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bugX, bugY, bugW, bugH, 10);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('OFFICIAL PARTNER', bugX + 16, bugY + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.scoreboard.sponsorName || 'HOOP TIMES', bugX + 16, bugY + 42);

    ctx.restore();
  }

  // Helper for drawing rounded rectangles with cross-browser compatibility
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number | number[]
  ) {
    let tl = 0, tr = 0, br = 0, bl = 0;
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
