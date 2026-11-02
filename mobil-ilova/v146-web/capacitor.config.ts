import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.falarus.mobile',
  appName: 'FalaRus',
  webDir: 'dist',
  backgroundColor: '#0B2A6B',
  appendUserAgent: ' FalaRusAndroid',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0B2A6B',
    adjustMarginsForEdgeToEdge: 'auto',
    webContentsDebuggingEnabled: false,
    buildOptions: {
      releaseType: 'APK',
    },
  },
  server: {
    androidScheme: 'https',
    errorPath: 'android-offline.html',
    allowNavigation: [
      '*.click.uz',
      'my.click.uz',
      '*.multicard.uz',
      'accounts.google.com',
      '*.google.com',
      '*.googleusercontent.com',
      '*.gstatic.com',
    ],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
    launchShowDuration: 900,
      launchAutoHide: true,
      launchFadeOutDuration: 280,
      backgroundColor: '#0B2A6B',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0B2A6B',
    },
    Keyboard: {
      resize: 'native',
      resizeOnFullScreen: true,
    },
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
  },
};

export default config;
