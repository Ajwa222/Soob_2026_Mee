/**
 * Site footer — quick links, language toggle, and branding.
 *
 * Hidden on the /advisor page (mobile) since the chat UI takes full height.
 * Includes decorative background circles and a "Made with love in Saudi Arabia" tagline.
 */
import { Link, useLocation } from 'react-router-dom';
import { Separator } from '@/components/ui/separator';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LanguagePicker from './LanguagePicker';

// Social-media links shown in the footer. SVG path data is the official brand
// glyph for each platform (simple-icons style). Replace the URLs with the real
// SOOB social handles when published.
const SOCIAL_LINKS = [
  {
    name: 'Instagram',
    href: 'https://instagram.com/soob.sa',
    path: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.39A5.9 5.9 0 0 0 .63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.31.79.74 1.46 1.39 2.13.67.65 1.34 1.08 2.13 1.39.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.39 5.9 5.9 0 0 0 1.39-2.13c.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.39-2.13A5.9 5.9 0 0 0 19.86.63C19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z',
  },
  {
    name: 'X',
    href: 'https://x.com/soob_sa',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    name: 'TikTok',
    href: 'https://tiktok.com/@soob.sa',
    path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.93a4.85 4.85 0 0 1-1.84-.24z',
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/@soob_sa',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
];

export default function Footer() {
  const { t } = useLang();
  const { hasAccount } = useAuth();
  const location = useLocation();

  const isAdvisor = location.pathname === '/advisor';

  return (
    <footer className={`relative z-10 bg-footer-bg text-white overflow-hidden${isAdvisor ? ' hidden md:block' : ' -mt-10'}`}>
      {/* Decorative background elements */}
      <div className="absolute top-0 end-0 w-72 h-72 rounded-full bg-primary/[0.03] -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 start-0 w-56 h-56 rounded-full bg-accent/[0.02] translate-y-1/3 -translate-x-1/3" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand */}
          <div className="md:col-span-4">
            <div className="flex items-center mb-4">
              <img src="/logo-arabic-white.png" alt="SOOB / صوب" className="h-6 w-auto theme-atlas-hidden" />
              <img src="/logo-arabic-navy.png"  alt="SOOB / صوب" className="h-6 w-auto theme-atlas-only" />
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-xs">
              {t('footer.tagline')}
            </p>

            <div className="mt-4">
              <LanguagePicker variant="footer" />
            </div>

            {/* Social media — Instagram / X / TikTok / YouTube */}
            <div className="mt-5 flex items-center justify-center md:justify-start gap-2.5 footer-social">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  title={s.name}
                  className="footer-social-btn group w-9 h-9 rounded-full inline-flex items-center justify-center transition-all hover:scale-110"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="footer-social-icon transition-colors">
                    <path d={s.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-2">
            <h4 className="font-heading font-semibold text-sm text-white/70 mb-4 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#CFEB74' }} />
              {t('footer.quickLinks')}
            </h4>
            <div className="space-y-2.5">
              {[
                { to: '/', label: t('nav.home') },
                { to: '/plans', label: t('nav.plans') },
                { to: '/advisor', label: t('nav.finder') },
              ].map(link => (
                <Link key={link.to} to={link.to} className="block text-sm text-white/35 hover:text-white transition-colors duration-200">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h4 className="font-heading font-semibold text-sm text-white/70 mb-4 inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#FE7151' }} />
              {t('footer.company')}
            </h4>
            <div className="space-y-2.5">
              <Link to="/about" className="block text-sm text-white/35 hover:text-white transition-colors duration-200">
                {t('footer.aboutUs')}
              </Link>
            </div>
          </div>
        </div>

        <Separator className="mt-14 mb-8 bg-white/8" />

        <div style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-xs text-white/25 text-center max-w-2xl mx-auto leading-relaxed">
            {t('footer.disclaimer')}
          </p>
        </div>
      </div>
    </footer>
  );
}
