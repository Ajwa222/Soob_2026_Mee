/**
 * Unified analytics layer for SimbaApp.
 *
 * Integrates three providers, all lazy-loaded to avoid blocking first paint:
 *  - Google Analytics 4 (GA4) — page views and custom events via gtag.js
 *  - Mixpanel              — page views, events, user identification, session recording
 *  - Microsoft Clarity     — session recording and heatmaps
 *
 * Initialization strategy:
 *  - Mixpanel starts importing immediately (needed for early events)
 *  - GA4 and Clarity are deferred via requestIdleCallback (non-critical for first paint)
 *
 * Exported functions:
 *  - trackPageView(path)   — fires on every route change (called by AnalyticsTracker in App.tsx)
 *  - trackEvent(name, params) — fires custom events to all providers
 *  - identifyUser(user)    — links analytics data to a logged-in SimbaUser
 *  - resetUser()           — clears user identity on logout
 */
import type { SimbaUser } from '../types';

// Extend Window to include analytics globals injected by script tags
declare global {
  interface Window {
    dataLayer?: unknown[];          // GA4 data layer
    gtag?: (...args: unknown[]) => void;      // GA4 command function
    clarity?: (...args: unknown[]) => void;   // Clarity API
  }
}

// Lazy-loaded Mixpanel module — starts importing immediately, resolves before first event
let mixpanelLoaded: typeof import('mixpanel-browser') | null = null;
let mixpanelPromise: Promise<typeof import('mixpanel-browser') | null> | null = null;
let analyticsReady = false;

// Provider IDs — injected by Vite from .env
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

/**
 * Tracks a page view across GA4 and Mixpanel.
 * Called by AnalyticsTracker on every route change.
 *
 * @param path - The full path including query params (e.g. "/plans?carrier=STC")
 */
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

/**
 * Fires a custom event to GA4, Mixpanel, and Clarity.
 *
 * @param eventName - Event name (e.g. "plan_liked", "advisor_message_sent")
 * @param params    - Key-value pairs attached to the event
 * @param options   - Optional: { useBeacon: true } to use sendBeacon transport (for unload events)
 */
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

/**
 * Links analytics sessions to a logged-in user.
 * Sets Mixpanel identity + people properties and Clarity custom user ID.
 * Called from AuthContext after successful sign-in.
 */
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

/**
 * Clears the current user identity in Mixpanel.
 * Called from AuthContext on sign-out so subsequent events are anonymous.
 */
export function resetUser(): void {
  try {
    if (mixpanelLoaded) {
      mixpanelLoaded.default.reset();
    } else if (mixpanelPromise) {
      mixpanelPromise.then((mp) => { if (mp) mp.default.reset(); });
    }
  } catch { /* non-critical */ }
}
