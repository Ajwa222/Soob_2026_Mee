import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, SlidersHorizontal, X, ChevronDown,
  ArrowRight, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { PLANS_DATA, CARRIERS, getValueScore } from '../data/plans';
import PlanCard from '../components/PlanCard';
import FinderModal, { useFinderModal } from '../components/FinderModal';
import { trackEvent } from '../lib/analytics';

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
  const [showSort, setShowSort] = useState(false);
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
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.allCarriers')}
        </p>
        <div className="flex flex-wrap gap-2">
          {CARRIERS.map(carrier => {
            const active = selectedCarriers.includes(carrier.name);
            return (
              <button
                key={carrier.name}
                onClick={() => toggleCarrier(carrier.name)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 btn-press
                  ${active
                    ? 'bg-[#1FA9FF]/10 text-[#1FA9FF] ring-1 ring-[#1FA9FF]/30'
                    : 'bg-surface-alt text-[#213E53]/70 hover:bg-border'
                  }`}
              >
                <img src={carrier.logo} alt={carrier.name} className="h-4 w-auto object-contain" />
                <span className="text-xs font-semibold">{carrier.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Type filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.allTypes')}
        </p>
        <div className="flex flex-wrap gap-2">
          {PLAN_TYPES.map(type => {
            const active = selectedTypes.includes(type);
            const tc = TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 btn-press
                  ${active
                    ? 'ring-1'
                    : 'bg-surface-alt text-[#213E53]/70 hover:bg-border'
                  }`}
                style={active ? { backgroundColor: tc.bg, color: tc.active, '--tw-ring-color': tc.ring } as React.CSSProperties : {}}
              >
                {t(`types.${type}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price range — dual-thumb slider */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.priceRange')}
        </p>
        <div className="relative h-6">
          {/* Track background */}
          <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1.5 rounded-full bg-border" />
          {/* Active track */}
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-primary"
            style={{
              left: `${(priceRange[0] / PRICE_MAX) * 100}%`,
              right: `${100 - (priceRange[1] / PRICE_MAX) * 100}%`,
            }}
          />
          {/* Min thumb */}
          <input
            type="range"
            min={0}
            max={PRICE_MAX}
            step={10}
            value={priceRange[0]}
            onChange={e => {
              const v = parseInt(e.target.value);
              setPriceRange(prev => [Math.min(v, prev[1] - 10), prev[1]]);
            }}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none
              [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
            style={{ zIndex: priceRange[0] > PRICE_MAX - 20 ? 5 : 3 }}
          />
          {/* Max thumb */}
          <input
            type="range"
            min={0}
            max={PRICE_MAX}
            step={10}
            value={priceRange[1]}
            onChange={e => {
              const v = parseInt(e.target.value);
              setPriceRange(prev => [prev[0], Math.max(v, prev[0] + 10)]);
            }}
            className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none
              [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer"
            style={{ zIndex: 4 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-[#213E53]/70 font-medium">
          <span>SAR {priceRange[0]}</span>
          <span>SAR {priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}</span>
        </div>
      </div>

      {/* Data filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.dataRange')}
        </p>
        <div className="flex flex-wrap gap-2">
          {dataOptions.map(opt => {
            const active = dataFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setDataFilter(opt.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 btn-press
                  ${active
                    ? 'bg-[#1FA9FF]/10 text-[#1FA9FF] ring-1 ring-[#1FA9FF]/30'
                    : 'bg-surface-alt text-[#213E53]/70 hover:bg-border'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Local calls filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.localCalls')}
        </p>
        <div className="flex flex-wrap gap-2">
          {localCallsOptions.map(opt => {
            const active = localCallsFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setLocalCallsFilter(opt.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 btn-press
                  ${active
                    ? 'bg-[#1FA9FF]/10 text-[#1FA9FF] ring-1 ring-[#1FA9FF]/30'
                    : 'bg-surface-alt text-[#213E53]/70 hover:bg-border'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* International calls filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.intlCalls')}
        </p>
        <div className="flex flex-wrap gap-2">
          {intlCallsOptions.map(opt => {
            const active = intlCallsFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setIntlCallsFilter(opt.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 btn-press
                  ${active
                    ? 'bg-[#1FA9FF]/10 text-[#1FA9FF] ring-1 ring-[#1FA9FF]/30'
                    : 'bg-surface-alt text-[#213E53]/70 hover:bg-border'
                  }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Social media data filter */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-[#213E53]/70 mb-3">
          {t('browse.socialMedia')}
        </p>
        <div className="flex flex-wrap gap-2">
          {socialOptions.map(opt => {
            const active = socialFilter === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setSocialFilter(opt.key)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 btn-press
                  ${active
                    ? 'bg-[#1FA9FF]/10 text-[#1FA9FF] ring-1 ring-[#1FA9FF]/30'
                    : 'bg-surface-alt text-[#213E53]/70 hover:bg-border'
                  }`}
              >
                {opt.label}
              </button>
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
      <section className="relative z-10">
        <div
          className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6 md:pt-12 md:pb-10"
          style={{ animation: 'fadeUp 0.5s ease-out both' }}
        >
          <h1 className="font-heading font-bold text-3xl md:text-4xl text-white">
            {t('browse.title')}
          </h1>
          <p className="text-white/80 mt-2 text-base md:text-lg">
            {t('browse.subtitle')}
          </p>

          {/* Search + Sort bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={18} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/60" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('browse.searchPlaceholder')}
                className="w-full ps-11 pe-4 py-3 rounded-xl bg-white/15 border border-white/20 text-sm text-white
                  placeholder:text-white/50 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40
                  transition-all backdrop-blur-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 -translate-y-1/2 end-3 text-white/50 hover:text-white/80"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSort(!showSort)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/15 border border-white/20 text-sm font-semibold
                  text-white hover:border-white/40 transition-all backdrop-blur-sm w-full sm:w-auto"
              >
                <span className="text-white/60">{t('browse.sortBy')}:</span>
                <span>{t(activeSort.label)}</span>
                <ChevronDown size={16} className={`text-white/60 transition-transform ${showSort ? 'rotate-180' : ''}`} />
              </button>
              {showSort && (
                <div className="fixed inset-0 z-[70] flex items-end sm:items-start sm:justify-end"
                  onClick={(e) => { if (e.target === e.currentTarget) setShowSort(false); }}>
                  <div className="absolute inset-0 bg-black/40 sm:bg-transparent" />
                  <div className="relative w-full sm:absolute sm:top-full sm:end-0 sm:mt-2 sm:w-72 bg-surface rounded-t-2xl sm:rounded-2xl
                    shadow-2xl border border-border overflow-hidden"
                    style={{ animation: 'springUp 0.25s ease-out both' }}>

                    {/* Title */}
                    <div className="px-5 pt-5 pb-3">
                      <p className="font-heading font-bold text-base text-[#213E53]">
                        {t('browse.sortBy')}
                      </p>
                    </div>

                    {/* Options */}
                    <div className="px-3 pb-2">
                      {SORT_OPTIONS.map(opt => (
                        <button
                          key={opt.key}
                          onClick={() => { setSortBy(opt.key); trackEvent('sort_changed', { sort: opt.key }); setShowSort(false); }}
                          className={`w-full text-start px-4 py-3 text-sm rounded-lg transition-colors mb-0.5
                            ${sortBy === opt.key
                              ? 'text-[#1FA9FF] font-bold bg-[#1FA9FF]/10'
                              : 'text-[#213E53] hover:bg-surface-alt'}`}
                        >
                          {t(opt.label)}
                        </button>
                      ))}
                    </div>

                    {/* Close button */}
                    <div className="px-4 pb-5 pt-2">
                      <button
                        onClick={() => setShowSort(false)}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                          bg-surface-alt text-[#213E53]/70 text-sm font-semibold
                          hover:bg-border/40 active:scale-[0.98] transition-all"
                      >
                        <X size={16} />
                        {t('common.close')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile filter toggle */}
            <button
              onClick={() => setShowMobileFilters(true)}
              className="flex lg:hidden items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/15 border border-white/20
                text-sm font-semibold text-white hover:border-white/40 transition-all backdrop-blur-sm"
            >
              <SlidersHorizontal size={16} />
              {t('browse.filters')}
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-[#1FA9FF]" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* ========= MAIN CONTENT ========= */}
      <div ref={plansGridRef} className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-8">
        <div className="flex gap-8">

          {/* ---- DESKTOP SIDEBAR FILTERS ---- */}
          <aside className="hidden lg:block w-[260px] shrink-0">
            <div className="sticky top-24 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-sm text-[#213E53]">
                  {t('browse.filters')}
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#1FA9FF] hover:text-[#1890e0] transition-colors"
                  >
                    {t('browse.clearFilters')}
                  </button>
                )}
              </div>
              {filterContent}
            </div>
          </aside>

          {/* ---- PLANS GRID ---- */}
          <div className="flex-1 min-w-0">
            {/* Results count + active filter chips */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-[#213E53]/70 font-medium">
                {t('browse.showing')}{' '}
                <span className="font-bold text-[#213E53]">
                  {filteredPlans.length > 0
                    ? `${(currentPage - 1) * PLANS_PER_PAGE + 1}–${Math.min(currentPage * PLANS_PER_PAGE, filteredPlans.length)}`
                    : '0'}
                </span>{' '}
                {t('browse.of')}{' '}
                <span className="font-bold text-[#213E53]">{filteredPlans.length}</span>{' '}
                {t('browse.plans')}
              </p>
            </div>

            {/* Active filter chips (desktop) */}
            {hasActiveFilters && (
              <div className="hidden md:flex flex-wrap gap-2 mb-5">
                {selectedCarriers.map(c => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1FA9FF]/8 text-[#1FA9FF] text-xs font-semibold"
                  >
                    {c}
                    <button onClick={() => toggleCarrier(c)} className="hover:text-[#1890e0]">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {selectedTypes.map(type => {
                  const tc = TYPE_COLORS[type];
                  return (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ backgroundColor: tc.bg, color: tc.active }}
                    >
                      {t(`types.${type}`)}
                      <button onClick={() => toggleType(type)} className="hover:opacity-70">
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
                {dataFilter !== 'any' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
                    {dataOptions.find(d => d.key === dataFilter)?.label}
                    <button onClick={() => setDataFilter('any')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {(priceRange[0] > 0 || priceRange[1] < PRICE_MAX) && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1FA9FF]/8 text-[#1FA9FF] text-xs font-semibold">
                    SAR {priceRange[0]}–{priceRange[1] >= PRICE_MAX ? `${PRICE_MAX}+` : priceRange[1]}
                    <button onClick={() => setPriceRange([0, PRICE_MAX])}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {localCallsFilter !== 'any' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
                    {localCallsOptions.find(o => o.key === localCallsFilter)?.label}
                    <button onClick={() => setLocalCallsFilter('any')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {intlCallsFilter !== 'any' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-xs font-semibold">
                    {t('browse.hasIntl')}
                    <button onClick={() => setIntlCallsFilter('any')}>
                      <X size={12} />
                    </button>
                  </span>
                )}
                {socialFilter !== 'any' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1FA9FF]/8 text-[#1FA9FF] text-xs font-semibold">
                    {socialOptions.find(o => o.key === socialFilter)?.label}
                    <button onClick={() => setSocialFilter('any')}>
                      <X size={12} />
                    </button>
                  </span>
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
                    <button
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-[#213E53]/70
                        hover:bg-surface-alt transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={18} className="rtl:rotate-180" />
                    </button>

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
                          <span key={`dot-${i}`} className="w-11 h-11 flex items-center justify-center text-[#213E53]/50 text-sm">
                            ...
                          </span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => goToPage(item as number)}
                            className={`w-11 h-11 rounded-xl text-sm font-bold transition-all
                              ${currentPage === item
                                ? 'bg-[#1FA9FF] text-white shadow-md shadow-[#1FA9FF]/20'
                                : 'text-[#213E53]/70 hover:bg-surface-alt'
                              }`}
                          >
                            {item}
                          </button>
                        )
                      )}

                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-[#213E53]/70
                        hover:bg-surface-alt transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={18} className="rtl:rotate-180" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Empty state */
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mx-auto mb-4">
                  <Search size={28} className="text-[#213E53]/50" />
                </div>
                <h3 className="font-heading font-bold text-xl text-[#213E53]">
                  {t('browse.noResults')}
                </h3>
                <p className="text-[#213E53]/70 mt-2 text-sm max-w-sm mx-auto">
                  {t('browse.noResultsDesc')}
                </p>
                <button
                  onClick={clearFilters}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-[#1FA9FF]/10 text-[#1FA9FF] font-bold text-sm
                    hover:bg-[#1FA9FF]/20 transition-colors btn-press"
                >
                  {t('browse.clearFilters')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ========= FINDER CTA BANNER ========= */}
        <div className="mt-16 relative overflow-hidden rounded-3xl p-8 md:p-12 text-center"
          style={{
            background: 'linear-gradient(135deg, #1890e0 0%, #1FA9FF 50%, #6dcbca 100%)',
          }}
        >
          <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/3 -translate-x-1/3" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium mb-4">
              <Sparkles size={12} />
              {t('home.just30Seconds')}
            </div>
            <h3 className="font-heading font-bold text-2xl md:text-3xl text-white">
              {t('finderCta.title')}
            </h3>
            <p className="text-white/60 mt-2 text-sm max-w-md mx-auto">
              {t('finderCta.subtitle')}
            </p>
            <Link
              to="/finder"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-white text-[#1FA9FF]
                font-bold text-sm hover:bg-white/95 hover:shadow-lg
                transition-all duration-200 btn-press shadow-md"
            >
              {t('finderCta.cta')}
              <ArrowRight size={16} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
      </div>

      {/* ========= MOBILE FILTER DRAWER ========= */}
      {showMobileFilters && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-50 md:hidden"
            onClick={() => setShowMobileFilters(false)}
            style={{ animation: 'fadeIn 0.2s ease-out both' }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-x-0 bottom-0 z-50 md:hidden bg-surface rounded-t-3xl max-h-[85dvh] overflow-y-auto"
            style={{ animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
          >
            <div className="sticky top-0 bg-surface z-10 px-6 pt-4 pb-3 border-b border-border flex items-center justify-between">
              <h3 className="font-heading font-bold text-lg text-[#213E53]">
                {t('browse.filters')}
              </h3>
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#1FA9FF]"
                  >
                    {t('browse.clearFilters')}
                  </button>
                )}
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-8 h-8 rounded-lg bg-surface-alt flex items-center justify-center"
                >
                  <X size={18} className="text-[#213E53]/70" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {filterContent}
            </div>
            <div className="sticky bottom-0 bg-surface border-t border-border p-4">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 rounded-xl text-white font-bold text-sm btn-press"
                style={{ background: 'linear-gradient(135deg, #6ED7B4, #6DCBCA, #1FA9FF)' }}
              >
                {t('browse.showing')} {filteredPlans.length} {t('browse.plans')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
