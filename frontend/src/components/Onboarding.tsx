import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CARRIERS } from '../data/plans';
import { trackEvent } from '../lib/analytics';

/** Waves only — no floating bubbles */
function WaveLinesOnly() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full z-[1]"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1440 800"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M-50,500 C150,380 350,580 600,450 C850,320 1050,520 1250,400 C1350,340 1400,380 1500,360" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M-50,520 C180,400 380,600 630,470 C880,340 1080,540 1280,420 C1380,360 1420,400 1500,380" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M-50,560 C200,440 400,640 650,510 C900,380 1100,560 1300,440 C1400,380 1440,420 1500,400" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M-50,500 C150,380 350,580 600,450 C850,320 1050,520 1250,400 C1350,340 1400,380 1500,360" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="25" filter="url(#waveGlowOnb)" />
      <defs><filter id="waveGlowOnb"><feGaussianBlur stdDeviation="6" /></filter></defs>
    </svg>
  );
}

function SceneCarriers() {
  return (
    <div className="w-52 h-28 md:w-72 md:h-40 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-3 md:p-4 grid grid-cols-4 grid-rows-2 gap-2 md:gap-3">
      {CARRIERS.map((c) => (
        <div key={c.name} className="rounded-xl bg-white/10 flex items-center justify-center">
          <img src={c.logo} alt={c.name} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
        </div>
      ))}
    </div>
  );
}

function SceneMatch() {
  return (
    <div className="flex items-end justify-center gap-3">
      {[0, 1, 2].map((i) => {
        const best = i === 1;
        return (
          <div
            key={i}
            className={`rounded-2xl bg-white/10 backdrop-blur-sm border flex flex-col items-center p-3 gap-2 ${
              best
                ? 'w-[76px] h-40 md:w-24 md:h-48 border-white/40 shadow-md'
                : 'w-16 h-28 md:w-20 md:h-36 border-white/10 opacity-40'
            }`}
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg shrink-0 ${best ? 'bg-white/20' : 'bg-white/10'}`} />
            <div className="w-full h-1.5 rounded-full bg-white/10" />
            <div className="w-2/3 h-1.5 rounded-full bg-white/10" />
            {best && (
              <div className="mt-auto w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                <Check size={14} className="text-primary" strokeWidth={3} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Onboarding() {
  const { lang, toggleLang } = useLang();
  const { markOnboarded } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => !localStorage.getItem('simba-onboarded'));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (visible) {
      trackEvent('onboarding_started');
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [visible]);

  if (!visible) return null;

  const chooseLang = (chosen: string) => {
    if (chosen !== lang) toggleLang();
    trackEvent('onboarding_language_selected', { language: chosen });
    setPage(1);
  };

  const complete = () => {
    localStorage.setItem('simba-onboarded', 'true');
    markOnboarded();
    trackEvent('onboarding_completed');
    setVisible(false);
    navigate('/advisor');
  };

  const pages = [
    { id: 'lang' },
    {
      scene: <SceneCarriers />,
      title: lang === 'ar' ? 'كل الشركات في مكان واحد.' : 'All carriers in one place.',
      sub: lang === 'ar' ? 'قارن الباقات فوراً.' : 'Compare plans instantly.',
    },
    {
      scene: <SceneMatch />,
      title: lang === 'ar' ? 'باقتك بثواني.' : 'Matched in seconds.',
      sub: lang === 'ar' ? 'بس علمنا وش تحتاج.' : 'Just tell us what you need.',
    },
  ];

  const isLast = page === pages.length - 1;
  const current = pages[page];

  // Page 0: Logo + language selection only
  if (page === 0) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6 hero-gradient grain overflow-hidden">
        <WaveLinesOnly />
        <div className="relative z-10 w-20 h-20 md:w-28 md:h-28 mb-10 rounded-[22%] overflow-hidden shadow-lg">
          <img src="/icon-512.png" alt="Simba" className="w-full h-full object-cover scale-[1.05]" />
        </div>
        <div className="relative z-10 flex gap-3 w-full max-w-xs md:max-w-sm">
          <Button
            onClick={() => chooseLang('en')}
            variant="secondary"
            className="flex-1 py-6 text-base font-medium bg-[#FFF0D0] text-[#213E53] hover:bg-[#FFE8B8] shadow-md"
          >
            English
          </Button>
          <Button
            onClick={() => chooseLang('ar')}
            variant="secondary"
            className="flex-1 py-6 text-base font-medium bg-[#FFF0D0] text-[#213E53] hover:bg-[#FFE8B8] shadow-md"
          >
            العربية
          </Button>
        </div>
      </div>
    );
  }

  // Pages 1+: Onboarding slides
  return (
    <div className="fixed inset-0 z-[300] flex flex-col hero-gradient grain overflow-hidden">
      <WaveLinesOnly />
      <div className="relative z-10 px-6 pt-6" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6" key={page}>
        <div className="mb-10">{current.scene}</div>
        <h2 className="font-heading font-medium text-[22px] md:text-[30px] text-black text-center leading-tight max-w-xs md:max-w-md">
          {current.title}
        </h2>
        <p className="mt-2.5 text-[15px] md:text-[17px] text-black/60 text-center max-w-xs md:max-w-md leading-relaxed">
          {current.sub}
        </p>
      </div>

      <div className={`relative z-10 px-6 pb-8 flex items-center justify-between ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex gap-2 ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
          {pages.slice(1).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i + 1 === page ? 'w-6 bg-white' : i + 1 < page ? 'w-1.5 bg-white/40' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <Button
          onClick={isLast ? complete : () => setPage((p) => p + 1)}
          variant="secondary"
          className={`bg-[#FFF0D0] text-[#213E53] hover:bg-[#FFE8B8] shadow-md font-medium ${
            isLast ? 'px-7 h-12' : 'w-12 h-12 p-0'
          }`}
        >
          {isLast ? (lang === 'ar' ? 'ابدأ الآن' : 'Get Started') : <ArrowRight size={18} />}
        </Button>
      </div>
    </div>
  );
}
