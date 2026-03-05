import { Link, useLocation } from 'react-router-dom';
import { Home, Smartphone, Search, /* Gamepad2, Users, */ User, /* Sun, Moon */ } from 'lucide-react';

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/IuixL2fLPFgD5aAraoFz6D?mode=gi_t';

export default function Navigation() {
  const { t, theme, toggleTheme } = useLang();
  const { user, isLoggedIn, hasAccount } = useAuth();
  const location = useLocation();

  if (!hasAccount) return null;

  const handleNav = (e: React.MouseEvent, path: string) => {
    if (location.pathname === path || (path === '/home' && location.pathname === '/')) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const navItems = [
    { path: '/home', label: t('nav.home') },
    { path: '/plans', label: t('nav.plans') },
    { path: '/finder', label: t('nav.finder') },
    // { path: '/game', label: t('nav.game') },
  ];

  const mobileNavItems = [
    { path: '/home', label: t('nav.home'), icon: Home },
    { path: '/plans', label: t('nav.plans'), icon: Smartphone },
    { path: '/finder', label: t('nav.finder'), icon: Search },
    { path: WHATSAPP_GROUP_LINK, label: t('nav.support'), icon: WhatsAppIcon, external: true },
  ];

  const isActive = (path: string) =>
    location.pathname === path || (path === '/home' && location.pathname === '/');

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:block sticky top-0 z-50 bg-surface border-b border-border/60">
        <div className="w-full max-w-[1280px] mx-auto px-8 flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/icon-512.png"
              alt="Simba"
              className="w-10 h-10 shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-200"
              style={{ borderRadius: '25%' }}
            />
            <span
              className="font-heading font-bold text-[22px] leading-none tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #6ED7B4, #6DCBCA, #1FA9FF)' }}
            >
              Simba
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
            <a
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold
                text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-all duration-200"
            >
              <WhatsAppIcon size={16} />
              {t('nav.support')}
            </a>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 z-[200] glass border-t border-border/60${location.pathname === '/finder' ? ' hidden' : ''}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-[68px] px-3">
          {mobileNavItems.map(item => {
            const Icon = item.icon;
            const active = !item.external && isActive(item.path);

            if (item.external) {
              return (
                <a
                  key={item.path}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-h-11 justify-center"
                >
                  <Icon size={22} strokeWidth={1.5} className="text-[#25D366]" />
                  <span className="text-[11px] font-semibold text-[#25D366]">{item.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNav(e, item.path)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 min-h-11 justify-center"
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
      <div className="md:hidden sticky top-0 z-[200] bg-surface border-b border-border/60">
        <div className="flex items-center justify-between px-3 sm:px-5 h-[60px]">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/icon-512.png"
              alt="Simba"
              className="w-9 h-9 shadow-sm shadow-primary/20"
              style={{ borderRadius: '25%' }}
            />
            <span
              className="font-heading font-bold text-lg tracking-tight bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #6ED7B4, #6DCBCA, #1FA9FF)' }}
            >
              Simba
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
