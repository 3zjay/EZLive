const http = require('http');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  // Health check for Render
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head><title>EZLive Streaming Relay</title></head>
      <body style="background:#080605;color:#f2ede8;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="text-align:center;">
          <h2 style="color:#e8430a;">🏀 EZLive Cloud Streaming Relay</h2>
          <p style="color:#a8a29e;">Status: <strong style="color:#4ade80;">ONLINE &amp; READY</strong></p>
          <p style="font-size:12px;color:#78716c;">Bridge for Mobile Tablet/Phone PWA &rarr; Facebook Live RTMP</p>
        </div>
      </body>
    </html>
  `);
});

const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', (ws, req) => {
  console.log('⚡ New incoming client connection for live streaming');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const rtmpsUrl = url.searchParams.get('rtmpsUrl') || 'rtmps://live-api-s.facebook.com:443/rtmp/';
  const streamKey = url.searchParams.get('streamKey');

  if (!streamKey) {
    console.error('❌ Connection rejected: Missing streamKey parameter');
    ws.close(1008, 'Missing streamKey');
    return;
  }

  let destinationUrl = '';
  // Avoid duplicating stream key if rtmpsUrl already contains it (e.g. from Facebook secure_stream_url)
  if (rtmpsUrl && rtmpsUrl.includes('/rtmp/') && rtmpsUrl.split('/rtmp/')[1]?.length > 5) {
    destinationUrl = rtmpsUrl;
  } else if (streamKey) {
    const cleanBase = rtmpsUrl.endsWith('/') ? rtmpsUrl : `${rtmpsUrl}/`;
    destinationUrl = `${cleanBase}${streamKey}`;
  } else {
    destinationUrl = rtmpsUrl;
  }

  console.log(`📡 Ingesting live stream from mobile client & forwarding to Facebook Live RTMP`);

  // Spawn FFmpeg to transcode incoming WebM/H.264 stream to Facebook-compliant RTMP/FLV
  const ffmpegArgs = [
    '-re',
    '-i', 'pipe:0',
    // Video configuration
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-b:v', '3500k',
    '-maxrate', '4000k',
    '-bufsize', '8000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60', // Keyframe every 2 seconds at 30fps (Required by Facebook Live)
    '-r', '30',
    // Audio configuration
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    // Output FLV to Facebook RTMPS
    '-f', 'flv',
    destinationUrl,
  ];

  let ffmpeg = null;
  try {
    ffmpeg = spawn('ffmpeg', ffmpegArgs);
  } catch (err) {
    console.error('❌ Failed to spawn ffmpeg:', err);
    ws.close(1011, 'FFmpeg spawn error');
    return;
  }

  let bytesReceived = 0;

  ffmpeg.stdout.on('data', (data) => {
    // FFmpeg stdout
  });

  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString();
    // Only log essential ffmpeg status or errors to keep console clean
    if (msg.includes('error') || msg.includes('Error') || msg.includes('fps=')) {
      console.log(`[FFmpeg] ${msg.trim()}`);
    }
  });

  ffmpeg.on('close', (code) => {
    console.log(`⏹️ FFmpeg process closed with code ${code}`);
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
  });

  ffmpeg.on('error', (err) => {
    console.error('❌ FFmpeg process error:', err);
  });

  ws.on('message', (chunk) => {
    bytesReceived += chunk.length;
    if (ffmpeg && ffmpeg.stdin && ffmpeg.stdin.writable) {
      try {
        ffmpeg.stdin.write(chunk);
      } catch (e) {
        console.warn('Error writing to FFmpeg stdin:', e);
      }
    }
  });

  ws.on('close', () => {
    console.log(`🔌 Client disconnected. Total streamed: ${(bytesReceived / 1024 / 1024).toFixed(2)} MB`);
    if (ffmpeg) {
      try {
        ffmpeg.stdin.end();
      } catch (e) {}
      setTimeout(() => {
        try {
          ffmpeg.kill('SIGTERM');
        } catch (e) {}
      }, 3000);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket client error:', err);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 EZLive Streaming Relay running on port ${PORT}`);
});
