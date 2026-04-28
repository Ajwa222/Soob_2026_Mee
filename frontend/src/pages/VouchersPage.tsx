/**
 * Vouchers ("/vouchers") — digital voucher catalog (variant G locked-in).
 *
 * Layout:
 *   - Slim themed hero
 *   - Search bar
 *   - "Trending this week" horizontal scroll row (one swimlane)
 *   - Category filter chips (All / Recharge / Gaming / Streaming / Shopping)
 *   - Grid of brand tiles — NO prices on the tiles
 *   - Click any brand → denomination picker modal opens (10 / 20 / 50 / 100 / 200 SAR)
 *
 * Replace `MOCK_VOUCHERS` with real /api/vouchers data when the catalog wires up.
 */
import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Gift, Smartphone, Gamepad2, Tv, ShoppingBag, Search,
  TrendingUp, Check, Mail, Phone, Zap, Ticket, Copy, CheckCircle2,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import SarSymbol from '../components/SarSymbol';
import { trackEvent } from '../lib/analytics';

interface Voucher {
  id: string;
  brand: string;
  category: 'recharge' | 'gaming' | 'streaming' | 'shopping';
  denominations: number[];
  popular?: boolean;
  tagline?: string;
}

const MOCK_VOUCHERS: Voucher[] = [
  { id: 'stc-recharge',     brand: 'STC',           category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'mobily-recharge',  brand: 'Mobily',        category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'zain-recharge',    brand: 'Zain',          category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'salam-recharge',   brand: 'Salam Mobile',  category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Visitor & resident plans' },
  { id: 'redbull-recharge', brand: 'Red Bull Mobile',category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Youth-focused MVNO' },
  { id: 'virgin-recharge',  brand: 'Virgin Mobile', category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'Mobile credit · all numbers' },
  { id: 'lebara-recharge',  brand: 'Lebara',        category: 'recharge', denominations: [10, 20, 50, 100, 200], tagline: 'International calling MVNO' },

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

const TINTS: Record<Voucher['category'], string> = {
  recharge:  '#DCCFFF',
  gaming:    '#C9B4FF',
  streaming: '#B79EFF',
  shopping:  '#E5DCFF',
};

// ───────────────────────────────────────────────────────────────────────────
// Brand tile — same SOOB lavender + right-side wave treatment everywhere
// ───────────────────────────────────────────────────────────────────────────
function BrandTile({ v }: { v: Voucher }) {
  return (
    <div
      className="aspect-[16/10] w-full rounded-xl flex items-center justify-center relative overflow-hidden"
      style={{ backgroundColor: TINTS[v.category] }}
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
      <span className="relative z-10 font-heading font-bold text-[#16143A] text-center px-2 text-sm md:text-base">
        {v.brand}
      </span>
    </div>
  );
}

type Delivery = 'topup' | 'code';
type ContactKind = 'phone' | 'email';
type FlowStep = 'amount' | 'delivery' | 'contact' | 'otp' | 'pay' | 'success';

function generateCode(): string {
  // 16-digit code formatted XXXX-XXXX-XXXX-XXXX (mock — real codes come from backend).
  const block = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `${block()}-${block()}-${block()}-${block()}`;
}

export default function VouchersPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState<Voucher['category'] | 'all'>('all');

  // ─── Purchase flow state ───
  const [picker, setPicker] = useState<Voucher | null>(null);
  const [step, setStep] = useState<FlowStep>('amount');
  const [pickedAmount, setPickedAmount] = useState<number | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [contactKind, setContactKind] = useState<ContactKind>('phone');
  const [contactValue, setContactValue] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [otpResent, setOtpResent] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const filtered = useMemo(() => {
    let result = MOCK_VOUCHERS;
    if (activeCat !== 'all') result = result.filter(v => v.category === activeCat);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        v => v.brand.toLowerCase().includes(q) || v.tagline?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, activeCat]);

  const trending = useMemo(() => {
    // First all popular vouchers, then fill up to 6 with whatever else is in stock.
    const popular = MOCK_VOUCHERS.filter(v => v.popular);
    const rest = MOCK_VOUCHERS.filter(v => !v.popular);
    return [...popular, ...rest].slice(0, 6);
  }, []);

  const openPicker = (v: Voucher) => {
    setPicker(v);
    setStep('amount');
    setPickedAmount(null);
    setDelivery(null);
    setContactKind('phone');
    setContactValue('');
    setOtp(['', '', '', '']);
    setOtpResent(false);
    setIssuedCode(null);
    setCodeCopied(false);
    trackEvent('voucher_brand_clicked', { brand: v.brand, category: v.category });
  };

  // ─── OTP handlers (4 single-digit inputs with auto-advance + backspace) ───
  const handleOtpChange = (idx: number, val: string) => {
    // Allow only digits, single character
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 3) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 0) return;
    e.preventDefault();
    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    otpRefs.current[Math.min(pasted.length, 3)]?.focus();
  };
  const otpComplete = otp.every((d) => d.length === 1);
  const sendOtp = () => {
    setOtpResent(false);
    setOtp(['', '', '', '']);
    setStep('otp');
    trackEvent('voucher_otp_sent', {
      brand: picker?.brand,
      contact_kind: delivery === 'topup' ? 'phone' : contactKind,
    });
    // Auto-focus first OTP box on next tick
    setTimeout(() => otpRefs.current[0]?.focus(), 0);
  };
  const resendOtp = () => {
    setOtp(['', '', '', '']);
    setOtpResent(true);
    otpRefs.current[0]?.focus();
  };

  const closePicker = () => setPicker(null);

  // Recharge category gets the delivery-method step. Other categories are
  // always 16-digit codes (no top-up option for Netflix / Steam / etc).
  const isRecharge = picker?.category === 'recharge';

  const goToContact = (deliveryChoice: Delivery) => {
    setDelivery(deliveryChoice);
    if (deliveryChoice === 'topup') setContactKind('phone');
    setStep('contact');
  };

  const handlePay = () => {
    trackEvent('voucher_paid', {
      brand: picker?.brand,
      category: picker?.category,
      amount: pickedAmount,
      delivery,
      contact_kind: contactKind,
    });
    // For code-based deliveries, generate a 16-digit code on success.
    if (delivery === 'code' || !isRecharge) {
      setIssuedCode(generateCode());
    }
    setStep('success');
  };

  const copyCode = async () => {
    if (!issuedCode) return;
    try {
      await navigator.clipboard.writeText(issuedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard blocked — silent failure, user can still read the code.
    }
  };

  // Validation for the contact step
  const contactValid = (() => {
    const v = contactValue.trim();
    if (!v) return false;
    if (contactKind === 'phone') return /^[0-9+\s-]{8,}$/.test(v);
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  })();

  return (
    <div className="safe-pb">
      {/* Slim themed hero */}
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-5">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1 text-foreground/60 text-[11px] font-medium hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} className="rtl:rotate-180" />
            {isAr ? 'كل المنتجات' : 'All products'}
          </Link>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-lg bg-card/40 backdrop-blur-md border border-border flex items-center justify-center">
              <Gift size={18} className="text-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg md:text-xl text-foreground tracking-tight leading-tight">
                {isAr ? 'القسائم الرقمية' : 'Digital Vouchers'}
              </h1>
              <p className="text-foreground/55 text-[11px] md:text-xs leading-tight">
                {isAr ? 'رمز فوري · بدون عمولة' : 'Instant code · no fees'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-5 md:pt-6 pb-16 md:pb-24 flex flex-col gap-5">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isAr ? 'ابحث عن قسيمة (PUBG، Apple، Steam...)' : 'Search vouchers (PUBG, Apple, Steam…)'}
            className="pl-9 bg-card"
          />
        </div>

        {/* Trending swimlane */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={15} className="text-foreground/70" />
            <h2 className="font-heading font-bold text-sm md:text-base text-foreground">
              {isAr ? 'رائج هذا الأسبوع' : 'Trending this week'}
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none' }}>
            {trending.map(v => (
              <button
                key={`trend-${v.id}`}
                onClick={() => openPicker(v)}
                className="shrink-0 w-[150px] rounded-2xl bg-card border border-border ob-card-elev p-2.5 hover:shadow-md transition-all text-left"
              >
                <BrandTile v={v} />
                <h3 className="font-bold text-[12.5px] text-foreground mt-2 truncate">{v.brand}</h3>
                <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">
                  {CAT_META[v.category][isAr ? 'ar' : 'en']}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-border pt-4" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setActiveCat('all')}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              activeCat === 'all'
                ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow-sm'
                : 'bg-secondary text-foreground/70 hover:bg-secondary/80'
            }`}
          >
            <Gift size={13} />
            {isAr ? 'الكل' : 'All'}
            <span className="opacity-60">{MOCK_VOUCHERS.length}</span>
          </button>
          {CATS.map(c => {
            const Icon = CAT_META[c].icon;
            const cnt = MOCK_VOUCHERS.filter(v => v.category === c).length;
            return (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeCat === c
                    ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow-sm'
                    : 'bg-secondary text-foreground/70 hover:bg-secondary/80'
                }`}
              >
                <Icon size={13} />
                {CAT_META[c][isAr ? 'ar' : 'en']}
                <span className="opacity-60">{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* When "All" is selected → Netflix-style category swimlanes.
         * When a specific category or search is active → focused grid. */}
        {activeCat === 'all' && !search.trim() ? (
          <div className="flex flex-col gap-6 md:gap-8 mt-1">
            {CATS.map((c) => {
              const items = MOCK_VOUCHERS.filter(v => v.category === c);
              if (items.length === 0) return null;
              const Icon = CAT_META[c].icon;
              return (
                <div key={c}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={16} className="text-foreground/70" />
                    <h2 className="font-heading font-bold text-sm md:text-base text-foreground">
                      {CAT_META[c][isAr ? 'ar' : 'en']}
                    </h2>
                    <span className="text-[10.5px] font-mono uppercase tracking-wider text-foreground/50 ms-1">
                      {items.length} {isAr ? 'علامة' : 'brands'}
                    </span>
                    <button
                      onClick={() => setActiveCat(c)}
                      className="ms-auto text-[11px] font-semibold text-foreground/60 hover:text-foreground transition-colors"
                    >
                      {isAr ? 'عرض الكل' : 'See all'} →
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8" style={{ scrollbarWidth: 'none' }}>
                    {items.map(v => (
                      <button
                        key={`${c}-${v.id}`}
                        onClick={() => openPicker(v)}
                        className="shrink-0 w-[150px] md:w-[170px] rounded-2xl bg-card border border-border ob-card-elev p-2.5 md:p-3 hover:shadow-md transition-all text-left"
                      >
                        <BrandTile v={v} />
                        <h3 className="font-bold text-[12.5px] md:text-[13px] text-foreground mt-2 truncate">{v.brand}</h3>
                        <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">{v.tagline}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {filtered.map(v => (
                <button
                  key={v.id}
                  onClick={() => openPicker(v)}
                  className="flex flex-col rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-lg transition-all text-left"
                >
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                  <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">{v.tagline}</p>
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="rounded-xl bg-card border border-border p-8 text-center">
                <p className="text-foreground/60 text-sm">
                  {isAr ? 'لا توجد نتائج. جرّب كلمة أخرى.' : 'No matches. Try a different search.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========= MULTI-STEP PURCHASE MODAL ========= */}
      <Dialog open={!!picker} onOpenChange={(open) => !open && closePicker()}>
        <DialogContent className="max-w-md">
          {picker && (
            <>
              {/* Brand header — always visible at the top */}
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: TINTS[picker.category] }}
                  >
                    {(() => {
                      const Icon = CAT_META[picker.category].icon;
                      return <Icon size={20} className="text-[#16143A]" />;
                    })()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="font-heading font-bold text-lg leading-tight">
                      {picker.brand}
                    </DialogTitle>
                    <DialogDescription className="text-[12px] mt-0.5">
                      {picker.tagline}
                    </DialogDescription>
                  </div>
                  {pickedAmount !== null && step !== 'amount' && (
                    <span className="shrink-0 inline-flex items-baseline gap-0.5 px-2.5 py-1 rounded-full bg-secondary text-foreground text-[12px] font-bold">
                      <SarSymbol className="text-[10px]" /> {pickedAmount}
                    </span>
                  )}
                </div>
              </DialogHeader>

              {/* ── STEP 1: pick amount ── */}
              {step === 'amount' && (
                <div className="mt-2">
                  <p className="text-[12px] text-foreground/60 mb-3 font-medium">
                    {isAr ? 'اختر القيمة:' : 'Pick an amount:'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {picker.denominations.map((amt) => {
                      const selected = pickedAmount === amt;
                      return (
                        <button
                          key={amt}
                          onClick={() => setPickedAmount(amt)}
                          className={`relative flex flex-col items-center justify-center py-4 rounded-xl border-2 transition-all ${
                            selected
                              ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10'
                              : 'border-border bg-card hover:border-[var(--ob-cta)]/40'
                          }`}
                        >
                          {selected && (
                            <span className="absolute top-1.5 end-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)]">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                          <span className="flex items-baseline gap-0.5">
                            <SarSymbol className="text-[10px] text-muted-foreground" />
                            <span className="font-heading font-bold text-xl text-foreground tabular-nums">
                              {amt}
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider font-mono">
                            {isAr ? 'ر.س' : 'SAR'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    size="lg"
                    disabled={pickedAmount === null}
                    onClick={() => {
                      trackEvent('voucher_amount_selected', {
                        brand: picker.brand,
                        category: picker.category,
                        amount: pickedAmount,
                      });
                      // Recharge → pick delivery method. Others → straight to contact (always code).
                      setStep(isRecharge ? 'delivery' : 'contact');
                      if (!isRecharge) setDelivery('code');
                    }}
                    className="w-full mt-5 font-bold text-[14px]"
                  >
                    {pickedAmount === null
                      ? (isAr ? 'اختر قيمة' : 'Pick an amount')
                      : (isAr ? 'متابعة' : 'Continue')}
                  </Button>
                </div>
              )}

              {/* ── STEP 2: delivery method (recharge only) ── */}
              {step === 'delivery' && (
                <div className="mt-2">
                  <button
                    onClick={() => setStep('amount')}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {isAr ? 'رجوع' : 'Back'}
                  </button>
                  <p className="text-[12px] text-foreground/60 mb-3 font-medium">
                    {isAr ? 'كيف تريد الاستلام؟' : 'How do you want it delivered?'}
                  </p>
                  <div className="flex flex-col gap-2.5">
                    <button
                      onClick={() => goToContact('topup')}
                      className="group flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)] hover:bg-[var(--ob-cta)]/5 p-4 text-left transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#B79EFF] flex items-center justify-center shrink-0">
                        <Zap size={20} className="text-[#16143A]" strokeWidth={2.4} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground leading-tight">
                          {isAr ? 'شحن مباشر للجوال' : 'Direct top-up'}
                        </h3>
                        <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                          {isAr
                            ? 'يُضاف الرصيد لرقمك مباشرة بعد الدفع.'
                            : 'Added to your number instantly after payment.'}
                        </p>
                      </div>
                      <span className="text-foreground/40 text-lg rtl:rotate-180">→</span>
                    </button>
                    <button
                      onClick={() => goToContact('code')}
                      className="group flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)] hover:bg-[var(--ob-cta)]/5 p-4 text-left transition-all"
                    >
                      <div className="w-11 h-11 rounded-xl bg-[#DCCFFF] flex items-center justify-center shrink-0">
                        <Ticket size={20} className="text-[#16143A]" strokeWidth={2.2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-foreground leading-tight">
                          {isAr ? 'رمز 16 رقماً' : '16-digit code'}
                        </h3>
                        <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                          {isAr
                            ? 'استلم رمزاً لاستخدامه أو إهدائه لأي شخص.'
                            : 'Get a code to redeem yourself or share with anyone.'}
                        </p>
                      </div>
                      <span className="text-foreground/40 text-lg rtl:rotate-180">→</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: enter contact ── */}
              {step === 'contact' && (
                <div className="mt-2">
                  <button
                    onClick={() => setStep(isRecharge ? 'delivery' : 'amount')}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {isAr ? 'رجوع' : 'Back'}
                  </button>

                  {delivery === 'topup' ? (
                    <>
                      <p className="text-[12px] text-foreground/60 mb-3 font-medium">
                        {isAr ? 'رقم الجوال المراد شحنه:' : 'Mobile number to top up:'}
                      </p>
                      <div className="relative">
                        <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                        <Input
                          type="tel"
                          inputMode="numeric"
                          autoFocus
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                          placeholder="05xxxxxxxx"
                          className="pl-9 bg-card font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-foreground/55 mt-2 leading-snug">
                        {isAr
                          ? `سيتم إضافة الرصيد على هذا الرقم خلال ثوانٍ.`
                          : 'Credit lands on this number within seconds.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[12px] text-foreground/60 mb-3 font-medium">
                        {isAr ? 'إلى أين نرسل الرمز؟' : 'Where should we send the code?'}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          onClick={() => { setContactKind('email'); setContactValue(''); }}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
                            contactKind === 'email'
                              ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground'
                              : 'border-border bg-card text-foreground/65'
                          }`}
                        >
                          <Mail size={13} /> {isAr ? 'بريد إلكتروني' : 'Email'}
                        </button>
                        <button
                          onClick={() => { setContactKind('phone'); setContactValue(''); }}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
                            contactKind === 'phone'
                              ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground'
                              : 'border-border bg-card text-foreground/65'
                          }`}
                        >
                          <Phone size={13} /> {isAr ? 'رسالة نصية' : 'SMS'}
                        </button>
                      </div>
                      <div className="relative">
                        {contactKind === 'email' ? (
                          <Mail size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                        ) : (
                          <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                        )}
                        <Input
                          type={contactKind === 'email' ? 'email' : 'tel'}
                          inputMode={contactKind === 'email' ? 'email' : 'numeric'}
                          autoFocus
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                          placeholder={contactKind === 'email' ? 'you@example.com' : '05xxxxxxxx'}
                          className={`pl-9 bg-card ${contactKind === 'phone' ? 'font-mono' : ''}`}
                        />
                      </div>
                      <p className="text-[11px] text-foreground/55 mt-2 leading-snug">
                        {isAr
                          ? 'سنرسل الرمز فور إتمام الدفع.'
                          : "We'll send the code as soon as your payment goes through."}
                      </p>
                    </>
                  )}

                  <Button
                    size="lg"
                    disabled={!contactValid}
                    onClick={sendOtp}
                    className="w-full mt-4 font-bold text-[14px]"
                  >
                    {isAr ? 'إرسال رمز التحقق' : 'Send verification code'}
                  </Button>
                </div>
              )}

              {/* ── STEP 4: OTP verification ── */}
              {step === 'otp' && (
                <div className="mt-2 text-center">
                  <button
                    onClick={() => setStep('contact')}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3 self-start"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {isAr ? 'رجوع' : 'Back'}
                  </button>

                  <h3 className="font-heading font-bold text-base text-foreground">
                    {isAr ? 'أدخل رمز التحقق' : 'Enter the verification code'}
                  </h3>
                  <p className="text-[12px] text-foreground/65 mt-1.5 leading-snug">
                    {isAr
                      ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span className="font-mono text-foreground">{contactValue}</span></>
                      : <>We sent a 4-digit code to <span className="font-mono text-foreground">{contactValue}</span></>}
                  </p>

                  <div className="flex justify-center gap-2 mt-5" dir="ltr">
                    {[0, 1, 2, 3].map((i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={otp[i]}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        className={`w-12 h-14 md:w-14 md:h-16 rounded-xl border-2 bg-card text-center font-heading font-bold text-2xl text-foreground tabular-nums focus:outline-none transition-colors ${
                          otp[i]
                            ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/5'
                            : 'border-border focus:border-[var(--ob-cta)]'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px]">
                    <span className="text-foreground/55">
                      {isAr ? 'لم يصلك الرمز؟' : "Didn't get the code?"}
                    </span>
                    <button
                      onClick={resendOtp}
                      className="font-semibold text-foreground hover:opacity-80 underline underline-offset-4"
                    >
                      {isAr ? 'أعد الإرسال' : 'Resend'}
                    </button>
                  </div>
                  {otpResent && (
                    <p className="text-[10.5px] text-green-600 mt-1.5">
                      ✓ {isAr ? 'أُرسل رمز جديد' : 'New code sent'}
                    </p>
                  )}

                  <Button
                    size="lg"
                    disabled={!otpComplete}
                    onClick={() => {
                      trackEvent('voucher_otp_verified', { brand: picker?.brand });
                      setStep('pay');
                    }}
                    className="w-full mt-5 font-bold text-[14px]"
                  >
                    {isAr ? 'تحقق وتابع' : 'Verify and continue'}
                  </Button>
                </div>
              )}

              {/* ── STEP 5: payment ── */}
              {step === 'pay' && (
                <div className="mt-2">
                  <button
                    onClick={() => setStep('otp')}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {isAr ? 'رجوع' : 'Back'}
                  </button>

                  {/* Order summary */}
                  <div className="rounded-xl bg-secondary/50 border border-border p-4 mb-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[11px] text-foreground/60 uppercase tracking-wider font-mono">
                        {isAr ? 'ملخص الطلب' : 'Order summary'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-foreground/75">{picker.brand}</span>
                      <span className="font-bold text-foreground">
                        <SarSymbol className="text-[11px] text-muted-foreground" /> {pickedAmount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[12px] mt-1">
                      <span className="text-foreground/60">
                        {delivery === 'topup'
                          ? (isAr ? 'شحن مباشر إلى' : 'Direct top-up to')
                          : (isAr ? 'إرسال الرمز إلى' : 'Code sent to')}
                      </span>
                      <span className="font-mono text-foreground/80 truncate ms-2 max-w-[180px]">
                        {contactValue}
                      </span>
                    </div>
                    <div className="border-t border-border mt-3 pt-3 flex justify-between items-baseline">
                      <span className="text-[12px] font-semibold text-foreground/80">
                        {isAr ? 'الإجمالي' : 'Total'}
                      </span>
                      <span className="font-heading font-bold text-xl text-foreground">
                        <SarSymbol className="text-xs text-muted-foreground" /> {pickedAmount}
                      </span>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    onClick={handlePay}
                    className="w-full font-bold text-[14px]"
                  >
                    {isAr ? `ادفع ${pickedAmount} ر.س` : `Pay ${pickedAmount} SAR`}
                  </Button>
                  <p className="text-[10.5px] text-foreground/50 text-center mt-3 leading-snug">
                    {isAr
                      ? 'الدفع آمن · بطاقة، Apple Pay، أو STC Pay'
                      : 'Secure payment · card, Apple Pay, or STC Pay'}
                  </p>
                </div>
              )}

              {/* ── STEP 5: success ── */}
              {step === 'success' && (
                <div className="mt-2 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/15 mb-3">
                    <CheckCircle2 size={28} className="text-green-600" strokeWidth={2.2} />
                  </div>

                  {delivery === 'topup' && isRecharge ? (
                    <>
                      <h3 className="font-heading font-bold text-lg text-foreground">
                        {isAr ? 'تم الشحن بنجاح' : 'Top-up successful'}
                      </h3>
                      <p className="text-[13px] text-foreground/65 mt-2 leading-relaxed">
                        {isAr
                          ? <>تمت إضافة <strong>{pickedAmount} ر.س</strong> إلى الرقم <span className="font-mono">{contactValue}</span> على شبكة {picker.brand}.</>
                          : <>Added <strong>{pickedAmount} SAR</strong> to <span className="font-mono">{contactValue}</span> on {picker.brand}.</>}
                      </p>
                      <p className="text-[11.5px] text-foreground/55 mt-3">
                        {isAr ? 'تأكيد العملية أُرسل بالرسالة النصية.' : 'A confirmation SMS was sent to this number.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-heading font-bold text-lg text-foreground">
                        {isAr ? 'هذا رمزك' : 'Here is your code'}
                      </h3>
                      <p className="text-[12.5px] text-foreground/65 mt-1.5">
                        {picker.brand} · <SarSymbol className="text-[11px]" /> {pickedAmount}
                      </p>

                      <button
                        onClick={copyCode}
                        className="group flex items-center justify-between gap-2 w-full mt-4 px-4 py-3 rounded-xl bg-secondary border-2 border-border hover:border-[var(--ob-cta)] transition-colors text-left"
                      >
                        <span className="font-mono font-bold text-[15px] md:text-base text-foreground tracking-wider tabular-nums truncate">
                          {issuedCode}
                        </span>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-foreground/65 group-hover:text-foreground">
                          {codeCopied
                            ? <><Check size={12} /> {isAr ? 'تم النسخ' : 'Copied'}</>
                            : <><Copy size={12} /> {isAr ? 'نسخ' : 'Copy'}</>}
                        </span>
                      </button>

                      <p className="text-[11.5px] text-foreground/60 mt-3 leading-snug">
                        {contactKind === 'email'
                          ? (isAr
                              ? <>أُرسلت نسخة من الرمز إلى <span className="font-mono text-foreground/80">{contactValue}</span></>
                              : <>A copy was also sent to <span className="font-mono text-foreground/80">{contactValue}</span></>)
                          : (isAr
                              ? <>أُرسلت نسخة من الرمز برسالة نصية إلى <span className="font-mono text-foreground/80">{contactValue}</span></>
                              : <>A copy was also sent via SMS to <span className="font-mono text-foreground/80">{contactValue}</span></>)}
                      </p>
                    </>
                  )}

                  <Button
                    size="lg"
                    onClick={closePicker}
                    className="w-full mt-5 font-bold text-[14px]"
                  >
                    {isAr ? 'تم' : 'Done'}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
