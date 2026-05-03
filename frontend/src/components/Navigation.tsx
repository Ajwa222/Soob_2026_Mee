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
import { Home, LayoutGrid, Search, User, UserCircle, Package } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { t, lang } = useLang();
  const { hasAccount, user } = useAuth();
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

  const ordersLabel = lang === 'ar' ? 'طلباتي' : 'Orders';

  const navItems = [
    { path: '/home', label: t('nav.home') },
    { path: '/browse', label: browseLabel },
    { path: '/advisor', label: t('nav.finder') },
    // Orders only for logged-in users — they wouldn't have any otherwise.
    ...(user ? [{ path: '/orders', label: ordersLabel }] : []),
    { path: '/profile', label: t('nav.profile') },
  ];

  const mobileNavItems = [
    { path: '/home', label: t('nav.home'), icon: Home },
    { path: '/browse', label: browseLabel, icon: LayoutGrid },
    { path: '/advisor', label: t('nav.finder'), icon: Search },
    // Replace Profile with Orders for logged-in users (Profile reachable via top-right pill).
    user
      ? { path: '/orders', label: ordersLabel, icon: Package }
      : { path: '/profile', label: t('nav.profile'), icon: User },
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
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#FE7151' }} />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center">
            {user ? (
              <Link
                to="/profile"
                aria-label={lang === 'ar' ? 'الحساب' : 'Account'}
                className={`rounded-xl w-9 h-9 inline-flex items-center justify-center transition-colors ${
                  isActive('/profile') ? 'bg-muted/80' : 'hover:bg-muted/80'
                }`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover"
                  />
                ) : (
                  <span
                    className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}
                  >
                    {(user.name || user.phone || '?')[0].toUpperCase()}
                  </span>
                )}
              </Link>
            ) : (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 ps-1.5 pe-3.5 h-9 rounded-full text-[12px] font-bold border-2 transition-transform hover:translate-y-[-1px]"
                style={{ background: '#C59AFA', color: '#16143A', borderColor: '#16143A' }}
              >
                <span className="w-6 h-6 rounded-full bg-white/30 inline-flex items-center justify-center">
                  <UserCircle size={15} strokeWidth={2.2} />
                </span>
                <span>{lang === 'ar' ? 'انضم لصوب' : 'Join SOOB'}</span>
              </Link>
            )}
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
                  <span className="absolute -top-0.5 w-5 h-0.5 rounded-full" style={{ background: '#FE7151' }} />
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
          {user ? (
            <Link
              to="/profile"
              aria-label={lang === 'ar' ? 'الحساب' : 'Account'}
              className="rounded-xl w-9 h-9 inline-flex items-center justify-center"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}
                >
                  {(user.name || user.phone || '?')[0].toUpperCase()}
                </span>
              )}
            </Link>
          ) : (
            <Link
              to="/profile"
              className="inline-flex items-center gap-1.5 ps-1 pe-3 h-8 rounded-full text-[11px] font-bold border-2"
              style={{ background: '#C59AFA', color: '#16143A', borderColor: '#16143A' }}
            >
              <span className="w-5 h-5 rounded-full bg-white/30 inline-flex items-center justify-center">
                <UserCircle size={13} strokeWidth={2.2} />
              </span>
              <span>{lang === 'ar' ? 'انضم لصوب' : 'Join SOOB'}</span>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
