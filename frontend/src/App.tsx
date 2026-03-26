import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackPageView } from './lib/analytics';
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
import PhoneGate from './components/PhoneGate';
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

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

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
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/plans" element={<ExplorePage />} />
                <Route path="/browse" element={<PlansPage />} />
                <Route path="/explore" element={<Navigate to="/plans" replace />} />
                <Route path="/plan/:id" element={<PlanDetailPage />} />
                <Route path="/finder" element={<Navigate to="/advisor" replace />} />
                <Route path="/advisor" element={<AdvisorPage />} />
                <Route path="/compare" element={<ComparePage />} />
                <Route path="/switch" element={<SwitchSavePage />} />
                <Route path="/help" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </Suspense>
            </main>
            <Footer />
            <CompareBar />
          </div>
          <Onboarding />
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
