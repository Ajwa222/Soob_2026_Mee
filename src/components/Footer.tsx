import { Link, useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { toggleLang, t, lang } = useLang();
  const { hasAccount } = useAuth();
  const location = useLocation();

  if (!hasAccount) return null;
  if (location.pathname === '/finder') return null;

  return (
    <footer className="relative z-10 bg-footer-bg text-white -mt-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/icon-512.png" alt="Simba" className="w-10 h-10 rounded-xl" />
              <span className="font-heading font-bold text-xl leading-none tracking-tight">
                <span className="text-white">Sim</span><span className="text-primary-light">ba</span>
              </span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              className="mt-4 text-white/50 hover:text-white hover:bg-white/10 p-0 h-auto"
            >
              <Globe size={14} />
              {lang === 'en' ? 'العربية' : 'English'}
            </Button>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="font-heading font-semibold text-sm text-white/80 mb-4">
              {t('footer.quickLinks')}
            </h4>
            <div className="space-y-2.5">
              {[
                { to: '/', label: t('nav.home') },
                { to: '/plans', label: t('nav.plans') },
                { to: '/finder', label: t('nav.finder') },
              ].map(link => (
                <Link key={link.to} to={link.to} className="block text-sm text-white/40 hover:text-white transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h4 className="font-heading font-semibold text-sm text-white/80 mb-4">
              {t('footer.company')}
            </h4>
            <div className="space-y-2.5">
              <Link to="/about" className="block text-sm text-white/40 hover:text-white transition-colors">
                {t('footer.aboutUs')}
              </Link>
            </div>
          </div>
        </div>

        <Separator className="mt-14 mb-8 bg-white/10" />

        <div style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-xs text-white/30 text-center max-w-2xl mx-auto leading-relaxed">
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
