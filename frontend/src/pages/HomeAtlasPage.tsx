/**
 * HomeAtlasPage — preview of the existing SOOB homepage with the Atlas /
 * Pictify visual layer applied:
 *   - Cream bg with dotted grid pattern
 *   - 2px solid borders on cards/chips/CTAs
 *   - Hard offset "sticker" shadows (no blur)
 *   - Rotated sticker tag/eyebrow
 *   - Dashed dividers
 *
 * Layout, sections, and content mirror HomePage.tsx exactly — only styling
 * changes. Reachable at /home-atlas. Includes a self-contained light/dark
 * toggle so it doesn't depend on the global data-ot theme.
 */
import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ChevronRight, Smartphone, Wifi, Gift, Sun, Moon } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { getValueScore } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { useAuth } from '../context/AuthContext';
import { ConnectedPlanCard } from '../components/PlanCard';
import { trackEvent } from '../lib/analytics';
import { getRecommendations, type RecommendationResult } from '../services/recommendations.service';

const CARD_FULL_HEIGHT: React.CSSProperties = { height: '100%' };

export default function HomeAtlasPage() {
  const { t, lang } = useLang();
  const { plans } = usePlans();
  const { isLoggedIn } = useAuth();
  const [mode, setMode] = useState<'light' | 'dark'>('light');

  const ar = lang === 'ar';

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
    return [...plans].sort((a, b) => getValueScore(b) - getValueScore(a)).slice(0, 8);
  }, [plans, recs]);

  const isPersonalized = recs?.strategy === 'collaborative' || recs?.strategy === 'content-based';

  return (
    <div className={`atlas-theme${mode === 'dark' ? ' is-dark' : ''} safe-pb`}>
      <style>{atlasCss}</style>

      <button
        type="button"
        className="atlas-mode-toggle"
        onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
        aria-label={mode === 'light' ? 'Switch to dark' : 'Switch to light'}
      >
        {mode === 'light' ? <Moon size={14} /> : <Sun size={14} />}
        <span>{mode === 'light' ? (ar ? 'داكن' : 'Dark') : (ar ? 'فاتح' : 'Light')}</span>
      </button>

      {/* HERO — same as HomePage: headline + subhead + 2 stats. */}
      <section className="relative overflow-hidden atlas-hero-section">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6 md:pt-12 md:pb-8">
          <div className="atlas-eyebrow-pill">
            <span className="atlas-dot-bullet" />
            <span>{ar ? 'صوب · سوق الاتصالات' : 'SOOB · Telecom marketplace'}</span>
          </div>
          <div className="max-w-lg md:max-w-2xl mt-5">
            <h1 className="font-heading font-bold atlas-headline">
              {t('hero.headline')}
            </h1>
            <p className="mt-3 atlas-subhead">
              {ar
                ? 'الجوال، إنترنت المنزل، والقسائم — كل شيء في مكان واحد.'
                : 'Mobile, home internet, and vouchers — all in one place.'}
            </p>

            <div className="mt-5 flex items-center gap-3 flex-wrap">
              {[
                { value: '150+', label: t('stats.plans') },
                { value: '8',    label: t('stats.carriers') },
              ].map((stat, i) => (
                <div key={i} className="atlas-stat-chip">
                  <span className="atlas-stat-value">{stat.value}</span>
                  <span className="atlas-stat-label">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORY QUICK-PICKS */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-5 md:pt-7 pb-2 md:pb-4">
        <div className="atlas-section-head">
          <h2 className="atlas-section-title">
            {ar ? 'ماذا تبحث عنه؟' : 'What are you looking for?'}
          </h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 mt-4">
          {[
            { key: 'mobile',   href: '/plans',    icon: Smartphone, title: ar ? 'باقات الجوال'   : 'Mobile Plans',  count: `${plans.length} ${ar ? 'باقة' : 'plans'}`,   tag: ar ? 'الأكثر طلبًا' : 'Most picked' },
            { key: 'internet', href: '/internet', icon: Wifi,       title: ar ? 'إنترنت المنزل' : 'Home Internet', count: ar ? '8 مزودين' : '8 providers',                tag: ar ? 'ألياف' : 'Fiber' },
            { key: 'vouchers', href: '/vouchers', icon: Gift,       title: ar ? 'القسائم'         : 'Vouchers',      count: ar ? '120 نوع' : '120 types',                  tag: ar ? 'فوري' : 'Instant' },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.key}
                to={cat.href}
                onClick={() => trackEvent('homepage_quickpick_clicked', { category: cat.key })}
                className="atlas-card group relative flex flex-col justify-between min-h-[140px] sm:min-h-[160px] md:min-h-[180px] p-4 sm:p-5"
              >
                <span className="atlas-tier-tag">{cat.tag}</span>
                <Icon size={22} strokeWidth={2.2} className="relative z-10 atlas-card-icon" />
                <div className="relative z-10 mt-3 atlas-card-foot">
                  <h3 className="atlas-card-title">{cat.title}</h3>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="atlas-card-meta">{cat.count}</span>
                    <ArrowRight size={14} className="atlas-card-arrow shrink-0 group-hover:translate-x-0.5 transition-all rtl:rotate-180" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* TRENDING / FOR YOU */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-12 md:pt-20 pb-10 md:pb-14">
        <div className="flex items-end justify-between mb-6 md:mb-8 atlas-section-divider">
          <div>
            {recsLoading ? (
              <>
                <span className="inline-block h-3 w-20 rounded bg-foreground/10 animate-pulse" />
                <div className="h-8 w-48 rounded bg-foreground/10 animate-pulse mt-1.5" />
              </>
            ) : (
              <>
                <span className="atlas-eyebrow-pill atlas-eyebrow-pill--small">
                  <Sparkles size={11} />
                  {isPersonalized
                    ? (ar ? 'مقترحة لك' : 'For You')
                    : t('home.popularNow')}
                </span>
                <h2 className="font-heading font-bold text-2xl md:text-[32px] atlas-section-h2 mt-3 tracking-tight">
                  {isPersonalized
                    ? (ar ? 'باقات تناسبك' : 'Recommended for You')
                    : t('trending.title')}
                </h2>
              </>
            )}
          </div>
          <Link to="/plans" className="atlas-link-cta">
            <span>{t('trending.seeAll')}</span>
            <ChevronRight size={14} className="rtl:rotate-180" />
          </Link>
        </div>

        {recsLoading ? (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px] h-[280px] rounded-xl bg-foreground/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {trendingPlans.map((plan) => (
              <div key={plan.id} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px] atlas-plan-card-wrap">
                <ConnectedPlanCard plan={plan} compact style={CARD_FULL_HEIGHT} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SWITCH & SAVE */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/switch"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'switch_save' })}
          className="atlas-banner relative flex items-center gap-4 p-5 md:p-6 group transition-all"
        >
          <div className="relative z-[2] shrink-0 atlas-banner-icon">
            <Sparkles size={20} />
          </div>
          <div className="relative z-[2] flex-1 min-w-0">
            <h3 className="font-heading font-bold text-base atlas-banner-title">
              {t('switchSave.title')}
            </h3>
            <p className="text-xs atlas-banner-sub mt-0.5">
              {t('switchSave.homeCardDesc')}
            </p>
          </div>
          <ArrowRight size={18} className="relative z-[2] shrink-0 rtl:rotate-180 atlas-banner-arrow transition-colors" />
        </Link>
      </div>

      {/* PLAN FINDER */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10 md:pb-14">
        <Link
          to="/advisor"
          onClick={() => trackEvent('homepage_cta_clicked', { cta: 'finder_banner' })}
          className="atlas-banner atlas-banner--accent relative block px-5 py-5 md:px-7 md:py-6 group transition-shadow"
        >
          <div className="relative z-[2] flex items-center gap-4 md:gap-5">
            <div className="shrink-0 atlas-banner-icon atlas-banner-icon--cta group-hover:scale-105 transition-transform">
              <Sparkles size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-base md:text-lg atlas-banner-title leading-tight">
                {t('finderCta.title')}
              </h2>
              <p className="mt-0.5 atlas-banner-sub text-[13px] md:text-sm leading-snug">
                {t('finderCta.subtitle')}
              </p>
            </div>
            <ArrowRight size={18} className="shrink-0 rtl:rotate-180 atlas-banner-arrow group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Atlas visual layer · scoped to .atlas-theme ─────────────────────────
// Keeps SOOB's lavender / lime / navy palette but adopts Pictify aesthetic:
// cream bg + dotted grid, heavy 2px borders, hard offset shadows, rotated
// sticker tags, dashed dividers.
const atlasCss = `
.atlas-theme {
  --atlas-bg: #FAF6E9;
  --atlas-surface: #FFFFFF;
  --atlas-surface-soft: #F5F0DF;
  --atlas-ink: #16143A;
  --atlas-ink-2: #4A4868;
  --atlas-ink-3: #7A7894;
  --atlas-border: #16143A;
  --atlas-border-soft: rgba(22, 20, 58, 0.18);
  --atlas-accent: #B79EFF;
  --atlas-accent-2: #E0FF4F;
  --atlas-shadow-sm: 2px 2px 0 var(--atlas-border);
  --atlas-shadow:    4px 4px 0 var(--atlas-border);
  --atlas-shadow-lg: 6px 6px 0 var(--atlas-border);
  --atlas-dot: rgba(22, 20, 58, 0.10);
  --atlas-radius: 16px;

  background-color: var(--atlas-bg);
  background-image: radial-gradient(circle, var(--atlas-dot) 1px, transparent 1px);
  background-size: 26px 26px;
  color: var(--atlas-ink);
  min-height: 100vh;
  padding-bottom: 60px;
  position: relative;
}

/* Force every text element back to ink unless explicitly overridden */
.atlas-theme,
.atlas-theme h1,
.atlas-theme h2,
.atlas-theme h3,
.atlas-theme p,
.atlas-theme span,
.atlas-theme a {
  color: var(--atlas-ink);
}

/* Mode toggle — floating top-right (or top-left in RTL) */
.atlas-mode-toggle {
  position: fixed;
  top: 88px;
  right: 24px;
  z-index: 60;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--atlas-surface);
  color: var(--atlas-ink);
  border: 2px solid var(--atlas-border);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  box-shadow: var(--atlas-shadow-sm);
  cursor: pointer;
  transition: transform .12s, box-shadow .12s;
}
.atlas-mode-toggle:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--atlas-border);
}
[dir="rtl"] .atlas-mode-toggle { right: auto; left: 24px; }

/* HERO */
.atlas-hero-section { background: transparent; }

.atlas-eyebrow-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--atlas-ink);
  background: var(--atlas-accent-2);
  border: 2px solid var(--atlas-border);
  border-radius: 999px;
  padding: 6px 14px;
  box-shadow: 3px 3px 0 var(--atlas-border);
  transform: rotate(-1.5deg);
}
.atlas-eyebrow-pill--small {
  background: var(--atlas-accent);
  font-size: 10px;
  padding: 5px 11px;
  box-shadow: 2px 2px 0 var(--atlas-border);
}
.atlas-dot-bullet {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--atlas-ink);
  display: inline-block;
}

.atlas-headline {
  font-size: 30px;
  letter-spacing: -0.035em;
  line-height: 1.05;
  color: var(--atlas-ink);
}
@media (min-width: 768px) { .atlas-headline { font-size: 48px; } }
@media (min-width: 1024px) { .atlas-headline { font-size: 56px; } }

.atlas-subhead {
  font-size: 15px;
  color: var(--atlas-ink-2);
  line-height: 1.55;
  max-width: 520px;
}
@media (min-width: 768px) { .atlas-subhead { font-size: 16px; } }

.atlas-stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--atlas-surface);
  border: 2px solid var(--atlas-border);
  border-radius: 999px;
  padding: 6px 14px;
  box-shadow: var(--atlas-shadow-sm);
}
.atlas-stat-value {
  font-weight: 800;
  font-size: 16px;
  color: var(--atlas-ink);
}
.atlas-stat-label {
  font-size: 12px;
  color: var(--atlas-ink-2);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* SECTION HEADERS */
.atlas-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.atlas-section-title {
  font-family: inherit;
  font-size: 16px;
  font-weight: 800;
  color: var(--atlas-ink);
  letter-spacing: -0.01em;
}
@media (min-width: 768px) { .atlas-section-title { font-size: 19px; } }

.atlas-section-h2 { color: var(--atlas-ink); }

.atlas-section-divider {
  border-bottom: 2px dashed var(--atlas-border-soft);
  padding-bottom: 18px;
}

.atlas-link-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--atlas-ink);
  border: 2px solid var(--atlas-border);
  background: var(--atlas-surface);
  padding: 7px 14px;
  border-radius: 999px;
  box-shadow: var(--atlas-shadow-sm);
  transition: transform .12s, box-shadow .12s;
}
.atlas-link-cta:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 var(--atlas-border);
}

/* CATEGORY CARDS */
.atlas-card {
  background: var(--atlas-surface);
  border: 2px solid var(--atlas-border);
  border-radius: var(--atlas-radius);
  box-shadow: var(--atlas-shadow);
  overflow: hidden;
  position: relative;
  text-decoration: none;
  color: var(--atlas-ink);
  transition: transform .18s, box-shadow .18s;
}
.atlas-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: 7px 7px 0 var(--atlas-border);
}

.atlas-tier-tag {
  position: absolute;
  top: 14px;
  right: 14px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--atlas-ink);
  background: var(--atlas-accent);
  border: 2px solid var(--atlas-border);
  border-radius: 999px;
  padding: 3px 9px;
  box-shadow: 2px 2px 0 var(--atlas-border);
  transform: rotate(2deg);
  z-index: 5;
}
[dir="rtl"] .atlas-tier-tag { right: auto; left: 14px; }

.atlas-card-icon {
  color: var(--atlas-ink);
  width: 28px; height: 28px;
  border: 2px solid var(--atlas-border);
  border-radius: 8px;
  background: var(--atlas-accent);
  padding: 4px;
  box-shadow: 2px 2px 0 var(--atlas-border);
}

.atlas-card-title {
  font-family: inherit;
  font-weight: 800;
  font-size: 14px;
  line-height: 1.15;
  color: var(--atlas-ink);
  letter-spacing: -0.01em;
}
@media (min-width: 640px) { .atlas-card-title { font-size: 15.5px; } }
@media (min-width: 768px) { .atlas-card-title { font-size: 17px; } }

.atlas-card-meta {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--atlas-ink-3);
}
@media (min-width: 640px) { .atlas-card-meta { font-size: 11px; } }

.atlas-card-arrow { color: var(--atlas-ink); }

.atlas-card-foot {
  border-top: 2px dashed var(--atlas-border-soft);
  padding-top: 12px;
}

/* PLAN CARDS — light shell so the sticker shadow shows */
.atlas-plan-card-wrap > * {
  border: 2px solid var(--atlas-border) !important;
  border-radius: var(--atlas-radius) !important;
  box-shadow: var(--atlas-shadow) !important;
  transition: transform .18s, box-shadow .18s;
}
.atlas-plan-card-wrap:hover > * {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--atlas-border) !important;
}

/* BANNERS (Switch & Save, Plan Finder) */
.atlas-banner {
  background: var(--atlas-surface);
  border: 2px solid var(--atlas-border);
  border-radius: var(--atlas-radius);
  box-shadow: var(--atlas-shadow);
  text-decoration: none;
  color: var(--atlas-ink);
  position: relative;
  overflow: hidden;
}
.atlas-banner:hover {
  transform: translate(-2px, -2px);
  box-shadow: 6px 6px 0 var(--atlas-border);
}
.atlas-banner--accent {
  background: var(--atlas-accent);
}

.atlas-banner-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--atlas-accent);
  color: var(--atlas-ink);
  display: grid;
  place-items: center;
  border: 2px solid var(--atlas-border);
  box-shadow: 2px 2px 0 var(--atlas-border);
}
.atlas-banner-icon--cta {
  background: var(--atlas-accent-2);
}
.atlas-banner-title { color: var(--atlas-ink); }
.atlas-banner-sub  { color: var(--atlas-ink-2); }
.atlas-banner-arrow { color: var(--atlas-ink); }

/* DARK MODE — toggleable on this page only */
.atlas-theme.is-dark {
  --atlas-bg: #16143A;
  --atlas-surface: #1E1B4D;
  --atlas-surface-soft: #2A2660;
  --atlas-ink: #FAF6E9;
  --atlas-ink-2: #C8C5E0;
  --atlas-ink-3: #8E8AB8;
  --atlas-border: #FAF6E9;
  --atlas-border-soft: rgba(250, 246, 233, 0.18);
  --atlas-dot: rgba(250, 246, 233, 0.08);
}
`;
