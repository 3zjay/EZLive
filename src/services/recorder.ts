export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationSeconds: number;
  recordedBytes: number;
  mimeType: string;
}

export class BroadcastRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private stateChangeCallback: ((state: RecordingState) => void) | null = null;
  private totalBytes: number = 0;
  private selectedMimeType: string = '';

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
      console.warn('MediaRecorder init with options failed, retrying without options:', err);
      try {
        this.mediaRecorder = new MediaRecorder(stream);
      } catch (fatalErr) {
        console.error('Fatal MediaRecorder initialization failure:', fatalErr);
        return false;
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
    });
  }
}
