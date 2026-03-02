import mixpanel from 'mixpanel-browser';
import Clarity from '@microsoft/clarity';
import type { SimbaUser } from '../types';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

// ── Mixpanel ──
const MP_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
try {
  if (MP_TOKEN) {
    mixpanel.init(MP_TOKEN, {
      debug: import.meta.env.DEV,
      track_pageview: false,
      persistence: 'localStorage',
      autocapture: true,
      record_sessions_percent: 100,
      api_host: 'https://api-eu.mixpanel.com',
      ignore_dnt: true,
      stop_utm_persistence: true,
    });
  }
} catch { /* analytics init should never crash the app */ }

// ── Microsoft Clarity ──
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;
try {
  if (CLARITY_ID) {
    Clarity.init(CLARITY_ID);
  }
} catch { /* analytics init should never crash the app */ }

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

    if (MP_TOKEN) {
      mixpanel.track_pageview({ page: path, page_title: document.title });
    }
  } catch { /* tracking failure is non-critical */ }
}

export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
    }

    if (MP_TOKEN) {
      mixpanel.track(eventName, params);
    }

    if (CLARITY_ID && typeof window.clarity === 'function') {
      window.clarity('event', eventName);
    }
  } catch { /* tracking failure is non-critical */ }
}

export function identifyUser(user: SimbaUser): void {
  try {
    if (!user) return;

    if (MP_TOKEN) {
      mixpanel.identify(user.uid);
      mixpanel.people.set({
        $name: user.name || user.email,
        $email: user.email,
        $avatar: user.photoURL,
        auth_provider: user.provider,
      });
      mixpanel.people.set_once({
        first_seen: new Date().toISOString(),
      });
    }

    if (CLARITY_ID && typeof window.clarity === 'function') {
      window.clarity('identify', user.uid, undefined, undefined, user.name || user.email);
    }
  } catch { /* tracking failure is non-critical */ }
}

export function resetUser(): void {
  try {
    if (MP_TOKEN) {
      mixpanel.reset();
    }
  } catch { /* tracking failure is non-critical */ }
}
