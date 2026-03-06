import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X,
  ArrowRight, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { PLANS_DATA, CARRIERS, getValueScore } from '../data/plans';
import PlanCard from '../components/PlanCard';
import FinderModal, { useFinderModal } from '../components/FinderModal';
import { trackEvent } from '../lib/analytics';
import WaveLines from '../components/WaveLines';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';

const PLAN_TYPES = ['Prepaid', 'Postpaid', 'Data-only'] as const;
const PLANS_PER_PAGE = 6;

const TYPE_COLORS: Record<string, { active: string; bg: string; ring: string }> = {
  Prepaid:     { active: '#059669', bg: '#10B98118', ring: '#10B98140' },
  Postpaid:    { active: '#9333EA', bg: '#A855F718', ring: '#A855F740' },
  'Data-only': { active: '#D97706', bg: '#F59E0B18', ring: '#F59E0B40' },
};

const SORT_OPTIONS = [
  { key: 'bestValue', label: 'browse.sortBestValue' },
  { key: 'priceLow', label: 'browse.sortPriceLow' },
  { key: 'priceHigh', label: 'browse.sortPriceHigh' },
  { key: 'dataHigh', label: 'browse.sortDataHigh' },
];

const PRICE_MAX = 1000;

function parseData(val: string): number {
  if (!val || val === '-') return 0;
  if (val === 'Unlimited') return Infinity;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export default function PlansPage() {
  const { t } = useLang();
  const { show: showFinderModal, dismiss: dismissFinderModal } = useFinderModal();

  /* ---- filter state ---- */
  const [search, setSearch] = useState('');
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, PRICE_MAX]);
  const [dataFilter, setDataFilter] = useState('any'); // 'any' | '5' | '20' | '50' | 'unlimited'
  const [localCallsFilter, setLocalCallsFilter] = useState('any'); // 'any' | '100' | '300' | '500' | 'unlimited'
  const [intlCallsFilter, setIntlCallsFilter] = useState('any'); // 'any' | 'has'
  const [socialFilter, setSocialFilter] = useState('any'); // 'any' | 'has' | 'unlimited'
  const [sortBy, setSortBy] = useState('bestValue');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const plansGridRef = useRef<HTMLDivElement>(null);

  const toggleCarrier = useCallback((name: string) => {
    setSelectedCarriers(prev => {
      const next = prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name];
      trackEvent('filter_applied', { filter: 'carrier', value: name, active: !prev.includes(name) });
      return next;
    });
  }, []);

  const toggleType = useCallback((type: string) => {
    setSelectedTypes(prev => {
      const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
      trackEvent('filter_applied', { filter: 'type', value: type, active: !prev.includes(type) });
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setSelectedCarriers([]);
    setSelectedTypes([]);
    setPriceRange([0, PRICE_MAX]);
    setDataFilter('any');
    setLocalCallsFilter('any');
    setIntlCallsFilter('any');
    setSocialFilter('any');
    setSortBy('bestValue');
  }, []);

  const hasActiveFilters = search || selectedCarriers.length > 0 || selectedTypes.length > 0 ||
    priceRange[0] > 0 || priceRange[1] < PRICE_MAX || dataFilter !== 'any' ||
    localCallsFilter !== 'any' || intlCallsFilter !== 'any' || socialFilter !== 'any';

  /* ---- filter + sort logic ---- */
  const filteredPlans = useMemo(() => {
    let plans = [...PLANS_DATA];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      plans = plans.filter(p =>
        p.planName.toLowerCase().includes(q) ||
        p.provider.toLowerCase().includes(q) ||
        p.planType.toLowerCase().includes(q)
      );
    }

    // Carrier filter
    if (selectedCarriers.length > 0) {
      plans = plans.filter(p => selectedCarriers.includes(p.provider));
    }

    // Type filter
    if (selectedTypes.length > 0) {
      plans = plans.filter(p => selectedTypes.includes(p.planType));
    }

    // Price range
    plans = plans.filter(p => p.priceSAR >= priceRange[0] && p.priceSAR <= priceRange[1]);

    // Data filter
    if (dataFilter !== 'any') {
      if (dataFilter === 'unlimited') {
        plans = plans.filter(p => p.dataGB === 'Unlimited');
      } else {
        const minGB = parseInt(dataFilter);
        plans = plans.filter(p => {
          const gb = parseData(p.dataGB);
          return gb >= minGB;
        });
      }
    }

    // Local calls filter
    if (localCallsFilter !== 'any') {
      if (localCallsFilter === 'unlimited') {
        plans = plans.filter(p => p.localCallMinutes === 'Unlimited');
      } else {
        const minMins = parseInt(localCallsFilter);
        plans = plans.filter(p => {
          const mins = parseData(p.localCallMinutes);
          return mins >= minMins;
        });
      }
    }

    // International calls filter
    if (intlCallsFilter === 'has') {
      plans = plans.filter(p => p.internationalCallMinutes && p.internationalCallMinutes !== '-' && p.internationalCallMinutes !== '');
    }

    // Social media data filter
    if (socialFilter === 'has') {
      plans = plans.filter(p => p.socialMediaData && p.socialMediaData !== '-' && p.socialMediaData !== '' && p.socialMediaData !== '1');
    } else if (socialFilter === 'unlimited') {
      plans = plans.filter(p => p.socialMediaData && (p.socialMediaData === 'Unlimited' || p.socialMediaData.toLowerCase().includes('unlimited')));
    }

    // Sort
    switch (sortBy) {
      case 'bestValue':
        plans.sort((a, b) => getValueScore(b) - getValueScore(a));
        break;
      case 'priceLow':
        plans.sort((a, b) => a.priceSAR - b.priceSAR);
        break;
      case 'priceHigh':
        plans.sort((a, b) => b.priceSAR - a.priceSAR);
        break;
      case 'dataHigh':
        plans.sort((a, b) => parseData(b.dataGB) - parseData(a.dataGB));
        break;
      case 'dataLow':
        plans.sort((a, b) => parseData(a.dataGB) - parseData(b.dataGB));
        break;
      case 'callsHigh':
        plans.sort((a, b) => parseData(b.localCallMinutes) - parseData(a.localCallMinutes));
        break;
      case 'provider':
        plans.sort((a, b) => a.provider.localeCompare(b.provider));
        break;
      case 'name':
        plans.sort((a, b) => a.planName.localeCompare(b.planName));
        break;
      case 'newest':
        plans.sort((a, b) => b.id - a.id);
        break;
    }

    return plans;
  }, [search, selectedCarriers, selectedTypes, priceRange, dataFilter, localCallsFilter, intlCallsFilter, socialFilter, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCarriers, selectedTypes, priceRange, dataFilter, localCallsFilter, intlCallsFilter, socialFilter, sortBy]);

  // Track search queries (debounced)
  useEffect(() => {
    if (!search.trim()) return;
    const timer = setTimeout(() => {
      trackEvent('search_query', { query: search.trim() });
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.ceil(filteredPlans.length / PLANS_PER_PAGE);
  const paginatedPlans = filteredPlans.slice(
    (currentPage - 1) * PLANS_PER_PAGE,
    currentPage * PLANS_PER_PAGE
  );

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
    plansGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const activeSort = SORT_OPTIONS.find(s => s.key === sortBy) ?? SORT_OPTIONS[0];

  /* ---- data filter options ---- */
  const dataOptions = [
    { key: 'any', label: t('browse.anyData') },
    { key: '5', label: '5+ GB' },
    { key: '20', label: '20+ GB' },
    { key: '50', label: '50+ GB' },
    { key: 'unlimited', label: t('browse.unlimited') },
  ];

  /* ---- local calls filter options ---- */
  const localCallsOptions = [
    { key: 'any', label: t('browse.anyCalls') },
    { key: '100', label: '100+ min' },
    { key: '300', label: '300+ min' },
    { key: '500', label: '500+ min' },
    { key: 'unlimited', label: t('browse.unlimited') },
  ];

  /* ---- international calls filter options ---- */
  const intlCallsOptions = [
    { key: 'any', label: t('browse.anyCalls') },
    { key: 'has', label: t('browse.hasIntl') },
  ];

  /* ---- social media filter options ---- */
  const socialOptions = [
    { key: 'any', label: t('browse.anyData') },
    { key: 'has', label: t('browse.hasSocial') },
    { key: 'unlimited', label: t('browse.unlimitedSocial') },
  ];

  /* ---- shared filter panel content ---- */
  const filterContent = (
    <>
      {/* Carrier filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.allCarriers')}
        </p>
        <div className="flex flex-wrap gap-2">
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
                    ? 'bg-[#1FA9FF] text-white ring-1 ring-[#1FA9FF] hover:bg-[#1FA9FF]/90 shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                <img src={carrier.logo} alt={carrier.name} className="h-4 w-auto object-contain" />
                <span className="text-xs font-semibold">{carrier.name}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Type filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.allTypes')}
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAN_TYPES.map(type => {
            const active = selectedTypes.includes(type);
            const tc = TYPE_COLORS[type];
            return (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                onClick={() => toggleType(type)}
                className={`rounded-xl text-sm font-semibold
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

      {/* Price range — shadcn dual-thumb slider */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.priceRange')}
        </p>
        <div dir="ltr">
          <Slider
            min={0}
            max={PRICE_MAX}
            step={10}
            value={priceRange}
            onValueChange={(value) => setPriceRange(value)}
            className="w-full"
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium">
          <span>SAR {priceRange[0]}</span>
          <span>SAR {priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}</span>
        </div>
      </div>

      {/* Data filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.dataRange')}
        </p>
        <div className="flex flex-wrap gap-2">
          {dataOptions.map(opt => {
            const active = dataFilter === opt.key;
            return (
              <Button
                key={opt.key}
                variant="ghost"
                size="sm"
                onClick={() => setDataFilter(opt.key)}
                className={`rounded-xl text-sm font-semibold
                  ${active
                    ? 'bg-[#1FA9FF] text-white ring-1 ring-[#1FA9FF] hover:bg-[#1FA9FF]/90 shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Local calls filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.localCalls')}
        </p>
        <div className="flex flex-wrap gap-2">
          {localCallsOptions.map(opt => {
            const active = localCallsFilter === opt.key;
            return (
              <Button
                key={opt.key}
                variant="ghost"
                size="sm"
                onClick={() => setLocalCallsFilter(opt.key)}
                className={`rounded-xl text-sm font-semibold
                  ${active
                    ? 'bg-[#1FA9FF] text-white ring-1 ring-[#1FA9FF] hover:bg-[#1FA9FF]/90 shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* International calls filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.intlCalls')}
        </p>
        <div className="flex flex-wrap gap-2">
          {intlCallsOptions.map(opt => {
            const active = intlCallsFilter === opt.key;
            return (
              <Button
                key={opt.key}
                variant="ghost"
                size="sm"
                onClick={() => setIntlCallsFilter(opt.key)}
                className={`rounded-xl text-sm font-semibold
                  ${active
                    ? 'bg-[#1FA9FF] text-white ring-1 ring-[#1FA9FF] hover:bg-[#1FA9FF]/90 shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Social media data filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          {t('browse.socialMedia')}
        </p>
        <div className="flex flex-wrap gap-2">
          {socialOptions.map(opt => {
            const active = socialFilter === opt.key;
            return (
              <Button
                key={opt.key}
                variant="ghost"
                size="sm"
                onClick={() => setSocialFilter(opt.key)}
                className={`rounded-xl text-sm font-semibold
                  ${active
                    ? 'bg-[#1FA9FF] text-white ring-1 ring-[#1FA9FF] hover:bg-[#1FA9FF]/90 shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>
    </>
  );

  return (
    <div className="safe-pb">

      <FinderModal show={showFinderModal} onDismiss={dismissFinderModal} />

      {/* ========= HEADER ========= */}
      <section className="relative z-10 hero-gradient grain overflow-hidden">
        <WaveLines />
        <div className="absolute top-0 end-0 w-64 h-64 rounded-full bg-white/[0.03] -translate-y-1/3 translate-x-1/3 blob" />
        <div className="absolute bottom-0 start-0 w-40 h-40 rounded-full bg-accent/[0.05] translate-y-1/3 -translate-x-1/3 blob-alt" />

        <div className="relative z-10 max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6 md:pt-12 md:pb-10">
          <h1 className="font-heading font-normal text-3xl md:text-4xl text-white tracking-tight">
            {t('browse.title')}
          </h1>
          <p className="text-white/70 mt-2 text-base md:text-lg">
            {t('browse.subtitle')}
          </p>

          {/* Search + Sort bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-4 text-[#213E53]/50 z-10" />
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('browse.searchPlaceholder')}
                className="w-full ps-11 pe-4 py-3 h-auto rounded-xl bg-white border-white/80 text-sm text-[#213E53]
                  placeholder:text-[#213E53]/40 focus-visible:ring-white/50 focus-visible:border-white shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 -translate-y-1/2 end-3 text-[#213E53]/50 hover:text-[#213E53]/80 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value);
                trackEvent('sort_changed', { sort: value });
              }}
            >
              <SelectTrigger className="rounded-xl bg-white border-white/80 text-sm font-semibold
                text-[#213E53] hover:border-white w-full sm:w-[220px] h-auto py-3 shadow-sm">
                <span className="text-[#213E53]/50 me-1">{t('browse.sortBy')}:</span>
                <SelectValue>{t(activeSort.label)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.key} value={opt.key}>
                    {t(opt.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Mobile filter toggle */}
            <Button
              variant="ghost"
              onClick={() => setShowMobileFilters(true)}
              className="flex lg:hidden items-center justify-center gap-2 px-4 py-3 h-auto rounded-xl bg-white border border-white/80
                text-sm font-semibold text-[#213E53] hover:border-white hover:bg-white/90 shadow-sm"
            >
              <SlidersHorizontal size={16} />
              {t('browse.filters')}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* ========= MAIN CONTENT ========= */}
      <div ref={plansGridRef} className="relative z-20 bg-background rounded-t-3xl">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="flex gap-8">

          {/* ---- DESKTOP SIDEBAR FILTERS ---- */}
          <aside className="hidden lg:block w-[260px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
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
              {filterContent}
            </div>
          </aside>

          {/* ---- PLANS GRID ---- */}
          <div className="flex-1 min-w-0">
            {/* Results count + active filter chips */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground font-medium">
                {t('browse.showing')}{' '}
                <span className="font-bold text-foreground">
                  {filteredPlans.length > 0
                    ? `${(currentPage - 1) * PLANS_PER_PAGE + 1}–${Math.min(currentPage * PLANS_PER_PAGE, filteredPlans.length)}`
                    : '0'}
                </span>{' '}
                {t('browse.of')}{' '}
                <span className="font-bold text-foreground">{filteredPlans.length}</span>{' '}
                {t('browse.plans')}
              </p>
            </div>

            {/* Active filter chips (desktop) */}
            {hasActiveFilters && (
              <div className="hidden md:flex flex-wrap gap-2 mb-5">
                {selectedCarriers.map(c => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="gap-1.5 px-3 py-1.5 bg-[#1FA9FF] text-white border-0 shadow-sm"
                  >
                    {c}
                    <button onClick={() => toggleCarrier(c)} className="hover:opacity-70">
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
                {selectedTypes.map(type => {
                  const tc = TYPE_COLORS[type];
                  return (
                    <Badge
                      key={type}
                      variant="secondary"
                      className="gap-1.5 px-3 py-1.5 border-0"
                      style={{ backgroundColor: tc.bg, color: tc.active }}
                    >
                      {t(`types.${type}`)}
                      <button onClick={() => toggleType(type)} className="hover:opacity-70">
                        <X size={12} />
                      </button>
                    </Badge>
                  );
                })}
                {dataFilter !== 'any' && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 border-0">
                    {dataOptions.find(d => d.key === dataFilter)?.label}
                    <button onClick={() => setDataFilter('any')}>
                      <X size={12} />
                    </button>
                  </Badge>
                )}
                {(priceRange[0] > 0 || priceRange[1] < PRICE_MAX) && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#1FA9FF] text-white border-0 shadow-sm">
                    SAR {priceRange[0]}–{priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}
                    <button onClick={() => setPriceRange([0, PRICE_MAX])}>
                      <X size={12} />
                    </button>
                  </Badge>
                )}
                {localCallsFilter !== 'any' && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 border-0">
                    {localCallsOptions.find(o => o.key === localCallsFilter)?.label}
                    <button onClick={() => setLocalCallsFilter('any')}>
                      <X size={12} />
                    </button>
                  </Badge>
                )}
                {intlCallsFilter !== 'any' && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#1FA9FF] text-white border-0 shadow-sm">
                    {t('browse.hasIntl')}
                    <button onClick={() => setIntlCallsFilter('any')}>
                      <X size={12} />
                    </button>
                  </Badge>
                )}
                {socialFilter !== 'any' && (
                  <Badge variant="secondary" className="gap-1.5 px-3 py-1.5 bg-[#1FA9FF] text-white border-0 shadow-sm">
                    {socialOptions.find(o => o.key === socialFilter)?.label}
                    <button onClick={() => setSocialFilter('any')}>
                      <X size={12} />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {filteredPlans.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10 py-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-11 h-11 rounded-xl text-muted-foreground"
                    >
                      <ChevronLeft size={18} className="rtl:rotate-180" />
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(page => {
                        if (totalPages <= 7) return true;
                        if (page === 1 || page === totalPages) return true;
                        if (Math.abs(page - currentPage) <= 1) return true;
                        return false;
                      })
                      .reduce((acc: (string | number)[], page, i, arr) => {
                        if (i > 0 && page - arr[i - 1] > 1) {
                          acc.push('...');
                        }
                        acc.push(page);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === '...' ? (
                          <span key={`dot-${i}`} className="w-11 h-11 flex items-center justify-center text-muted-foreground text-sm">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={item}
                            variant={currentPage === item ? 'default' : 'ghost'}
                            onClick={() => goToPage(item as number)}
                            className={`w-11 h-11 rounded-xl text-sm font-bold
                              ${currentPage === item
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-muted-foreground'
                              }`}
                          >
                            {item}
                          </Button>
                        )
                      )}

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-11 h-11 rounded-xl text-muted-foreground"
                    >
                      <ChevronRight size={18} className="rtl:rotate-180" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
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
                  onClick={clearFilters}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm
                    hover:bg-primary/20"
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
          <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full bg-accent/[0.06] translate-y-1/3 -translate-x-1/3 blob-alt" />
          <div className="relative z-10">
            <Badge variant="secondary" className="gap-2 px-3 py-1 glass text-white/90 border-0 text-xs font-semibold mb-4">
              <Sparkles size={12} />
              {t('home.just30Seconds')}
            </Badge>
            <h3 className="font-heading font-normal text-2xl md:text-3xl text-white tracking-tight">
              {t('finderCta.title')}
            </h3>
            <p className="text-white/55 mt-2 text-sm max-w-md mx-auto">
              {t('finderCta.subtitle')}
            </p>
            <Button asChild className="mt-6 px-6 py-3 h-auto rounded-xl bg-white text-primary font-bold text-sm hover:bg-white/90 shadow-lg shadow-black/10 glow-primary hover:shadow-xl transition-all duration-300">
              <Link to="/finder">
                {t('finderCta.cta')}
                <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* ========= MOBILE FILTER DRAWER (shadcn Sheet) ========= */}
      <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl p-0 md:hidden">
          <SheetHeader className="sticky top-0 bg-background z-10 px-6 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-heading font-bold text-lg text-foreground">
                {t('browse.filters')}
              </SheetTitle>
              <div className="flex items-center gap-3">
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
                <Button
                  size="sm"
                  onClick={() => setShowMobileFilters(false)}
                  className="rounded-xl text-white text-sm font-bold bg-primary"
                >
                  {t('browse.showResults', { count: String(filteredPlans.length) })}
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
