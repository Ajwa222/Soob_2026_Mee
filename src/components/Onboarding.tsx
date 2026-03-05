import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CARRIERS } from '../data/plans';
import { trackEvent } from '../lib/analytics';

/* ---- Visual: Carrier logos converging into one grid ---- */
function SceneCarriers() {
  return (
    <div
      className="w-52 h-28 md:w-72 md:h-40 rounded-2xl bg-surface shadow-lg border border-border/50 p-3 md:p-4
        grid grid-cols-4 grid-rows-2 gap-2 md:gap-3"
      style={{ animation: 'scaleIn 0.4s ease-out both' }}
    >
      {CARRIERS.map((c, i) => (
        <div
          key={c.name}
          className="rounded-xl bg-surface-alt flex items-center justify-center"
          style={{
            animation: `scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) ${0.2 + i * 0.06}s both`,
          }}
        >
          <img src={c.logo} alt={c.name} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
        </div>
      ))}
    </div>
  );
}

/* ---- Visual: Highlighted best match rising above others ---- */
function SceneMatch() {
  return (
    <div className="flex items-end justify-center gap-3">
      {[0, 1, 2].map((i) => {
        const best = i === 1;
        return (
          <div
            key={i}
            className={`rounded-2xl bg-surface border flex flex-col items-center p-3 gap-2 ${
              best
                ? 'w-[76px] h-40 md:w-24 md:h-48 border-primary shadow-md'
                : 'w-16 h-28 md:w-20 md:h-36 border-border/50 opacity-35'
            }`}
            style={{ animation: `fadeUp 0.4s ease-out ${0.15 + i * 0.1}s both` }}
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg shrink-0 ${best ? 'bg-primary/10' : 'bg-surface-alt'}`} />
            <div className="w-full h-1.5 rounded-full bg-surface-alt" />
            <div className="w-2/3 h-1.5 rounded-full bg-surface-alt" />
            {best && (
              <div
                className="mt-auto w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0"
                style={{ animation: 'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) 0.65s both' }}
              >
                <Check size={14} className="text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---- Visual: Shield + checkmark for trust ---- */
function SceneTrust() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-primary/8 flex items-center justify-center"
        style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}
      >
        <ShieldCheck size={36} className="text-primary md:hidden" strokeWidth={1.8} />
        <ShieldCheck size={48} className="text-primary hidden md:block" strokeWidth={1.8} />
      </div>
      <div className="flex items-center gap-2 mt-1">
        {CARRIERS.slice(0, 4).map((c, i) => (
          <div
            key={c.name}
            className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-surface border border-border/50 flex items-center justify-center"
            style={{ animation: `fadeUp 0.3s ease-out ${0.4 + i * 0.08}s both` }}
          >
            <img src={c.logo} alt={c.name} className="w-5 h-5 md:w-6 md:h-6 object-contain" />
          </div>
        ))}
        <span
          className="text-xs font-semibold text-text-tertiary"
          style={{ animation: 'fadeUp 0.3s ease-out 0.75s both' }}
        >
          +4
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   ONBOARDING — value-driven, shown once on first visit
   ================================================================ */
export default function Onboarding() {
  const { lang, toggleLang } = useLang();
  const { markOnboarded } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => !localStorage.getItem('simba-onboarded'));
  const [page, setPage] = useState(0);
  const [langChosen, setLangChosen] = useState(false);

  useEffect(() => {
    if (visible) {
      trackEvent('onboarding_started');
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [visible]);

  if (!visible) return null;

  const chooseLang = (chosen: string) => {
    // Switch language if needed
    if (chosen !== lang) toggleLang();
    setLangChosen(true);
    trackEvent('onboarding_language_selected', { language: chosen });
    setPage(1);
  };

  const complete = () => {
    localStorage.setItem('simba-onboarded', 'true');
    markOnboarded();
    trackEvent('onboarding_completed', { skipped: !langChosen || page < pages.length - 1 });
    setVisible(false);
    navigate('/finder');
  };

  const pages = [
    { id: 'lang' }, // placeholder for language page
    {
      scene: <SceneCarriers />,
      title: lang === 'ar'
        ? 'كل الشركات. مكان واحد.'
        : 'All carriers. One place.',
      sub: lang === 'ar'
        ? 'بدون تنقل بين المواقع.'
        : 'No more jumping between websites.',
    },
    {
      scene: <SceneMatch />,
      title: lang === 'ar'
        ? 'باقتك المثالية. بثوانٍ.'
        : 'Your match. In seconds.',
      sub: lang === 'ar'
        ? 'قلنا وش تبي. نلقاها لك.'
        : 'Tell us what you need. We find it.',
    },
  ];

  const isLast = page === pages.length - 1;
  const isLangPage = page === 0;
  const current = pages[page];

  // Language selection screen
  if (isLangPage) {
    return (
      <div className="fixed inset-0 z-[100] backdrop-blur-2xl bg-black/30 flex flex-col items-center justify-center px-6">
        <img
          src="/icon-512.png"
          alt="Simba"
          className="w-16 h-16 md:w-20 md:h-20 mb-5 shadow-lg shadow-black/15"
          style={{ borderRadius: '25%', animation: 'scaleIn 0.4s ease-out both' }}
        />
        <h1
          className="font-heading font-bold text-[26px] md:text-[34px] text-white text-center leading-tight mb-1"
          style={{ animation: 'fadeUp 0.4s ease-out 0.08s both' }}
        >
          Welcome to Simba
        </h1>
        <p
          className="text-[18px] md:text-[22px] text-white/80 text-center mb-6 font-semibold"
          style={{ animation: 'fadeUp 0.4s ease-out 0.12s both' }}
        >
          حياك في سيمبا
        </p>
        <h2
          className="font-heading font-bold text-[17px] text-white/90 text-center leading-tight mb-2"
          style={{ animation: 'fadeUp 0.4s ease-out 0.18s both' }}
        >
          Choose your language
        </h2>
        <p
          className="font-heading font-bold text-[17px] text-white/90 text-center mb-8"
          style={{ animation: 'fadeUp 0.4s ease-out 0.22s both' }}
        >
          اختر لغتك المفضلة
        </p>
        <div className="flex gap-3 w-full max-w-xs md:max-w-sm" style={{ animation: 'fadeUp 0.4s ease-out 0.2s both' }}>
          <button
            onClick={() => chooseLang('en')}
            className="flex-1 py-4 rounded-xl border-2 border-white bg-white text-base font-bold text-text-primary
              hover:bg-white/90 shadow-md shadow-black/10 transition-all active:scale-[0.98]"
          >
            English
          </button>
          <button
            onClick={() => chooseLang('ar')}
            className="flex-1 py-4 rounded-xl border-2 border-white bg-white text-base font-bold text-text-primary
              hover:bg-white/90 shadow-md shadow-black/10 transition-all active:scale-[0.98]"
          >
            العربية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] backdrop-blur-2xl bg-black/30 flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={complete}
          className="text-sm text-white/60 font-medium hover:text-white transition-colors"
        >
          {lang === 'ar' ? 'تخطي' : 'Skip'}
        </button>
      </div>

      {/* Scene + value copy — key forces re-mount so animations replay */}
      <div className="flex-1 flex flex-col items-center justify-center px-6" key={page}>
        <div className="mb-10">{current.scene}</div>
        <h2
          className="font-heading font-bold text-[22px] md:text-[30px] text-white text-center leading-tight max-w-xs md:max-w-md"
          style={{ animation: 'fadeUp 0.4s ease-out 0.1s both' }}
        >
          {current.title}
        </h2>
        <p
          className="mt-2.5 text-[15px] md:text-[17px] text-white/70 text-center max-w-xs md:max-w-md leading-relaxed"
          style={{ animation: 'fadeUp 0.4s ease-out 0.2s both' }}
        >
          {current.sub}
        </p>
      </div>

      {/* Bottom: dots + next */}
      <div className={`px-6 pb-8 flex items-center justify-between ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex gap-2 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
          {pages.slice(1).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 === page
                  ? 'w-6 bg-white'
                  : i + 1 < page
                    ? 'w-1.5 bg-white/40'
                    : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={isLast ? complete : () => setPage((p) => p + 1)}
          className={`h-12 md:h-14 rounded-xl font-bold text-[15px] md:text-[17px] transition-all duration-200 active:scale-[0.98] ${
            isLast
              ? 'px-7 bg-white text-text-primary shadow-md shadow-black/10'
              : 'w-12 bg-white text-text-primary shadow-md shadow-black/10 flex items-center justify-center hover:bg-white/90'
          }`}
        >
          {isLast
            ? lang === 'ar' ? 'ابدأ الآن' : 'Get Started'
            : <ArrowRight size={18} />}
        </button>
      </div>
    </div>
  );
}
