import type { SimbaUser } from '../types';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

// Lazy-loaded analytics modules
let mixpanelLoaded: typeof import('mixpanel-browser') | null = null;
let mixpanelPromise: Promise<typeof import('mixpanel-browser') | null> | null = null;
let analyticsReady = false;

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const MP_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;

// Initialize analytics lazily — don't block first paint
function initAnalytics() {
  if (analyticsReady) return;
  analyticsReady = true;

  // Google Analytics — lightweight script tag, no JS import
  try {
    if (GA_ID) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      document.head.appendChild(script);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function gtag() {
        window.dataLayer!.push(arguments);
      };
      window.gtag('js', new Date());
      window.gtag('config', GA_ID, { send_page_view: false });
    }
  } catch { /* non-critical */ }

  // Clarity — lazy import
  if (CLARITY_ID) {
    import('@microsoft/clarity').then((Clarity) => {
      try { Clarity.default.init(CLARITY_ID); } catch { /* non-critical */ }
    }).catch(() => {});
  }
}

// Start Mixpanel import immediately so it's ready for early events
if (typeof window !== 'undefined' && MP_TOKEN) {
  mixpanelPromise = import('mixpanel-browser').then((mp) => {
    mixpanelLoaded = mp;
    try {
      mp.default.init(MP_TOKEN, {
        debug: import.meta.env.DEV,
        track_pageview: false,
        persistence: 'localStorage',
        autocapture: true,
        record_sessions_percent: 100,
        api_host: 'https://api-eu.mixpanel.com',
        ignore_dnt: true,
        stop_utm_persistence: true,
      });
    } catch { /* non-critical */ }
    return mp;
  }).catch(() => null);
}

// Kick off remaining analytics (GA, Clarity) after first paint
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => initAnalytics(), { timeout: 2000 });
  } else {
    setTimeout(initAnalytics, 1000);
  }
}

// ── Unified tracking functions ──

export function trackPageView(path: string): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: document.title,
        page_location: window.location.href,
      });
    }

    const trackMp = (mp: typeof import('mixpanel-browser')) => {
      mp.default.track_pageview({ page: path, page_title: document.title });
    };

    if (mixpanelLoaded) {
      trackMp(mixpanelLoaded);
    } else if (mixpanelPromise) {
      mixpanelPromise.then((mp) => { if (mp) trackMp(mp); });
    }
  } catch { /* non-critical */ }
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}, options?: { useBeacon?: boolean }): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }

    const trackMixpanel = (mp: typeof import('mixpanel-browser')) => {
      mp.default.track(eventName, params, {
        transport: options?.useBeacon ? 'sendBeacon' : 'xhr',
      });
    };

    if (mixpanelLoaded) {
      trackMixpanel(mixpanelLoaded);
    } else if (mixpanelPromise) {
      // Mixpanel is still loading — wait for it then fire
      mixpanelPromise.then((mp) => { if (mp) trackMixpanel(mp); });
    }

    if (CLARITY_ID && typeof window.clarity === 'function') {
      window.clarity('event', eventName);
    }
  } catch { /* non-critical */ }
}

export function identifyUser(user: SimbaUser): void {
  try {
    if (!user) return;

    const identifyMp = (mp: typeof import('mixpanel-browser')) => {
      mp.default.identify(user.uid);
      mp.default.people.set({
        $name: user.name || user.email,
        $email: user.email,
        $avatar: user.photoURL,
        auth_provider: user.provider,
      });
      mp.default.people.set_once({
        first_seen: new Date().toISOString(),
      });
    };

    if (mixpanelLoaded) {
      identifyMp(mixpanelLoaded);
    } else if (mixpanelPromise) {
      mixpanelPromise.then((mp) => { if (mp) identifyMp(mp); });
    }

    if (CLARITY_ID && typeof window.clarity === 'function') {
      window.clarity('identify', user.uid, undefined, undefined, user.name || user.email);
    }
  } catch { /* non-critical */ }
}

export function resetUser(): void {
  try {
    if (mixpanelLoaded) {
      mixpanelLoaded.default.reset();
    } else if (mixpanelPromise) {
      mixpanelPromise.then((mp) => { if (mp) mp.default.reset(); });
    }
  } catch { /* non-critical */ }
}
