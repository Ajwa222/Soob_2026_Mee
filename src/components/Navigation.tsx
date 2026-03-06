import { Link, useLocation } from 'react-router-dom';
import { Home, Smartphone, Search, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

const WHATSAPP_GROUP_LINK = 'https://chat.whatsapp.com/IuixL2fLPFgD5aAraoFz6D?mode=gi_t';

export default function Navigation() {
  const { t, theme, toggleTheme } = useLang();
  const { hasAccount } = useAuth();
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
      <nav className="hidden md:block sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/60">
        <div className="w-full max-w-5xl mx-auto px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src="/icon-512.png" alt="Simba" className="w-9 h-9 rounded-xl shadow-sm group-hover:shadow-md transition-shadow" />
            <span className="font-heading font-bold text-xl leading-none tracking-tight text-primary">
              Simba
            </span>
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
            <Button variant="ghost" size="sm" asChild className="text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10 rounded-xl">
              <a href={WHATSAPP_GROUP_LINK} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={16} />
                {t('nav.support')}
              </a>
            </Button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Tab Bar */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 z-[200] bg-card/90 backdrop-blur-xl border-t border-border/60${location.pathname === '/finder' && !location.search.includes('results=1') ? ' hidden' : ''}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-2">
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
                  className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[#25D366]"
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </a>
              );
            }

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
      <div className="md:hidden sticky top-0 z-[200] bg-card/90 backdrop-blur-xl border-b border-border/60">
        <div className="flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <img src="/icon-512.png" alt="Simba" className="w-8 h-8 rounded-xl shadow-sm" />
            <span className="font-heading font-bold text-lg tracking-tight text-primary">
              Simba
            </span>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-xl">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>
        </div>
      </div>
    </>
  );
}
