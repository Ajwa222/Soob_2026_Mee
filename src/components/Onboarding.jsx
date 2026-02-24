import { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { CARRIERS } from '../data/plans';

/* ---- Visual: Carrier logos converging into one grid ---- */
function SceneCarriers() {
  return (
    <div
      className="w-52 h-28 rounded-2xl bg-surface shadow-lg border border-border/50 p-3
        grid grid-cols-4 grid-rows-2 gap-2"
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
          <img src={c.logo} alt={c.name} className="w-6 h-6 object-contain" />
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
                ? 'w-[76px] h-40 border-primary shadow-md'
                : 'w-16 h-28 border-border/50 opacity-35'
            }`}
            style={{ animation: `fadeUp 0.4s ease-out ${0.15 + i * 0.1}s both` }}
          >
            <div className={`w-8 h-8 rounded-lg shrink-0 ${best ? 'bg-primary/10' : 'bg-surface-alt'}`} />
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
        className="w-20 h-20 rounded-2xl bg-primary/8 flex items-center justify-center"
        style={{ animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}
      >
        <ShieldCheck size={36} className="text-primary" strokeWidth={1.8} />
      </div>
      <div className="flex items-center gap-2 mt-1">
        {CARRIERS.slice(0, 4).map((c, i) => (
          <div
            key={c.name}
            className="w-8 h-8 rounded-lg bg-surface border border-border/50 flex items-center justify-center"
            style={{ animation: `fadeUp 0.3s ease-out ${0.4 + i * 0.08}s both` }}
          >
            <img src={c.logo} alt={c.name} className="w-5 h-5 object-contain" />
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
  const { lang } = useLang();
  const [visible, setVisible] = useState(() => !localStorage.getItem('simba-onboarded'));
  const [page, setPage] = useState(0);

  if (!visible) return null;

  const complete = () => {
    localStorage.setItem('simba-onboarded', 'true');
    setVisible(false);
  };

  const pages = [
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
    {
      scene: <SceneTrust />,
      title: lang === 'ar'
        ? 'مجاني للأبد. بدون وسطاء.'
        : 'Free forever. No middlemen.',
      sub: lang === 'ar'
        ? 'نوديك للموقع الرسمي. بس.'
        : 'Straight to the official site. That\u2019s it.',
    },
  ];

  const isLast = page === pages.length - 1;
  const current = pages[page];

  return (
    <div className="fixed inset-0 z-[100] bg-bg flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={complete}
          className="text-sm text-text-tertiary font-medium hover:text-text-secondary transition-colors"
        >
          {lang === 'ar' ? 'تخطي' : 'Skip'}
        </button>
      </div>

      {/* Scene + value copy — key forces re-mount so animations replay */}
      <div className="flex-1 flex flex-col items-center justify-center px-6" key={page}>
        <div className="mb-10">{current.scene}</div>
        <h2
          className="font-heading font-bold text-[22px] text-text-primary text-center leading-tight max-w-xs"
          style={{ animation: 'fadeUp 0.4s ease-out 0.1s both' }}
        >
          {current.title}
        </h2>
        <p
          className="mt-2.5 text-[15px] text-text-secondary text-center max-w-xs leading-relaxed"
          style={{ animation: 'fadeUp 0.4s ease-out 0.2s both' }}
        >
          {current.sub}
        </p>
      </div>

      {/* Bottom: dots + next */}
      <div className="px-6 pb-8 flex items-center justify-between">
        <div className="flex gap-2">
          {pages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === page
                  ? 'w-6 bg-primary'
                  : i < page
                    ? 'w-1.5 bg-primary/40'
                    : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        <button
          onClick={isLast ? complete : () => setPage((p) => p + 1)}
          className={`h-12 rounded-xl font-bold text-[15px] transition-all duration-200 active:scale-[0.98] ${
            isLast
              ? 'px-7 bg-gradient-to-r from-primary-dark to-primary text-white shadow-md shadow-primary/15'
              : 'w-12 bg-primary text-white flex items-center justify-center'
          }`}
        >
          {isLast
            ? lang === 'ar' ? 'ابدأ الآن' : 'Get Started'
            : <ArrowRight size={18} className="rtl:rotate-180" />}
        </button>
      </div>
    </div>
  );
}
