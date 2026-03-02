import mixpanel from 'mixpanel-browser';
import Clarity from '@microsoft/clarity';

// ── Mixpanel ──
const MP_TOKEN = import.meta.env.VITE_MIXPANEL_TOKEN;
if (MP_TOKEN) {
  mixpanel.init(MP_TOKEN, {
    debug: import.meta.env.DEV,
    track_pageview: false,        // we handle this manually
    persistence: 'localStorage',
    autocapture: true,
    record_sessions_percent: 100,
    api_host: 'https://api-eu.mixpanel.com',
    ignore_dnt: true,
    stop_utm_persistence: true,
  });
}

// ── Microsoft Clarity ──
const CLARITY_ID = import.meta.env.VITE_CLARITY_PROJECT_ID;
if (CLARITY_ID) {
  Clarity.init(CLARITY_ID);
}

// ── Unified tracking functions ──

export function trackPageView(path) {
  // Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title,
      page_location: window.location.href,
    });
  }

  // Mixpanel
  if (MP_TOKEN) {
    mixpanel.track_pageview({ page: path, page_title: document.title });
  }
}

export function trackEvent(eventName, params = {}) {
  // Google Analytics
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }

  // Mixpanel
  if (MP_TOKEN) {
    mixpanel.track(eventName, params);
  }

  // Clarity custom event
  if (CLARITY_ID && typeof window.clarity === 'function') {
    window.clarity('event', eventName);
  }
}

export function identifyUser(user) {
  if (!user) return;

  // Mixpanel
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

  // Clarity
  if (CLARITY_ID && typeof window.clarity === 'function') {
    window.clarity('identify', user.uid, undefined, undefined, user.name || user.email);
  }
}

export function resetUser() {
  // Mixpanel
  if (MP_TOKEN) {
    mixpanel.reset();
  }
}
