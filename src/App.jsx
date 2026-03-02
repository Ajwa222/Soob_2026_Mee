import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { trackPageView } from './lib/analytics';
import { LanguageProvider, useLang } from './context/LanguageContext';
import { CompareProvider } from './context/CompareContext';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
// import ChatBubble from './components/ChatBubble';
import CompareBar from './components/CompareBar';
import Onboarding from './components/Onboarding';
import HomePage from './pages/HomePage';
import PlansPage from './pages/PlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import FinderPage from './pages/FinderPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
// import GamePage from './pages/GamePage';
// import ChatPage from './pages/ChatPage';
import GradientBackground from './components/GradientBackground';

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
    else if (pathname === '/plans') pageTitle = `${t('pageTitles.plans')} | Simba`;
    else if (pathname.startsWith('/plan/')) pageTitle = `${t('pageTitles.planDetail')} | Simba`;
    else if (pathname === '/finder') pageTitle = `${t('pageTitles.finder')} | Simba`;
    else if (pathname === '/profile') pageTitle = `${t('pageTitles.profile')} | Simba`;
    else if (pathname === '/about') pageTitle = `${t('pageTitles.about')} | Simba`;
    document.title = pageTitle;

    // Track page view with full path (including query params)
    trackPageView(pathname + search);
  }, [pathname, search, t]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <LanguageProvider>
      <AnalyticsTracker />
        <AuthProvider>
        <CompareProvider>
          <div className="relative min-h-screen flex flex-col">
            <GradientBackground />
            <Navigation />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/plan/:id" element={<PlanDetailPage />} />
                <Route path="/finder" element={<FinderPage />} />
                <Route path="/help" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/about" element={<AboutPage />} />
                {/* <Route path="/game" element={<GamePage />} /> */}
                {/* <Route path="/chat" element={<ChatPage />} /> */}
              </Routes>
            </main>
            <Footer />
            {/* <ChatBubble /> */}
            <CompareBar />
          </div>
          <Onboarding />
        </CompareProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
