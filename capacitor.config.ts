import type { CapacitorConfig } from '@capacitor/cli';

/*
 * Bitta konfiguratsiya ikkala ilova uchun. `npx cap sync ios` / `npx cap sync android`
 * buyrug'ida platforma nomi argument bo'lib keladi — farqlar shunga qarab tanlanadi:
 *   - App Store bundle ID `com.flarus.app`, Play Market — `com.falarus.mobile`;
 *   - iOS ilovasi Jitsi (video dars) va falarus.uz sahifalarini ichida ochadi —
 *     shu ro'yxat bilan App Store sinovidan o'tgan; Android xulqi o'zgarmaydi.
 */
const IOS_BUILD = process.argv.includes('ios');

const config: CapacitorConfig = {
  appId: IOS_BUILD ? 'com.flarus.app' : 'com.falarus.mobile',
  appName: 'FalaRus',
  webDir: 'dist',
  backgroundColor: '#0B2A6B',
  ios: {
    // iOS loyiha ham repoda: mobil-ilova/ios (Xcode workspace: App/App.xcworkspace).
    path: 'mobil-ilova/ios',
    scheme: 'FalaRus',
    contentInset: 'never',
    backgroundColor: '#0B2A6B',
    webContentsDebuggingEnabled: false,
    // Server shu belgi bilan ilovani taniydi (teacherRoutes: FalaRusAndroid / FalaRusIOS).
    appendUserAgent: ' FalaRusIOS',
  },
  android: {
    appendUserAgent: ' FalaRusAndroid',
    // Android loyiha repoda mobil-ilova/ ichida (ildizdagi /mobile/ gitignore'da).
    path: 'mobil-ilova/android',
    // Apple to'lovlari (@capgo/native-purchases) faqat iPhone uchun: Androidga
    // Google Play billing kutubxonasini olib kirmasin (v146 da ham yo'q edi).
    includePlugins: [
      '@capacitor/app',
      '@capacitor/browser',
      '@capacitor/haptics',
      '@capacitor/keyboard',
      '@capacitor/splash-screen',
      '@capacitor/status-bar',
      '@capgo/capacitor-social-login',
    ],
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
      ...(IOS_BUILD
        ? ['falarus.uz', 'www.falarus.uz', 'media.falarus.uz', 'meet.jit.si', '*.jit.si', '8x8.vc']
        : []),
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
