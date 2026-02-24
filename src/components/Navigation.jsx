import { Link, useLocation } from 'react-router-dom';
import { Home, Smartphone, Search, Gamepad2, Users, User, Headphones } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { lang, t } = useLang();
  const { user, isLoggedIn } = useAuth();
  const location = useLocation();

  const handleNav = (e, path) => {
    if (location.pathname === path) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems = [
    { path: '/', label: t('nav.home') },
    { path: '/plans', label: t('nav.plans') },
    { path: '/finder', label: t('nav.finder') },
    { path: '/game', label: t('nav.game') },
    { path: '/chat', label: t('nav.chat') },
  ];

  const mobileNavItems = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/plans', label: t('nav.plans'), icon: Smartphone },
    { path: '/finder', label: t('nav.finder'), icon: Search },
    { path: '/game', label: t('nav.game'), icon: Gamepad2 },
    { path: '/chat', label: t('nav.chat'), icon: Users },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:block sticky top-0 z-50 glass border-b border-border/60">
        <div className="w-full max-w-[1280px] mx-auto px-8 flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/logo-icon.svg"
              alt="Simba"
              className="w-10 h-10 shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-200"
              style={{ borderRadius: '25%' }}
            />
            <span className="font-heading font-bold text-[22px] leading-none tracking-tight">
              <span className="text-text-primary">Sim</span><span className="text-primary">ba</span>
            </span>
          </Link>

          {/* Center nav links */}
          <div className="flex items-center gap-1 bg-surface-alt/80 rounded-2xl p-1.5">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200
                  ${isActive(item.path)
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('simba-open-chat'))}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold
                text-primary-light hover:text-white hover:bg-primary/20 transition-all duration-150 btn-press"
              aria-label="Support"
            >
              <Headphones size={15} />
              {lang === 'ar' ? 'الدعم' : 'Support'}
            </button>
            {isLoggedIn ? (
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                  bg-surface-alt hover:bg-border transition-all duration-200 btn-press"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {(user.name || user.phone)[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-text-primary">{user.name || user.phone}</span>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-primary-dark text-white
                  hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass border-t border-border/60">
        <div className="flex items-center justify-around h-[68px] px-3">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200"
                style={active ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' } : {}}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.5}
                  className={active ? 'text-primary' : 'text-text-tertiary'}
                />
                <span className={`text-[11px] font-semibold ${active ? 'text-primary' : 'text-text-tertiary'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Mobile Top Bar */}
      <div className="md:hidden sticky top-0 z-50 glass border-b border-border/60">
        <div className="flex items-center justify-between px-5 h-[60px]">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo-icon.svg"
              alt="Simba"
              className="w-9 h-9 shadow-sm shadow-primary/20"
              style={{ borderRadius: '25%' }}
            />
            <span className="font-heading font-bold text-lg tracking-tight">
              <span className="text-text-primary">Sim</span><span className="text-primary">ba</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('simba-open-chat'))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
                bg-primary/10 text-primary-light hover:text-white hover:bg-primary/20 transition-colors duration-150"
              aria-label="Support"
            >
              <Headphones size={13} />
              {lang === 'ar' ? 'دعم' : 'Help'}
            </button>
            {isLoggedIn ? (
              <Link
                to="/profile"
                className="flex items-center justify-center w-8 h-8 rounded-full
                  bg-gradient-to-br from-primary to-primary-dark"
              >
                <span className="text-[11px] font-bold text-white">
                  {(user.name || user.phone)[0].toUpperCase()}
                </span>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold
                  bg-gradient-to-r from-primary to-primary-dark text-white transition-colors duration-150"
              >
                <User size={13} />
                {t('nav.signIn')}
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
