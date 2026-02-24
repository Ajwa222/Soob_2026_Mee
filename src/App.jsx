import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { CompareProvider } from './context/CompareContext';
import { AuthProvider } from './context/AuthContext';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ChatBubble from './components/ChatBubble';
import CompareBar from './components/CompareBar';
import Onboarding from './components/Onboarding';
import HomePage from './pages/HomePage';
import PlansPage from './pages/PlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import FinderPage from './pages/FinderPage';
import ProfilePage from './pages/ProfilePage';
import AboutPage from './pages/AboutPage';
import GamePage from './pages/GamePage';
import ChatPage from './pages/ChatPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <LanguageProvider>
        <AuthProvider>
        <CompareProvider>
          <div className="min-h-screen bg-bg flex flex-col">
            <Navigation />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/plan/:id" element={<PlanDetailPage />} />
                <Route path="/finder" element={<FinderPage />} />
                <Route path="/help" element={<Navigate to="/" replace />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/chat" element={<ChatPage />} />
              </Routes>
            </main>
            <Footer />
            <ChatBubble />
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
