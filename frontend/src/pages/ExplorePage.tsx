import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, GraduationCap, Globe2, Wifi, Phone,
  Gamepad2, Infinity as InfinityIcon, Wallet, ArrowRight, Sparkles,
  Search, SlidersHorizontal, X, Scale,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { CARRIERS } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { usePersona } from '../context/PersonaContext';
import { trackEvent } from '../lib/analytics';
import { ConnectedPlanCard } from '../components/PlanCard';
import WaveLines from '../components/WaveLines';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import type { Plan } from '../types';

function parseNum(val: string): number {
  if (!val || val === '-') return 0;
  if (val === 'Unlimited') return Infinity;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

const PLAN_TYPES = ['Prepaid', 'Postpaid', 'Data-only'] as const;
const PRICE_MAX = 1000;
const CARD_FULL_HEIGHT: React.CSSProperties = { height: '100%' };
const MAX_PLANS_PER_CATEGORY = 15;

const TYPE_COLORS: Record<string, { active: string; bg: string; ring: string }> = {
  Prepaid:     { active: '#059669', bg: '#10B98118', ring: '#10B98140' },
  Postpaid:    { active: '#9333EA', bg: '#A855F718', ring: '#A855F740' },
  'Data-only': { active: '#D97706', bg: '#F59E0B18', ring: '#F59E0B40' },
};

interface CategoryDef {
  key: string;
  icon: typeof GraduationCap;
  filter: (p: Plan) => boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'students',
    icon: GraduationCap,
    filter: (p) => p.priceSAR <= 120 && parseNum(p.dataGB) >= 5 && p.planType !== 'Data-only',
  },
  {
    key: 'budget',
    icon: Wallet,
    filter: (p) => p.priceSAR <= 85 && p.planType !== 'Data-only',
  },
  {
    key: 'balanced',
    icon: Scale,
    filter: (p) => {
      const gb = parseNum(p.dataGB);
      const mins = parseNum(p.localCallMinutes);
      return p.priceSAR >= 70 && p.priceSAR <= 300 && gb >= 10 && gb <= 80 && mins >= 300 && p.planType !== 'Data-only';
    },
  },
  {
    key: 'gamers',
    icon: Gamepad2,
    filter: (p) => {
      const gb = parseNum(p.dataGB);
      const is5g = p.specialFeatures?.toLowerCase().includes('5g');
      const hasRoaming = p.specialFeatures?.toLowerCase().includes('roaming');
      return p.priceSAR <= 400 && (gb >= 50 || p.dataGB === 'Unlimited') && is5g && !hasRoaming;
    },
  },
  {
    key: 'expats',
    icon: Globe2,
    filter: (p) => {
      const intl = p.internationalCallMinutes;
      const hasIntl = intl && intl !== '-' && intl !== '';
      const hasRoaming = p.roamingDataGB && p.roamingDataGB !== '' && p.roamingDataGB !== '-';
      const featsIntl = p.specialFeatures?.toLowerCase().includes('roaming') || p.specialFeatures?.toLowerCase().includes('international');
      return !!(hasIntl || hasRoaming || featsIntl);
    },
  },
  {
    key: 'unlimited',
    icon: InfinityIcon,
    filter: (p) => p.dataGB === 'Unlimited' || p.localCallMinutes === 'Unlimited',
  },
  {
    key: 'dataOnly',
    icon: Wifi,
    filter: (p) => p.planType === 'Data-only',
  },
  {
    key: 'localCalls',
    icon: Phone,
    filter: (p) => {
      const mins = parseNum(p.localCallMinutes);
      return mins >= 500 && parseNum(p.dataGB) <= 10 && p.planType !== 'Data-only';
    },
  },
];

/* ---- Horizontal scroll row ---- */
const INITIAL_CARDS = 8;

function PlanRow({ id, plans, label, icon: Icon, description }: {
  id: string;
  plans: Plan[];
  label: string;
  icon: typeof GraduationCap;
  description: string;
}) {
  const { lang } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAll, setShowAll] = useState(plans.length <= INITIAL_CARDS);

  useEffect(() => {
    if (plans.length <= INITIAL_CARDS) { setShowAll(true); return; }
    const cb = () => setShowAll(true);
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(cb, { timeout: 1500 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(cb, 800);
      return () => clearTimeout(id);
    }
  }, [plans.length]);

  const visiblePlans = showAll ? plans : plans.slice(0, INITIAL_CARDS);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>(':scope > div');
    const cw = (firstCard?.offsetWidth ?? 300) + 16;
    const visibleCards = Math.max(1, Math.floor(el.clientWidth / cw));
    const amount = cw * visibleCards;
    const isRTL = lang === 'ar';
    const forward = dir === 'right' ? 1 : -1;
    el.scrollBy({ left: (isRTL ? -forward : forward) * amount, behavior: 'smooth' });
  };

  if (plans.length === 0) return null;

  return (
    <section id={id} className="mb-6 scroll-mt-4">
      {/* Row header */}
      <div className="flex items-center gap-2.5 md:gap-3 mb-2.5 md:mb-3 px-4 sm:px-6 md:px-8">
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-[#E37417]/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-[#E37417] md:hidden" />
          <Icon size={18} className="text-[#E37417] hidden md:block" />
        </div>
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-base md:text-lg text-foreground leading-tight truncate">
            {label}
          </h2>
          <p className="text-[11px] md:text-xs text-muted-foreground leading-snug mt-0.5">{description}</p>
        </div>
      </div>

      {/* Scrollable row */}
      <div className="relative">
        <button
          onClick={() => scroll('right')}
          className="hidden md:flex absolute end-0 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full
            bg-background border border-border shadow-xl
            items-center justify-center text-foreground
            transition-transform duration-200 hover:scale-110"
        >
          <ChevronRight size={22} className="rtl:rotate-180" />
        </button>

        <div
          ref={scrollRef}
          className="flex items-stretch gap-3 md:gap-4 overflow-x-auto px-4 sm:px-6 md:px-10 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {visiblePlans.map((plan) => (
            <div key={plan.id} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px] self-stretch" style={{ contentVisibility: 'auto', containIntrinsicSize: '280px 320px' }}>
              <ConnectedPlanCard plan={plan} compact style={CARD_FULL_HEIGHT} />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

// Map persona segments to category keys
const SEGMENT_TO_CATEGORY: Record<string, string> = {
  gamer: 'gamers',
  student: 'students',
  budget: 'budget',
  expat: 'expats',
  family: 'balanced',
  streamer: 'unlimited',
  power_user: 'unlimited',
  business: 'expats',
};

export default function ExplorePage() {
  const { t } = useLang();
  const { plans: PLANS_DATA } = usePlans();
  const { segment, trackSignal } = usePersona();

  /* ---- filter state ---- */
  const [search, setSearch] = useState('');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [dataFilter, setDataFilter] = useState('any');
  const [localCallsFilter, setLocalCallsFilter] = useState('any');
  const [intlCallsFilter, setIntlCallsFilter] = useState<string | null>(null);
  const [socialFilter, setSocialFilter] = useState<string | null>(null);
  const [fiveGFilter, setFiveGFilter] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Reorder categories so the persona's category appears first
  const orderedCategories = useMemo(() => {
    if (!segment) return CATEGORIES;
    const catKey = SEGMENT_TO_CATEGORY[segment];
    if (!catKey) return CATEGORIES;
    const idx = CATEGORIES.findIndex(c => c.key === catKey);
    if (idx <= 0) return CATEGORIES;
    return [CATEGORIES[idx], ...CATEGORIES.slice(0, idx), ...CATEGORIES.slice(idx + 1)];
  }, [segment]);

  const toggleCarrier = useCallback((name: string) => {
    setSelectedCarriers(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  }, []);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedCarriers([]);
    setSelectedTypes([]);
    setPriceRange([0, PRICE_MAX]);
    setDataFilter('any');
    setLocalCallsFilter('any');
    setIntlCallsFilter(null);
    setSocialFilter(null);
    setFiveGFilter(false);
    setActiveCategory(null);
  }, []);

  const hasActiveFilters = search || selectedCarriers.length > 0 || selectedTypes.length > 0 ||
    priceRange[0] > 0 || priceRange[1] < PRICE_MAX ||
    dataFilter !== 'any' || localCallsFilter !== 'any' || intlCallsFilter !== null || socialFilter !== null || fiveGFilter || activeCategory !== null;

  const dataOptions = [
    { key: 'any', label: t('browse.anyData') },
    { key: '5', label: '5+ GB' },
    { key: '20', label: '20+ GB' },
    { key: '50', label: '50+ GB' },
    { key: 'unlimited', label: t('browse.unlimited') },
  ];
  const localCallsOptions = [
    { key: 'any', label: t('browse.anyCalls') },
    { key: '100', label: '100+ min' },
    { key: '300', label: '300+ min' },
    { key: '500', label: '500+ min' },
    { key: 'unlimited', label: t('browse.unlimited') },
  ];
  const yesNoOptions = [
    { key: 'no', label: t('explore.no') },
    { key: 'yes', label: t('explore.yes') },
  ];

  /* ---- apply global filters then split into categories ---- */
  const categoryData = useMemo(() => {
    let base = [...PLANS_DATA];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter(p =>
        p.planName.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q)
      );
    }
    if (selectedCarriers.length > 0) {
      base = base.filter(p => selectedCarriers.includes(p.provider));
    }
    if (selectedTypes.length > 0) {
      base = base.filter(p => selectedTypes.includes(p.planType));
    }
    base = base.filter(p => p.priceSAR >= priceRange[0] && p.priceSAR <= priceRange[1]);

    // Data filter
    if (dataFilter !== 'any') {
      if (dataFilter === 'unlimited') {
        base = base.filter(p => p.dataGB === 'Unlimited');
      } else {
        const minGB = parseInt(dataFilter);
        base = base.filter(p => parseNum(p.dataGB) >= minGB);
      }
    }

    // Local calls filter
    if (localCallsFilter !== 'any') {
      if (localCallsFilter === 'unlimited') {
        base = base.filter(p => p.localCallMinutes === 'Unlimited');
      } else {
        const minMins = parseInt(localCallsFilter);
        base = base.filter(p => parseNum(p.localCallMinutes) >= minMins);
      }
    }

    // International calls filter
    if (intlCallsFilter === 'yes') {
      base = base.filter(p => p.internationalCallMinutes && p.internationalCallMinutes !== '-' && p.internationalCallMinutes !== '');
    } else if (intlCallsFilter === 'no') {
      base = base.filter(p => !p.internationalCallMinutes || p.internationalCallMinutes === '-' || p.internationalCallMinutes === '');
    }

    // Social media data filter
    if (socialFilter === 'yes') {
      base = base.filter(p => p.socialMediaData && p.socialMediaData !== '-' && p.socialMediaData !== '' && p.socialMediaData !== '1');
    } else if (socialFilter === 'no') {
      base = base.filter(p => !p.socialMediaData || p.socialMediaData === '-' || p.socialMediaData === '' || p.socialMediaData === '1');
    }

    // 5G filter
    if (fiveGFilter) {
      base = base.filter(p => p.specialFeatures?.toLowerCase().includes('5g'));
    }

    // Sort all by cheapest first
    base.sort((a, b) => a.priceSAR - b.priceSAR);

    return orderedCategories.map((cat) => {
      const plans = base.filter(cat.filter).slice(0, MAX_PLANS_PER_CATEGORY);
      return { ...cat, plans };
    });
  }, [PLANS_DATA, search, selectedCarriers, selectedTypes, priceRange, dataFilter, localCallsFilter, intlCallsFilter, socialFilter, fiveGFilter, orderedCategories]);

  const visibleCategories = activeCategory
    ? categoryData.filter(c => c.key === activeCategory)
    : categoryData;

  // Stagger rendering: show first 2 rows immediately, rest after idle
  const INITIAL_ROWS = 2;
  const [rowLimit, setRowLimit] = useState(INITIAL_ROWS);
  useEffect(() => {
    if (rowLimit >= visibleCategories.length) return;
    const cb = () => setRowLimit(visibleCategories.length);
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(cb, { timeout: 300 });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(cb, 100);
      return () => clearTimeout(id);
    }
  }, [visibleCategories.length, rowLimit]);

  // Reset row limit when category filter changes
  useEffect(() => {
    setRowLimit(INITIAL_ROWS);
  }, [activeCategory]);

  /* ---- filter panel content (shared desktop + mobile) ---- */
  const filterContent = (
    <>
      {/* Carrier filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('browse.allCarriers')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CARRIERS.map(carrier => {
            const active = selectedCarriers.includes(carrier.name);
            return (
              <Button
                key={carrier.name}
                variant="ghost"
                size="sm"
                onClick={() => toggleCarrier(carrier.name)}
                className={`flex items-center gap-2 rounded-xl font-medium
                  ${active
                    ? 'bg-[#E37417] text-white ring-1 ring-[#E37417] hover:bg-[#E37417]/90 shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <img src={carrier.logo} alt={carrier.name} className="h-3.5 w-auto object-contain" />
                <span className="text-[11px] font-semibold">{carrier.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Type filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('browse.allTypes')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PLAN_TYPES.map(type => {
            const active = selectedTypes.includes(type);
            const tc = TYPE_COLORS[type];
            return (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                onClick={() => toggleType(type)}
                className={`rounded-lg text-xs font-semibold
                  ${active
                    ? 'ring-1'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                style={active ? { backgroundColor: tc.bg, color: tc.active, '--tw-ring-color': tc.ring } as React.CSSProperties : {}}
              >
                {t(`types.${type}`)}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('browse.priceRange')}
        </p>
        <div dir="ltr">
          <Slider
            min={0}
            max={PRICE_MAX}
            step={10}
            value={priceRange}
            onValueChange={setPriceRange}
            onValueCommit={(v) => {
              const bucket = v[1] <= 100 ? 'low' : v[1] <= 300 ? 'mid' : 'high';
              trackSignal('priceRangeClicks', bucket);
            }}
            className="w-full"
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground font-medium">
          <span>SAR {priceRange[0]}</span>
          <span>SAR {priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}</span>
        </div>
      </div>

      {/* Data filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('browse.dataRange')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {dataOptions.map(opt => (
            <Button
              key={opt.key}
              variant="ghost"
              size="sm"
              onClick={() => { if (opt.key === 'unlimited') trackSignal('filtersUsed', 'unlimited'); setDataFilter(opt.key); }}
              className={`rounded-lg text-xs font-semibold
                ${dataFilter === opt.key
                  ? 'bg-[#E37417] text-white ring-1 ring-[#E37417] hover:bg-[#E37417]/90 shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Local calls filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('browse.localCalls')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {localCallsOptions.map(opt => (
            <Button
              key={opt.key}
              variant="ghost"
              size="sm"
              onClick={() => setLocalCallsFilter(opt.key)}
              className={`rounded-lg text-xs font-semibold
                ${localCallsFilter === opt.key
                  ? 'bg-[#E37417] text-white ring-1 ring-[#E37417] hover:bg-[#E37417]/90 shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* International calls filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('explore.needIntl')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {yesNoOptions.map(opt => (
            <Button
              key={opt.key}
              variant="ghost"
              size="sm"
              onClick={() => { const next = intlCallsFilter === opt.key ? null : opt.key; if (next === 'yes') trackSignal('filtersUsed', 'international'); setIntlCallsFilter(next); }}
              className={`rounded-lg text-xs font-semibold
                ${intlCallsFilter === opt.key
                  ? 'bg-[#E37417] text-white ring-1 ring-[#E37417] hover:bg-[#E37417]/90 shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Social media data filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('explore.needSocial')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {yesNoOptions.map(opt => (
            <Button
              key={opt.key}
              variant="ghost"
              size="sm"
              onClick={() => { const next = socialFilter === opt.key ? null : opt.key; if (next === 'yes') trackSignal('filtersUsed', 'social'); setSocialFilter(next); }}
              className={`rounded-lg text-xs font-semibold
                ${socialFilter === opt.key
                  ? 'bg-[#E37417] text-white ring-1 ring-[#E37417] hover:bg-[#E37417]/90 shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* 5G filter */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
          {t('browse.network')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setFiveGFilter(prev => { trackEvent('filter_applied', { filter: '5g', active: !prev }); if (!prev) trackSignal('filtersUsed', '5g'); return !prev; }); }}
          className={`rounded-lg text-xs font-semibold
            ${fiveGFilter
              ? 'bg-[#E37417] text-white ring-1 ring-[#E37417] hover:bg-[#E37417]/90 shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
        >
          5G
        </Button>
      </div>
    </>
  );

  return (
    <div className="safe-pb">
      {/* ========= HEADER ========= */}
      <section className="relative z-10 hero-gradient grain overflow-hidden">
        <WaveLines />
        <div className="absolute top-0 end-0 w-64 h-64 rounded-full bg-white/[0.03] -translate-y-1/3 translate-x-1/3 blob" />

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 pt-5 pb-4 md:pt-8 md:pb-6">
          <h1 className="font-heading font-normal text-2xl md:text-3xl text-black tracking-tight">
            {t('explore.title')}
          </h1>
          <p className="text-black/60 mt-1 text-sm md:text-base">
            {t('explore.subtitle')}
          </p>

          {/* Search + mobile filter toggle */}
          <div className="flex items-start gap-3 mt-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-4 text-foreground/50 z-10" />
                <Input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('browse.searchPlaceholder')}
                  className="w-full ps-11 pe-4 py-3 h-auto rounded-xl bg-white border-white/80 text-sm text-foreground
                    placeholder:text-foreground/40 focus-visible:ring-white/50 focus-visible:border-white shadow-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute top-1/2 -translate-y-1/2 end-3 text-foreground/50 hover:text-foreground/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setShowMobileFilters(true)}
              className="flex lg:hidden items-center justify-center gap-2 px-4 py-3 h-auto rounded-xl bg-white border border-white/80
                text-sm font-semibold text-foreground hover:border-white hover:bg-white/90 shadow-sm shrink-0"
            >
              <SlidersHorizontal size={16} />
              {t('browse.filters')}
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
            </Button>
          </div>
          {/* Category chips — full width under search row */}
          <div className="flex gap-1 overflow-x-auto mt-2 pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {orderedCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    const next = activeCategory === cat.key ? null : cat.key;
                    if (next) {
                      trackEvent('category_selected', { category: next });
                      trackSignal('categoriesViewed', next);
                    }
                    setActiveCategory(next);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                    transition-all duration-200 shrink-0
                    ${isActive
                      ? 'bg-[#FFF0D0] text-black shadow-sm'
                      : 'bg-white/15 text-black/70 hover:bg-white/25'
                    }`}
                >
                  <Icon size={11} />
                  {t(`explore.${cat.key}`)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========= MAIN CONTENT ========= */}
      <div id="explore-content" className="relative z-20 bg-background rounded-t-3xl">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-4">
          <div className="flex gap-8">

            {/* ---- DESKTOP SIDEBAR FILTERS ---- */}
            <aside className="hidden lg:block w-[220px] shrink-0">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    {t('browse.filters')}
                  </h3>
                  {hasActiveFilters && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs font-semibold text-primary h-auto p-0"
                    >
                      {t('browse.clearFilters')}
                    </Button>
                  )}
                </div>
                <div className="max-h-[calc(100vh-8rem)] overflow-y-auto space-y-4 pe-2 pb-8" style={{ scrollbarWidth: 'thin' }}>
                  {filterContent}
                </div>
              </div>
            </aside>

            {/* ---- MAIN AREA ---- */}
            <div className="flex-1 min-w-0">

              {/* Active filter chips */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {activeCategory && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      {t(`explore.${activeCategory}`)}
                      <button onClick={() => setActiveCategory(null)} className="hover:opacity-70"><X size={12} /></button>
                    </Badge>
                  )}
                  {selectedCarriers.map(c => (
                    <Badge key={c} variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      {c}
                      <button onClick={() => toggleCarrier(c)} className="hover:opacity-70"><X size={12} /></button>
                    </Badge>
                  ))}
                  {selectedTypes.map(type => {
                    const tc = TYPE_COLORS[type];
                    return (
                      <Badge key={type} variant="secondary" className="gap-1.5 px-3 py-1.5 border-0"
                        style={{ backgroundColor: tc.bg, color: tc.active }}>
                        {t(`types.${type}`)}
                        <button onClick={() => toggleType(type)} className="hover:opacity-70"><X size={12} /></button>
                      </Badge>
                    );
                  })}
                  {(priceRange[0] > 0 || priceRange[1] < PRICE_MAX) && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      SAR {priceRange[0]}-{priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}
                      <button onClick={() => setPriceRange([0, PRICE_MAX])}><X size={12} /></button>
                    </Badge>
                  )}
                  {dataFilter !== 'any' && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      {dataOptions.find(d => d.key === dataFilter)?.label}
                      <button onClick={() => setDataFilter('any')}><X size={12} /></button>
                    </Badge>
                  )}
                  {localCallsFilter !== 'any' && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      {localCallsOptions.find(o => o.key === localCallsFilter)?.label}
                      <button onClick={() => setLocalCallsFilter('any')}><X size={12} /></button>
                    </Badge>
                  )}
                  {intlCallsFilter !== null && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      {t('explore.needIntl')} {intlCallsFilter === 'yes' ? t('explore.yes') : t('explore.no')}
                      <button onClick={() => setIntlCallsFilter(null)}><X size={12} /></button>
                    </Badge>
                  )}
                  {socialFilter !== null && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      {t('explore.needSocial')} {socialFilter === 'yes' ? t('explore.yes') : t('explore.no')}
                      <button onClick={() => setSocialFilter(null)}><X size={12} /></button>
                    </Badge>
                  )}
                  {fiveGFilter && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#E37417] text-white border-0 shadow-sm">
                      5G
                      <button onClick={() => setFiveGFilter(false)}><X size={12} /></button>
                    </Badge>
                  )}
                </div>
              )}

              {/* ---- CATEGORY ROWS ---- */}
              {visibleCategories.slice(0, rowLimit).map((cat) => (
                <PlanRow
                  key={cat.key}
                  id={`cat-${cat.key}`}
                  plans={cat.plans}
                  label={t(`explore.${cat.key}`)}
                  icon={cat.icon}
                  description={t(`explore.${cat.key}Desc`)}
                />
              ))}

              {/* Empty state when all rows are empty */}
              {visibleCategories.every(c => c.plans.length === 0) && (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                    <Search size={28} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-foreground">
                    {t('browse.noResults')}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                    {t('browse.noResultsDesc')}
                  </p>
                  <Button
                    variant="ghost"
                    onClick={() => { clearFilters(); setActiveCategory(null); }}
                    className="mt-5 px-6 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm hover:bg-primary/20"
                  >
                    {t('browse.clearFilters')}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* ========= FINDER CTA BANNER ========= */}
          <div className="mt-16 relative overflow-hidden rounded-3xl p-8 md:p-12 text-center hero-gradient grain">
            <WaveLines />
            <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3 blob" />
            <div className="relative z-10">
              <Badge variant="secondary" className="gap-2 px-3 py-1 bg-[#FFF0D0] text-black/70 border-0 text-xs font-semibold mb-4">
                <Sparkles size={12} />
                {t('home.just30Seconds')}
              </Badge>
              <h3 className="font-heading font-normal text-2xl md:text-3xl text-black tracking-tight">
                {t('finderCta.title')}
              </h3>
              <p className="text-black/50 mt-2 text-sm max-w-md mx-auto">
                {t('finderCta.subtitle')}
              </p>
              <Button asChild className="mt-6 px-6 py-3 h-auto rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 shadow-lg shadow-black/10 glow-primary hover:shadow-xl transition-all duration-300">
                <Link to="/advisor">
                  {t('finderCta.cta')}
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ========= MOBILE FILTER DRAWER ========= */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl p-0 md:hidden">
          <SheetHeader className="sticky top-0 bg-background z-10 px-6 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-heading font-bold text-lg text-foreground">
                {t('browse.filters')}
              </SheetTitle>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="text-xs font-semibold text-primary h-auto p-0">
                    {t('browse.clearFilters')}
                  </Button>
                )}
                <Button size="sm" onClick={() => setShowMobileFilters(false)} className="rounded-xl text-white text-sm font-bold bg-primary">
                  {t('browse.done')}
                </Button>
              </div>
            </div>
          </SheetHeader>
          <div className="p-6 pb-24 space-y-6">
            {filterContent}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
