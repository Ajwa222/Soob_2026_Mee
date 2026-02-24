import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { PLANS_DATA, CARRIERS, getValueScore } from '../data/plans';
import PlanCard from '../components/PlanCard';

export default function HomePage() {
  const { t, lang } = useLang();

  const trendingPlans = useMemo(() => {
    return [...PLANS_DATA]
      .sort((a, b) => getValueScore(b) - getValueScore(a))
      .slice(0, 3);
  }, []);

  return (
    <div className="pb-20 md:pb-0">

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        </div>

        <div className="relative max-w-[1280px] mx-auto px-6 md:px-8 pt-8 pb-6 md:pt-20 md:pb-16">
          <div className="max-w-lg md:max-w-2xl" style={{ animation: 'fadeUp 0.5s ease-out both' }}>
            <h1 className="font-heading font-extrabold text-[28px] md:text-[44px] lg:text-[52px] text-text-primary leading-[1.15] tracking-tight">
              {t('hero.headline')}
            </h1>

            <p className="mt-3 text-[15px] md:text-[17px] text-text-secondary leading-relaxed max-w-md">
              {t('hero.subheadline')}
            </p>

            {/* CTAs */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/finder"
                className="inline-flex items-center justify-center gap-2 px-6 h-[48px] rounded-xl
                  bg-primary text-white font-bold text-[15px]
                  shadow-md shadow-primary/15 hover:shadow-lg hover:shadow-primary/25
                  active:scale-[0.98] transition-all duration-200"
              >
                {t('hero.ctaFinder')}
                <ArrowRight size={17} className="rtl:rotate-180" />
              </Link>
              <Link
                to="/plans"
                className="inline-flex items-center justify-center gap-2 px-6 h-[48px] rounded-xl
                  text-text-primary font-semibold text-[15px] border border-border
                  hover:border-primary/30 hover:bg-primary/[0.04]
                  active:scale-[0.98] transition-all duration-200"
              >
                {t('hero.ctaBrowse')}
              </Link>
            </div>
          </div>

          {/* Stats row */}
          <div
            className="flex items-center gap-6 mt-8 pt-6 border-t border-border/60"
            style={{ animation: 'fadeUp 0.5s ease-out 0.15s both' }}
          >
            {[
              { value: `${PLANS_DATA.length}+`, label: t('stats.plans') },
              { value: '8', label: t('stats.carriers') },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="font-heading font-bold text-xl md:text-2xl text-text-primary">{stat.value}</p>
                <p className="text-[11px] text-text-tertiary font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CARRIER STRIP ===================== */}
      <div className="border-t border-b border-border/60 bg-surface-alt/30">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-4 flex items-center gap-5 md:gap-8">
          <span className="text-[11px] text-text-tertiary font-medium whitespace-nowrap shrink-0">
            {lang === 'ar' ? 'نقارن من' : 'We compare'}
          </span>
          <div className="overflow-hidden flex-1">
            <div
              className="flex items-center gap-8 md:gap-12 w-max"
              style={{
                animation: `${lang === 'ar' ? 'marquee-rtl' : 'marquee'} 20s linear infinite`,
              }}
            >
              {[...CARRIERS, ...CARRIERS].map((carrier, i) => (
                <img
                  key={`${carrier.name}-${i}`}
                  src={carrier.logo}
                  alt={carrier.name}
                  className="h-5 md:h-6 w-auto object-contain shrink-0 opacity-60 hover:opacity-100 transition-opacity"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== TRENDING PLANS ===================== */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-8 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-5 md:mb-7">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
              {lang === 'ar' ? 'الأكثر رواجاً' : 'Popular right now'}
            </span>
            <h2 className="font-heading font-bold text-[20px] md:text-[28px] text-text-primary mt-1">
              {t('trending.title')}
            </h2>
          </div>
          <Link
            to="/plans"
            className="flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-dark transition-colors"
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
          style={{ background: 'linear-gradient(135deg, #312E81 0%, #4338CA 50%, #6366F1 100%)' }}
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
              <ArrowRight size={18} className="text-primary rtl:rotate-180" />
            </div>
          </div>
        </Link>
      </div>

    </div>
  );
}
