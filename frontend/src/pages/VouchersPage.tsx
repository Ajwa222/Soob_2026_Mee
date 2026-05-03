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
import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Gift, Smartphone, Gamepad2, Tv, ShoppingBag, Search,
  TrendingUp, Check, Mail, Phone, Zap, Ticket, Copy, CheckCircle2,
  Users, X,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
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

// Brand 3-color rotation across voucher categories so each lane reads
// distinct: lavender for comms (recharge), coral for hot/exciting (gaming),
// lime for fresh content (streaming), soft lavender for everyday (shopping).
const TINTS: Record<Voucher['category'], string> = {
  recharge:  '#C59AFA',   // brand lavender
  gaming:    '#FE7151',   // brand coral
  streaming: '#CFEB74',   // brand lime
  shopping:  '#E1CDFC',   // brand lavender light
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
type FlowStep = 'amount' | 'auth' | 'auth-otp' | 'delivery' | 'contact' | 'otp' | 'pay' | 'success';

function generateCode(): string {
  // 16-digit code formatted XXXX-XXXX-XXXX-XXXX (mock — real codes come from backend).
  const block = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `${block()}-${block()}-${block()}-${block()}`;
}

export default function VouchersPage() {
  const { lang } = useLang();
  const { isLoggedIn, loginWithOtp, user } = useAuth();
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
  // Gift flow — when on, the contact step asks for the recipient's contact
  // (instead of the buyer's) and the success screen says it's been sent to them.
  const [isGift, setIsGift] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState('');
  const [giftSenderName, setGiftSenderName] = useState('');
  const [giftMessage, setGiftMessage] = useState('');
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stc-pay' | 'apple-pay' | 'visa' | 'mada' | 'tabby' | 'tamara' | null>(null);

  // Mock contacts. Real native picker (Contact Picker API) is Android-Chrome
  // only and the iOS web app can't see contacts at all — we always show this
  // list in the demo so the UX flow can be reviewed end-to-end.
  const MOCK_CONTACTS: { name: string; phone: string }[] = [
    { name: 'Ahmed Al-Otaibi',     phone: '0501234567' },
    { name: 'Layla Al-Harbi',      phone: '0552223344' },
    { name: 'Khalid Al-Qahtani',   phone: '0539988776' },
    { name: 'Noura Al-Sayed',      phone: '0561112233' },
    { name: 'Yousef Al-Dosari',    phone: '0508776655' },
    { name: 'Sara Al-Ghamdi',      phone: '0544455566' },
    { name: 'Mohammed Al-Subaie',  phone: '0567788990' },
    { name: 'Reem Al-Faisal',      phone: '0501234999' },
  ];

  const pickContact = (c: { name: string; phone: string }) => {
    if (isGift) setGiftRecipientName(c.name);
    setContactKind('phone');
    setContactValue(c.phone);
    setShowContactPicker(false);
    trackEvent('voucher_contact_picked', { source: 'mock_contacts' });
  };

  // Track whether the contact value was auto-filled from the buyer's profile
  // so we can show the small "From your account · tap to edit" hint above the
  // field. Cleared the moment the user actually edits.
  const [contactPrefilled, setContactPrefilled] = useState(false);

  // When a logged-in user reaches the contact step for a 16-digit code purchase
  // for THEMSELVES, pre-fill their phone (or email fallback) from their profile.
  // Gifts always need recipient contact, top-ups always need the target number.
  useEffect(() => {
    if (step !== 'contact') return;
    if (isGift) return;
    if (delivery !== 'code') return;
    if (!isLoggedIn || !user) return;
    if (user.phone && user.phone !== 'skipped') {
      setContactKind('phone');
      setContactValue(user.phone);
      setContactPrefilled(true);
    } else if (user.email) {
      setContactKind('email');
      setContactValue(user.email);
      setContactPrefilled(true);
    }
  }, [step, isGift, delivery, isLoggedIn, user]);

  // ── Auth-gate state (shown when an unlogged-in user clicks Continue) ──
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authKind, setAuthKind] = useState<ContactKind>('phone');
  const [authContact, setAuthContact] = useState('');
  const [authOtp, setAuthOtp] = useState<string[]>(['', '', '', '']);
  const authOtpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [pendingNextStep, setPendingNextStep] = useState<FlowStep | null>(null);

  const authNamesValid = authMode === 'signin' || (authFirstName.trim().length >= 2 && authLastName.trim().length >= 2);
  const authContactValid = authKind === 'phone'
    ? /^[0-9+\s-]{8,}$/.test(authContact.trim())
    : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(authContact.trim());
  const authOtpComplete = authOtp.every(d => d.length === 1);

  const onAuthOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...authOtp]; n[i] = v; setAuthOtp(n);
    if (v && i < 3) authOtpRefs.current[i + 1]?.focus();
  };
  const onAuthOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !authOtp[i] && i > 0) authOtpRefs.current[i - 1]?.focus();
  };
  const onAuthOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!p) return;
    e.preventDefault();
    const n = ['', '', '', '']; for (let i = 0; i < p.length; i++) n[i] = p[i];
    setAuthOtp(n); authOtpRefs.current[Math.min(p.length, 3)]?.focus();
  };
  const verifyAuthAndContinue = async () => {
    try {
      const fullName = authMode === 'signup'
        ? `${authFirstName.trim()} ${authLastName.trim()}`.trim()
        : undefined;
      await loginWithOtp(authKind, authContact.trim(), fullName);
      trackEvent('voucher_auth_completed', { brand: picker?.brand });
      // Clear auth state and continue to whatever step we deferred.
      setAuthOtp(['', '', '', '']);
      setStep(pendingNextStep ?? 'contact');
      setPendingNextStep(null);
    } catch { /* swallow — show error inline if needed */ }
  };

  // Gate that takes the user to `target` only if logged in. Otherwise routes
  // them through the auth form first and remembers `target` for after.
  const requireAuthThen = (target: FlowStep) => {
    if (isLoggedIn) {
      setStep(target);
      return;
    }
    setPendingNextStep(target);
    setStep('auth');
    trackEvent('voucher_auth_gate_opened', { brand: picker?.brand, gate_at: target });
  };

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
    setIsGift(false);
    setGiftRecipientName('');
    // Pre-fill sender name from the logged-in user's profile so they don't
    // have to retype it every gift; field is editable below.
    setGiftSenderName(user?.name ?? '');
    setGiftMessage('');
    setContactPrefilled(false);
    setPaymentMethod(null);
    setAuthMode('signin');
    setAuthFirstName('');
    setAuthLastName('');
    setAuthKind('phone');
    setAuthContact('');
    setAuthOtp(['', '', '', '']);
    setPendingNextStep(null);
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
    // Logged-in users have already verified themselves via the auth gate —
    // skip the OTP step entirely and go straight to payment. OTP only fires
    // for guests (which shouldn't happen post-auth-gate, but kept as a fallback).
    if (isLoggedIn) {
      trackEvent('voucher_otp_skipped', {
        brand: picker?.brand,
        reason: 'logged_in',
      });
      setStep('pay');
      return;
    }
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
    requireAuthThen('contact');
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
              <div
                key={`trend-${v.id}`}
                className="shrink-0 w-[150px] rounded-2xl bg-card border border-border ob-card-elev p-2.5 hover:shadow-md transition-all relative"
              >
                <button onClick={() => openPicker(v)} className="block w-full text-left">
                  <BrandTile v={v} />
                  <h3 className="font-bold text-[12.5px] text-foreground mt-2 truncate">{v.brand}</h3>
                  <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">
                    {CAT_META[v.category][isAr ? 'ar' : 'en']}
                  </p>
                </button>
              </div>
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
                      <div
                        key={`${c}-${v.id}`}
                        className="shrink-0 w-[150px] md:w-[170px] rounded-2xl bg-card border border-border ob-card-elev p-2.5 md:p-3 hover:shadow-md transition-all relative"
                      >
                        <button onClick={() => openPicker(v)} className="block w-full text-left">
                          <BrandTile v={v} />
                          <h3 className="font-bold text-[12.5px] md:text-[13px] text-foreground mt-2 truncate">{v.brand}</h3>
                          <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">{v.tagline}</p>
                        </button>
                              </div>
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
                <div
                  key={v.id}
                  className="flex flex-col rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-lg transition-all relative"
                >
                  <button onClick={() => openPicker(v)} className="flex flex-col text-left">
                    <BrandTile v={v} />
                    <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                    <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">{v.tagline}</p>
                  </button>
                  </div>
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
                  {/* Two clear options up top: buy for self vs gift it to someone */}
                  <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
                    {isAr ? 'لمن هذا؟' : 'Who is it for?'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setIsGift(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all ${
                        !isGift ? '' : 'border-border bg-card hover:border-foreground/30'
                      }`}
                      style={!isGift ? { borderColor: '#16143A', background: 'rgba(197, 154, 250, 0.18)' } : {}}
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: !isGift ? '#C59AFA' : 'rgba(197, 154, 250, 0.20)', color: '#16143A' }}
                      >
                        <ShoppingBag size={17} strokeWidth={2.4} />
                      </span>
                      <span className="font-heading font-bold text-[13px] text-foreground leading-tight">
                        {isAr ? 'لي' : 'Buy for myself'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGift(true)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 transition-all ${
                        isGift ? '' : 'border-border bg-card hover:border-foreground/30'
                      }`}
                      style={isGift ? { borderColor: '#FE7151', background: 'rgba(254, 113, 81, 0.12)' } : {}}
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ background: isGift ? '#FE7151' : 'rgba(254, 113, 81, 0.15)', color: isGift ? '#FFFFFF' : '#FE7151' }}
                      >
                        <Gift size={17} strokeWidth={2.4} />
                      </span>
                      <span className="font-heading font-bold text-[13px] text-foreground leading-tight">
                        {isAr ? 'هدية لشخص' : 'Gift it to someone'}
                      </span>
                    </button>
                  </div>

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
                      // Gift purchases ALWAYS require login first — no recipient
                      // info can be entered until the buyer has a SOOB account.
                      if (isGift) {
                        if (!isRecharge) setDelivery('code');
                        requireAuthThen(isRecharge ? 'delivery' : 'contact');
                        return;
                      }
                      // Self-purchase: recharge picks delivery first (no gate),
                      // others go straight to contact behind the auth gate.
                      if (isRecharge) {
                        setStep('delivery');
                      } else {
                        setDelivery('code');
                        requireAuthThen('contact');
                      }
                    }}
                    className="w-full mt-5 font-bold text-[14px]"
                  >
                    {pickedAmount === null
                      ? (isAr ? 'اختر قيمة' : 'Pick an amount')
                      : (isAr ? 'متابعة' : 'Continue')}
                  </Button>
                </div>
              )}

              {/* ── AUTH GATE — shown before contact/delivery if not signed in ── */}
              {step === 'auth' && (
                <div className="mt-2">
                  <button
                    onClick={() => setStep('amount')}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {isAr ? 'رجوع' : 'Back'}
                  </button>
                  <h3 className="font-heading font-bold text-lg text-foreground mb-1">
                    {authMode === 'signin'
                      ? (isAr ? 'سجّل دخولك للمتابعة' : 'Log in to continue')
                      : (isAr ? 'أنشئ حسابك للمتابعة' : 'Create your account')}
                  </h3>
                  <p className="text-[12px] text-foreground/60 mb-4 leading-snug">
                    {authMode === 'signin'
                      ? (isAr ? 'أكمل الشراء بسرعة بحسابك في صوب.' : 'Finish your purchase faster with your SOOB account.')
                      : (isAr ? 'بضع تفاصيل ثم نُكمل الشراء.' : "A few details and we'll wrap up your purchase.")}
                  </p>

                  {/* Sign-up only: name fields */}
                  {authMode === 'signup' && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                          {isAr ? 'الاسم الأول' : 'First name'}
                        </label>
                        <Input value={authFirstName} onChange={(e) => setAuthFirstName(e.target.value)} placeholder={isAr ? 'محمد' : 'Mohammed'} autoComplete="given-name" className="bg-card" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                          {isAr ? 'اسم العائلة' : 'Last name'}
                        </label>
                        <Input value={authLastName} onChange={(e) => setAuthLastName(e.target.value)} placeholder={isAr ? 'العتيبي' : 'Al-Otaibi'} autoComplete="family-name" className="bg-card" />
                      </div>
                    </div>
                  )}

                  <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                    {authKind === 'phone' ? (isAr ? 'رقم الجوال' : 'Phone number') : (isAr ? 'البريد الإلكتروني' : 'Email')}
                  </label>
                  <div className="relative">
                    {authKind === 'phone'
                      ? <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                      : <Mail size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />}
                    <Input
                      type={authKind === 'email' ? 'email' : 'tel'}
                      inputMode={authKind === 'email' ? 'email' : 'numeric'}
                      value={authContact}
                      onChange={(e) => setAuthContact(e.target.value)}
                      placeholder={authKind === 'email' ? 'you@example.com' : '05xxxxxxxx'}
                      className={`pl-9 bg-card ${authKind === 'phone' ? 'font-mono' : ''}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { setAuthKind(authKind === 'phone' ? 'email' : 'phone'); setAuthContact(''); }}
                    className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-foreground/65 hover:text-foreground"
                  >
                    {authKind === 'phone' ? <Mail size={12} /> : <Phone size={12} />}
                    <span className="underline underline-offset-4">
                      {authKind === 'phone'
                        ? (isAr ? 'أو استخدم البريد الإلكتروني' : 'or use email instead')
                        : (isAr ? 'أو استخدم رقم الجوال' : 'or use phone instead')}
                    </span>
                  </button>

                  <Button
                    size="lg"
                    disabled={!authNamesValid || !authContactValid}
                    onClick={() => {
                      setAuthOtp(['', '', '', '']);
                      setStep('auth-otp');
                      setTimeout(() => authOtpRefs.current[0]?.focus(), 0);
                    }}
                    className="w-full mt-4 font-bold text-[14px]"
                  >
                    {authMode === 'signin'
                      ? (isAr ? 'تسجيل الدخول' : 'Log in')
                      : (isAr ? 'متابعة' : 'Continue')}
                  </Button>
                  <p className="text-center text-[10.5px] text-foreground/55 mt-2 leading-relaxed px-2">
                    {isAr
                      ? 'بالضغط على متابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.'
                      : 'By continuing, you agree to our Terms of Service and Privacy Policy.'}
                  </p>

                  {/* Sign-in / Sign-up toggle */}
                  <p className="text-center text-[12px] text-foreground/65 mt-3">
                    {authMode === 'signin' ? (
                      <>
                        {isAr ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                        <button
                          type="button"
                          onClick={() => setAuthMode('signup')}
                          className="font-bold text-foreground underline underline-offset-4 hover:opacity-80"
                        >
                          {isAr ? 'انضم لصوب' : 'Join SOOB'}
                        </button>
                      </>
                    ) : (
                      <>
                        {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                        <button
                          type="button"
                          onClick={() => setAuthMode('signin')}
                          className="font-bold text-foreground underline underline-offset-4 hover:opacity-80"
                        >
                          {isAr ? 'تسجيل الدخول' : 'Log in'}
                        </button>
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* ── AUTH OTP — verify the buyer's contact to log them in ── */}
              {step === 'auth-otp' && (
                <div className="mt-2 space-y-4">
                  <button
                    onClick={() => setStep('auth')}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {isAr ? 'تعديل التفاصيل' : 'Edit details'}
                  </button>
                  <p className="text-sm text-foreground/75">
                    {isAr
                      ? <>أرسلنا رمزاً إلى <span className="font-mono text-foreground">{authContact}</span></>
                      : <>We sent a 4-digit code to <span className="font-mono text-foreground">{authContact}</span></>}
                  </p>
                  <div className="flex gap-2 justify-center" dir="ltr">
                    {authOtp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { authOtpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => onAuthOtpChange(i, e.target.value)}
                        onKeyDown={(e) => onAuthOtpKey(i, e)}
                        onPaste={i === 0 ? onAuthOtpPaste : undefined}
                        className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-border bg-card focus:border-[var(--ob-cta)] focus:outline-none"
                      />
                    ))}
                  </div>
                  <Button
                    size="lg"
                    disabled={!authOtpComplete}
                    onClick={verifyAuthAndContinue}
                    className="w-full font-bold text-[14px]"
                  >
                    {isAr ? 'تحقق وتابع' : 'Verify & continue'}
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
                      <div className="w-11 h-11 rounded-xl bg-[#C59AFA] flex items-center justify-center shrink-0">
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
                      {isGift && (
                        <>
                          <div className="rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2 border" style={{ background: 'rgba(254, 113, 81, 0.10)', borderColor: 'rgba(254, 113, 81, 0.45)' }}>
                            <Gift size={14} className="shrink-0 mt-0.5" style={{ color: '#FE7151' }} />
                            <p className="text-[11.5px] text-foreground/85 leading-snug">
                              {isAr
                                ? 'سيتم إضافة الرصيد لرقم المستلم وسنرسل له رسالتك.'
                                : "We'll top up the recipient's number and send them your message."}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowContactPicker(true)}
                            className="w-full inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-foreground/20 bg-secondary/30 hover:border-[#FE7151]/50 hover:bg-[#FE7151]/5 transition-colors px-3 py-2.5 mb-3"
                          >
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FE7151', color: '#fff' }}>
                              <Users size={14} strokeWidth={2.5} />
                            </span>
                            <span className="flex-1 text-start">
                              <span className="block font-heading font-bold text-[12.5px] text-foreground leading-tight">
                                {isAr ? 'اختر من جهات الاتصال' : 'Pick from contacts'}
                              </span>
                            </span>
                            <span className="text-foreground/40 rtl:rotate-180">→</span>
                          </button>

                          <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                            {isAr ? 'اسم المستلم' : "Recipient's name"}
                          </label>
                          <Input
                            value={giftRecipientName}
                            onChange={(e) => setGiftRecipientName(e.target.value)}
                            placeholder={isAr ? 'مثل: أحمد' : 'e.g. Ahmed'}
                            autoComplete="name"
                            className="bg-card mb-3"
                          />
                        </>
                      )}

                      {!isGift && (
                        <>
                          <p className="text-[12px] text-foreground/60 mb-3 font-medium">
                            {isAr ? 'رقم الجوال المراد شحنه:' : 'Mobile number to top up:'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowContactPicker(true)}
                            className="w-full inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-foreground/20 bg-secondary/30 hover:border-[#FE7151]/50 hover:bg-[#FE7151]/5 transition-colors px-3 py-2 mb-3"
                          >
                            <Users size={14} style={{ color: '#FE7151' }} />
                            <span className="text-[12px] font-bold text-foreground">
                              {isAr ? 'اختر من جهات الاتصال' : 'Pick from contacts'}
                            </span>
                            <span className="ms-auto text-foreground/40 rtl:rotate-180">→</span>
                          </button>
                        </>
                      )}

                      {isGift && (
                        <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                          {isAr ? 'رقم جوال المستلم' : "Recipient's phone"}
                        </label>
                      )}
                      <div className="relative">
                        <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                        <Input
                          type="tel"
                          inputMode="numeric"
                          autoFocus={!isGift}
                          value={contactValue}
                          onChange={(e) => setContactValue(e.target.value)}
                          placeholder={isGift ? (isAr ? 'جوال المستلم' : "Recipient's phone") : '05xxxxxxxx'}
                          className="pl-9 bg-card font-mono"
                        />
                      </div>
                      {!isGift && (
                        <p className="text-[11px] text-foreground/55 mt-2 leading-snug">
                          {isAr
                            ? `سيتم إضافة الرصيد على هذا الرقم خلال ثوانٍ.`
                            : 'Credit lands on this number within seconds.'}
                        </p>
                      )}

                      {isGift && (
                        <>
                          <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 mt-3 uppercase tracking-wider">
                            {isAr ? 'من (اسمك)' : 'From (your name)'}
                          </label>
                          <Input
                            value={giftSenderName}
                            onChange={(e) => setGiftSenderName(e.target.value)}
                            placeholder={isAr ? 'سيظهر للمستلم' : "Shown to the recipient"}
                            autoComplete="name"
                            className="bg-card"
                          />

                          <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 mt-3 uppercase tracking-wider">
                            {isAr ? 'رسالة شخصية (اختياري)' : 'Personal message (optional)'}
                          </label>
                          <textarea
                            value={giftMessage}
                            onChange={(e) => setGiftMessage(e.target.value.slice(0, 140))}
                            placeholder={isAr ? 'كل عام وأنت بخير 🎉' : 'Happy birthday! 🎉'}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-sm text-foreground resize-none focus:outline-none focus:border-[var(--ob-cta)]"
                          />
                          <p className="text-[10px] text-foreground/45 mt-1 text-end font-mono">{giftMessage.length}/140</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {isGift && (
                        <>
                          <div className="rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2 border" style={{ background: 'rgba(254, 113, 81, 0.10)', borderColor: 'rgba(254, 113, 81, 0.45)' }}>
                            <Gift size={14} className="shrink-0 mt-0.5" style={{ color: '#FE7151' }} />
                            <p className="text-[11.5px] text-foreground/85 leading-snug">
                              {isAr
                                ? 'سنرسل الرمز للمستلم مباشرة. لن يظهر لك الرمز هنا.'
                                : "We'll send the code straight to the recipient. You won't see the code yourself."}
                            </p>
                          </div>

                          {/* Quick-pick from contacts — fills name + phone */}
                          <button
                            type="button"
                            onClick={() => setShowContactPicker(true)}
                            className="w-full inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-foreground/20 bg-secondary/30 hover:border-[#FE7151]/50 hover:bg-[#FE7151]/5 transition-colors px-3 py-2.5 mb-3"
                          >
                            <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#FE7151', color: '#fff' }}>
                              <Users size={14} strokeWidth={2.5} />
                            </span>
                            <span className="flex-1 text-start">
                              <span className="block font-heading font-bold text-[12.5px] text-foreground leading-tight">
                                {isAr ? 'اختر من جهات الاتصال' : 'Pick from contacts'}
                              </span>
                              <span className="block text-[10.5px] text-foreground/55 mt-0.5">
                                {isAr ? 'أسرع طريقة لاختيار شخص' : 'Fastest way to pick someone'}
                              </span>
                            </span>
                            <span className="text-foreground/40 rtl:rotate-180">→</span>
                          </button>

                          <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                            {isAr ? 'اسم المستلم' : "Recipient's name"}
                          </label>
                          <Input
                            value={giftRecipientName}
                            onChange={(e) => setGiftRecipientName(e.target.value)}
                            placeholder={isAr ? 'مثل: أحمد' : 'e.g. Ahmed'}
                            autoComplete="name"
                            className="bg-card mb-3"
                          />
                        </>
                      )}
                      <p className="text-[12px] text-foreground/60 mb-3 font-medium">
                        {isGift
                          ? (isAr ? 'إلى أين نرسل الهدية؟' : "Where should we send the gift?")
                          : (isAr ? 'إلى أين نرسل الرمز؟' : 'Where should we send the code?')}
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                          onClick={() => { setContactKind('email'); setContactValue(user?.email && !isGift ? user.email : ''); setContactPrefilled(!!user?.email && !isGift); }}
                          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
                            contactKind === 'email'
                              ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground'
                              : 'border-border bg-card text-foreground/65'
                          }`}
                        >
                          <Mail size={13} /> {isAr ? 'بريد إلكتروني' : 'Email'}
                        </button>
                        <button
                          onClick={() => { setContactKind('phone'); setContactValue(user?.phone && user.phone !== 'skipped' && !isGift ? user.phone : ''); setContactPrefilled(!!(user?.phone && user.phone !== 'skipped') && !isGift); }}
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
                          onChange={(e) => { setContactValue(e.target.value); setContactPrefilled(false); }}
                          placeholder={
                            contactKind === 'email'
                              ? (isGift ? (isAr ? 'إيميل المستلم' : "Recipient's email") : 'you@example.com')
                              : (isGift ? (isAr ? 'جوال المستلم' : "Recipient's phone") : '05xxxxxxxx')
                          }
                          className={`pl-9 bg-card ${contactKind === 'phone' ? 'font-mono' : ''}`}
                        />
                      </div>
                      {contactPrefilled && !isGift && (
                        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-foreground/65">
                          <CheckCircle2 size={12} className="shrink-0" style={{ color: '#16143A' }} />
                          <span>
                            {isAr ? 'مأخوذ من حسابك. ' : 'From your account. '}
                            <button
                              type="button"
                              onClick={() => { setContactValue(''); setContactPrefilled(false); }}
                              className="underline underline-offset-4 font-semibold text-foreground hover:opacity-80"
                            >
                              {isAr ? 'تعديل' : 'Edit'}
                            </button>
                          </span>
                        </div>
                      )}
                      {isGift && (
                        <>
                          <div className="mt-3">
                            <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                              {isAr ? 'من (اسمك)' : 'From (your name)'}
                            </label>
                            <Input
                              value={giftSenderName}
                              onChange={(e) => setGiftSenderName(e.target.value)}
                              placeholder={isAr ? 'سيظهر للمستلم' : 'Shown to the recipient'}
                              autoComplete="name"
                              className="bg-card"
                            />
                          </div>
                          <div className="mt-3">
                            <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                              {isAr ? 'رسالة شخصية (اختياري)' : 'Personal message (optional)'}
                            </label>
                            <textarea
                              value={giftMessage}
                              onChange={(e) => setGiftMessage(e.target.value.slice(0, 140))}
                              placeholder={isAr ? 'كل عام وأنت بخير 🎉' : 'Happy birthday! 🎉'}
                              rows={2}
                              className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-sm text-foreground resize-none focus:outline-none focus:border-[var(--ob-cta)]"
                            />
                            <p className="text-[10px] text-foreground/45 mt-1 text-end font-mono">{giftMessage.length}/140</p>
                          </div>
                        </>
                      )}
                      <p className="text-[11px] text-foreground/55 mt-2 leading-snug">
                        {isGift
                          ? (isAr ? 'سيتم إرسال الرمز للمستلم فور إتمام الدفع.' : "We'll send the code to the recipient as soon as your payment goes through.")
                          : (isAr ? 'سنرسل الرمز فور إتمام الدفع.' : "We'll send the code as soon as your payment goes through.")}
                      </p>
                    </>
                  )}

                  <Button
                    size="lg"
                    disabled={!contactValid || (isGift && delivery === 'code' && giftRecipientName.trim().length < 2)}
                    onClick={sendOtp}
                    className="w-full mt-4 font-bold text-[14px]"
                  >
                    {isLoggedIn
                      ? (isAr ? 'متابعة للدفع' : 'Continue to payment')
                      : (isAr ? 'إرسال رمز التحقق' : 'Send verification code')}
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
                    onClick={() => setStep(isLoggedIn ? 'contact' : 'otp')}
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

                  <p className="text-[11px] font-semibold text-foreground/70 mb-2 uppercase tracking-wider">
                    {isAr ? 'طريقة الدفع' : 'Payment method'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {([
                      { id: 'stc-pay',   label: 'STC Pay',    bg: '#4F0D7F', fg: '#FFFFFF' },
                      { id: 'apple-pay', label: 'Apple Pay',  bg: '#000000', fg: '#FFFFFF' },
                      { id: 'visa',      label: 'Visa',       bg: '#1A1F71', fg: '#FFFFFF' },
                      { id: 'mada',      label: 'mada',       bg: '#84BD00', fg: '#16143A' },
                    ] as const).map(m => {
                      const sel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id)}
                          className={`relative flex items-center justify-center py-3 rounded-xl border-2 transition-all ${
                            sel ? 'border-[var(--ob-cta)]' : 'border-border hover:border-[var(--ob-cta)]/40'
                          }`}
                          style={{ backgroundColor: m.bg, color: m.fg }}
                        >
                          {sel && (
                            <span className="absolute -top-1.5 -end-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                          <span className="font-bold text-[13px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Buy now, pay later — Saudi BNPL options */}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55 mt-3 mb-1.5">
                    {isAr ? 'اشترِ الآن وادفع لاحقاً' : 'Buy now, pay later'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {([
                      { id: 'tabby',  label: 'Tabby',  bg: '#3BFFC1', fg: '#16143A', sub: isAr ? '4 دفعات' : '4 payments' },
                      { id: 'tamara', label: 'Tamara', bg: '#E63B7A', fg: '#FFFFFF', sub: isAr ? 'ادفع لاحقاً' : 'Pay later' },
                    ] as const).map(m => {
                      const sel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id)}
                          className={`relative flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border-2 transition-all ${
                            sel ? 'border-[var(--ob-cta)]' : 'border-border hover:border-[var(--ob-cta)]/40'
                          }`}
                          style={{ backgroundColor: m.bg, color: m.fg }}
                        >
                          {sel && (
                            <span className="absolute -top-1.5 -end-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                          <span className="font-bold text-[14px]">{m.label}</span>
                          <span className="text-[10px] opacity-80">{m.sub}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    size="lg"
                    disabled={!paymentMethod}
                    onClick={handlePay}
                    className="w-full font-bold text-[14px]"
                  >
                    {isAr ? `ادفع ${pickedAmount} ر.س` : `Pay ${pickedAmount} SAR`}
                  </Button>
                  <p className="text-[10.5px] text-foreground/50 text-center mt-3 leading-snug">
                    {isAr ? 'الدفع آمن ومشفّر.' : 'Secure & encrypted payment.'}
                  </p>
                </div>
              )}

              {/* ── STEP 5: success ── */}
              {step === 'success' && (
                <div className="mt-2 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/15 mb-3">
                    <CheckCircle2 size={28} className="text-green-600" strokeWidth={2.2} />
                  </div>

                  {delivery === 'topup' && isRecharge && !isGift ? (
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
                  ) : isGift ? (
                    <>
                      <h3 className="font-heading font-bold text-lg text-foreground">
                        {isAr ? 'هديتك في الطريق! 🎁' : 'Gift on its way! 🎁'}
                      </h3>
                      <p className="text-[12.5px] text-foreground/65 mt-1.5">
                        {picker.brand} · <SarSymbol className="text-[11px]" /> {pickedAmount}
                      </p>
                      <div className="rounded-xl bg-secondary/50 border border-border p-4 mt-4 text-left">
                        <div className="text-[11px] uppercase tracking-wider font-semibold text-foreground/55 mb-1.5">
                          {isAr ? 'مرسلة إلى' : 'Sent to'}
                        </div>
                        <div className="font-heading font-bold text-foreground text-[15px]">
                          {giftRecipientName || (isAr ? 'المستلم' : 'Recipient')}
                        </div>
                        <div className="font-mono text-[12.5px] text-foreground/75 mt-0.5" dir="ltr">
                          {contactValue}
                        </div>
                        {giftSenderName && (
                          <div className="mt-3 pt-3 border-t border-border/60">
                            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-foreground/55 mb-1">
                              {isAr ? 'من' : 'From'}
                            </div>
                            <p className="text-[12.5px] text-foreground/85 leading-snug">
                              {giftSenderName}
                            </p>
                          </div>
                        )}
                        {giftMessage && (
                          <div className="mt-3 pt-3 border-t border-border/60">
                            <div className="text-[10.5px] uppercase tracking-wider font-semibold text-foreground/55 mb-1">
                              {isAr ? 'رسالتك' : 'Your message'}
                            </div>
                            <p className="text-[12.5px] text-foreground/85 italic leading-snug">
                              "{giftMessage}"
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-[11.5px] text-foreground/55 mt-3 leading-snug">
                        {isAr
                          ? `سيستلم ${giftRecipientName || 'المستلم'} الرمز عبر ${contactKind === 'email' ? 'البريد الإلكتروني' : 'الرسائل النصية'} خلال دقائق.`
                          : `${giftRecipientName || 'They'}'ll get the code via ${contactKind === 'email' ? 'email' : 'SMS'} within minutes.`}
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

      {/* Contact picker — mock list of phone contacts the buyer can pick from */}
      <Dialog open={showContactPicker} onOpenChange={setShowContactPicker}>
        <DialogContent className="max-w-sm p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between border-b border-border">
            <DialogTitle className="font-heading font-bold text-base flex items-center gap-2">
              <Users size={16} style={{ color: '#FE7151' }} />
              {isAr ? 'جهات الاتصال' : 'Contacts'}
            </DialogTitle>
            <button onClick={() => setShowContactPicker(false)} className="text-foreground/55 hover:text-foreground p-1 -m-1 rounded">
              <X size={16} />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {MOCK_CONTACTS.map((c) => (
              <button
                key={c.phone}
                onClick={() => pickContact(c)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-start border-b border-border/40 last:border-0"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}
                >
                  {c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-semibold text-[13px] text-foreground truncate">{c.name}</div>
                  <div className="text-[11.5px] text-foreground/55 mt-0.5 font-mono" dir="ltr">{c.phone}</div>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

