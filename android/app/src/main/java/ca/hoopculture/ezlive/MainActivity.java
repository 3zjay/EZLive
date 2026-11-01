package ca.hoopculture.ezlive;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private NativeRtmpBridge nativeRtmpBridge;
    private PermissionRequest pendingWebPermissionRequest = null;

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
            webSettings.setDomStorageEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Enable third-party cookies for Firebase Auth / Google & Facebook OAuth inside WebView
            try {
                android.webkit.CookieManager cookieManager = android.webkit.CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                cookieManager.setAcceptThirdPartyCookies(webView, true);
            } catch (Exception ignored) {}

            // Sanitize WebView User-Agent by stripping "; wv" and "Version/4.0 " so Google OAuth
            // never blocks sign-in with "Error 403: disallowed_useragent"
            String currentUa = webSettings.getUserAgentString();
            String cleanUa = currentUa
                .replace("; wv)", ")")
                .replace("; wv;", ";")
                .replace("Version/4.0 ", "");
            if (!cleanUa.contains("EZLiveAndroidApp")) {
                cleanUa = cleanUa + " EZLiveAndroidApp/1.2.0";
            }
            webSettings.setUserAgentString(cleanUa);

            // Register On-Device Native RTMP/RTMPS Engine Bridge (Zero Cloud Relay needed!)
            nativeRtmpBridge = new NativeRtmpBridge(this, webView);
            webView.addJavascriptInterface(nativeRtmpBridge, "EZLiveNativeRTMP");

            // Subclass Capacitor's BridgeWebChromeClient so WebRTC getUserMedia always receives camera & mic permissions
            webView.setWebChromeClient(new BridgeWebChromeClient(this.bridge) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        if (hasCameraPermission()) {
                            request.grant(request.getResources());
                        } else {
                            pendingWebPermissionRequest = request;
                            requestBroadcastPermissions();
                        }
                    });
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

    public boolean hasCameraPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED;
    }

    public void requestBroadcastPermissions() {
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
        } else {
            notifyPermissionsGranted();
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (pendingWebPermissionRequest != null) {
                try {
                    pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
                } catch (Exception ignored) {}
                pendingWebPermissionRequest = null;
            }
            notifyPermissionsGranted();
        }
    }

    public void notifyPermissionsGranted() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            android.webkit.WebView webView = this.bridge.getWebView();
            webView.post(() -> webView.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('ANDROID_PERMISSIONS_GRANTED'));",
                null
            ));
        }
    }
}
