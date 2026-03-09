import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WaveLines from './WaveLines';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CARRIERS } from '../data/plans';
import { trackEvent } from '../lib/analytics';

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

function SceneTrust() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl bg-white/10 flex items-center justify-center">
        <ShieldCheck size={36} className="text-white md:hidden" strokeWidth={1.8} />
        <ShieldCheck size={48} className="text-white hidden md:block" strokeWidth={1.8} />
      </div>
      <div className="flex items-center gap-2 mt-1">
        {CARRIERS.slice(0, 4).map((c) => (
          <div key={c.name} className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
            <img src={c.logo} alt={c.name} className="w-5 h-5 md:w-6 md:h-6 object-contain" />
          </div>
        ))}
        <span className="text-xs font-semibold text-white/50">+4</span>
      </div>
    </div>
  );
}

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
    navigate('/advisor');
  };

  const pages = [
    { id: 'lang' },
    {
      scene: <SceneCarriers />,
      title: lang === 'ar' ? 'كل الشركات. مكان واحد.' : 'All carriers. One place.',
      sub: lang === 'ar' ? 'بدون تنقل بين المواقع.' : 'No more jumping between websites.',
    },
    {
      scene: <SceneMatch />,
      title: lang === 'ar' ? 'باقتك المثالية. بثوانٍ.' : 'Your match. In seconds.',
      sub: lang === 'ar' ? 'قلنا وش تبي. نلقاها لك.' : 'Tell us what you need. We find it.',
    },
  ];

  const isLast = page === pages.length - 1;
  const isLangPage = page === 0;
  const current = pages[page];

  if (isLangPage) {
    return (
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6 hero-gradient grain overflow-hidden">
        <WaveLines />
        <img src="/icon-512.png" alt="Simba" className="relative z-10 w-16 h-16 md:w-20 md:h-20 mb-5 rounded-2xl shadow-lg" />
        <h1 className="relative z-10 font-heading font-medium text-[26px] md:text-[34px] text-black text-center leading-tight mb-1">
          Welcome to Simba
        </h1>
        <p className="relative z-10 text-[18px] md:text-[22px] text-black/70 text-center mb-6 font-semibold">
          حياك في سيمبا
        </p>
        <h2 className="relative z-10 font-heading font-medium text-[17px] text-black/80 text-center leading-tight mb-2">
          Choose your language
        </h2>
        <p className="relative z-10 font-heading font-medium text-[17px] text-black/80 text-center mb-8">
          اختر لغتك المفضلة
        </p>
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

  return (
    <div className="fixed inset-0 z-[300] flex flex-col hero-gradient grain overflow-hidden">
      <WaveLines />
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
