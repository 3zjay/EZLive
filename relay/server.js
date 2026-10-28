const http = require('http');
const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 10000;
const recentLogs = [];

function addLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  recentLogs.push(line);
  if (recentLogs.length > 200) recentLogs.shift();
  console.log(line);
}

const server = http.createServer((req, res) => {
  // 1. Health check for Render
  if (req.url === '/health' || req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  // 2. Real-time diagnostics log viewer for commissioners & debugging
  if (req.url === '/logs') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EZLive Relay — Live Diagnostics Logs</title>
          <meta http-equiv="refresh" content="3">
          <style>
            body { background: #080605; color: #f2ede8; font-family: monospace; padding: 20px; }
            h2 { color: #e8430a; margin-top: 0; }
            .badge { background: #166534; color: #4ade80; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
            pre { background: #111827; padding: 16px; border-radius: 8px; border: 1px solid #374151; max-height: 80vh; overflow-y: auto; white-space: pre-wrap; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>🏀 EZLive Cloud Relay Diagnostics (Render)</h2>
          <p>Status: <span class="badge">ONLINE</span> &nbsp;|&nbsp; Server Uptime: ${Math.round(process.uptime())}s &nbsp;|&nbsp; Auto-refreshes every 3s</p>
          <pre>${recentLogs.length > 0 ? recentLogs.join('\n') : 'No active stream logs yet. Start broadcasting from EZLive studio to stream.'}</pre>
        </body>
      </html>
    `);
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
          <p style="margin-top:20px;"><a href="/logs" style="color:#38bdf8;text-decoration:none;font-weight:bold;">&rarr; View Live Diagnostics Logs (/logs)</a></p>
        </div>
      </body>
    </html>
  `);
});

const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', (ws, req) => {
  addLog('⚡ New incoming client connection for live streaming');

  const url = new URL(req.url, `http://${req.headers.host}`);
  const rtmpsUrl = url.searchParams.get('rtmpsUrl') || 'rtmps://live-api-s.facebook.com:443/rtmp/';
  const streamKey = url.searchParams.get('streamKey');

  if (!streamKey) {
    addLog('❌ Connection rejected: Missing streamKey parameter');
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

  const maskedKey = streamKey.length > 8 ? `${streamKey.slice(0, 4)}...${streamKey.slice(-4)}` : '***';
  addLog(`📡 Target Facebook RTMP destination configured (Key: ${maskedKey})`);

  // Spawn FFmpeg to transcode incoming WebM/H.264 stream to Facebook-compliant RTMP/FLV
  // Note: Do NOT use -re when reading from a live network pipe (pipe:0)
  const ffmpegArgs = [
    '-i', 'pipe:0',
    // Video configuration
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-tune', 'zerolatency',
    '-b:v', '3000k',
    '-maxrate', '3500k',
    '-bufsize', '6000k',
    '-pix_fmt', 'yuv420p',
    '-g', '60', // Keyframe every 2 seconds at 30fps (Required by Facebook Live)
    '-r', '30',
    // Audio configuration
    '-c:a', 'aac',
    '-b:a', '128k',
    '-ar', '44100',
    // Output FLV to Facebook RTMPS
    '-f', 'flv',
    '-flvflags', 'no_duration_filesize',
    destinationUrl,
  ];

  let ffmpeg = null;
  try {
    ffmpeg = spawn('ffmpeg', ffmpegArgs);
    addLog('🚀 FFmpeg process spawned successfully');
  } catch (err) {
    addLog(`❌ Failed to spawn ffmpeg: ${err.message}`);
    ws.close(1011, 'FFmpeg spawn error');
    return;
  }

  // Acknowledge connection to client
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: 'STATUS', status: 'ready', message: 'Relay online and FFmpeg active' }));
  }

  let bytesReceived = 0;
  let lastHeartbeatTime = Date.now();

  ffmpeg.stdin.on('error', (err) => {
    addLog(`⚠️ FFmpeg stdin error: ${err.message}`);
  });

  ffmpeg.stdout.on('data', () => {});

  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString();
    addLog(`[FFmpeg] ${msg.trim()}`);

    if (msg.includes('fps=') || msg.includes('speed=')) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'FFMPEG_STATS', message: msg.trim() }));
      }
    } else if (msg.includes('error') || msg.includes('Error') || msg.includes('failed') || msg.includes('Failed')) {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'FFMPEG_ERROR', message: msg.trim() }));
      }
    }
  });

  ffmpeg.on('close', (code) => {
    addLog(`⏹️ FFmpeg process closed with code ${code}`);
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'FFMPEG_EXIT',
        code,
        message: code === 0 ? 'Stream ended normally' : `FFmpeg terminated (exit code ${code})`,
        recentLogs: recentLogs.slice(-5),
      }));
      ws.close(1000, `FFmpeg exited (${code})`);
    }
  });

  ffmpeg.on('error', (err) => {
    addLog(`❌ FFmpeg process error: ${err.message}`);
  });

  ws.on('message', (chunk) => {
    bytesReceived += chunk.length;

    // Send periodic telemetry back to mobile client every 3 seconds
    const now = Date.now();
    if (now - lastHeartbeatTime >= 3000) {
      lastHeartbeatTime = now;
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'HEARTBEAT',
          bytesReceived,
          mbReceived: (bytesReceived / 1024 / 1024).toFixed(2),
        }));
      }
    }

    if (ffmpeg && ffmpeg.stdin && ffmpeg.stdin.writable) {
      try {
        ffmpeg.stdin.write(chunk);
      } catch (e) {
        addLog(`Error writing to FFmpeg stdin: ${e.message}`);
      }
    }
  });

  ws.on('close', () => {
    addLog(`🔌 Client disconnected. Total streamed: ${(bytesReceived / 1024 / 1024).toFixed(2)} MB`);
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
    addLog(`WebSocket client error: ${err.message}`);
  });
});

server.listen(PORT, () => {
  addLog(`🚀 EZLive Streaming Relay running on port ${PORT}`);
});
