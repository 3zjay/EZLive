package ca.hoopculture.ezlive;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private NativeRtmpBridge nativeRtmpBridge;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep court tablet/phone screen awake during live basketball games
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Enable immersive fullscreen (auto-hide Android status and navigation bars)
        enableImmersiveFullscreen();

        // Request Android OS runtime permissions for Camera & Microphone on first launch
        requestBroadcastPermissions();

        // Grant WebRTC getUserMedia camera/audio permissions inside the Capacitor WebView
        if (this.bridge != null && this.bridge.getWebView() != null) {
            android.webkit.WebView webView = this.bridge.getWebView();
            android.webkit.WebSettings webSettings = webView.getSettings();
            webSettings.setMediaPlaybackRequiresUserGesture(false);
            String currentUa = webSettings.getUserAgentString();
            if (!currentUa.contains("EZLiveAndroidApp")) {
                webSettings.setUserAgentString(currentUa + " EZLiveAndroidApp/1.0");
            }

            // Register On-Device Native RTMP/RTMPS Engine Bridge (Zero Cloud Relay needed!)
            nativeRtmpBridge = new NativeRtmpBridge(this, webView);
            webView.addJavascriptInterface(nativeRtmpBridge, "EZLiveNativeRTMP");

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        if (nativeRtmpBridge != null) {
            nativeRtmpBridge.stopStream();
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableImmersiveFullscreen();
        }
    }

    private void enableImmersiveFullscreen() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
        );
    }

    private void requestBroadcastPermissions() {
        String[] requiredPermissions = new String[] {
            Manifest.permission.CAMERA,
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.MODIFY_AUDIO_SETTINGS
        };

        List<String> missingPermissions = new ArrayList<>();
        for (String perm : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
                missingPermissions.add(perm);
            }
        }

        if (!missingPermissions.isEmpty()) {
            ActivityCompat.requestPermissions(
                this,
                missingPermissions.toArray(new String[0]),
                PERMISSION_REQUEST_CODE
            );
        }
    }
}
