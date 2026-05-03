/**
 * Vouchers — design variations page (internal review).
 *
 * 4 distinct browsing experiences stacked on one page so the team can
 * pick a direction. Reply with the letter and I'll lock it in.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Gift, Smartphone, Gamepad2, Tv, ShoppingBag, Search, ArrowRight,
  TrendingUp, Sparkles,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SarSymbol from '../components/SarSymbol';

interface Voucher {
  id: string;
  brand: string;
  category: 'recharge' | 'gaming' | 'streaming' | 'shopping';
  denominations: number[];
  popular?: boolean;
  tagline?: string;
}

const MOCK: Voucher[] = [
  { id: 'stc-recharge', brand: 'STC',           category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'mobily-recharge', brand: 'Mobily',     category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'zain-recharge', brand: 'Zain',         category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'apple-store',  brand: 'App Store',     category: 'shopping', denominations: [50, 100, 200, 500], popular: true, tagline: 'iCloud · App Store · iTunes' },
  { id: 'google-play',  brand: 'Google Play',   category: 'shopping', denominations: [50, 100, 200, 500], tagline: 'Apps · games · subscriptions' },
  { id: 'amazon',       brand: 'Amazon',        category: 'shopping', denominations: [50, 100, 200, 500], tagline: 'Anything on Amazon.sa' },
  { id: 'noon',         brand: 'Noon',          category: 'shopping', denominations: [50, 100, 250], tagline: 'Anything on Noon.com' },
  { id: 'pubg',         brand: 'PUBG Mobile',   category: 'gaming',   denominations: [25, 50, 100, 250], popular: true, tagline: 'UC · Royale Pass · skins' },
  { id: 'fortnite',     brand: 'Fortnite',      category: 'gaming',   denominations: [50, 100, 250], tagline: 'V-Bucks · Battle Pass' },
  { id: 'roblox',       brand: 'Roblox',        category: 'gaming',   denominations: [25, 50, 100], tagline: 'Robux · gamepasses' },
  { id: 'steam',        brand: 'Steam',         category: 'gaming',   denominations: [50, 100, 200, 500], tagline: 'PC games · DLCs' },
  { id: 'shahid',       brand: 'Shahid VIP',    category: 'streaming', denominations: [29, 49, 99], tagline: 'MBC content · live TV' },
  { id: 'netflix',      brand: 'Netflix',       category: 'streaming', denominations: [37, 56, 75], popular: true, tagline: 'Movies · series · originals' },
  { id: 'spotify',      brand: 'Spotify',       category: 'streaming', denominations: [21, 60, 120], tagline: 'Premium music · no ads' },
];

const CAT_META: Record<Voucher['category'], { icon: typeof Gift; en: string; ar: string }> = {
  recharge:  { icon: Smartphone,  en: 'Mobile recharge', ar: 'شحن جوال' },
  gaming:    { icon: Gamepad2,    en: 'Gaming',          ar: 'ألعاب' },
  streaming: { icon: Tv,          en: 'Streaming',       ar: 'بث' },
  shopping:  { icon: ShoppingBag, en: 'Shopping',        ar: 'تسوق' },
};

const CATS: Voucher['category'][] = ['recharge', 'gaming', 'streaming', 'shopping'];

// ───────────────────────────────────────────────────────────────────────────
// Reusable brand tile (consistent visual element across variants)
// ───────────────────────────────────────────────────────────────────────────
function BrandTile({ v, large = false }: { v: Voucher; large?: boolean }) {
  // Soft pastel palette that all maps to the SOOB brand family
  const tints: Record<Voucher['category'], string> = {
    recharge:  '#DCCFFF',
    gaming:    '#C9B4FF',
    streaming: '#C59AFA',
    shopping:  '#E5DCFF',
  };
  return (
    <div
      className="aspect-[16/10] w-full rounded-xl flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: tints[v.category] }}
    >
      <div
        className="absolute top-0 bottom-0 right-0 pointer-events-none"
        style={{
          width: '50%',
          backgroundImage: 'url(/patterns/wave-purple-medium.png)',
          backgroundSize: 'auto 130%',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.25,
        }}
      />
      <span
        className={`relative z-10 font-heading font-bold text-[#16143A] text-center px-2 ${
          large ? 'text-base md:text-lg' : 'text-sm'
        }`}
      >
        {v.brand}
      </span>
    </div>
  );
}

export default function VouchersVariations() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<Voucher['category'] | 'all'>('all');
  const [activeAmount, setActiveAmount] = useState<number | null>(null);

  const popular = MOCK.filter(v => v.popular);

  return (
    <div className="safe-pb">
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-tight leading-tight">
            Vouchers — Variants
          </h1>
          <p className="text-foreground/65 mt-1 text-sm md:text-base">
            4 designs. Pick one and I'll lock it in. Reply with the letter.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-12 md:gap-16">

        {/* ============ VARIANT A — Brand grid (refined current) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">A</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Brand grid · category chips · clean &amp; familiar
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6">
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-border" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setActiveCat('all')}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCat === 'all' ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)]' : 'bg-secondary text-foreground/70'
                }`}
              >
                <Gift size={13} /> All
              </button>
              {CATS.map((c) => {
                const Icon = CAT_META[c].icon;
                return (
                  <button
                    key={c}
                    onClick={() => setActiveCat(c)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      activeCat === c ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)]' : 'bg-secondary text-foreground/70'
                    }`}
                  >
                    <Icon size={13} /> {CAT_META[c][isAr ? 'ar' : 'en']}
                  </button>
                );
              })}
            </div>
            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(activeCat === 'all' ? MOCK : MOCK.filter(v => v.category === activeCat)).map((v) => (
                <article key={v.id} className="rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[10px] text-muted-foreground">From</span>
                    <SarSymbol className="text-[9px] text-muted-foreground" />
                    <span className="font-bold text-sm text-foreground tabular-nums">{Math.min(...v.denominations)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ VARIANT B — Category swimlanes (Netflix-style) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">B</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Category swimlanes · horizontal scroll per row · discovery
            </span>
          </div>
          <div className="flex flex-col gap-6">
            {CATS.map((c) => {
              const items = MOCK.filter(v => v.category === c);
              if (items.length === 0) return null;
              const Icon = CAT_META[c].icon;
              return (
                <div key={c}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className="text-foreground/70" />
                    <h3 className="font-heading font-bold text-base text-foreground">
                      {CAT_META[c][isAr ? 'ar' : 'en']}
                    </h3>
                    <span className="text-[11px] text-foreground/50 font-mono uppercase tracking-wider ms-1">
                      {items.length} options
                    </span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6" style={{ scrollbarWidth: 'none' }}>
                    {items.map((v) => (
                      <article key={v.id} className="shrink-0 w-[200px] rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                        <BrandTile v={v} />
                        <h4 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h4>
                        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">{v.tagline}</p>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="text-[10px] text-muted-foreground">From</span>
                          <SarSymbol className="text-[9px] text-muted-foreground" />
                          <span className="font-bold text-sm text-foreground tabular-nums">{Math.min(...v.denominations)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============ VARIANT C — Denomination-first (pick amount, then brand) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">C</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Amount-first · pick the price, see brands · gift-card mental model
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6">
            <div className="text-center mb-4">
              <p className="text-foreground/70 text-sm">
                {isAr ? 'كم تريد أن تنفق؟' : 'How much are you looking to spend?'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mb-5">
              {[null, 25, 50, 100, 200, 500].map((amt) => (
                <button
                  key={amt ?? 'any'}
                  onClick={() => setActiveAmount(amt)}
                  className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    activeAmount === amt
                      ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow-sm'
                      : 'bg-secondary text-foreground/70 hover:bg-secondary/80'
                  }`}
                >
                  {amt === null
                    ? (isAr ? 'أي مبلغ' : 'Any')
                    : <><SarSymbol className="text-[10px]" /> {amt}</>
                  }
                </button>
              ))}
            </div>
            <p className="text-center text-[11px] text-muted-foreground mb-4">
              {activeAmount
                ? (isAr ? `قسائم متاحة بـ ${activeAmount} ر.س` : `Vouchers available at ${activeAmount} SAR`)
                : (isAr ? 'كل القسائم' : 'All vouchers')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MOCK.filter(v => activeAmount === null || v.denominations.includes(activeAmount)).map((v) => (
                <article key={v.id} className="rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                  <p className="text-[10px] text-foreground/50 mt-0.5 truncate">{CAT_META[v.category][isAr ? 'ar' : 'en']}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ VARIANT D — Editorial / Featured hero ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">D</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Editorial · big featured hero · curated discovery
            </span>
          </div>
          <div className="flex flex-col gap-5">
            {/* Search bar */}
            <div className="relative">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isAr ? 'ابحث عن قسيمة' : 'Search vouchers'}
                className="pl-9 bg-card"
              />
            </div>

            {/* Featured hero — top popular voucher */}
            <Link
              to="#"
              className="group relative flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden rounded-2xl ob-card-elev hover:shadow-xl transition-all min-h-[180px] p-5 md:p-6"
              style={{ backgroundColor: '#C59AFA' }}
            >
              <div
                className="absolute top-0 bottom-0 right-0 pointer-events-none"
                style={{ width: '55%', backgroundImage: 'url(/patterns/wave-purple-medium.png)', backgroundSize: 'auto 130%', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat', opacity: 0.32 }}
              />
              <div className="relative z-10 flex-1 flex flex-col justify-between">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#16143A] text-[#CFEB74] text-[10px] font-bold uppercase tracking-wider w-fit">
                  <Sparkles size={11} /> {isAr ? 'الأكثر شعبية هذا الأسبوع' : 'Most popular this week'}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-2xl md:text-3xl text-[#16143A] leading-tight">
                    {popular[0]?.brand}
                  </h3>
                  <p className="text-[#16143A]/75 text-sm mt-1.5">{popular[0]?.tagline}</p>
                  <div className="mt-3 inline-flex items-center gap-2 text-[#16143A] font-bold text-sm">
                    <span>From SAR {Math.min(...(popular[0]?.denominations ?? [50]))}</span>
                    <ArrowRight size={14} className="rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Trending row */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-foreground/70" />
                <h3 className="font-heading font-bold text-base text-foreground">
                  {isAr ? 'رائج الآن' : 'Trending now'}
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {popular.map((v) => (
                  <article key={v.id} className="rounded-2xl bg-card border border-border ob-card-elev p-3">
                    <BrandTile v={v} />
                    <h4 className="font-bold text-[13px] text-foreground mt-2">{v.brand}</h4>
                    <p className="text-[10px] text-foreground/50 mt-0.5">{v.tagline}</p>
                  </article>
                ))}
              </div>
            </div>

            {/* Browse by category */}
            <div>
              <h3 className="font-heading font-bold text-base text-foreground mb-3">
                {isAr ? 'تصفح حسب الفئة' : 'Browse by category'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CATS.map(c => {
                  const Icon = CAT_META[c].icon;
                  const count = MOCK.filter(v => v.category === c).length;
                  return (
                    <Link key={c} to="#" className="group flex items-center gap-3 rounded-xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                      <div className="w-10 h-10 rounded-lg bg-[#C59AFA]/15 flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-[#16143A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[13px] text-foreground leading-tight truncate">{CAT_META[c][isAr ? 'ar' : 'en']}</h4>
                        <p className="text-[10px] text-foreground/55">{count} {isAr ? 'علامة' : 'brands'}</p>
                      </div>
                      <ArrowRight size={14} className="text-foreground/40 rtl:rotate-180" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════
             RECOMMENDED HYBRIDS (E, F, G) — A as base, with the best parts
             of D and B mixed in. These are the 3 designs I'd actually ship.
             ════════════════════════════════════════════════════════════ */}
        <div className="border-t-2 border-[var(--ob-cta)] pt-8 mt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] text-[11px] font-bold uppercase tracking-wider mb-2">
            <Sparkles size={12} /> Recommended hybrids
          </div>
          <p className="text-foreground/65 text-sm">
            A as the base, plus the best ideas from B / D layered on. These are the three I'd ship.
          </p>
        </div>

        {/* ============ HYBRID E — Smart Grid (A + search + 🔥 popular) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">E</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Smart grid · search + chips + 🔥 popular badges · my pick
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6">
            <div className="relative mb-4">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
              <Input
                placeholder={isAr ? 'ابحث عن قسيمة (PUBG، Apple، Steam...)' : 'Search vouchers (PUBG, Apple, Steam…)'}
                className="pl-9 bg-background"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-3 mb-4 border-b border-border" style={{ scrollbarWidth: 'none' }}>
              <button className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ob-cta)] text-[var(--ob-cta-text)]">
                <Gift size={13} /> All <span className="opacity-60">{MOCK.length}</span>
              </button>
              {CATS.map(c => {
                const Icon = CAT_META[c].icon;
                const cnt = MOCK.filter(v => v.category === c).length;
                return (
                  <button key={c} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-foreground/70">
                    <Icon size={13} /> {CAT_META[c][isAr ? 'ar' : 'en']} <span className="opacity-60">{cnt}</span>
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MOCK.map(v => (
                <article key={v.id} className="relative rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                  {v.popular && (
                    <span className="absolute -top-1.5 -end-1.5 z-10 inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#16143A] text-[#CFEB74] text-[10px] shadow-sm">
                      🔥
                    </span>
                  )}
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                  <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">{v.tagline}</p>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[10px] text-muted-foreground">From</span>
                    <SarSymbol className="text-[9px] text-muted-foreground" />
                    <span className="font-bold text-sm text-foreground tabular-nums">{Math.min(...v.denominations)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ HYBRID F — Featured + Grid (D's hero + A's grid) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">F</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Featured hero + grid · curated weekly pick on top, fast browse below
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6 flex flex-col gap-4">
            <div className="relative">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
              <Input
                placeholder={isAr ? 'ابحث عن قسيمة' : 'Search vouchers'}
                className="pl-9 bg-background"
              />
            </div>
            {/* Featured hero card */}
            <Link
              to="#"
              className="group relative flex items-center gap-4 md:gap-6 overflow-hidden rounded-2xl ob-card-elev hover:shadow-xl transition-all min-h-[140px] md:min-h-[160px] p-5 md:p-6"
              style={{ backgroundColor: '#C59AFA' }}
            >
              <div
                className="absolute top-0 bottom-0 right-0 pointer-events-none"
                style={{ width: '55%', backgroundImage: 'url(/patterns/wave-purple-medium.png)', backgroundSize: 'auto 130%', backgroundPosition: 'left center', backgroundRepeat: 'no-repeat', opacity: 0.32 }}
              />
              <div className="relative z-10 flex-1">
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#16143A] text-[#CFEB74] text-[9.5px] font-bold uppercase tracking-wider mb-2 w-fit">
                  <Sparkles size={10} /> {isAr ? 'اختيار الأسبوع' : 'Pick of the week'}
                </div>
                <h3 className="font-heading font-bold text-xl md:text-2xl text-[#16143A] leading-tight">
                  {popular[0]?.brand}
                </h3>
                <p className="text-[#16143A]/70 text-[12.5px] mt-1">{popular[0]?.tagline}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 text-[#16143A] font-bold text-[13px]">
                  <span>From <SarSymbol className="text-[10px]" /> {Math.min(...(popular[0]?.denominations ?? [50]))}</span>
                  <ArrowRight size={13} className="rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ob-cta)] text-[var(--ob-cta-text)]">
                <Gift size={13} /> All
              </button>
              {CATS.map(c => {
                const Icon = CAT_META[c].icon;
                return (
                  <button key={c} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-foreground/70">
                    <Icon size={13} /> {CAT_META[c][isAr ? 'ar' : 'en']}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MOCK.filter(v => v.id !== popular[0]?.id).map(v => (
                <article key={v.id} className="rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[10px] text-muted-foreground">From</span>
                    <SarSymbol className="text-[9px] text-muted-foreground" />
                    <span className="font-bold text-sm text-foreground tabular-nums">{Math.min(...v.denominations)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============ HYBRID G — Trending lane + Grid (B's swimlane idea, but ONE lane) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">G</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Trending lane (one) + grid · discovery row up top, full grid below
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border p-4 md:p-6 flex flex-col gap-5">
            <div className="relative">
              <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
              <Input
                placeholder={isAr ? 'ابحث عن قسيمة' : 'Search vouchers'}
                className="pl-9 bg-background"
              />
            </div>
            {/* Trending swimlane — one row only */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={15} className="text-[var(--ob-cta)]" />
                <h3 className="font-heading font-bold text-sm text-foreground">
                  {isAr ? 'رائج هذا الأسبوع' : 'Trending this week'}
                </h3>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                {[...popular, ...MOCK.slice(0, 5)].slice(0, 6).map(v => (
                  <article key={`trend-${v.id}`} className="shrink-0 w-[150px] rounded-2xl bg-card border border-border ob-card-elev p-2.5 hover:shadow-md transition-all">
                    <BrandTile v={v} />
                    <h4 className="font-bold text-[12px] text-foreground mt-2 truncate">{v.brand}</h4>
                    <div className="mt-1 flex items-baseline gap-0.5">
                      <span className="text-[9px] text-muted-foreground">From</span>
                      <SarSymbol className="text-[8px] text-muted-foreground" />
                      <span className="font-bold text-[12px] text-foreground tabular-nums">{Math.min(...v.denominations)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 border-t border-border pt-4" style={{ scrollbarWidth: 'none' }}>
              <button className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[var(--ob-cta)] text-[var(--ob-cta-text)]">
                <Gift size={13} /> All {MOCK.length}
              </button>
              {CATS.map(c => {
                const Icon = CAT_META[c].icon;
                return (
                  <button key={c} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary text-foreground/70">
                    <Icon size={13} /> {CAT_META[c][isAr ? 'ar' : 'en']}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {MOCK.map(v => (
                <article key={v.id} className="rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-md transition-all">
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                  <div className="mt-1.5 flex items-baseline gap-1">
                    <span className="text-[10px] text-muted-foreground">From</span>
                    <SarSymbol className="text-[9px] text-muted-foreground" />
                    <span className="font-bold text-sm text-foreground tabular-nums">{Math.min(...v.denominations)}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
