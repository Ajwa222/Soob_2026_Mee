import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CommunityBanner from '../components/CommunityBanner';
import WaveLines from '../components/WaveLines';
import { useLang } from '../context/LanguageContext';
import { PLANS_DATA, CARRIERS, getValueScore } from '../data/plans';
import { ConnectedPlanCard } from '../components/PlanCard';
import FinderModal, { useFinderModal } from '../components/FinderModal';
import { trackEvent } from '../lib/analytics';

const CARD_FULL_HEIGHT: React.CSSProperties = { height: '100%' };

export default function HomePage() {
  const { t, lang } = useLang();
  const { show: showFinderModal, dismiss: dismissFinderModal } = useFinderModal();

  const trendingPlans = useMemo(() => {
    return [...PLANS_DATA]
      .sort((a, b) => getValueScore(b) - getValueScore(a))
      .slice(0, 8);
  }, []);

  return (
    <div className="safe-pb">
      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient grain">
        <WaveLines />
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/20 z-[1]" />
        {/* Decorative elements */}
        <div className="absolute top-0 end-0 w-80 h-80 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3 blob animate-float" />
        <div className="absolute bottom-0 start-0 w-52 h-52 rounded-full bg-white/[0.04] translate-y-1/3 -translate-x-1/3 blob-alt" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 end-1/4 w-32 h-32 rounded-full bg-accent/10 animate-float hidden md:block" style={{ animationDelay: '1s' }} />

        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-10 pb-12 md:pt-20 md:pb-24">
          <div className="max-w-lg md:max-w-2xl">
            <h1 className="animate-fade-up font-heading font-normal text-[30px] md:text-[48px] lg:text-[56px] text-white leading-[1.1] tracking-tight">
              {t('hero.headline')}
            </h1>
            <p className="animate-fade-up delay-2 mt-4 text-[15px] md:text-[18px] text-white/90 leading-relaxed max-w-md">
              {t('hero.subheadline')}
            </p>

            <div className="animate-fade-up delay-3 mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-gradient-to-l from-[#6ED7B4] from-2% via-[#6DCBCA] via-15% to-[#1FA9FF] text-white hover:opacity-90 font-bold shadow-lg shadow-black/10 rounded-xl h-12 px-6 text-[14px] border-0">
                <Link to="/advisor" onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder' })}>
                  {t('hero.ctaFinder')}
                  <ArrowRight size={17} className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-white text-[#213E53] hover:bg-white/90 font-bold shadow-lg shadow-black/10 rounded-xl h-12 px-6 text-[14px] border-0">
                <Link to="/plans" onClick={() => trackEvent('homepage_cta_clicked', { cta: 'browse_plans' })}>
                  {t('hero.ctaBrowse')}
                </Link>
              </Button>
            </div>

            <div className="animate-fade-up delay-4 mt-7 pt-5 border-t border-white/15">
              <div className="flex items-center gap-6">
                {[
                  { value: '150+', label: t('stats.plans') },
                  { value: '8', label: t('stats.carriers') },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="font-heading font-normal text-[20px] md:text-[24px] text-white">{stat.value}</span>
                    <span className="text-[13px] text-white/80 font-medium">{stat.label}</span>
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

      {/* Trending Plans */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary">
              <Sparkles size={12} />
              {t('home.popularNow')}
            </span>
            <h2 className="font-heading font-bold text-2xl md:text-[32px] text-foreground mt-1.5 tracking-tight">
              {t('trending.title')}
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
          <div className="absolute inset-0 bg-black/20 z-[1]" />
          <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3 blob" />
          <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full bg-white/[0.04] translate-y-1/3 -translate-x-1/3 blob-alt" />

          <div className="relative z-[2] flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full glass text-white/90 text-[11px] font-medium mb-3">
                <Sparkles size={11} />
                {t('home.just30Seconds')}
              </div>
              <h2 className="font-heading font-bold text-lg md:text-2xl text-white leading-tight">
                {t('finderCta.title')}
              </h2>
              <p className="mt-1.5 text-white/90 text-sm max-w-sm leading-relaxed">
                {t('finderCta.subtitle')}
              </p>
            </div>
            <div className="shrink-0 w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300">
              <ArrowRight size={18} className="text-primary rtl:rotate-180" />
            </div>
          </div>
        </Link>
      </div>

      <FinderModal show={showFinderModal} onDismiss={dismissFinderModal} />
    </div>
  );
}
