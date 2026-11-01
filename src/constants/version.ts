// 🏀 EZLive Broadcast Studio — Version & Build Configuration

export const APP_VERSION = '1.2.0';
export const APP_BUILD = 12;
export const APP_RELEASE_NAME = 'EZLiveStudio v1.2.0';
export const APP_RELEASE_DATE = 'November 2026';
export const APP_FULL_VERSION = `v${APP_VERSION} (Build ${APP_BUILD})`;

/**
 * Returns detected app version information.
 * If running inside the Android APK, it queries the on-device Native RTMP bridge.
 */
export function getInstalledAppVersion(): {
  version: string;
  isNative: boolean;
  platform: 'android' | 'web';
} {
  if (typeof window === 'undefined') {
    return { version: APP_FULL_VERSION, isNative: false, platform: 'web' };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nativeBridge = (window as any).EZLiveNativeRTMP;
  if (nativeBridge && typeof nativeBridge.getAppVersion === 'function') {
    try {
      const nativeVer = nativeBridge.getAppVersion();
      if (nativeVer) {
        return { version: String(nativeVer), isNative: true, platform: 'android' };
      }
    } catch {}
  }
  const isAndroidUa =
    typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('EZLiveAndroidApp') ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Boolean((window as any).Capacitor?.isNativePlatform?.()));

  return {
    version: APP_FULL_VERSION,
    isNative: isAndroidUa,
    platform: isAndroidUa ? 'android' : 'web',
  };
}
