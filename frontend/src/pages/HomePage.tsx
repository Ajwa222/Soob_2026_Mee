/**
 * Home page — the main landing page at "/".
 *
 * Sections:
 *  1. Hero banner with gradient background, wave lines, and CTA buttons
 *  2. "How SOOB Works" — 3-step explainer
 *  3. Trending/recommended plans (personalized for logged-in users via collaborative filtering)
 *  4. Carrier logos strip
 *  5. "Why SOOB?" value propositions
 *  6. Stats counter (plans, carriers, free, support)
 *  7. Community banner (WhatsApp/Telegram invite)
 *  8. FinderModal (one-time popup encouraging Smart Advisor use)
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight, Smartphone, Wifi, Gift, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WaveLines from '../components/WaveLines';
import { useLang } from '../context/LanguageContext';
import { CARRIERS, getValueScore } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { useAuth } from '../context/AuthContext';
import { ConnectedPlanCard } from '../components/PlanCard';
import FinderModal, { useFinderModal } from '../components/FinderModal';
import { trackEvent } from '../lib/analytics';
import { getRecommendations, type RecommendationResult } from '../services/recommendations.service';

const CARD_FULL_HEIGHT: React.CSSProperties = { height: '100%' };

export default function HomePage() {
  const { t, lang } = useLang();
  const { show: showFinderModal, dismiss: dismissFinderModal } = useFinderModal();
  const { plans } = usePlans();
  const { isLoggedIn } = useAuth();

  const [recs, setRecs] = useState<RecommendationResult | null>(null);
  const [recsLoading, setRecsLoading] = useState(true);

  useEffect(() => {
    setRecsLoading(true);
    getRecommendations(isLoggedIn, 8)
      .then(setRecs)
      .catch(() => { /* fall back to value score */ })
      .finally(() => setRecsLoading(false));
  }, [isLoggedIn]);

  const trendingPlans = useMemo(() => {
    if (recs && recs.planIds.length > 0 && plans.length > 0) {
      const planMap = new Map(plans.map(p => [p.id, p]));
      const resolved = recs.planIds.map(id => planMap.get(id)).filter(Boolean) as typeof plans;
      if (resolved.length > 0) return resolved;
    }
    return [...plans]
      .sort((a, b) => getValueScore(b) - getValueScore(a))
      .slice(0, 8);
  }, [plans, recs]);

  const isPersonalized = recs?.strategy === 'collaborative' || recs?.strategy === 'content-based';

  return (
    <div className="safe-pb">
      {/* Hero — compact: headline + subhead + stats only. CTAs removed in
       * favor of the 3-up category grid right below (all visible above the
       * fold). The "/advisor" entry point stays in the bottom nav. */}
      <section className="relative overflow-hidden page-hero">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6 md:pt-12 md:pb-8">
          <div className="max-w-lg md:max-w-2xl">
            <h1 className="animate-fade-up font-heading font-bold text-[26px] md:text-[40px] lg:text-[48px] text-[var(--ob-text)] leading-[1.1] tracking-tight">
              {t('hero.headline')}
            </h1>
            <p className="animate-fade-up delay-2 mt-3 text-[14px] md:text-[16px] text-[var(--ob-text-soft)] leading-relaxed max-w-md">
              {lang === 'ar'
                ? 'الجوال، إنترنت المنزل، والقسائم — كل شيء في مكان واحد.'
                : 'Mobile, home internet, and vouchers — all in one place.'}
            </p>

            <div className="animate-fade-up delay-3 mt-4 flex items-center gap-5">
              {[
                { value: '150+', label: t('stats.plans') },
                { value: '8', label: t('stats.carriers') },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="font-heading font-bold text-[18px] md:text-[20px] text-[var(--ob-text)]">{stat.value}</span>
                  <span className="text-[12px] md:text-[13px] text-[var(--ob-text-soft)] font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========= CATEGORY QUICK-PICKS — equal 3-up grid, all visible without scroll ========= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-5 md:pt-7 pb-2 md:pb-4">
        <h2 className="font-heading font-bold text-base md:text-lg text-foreground mb-3">
          {lang === 'ar' ? 'ماذا تبحث عنه؟' : 'What are you looking for?'}
        </h2>
        {/* 3-up equal grid — each card gets its own brand color (lavender / lime / coral)
         * brand surface. The wave is anchored to the RIGHT edge as a corner
         * accent, never covering the title or icon area. Eye-friendly. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
          {[
            {
              key: 'mobile',
              href: '/plans',
              icon: Smartphone,
              title: lang === 'ar' ? 'باقات الجوال' : 'Mobile Plans',
              count: `${plans.length} ${lang === 'ar' ? 'باقة' : 'plans'}`,
              bg: '#C59AFA',          // brand lavender — signature/primary
              waveOpacity: 0.32,
            },
            {
              key: 'internet',
              href: '/internet',
              icon: Wifi,
              title: lang === 'ar' ? 'إنترنت المنزل' : 'Home Internet',
              count: lang === 'ar' ? '8 مزودين' : '8 providers',
              bg: '#CFEB74',          // brand lime — fresh/fast vibe
              waveOpacity: 0.20,
            },
            {
              key: 'vouchers',
              href: '/vouchers',
              icon: Gift,
              title: lang === 'ar' ? 'القسائم' : 'Vouchers',
              count: lang === 'ar' ? '120 نوع' : '120 types',
              bg: '#FE7151',          // brand coral — warm/gift vibe
              waveOpacity: 0.22,
            },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.key}
                to={cat.href}
                onClick={() => trackEvent('homepage_quickpick_clicked', { category: cat.key })}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl ob-card-elev hover:shadow-xl transition-all min-h-[120px] sm:min-h-[140px] md:min-h-[160px] p-3 sm:p-4 md:p-5"
                style={{ backgroundColor: cat.bg }}
              >
                {/* Wave anchored to the RIGHT — never crosses past 50% width */}
                <div
                  className="absolute top-0 bottom-0 right-0 pointer-events-none"
                  style={{
                    width: '55%',
                    backgroundImage: 'url(/patterns/wave-purple-medium.png)',
                    backgroundSize: 'auto 130%',
                    backgroundPosition: 'left center',
                    backgroundRepeat: 'no-repeat',
                    opacity: cat.waveOpacity,
                    mixBlendMode: 'multiply',
                  }}
                />
                <Icon size={22} className="relative z-10 text-[#16143A]" strokeWidth={2.2} />
                <div className="relative z-10">
                  <h3 className="font-heading font-bold text-[13px] sm:text-[15px] md:text-base leading-tight text-[#16143A]">
                    {cat.title}
                  </h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[#16143A]/65">
                      {cat.count}
                    </span>
                    <ArrowRight
                      size={14}
                      className="shrink-0 text-[#16143A] group-hover:translate-x-0.5 transition-all rtl:rotate-180"
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trending Plans / Personalized Plans */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            {recsLoading ? (
              <>
                <span className="inline-block h-3 w-20 rounded bg-muted/50 animate-pulse" />
                <div className="h-8 w-48 rounded bg-muted/50 animate-pulse mt-1.5" />
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: '#FE7151' }}>
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
              </>
            )}
          </div>
          <Button variant="link" asChild className="text-primary font-semibold">
            <Link to="/plans">
              {t('trending.seeAll')}
              <ChevronRight size={16} className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>

        {recsLoading ? (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px] h-[280px] rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : (
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {trendingPlans.map((plan) => (
            <div key={plan.id} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px]">
              <ConnectedPlanCard plan={plan} compact style={CARD_FULL_HEIGHT} />
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Switch & Save CTA — brand lime (saving = success/fresh). */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/switch"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'switch_save' })}
          className="relative flex items-center gap-4 rounded-2xl p-5 md:p-6 group overflow-hidden ob-card-elev transition-all hover:shadow-xl hover:-translate-y-0.5"
          style={{ background: '#CFEB74' }}
        >
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: '40%',
              maxWidth: '320px',
              backgroundImage: 'url(/patterns/wave-purple-medium.png)',
              backgroundSize: 'auto 130%',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.20,
              mixBlendMode: 'multiply',
            }}
          />
          <div className="relative z-[2] shrink-0 w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: '#16143A', color: '#CFEB74' }}>
            <Sparkles size={20} />
          </div>
          <div className="relative z-[2] flex-1 min-w-0">
            <h3 className="font-heading font-bold text-base text-[#16143A]">
              {t('switchSave.title')}
            </h3>
            <p className="text-xs text-[#16143A]/70 mt-0.5">
              {t('switchSave.homeCardDesc')}
            </p>
          </div>
          <ArrowRight size={18} className="relative z-[2] text-[#16143A] shrink-0 rtl:rotate-180" />
        </Link>
      </div>

      {/* Plan Finder CTA — brand coral (popular/featured tool). */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/advisor"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder_banner' })}
          className="relative block overflow-hidden rounded-2xl px-5 py-5 md:px-7 md:py-6 group ob-card-elev transition-all hover:shadow-xl hover:-translate-y-0.5"
          style={{ background: '#FE7151' }}
        >
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: '40%',
              maxWidth: '320px',
              backgroundImage: 'url(/patterns/wave-purple-medium.png)',
              backgroundSize: 'auto 130%',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.22,
              mixBlendMode: 'multiply',
            }}
          />
          <div className="relative z-[2] flex items-center gap-4 md:gap-5">
            <div className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md" style={{ background: '#16143A', color: '#FE7151' }}>
              <Sparkles size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-base md:text-lg text-white leading-tight">
                {t('finderCta.title')}
              </h2>
              <p className="mt-0.5 text-white/85 text-[13px] md:text-sm leading-snug">
                {t('finderCta.subtitle')}
              </p>
            </div>

            <ArrowRight
              size={18}
              className="shrink-0 text-white rtl:rotate-180 group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </Link>
      </div>

      {/* ── Join the SOOB Community ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-12 md:pb-16">
        <Link
          to="/community"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'community' })}
          className="relative flex items-center gap-4 overflow-hidden rounded-2xl ob-card-elev p-5 md:p-6 group transition-all hover:shadow-xl hover:-translate-y-0.5"
          style={{ background: '#C59AFA' }}
        >
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: '40%',
              maxWidth: '300px',
              backgroundImage: 'url(/patterns/wave-purple-medium.png)',
              backgroundSize: 'auto 130%',
              backgroundPosition: 'right center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.28,
              mixBlendMode: 'multiply',
            }}
          />
          <div className="relative z-[2] shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-md" style={{ background: '#16143A', color: '#FE7151' }}>
            <Users size={20} />
          </div>
          <div className="relative z-[2] flex-1 min-w-0">
            <h2 className="font-heading font-bold text-base md:text-lg text-[#16143A] leading-tight">
              {lang === 'ar' ? 'انضم لمجتمع صوب' : 'Join SOOB Community'}
            </h2>
            <p className="mt-0.5 text-[#16143A]/75 text-[13px] md:text-sm leading-snug">
              {lang === 'ar'
                ? 'عروض حصرية، نصائح، ومحادثات مع المستخدمين.'
                : 'Exclusive offers, tips, and conversations with other members.'}
            </p>
          </div>
          <ArrowRight size={18} className="relative z-[2] shrink-0 text-[#16143A] rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <FinderModal show={showFinderModal} onDismiss={dismissFinderModal} />
    </div>
  );
}

