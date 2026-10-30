export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationSeconds: number;
  recordedBytes: number;
  mimeType: string;
  hasReplayClip?: boolean;
}

export class BroadcastRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private stateChangeCallback: ((state: RecordingState) => void) | null = null;
  private totalBytes: number = 0;
  private selectedMimeType: string = '';

  // Rolling OBS Replay Buffer (self-contained 10-second clips)
  private replayRecorder: MediaRecorder | null = null;
  private replayChunks: Blob[] = [];
  private latestReplayBlobUrl: string | null = null;
  private replayCycleInterval: NodeJS.Timeout | null = null;

  public onStateChange(callback: (state: RecordingState) => void) {
    this.stateChangeCallback = callback;
  }

  public getSupportedMimeType(): string {
    const candidateTypes = [
      'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
      'video/mp4',
      'video/webm; codecs="vp9, opus"',
      'video/webm; codecs="vp8, opus"',
      'video/webm',
    ];

    if (typeof MediaRecorder === 'undefined') {
      return '';
    }

    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return '';
  }

  public startReplayBuffer(stream: MediaStream) {
    this.stopReplayBuffer();
    const mimeType = this.getSupportedMimeType();

    const startSegment = () => {
      try {
        if (!stream.active) return;
        this.replayChunks = [];
        const rec = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);

        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.replayChunks.push(e.data);
          }
        };

        rec.onstop = () => {
          if (this.replayChunks.length > 0) {
            const blob = new Blob(this.replayChunks, { type: mimeType || 'video/mp4' });
            if (this.latestReplayBlobUrl) {
              URL.revokeObjectURL(this.latestReplayBlobUrl);
            }
            this.latestReplayBlobUrl = URL.createObjectURL(blob);
            this.notifyState();
          }
        };

        rec.start(1000);
        this.replayRecorder = rec;
      } catch {
        // Ignore if device restricts dual MediaRecorder
      }
    };

    startSegment();
    this.replayCycleInterval = setInterval(() => {
      if (this.replayRecorder && this.replayRecorder.state === 'recording') {
        try {
          this.replayRecorder.stop();
        } catch {}
      }
      setTimeout(startSegment, 150);
    }, 10000);
  }

  public stopReplayBuffer() {
    if (this.replayCycleInterval) {
      clearInterval(this.replayCycleInterval);
      this.replayCycleInterval = null;
    }
    if (this.replayRecorder && this.replayRecorder.state !== 'inactive') {
      try {
        this.replayRecorder.stop();
      } catch {}
    }
    this.replayRecorder = null;
  }

  public getInstantReplayUrl(): string | null {
    // If we have a completed rolling segment, return it; otherwise flush current chunks
    if (this.replayChunks.length > 0) {
      const mimeType = this.selectedMimeType || this.getSupportedMimeType() || 'video/mp4';
      const currentBlob = new Blob(this.replayChunks, { type: mimeType });
      if (currentBlob.size > 10000) {
        if (this.latestReplayBlobUrl) {
          URL.revokeObjectURL(this.latestReplayBlobUrl);
        }
        this.latestReplayBlobUrl = URL.createObjectURL(currentBlob);
      }
    } else if (this.recordedChunks.length > 0) {
      const mimeType = this.selectedMimeType || this.getSupportedMimeType() || 'video/mp4';
      const currentBlob = new Blob(this.recordedChunks, { type: mimeType });
      return URL.createObjectURL(currentBlob);
    }
    return this.latestReplayBlobUrl;
  }

  public start(stream: MediaStream): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      return false;
    }

    this.recordedChunks = [];
    this.totalBytes = 0;
    this.selectedMimeType = this.getSupportedMimeType();

    const options: MediaRecorderOptions = {
      videoBitsPerSecond: 6000000, // 6 Mbps for high-quality basketball broadcast
      audioBitsPerSecond: 192000,  // 192 kbps audio
    };

    if (this.selectedMimeType) {
      options.mimeType = this.selectedMimeType;
    }

    try {
      this.mediaRecorder = new MediaRecorder(stream, options);
    } catch (err) {
      console.warn('MediaRecorder init with full bitrate options failed, retrying with mimeType only:', err);
      try {
        if (this.selectedMimeType) {
          this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.selectedMimeType });
        } else {
          this.mediaRecorder = new MediaRecorder(stream);
        }
      } catch (mimeErr) {
        console.warn('MediaRecorder init with mimeType failed, falling back to default:', mimeErr);
        try {
          this.mediaRecorder = new MediaRecorder(stream);
        } catch (fatalErr) {
          console.error('Fatal MediaRecorder initialization failure:', fatalErr);
          return false;
        }
      }
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
        this.totalBytes += event.data.size;
        this.notifyState();
      }
    };

    this.mediaRecorder.onerror = (event: Event) => {
      console.error('MediaRecorder error:', event);
    };

    // Request data in 1-second chunks for reliability during long broadcasts
    this.mediaRecorder.start(1000);
    this.startTime = Date.now();

    this.durationInterval = setInterval(() => {
      this.notifyState();
    }, 500);

    this.notifyState();
    return true;
  }

  public stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        if (this.durationInterval) clearInterval(this.durationInterval);
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        if (this.durationInterval) {
          clearInterval(this.durationInterval);
          this.durationInterval = null;
        }

        const finalBlob = new Blob(this.recordedChunks, {
          type: this.selectedMimeType || 'video/mp4',
        });

        this.notifyState();
        resolve(finalBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  public downloadRecording(filenamePrefix: string = 'hooptimes_game') {
    if (this.recordedChunks.length === 0) return;

    const extension = (this.selectedMimeType && this.selectedMimeType.includes('mp4')) ? 'mp4' : 'webm';
    const blob = new Blob(this.recordedChunks, {
      type: this.selectedMimeType || 'video/mp4',
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${filenamePrefix}_${timestamp}.${extension}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  }

  private notifyState() {
    if (!this.stateChangeCallback) return;
    const isRecording = this.mediaRecorder ? this.mediaRecorder.state === 'recording' : false;
    const isPaused = this.mediaRecorder ? this.mediaRecorder.state === 'paused' : false;
    const durationSeconds = isRecording ? Math.floor((Date.now() - this.startTime) / 1000) : 0;

    this.stateChangeCallback({
      isRecording,
      isPaused,
      durationSeconds,
      recordedBytes: this.totalBytes,
      mimeType: this.selectedMimeType,
      hasReplayClip: Boolean(this.latestReplayBlobUrl || this.replayChunks.length > 0),
    });
  }
}
