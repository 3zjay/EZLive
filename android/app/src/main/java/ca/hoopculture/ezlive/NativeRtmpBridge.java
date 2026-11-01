package ca.hoopculture.ezlive;

import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.arthenica.ffmpegkit.FFmpegKit;
import com.arthenica.ffmpegkit.FFmpegKitConfig;
import com.arthenica.ffmpegkit.FFmpegSession;
import com.arthenica.ffmpegkit.ReturnCode;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Native On-Device RTMP / RTMPS Engine for EZLiveStudio Android App.
 * Eliminates the need for any external Cloud Relay server on Android by running
 * FFmpeg (with TLS/RTMPS + H.264 passthrough) directly on the phone/tablet.
 */
public class NativeRtmpBridge {
    private static final String TAG = "EZLiveNativeRTMP";
    private final MainActivity activity;
    private final WebView webView;
    private final ExecutorService writeExecutor = Executors.newSingleThreadExecutor();

    private String currentPipePath = null;
    private FileOutputStream pipeOutputStream = null;
    private FFmpegSession activeSession = null;
    private volatile boolean isStreaming = false;
    private long totalBytesSent = 0;
    private long lastHeartbeatTime = 0;

    public NativeRtmpBridge(MainActivity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    @JavascriptInterface
    public boolean isAvailable() {
        return true;
    }

    @JavascriptInterface
    public String startStream(
        String fbKey,
        String rtmpsUrl,
        String ytKey,
        String ytRtmpUrl,
        String customRtmpUrl,
        String customRtmpKey,
        int bitrateKbps,
        int fps,
        boolean isH264
    ) {
        stopStream();

        try {
            List<String> destinations = new ArrayList<>();

            if (fbKey != null && !fbKey.trim().isEmpty()) {
                String base = (rtmpsUrl != null && !rtmpsUrl.trim().isEmpty())
                    ? rtmpsUrl.trim()
                    : "rtmps://live-api-s.facebook.com:443/rtmp/";
                String fbDest;
                if (base.contains("/rtmp/") && base.split("/rtmp/").length > 1 && base.split("/rtmp/")[1].length() > 5) {
                    fbDest = base;
                } else {
                    String cleanBase = base.endsWith("/") ? base : base + "/";
                    fbDest = cleanBase + fbKey.trim();
                }
                destinations.add(fbDest);
            }

            if (ytKey != null && !ytKey.trim().isEmpty()) {
                String base = (ytRtmpUrl != null && !ytRtmpUrl.trim().isEmpty())
                    ? ytRtmpUrl.trim()
                    : "rtmp://a.rtmp.youtube.com/live2/";
                String ytDest;
                if (base.contains("/live2/") && base.split("/live2/").length > 1 && base.split("/live2/")[1].length() > 5) {
                    ytDest = base;
                } else {
                    String cleanBase = base.endsWith("/") ? base : base + "/";
                    ytDest = cleanBase + ytKey.trim();
                }
                destinations.add(ytDest);
            }

            if (customRtmpUrl != null && !customRtmpUrl.trim().isEmpty()) {
                String base = customRtmpUrl.trim();
                if (customRtmpKey != null && !customRtmpKey.trim().isEmpty()) {
                    String cleanBase = base.endsWith("/") ? base : base + "/";
                    destinations.add(cleanBase + customRtmpKey.trim());
                } else {
                    destinations.add(base);
                }
            }

            if (destinations.isEmpty()) {
                return "ERROR:No RTMP destination configured";
            }

            currentPipePath = FFmpegKitConfig.registerNewFFmpegPipe(activity);
            if (currentPipePath == null) {
                return "ERROR:Failed to register native Android media pipe";
            }

            totalBytesSent = 0;
            lastHeartbeatTime = System.currentTimeMillis();
            isStreaming = true;

            int targetBitrate = Math.min(Math.max(bitrateKbps, 1000), 6000);
            int maxrateKbps = Math.round(targetBitrate * 1.15f);
            int bufsizeKbps = Math.round(targetBitrate * 1.5f);
            int streamFps = Math.min(Math.max(fps, 24), 60);
            int gop = streamFps * 2;

            StringBuilder cmd = new StringBuilder();
            cmd.append("-fflags +genpts+discardcorrupt -analyzeduration 2000000 -probesize 2000000 ");
            cmd.append("-i ").append(currentPipePath).append(" ");

            if (isH264) {
                // Zero-CPU hardware H.264 passthrough directly from Android hardware MediaCodec
                cmd.append("-c:v copy ");
            } else {
                cmd.append("-c:v libx264 -preset ultrafast -tune zerolatency ")
                   .append("-b:v ").append(targetBitrate).append("k ")
                   .append("-maxrate ").append(maxrateKbps).append("k ")
                   .append("-bufsize ").append(bufsizeKbps).append("k ")
                   .append("-pix_fmt yuv420p -g ").append(gop).append(" -r ").append(streamFps).append(" ");
            }

            cmd.append("-c:a aac -b:a 128k -ar 44100 -ac 2 -af aresample=async=1000 -max_muxing_queue_size 4096 ");
            cmd.append("-avoid_negative_ts make_zero -flags +global_header ");

            if (destinations.size() == 1) {
                cmd.append("-f flv -flvflags no_duration_filesize \"").append(destinations.get(0)).append("\"");
            } else {
                StringBuilder tee = new StringBuilder();
                for (int i = 0; i < destinations.size(); i++) {
                    if (i > 0) tee.append("|");
                    tee.append("[f=flv:flvflags=no_duration_filesize:onfail=ignore]").append(destinations.get(i));
                }
                cmd.append("-f tee -map 0:v -map 0:a \"").append(tee.toString()).append("\"");
            }

            final String finalCommand = cmd.toString();
            Log.i(TAG, "Starting On-Device Native RTMP Engine: " + finalCommand);

            activeSession = FFmpegKit.executeAsync(
                finalCommand,
                session -> {
                    ReturnCode returnCode = session.getReturnCode();
                    int code = returnCode != null ? returnCode.getValue() : -1;
                    Log.i(TAG, "Native RTMP session finished with code: " + code);
                    if (isStreaming && !ReturnCode.isSuccess(returnCode) && !ReturnCode.isCancel(returnCode)) {
                        emitToJs("NATIVE_RTMP_EXIT", "{\"code\":" + code + "}");
                    }
                    isStreaming = false;
                },
                log -> {
                    String msg = log.getMessage();
                    if (msg != null && (msg.contains("Error") || msg.contains("Failed"))) {
                        Log.w(TAG, "FFmpeg: " + msg);
                    }
                },
                statistics -> {}
            );

            // Open pipe on background writer thread so first chunk unlocks immediately
            writeExecutor.execute(() -> {
                try {
                    pipeOutputStream = new FileOutputStream(new File(currentPipePath));
                    emitToJs("NATIVE_RTMP_READY", "{\"status\":\"streaming\"}");
                } catch (IOException e) {
                    Log.e(TAG, "Failed to open FFmpeg pipe for writing", e);
                    emitToJs("NATIVE_RTMP_ERROR", "{\"message\":\"Failed to open native pipe\"}");
                }
            });

            return "OK";
        } catch (Exception e) {
            Log.e(TAG, "startStream exception", e);
            return "ERROR:" + e.getMessage();
        }
    }

    @JavascriptInterface
    public void writeChunk(final String base64Chunk) {
        if (!isStreaming || base64Chunk == null || base64Chunk.isEmpty()) return;

        writeExecutor.execute(() -> {
            if (!isStreaming || pipeOutputStream == null) return;
            try {
                byte[] bytes = Base64.decode(base64Chunk, Base64.NO_WRAP);
                pipeOutputStream.write(bytes);
                pipeOutputStream.flush();
                totalBytesSent += bytes.length;

                long now = System.currentTimeMillis();
                if (now - lastHeartbeatTime >= 2000) {
                    lastHeartbeatTime = now;
                    String mb = String.format(java.util.Locale.US, "%.2f", totalBytesSent / (1024.0 * 1024.0));
                    emitToJs("NATIVE_RTMP_HEARTBEAT", "{\"mbSent\":\"" + mb + "\"}");
                }
            } catch (Exception e) {
                Log.w(TAG, "writeChunk error: " + e.getMessage());
            }
        });
    }

    @JavascriptInterface
    public void stopStream() {
        isStreaming = false;
        writeExecutor.execute(() -> {
            if (pipeOutputStream != null) {
                try {
                    pipeOutputStream.close();
                } catch (Exception ignored) {}
                pipeOutputStream = null;
            }
            if (currentPipePath != null) {
                try {
                    FFmpegKitConfig.closeFFmpegPipe(currentPipePath);
                } catch (Exception ignored) {}
                currentPipePath = null;
            }
        });
        if (activeSession != null) {
            try {
                FFmpegKit.cancel(activeSession.getSessionId());
            } catch (Exception ignored) {}
            activeSession = null;
        }
    }

    private void emitToJs(final String eventType, final String jsonPayload) {
        if (webView == null) return;
        activity.runOnUiThread(() -> {
            String js = "window.dispatchEvent(new CustomEvent('" + eventType + "', { detail: " + jsonPayload + " }));";
            webView.evaluateJavascript(js, null);
        });
    }
}
