'use client';
import { useEffect } from 'react';

/**
 * Capacitor native bridge initialization.
 * Runs once on mount. Wires up:
 *   - Status bar color (navy brand color)
 *   - Splash auto-hide
 *   - Hardware back button (WebView history, then prompt to exit)
 *   - Deep link routing (rinkstop://, https://rinkstop.com/...)
 *   - WebView polish (hide scrollbars, smooth scroll)
 *   - Haptics on key actions (wired separately via events)
 *   - App lifecycle (pause/resume)
 *
 * This component is a no-op on web. It only activates when running
 * inside the native WebView (Capacitor.isNativePlatform() === true).
 */
export default function CapacitorAppInit(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Wait one tick so Capacitor plugins can register
    const init = async () => {
      const Cap = (window as any).Capacitor;
      if (!Cap?.isNativePlatform?.()) return;

      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { App: CapApp } = await import('@capacitor/app');
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const { Share } = await import('@capacitor/share');

        // 1) Status bar — match brand navy
        try {
          await StatusBar.setBackgroundColor({ color: '#041E42' });
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setOverlaysWebView({ overlay: false });
        } catch (e) {
          console.warn('[Capacitor] StatusBar:', e);
        }

        // 2) Hide splash once WebView is ready
        try {
          await SplashScreen.hide({ fadeOutDuration: 250 });
        } catch (e) {
          console.warn('[Capacitor] SplashScreen:', e);
        }

        // 3) Hardware back button: WebView history first, then prompt to exit
        try {
          await CapApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
            if (canGoBack) {
              window.history.back();
              return;
            }
            // At root — prompt to exit
            CapApp.exitApp();
          });
        } catch (e) {
          console.warn('[Capacitor] App backButton:', e);
        }

        // 4) Deep links (rinkstop://team/123 → window.location)
        try {
          CapApp.addListener('appUrlOpen', ({ url }: { url: string }) => {
            // url looks like: rinkstop://team/123 or https://rinkstop.com/team/123
            try {
              const u = new URL(url);
              // For rinkstop:// the path is in u.host + u.pathname
              // For https://rinkstop.com/team/123 the path is u.pathname
              let path: string;
              if (u.protocol === 'rinkstop:') {
                // rinkstop://team/123 -> u.host = 'team', u.pathname = '/123'
                path = '/' + (u.host || '') + u.pathname;
                path = path.replace(/\/+/g, '/');
              } else {
                path = u.pathname + u.search + u.hash;
              }
              if (path && path !== window.location.pathname + window.location.search) {
                window.history.pushState({}, '', path);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            } catch (e) {
              console.warn('[Capacitor] appUrlOpen parse:', e);
            }
          });
        } catch (e) {
          console.warn('[Capacitor] App appUrlOpen:', e);
        }

        // 5) App lifecycle (pause/resume) — log for now, hooks TBD
        try {
          CapApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
            document.documentElement.dataset.appActive = String(isActive);
          });
        } catch (e) {
          console.warn('[Capacitor] App appStateChange:', e);
        }

        // 6) Haptics event bridge — pages can dispatch CustomEvent('haptic', {detail: 'light'|'medium'|'heavy'})
        try {
          window.addEventListener('haptic', async (ev: any) => {
            const style = ev.detail || 'light';
            const map: Record<string, any> = {
              light: ImpactStyle.Light,
              medium: ImpactStyle.Medium,
              heavy: ImpactStyle.Heavy,
            };
            try {
              await Haptics.impact({ style: map[style] || ImpactStyle.Light });
            } catch {}
          });
        } catch (e) {
          console.warn('[Capacitor] haptics bridge:', e);
        }

        // 7) Native share event bridge — pages dispatch CustomEvent('native-share', {detail: {title, text, url}})
        try {
          window.addEventListener('native-share', async (ev: any) => {
            const { title, text, url, dialogTitle } = ev.detail || {};
            try {
              await Share.share({ title, text, url, dialogTitle });
            } catch (e: any) {
              // User cancelled — silent
            }
          });
        } catch (e) {
          console.warn('[Capacitor] share bridge:', e);
        }

        // 8) WebView polish — hide scrollbars, smooth scroll
        try {
          const style = document.createElement('style');
          style.textContent = `
            html, body { scroll-behavior: smooth; -webkit-overflow-scrolling: touch; }
            body::-webkit-scrollbar { display: none; }
            body { scrollbar-width: none; }
            .nav-bar { padding-top: env(safe-area-inset-top); }
          `;
          document.head.appendChild(style);
        } catch (e) {
          console.warn('[Capacitor] webview polish:', e);
        }

        // 9) WebView clear-cache event bridge — dispatch CustomEvent('clear-cache') to clear cookies + storage
        // Used after logout so the next launch starts fresh.
        try {
          window.addEventListener('clear-cache', async () => {
            try {
              // Clear localStorage / sessionStorage
              localStorage.clear();
              sessionStorage.clear();
              // Clear cookies
              document.cookie.split(';').forEach(c => {
                const name = c.split('=')[0].trim();
                document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
              });
            } catch (e) {
              console.warn('[Capacitor] clear-cache:', e);
            }
          });
        } catch (e) {
          console.warn('[Capacitor] clear-cache bridge:', e);
        }

        // Mark initialized so the rest of the app can know
        (window as any).__capInitialized = true;
        document.documentElement.dataset.capPlatform = 'native';
        console.log('[Capacitor] native bridge ready');
      } catch (e) {
        console.error('[Capacitor] init failed:', e);
      }
    };

    init();
  }, []);

  return null;
}
