import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the RinkStop Android app.
 *
 * Architecture: the APK is a thin native shell that loads the live
 * RinkStop web app (https://rinkstop.com) inside an Android WebView.
 * This is the right call for v1 because the Next.js app uses SSR, Clerk
 * auth, Server Actions, and Stripe webhooks — none of which work with a
 * static export. Going live-URL also means content updates ship instantly
 * without an app release.
 *
 * Trade-off: requires internet to use the app. Acceptable for v1 because
 * RinkStop is a real-time data product (scores, news, notifications).
 *
 * webDir is set to a placeholder path. We do not bundle the site into the
 * APK; the WebView fetches the live URL. `cap sync` will still need a
 * non-empty webDir to copy native assets (icons, splash), so we point it
 * at the .next build output and override the URL via server.url.
 */
const config: CapacitorConfig = {
  appId: 'com.rinkstop.app',
  appName: 'RinkStop',
  webDir: '.next', // placeholder; sync copies web assets, server.url is the actual load target
  server: {
    androidScheme: 'https',
    url: 'https://rinkstop.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // never enable in release; would expose WebView to adb inspection
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#041E42',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#041E42',
    },
  },
};

export default config;
