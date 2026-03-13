import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CommunityBanner from '../components/CommunityBanner';
import WaveLines from '../components/WaveLines';
import { useLang } from '../context/LanguageContext';
import { CARRIERS, getValueScore } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { usePersona } from '../context/PersonaContext';
import { getPersonalizedScore, getSegmentLabel } from '../lib/persona';
import { ConnectedPlanCard } from '../components/PlanCard';
import FinderModal, { useFinderModal } from '../components/FinderModal';
import { trackEvent } from '../lib/analytics';

const CARD_FULL_HEIGHT: React.CSSProperties = { height: '100%' };

export default function HomePage() {
  const { t, lang } = useLang();
  const { show: showFinderModal, dismiss: dismissFinderModal } = useFinderModal();
  const { plans } = usePlans();
  const { segment } = usePersona();

  const trendingPlans = useMemo(() => {
    if (segment) {
      return [...plans]
        .sort((a, b) => getPersonalizedScore(b, segment) - getPersonalizedScore(a, segment))
        .slice(0, 8);
    }
    return [...plans]
      .sort((a, b) => getValueScore(b) - getValueScore(a))
      .slice(0, 8);
  }, [plans, segment]);

  const isPersonalized = !!segment;

  return (
    <div className="safe-pb">
      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient grain">
        <WaveLines />

        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-10 pb-12 md:pt-20 md:pb-24">
          <div className="max-w-lg md:max-w-2xl">
            <h1 className="animate-fade-up font-heading font-normal text-[30px] md:text-[48px] lg:text-[56px] text-black leading-[1.1] tracking-tight">
              {t('hero.headline')}
            </h1>
            <p className="animate-fade-up delay-2 mt-4 text-[15px] md:text-[18px] text-black/70/70 leading-relaxed max-w-md">
              {t('hero.subheadline')}
            </p>

            <div className="animate-fade-up delay-3 mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-[#E37417] text-[#FFF0D0] hover:bg-[#CC6612] font-bold shadow-lg shadow-[#E37417]/30 rounded-xl h-12 px-6 text-[14px] border-0">
                <Link to="/advisor" onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder' })}>
                  {t('hero.ctaFinder')}
                  <ArrowRight size={17} className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-[#FFF0D0] text-[#E37417] hover:bg-[#FFE4B0] font-bold shadow-lg shadow-black/10 rounded-xl h-12 px-6 text-[14px] border-0">
                <Link to="/plans" onClick={() => trackEvent('homepage_cta_clicked', { cta: 'browse_plans' })}>
                  {t('hero.ctaBrowse')}
                </Link>
              </Button>
            </div>

            <div className="animate-fade-up delay-4 mt-7 pt-5">
              <div className="flex items-center gap-6">
                {[
                  { value: '150+', label: t('stats.plans') },
                  { value: '8', label: t('stats.carriers') },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-heading font-normal text-[20px] md:text-[24px] text-black">{stat.value}</span>
                    <span className="text-[13px] text-black/60/60 font-medium">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Carrier Strip */}
      <div className="border-b border-border overflow-hidden bg-background">
        <div className="py-5 flex justify-center">
          <div
            className="flex items-center gap-14 w-max"
            style={{ animation: `${lang === 'ar' ? 'marquee-rtl' : 'marquee'} 25s linear infinite` }}
          >
            {[...CARRIERS, ...CARRIERS, ...CARRIERS].map((carrier, i) => (
              <img
                key={`${carrier.name}-${i}`}
                src={carrier.logo}
                alt={carrier.name}
                className="h-6 md:h-7 w-auto object-contain shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-300"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Persona Insight Banner */}
      {isPersonalized && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-8 md:pt-12">
          <Link
            to="/plans"
            className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 group hover:bg-primary/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <User size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {lang === 'ar'
                  ? `كـ${getSegmentLabel(segment!, lang)}، لقينا لك باقات تناسب أسلوبك.`
                  : `As a ${getSegmentLabel(segment!, lang)}, we found plans that match your style.`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'ar' ? 'اضغط لاستكشاف الباقات المقترحة' : 'Tap to explore your recommended plans'}
              </p>
            </div>
            <ChevronRight size={16} className="text-primary shrink-0 rtl:rotate-180" />
          </Link>
        </div>
      )}

      {/* Trending Plans / Personalized Plans */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Sparkles size={12} />
              {isPersonalized
                ? (lang === 'ar' ? 'مقترحة لك' : 'For You')
                : t('home.popularNow')}
            </span>
            <h2 className="font-heading font-bold text-2xl md:text-[32px] text-foreground mt-1.5 tracking-tight">
              {isPersonalized
                ? (lang === 'ar' ? 'باقات تناسبك' : 'Recommended for You')
                : t('trending.title')}
            </h2>
          </div>
          <Button variant="link" asChild className="text-primary font-semibold">
            <Link to="/plans">
              {t('trending.seeAll')}
              <ChevronRight size={16} className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>

        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {trendingPlans.map((plan) => (
            <div key={plan.id} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px]">
              <ConnectedPlanCard plan={plan} compact style={CARD_FULL_HEIGHT} />
            </div>
          ))}
        </div>
      </div>

      {/* Switch & Save CTA */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/switch"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'switch_save' })}
          className="relative flex items-center gap-4 rounded-2xl p-5 md:p-6 group hero-gradient grain overflow-hidden transition-all hover:shadow-lg hover:shadow-black/10"
        >
          <WaveLines />
          <div className="relative z-[2] shrink-0 w-12 h-12 rounded-xl bg-[#FFF0D0] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Sparkles size={20} className="text-[#E37417]" />
          </div>
          <div className="relative z-[2] flex-1 min-w-0">
            <h3 className="font-heading font-bold text-base text-black">
              {lang === 'ar' ? 'غيّر ووفّر' : 'Switch & Save'}
            </h3>
            <p className="text-xs text-black/60 mt-0.5">
              {lang === 'ar'
                ? 'ادخل باقتك الحالية وبنلقالك باقات أرخص وأفضل'
                : 'Enter your current plan and find cheaper alternatives instantly'}
            </p>
          </div>
          <ArrowRight size={18} className="relative z-[2] text-black/70 group-hover:text-black shrink-0 rtl:rotate-180 transition-colors" />
        </Link>
      </div>

      {/* Community Banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <CommunityBanner />
      </div>

      {/* Plan Finder CTA */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/advisor"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder_banner' })}
          className="relative block overflow-hidden rounded-2xl p-7 md:p-10 group hero-gradient grain"
        >
          <WaveLines />

          <div className="relative z-[2] flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF0D0] text-black/70 text-[11px] font-medium mb-3">
                <Sparkles size={11} />
                {t('home.just30Seconds')}
              </div>
              <h2 className="font-heading font-bold text-lg md:text-2xl text-black leading-tight">
                {t('finderCta.title')}
              </h2>
              <p className="mt-1.5 text-black/60 text-sm max-w-sm leading-relaxed">
                {t('finderCta.subtitle')}
              </p>
            </div>
            <div className="shrink-0 w-12 h-12 rounded-xl bg-[#FFF0D0] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
              <ArrowRight size={18} className="text-[#E37417] rtl:rotate-180" />
            </div>
          </div>
        </Link>
      </div>

      <FinderModal show={showFinderModal} onDismiss={dismissFinderModal} />
    </div>
  );
}
