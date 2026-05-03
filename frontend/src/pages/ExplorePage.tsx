/**
 * Explore page ("/plans") — category-based plan discovery.
 *
 * Offers predefined categories (Students, International, Data-only, Gamers, Budget, etc.)
 * that filter the plan catalog by relevant criteria. Each category shows a filtered grid
 * of plan cards with optional sub-filters (carrier, price, international calls, social data).
 * Also includes a search bar for keyword filtering across plan names and providers.
 */
import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ChevronRight, GraduationCap, Globe2, Wifi, Phone,
  Gamepad2, Infinity as InfinityIcon, Wallet, ArrowRight, Sparkles,
  Search, SlidersHorizontal, X, Scale,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { CARRIERS } from '../data/plans';
import { usePlans } from '../context/PlansContext';
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

// SOOB brand 3-color: prepaid → lime (fresh), postpaid → lavender (signature),
// data-only → coral (premium/different). Replaces the old generic green/purple/orange.
const TYPE_COLORS: Record<string, { active: string; bg: string; ring: string }> = {
  Prepaid:     { active: '#16143A', bg: 'rgba(207, 235, 116, 0.30)', ring: 'rgba(207, 235, 116, 0.55)' },
  Postpaid:    { active: '#16143A', bg: 'rgba(197, 154, 250, 0.25)', ring: 'rgba(197, 154, 250, 0.55)' },
  'Data-only': { active: '#FE7151', bg: 'rgba(254, 113, 81, 0.15)',  ring: 'rgba(254, 113, 81, 0.45)' },
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
        <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-primary md:hidden" />
          <Icon size={18} className="text-primary hidden md:block" />
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

// Persona-driven smart-search prompts. Each prompt has a category-key it
// triggers when the user picks it. The `match` function also runs against
// free-text search input — if any keyword fires, that filter is applied.
type PersonaPrompt = {
  id: string;
  emoji: string;
  en: string;
  ar: string;
  enDesc: string;               // longer description that explains the persona
  arDesc: string;
  category: string;             // matches CATEGORIES[].key
  keywords: string[];           // free-text keywords that trigger this persona
};

const PERSONAS: PersonaPrompt[] = [
  { id: 'student',    emoji: '🎓', en: 'Student on a budget',                category: 'students',
    enDesc: 'Affordable plans under 120 SAR with at least 5 GB of data — perfect for university WiFi backup.',
    ar: 'طالب بميزانية محدودة',
    arDesc: 'باقات اقتصادية أقل من 120 ر.س مع 5 جيجا أو أكثر — مثالية كبديل لواي فاي الجامعة.',
    keywords: ['student', 'school', 'university', 'طالب', 'جامعة'] },

  { id: 'wfh',        emoji: '💻', en: 'Work from home',                     category: 'unlimited',
    enDesc: 'Unlimited or high-data plans so video calls, downloads, and cloud apps never stutter.',
    ar: 'العمل من المنزل',
    arDesc: 'باقات لا محدودة أو ببيانات عالية لاجتماعات الفيديو والتطبيقات السحابية بدون انقطاع.',
    keywords: ['work', 'home', 'office', 'unlimited', 'wfh', 'remote', 'بيانات', 'منزل', 'مكتب'] },

  { id: 'expat',      emoji: '🌍', en: 'I call abroad often',                category: 'expats',
    enDesc: 'Plans with international minutes or roaming bundles to stay in touch with family overseas.',
    ar: 'أتصل دولياً كثيراً',
    arDesc: 'باقات تشمل دقائق دولية أو تجوال للتواصل مع الأهل في الخارج.',
    keywords: ['international', 'abroad', 'overseas', 'expat', 'roam', 'دولية', 'الخارج', 'تجوال'] },

  { id: 'gamer',      emoji: '🎮', en: 'Gamer needing 5G',                   category: 'gamers',
    enDesc: '5G-ready plans with 50+ GB so latency stays low and data lasts a full session.',
    ar: 'لاعب يحتاج 5G',
    arDesc: 'باقات تدعم 5G مع 50 جيجا أو أكثر لمستوى تأخير منخفض وبيانات تكفي جلسة كاملة.',
    keywords: ['gamer', 'gaming', 'game', '5g', 'fast', 'ألعاب', 'سرعة'] },

  { id: 'social',     emoji: '📱', en: 'Heavy social media user',            category: 'unlimited',
    enDesc: 'Unlimited data so streaming TikTok, Instagram, and Snapchat all day never throttles.',
    ar: 'مستخدم نشط للسوشل ميديا',
    arDesc: 'بيانات لا محدودة لمشاهدة تيك توك وانستقرام وسناب طوال اليوم بدون توقّف.',
    keywords: ['social', 'instagram', 'tiktok', 'snapchat', 'whatsapp', 'سوشل', 'تواصل'] },

  { id: 'budget',     emoji: '💰', en: 'I want the cheapest plan',           category: 'budget',
    enDesc: 'Plans under 85 SAR — minimum spend, just basics for calls, SMS, and a little data.',
    ar: 'أبحث عن أرخص باقة',
    arDesc: 'باقات أقل من 85 ر.س — أدنى إنفاق للمكالمات والرسائل وقليل من البيانات.',
    keywords: ['budget', 'cheap', 'low cost', 'affordable', 'رخيص', 'اقتصادي', 'اقتصادية'] },

  { id: 'datasim',    emoji: '📲', en: 'Data-only SIM',                      category: 'dataOnly',
    enDesc: 'No calls or SMS — pure data for tablets, hotspots, IoT devices, or a second SIM.',
    ar: 'شريحة بيانات فقط',
    arDesc: 'بدون مكالمات أو رسائل — بيانات فقط للأجهزة اللوحية أو الهوت سبوت أو شريحة ثانية.',
    keywords: ['data-only', 'data only', 'tablet', 'hotspot', 'router', 'بيانات فقط', 'هوت سبوت'] },

  { id: 'callsLot',   emoji: '☎️',  en: 'I make a lot of local calls',        category: 'localCalls',
    enDesc: 'Plans with 500+ local minutes for people who still talk more than they scroll.',
    ar: 'أتصل محلياً كثيراً',
    arDesc: 'باقات تشمل 500 دقيقة محلية أو أكثر لمن يتحدّث أكثر من تصفّحه.',
    keywords: ['call', 'calling', 'minutes', 'mins', 'اتصال', 'مكالمات', 'دقائق'] },
];

export default function ExplorePage() {
  const { t, lang } = useLang();
  const { plans: PLANS_DATA } = usePlans();

  /* ---- filter state ---- */
  const [search, setSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchRect, setSearchRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Recompute the dropdown position any time it opens or the viewport changes.
  useEffect(() => {
    if (!searchFocused) return;
    const recompute = () => {
      const el = searchInputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setSearchRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, true);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
    };
  }, [searchFocused]);
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

  // Free-text `search` is intentionally excluded — it doesn't filter; it's a
  // smart-prompt input that activates a category via applySmartFilter().
  const hasActiveFilters = selectedCarriers.length > 0 || selectedTypes.length > 0 ||
    priceRange[0] > 0 || priceRange[1] < PRICE_MAX ||
    dataFilter !== 'any' || localCallsFilter !== 'any' || intlCallsFilter !== null || socialFilter !== null || fiveGFilter || activeCategory !== null;

  // Smart filter: pick a persona prompt OR run keyword match against free text.
  // Resets prior filters then activates the persona's category so the user
  // sees only matching plans immediately.
  const applySmartFilter = useCallback((text: string, persona?: PersonaPrompt) => {
    const matched = persona ?? PERSONAS.find(p => {
      const lower = text.trim().toLowerCase();
      if (!lower) return false;
      return p.keywords.some(k => lower.includes(k.toLowerCase()));
    });
    // Always reflect the input
    setSearch(persona ? (lang === 'ar' ? persona.ar : persona.en) : text);
    if (matched) {
      // Reset orthogonal filters before applying the persona's category
      setSelectedCarriers([]);
      setSelectedTypes([]);
      setPriceRange([0, PRICE_MAX]);
      setDataFilter('any');
      setLocalCallsFilter('any');
      setIntlCallsFilter(null);
      setSocialFilter(null);
      setFiveGFilter(false);
      setActiveCategory(matched.category);
      trackEvent('smart_search_applied', { persona: matched.id, source: persona ? 'pick' : 'typed' });
    }
    setSearchFocused(false);
  }, [lang]);

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

  /* ---- apply global filters then split into categories ----
   *  Note: free-text `search` is NOT applied here as a name filter on purpose.
   *  The search box is a smart-search prompt — typing populates the dropdown
   *  with persona suggestions; selecting one (or pressing Enter) calls
   *  applySmartFilter() which sets `activeCategory`. We don't narrow by plan
   *  name because that gives confusing results (e.g. typing "plan" matched
   *  every card). Use the carrier chips to filter by carrier name instead. */
  const categoryData = useMemo(() => {
    let base = [...PLANS_DATA];
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

    return CATEGORIES.map((cat) => {
      const plans = base.filter(cat.filter).slice(0, MAX_PLANS_PER_CATEGORY);
      return { ...cat, plans };
    });
  }, [PLANS_DATA, selectedCarriers, selectedTypes, priceRange, dataFilter, localCallsFilter, intlCallsFilter, socialFilter, fiveGFilter, CATEGORIES]);

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
                    ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] ring-1 ring-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)] shadow-sm'
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
              onClick={() => { setDataFilter(opt.key); }}
              className={`rounded-lg text-xs font-semibold
                ${dataFilter === opt.key
                  ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] ring-1 ring-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)] shadow-sm'
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
                  ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] ring-1 ring-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)] shadow-sm'
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
              onClick={() => { const next = intlCallsFilter === opt.key ? null : opt.key; setIntlCallsFilter(next); }}
              className={`rounded-lg text-xs font-semibold
                ${intlCallsFilter === opt.key
                  ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] ring-1 ring-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)] shadow-sm'
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
              onClick={() => { const next = socialFilter === opt.key ? null : opt.key; setSocialFilter(next); }}
              className={`rounded-lg text-xs font-semibold
                ${socialFilter === opt.key
                  ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] ring-1 ring-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)] shadow-sm'
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
          onClick={() => { setFiveGFilter(prev => { trackEvent('filter_applied', { filter: '5g', active: !prev }); return !prev; }); }}
          className={`rounded-lg text-xs font-semibold
            ${fiveGFilter
              ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] ring-1 ring-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)] shadow-sm'
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
      {/* ========= HEADER — compact so plan rows show above the fold ========= */}
      <section className="relative z-10 page-hero overflow-hidden border-b border-border">
        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-3 md:pt-6 md:pb-4">
          <h1 className="font-heading font-normal text-2xl md:text-3xl text-foreground tracking-tight">
            {t('explore.title')}
          </h1>
          <p className="text-foreground/60 mt-1 text-sm md:text-base">
            {t('explore.subtitle')}
          </p>

          {/* Search + mobile filter toggle */}
          <div className="flex items-start gap-3 mt-4">
            <div className="flex-1 min-w-0 relative">
              <div className="relative">
                <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-4 text-foreground/50 z-10" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applySmartFilter(search); }}
                  placeholder={lang === 'ar' ? 'مثل: أنا طالب وأبحث عن باقة اقتصادية…' : "Try: I'm a student looking for a budget plan…"}
                  className="w-full ps-11 pe-4 py-3 h-auto rounded-xl bg-card border-border text-sm text-foreground
                    placeholder:text-foreground/40 focus-visible:ring-primary/30 focus-visible:border-primary shadow-sm"
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
              className="flex lg:hidden items-center justify-center gap-2 px-4 py-3 h-auto rounded-xl bg-card border border-border
                text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-card/90 shadow-sm shrink-0"
            >
              <SlidersHorizontal size={16} />
              {t('browse.filters')}
              {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary" />}
            </Button>
          </div>
          {/* Category chips — full width under search row */}
          <div className="flex gap-1 overflow-x-auto mt-2 pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    const next = activeCategory === cat.key ? null : cat.key;
                    if (next) {
                      trackEvent('category_selected', { category: next });
                    }
                    setActiveCategory(next);
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap
                    transition-all duration-200 shrink-0
                    ${isActive
                      ? 'bg-accent text-accent-foreground shadow-sm'
                      : 'bg-card/40 text-foreground/80 hover:bg-card/70 backdrop-blur-sm'
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
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
                      {t(`explore.${activeCategory}`)}
                      <button onClick={() => setActiveCategory(null)} className="hover:opacity-70"><X size={12} /></button>
                    </Badge>
                  )}
                  {selectedCarriers.map(c => (
                    <Badge key={c} variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
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
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
                      SAR {priceRange[0]}-{priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}
                      <button onClick={() => setPriceRange([0, PRICE_MAX])}><X size={12} /></button>
                    </Badge>
                  )}
                  {dataFilter !== 'any' && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
                      {dataOptions.find(d => d.key === dataFilter)?.label}
                      <button onClick={() => setDataFilter('any')}><X size={12} /></button>
                    </Badge>
                  )}
                  {localCallsFilter !== 'any' && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
                      {localCallsOptions.find(o => o.key === localCallsFilter)?.label}
                      <button onClick={() => setLocalCallsFilter('any')}><X size={12} /></button>
                    </Badge>
                  )}
                  {intlCallsFilter !== null && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
                      {t('explore.needIntl')} {intlCallsFilter === 'yes' ? t('explore.yes') : t('explore.no')}
                      <button onClick={() => setIntlCallsFilter(null)}><X size={12} /></button>
                    </Badge>
                  )}
                  {socialFilter !== null && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
                      {t('explore.needSocial')} {socialFilter === 'yes' ? t('explore.yes') : t('explore.no')}
                      <button onClick={() => setSocialFilter(null)}><X size={12} /></button>
                    </Badge>
                  )}
                  {fiveGFilter && (
                    <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[var(--ob-cta)] text-[var(--ob-cta-text)] border-0 shadow-sm">
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

          {/* ========= FINDER CTA — coral, compact ========= */}
          <Link
            to="/advisor"
            className="mt-8 relative flex items-center gap-4 overflow-hidden rounded-2xl px-5 py-5 md:px-7 md:py-6 group ob-card-elev transition-all hover:shadow-xl hover:-translate-y-0.5"
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
            <div className="relative z-[2] shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md" style={{ background: '#16143A', color: '#FE7151' }}>
              <Sparkles size={20} />
            </div>
            <div className="relative z-[2] flex-1 min-w-0">
              <h3 className="font-heading font-bold text-base md:text-lg text-white leading-tight">
                {t('finderCta.title')}
              </h3>
              <p className="mt-0.5 text-white/85 text-[13px] md:text-sm leading-snug">
                {t('finderCta.subtitle')}
              </p>
            </div>
            <ArrowRight size={18} className="relative z-[2] shrink-0 text-white rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
          </Link>
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
                <Button size="sm" onClick={() => setShowMobileFilters(false)} className="rounded-xl text-[var(--ob-cta-text)] text-sm font-bold bg-[var(--ob-cta)]">
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

      {/* ── Smart-search dropdown (portal so it escapes any overflow:hidden parent) ── */}
      {searchFocused && searchRect && createPortal(
        <div
          className="fixed z-[200] rounded-xl border border-border/60 shadow-xl overflow-hidden backdrop-blur-md"
          style={{
            top: searchRect.top,
            left: searchRect.left,
            width: searchRect.width,
            maxHeight: 'calc(100vh - 180px)',
            background: 'rgba(var(--card-rgb, 255 255 255) / 0.78)',
            backgroundColor: 'color-mix(in srgb, var(--color-card) 78%, transparent)',
          }}
        >
          <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 border-b border-border/40">
            <Sparkles size={11} style={{ color: '#FE7151' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">
              {lang === 'ar' ? 'اختر ما يصفك' : 'Pick what describes you'}
            </span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applySmartFilter('', p)}
                className="w-full flex items-start gap-2.5 px-3 py-2 text-start hover:bg-secondary/40 transition-colors border-b border-border/25 last:border-0"
              >
                <span className="text-[15px] shrink-0 mt-0.5">{p.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-[12.5px] text-foreground leading-tight">
                    {lang === 'ar' ? p.ar : p.en}
                  </div>
                  <div className="text-[10.5px] text-foreground/55 mt-0.5 leading-snug line-clamp-2">
                    {lang === 'ar' ? p.arDesc : p.enDesc}
                  </div>
                </div>
                <ArrowRight size={12} className="shrink-0 mt-1 text-foreground/30 rtl:rotate-180" />
              </button>
            ))}
          </div>
          {search.trim() && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applySmartFilter(search)}
              className="w-full flex items-center gap-2 px-3 py-2 border-t border-border/40 hover:bg-secondary/40 transition-colors"
              style={{ background: 'rgba(254, 113, 81, 0.10)' }}
            >
              <Sparkles size={12} style={{ color: '#FE7151' }} />
              <span className="flex-1 text-[11.5px] text-foreground text-start">
                {lang === 'ar' ? `بحث ذكي: "${search}"` : `Smart-search: "${search}"`}
              </span>
              <ArrowRight size={12} className="shrink-0 text-foreground/40 rtl:rotate-180" />
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
