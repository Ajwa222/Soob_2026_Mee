/**
 * Top navigation bar — responsive header with mobile bottom nav.
 *
 * Desktop: horizontal nav links + language toggle + theme toggle.
 * Mobile:  fixed bottom tab bar (Home, Browse, Advisor, Profile) + hamburger menu for extras.
 * Hides on scroll-down, reappears on scroll-up (desktop only).
 * Only renders after the user has an account (hasAccount from AuthContext).
 */
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Search, User, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { t, lang, theme, toggleTheme } = useLang();
  const { hasAccount } = useAuth();
  const location = useLocation();
  const [onboarded, setOnboarded] = useState(() => !!localStorage.getItem('soob-onboarded'));

  useEffect(() => {
    if (onboarded) return;
    const check = () => {
      if (localStorage.getItem('soob-onboarded')) setOnboarded(true);
    };
    window.addEventListener('storage', check);
    const interval = setInterval(check, 500);
    return () => { window.removeEventListener('storage', check); clearInterval(interval); };
  }, [onboarded]);

  // "Focus mode" — user was navigated here directly from onboarding completion.
  // Hides the top nav until AdvisorPage signals plans have been rendered OR user leaves /advisor.
  const [fromOnboarding, setFromOnboarding] = useState(() => {
    return sessionStorage.getItem('soob-from-onboarding') === '1';
  });
  useEffect(() => {
    const navState = (location.state as { fromOnboarding?: boolean } | null)?.fromOnboarding;
    if (navState && location.pathname === '/advisor') {
      sessionStorage.setItem('soob-from-onboarding', '1');
      setFromOnboarding(true);
    } else if (location.pathname !== '/advisor') {
      sessionStorage.removeItem('soob-from-onboarding');
      setFromOnboarding(false);
    }
  }, [location.state, location.pathname]);

  // Release focus mode once the advisor page shows the user actual plans.
  useEffect(() => {
    if (!fromOnboarding) return;
    const release = () => {
      sessionStorage.removeItem('soob-from-onboarding');
      setFromOnboarding(false);
    };
    window.addEventListener('soob-advisor-plans-shown', release);
    return () => window.removeEventListener('soob-advisor-plans-shown', release);
  }, [fromOnboarding]);

  if (!onboarded) return null;
  if (fromOnboarding && location.pathname === '/advisor') return null;

  const handleNav = (e: React.MouseEvent, path: string) => {
    if (location.pathname === path || (path === '/home' && location.pathname === '/')) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const browseLabel = lang === 'ar' ? 'تصفح' : 'Browse';

  const navItems = [
    { path: '/home', label: t('nav.home') },
    { path: '/browse', label: browseLabel },
    { path: '/advisor', label: t('nav.finder') },
    { path: '/profile', label: t('nav.profile') },
  ];

  const mobileNavItems = [
    { path: '/home', label: t('nav.home'), icon: Home },
    { path: '/browse', label: browseLabel, icon: LayoutGrid },
    { path: '/advisor', label: t('nav.finder'), icon: Search },
    { path: '/profile', label: t('nav.profile'), icon: User },
  ];

  const isActive = (path: string) => {
    const here = location.pathname;
    if (here === path) return true;
    if (path === '/home' && here === '/') return true;
    // The Browse tab is "active" on every catalog subpage so the user always
    // knows which top-level section they're inside.
    if (path === '/browse') {
      return (
        here === '/browse' ||
        here.startsWith('/browse/') ||
        here === '/plans' ||
        here.startsWith('/plan/') ||
        here === '/internet' ||
        here === '/vouchers' ||
        here === '/compare' ||
        here === '/switch'
      );
    }
    return false;
  };

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border/60">
        <div className="w-full max-w-5xl mx-auto px-8 flex items-center justify-between h-16">
          <Link to="/" aria-label="SOOB" className="flex items-center shrink-0 group">
            <img src="/logo-arabic-navy.png"  alt="SOOB / صوب" className="theme-light-only h-5 w-auto max-w-none" />
            <img src="/logo-arabic-white.png" alt="SOOB / صوب" className="theme-dark-only h-5 w-auto max-w-none" />
          </Link>

          <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className={`relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-card text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {item.label}
                {isActive(item.path) && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-xl hover:bg-muted/80 transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-[200] bg-card/90 backdrop-blur-md border-t border-border/60`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-2">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200
                  ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {active && (
                  <span className="absolute -top-0.5 w-5 h-0.5 rounded-full bg-primary" />
                )}
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-[200] bg-card/90 backdrop-blur-md border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" aria-label="SOOB" className="flex items-center shrink-0">
            <img src="/logo-arabic-navy.png"  alt="SOOB / صوب" className="theme-light-only h-4 w-auto max-w-none" />
            <img src="/logo-arabic-white.png" alt="SOOB / صوب" className="theme-dark-only h-4 w-auto max-w-none" />
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-xl">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </div>
      </div>
    </>
  );
}
