import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CommunityBanner from '../components/CommunityBanner';
import { useLang } from '../context/LanguageContext';
import { PLANS_DATA, CARRIERS, getValueScore } from '../data/plans';
import PlanCard from '../components/PlanCard';
import FinderModal, { useFinderModal } from '../components/FinderModal';
import { trackEvent } from '../lib/analytics';

export default function HomePage() {
  const { t, lang } = useLang();
  const { show: showFinderModal, dismiss: dismissFinderModal } = useFinderModal();

  const trendingPlans = useMemo(() => {
    return [...PLANS_DATA]
      .sort((a, b) => getValueScore(b) - getValueScore(a))
      .slice(0, 3);
  }, []);

  return (
    <div className="safe-pb">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute top-0 end-0 w-60 h-60 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 start-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-10 md:pt-16 md:pb-20">
          <div className="max-w-lg md:max-w-2xl">
            <h1 className="font-heading font-extrabold text-[28px] md:text-[44px] lg:text-[52px] text-white leading-[1.15] tracking-tight">
              {t('hero.headline')}
            </h1>
            <p className="mt-3 text-[15px] md:text-[17px] text-white/80 leading-relaxed max-w-md">
              {t('hero.subheadline')}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 font-bold shadow-md">
                <Link to="/finder" onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder' })}>
                  {t('hero.ctaFinder')}
                  <ArrowRight size={17} className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-semibold">
                <Link to="/plans" onClick={() => trackEvent('homepage_cta_clicked', { cta: 'browse_plans' })}>
                  {t('hero.ctaBrowse')}
                </Link>
              </Button>
            </div>

            <div className="mt-5 pt-4 border-t border-white/20">
              <div className="flex items-center gap-4">
                {[
                  { value: '150+', label: t('stats.plans') },
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

      {/* Carrier Strip */}
      <div className="border-b border-border overflow-hidden bg-background">
        <div className="py-4 flex justify-center">
          <div
            className="flex items-center gap-12 w-max"
            style={{ animation: `${lang === 'ar' ? 'marquee-rtl' : 'marquee'} 25s linear infinite` }}
          >
            {[...CARRIERS, ...CARRIERS, ...CARRIERS].map((carrier, i) => (
              <img
                key={`${carrier.name}-${i}`}
                src={carrier.logo}
                alt={carrier.name}
                className="h-6 md:h-7 w-auto object-contain shrink-0"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Trending Plans */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-10 md:pt-16 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-5 md:mb-7">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
              {t('home.popularNow')}
            </span>
            <h2 className="font-heading font-bold text-xl md:text-[28px] text-foreground mt-1">
              {t('trending.title')}
            </h2>
          </div>
          <Button variant="link" asChild className="text-primary">
            <Link to="/plans">
              {t('trending.seeAll')}
              <ChevronRight size={16} className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {trendingPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
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
          to="/finder"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder_banner' })}
          className="relative block overflow-hidden rounded-xl p-6 md:p-10 group bg-primary"
        >
          <div className="absolute top-0 end-0 w-40 h-40 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 start-0 w-28 h-28 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />

          <div className="relative flex items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-[11px] font-medium mb-2.5">
                <Sparkles size={11} />
                {t('home.just30Seconds')}
              </div>
              <h2 className="font-heading font-bold text-lg md:text-2xl text-white leading-tight">
                {t('finderCta.title')}
              </h2>
              <p className="mt-1 text-white/70 text-sm max-w-sm leading-relaxed">
                {t('finderCta.subtitle')}
              </p>
            </div>
            <div className="shrink-0 w-11 h-11 rounded-xl bg-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <ArrowRight size={18} className="text-primary rtl:rotate-180" />
            </div>
          </div>
        </Link>
      </div>

      <FinderModal show={showFinderModal} onDismiss={dismissFinderModal} />
    </div>
  );
}
