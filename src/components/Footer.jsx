import { Link } from 'react-router-dom';
import { Globe, ArrowUpRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { lang, toggleLang, t } = useLang();
  const { hasAccount } = useAuth();

  if (!hasAccount) return null;

  return (
    <footer className="relative z-10 bg-[#0F0F1A] text-white -mt-10">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/icon-512.png" alt="Simba" className="w-10 h-10" style={{ borderRadius: '25%' }} />
              <span className="font-heading font-bold text-xl block leading-none tracking-tight">
                <span className="text-white">Sim</span><span className="text-primary-light">ba</span>
              </span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 mt-5 text-sm text-white/50 hover:text-white transition-colors"
            >
              <Globe size={14} />
              {lang === 'en' ? 'العربية' : 'English'}
            </button>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="font-heading font-semibold text-sm text-white/80 mb-4">
              {lang === 'ar' ? 'روابط سريعة' : 'Quick Links'}
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

          {/* Support */}
          <div className="md:col-span-2">
            <h4 className="font-heading font-semibold text-sm text-white/80 mb-4">
              {lang === 'ar' ? 'الدعم' : 'Support'}
            </h4>
            <div className="space-y-2.5">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('simba-open-chat'))}
                className="block text-sm text-white/40 hover:text-white transition-colors"
              >
                {t('nav.help')}
              </button>
              <Link to="/about" className="block text-sm text-white/40 hover:text-white transition-colors">
                {lang === 'ar' ? 'نبذة عن سيمبا' : 'About Us'}
              </Link>
            </div>
          </div>

          {/* Social */}
          <div className="md:col-span-4">
            <h4 className="font-heading font-semibold text-sm text-white/80 mb-4">
              {lang === 'ar' ? 'تابعنا' : 'Follow Us'}
            </h4>
            <div className="flex gap-3">
              {['X (Twitter)', 'Instagram'].map(social => (
                <span
                  key={social}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/5 text-sm text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors cursor-pointer"
                >
                  {social}
                  <ArrowUpRight size={12} />
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-14 pt-8 border-t border-white/10"
          style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-xs text-white/30 text-center max-w-2xl mx-auto leading-relaxed mb-10">
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
