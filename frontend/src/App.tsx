/**
 * Root application component for SoobApp.
 *
 * Responsibilities:
 *  - Sets up client-side routing (React Router) with 13 routes
 *  - Wraps the app in nested context providers (Language → Auth → Plans → Bookmarks → Compare)
 *  - Lazy-loads all page components via React.lazy() for code-splitting
 *  - Renders global UI: Navigation bar, Footer, CompareBar (sticky bottom), Onboarding modal, PhoneGate
 *  - Includes utility components: ScrollToTop (resets scroll on navigation) and AnalyticsTracker (page views + titles)
 */
import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackPageView, registerSuperProperty } from './lib/analytics';
import { LanguageProvider, useLang } from './context/LanguageContext';
import { CompareProvider } from './context/CompareContext';
import { BookmarkProvider } from './context/BookmarkContext';
import { AuthProvider } from './context/AuthContext';
import { PlansProvider } from './context/PlansContext';
import ErrorBoundary from './components/ErrorBoundary';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import CompareBar from './components/CompareBar';
import Onboarding from './components/Onboarding';
import OnboardingChat from './components/OnboardingChat';
import PhoneGate from './components/PhoneGate';

/**
 * A/B/C/D variant picker — randomly assigns users on first visit, sticky per user.
 *
 *   A: Classic onboarding + advisor shows "Guide me / I know what I want" choice
 *   B: Classic onboarding + advisor skips choice, drops user into Guide Me directly
 *   C: Chat onboarding    + advisor shows choice
 *   D: Chat onboarding    + advisor skips choice, goes straight into Guide Me
 *
 * URL override: ?ob=A|B|C|D for manual testing.
 */
type OnboardingVariantId = 'A' | 'B' | 'C' | 'D';

export function getVariantConfig(v: OnboardingVariantId): {
  kind: 'classic' | 'chat';
  autoGuide: boolean;
} {
  switch (v) {
    case 'A': return { kind: 'classic', autoGuide: false };
    case 'B': return { kind: 'classic', autoGuide: true };
    case 'C': return { kind: 'chat', autoGuide: false };
    case 'D': return { kind: 'chat', autoGuide: true };
  }
}

function pickOnboardingVariant(): OnboardingVariantId {
  const raw = new URLSearchParams(window.location.search).get('ob') ?? '';
  // Strip whitespace, quotes, backticks — accept lowercase.
  const cleaned = raw.trim().replace(/['"`]/g, '').toUpperCase();
  if (cleaned === 'A' || cleaned === 'B' || cleaned === 'C' || cleaned === 'D') {
    const previous = localStorage.getItem('soob-onboarding-variant');
    localStorage.setItem('soob-onboarding-variant', cleaned);
    // Only reset onboarded state if the variant ACTUALLY CHANGED. Otherwise
    // a reload with the same ?ob= param keeps wiping the flag and the user
    // can never skip out of onboarding (we kept showing it again on every
    // page navigation).
    if (previous !== cleaned) {
      localStorage.removeItem('soob-onboarded');
      localStorage.removeItem('soob-onboarding-answers');
      sessionStorage.removeItem('soob-from-onboarding');
    }
    return cleaned;
  }
  const stored = localStorage.getItem('soob-onboarding-variant');
  if (stored === 'A' || stored === 'B' || stored === 'C' || stored === 'D') return stored;
  const options: OnboardingVariantId[] = ['A', 'B', 'C', 'D'];
  const picked = options[Math.floor(Math.random() * options.length)];
  localStorage.setItem('soob-onboarding-variant', picked);
  return picked;
}

export function getOnboardingVariant(): OnboardingVariantId {
  return pickOnboardingVariant();
}

// Register super-properties at MODULE LOAD time — before any React effect fires,
// before any trackEvent call lands. Guarantees every event (including the very
// first ones fired during component mount) carries onboarding_variant.
if (typeof window !== 'undefined') {
  const v = pickOnboardingVariant();
  const cfg = getVariantConfig(v);
  registerSuperProperty('onboarding_variant', v);
  registerSuperProperty('onboarding_kind', cfg.kind);
  registerSuperProperty('onboarding_auto_guide', cfg.autoGuide);
}

/**
 * SOOB site-wide visual themes.
 *   B — Lavender Burst:  light, lavender hero + lime accents (default)
 *   C — Deep Night:      dark, navy field + white ink + lavender accents
 *
 * URL override: ?ot=B|C. Persists to localStorage.
 * Applied to <html data-ot="..."> so every page reskins.
 */
type OnboardingThemeId = 'B' | 'C';

const ONBOARDING_THEME_LABELS: Record<OnboardingThemeId, string> = {
  B: 'B · Light',
  C: 'C · Dark',
};

function pickOnboardingTheme(): OnboardingThemeId {
  if (typeof window === 'undefined') return 'B';
  const raw = new URLSearchParams(window.location.search).get('ot') ?? '';
  const cleaned = raw.trim().replace(/['"`]/g, '').toUpperCase();
  if (cleaned === 'B' || cleaned === 'C') {
    localStorage.setItem('soob-onboarding-theme', cleaned);
    return cleaned;
  }
  const stored = localStorage.getItem('soob-onboarding-theme');
  if (stored === 'B' || stored === 'C') return stored;
  return 'B';
}

if (typeof document !== 'undefined') {
  const t = pickOnboardingTheme();
  document.documentElement.setAttribute('data-ot', t);
  registerSuperProperty('onboarding_theme', t);
}

function OnboardingVariant() {
  const location = useLocation();
  // Hide onboarding on lab / experimental pages — these are standalone tools.
  if (location.pathname.startsWith('/lab')) return null;
  const variant = pickOnboardingVariant();
  const { kind } = getVariantConfig(variant);
  return kind === 'chat' ? <OnboardingChat /> : <Onboarding />;
}

/**
 * Renders its children everywhere except on /lab/* routes. Used to strip the
 * standard app chrome (nav, footer, compare bar) from experimental lab pages
 * so they feel like standalone tools.
 */
function ChromeGate({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (pathname.startsWith('/lab')) return null;
  return <>{children}</>;
}

/**
 * Dev-only floating badge showing the current variant + quick switcher.
 * Visible only in dev mode OR when `?debug=1` is in the URL (so you can test
 * a preview build too). Hidden on production deploys unless explicitly opted in.
 */
function VariantDevBadge() {
  const isDev = import.meta.env.DEV;
  const hasDebugParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  if (!isDev && !hasDebugParam) return null;

  const currentVariant = localStorage.getItem('soob-onboarding-variant') ?? '?';
  const config = (currentVariant === 'A' || currentVariant === 'B' || currentVariant === 'C' || currentVariant === 'D')
    ? getVariantConfig(currentVariant)
    : null;
  const variantLabels: Record<OnboardingVariantId, string> = {
    A: 'A · classic + choice',
    B: 'B · classic + auto-guide',
    C: 'C · chat + choice',
    D: 'D · chat + auto-guide',
  };

  const currentTheme = (localStorage.getItem('soob-onboarding-theme') ?? 'A') as OnboardingThemeId;

  const switchVariant = (v: OnboardingVariantId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ob', v);
    window.location.href = url.toString();
  };

  const switchTheme = (t: OnboardingThemeId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ot', t);
    // NOTE: do NOT reset 'soob-onboarded' here — that re-shows the onboarding
    // overlay on every theme switch and hides the actual page underneath.
    window.location.href = url.toString();
  };

  const skipOnboarding = () => {
    localStorage.setItem('soob-onboarded', 'true');
    // Drop ?ob= from the URL so the variant picker doesn't re-clear the flag
    // on the next reload (see comment in pickOnboardingVariant).
    const url = new URL(window.location.href);
    url.searchParams.delete('ob');
    window.location.href = url.toString();
  };

  const replayOnboarding = () => {
    localStorage.removeItem('soob-onboarded');
    localStorage.removeItem('soob-onboarding-answers');
    window.location.reload();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 99999,
        background: 'rgba(10,10,20,0.92)',
        color: '#E0FF4F',
        borderRadius: 12,
        padding: '10px 12px',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 11,
        lineHeight: 1.4,
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(6px)',
        maxWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Flow: {currentVariant} {config ? `· ${config.kind}${config.autoGuide ? ' · auto-guide' : ''}` : ''}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['A', 'B', 'C', 'D'] as OnboardingVariantId[]).map((v) => (
            <button
              key={v}
              onClick={() => switchVariant(v)}
              title={variantLabels[v]}
              style={{
                background: currentVariant === v ? '#E0FF4F' : 'transparent',
                color: currentVariant === v ? '#0A0A14' : '#E0FF4F',
                border: '1px solid #E0FF4F',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(224,255,79,0.2)', paddingTop: 6 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Theme: {currentTheme} · {ONBOARDING_THEME_LABELS[currentTheme].split(' · ')[1]}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {(['B', 'C'] as OnboardingThemeId[]).map((t) => (
            <button
              key={t}
              onClick={() => switchTheme(t)}
              title={ONBOARDING_THEME_LABELS[t]}
              style={{
                background: currentTheme === t ? '#B79EFF' : 'transparent',
                color: currentTheme === t ? '#0A0A14' : '#B79EFF',
                border: '1px solid #B79EFF',
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 11,
                fontFamily: 'inherit',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div style={{ borderTop: '1px solid rgba(224,255,79,0.2)', paddingTop: 6, display: 'flex', gap: 4 }}>
        <button
          onClick={skipOnboarding}
          style={{
            flex: 1,
            background: 'transparent',
            color: '#E0FF4F',
            border: '1px solid #E0FF4F',
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 10,
            fontFamily: 'inherit',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Skip onboarding
        </button>
        <button
          onClick={replayOnboarding}
          style={{
            flex: 1,
            background: 'transparent',
            color: '#E0FF4F',
            border: '1px solid #E0FF4F',
            borderRadius: 6,
            padding: '3px 8px',
            fontSize: 10,
            fontFamily: 'inherit',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Replay
        </button>
      </div>
    </div>
  );
}

// ── Lazy-loaded page components (each becomes a separate JS chunk) ──
const HomePage = lazy(() => import('./pages/HomePage'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const PlanDetailPage = lazy(() => import('./pages/PlanDetailPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const AdvisorPage = lazy(() => import('./pages/AdvisorPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const SwitchSavePage = lazy(() => import('./pages/SwitchSavePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const BrowseHubPage = lazy(() => import('./pages/BrowseHubPage'));
const BrowseHubVariations = lazy(() => import('./pages/BrowseHubVariations'));
const InternetPage = lazy(() => import('./pages/InternetPage'));
const VouchersPage = lazy(() => import('./pages/VouchersPage'));
const VouchersVariations = lazy(() => import('./pages/VouchersVariations'));
const AuthVariations = lazy(() => import('./pages/AuthVariations'));
// Hidden experimental lab — not linked from the main nav, reachable via /lab/usage
const UsageAnalyzerPage = lazy(() => import('./pages/UsageAnalyzerPage'));

/**
 * Scrolls the window to the top whenever the route changes.
 * Renders nothing — purely a side-effect component.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Sets the document title and fires a page-view analytics event on every navigation.
 * Maps each route to a localized title string (via useLang), then calls trackPageView().
 * Renders nothing — purely a side-effect component.
 */
function AnalyticsTracker() {
  const { pathname, search } = useLocation();
  const { t } = useLang();
  useEffect(() => {
    // Set dynamic page title based on route
    let pageTitle = 'SOOB';
    if (pathname === '/' || pathname === '/home') pageTitle = `${t('pageTitles.home')} | SOOB`;
    else if (pathname === '/plans') pageTitle = `${t('pageTitles.explore')} | SOOB`;
    else if (pathname === '/browse') pageTitle = `${t('pageTitles.plans')} | SOOB`;
    else if (pathname.startsWith('/plan/')) pageTitle = `${t('pageTitles.planDetail')} | SOOB`;
    else if (pathname === '/advisor') pageTitle = `${t('pageTitles.advisor')} | SOOB`;
    else if (pathname === '/profile') pageTitle = `${t('pageTitles.profile')} | SOOB`;
    else if (pathname === '/compare') pageTitle = `${t('compare.title')} | SOOB`;
    else if (pathname === '/switch') pageTitle = `Switch & Save | SOOB`;
    else if (pathname === '/about') pageTitle = `${t('pageTitles.about')} | SOOB`;
    document.title = pageTitle;

    // Track page view with full path (including query params)
    trackPageView(pathname + search);
  }, [pathname, search, t]);
  return null;
}

/**
 * Root component — assembles providers, layout shell, and routes.
 *
 * Provider nesting order (outermost → innermost):
 *   ErrorBoundary → BrowserRouter → Language → Auth → Plans → Bookmarks → Compare
 *
 * Layout:
 *   Navigation (top) → <main> with lazy-loaded routes → Footer (bottom)
 *   CompareBar (sticky bottom bar, visible when plans are selected)
 *   Onboarding + PhoneGate (overlay modals for first-time users)
 */
function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <ScrollToTop />
      <LanguageProvider>
        <AuthProvider>
      <AnalyticsTracker />
        <PlansProvider>
        <BookmarkProvider>
        <CompareProvider>
          <div className="relative min-h-screen flex flex-col bg-background">
            <ChromeGate><Navigation /></ChromeGate>
            <main className="flex-1">
              <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
              {/* ── Routes ── */}
              <Routes>
                {/* Main pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/plans" element={<ExplorePage />} />
                <Route path="/browse" element={<BrowseHubPage />} />
                <Route path="/browse-variants" element={<BrowseHubVariations />} />
                <Route path="/browse/mobile" element={<Navigate to="/plans" replace />} />
                <Route path="/internet" element={<InternetPage />} />
                <Route path="/vouchers" element={<VouchersPage />} />
                <Route path="/vouchers-variants" element={<VouchersVariations />} />
                <Route path="/auth-variants" element={<AuthVariations />} />
                {/* Legacy alternate-browse route — keep for backward compat */}
                <Route path="/browse/all" element={<PlansPage />} />
                <Route path="/plan/:id" element={<PlanDetailPage />} />
                <Route path="/advisor" element={<AdvisorPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/switch" element={<SwitchSavePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/about" element={<AboutPage />} />

                {/* Legacy redirects — old URLs that now point elsewhere */}
                <Route path="/explore" element={<Navigate to="/plans" replace />} />
                <Route path="/finder" element={<Navigate to="/advisor" replace />} />
                <Route path="/help" element={<Navigate to="/" replace />} />

                {/* Hidden experimental lab route — not in nav */}
                <Route path="/lab/usage" element={<UsageAnalyzerPage />} />

                {/* Catch-all — renders 404 page for unknown routes */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </Suspense>
            </main>
            <ChromeGate><Footer /></ChromeGate>
            <ChromeGate><CompareBar /></ChromeGate>
          </div>
          <OnboardingVariant />
          <VariantDevBadge />
          <PhoneGate />
        </CompareProvider>
        </BookmarkProvider>
        </PlansProvider>
        </AuthProvider>
        </LanguageProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
