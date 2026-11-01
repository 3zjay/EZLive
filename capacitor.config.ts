import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.hoopculture.ezlive',
  appName: 'EZLiveStudio',
  webDir: 'public',
  server: {
    url: 'https://ezlive.vercel.app/studio',
    cleartext: true,
    allowNavigation: [
      'ezlive.vercel.app',
      '*.vercel.app',
      'live.hoopculture.ca',
      '*.hoopculture.ca',
      'accounts.google.com',
      '*.google.com',
      '*.facebook.com',
      '*.fbcdn.net',
      '*.firebaseapp.com',
    ],
  },
  android: {
    backgroundColor: '#080605',
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: true,
  },
};

export default config;
