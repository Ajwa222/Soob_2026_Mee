/**
 * Root application component for SimbaApp.
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
    // URL override — also reset onboarded state so the variant shows immediately.
    localStorage.setItem('simba-onboarding-variant', cleaned);
    localStorage.removeItem('simba-onboarded');
    localStorage.removeItem('simba-onboarding-answers');
    sessionStorage.removeItem('simba-from-onboarding');
    return cleaned;
  }
  const stored = localStorage.getItem('simba-onboarding-variant');
  if (stored === 'A' || stored === 'B' || stored === 'C' || stored === 'D') return stored;
  const options: OnboardingVariantId[] = ['A', 'B', 'C', 'D'];
  const picked = options[Math.floor(Math.random() * options.length)];
  localStorage.setItem('simba-onboarding-variant', picked);
  return picked;
}

export function getOnboardingVariant(): OnboardingVariantId {
  return pickOnboardingVariant();
}

function OnboardingVariant() {
  const variant = pickOnboardingVariant();
  const { kind, autoGuide } = getVariantConfig(variant);
  // Register the variant as a Mixpanel super-property so every event in this
  // session is auto-tagged. Runs exactly once (registerSuperProperty is idempotent).
  useEffect(() => {
    registerSuperProperty('onboarding_variant', variant);
    registerSuperProperty('onboarding_kind', kind);
    registerSuperProperty('onboarding_auto_guide', autoGuide);
  }, [variant, kind, autoGuide]);
  return kind === 'chat' ? <OnboardingChat /> : <Onboarding />;
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

  const current = localStorage.getItem('simba-onboarding-variant') ?? '?';
  const config = (current === 'A' || current === 'B' || current === 'C' || current === 'D')
    ? getVariantConfig(current)
    : null;
  const labels: Record<OnboardingVariantId, string> = {
    A: 'A · classic + choice',
    B: 'B · classic + auto-guide',
    C: 'C · chat + choice',
    D: 'D · chat + auto-guide',
  };

  const switchTo = (v: OnboardingVariantId) => {
    const url = new URL(window.location.href);
    url.searchParams.set('ob', v);
    window.location.href = url.toString();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 99999,
        background: 'rgba(10,10,20,0.9)',
        color: '#FFD568',
        borderRadius: 12,
        padding: '8px 10px',
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontSize: 11,
        lineHeight: 1.4,
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(6px)',
        maxWidth: 240,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>
        Variant: {current} {config ? `· ${config.kind}${config.autoGuide ? ' · auto-guide' : ''}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {(['A', 'B', 'C', 'D'] as OnboardingVariantId[]).map((v) => (
          <button
            key={v}
            onClick={() => switchTo(v)}
            title={labels[v]}
            style={{
              background: current === v ? '#FFD568' : 'transparent',
              color: current === v ? '#0A0A14' : '#FFD568',
              border: '1px solid #FFD568',
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
    let pageTitle = 'Simba';
    if (pathname === '/' || pathname === '/home') pageTitle = `${t('pageTitles.home')} | Simba`;
    else if (pathname === '/plans') pageTitle = `${t('pageTitles.explore')} | Simba`;
    else if (pathname === '/browse') pageTitle = `${t('pageTitles.plans')} | Simba`;
    else if (pathname.startsWith('/plan/')) pageTitle = `${t('pageTitles.planDetail')} | Simba`;
    else if (pathname === '/advisor') pageTitle = `${t('pageTitles.advisor')} | Simba`;
    else if (pathname === '/profile') pageTitle = `${t('pageTitles.profile')} | Simba`;
    else if (pathname === '/compare') pageTitle = `${t('compare.title')} | Simba`;
    else if (pathname === '/switch') pageTitle = `Switch & Save | Simba`;
    else if (pathname === '/about') pageTitle = `${t('pageTitles.about')} | Simba`;
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
            <Navigation />
            <main className="flex-1">
              <Suspense fallback={<div className="flex-1 flex items-center justify-center min-h-[50vh]"><div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
              {/* ── Routes ── */}
              <Routes>
                {/* Main pages */}
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/plans" element={<ExplorePage />} />
                <Route path="/browse" element={<PlansPage />} />
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

                {/* Catch-all — renders 404 page for unknown routes */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </Suspense>
            </main>
            <Footer />
            <CompareBar />
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
