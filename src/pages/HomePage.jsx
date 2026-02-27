import { useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { PLANS_DATA, CARRIERS, getValueScore } from '../data/plans';
import PlanCard from '../components/PlanCard';

export default function HomePage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();

  /* ---- finder suggestion modal — shown once per session ---- */
  const [showFinderModal, setShowFinderModal] = useState(() => {
    return !sessionStorage.getItem('simba-finder-modal-dismissed');
  });
  const dismissFinderModal = useCallback(() => {
    sessionStorage.setItem('simba-finder-modal-dismissed', 'true');
    setShowFinderModal(false);
  }, []);

  const trendingPlans = useMemo(() => {
    return [...PLANS_DATA]
      .sort((a, b) => getValueScore(b) - getValueScore(a))
      .slice(0, 3);
  }, []);

  return (
    <div className="pb-20 md:pb-0">

      {/* ===================== HERO ===================== */}
      <section className="relative z-10 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto px-6 md:px-8 pt-4 pb-6 md:pt-12 md:pb-16">
          <div
            className="max-w-lg md:max-w-2xl p-6 md:p-8"
            style={{ animation: 'fadeUp 0.5s ease-out both' }}
          >
            <h1 className="font-heading font-extrabold text-[28px] md:text-[44px] lg:text-[52px] text-white leading-[1.15] tracking-tight">
              {t('hero.headline')}
            </h1>

            <p className="mt-3 text-[15px] md:text-[17px] text-white/80 leading-relaxed max-w-md">
              {t('hero.subheadline')}
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/finder"
                className="inline-flex items-center justify-center gap-2 px-6 h-[48px] rounded-xl
                  text-white font-bold text-[15px]
                  shadow-md shadow-[#1FA9FF]/20 hover:shadow-lg hover:shadow-[#1FA9FF]/30
                  active:scale-[0.98] transition-all duration-200"
                style={{ background: 'linear-gradient(135deg, #1FA9FF 0%, #6dcbca 100%)' }}
              >
                {t('hero.ctaFinder')}
                <ArrowRight size={17} className="rtl:rotate-180" />
              </Link>
              <Link
                to="/plans"
                className="inline-flex items-center justify-center gap-2 px-6 h-[48px] rounded-xl
                  bg-white text-[#213E53] font-semibold text-[15px]
                  hover:bg-white/90
                  active:scale-[0.98] transition-all duration-200"
              >
                {t('hero.ctaBrowse')}
              </Link>
            </div>

            {/* Stats + Carrier strip */}
            <div
              className="mt-5 pt-4 border-t border-white/20"
              style={{ animation: 'fadeUp 0.5s ease-out 0.15s both' }}
            >
              <div className="flex items-center gap-4 mb-3">
                {[
                  { value: `${PLANS_DATA.length}+`, label: t('stats.plans') },
                  { value: '8', label: t('stats.carriers') },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="font-heading font-bold text-[15px] md:text-[17px] text-white">{stat.value}</span>
                    <span className="text-[13px] text-white/70 font-medium">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CARRIER STRIP ===================== */}
      <div className="relative -z-10 mt-4 border-t border-b border-border/60">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-3 flex flex-col items-center gap-2">
          <span className="relative z-10 text-[10px] text-[#213E53]/50 font-medium">
            {lang === 'ar' ? 'نقارن من' : 'We compare'}
          </span>
          <div className="overflow-hidden w-full max-w-xl">
            <div
              className="flex items-center justify-center gap-6 md:gap-10 w-max mx-auto"
              style={{
                animation: `${lang === 'ar' ? 'marquee-rtl' : 'marquee'} 20s linear infinite`,
              }}
            >
              {[...CARRIERS, ...CARRIERS].map((carrier, i) => (
                <img
                  key={`${carrier.name}-${i}`}
                  src={carrier.logo}
                  alt={carrier.name}
                  className="h-4 md:h-5 w-auto object-contain shrink-0 opacity-100"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== TRENDING PLANS ===================== */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 pt-10 md:pt-16 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-5 md:mb-7">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#1FA9FF]">
              {lang === 'ar' ? 'الأكثر رواجاً' : 'Popular right now'}
            </span>
            <h2 className="font-heading font-bold text-[20px] md:text-[28px] text-[#213E53] mt-1">
              {t('trending.title')}
            </h2>
          </div>
          <Link
            to="/plans"
            className="flex items-center gap-1 text-sm font-bold text-[#1FA9FF] hover:text-[#1890e0] transition-colors"
          >
            {t('trending.seeAll')}
            <ChevronRight size={16} className="rtl:rotate-180" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {trendingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>

      {/* ===================== PLAN FINDER CTA ===================== */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/finder"
          className="relative block overflow-hidden rounded-2xl p-6 md:p-10 group"
          style={{ background: 'linear-gradient(135deg, #1890e0 0%, #1FA9FF 30%, #6dcbca 70%, #6ee29e 100%)' }}
        >
          <div className="absolute top-0 end-0 w-40 h-40 rounded-full bg-white/[0.06] -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 start-0 w-28 h-28 rounded-full bg-white/[0.06] translate-y-1/3 -translate-x-1/3" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-[11px] font-medium mb-2.5">
                <Sparkles size={11} />
                {lang === 'ar' ? '30 ثانية فقط' : 'Just 30 seconds'}
              </div>
              <h2 className="font-heading font-bold text-lg md:text-2xl text-white leading-tight">
                {t('finderCta.title')}
              </h2>
              <p className="mt-1 text-white/50 text-sm max-w-sm leading-relaxed">
                {t('finderCta.subtitle')}
              </p>
            </div>
            <div className="shrink-0 w-11 h-11 rounded-xl bg-white flex items-center justify-center
              shadow-lg group-hover:scale-105 transition-transform duration-200">
              <ArrowRight size={18} className="text-[#1FA9FF] rtl:rotate-180" />
            </div>
          </div>
        </Link>
      </div>

      {/* ========= FINDER SUGGESTION MODAL ========= */}
      {showFinderModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={dismissFinderModal}
            style={{ animation: 'fadeIn 0.2s ease-out both' }}
          />
          <div
            className="fixed z-50 top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[calc(100vw-2rem)]
              bg-surface rounded-2xl shadow-2xl border border-border/60 p-6 text-center"
            style={{ animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <div className="w-12 h-12 rounded-xl bg-[#1FA9FF]/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={22} className="text-[#1FA9FF]" />
            </div>
            <h3 className="font-heading font-bold text-lg text-[#213E53]">
              {lang === 'ar' ? 'مو متأكد وش تبي؟' : 'Not sure what you need?'}
            </h3>
            <p className="text-sm text-[#213E53]/70 mt-2 leading-relaxed">
              {lang === 'ar'
                ? 'المستشار الذكي يختار لك أفضل باقة بـ 30 ثانية بس'
                : 'Our Smart Advisor picks the best plan for you in just 30 seconds'}
            </p>
            <div className="flex flex-col gap-2.5 mt-5">
              <button
                onClick={() => { dismissFinderModal(); navigate('/finder'); }}
                className="w-full py-3 rounded-xl text-white font-bold text-sm
                  hover:opacity-90 transition-all btn-press"
                style={{ background: 'linear-gradient(135deg, #1FA9FF, #6dcbca)' }}
              >
                {t('finderCta.cta')}
              </button>
              <button
                onClick={dismissFinderModal}
                className="w-full py-3 rounded-xl bg-surface-alt text-[#213E53]/70 font-semibold text-sm
                  hover:bg-border transition-colors btn-press"
              >
                {lang === 'ar' ? 'لا، أبي أتصفح' : 'No thanks, I\'ll browse'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
