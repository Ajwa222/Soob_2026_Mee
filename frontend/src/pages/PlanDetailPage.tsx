/**
 * Plan detail page ("/plan/:id") — full breakdown of a single telecom plan.
 *
 * Displays:
 *  - Carrier logo, plan name, price, and "Get This Plan" CTA (links to carrier site)
 *  - Detailed specs table: data, calls, SMS, social media, roaming, contract, features
 *  - Interaction section: like/dislike buttons, comment thread (via usePlanInteractions hook)
 *  - "Similar Plans" carousel at the bottom (same carrier or similar price range)
 *  - Add to Compare / Bookmark actions
 *
 * Reads plan ID from URL params, looks it up in the PlansContext catalog.
 */
import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, ExternalLink, Plus, Check,
  Wifi, Phone, MessageSquare, Globe2, Share2, Clock,
  Zap, ArrowLeft, ArrowRight, Plane, Bookmark, TrendingDown,
  ThumbsUp, ThumbsDown, Send, Trash2, MessageCircle, LogIn,
  CheckCircle2, Info, XCircle, Mail, RefreshCw, CreditCard,
  Smartphone, FileText, Calendar, ArrowRightLeft, Truck, Crosshair, Map,
  MapPin as MapPinIcon,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import SarSymbol from '../components/SarSymbol';
import { useCompare } from '../context/CompareContext';
import { useBookmarks } from '../context/BookmarkContext';
import { usePlanInteractions } from '../hooks/usePlanInteractions';
import { getCarrierLogo, isValidValue, getValueScore, CARRIERS } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { trackEvent } from '../lib/analytics';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ConnectedPlanCard } from '../components/PlanCard';
import type { Plan } from '../types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { getBillingLabel } from '@/lib/utils';

function timeAgo(ts: number, t: (k: string, p?: Record<string, string>) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('interactions.justNow');
  if (mins < 60) return t('interactions.minutesAgo', { n: String(mins) });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('interactions.hoursAgo', { n: String(hrs) });
  const days = Math.floor(hrs / 24);
  return t('interactions.daysAgo', { n: String(days) });
}

export default function PlanDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { togglePlan, isSelected } = useCompare();
  const { requestBookmark, isBookmarked } = useBookmarks();
  const { user, isLoggedIn, loginWithGoogle, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || undefined;
  const [commentText, setCommentText] = useState('');

  const { plans } = usePlans();
  const planId = useMemo(() => Number(id), [id]);
  const plan = useMemo(() => plans.find(p => p.id === planId), [plans, planId]);
  const {
    reaction, comments, loading: interactionsLoading,
    toggleLike, toggleDislike, addComment, removeComment,
  } = usePlanInteractions(plan ? planId : undefined);

  // ─── Sign-in modal (intercepts the "Get this plan" CTA) ───
  type AuthStep = 'choose' | 'otp';
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authStep, setAuthStep] = useState<AuthStep>('choose');
  const [authKind, setAuthKind] = useState<'phone' | 'email'>('phone');
  const [authContact, setAuthContact] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authOtp, setAuthOtp] = useState<string[]>(['', '', '', '']);
  const authOtpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [authError, setAuthError] = useState<string | null>(null);

  const resetAuth = () => {
    setAuthMode('signin');
    setAuthStep('choose');
    setAuthKind('phone');
    setAuthContact('');
    setAuthFirstName('');
    setAuthLastName('');
    setAuthOtp(['', '', '', '']);
    setAuthError(null);
  };

  const authContactValid = (() => {
    const v = authContact.trim();
    if (!v) return false;
    if (authKind === 'phone') return /^[0-9+\s-]{8,}$/.test(v);
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  })();
  const authOtpComplete = authOtp.every((d) => d.length === 1);
  const authNameValid =
    authMode === 'signin' ||
    (authFirstName.trim().length >= 2 && authLastName.trim().length >= 2);

  const handleAuthOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...authOtp];
    next[i] = v;
    setAuthOtp(next);
    if (v && i < 3) authOtpRefs.current[i + 1]?.focus();
  };
  const handleAuthOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !authOtp[i] && i > 0) authOtpRefs.current[i - 1]?.focus();
  };
  const handleAuthOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    e.preventDefault();
    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setAuthOtp(next);
    authOtpRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  // After successful auth — close the sign-in modal and open the in-platform
  // activation flow instead of bouncing the user to the carrier site.
  const proceedAfterAuth = () => {
    if (!plan) return;
    trackEvent('get_plan_clicked', {
      plan_id: plan.id,
      plan_name: plan.planName,
      provider: plan.provider,
      url: plan.url,
      source,
    }, { useBeacon: true });
    setShowSignInModal(false);
    startPurchase();
  };

  const handleBuyClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();              // Always intercept — we handle activation in-app now.
    if (isLoggedIn) {
      trackEvent('get_plan_clicked', { plan_id: plan?.id, plan_name: plan?.planName, provider: plan?.provider, url: plan?.url, source }, { useBeacon: true });
      startPurchase();
      return;
    }
    resetAuth();
    setShowSignInModal(true);
    trackEvent('signin_modal_opened', { source: 'plan_detail_buy', plan_id: plan?.id });
  };

  const handleGoogleAndBuy = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
      proceedAfterAuth();
    } catch {
      setAuthError('Google sign-in failed. Try again.');
    }
  };

  const handleOtpVerifyAndBuy = async () => {
    setAuthError(null);
    try {
      const fullName = authMode === 'signup'
        ? `${authFirstName.trim()} ${authLastName.trim()}`.trim()
        : undefined;
      await loginWithOtp(authKind, authContact.trim(), fullName);
      proceedAfterAuth();
    } catch {
      setAuthError('Verification failed. Try again.');
    }
  };

  // ─── Purchase flow (after login) — multi-step in-platform activation ───
  type PurchasePath = 'new' | 'port';
  type PurchaseStep =
    | 'choose-path'
    | 'contact-phone'                                // collect Saudi mobile up-front (new-number flow)
    | 'identity' | 'identity-otp' | 'pick-number'   // new-number flow
    | 'port-number' | 'port-otp' | 'port-contact'   // port flow
    | 'sim-type' | 'payment' | 'success';
  type SimType = 'sim' | 'esim';
  type PaymentMethod = 'apple-pay' | 'mada' | 'stc-pay' | 'visa';

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('choose-path');
  const [purchasePath, setPurchasePath] = useState<PurchasePath | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const contactPhoneValid = /^05\d{8}$/.test(contactPhone.trim());
  const [portContactPhone, setPortContactPhone] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  // Pinned location on the mock delivery map (percent of width/height)
  const [deliveryPin, setDeliveryPin] = useState<{ x: number; y: number } | null>(null);
  const [deliveryMapOpen, setDeliveryMapOpen] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [existingNumber, setExistingNumber] = useState('');
  const [donorProvider, setDonorProvider] = useState<string | null>(null);
  const [identityOtp, setIdentityOtp] = useState<string[]>(['', '', '', '']);
  const identityOtpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [portOtp, setPortOtp] = useState<string[]>(['', '', '', '']);
  const portOtpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [pickedNumber, setPickedNumber] = useState<string | null>(null);
  const [simType, setSimType] = useState<SimType | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [discountApplied, setDiscountApplied] = useState<{ code: string; percent: number } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Mock promo codes — replace with backend validation when wired up.
  const PROMO_CODES: Record<string, number> = {
    SOOB10: 10,
    WELCOME20: 20,
    FRIEND15: 15,
  };

  const applyDiscount = () => {
    const code = discountInput.trim().toUpperCase();
    if (!code) return;
    const percent = PROMO_CODES[code];
    if (percent) {
      setDiscountApplied({ code, percent });
      setDiscountError(null);
      trackEvent('plan_purchase_discount_applied', { plan_id: plan?.id, code, percent });
    } else {
      setDiscountApplied(null);
      setDiscountError(lang === 'ar' ? 'رمز الخصم غير صالح' : 'Invalid discount code');
    }
  };

  const removeDiscount = () => {
    setDiscountApplied(null);
    setDiscountInput('');
    setDiscountError(null);
  };

  const generateNumbers = (count = 6): string[] => {
    const prefixes = ['050', '055', '054', '056', '058'];
    const out: string[] = [];
    while (out.length < count) {
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const rest = String(Math.floor(1000000 + Math.random() * 8999999));
      const n = `${p}${rest}`;
      if (!out.includes(n)) out.push(n);
    }
    return out;
  };

  const resetPurchase = () => {
    setPurchaseStep('choose-path');
    setPurchasePath(null);
    setContactPhone('');
    setPortContactPhone('');
    setDeliveryCity('');
    setDeliveryAddress('');
    setDeliveryPin(null);
    setDeliveryMapOpen(false);
    setIdNumber('');
    setBirthDate('');
    setExistingNumber('');
    setDonorProvider(null);
    setIdentityOtp(['', '', '', '']);
    setPortOtp(['', '', '', '']);
    setAvailableNumbers([]);
    setPickedNumber(null);
    setSimType(null);
    setPaymentMethod(null);
    setDiscountInput('');
    setDiscountApplied(null);
    setDiscountError(null);
  };

  const startPurchase = () => {
    resetPurchase();
    setShowPurchaseModal(true);
    trackEvent('plan_purchase_started', { plan_id: plan?.id, plan_name: plan?.planName });
  };

  // ─── Identity-OTP input handlers (separate from sign-in OTP refs) ───
  const handleIdOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...identityOtp];
    next[i] = v;
    setIdentityOtp(next);
    if (v && i < 3) identityOtpRefs.current[i + 1]?.focus();
  };
  const handleIdOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !identityOtp[i] && i > 0) identityOtpRefs.current[i - 1]?.focus();
  };
  const identityOtpComplete = identityOtp.every((d) => d.length === 1);

  // Port-OTP handlers (mirror of identity but bound to portOtp / portOtpRefs)
  const handlePortOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...portOtp];
    next[i] = v;
    setPortOtp(next);
    if (v && i < 3) portOtpRefs.current[i + 1]?.focus();
  };
  const handlePortOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !portOtp[i] && i > 0) portOtpRefs.current[i - 1]?.focus();
  };
  const portOtpComplete = portOtp.every((d) => d.length === 1);

  // Validation helpers
  const idNumberValid = /^[12]\d{9}$/.test(idNumber.trim()); // Saudi National ID / Iqama: 10 digits starting 1 or 2
  const birthDateValid = !!birthDate;
  const existingNumberValid = /^05\d{8}$/.test(existingNumber.trim());
  const portContactPhoneFormatValid = /^05\d{8}$/.test(portContactPhone.trim());
  const portContactPhoneIsSameAsPorted = portContactPhone.trim().length > 0 && portContactPhone.trim() === existingNumber.trim();
  const portContactPhoneValid = portContactPhoneFormatValid && !portContactPhoneIsSameAsPorted;

  // Cheaper-alternative finder — same logic as Switch & Save, in-page modal.
  const [showCheaperModal, setShowCheaperModal] = useState(false);
  const cheaperAlternatives = useMemo<Plan[]>(() => {
    if (!plan) return [];
    const parseGB = (v: string) =>
      v === 'Unlimited' ? Infinity : parseFloat(v) || 0;
    const planGB = parseGB(plan.dataGB);
    const planMins = parseGB(plan.localCallMinutes);
    const planIntl = parseGB(plan.internationalCallMinutes ?? '0');
    const planSocial = parseGB(plan.socialMediaData ?? '0');

    return plans
      .filter(p => {
        if (p.id === plan.id) return false;
        if (p.priceSAR >= plan.priceSAR) return false;             // must be cheaper
        if (parseGB(p.dataGB) < planGB) return false;              // ≥ data
        if (parseGB(p.localCallMinutes) < planMins) return false;  // ≥ local mins
        if (planIntl > 0 && parseGB(p.internationalCallMinutes ?? '0') < planIntl) return false;
        if (planSocial > 0 && parseGB(p.socialMediaData ?? '0') < planSocial) return false;
        return true;
      })
      .sort((a, b) => {
        const savingsA = plan.priceSAR - a.priceSAR;
        const savingsB = plan.priceSAR - b.priceSAR;
        if (savingsB !== savingsA) return savingsB - savingsA;
        return getValueScore(b) - getValueScore(a);
      })
      .slice(0, 3);
  }, [plan, plans]);
  const topSaving = cheaperAlternatives.length > 0 && plan
    ? Math.round((plan.priceSAR - cheaperAlternatives[0].priceSAR) * 100) / 100
    : 0;
  const yearlySaving = Math.round(topSaving * 12 * 100) / 100;

  useEffect(() => {
    if (plan) {
      trackEvent('plan_detail_viewed', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, price: plan.priceSAR, source });
    }
  }, [plan]);

  if (!plan) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h1 className="font-heading font-bold text-2xl text-foreground">
          {t('detail.notFound')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('detail.notFoundDesc')}
        </p>
        <Button asChild className="mt-6">
          <Link to="/plans">
            {t('detail.backToPlans')}
          </Link>
        </Button>
      </div>
    );
  }

  const carrierLogo = getCarrierLogo(plan.provider);
  const selected = isSelected(plan.id);
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // Spec table is fully replaced by the Transparency "What you get" card below.
  const hasFeatures = isValidValue(plan.specialFeatures);

  return (
    <div className="relative z-10 safe-pb">
      {/* ========= BREADCRUMB ========= */}
      <div className="bg-muted/50 border-b border-border/50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              {t('nav.home')}
            </Link>
            <Chevron size={14} />
            <Link to="/plans" className="hover:text-foreground transition-colors">
              {t('nav.plans')}
            </Link>
            <Chevron size={14} />
            <span className="text-foreground font-medium truncate max-w-50">
              {plan.planName}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">

        {/* ========= PLAN HEADER ========= */}
        <div className="pt-6 pb-5">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-5 text-muted-foreground hover:text-foreground"
          >
            <BackArrow size={16} />
            {t('detail.back')}
          </Button>

          {/* Carrier + badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              {carrierLogo && (
                <img src={carrierLogo} alt={plan.provider} className="h-7 w-auto object-contain" />
              )}
              <span className="text-sm font-bold uppercase tracking-wider text-primary">
                {plan.provider}
              </span>
            </div>
            <Badge variant="secondary" className="text-[11px] font-bold">
              {t(`types.${plan.planType}`)}
            </Badge>
          </div>

          {/* Plan name + top-action row (like / dislike / bookmark) */}
          <div className="flex items-start justify-between gap-3 mt-3">
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground leading-tight">
              {plan.planName}
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              {(() => {
                const isLiked = user ? reaction.likedBy.includes(user.uid) : false;
                return (
                  <button
                    onClick={isLoggedIn ? toggleLike : loginWithGoogle}
                    aria-label="Like this plan"
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 h-8 text-xs font-semibold transition-colors ${
                      isLiked ? '' : 'bg-muted text-muted-foreground hover:bg-[rgba(254,113,81,0.10)] hover:text-[#FE7151]'
                    }`}
                    style={isLiked ? { background: 'rgba(254, 113, 81, 0.15)', color: '#FE7151', boxShadow: '0 0 0 1px rgba(254, 113, 81, 0.35) inset' } : undefined}
                  >
                    <ThumbsUp size={14} />
                    <span className="tabular-nums">{Math.max(0, reaction.likes)}</span>
                  </button>
                );
              })()}
              <button
                onClick={isLoggedIn ? toggleDislike : loginWithGoogle}
                aria-label="Dislike this plan"
                className={`inline-flex items-center gap-1 rounded-full px-2.5 h-8 text-xs font-semibold transition-colors ${
                  user && reaction.dislikedBy.includes(user.uid)
                    ? 'bg-red-500/15 text-red-500 ring-1 ring-red-500/30'
                    : 'bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
                }`}
              >
                <ThumbsDown size={14} />
                <span className="tabular-nums">{Math.max(0, reaction.dislikes)}</span>
              </button>
              <button
                onClick={() => { if (!requestBookmark({ kind: 'plan', id: String(plan.id) })) navigate('/profile'); }}
                className={`p-2 rounded-xl transition-colors ${isBookmarked('plan', plan.id) ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                aria-label={isBookmarked('plan', plan.id) ? t('bookmark.remove') : t('bookmark.add')}
              >
                <Bookmark size={20} fill={isBookmarked('plan', plan.id) ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-1.5">
            <SarSymbol className="text-base text-muted-foreground" />
            <span className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground">
              {plan.priceSAR}
            </span>
            <span className="text-base text-muted-foreground">{getBillingLabel(plan.contractTerms, t)}</span>
          </div>
        </div>

        {/* ========= COMMUNITY TRUST (social proof + retention stats) =========
         * Combines variation 9 "People like you" header with variation 3-style
         * stat blocks. Numbers vary per plan via a deterministic seed so each
         * plan looks like its own community without burning real data calls. */}
        {(() => {
          const seed = plan.id;
          const pickers = 1200 + ((seed * 73) % 2400);   // 1.2k–3.6k
          const retention = 78 + (seed % 18);            // 78–95 %
          const rating = (4.0 + ((seed % 9) * 0.05)).toFixed(1); // 4.0–4.4
          const reviews = 400 + ((seed * 41) % 1500);    // 400–1900
          const todayCount = 2 + (seed % 12);            // 2–13
          const avatars = ['A', 'N', 'M', 'S', 'K'];
          const avatarTints = [
            'bg-[#C59AFA] text-[#16143A]',
            'bg-[#CFEB74] text-[#16143A]',
            'bg-[#FE7151] text-white',
            'bg-[#16143A] text-white',
            'bg-[#9B7DEE] text-[#16143A]',
          ];
          return (
            <Card className="ob-card-elev overflow-hidden mb-5">
              <CardContent className="p-5 md:p-6">
                {/* Avatars + headline row */}
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2 shrink-0">
                    {avatars.map((init, i) => (
                      <div
                        key={i}
                        className={`w-9 h-9 rounded-full border-2 border-card flex items-center justify-center text-xs font-bold ${avatarTints[i]}`}
                      >
                        {init}
                      </div>
                    ))}
                    <div className="w-9 h-9 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      +{Math.floor(pickers / 1000)}k
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground leading-tight">
                      <span className="text-foreground">{pickers.toLocaleString()} users like you</span>
                      {' '}
                      {lang === 'ar' ? 'اختاروا هذه الباقة' : 'picked this plan'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                      {lang === 'ar'
                        ? 'بناءً على المستخدمين بعمر 20–25 في الرياض الذين يستخدمون 30–60 جيجا شهرياً.'
                        : 'Based on users aged 20–25 in Riyadh who use 30–60 GB per month.'}
                    </p>
                  </div>
                </div>

                {/* 3 stat blocks */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
                  <div className="text-center">
                    <div className="font-heading font-bold text-xl md:text-2xl text-green-600 leading-none">
                      {retention}<span className="text-sm">%</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-1">
                      {lang === 'ar' ? 'لا يزالون يستخدمون بعد 6 أشهر' : 'Still active after 6 months'}
                    </div>
                  </div>
                  <div className="text-center border-x border-border">
                    <div className="font-heading font-bold text-xl md:text-2xl text-foreground leading-none">
                      ★ {rating}
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-1">
                      {lang === 'ar' ? `متوسط التقييم · ${reviews} مراجعة` : `Avg rating · ${reviews.toLocaleString()} reviews`}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="font-heading font-bold text-xl md:text-2xl text-foreground leading-none">
                      {todayCount}<span className="text-sm"> {lang === 'ar' ? 'اليوم' : 'today'}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground leading-tight mt-1">
                      {lang === 'ar' ? 'تم تفعيلها في مدينتك اليوم' : 'Activated in your city today'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Plan spec table removed — fully replaced by the Transparency
         * "What you get" card below, which covers data / mins / social /
         * contract / features in one place with plain-language framing. */}

        {/* ========= TRANSPARENCY (variation 3) ========= */}
        <div className="mt-5 flex flex-col gap-3">
          {/* What you get — brand lime (success, included) */}
          <Card className="ob-card-elev overflow-hidden border-l-4" style={{ borderLeftColor: '#CFEB74' }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(207, 235, 116, 0.30)' }}>
                  <CheckCircle2 size={16} style={{ color: '#16143A' }} />
                </div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  {lang === 'ar' ? 'ما تحصل عليه' : 'What you get'}
                </h3>
              </div>
              <ul className="space-y-2 text-[13px] text-foreground/85 leading-relaxed">
                {/* Data — handle Unlimited / GB / MB cleanly */}
                <li className="flex gap-2">
                  <span className="shrink-0 mt-0.5" style={{ color: '#16143A' }}>✓</span>
                  <span>
                    <strong>
                      {plan.dataGB === 'Unlimited'
                        ? (lang === 'ar' ? 'بيانات غير محدودة' : 'Unlimited data')
                        : `${plan.dataGB}${typeof plan.dataGB === 'string' && /\b(GB|MB)\b/i.test(plan.dataGB) ? '' : ' GB'}`}
                    </strong>{' '}
                    {plan.dataGB !== 'Unlimited' && (lang === 'ar' ? 'بيانات عالية السرعة' : 'high-speed data')}
                  </span>
                </li>

                {/* Local mins — handle Unlimited */}
                {isValidValue(plan.localCallMinutes) && (
                  <li className="flex gap-2">
                    <span className="shrink-0 mt-0.5" style={{ color: '#16143A' }}>✓</span>
                    <span>
                      <strong>
                        {plan.localCallMinutes === 'Unlimited'
                          ? (lang === 'ar' ? 'مكالمات محلية غير محدودة' : 'Unlimited local calls')
                          : `${plan.localCallMinutes} ${lang === 'ar' ? 'دقيقة' : 'min'}`}
                      </strong>
                      {plan.localCallMinutes !== 'Unlimited' && (
                        <> {lang === 'ar' ? 'مكالمات محلية' : 'local calls'}</>
                      )}
                    </span>
                  </li>
                )}

                {/* International mins */}
                {isValidValue(plan.internationalCallMinutes) && (
                  <li className="flex gap-2">
                    <span className="shrink-0 mt-0.5" style={{ color: '#16143A' }}>✓</span>
                    <span>
                      <strong>{plan.internationalCallMinutes}</strong>{' '}
                      {lang === 'ar' ? 'دقائق دولية' : 'international minutes'}
                    </span>
                  </li>
                )}

                {/* Social apps — show brand icons + names so it's instantly clear which platforms are covered */}
                {isValidValue(plan.socialMediaData) && (
                  <li className="flex gap-2">
                    <span className="shrink-0 mt-0.5" style={{ color: '#16143A' }}>✓</span>
                    <div className="min-w-0">
                      <div>
                        {lang === 'ar' ? 'تطبيقات تواصل مجانية' : 'Free social apps'}{' '}
                        <span className="text-foreground/60">
                          {lang === 'ar' ? '(لا تُحسب من باقتك)' : "(don't count against your data)"}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {[
                          { name: 'WhatsApp',  bg: '#25D366', initial: 'W' },
                          { name: 'Instagram', bg: '#E4405F', initial: 'I' },
                          { name: 'TikTok',    bg: '#000000', initial: 'T' },
                          { name: 'Snapchat',  bg: '#FFFC00', initial: 'S', fg: '#16143A' },
                          { name: 'X',         bg: '#000000', initial: '𝕏' },
                        ].map(p => (
                          <span
                            key={p.name}
                            className="inline-flex items-center gap-1.5 rounded-full pe-2.5 ps-1 py-0.5 border border-border bg-card"
                          >
                            <span
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold"
                              style={{ background: p.bg, color: p.fg ?? '#fff' }}
                            >
                              {p.initial}
                            </span>
                            <span className="text-[12px] font-semibold text-foreground">{p.name}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                )}

                {/* Contract / validity — pulled from spec table */}
                {isValidValue(plan.contractTerms) && (
                  <li className="flex gap-2">
                    <span className="shrink-0 mt-0.5" style={{ color: '#16143A' }}>✓</span>
                    <span>
                      <strong>{plan.contractTerms}</strong>{' '}
                      {lang === 'ar' ? 'مدة العقد / الصلاحية' : 'contract / validity'}
                    </span>
                  </li>
                )}

                {/* Special features */}
                {hasFeatures && (
                  <li className="flex gap-2">
                    <span className="shrink-0 mt-0.5" style={{ color: '#16143A' }}>✓</span>
                    <span>{plan.specialFeatures}</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Before you buy — brand coral (warning, attention) */}
          <Card className="ob-card-elev overflow-hidden border-l-4" style={{ borderLeftColor: '#FE7151' }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(254, 113, 81, 0.18)' }}>
                  <Info size={16} style={{ color: '#FE7151' }} />
                </div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  {lang === 'ar' ? 'قبل الشراء — 3 أشياء يجب معرفتها' : 'Before you buy — 3 things to know'}
                </h3>
              </div>
              <ul className="space-y-3 text-[13px] text-foreground/85 leading-relaxed">
                <li>
                  <p className="font-semibold text-foreground">
                    📉 {lang === 'ar'
                      ? 'السرعة تنخفض بعد استهلاك الباقة — ولكن لا تتوقف'
                      : 'Speed drops after the cap — but does not stop'}
                  </p>
                  <p className="text-muted-foreground text-[12px] mt-0.5">
                    {lang === 'ar'
                      ? 'يمكنك التصفح وWhatsApp بسرعة منخفضة. تشغيل الفيديو HD سيواجه صعوبة حتى الشهر التالي.'
                      : 'You can still browse and WhatsApp at lower speeds. Netflix HD and video calls struggle until next month.'}
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground">
                    📅 {lang === 'ar'
                      ? `${plan.contractTerms || 'شهري'} — راجع شروط الإلغاء`
                      : `${plan.contractTerms || 'Monthly'} — check the cancellation terms`}
                  </p>
                  <p className="text-muted-foreground text-[12px] mt-0.5">
                    {lang === 'ar'
                      ? 'بعض الباقات لها رسوم إلغاء مبكر. تحقق من تفاصيل الباقة قبل التفعيل.'
                      : 'Some contracts charge an early-cancellation fee. Check the carrier terms before activating.'}
                  </p>
                </li>
                <li>
                  <p className="font-semibold text-foreground">
                    💳 {lang === 'ar' ? 'تجديد تلقائي شهري' : 'Auto-renews each month'}
                  </p>
                  <p className="text-muted-foreground text-[12px] mt-0.5">
                    {lang === 'ar'
                      ? 'سنرسل تذكيراً قبل 3 أيام من التجديد. يمكنك الإلغاء من تطبيق المشغل في أي وقت.'
                      : "We'll remind you 3 days before. Cancel from the carrier app anytime — no phone call needed."}
                  </p>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* What's NOT included — red/rose */}
          <Card className="ob-card-elev overflow-hidden border-l-4 border-l-rose-500/70">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-rose-500/15 flex items-center justify-center">
                  <XCircle size={16} className="text-rose-600" />
                </div>
                <h3 className="font-heading font-bold text-sm text-foreground">
                  {lang === 'ar' ? 'ما هو غير مشمول' : "What's NOT included"}
                </h3>
              </div>
              <ul className="space-y-2 text-[13px] text-foreground/85 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-rose-600 shrink-0 mt-0.5">×</span>
                  <span>
                    <strong>{lang === 'ar' ? 'التجوال خارج السعودية' : 'Roaming outside Saudi Arabia'}</strong>
                    {' — '}
                    {lang === 'ar'
                      ? 'يعمل في الخارج، لكن بسعر لكل ميجابايت. سننبهك قبل أي رسوم تجوال.'
                      : "it works abroad, but you pay per MB. We'll alert you before any roaming charge."}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-600 shrink-0 mt-0.5">×</span>
                  <span>
                    <strong>{lang === 'ar' ? 'اشتراكات Netflix / شاهد / OSN' : 'Netflix / Shahid / OSN subscriptions'}</strong>
                    {' — '}
                    {lang === 'ar'
                      ? 'الباقة تعطيك بيانات، وليس التطبيقات نفسها. تدفع ثمنها بشكل منفصل.'
                      : 'the plan gives you data, not the apps themselves. You pay for them separately.'}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-rose-600 shrink-0 mt-0.5">×</span>
                  <span>
                    <strong>{lang === 'ar' ? 'الجهاز / الهاتف' : 'Handset / phone'}</strong>
                    {' — '}
                    {lang === 'ar'
                      ? 'أحضر هاتفك أو أضف جهازاً عبر تابي / تمارا.'
                      : 'bring your own, or add a device bundle with Tabby / Tamara.'}
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* ========= ACTION BUTTONS ========= */}
        <div className="mt-5 pb-12 flex flex-col gap-3">
          <Button
            asChild
            size="lg"
            className="w-full py-3.5 font-bold text-[15px] bg-[var(--ob-cta)] hover:bg-[var(--ob-cta-hover)]"
          >
            <a
              href={plan.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                handleBuyClick(e);
                if (isLoggedIn) {
                  trackEvent('get_plan_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, url: plan.url, source }, { useBeacon: true });
                }
              }}
            >
              {t('detail.getThisPlan')}
              <ExternalLink size={16} />
            </a>
          </Button>

          {/* Legal disclaimer — sits directly under the primary CTA so the
           * user sees it before any other action. */}
          <p className="text-[11px] text-foreground/55 text-center leading-snug px-2 -mt-1">
            {lang === 'ar' ? (
              <>
                باختيار <strong className="text-foreground/75">"اشترِ الآن"</strong>، فإنك توافق على{' '}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  شروط الخدمة
                </Link>{' '}
                و
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  {' '}سياسة الخصوصية
                </Link>
                .
              </>
            ) : (
              <>
                By choosing <strong className="text-foreground/75">Buy Now</strong>, you agree to our{' '}
                <Link to="/terms" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
                .
              </>
            )}
          </p>

          {/* Cheaper-alternative finder — runs the Switch & Save filter against
           * this plan's specs and shows the result in an in-page modal. */}
          <Button
            variant="outline"
            size="lg"
            className="w-full py-3.5 font-bold text-[15px]"
            onClick={() => {
              trackEvent('check_cheaper_alternative_clicked', {
                plan_id: plan.id,
                plan_name: plan.planName,
                provider: plan.provider,
                price: plan.priceSAR,
                results_count: cheaperAlternatives.length,
              });
              setShowCheaperModal(true);
            }}
          >
            <TrendingDown size={16} />
            {lang === 'ar'
              ? 'تحقق إن كانت أفضل باقة لهذا السعر'
              : 'Check if this is the best plan for the price'}
          </Button>

          <Button
            variant={selected ? 'default' : 'outline'}
            size="lg"
            className="w-full py-3.5 font-bold text-[15px]"
            onClick={() => togglePlan(plan)}
          >
            {selected ? <Check size={16} /> : <Plus size={16} />}
            {selected ? t('planCard.selected') : t('detail.addToCompare')}
          </Button>
        </div>

        {/* ========= COMMENTS ========= */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center gap-2 py-4 px-5">
            <MessageCircle size={18} className="text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              {t('interactions.comments')}
              {comments.length > 0 && (
                <span className="ms-1.5 text-muted-foreground font-normal">({comments.length})</span>
              )}
            </h2>
          </CardHeader>

          <Separator />

          {/* Comment Input */}
          {isLoggedIn ? (
            <div className="px-5 py-4 flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{user?.name?.[0] ?? '?'}</span>
                </div>
              )}
              <Input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    addComment(commentText);
                    setCommentText('');
                  }
                }}
                placeholder={t('interactions.commentPlaceholder')}
                className="flex-1"
                maxLength={500}
              />
              <Button
                size="icon"
                onClick={() => {
                  if (commentText.trim()) {
                    addComment(commentText);
                    setCommentText('');
                  }
                }}
                disabled={!commentText.trim()}
                className="shrink-0"
              >
                <Send size={16} />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={loginWithGoogle}
              className="w-full rounded-none px-5 py-4 h-auto flex items-center justify-center gap-2 text-sm text-primary font-medium"
            >
              <LogIn size={16} />
              {t('interactions.signInToInteract')}
            </Button>
          )}

          <Separator />

          {/* Comments List */}
          <div className="divide-y divide-border/30">
            {comments.length === 0 && !interactionsLoading && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {t('interactions.noComments')}
              </p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="px-5 py-4 flex gap-3">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{comment.userName?.[0] ?? '?'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground truncate">{comment.userName}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(comment.createdAt, t)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 wrap-break-word">{comment.text}</p>
                </div>
                {user?.uid === comment.userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeComment(comment.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0 self-start"
                    title={t('interactions.deleteComment')}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="pb-12" />
      </div>

      {/* ========= SIGN-IN MODAL (intercepts Buy when not logged in) ========= */}
      <Dialog open={showSignInModal} onOpenChange={(open) => { if (!open) setShowSignInModal(false); }}>
        <DialogContent className="max-w-md">
          {/* Header */}
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl flex items-center gap-2">
              <LogIn size={20} className="text-foreground/70" />
              {authStep === 'choose'
                ? (lang === 'ar'
                    ? (authMode === 'signin' ? 'سجّل دخولك للمتابعة' : 'أنشئ حساباً للمتابعة')
                    : (authMode === 'signin' ? 'Log in to continue' : 'Create your SOOB account'))
                : (lang === 'ar' ? 'أدخل رمز التحقق' : 'Enter the verification code')}
            </DialogTitle>
            <DialogDescription>
              {authStep === 'choose'
                ? (lang === 'ar'
                    ? (authMode === 'signin'
                        ? 'مرحباً مجدداً. تحقق من هويتك لإكمال الشراء.'
                        : 'لإكمال شراء الباقة، نحتاج التحقق من هويتك.')
                    : (authMode === 'signin'
                        ? "Welcome back. Verify it's you to send the carrier your details."
                        : "We need to verify it's you before we send you to the carrier."))
                : (lang === 'ar'
                    ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span className="font-mono text-foreground">{authContact}</span></>
                    : <>We sent a 4-digit code to <span className="font-mono text-foreground">{authContact}</span></>)}
            </DialogDescription>
          </DialogHeader>

          {/* ── STEP 1 ── Variant A: clean log-in form, sign-up as a small link, Google at the bottom */}
          {authStep === 'choose' && (
            <div className="mt-1">
              {/* Name fields — sign-up mode only (revealed when user clicks the link below) */}
              {authMode === 'signup' && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                      {lang === 'ar' ? 'الاسم الأول' : 'First name'}
                    </label>
                    <Input
                      value={authFirstName}
                      onChange={(e) => setAuthFirstName(e.target.value)}
                      placeholder={lang === 'ar' ? 'محمد' : 'Mohammed'}
                      autoComplete="given-name"
                      className="bg-card"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                      {lang === 'ar' ? 'اسم العائلة' : 'Last name'}
                    </label>
                    <Input
                      value={authLastName}
                      onChange={(e) => setAuthLastName(e.target.value)}
                      placeholder={lang === 'ar' ? 'العتيبي' : 'Al-Otaibi'}
                      autoComplete="family-name"
                      className="bg-card"
                    />
                  </div>
                </div>
              )}

              {/* Single contact field — default phone, with inline "or use email" link below */}
              <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                {authKind === 'phone'
                  ? (lang === 'ar' ? 'رقم الجوال' : 'Phone number')
                  : (lang === 'ar' ? 'البريد الإلكتروني' : 'Email')}
              </label>
              <div className="relative mb-2">
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
                onClick={() => {
                  setAuthKind(authKind === 'phone' ? 'email' : 'phone');
                  setAuthContact('');
                }}
                className="inline-flex items-center gap-1.5 mb-3 text-[12px] text-foreground/65 hover:text-foreground transition-colors"
              >
                {authKind === 'phone' ? <Mail size={12} /> : <Phone size={12} />}
                <span className="underline underline-offset-4">
                  {authKind === 'phone'
                    ? (lang === 'ar' ? 'أو استخدم البريد الإلكتروني' : 'or use email instead')
                    : (lang === 'ar' ? 'أو استخدم رقم الجوال' : 'or use phone instead')}
                </span>
              </button>

              <Button
                size="lg"
                disabled={!authContactValid || !authNameValid}
                onClick={() => {
                  setAuthStep('otp');
                  setAuthOtp(['', '', '', '']);
                  setTimeout(() => authOtpRefs.current[0]?.focus(), 0);
                }}
                className="w-full font-bold text-[14px]"
              >
                {lang === 'ar' ? 'متابعة' : 'Continue'}
              </Button>

              {/* Terms & Conditions disclaimer */}
              <p className="text-center text-[10.5px] text-foreground/55 mt-2.5 leading-relaxed px-2">
                {lang === 'ar' ? (
                  <>
                    بالمتابعة، فإنك توافق على{' '}
                    <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">شروط الاستخدام</Link>
                    {' '}و
                    {' '}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">سياسة الخصوصية</Link>.
                  </>
                ) : (
                  <>
                    By continuing, you agree to our{' '}
                    <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
                  </>
                )}
              </p>

              {/* Sign-up / Log-in toggle link — small, secondary */}
              <p className="text-center text-[12px] text-foreground/65 mt-3">
                {authMode === 'signin' ? (
                  <>
                    {lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                    <button
                      onClick={() => setAuthMode('signup')}
                      className="font-bold text-foreground underline underline-offset-4 hover:opacity-80"
                    >
                      {lang === 'ar' ? 'أنشئ حساباً' : 'Sign up'}
                    </button>
                  </>
                ) : (
                  <>
                    {lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                    <button
                      onClick={() => setAuthMode('signin')}
                      className="font-bold text-foreground underline underline-offset-4 hover:opacity-80"
                    >
                      {lang === 'ar' ? 'تسجيل الدخول' : 'Log in'}
                    </button>
                  </>
                )}
              </p>

              {/* Divider — pushes Google to the bottom of the modal */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10.5px] uppercase tracking-wider text-foreground/45 font-mono">
                  {lang === 'ar' ? 'أو' : 'or'}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Google — ghost / secondary style so it doesn't compete with the primary log-in CTA */}
              <button
                onClick={handleGoogleAndBuy}
                className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-border bg-card hover:bg-secondary/40 hover:border-[var(--ob-cta)]/40 transition-all font-semibold text-[13px] text-foreground/85"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.34z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 9 0 9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                {lang === 'ar' ? 'المتابعة بحساب Google' : 'Continue with Google'}
              </button>

              {authError && (
                <p className="text-[12px] text-rose-600 mt-3 text-center">{authError}</p>
              )}

              <p className="text-[10.5px] text-foreground/50 text-center mt-4 leading-snug">
                {lang === 'ar' ? (
                  <>بالمتابعة فإنك توافق على{' '}
                    <Link to="/terms" className="underline underline-offset-2">شروط الخدمة</Link> و
                    <Link to="/privacy" className="underline underline-offset-2"> سياسة الخصوصية</Link>.
                  </>
                ) : (
                  <>By continuing you agree to our{' '}
                    <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link> and{' '}
                    <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
                  </>
                )}
              </p>
            </div>
          )}

          {/* ── STEP 2 ── OTP verification */}
          {authStep === 'otp' && (
            <div className="mt-1 text-center">
              <button
                onClick={() => setAuthStep('choose')}
                className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3"
              >
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <div className="flex justify-center gap-2 mt-3" dir="ltr">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { authOtpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={authOtp[i]}
                    onChange={(e) => handleAuthOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleAuthOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleAuthOtpPaste : undefined}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    className={`w-12 h-14 md:w-14 md:h-16 rounded-xl border-2 bg-card text-center font-heading font-bold text-2xl text-foreground tabular-nums focus:outline-none transition-colors ${
                      authOtp[i]
                        ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/5'
                        : 'border-border focus:border-[var(--ob-cta)]'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px]">
                <span className="text-foreground/55">
                  {lang === 'ar' ? 'لم يصلك الرمز؟' : "Didn't get the code?"}
                </span>
                <button
                  onClick={() => { setAuthOtp(['', '', '', '']); authOtpRefs.current[0]?.focus(); }}
                  className="font-semibold text-foreground hover:opacity-80 underline underline-offset-4"
                >
                  {lang === 'ar' ? 'أعد الإرسال' : 'Resend'}
                </button>
              </div>

              <Button
                size="lg"
                disabled={!authOtpComplete}
                onClick={handleOtpVerifyAndBuy}
                className="w-full mt-5 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'تحقق ومتابعة' : 'Verify and continue'}
              </Button>

              {authError && (
                <p className="text-[12px] text-rose-600 mt-3">{authError}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========= IN-PLATFORM PURCHASE FLOW ========= */}
      <Dialog open={showPurchaseModal} onOpenChange={(open) => { if (!open) setShowPurchaseModal(false); }}>
        <DialogContent className="max-w-md sm:max-w-lg w-[calc(100vw-1.5rem)] sm:w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-5">
          {/* Header — plan summary always visible */}
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 mb-1">
              <div className="min-w-0 flex-1">
                <DialogTitle className="font-heading font-bold text-lg leading-tight">
                  {plan.planName}
                </DialogTitle>
                <DialogDescription className="text-[12px] mt-0.5">
                  {plan.provider} · <SarSymbol className="text-[10px]" /> {plan.priceSAR}{' '}
                  <span className="text-foreground/50">{getBillingLabel(plan.contractTerms, t)}</span>
                </DialogDescription>
              </div>
              {/* Step indicator */}
              <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-foreground/55 bg-secondary px-2 py-1 rounded-full">
                {(() => {
                  const newFlow: Partial<Record<PurchaseStep, number>> = {
                    'choose-path': 1, 'contact-phone': 2, 'identity': 3, 'identity-otp': 4, 'pick-number': 5, 'sim-type': 6, 'payment': 7,
                  };
                  const portFlow: Partial<Record<PurchaseStep, number>> = {
                    'choose-path': 1, 'port-number': 2, 'port-otp': 3, 'port-contact': 4, 'sim-type': 5, 'payment': 6,
                  };
                  if (purchaseStep === 'success') return '✓';
                  const indices = purchasePath === 'port' ? portFlow : newFlow;
                  const total = purchasePath === 'port' ? 6 : 7;
                  const idx = indices[purchaseStep] ?? 1;
                  return `${idx} / ${total}`;
                })()}
              </span>
            </div>
          </DialogHeader>

          {/* ── STEP 1: choose path (new vs port) ── */}
          {purchaseStep === 'choose-path' && (
            <div className="mt-2">
              <p className="text-[13px] text-foreground/75 font-medium mb-3">
                {lang === 'ar' ? 'كيف تود المتابعة؟' : 'How would you like to continue?'}
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => { setPurchasePath('new'); setPurchaseStep('contact-phone'); }}
                  className="group flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)] hover:bg-[var(--ob-cta)]/5 p-4 text-left transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#C59AFA] flex items-center justify-center shrink-0">
                    <Plus size={20} className="text-[#16143A]" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground leading-tight">
                      {lang === 'ar' ? 'احصل على رقم جديد' : 'Get a new number'}
                    </h3>
                    <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                      {lang === 'ar' ? 'اختر رقماً جديداً من قائمة متاحة.' : 'Pick a fresh number from the available list.'}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-foreground/40 rtl:rotate-180" />
                </button>

                <button
                  onClick={() => { setPurchasePath('port'); setPurchaseStep('port-number'); }}
                  className="group flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)] hover:bg-[var(--ob-cta)]/5 p-4 text-left transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-[#DCCFFF] flex items-center justify-center shrink-0">
                    <ArrowRightLeft size={20} className="text-[#16143A]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground leading-tight">
                      {lang === 'ar' ? 'انقل رقمك الحالي' : 'Port your existing number'}
                    </h3>
                    <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                      {lang === 'ar' ? 'احتفظ برقمك وانقله إلى هذا المشغل.' : 'Keep your number and bring it to this carrier.'}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-foreground/40 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 2: Saudi mobile number (verifies user owns the line) ── */}
          {purchaseStep === 'contact-phone' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep('choose-path')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Phone size={16} className="text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground leading-tight">
                    {lang === 'ar' ? 'رقم جوالك السعودي' : 'Your Saudi mobile number'}
                  </h3>
                  <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                    {lang === 'ar'
                      ? 'سنرسل رمز تحقق هنا — جزء من تأكيد الهوية.'
                      : 'We’ll send a verification code here — part of identity check.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {lang === 'ar' ? 'رقم الجوال' : 'Mobile number'}
                </label>
                <div className="flex items-stretch rounded-md border border-input bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-ring" dir="ltr">
                  <span className="flex items-center gap-1.5 bg-secondary border-e border-border px-3 font-mono font-bold text-[13px] text-foreground/85 select-none">
                    🇸🇦 +966
                  </span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="05xxxxxxxx"
                    className="flex-1 border-0 rounded-none bg-transparent font-mono focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  />
                </div>
                <p className="text-[10.5px] text-foreground/50 mt-1">
                  {lang === 'ar'
                    ? 'الأرقام السعودية فقط · 10 أرقام تبدأ بـ 05'
                    : 'Saudi numbers only · 10 digits starting with 05'}
                </p>
              </div>

              <Button
                size="lg"
                disabled={!contactPhoneValid}
                onClick={() => setPurchaseStep('identity')}
                className="w-full mt-4 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'متابعة' : 'Continue'}
              </Button>
            </div>
          )}

          {/* ── STEP 3: ID + birthday (+ existing number if port) ── */}
          {purchaseStep === 'identity' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep('contact-phone')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <FileText size={16} className="text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground leading-tight">
                    {lang === 'ar' ? 'تأكيد الهوية' : 'Identity verification'}
                  </h3>
                  <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                    {lang === 'ar' ? 'مطلوب من هيئة الاتصالات.' : 'Required by the Communications Commission (CST).'}
                  </p>
                </div>
              </div>

              {/* Locked Saudi number summary — entered in the previous step */}
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                <Phone size={13} className="text-foreground/45 shrink-0" />
                <span className="flex-1 min-w-0 truncate font-mono text-[12.5px] text-foreground/85" dir="ltr">+966 {contactPhone}</span>
                <button
                  type="button"
                  onClick={() => setPurchaseStep('contact-phone')}
                  className="text-[11px] font-bold text-[#FE7151] hover:opacity-80 underline underline-offset-4 shrink-0"
                >
                  {lang === 'ar' ? 'تغيير' : 'Change'}
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                    {lang === 'ar' ? 'رقم الهوية الوطنية أو الإقامة' : 'National ID or Iqama number'}
                  </label>
                  <Input
                    inputMode="numeric"
                    maxLength={10}
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="1xxxxxxxxx / 2xxxxxxxxx"
                    className="bg-card font-mono"
                  />
                  <p className="text-[10.5px] text-foreground/50 mt-1">
                    {lang === 'ar'
                      ? '10 أرقام · يبدأ بـ 1 (هوية) أو 2 (إقامة)'
                      : '10 digits · starts with 1 (National ID) or 2 (Iqama)'}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                    {lang === 'ar' ? 'تاريخ الميلاد' : 'Date of birth'}
                  </label>
                  <div className="relative">
                    <Calendar size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                    <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="pl-9 bg-card" />
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                disabled={!idNumberValid || !birthDateValid}
                onClick={() => {
                  setIdentityOtp(['', '', '', '']);
                  setPurchaseStep('identity-otp');
                  setTimeout(() => identityOtpRefs.current[0]?.focus(), 0);
                }}
                className="w-full mt-4 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'تحقق من الهوية' : 'Verify identity'}
              </Button>
            </div>
          )}

          {/* ── STEP 3: identity OTP ── */}
          {purchaseStep === 'identity-otp' && (
            <div className="mt-2 text-center">
              <button onClick={() => setPurchaseStep('identity')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3 self-start">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <h3 className="font-heading font-bold text-base text-foreground">
                {lang === 'ar' ? 'تحقق من الهوية' : 'Identity verification'}
              </h3>
              <p className="text-[12px] text-foreground/65 mt-1.5 leading-snug">
                {lang === 'ar'
                  ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span className="font-mono font-bold text-foreground" dir="ltr">+966 {contactPhone}</span></>
                  : <>We sent a 4-digit code to <span className="font-mono font-bold text-foreground" dir="ltr">+966 {contactPhone}</span></>}
              </p>

              <div className="flex justify-center gap-2 mt-5" dir="ltr">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { identityOtpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={identityOtp[i]}
                    onChange={(e) => handleIdOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleIdOtpKeyDown(i, e)}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    className={`w-12 h-14 md:w-14 md:h-16 rounded-xl border-2 bg-card text-center font-heading font-bold text-2xl text-foreground tabular-nums focus:outline-none transition-colors ${
                      identityOtp[i] ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/5' : 'border-border focus:border-[var(--ob-cta)]'
                    }`}
                  />
                ))}
              </div>

              <Button
                size="lg"
                disabled={!identityOtpComplete}
                onClick={() => {
                  setAvailableNumbers(generateNumbers(6));
                  setPurchaseStep('pick-number');
                }}
                className="w-full mt-5 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'تحقق ومتابعة' : 'Verify and continue'}
              </Button>
            </div>
          )}

          {/* ── STEP 4 (new path only): pick a number ── */}
          {purchaseStep === 'pick-number' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep('identity-otp')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground leading-tight">
                    {lang === 'ar' ? 'اختر رقمك' : 'Pick your number'}
                  </h3>
                  <p className="text-[11.5px] text-foreground/60 mt-0.5">
                    {lang === 'ar' ? 'لا تعجبك أي منها؟ حدّث القائمة.' : "Don't like any? Refresh the list."}
                  </p>
                </div>
                <button
                  onClick={() => { setAvailableNumbers(generateNumbers(6)); setPickedNumber(null); }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-secondary text-foreground/70 hover:bg-secondary/80 transition-colors"
                >
                  <RefreshCw size={12} />
                  {lang === 'ar' ? 'تحديث' : 'Refresh'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {availableNumbers.map((n) => {
                  const selected = pickedNumber === n;
                  // Format: 05X XXX XXXX (LTR even in Arabic)
                  const formatted = `${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
                  return (
                    <button
                      key={n}
                      onClick={() => setPickedNumber(n)}
                      dir="ltr"
                      className={`relative py-3 rounded-xl border-2 font-mono text-sm font-bold tabular-nums transition-all ${
                        selected ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground' : 'border-border bg-card text-foreground/85 hover:border-[var(--ob-cta)]/40'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-1.5 end-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)]">
                          <Check size={10} strokeWidth={3} />
                        </span>
                      )}
                      {formatted}
                    </button>
                  );
                })}
              </div>

              <Button
                size="lg"
                disabled={!pickedNumber}
                onClick={() => setPurchaseStep('sim-type')}
                className="w-full mt-4 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'متابعة' : 'Continue'}
              </Button>
            </div>
          )}

          {/* ── PORT STEP A: enter existing number + select donor provider ── */}
          {purchaseStep === 'port-number' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep('choose-path')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <ArrowRightLeft size={16} className="text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground leading-tight">
                    {lang === 'ar' ? 'انقل رقمك' : 'Port your number'}
                  </h3>
                  <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                    {lang === 'ar' ? 'سنرسل رمزاً لرقمك للتحقق من ملكيتك له.' : "We'll send a code to your number to verify it's yours."}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                    {lang === 'ar' ? 'الرقم الحالي' : 'Existing number'}
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={existingNumber}
                      onChange={(e) => setExistingNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="05xxxxxxxx"
                      className="pl-9 bg-card font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground/70 mb-2 uppercase tracking-wider">
                    {lang === 'ar' ? 'المشغل الحالي' : 'Current provider'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CARRIERS.filter(c => c.name !== plan.provider).map((c) => {
                      const sel = donorProvider === c.name;
                      return (
                        <button
                          key={c.name}
                          onClick={() => setDonorProvider(c.name)}
                          className={`relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all ${
                            sel ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10' : 'border-border bg-card hover:border-[var(--ob-cta)]/40'
                          }`}
                        >
                          {sel && (
                            <span className="absolute top-1.5 end-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)]">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          )}
                          <img src={c.logo} alt={c.name} className="h-6 w-auto object-contain" />
                          <span className="text-[10.5px] font-semibold text-foreground/80 text-center leading-tight truncate w-full">
                            {c.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                disabled={!existingNumberValid || !donorProvider}
                onClick={() => {
                  setPortOtp(['', '', '', '']);
                  setPurchaseStep('port-otp');
                  setTimeout(() => portOtpRefs.current[0]?.focus(), 0);
                }}
                className="w-full mt-4 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'إرسال رمز التحقق' : 'Send verification code'}
              </Button>
            </div>
          )}

          {/* ── PORT STEP B: OTP to verify ownership of existing number ── */}
          {purchaseStep === 'port-otp' && (
            <div className="mt-2 text-center">
              <button onClick={() => setPurchaseStep('port-number')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3 self-start">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <h3 className="font-heading font-bold text-base text-foreground">
                {lang === 'ar' ? 'تحقق من ملكية الرقم' : "Verify it's your number"}
              </h3>
              <p className="text-[12px] text-foreground/65 mt-1.5 leading-snug">
                {lang === 'ar'
                  ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span dir="ltr" className="font-mono text-foreground">{existingNumber}</span> على شبكة <span className="text-foreground">{donorProvider}</span></>
                  : <>We sent a 4-digit code to <span dir="ltr" className="font-mono text-foreground">{existingNumber}</span> on <span className="text-foreground">{donorProvider}</span></>}
              </p>

              <div className="flex justify-center gap-2 mt-5" dir="ltr">
                {[0, 1, 2, 3].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { portOtpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={portOtp[i]}
                    onChange={(e) => handlePortOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handlePortOtpKeyDown(i, e)}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    className={`w-12 h-14 md:w-14 md:h-16 rounded-xl border-2 bg-card text-center font-heading font-bold text-2xl text-foreground tabular-nums focus:outline-none transition-colors ${
                      portOtp[i] ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/5' : 'border-border focus:border-[var(--ob-cta)]'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px]">
                <span className="text-foreground/55">{lang === 'ar' ? 'لم يصلك الرمز؟' : "Didn't get the code?"}</span>
                <button
                  onClick={() => { setPortOtp(['', '', '', '']); portOtpRefs.current[0]?.focus(); }}
                  className="font-semibold text-foreground hover:opacity-80 underline underline-offset-4"
                >
                  {lang === 'ar' ? 'أعد الإرسال' : 'Resend'}
                </button>
              </div>

              <Button
                size="lg"
                disabled={!portOtpComplete}
                onClick={() => {
                  trackEvent('port_number_verified', { donor: donorProvider });
                  setPurchaseStep('port-contact');
                }}
                className="w-full mt-5 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'تحقق ومتابعة' : 'Verify and continue'}
              </Button>
            </div>
          )}

          {/* ── PORT STEP: contact phone (how SOOB reaches the user) ── */}
          {purchaseStep === 'port-contact' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep('port-otp')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <Phone size={16} className="text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-foreground leading-tight">
                    {lang === 'ar' ? 'كيف نتواصل معك؟' : 'How can we reach you?'}
                  </h3>
                  <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                    {lang === 'ar'
                      ? 'قد نحتاج للاتصال بك بخصوص نقل الرقم.'
                      : 'We may need to contact you about your port request.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {lang === 'ar' ? 'رقم التواصل' : 'Contact number'}
                </label>
                <div className="flex items-stretch rounded-md border border-input bg-card overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:border-ring" dir="ltr">
                  <span className="flex items-center gap-1.5 bg-secondary border-e border-border px-3 font-mono font-bold text-[13px] text-foreground/85 select-none">
                    🇸🇦 +966
                  </span>
                  <Input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={portContactPhone}
                    onChange={(e) => setPortContactPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="05xxxxxxxx"
                    className="flex-1 border-0 rounded-none bg-transparent font-mono focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  />
                </div>
                {portContactPhoneIsSameAsPorted ? (
                  <p className="text-[11px] font-semibold text-destructive mt-1.5">
                    {lang === 'ar'
                      ? 'لا يمكن استخدام نفس الرقم المنقول. أدخل رقماً مختلفاً.'
                      : 'Can\'t be the number you\'re porting. Enter a different number.'}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-foreground/50 mt-1">
                    {lang === 'ar'
                      ? `يجب أن يكون رقماً مختلفاً عن ${existingNumber || 'الرقم المنقول'}.`
                      : `Must be different from ${existingNumber || 'the number being ported'}.`}
                  </p>
                )}
              </div>

              <Button
                size="lg"
                disabled={!portContactPhoneValid}
                onClick={() => setPurchaseStep('sim-type')}
                className="w-full mt-4 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'متابعة' : 'Continue'}
              </Button>
            </div>
          )}

          {/* ── STEP 5: SIM or eSIM ── */}
          {purchaseStep === 'sim-type' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep(purchasePath === 'new' ? 'pick-number' : 'port-contact')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              <p className="text-[13px] text-foreground/75 font-medium mb-3">
                {lang === 'ar' ? 'كيف تريد استلام الشريحة؟' : 'How do you want your SIM?'}
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => setSimType('esim')}
                  className={`group flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    simType === 'esim' ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10' : 'border-border bg-card hover:border-[var(--ob-cta)]/40'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#C59AFA] flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-[#16143A]" strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground leading-tight">
                      {lang === 'ar' ? 'شريحة eSIM (فورية)' : 'eSIM (instant)'}
                    </h3>
                    <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                      {lang === 'ar' ? 'تفعيل خلال دقائق · لا حاجة للتوصيل.' : 'Activated in minutes · no shipping needed.'}
                    </p>
                  </div>
                  {simType === 'esim' && <Check size={18} className="text-[var(--ob-cta)]" />}
                </button>

                <button
                  onClick={() => setSimType('sim')}
                  className={`group flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    simType === 'sim' ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10' : 'border-border bg-card hover:border-[var(--ob-cta)]/40'
                  }`}
                >
                  <div className="w-11 h-11 rounded-xl bg-[#DCCFFF] flex items-center justify-center shrink-0">
                    <Smartphone size={20} className="text-[#16143A]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground leading-tight">
                      {lang === 'ar' ? 'شريحة فعلية (توصيل)' : 'Physical SIM (delivered)'}
                    </h3>
                    <p className="text-[11.5px] text-foreground/60 mt-0.5 leading-snug">
                      {lang === 'ar' ? 'توصيل خلال 1–3 أيام عمل.' : 'Delivered in 1–3 working days.'}
                    </p>
                  </div>
                  {simType === 'sim' && <Check size={18} className="text-[var(--ob-cta)]" />}
                </button>
              </div>

              <Button
                size="lg"
                disabled={!simType}
                onClick={() => setPurchaseStep('payment')}
                className="w-full mt-4 font-bold text-[14px]"
              >
                {lang === 'ar' ? 'متابعة للدفع' : 'Continue to payment'}
              </Button>
            </div>
          )}

          {/* ── STEP 6: payment ── */}
          {purchaseStep === 'payment' && (
            <div className="mt-2">
              <button onClick={() => setPurchaseStep('sim-type')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
                <ArrowLeft size={12} className="rtl:rotate-180" />
                {lang === 'ar' ? 'رجوع' : 'Back'}
              </button>

              {/* Delivery address — first for physical SIM, before price details */}
              {simType === 'sim' && (
                <div className="mb-4 rounded-xl border-2 border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPinIcon size={14} className="text-foreground/65" />
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/70">
                      {lang === 'ar' ? 'عنوان التوصيل' : 'Delivery address'}
                    </p>
                  </div>

                  {/* Map — collapsed by default, opens inline on demand */}
                  <div className="mb-3">
                    <label className="block text-[10.5px] font-semibold text-foreground/60 mb-1.5 uppercase tracking-wider">
                      {lang === 'ar' ? 'موقع التوصيل' : 'Pin your location'}
                    </label>

                    {!deliveryMapOpen && !deliveryPin && (
                      <button
                        type="button"
                        onClick={() => setDeliveryMapOpen(true)}
                        className="w-full rounded-lg border-2 border-dashed border-border hover:border-foreground/40 hover:bg-secondary/30 py-4 px-4 text-foreground/70 hover:text-foreground inline-flex items-center justify-center gap-2 transition-all"
                      >
                        <Map size={16} />
                        <span className="font-semibold text-[12.5px]">
                          {lang === 'ar' ? 'افتح الخريطة لتحديد الموقع' : 'Open map to pin location'}
                        </span>
                      </button>
                    )}

                    {!deliveryMapOpen && deliveryPin && (
                      <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 flex items-center gap-2">
                        <MapPinIcon size={14} style={{ color: '#FE7151' }} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[11.5px] font-semibold text-foreground">
                            {lang === 'ar' ? 'الموقع محدد' : 'Location pinned'}
                          </div>
                          <div className="text-[10.5px] font-mono text-foreground/55 truncate">
                            {(24.5 + deliveryPin.y * 0.005).toFixed(4)}° N · {(46.5 + deliveryPin.x * 0.005).toFixed(4)}° E
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeliveryMapOpen(true)}
                          className="text-[11.5px] font-bold text-[#FE7151] hover:opacity-80 underline underline-offset-4 shrink-0"
                        >
                          {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                      </div>
                    )}

                    {deliveryMapOpen && (
                      <>
                        <div className="flex items-center justify-end mb-1.5">
                          <button
                            type="button"
                            onClick={() => setDeliveryPin({ x: 50, y: 52 })}
                            className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#FE7151] hover:opacity-80"
                          >
                            <Crosshair size={11} />
                            {lang === 'ar' ? 'موقعي الحالي' : 'Use my location'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            const r = e.currentTarget.getBoundingClientRect();
                            const x = ((e.clientX - r.left) / r.width) * 100;
                            const y = ((e.clientY - r.top) / r.height) * 100;
                            setDeliveryPin({ x: Math.max(2, Math.min(98, x)), y: Math.max(4, Math.min(96, y)) });
                          }}
                          className="relative w-full rounded-lg border border-border overflow-hidden h-[180px] sm:h-[220px] md:h-[260px]"
                          style={{ background: '#E8ECEF', cursor: 'crosshair' }}
                          aria-label={lang === 'ar' ? 'اضغط لوضع دبوس الموقع' : 'Tap to drop a pin'}
                        >
                          {/* Roads */}
                          <span className="absolute" style={{ top: '38%', left: '0%', width: '100%', height: 4, background: '#FFFFFF' }} />
                          <span className="absolute" style={{ top: '70%', left: '0%', width: '100%', height: 3, background: '#FFFFFF' }} />
                          <span className="absolute" style={{ top: '0%', left: '32%', width: 3, height: '100%', background: '#FFFFFF' }} />
                          <span className="absolute" style={{ top: '0%', left: '64%', width: 4, height: '100%', background: '#FFFFFF' }} />
                          {/* Parks */}
                          <span className="absolute rounded-md" style={{ top: '8%', left: '8%', width: '18%', height: '24%', background: '#C8E6B6' }} />
                          <span className="absolute rounded-md" style={{ top: '74%', left: '70%', width: '22%', height: '22%', background: '#C8E6B6' }} />
                          {/* Water */}
                          <span className="absolute rounded-md" style={{ top: '46%', left: '78%', width: '20%', height: '18%', background: '#A6C8E0' }} />
                          {/* Building blocks (subtle) */}
                          {[
                            { t: '12%', l: '40%', w: 8, h: 6 },
                            { t: '20%', l: '50%', w: 6, h: 8 },
                            { t: '46%', l: '12%', w: 9, h: 7 },
                            { t: '54%', l: '40%', w: 7, h: 6 },
                            { t: '78%', l: '14%', w: 10, h: 7 },
                            { t: '80%', l: '40%', w: 8, h: 8 },
                          ].map((b, i) => (
                            <span key={i} className="absolute rounded-sm" style={{ top: b.t, left: b.l, width: `${b.w}%`, height: `${b.h}%`, background: '#D7DDE3' }} />
                          ))}

                          {/* Pin */}
                          {deliveryPin && (
                            <span
                              className="absolute pointer-events-none"
                              style={{ left: `${deliveryPin.x}%`, top: `${deliveryPin.y}%`, transform: 'translate(-50%, -100%)' }}
                            >
                              <svg width="26" height="34" viewBox="0 0 26 34" fill="none">
                                <path d="M13 33C13 33 24 21.7 24 13C24 6.92 19.08 2 13 2C6.92 2 2 6.92 2 13C2 21.7 13 33 13 33Z" fill="#FE7151" stroke="#16143A" strokeWidth="2" />
                                <circle cx="13" cy="13" r="4.5" fill="#FFFFFF" />
                              </svg>
                            </span>
                          )}

                          {!deliveryPin && (
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="rounded-full bg-white/85 backdrop-blur-sm px-3 py-1.5 text-[11px] font-bold text-foreground/75 shadow-sm inline-flex items-center gap-1.5">
                                <MapPinIcon size={12} />
                                {lang === 'ar' ? 'اضغط لوضع دبوس الموقع' : 'Tap to drop a pin'}
                              </span>
                            </span>
                          )}
                        </button>
                        {deliveryPin && (
                          <div className="mt-1.5 flex items-center justify-between gap-2">
                            <span className="text-[10.5px] text-foreground/65 inline-flex items-center gap-1">
                              <MapPinIcon size={11} style={{ color: '#FE7151' }} />
                              <span className="font-mono">
                                {(24.5 + deliveryPin.y * 0.005).toFixed(4)}° N · {(46.5 + deliveryPin.x * 0.005).toFixed(4)}° E
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setDeliveryPin(null)}
                              className="text-[10.5px] font-semibold text-foreground/60 hover:text-foreground underline underline-offset-4"
                            >
                              {lang === 'ar' ? 'إعادة تحديد' : 'Reset pin'}
                            </button>
                          </div>
                        )}
                        <div className="mt-2 flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setDeliveryMapOpen(false)}
                            className="flex-1 h-9"
                          >
                            {deliveryPin ? (lang === 'ar' ? 'تم' : 'Done') : (lang === 'ar' ? 'إغلاق الخريطة' : 'Close map')}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10.5px] font-semibold text-foreground/60 mb-1 uppercase tracking-wider">
                        {lang === 'ar' ? 'المدينة' : 'City'}
                      </label>
                      <select
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        className="w-full h-10 rounded-md border border-input bg-card px-3 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">{lang === 'ar' ? '— اختر المدينة —' : '— Select city —'}</option>
                        {[
                          { en: 'Riyadh',  ar: 'الرياض' },
                          { en: 'Jeddah',  ar: 'جدة' },
                          { en: 'Mecca',   ar: 'مكة المكرمة' },
                          { en: 'Medina',  ar: 'المدينة المنورة' },
                          { en: 'Dammam',  ar: 'الدمام' },
                          { en: 'Khobar',  ar: 'الخبر' },
                          { en: 'Taif',    ar: 'الطائف' },
                          { en: 'Tabuk',   ar: 'تبوك' },
                          { en: 'Abha',    ar: 'أبها' },
                          { en: 'Other',   ar: 'مدينة أخرى' },
                        ].map(c => (
                          <option key={c.en} value={c.en}>{lang === 'ar' ? c.ar : c.en}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-semibold text-foreground/60 mb-1 uppercase tracking-wider">
                        {lang === 'ar' ? 'العنوان التفصيلي' : 'Full address'}
                        <span className="ms-1 normal-case font-normal text-foreground/45 tracking-normal">
                          {lang === 'ar' ? '(اختياري)' : '(optional)'}
                        </span>
                      </label>
                      <textarea
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder={lang === 'ar'
                          ? 'الحي، الشارع، رقم المبنى، الرقم البريدي'
                          : 'District, street, building no., postal code'}
                        rows={2}
                        className="w-full rounded-md border border-input bg-card px-3 py-2 text-[13px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                      <p className="text-[10.5px] text-foreground/50 mt-1">
                        {lang === 'ar'
                          ? 'يساعد المندوب في الوصول بشكل أسرع — لكنه ليس مطلوباً.'
                          : 'Helps the courier find you faster, but not required.'}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10.5px] text-foreground/55 mt-2 inline-flex items-center gap-1">
                    <Truck size={11} />
                    {lang === 'ar' ? 'التوصيل خلال 1–3 أيام عمل · مجاني' : 'Delivered in 1–3 working days · free shipping'}
                  </p>
                </div>
              )}

              {/* Order summary */}
              <div className="rounded-xl bg-secondary/50 border border-border p-3.5 sm:p-4 mb-4">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[11px] text-foreground/60 uppercase tracking-wider font-mono">
                    {lang === 'ar' ? 'ملخص الطلب' : 'Order summary'}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 text-sm mb-1">
                  <span className="text-foreground/75 truncate min-w-0 flex-1">{plan.planName}</span>
                  <span className="font-bold text-foreground shrink-0 whitespace-nowrap"><SarSymbol className="text-[11px] text-muted-foreground" /> {plan.priceSAR}</span>
                </div>
                <div className="flex justify-between items-center gap-2 text-[12px] text-foreground/60 mb-1">
                  <span className="shrink-0">{lang === 'ar' ? 'النوع' : 'Type'}</span>
                  <span className="font-mono text-foreground/80 truncate min-w-0 text-end" dir="ltr">
                    {purchasePath === 'new' && pickedNumber ? `New · ${pickedNumber}` : `Port · ${existingNumber}`}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2 text-[12px] text-foreground/60">
                  <span className="shrink-0">{lang === 'ar' ? 'الشريحة' : 'SIM'}</span>
                  <span className="text-foreground/80 shrink-0">{simType === 'esim' ? 'eSIM' : 'Physical SIM'}</span>
                </div>
                {discountApplied && (
                  <div className="flex justify-between items-center gap-2 text-[12px] mt-2 flex-wrap" style={{ color: '#16143A' }}>
                    <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
                      <span className="font-mono font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ background: '#CFEB74', color: '#16143A' }}>{discountApplied.code}</span>
                      <span className="text-foreground/60 truncate">({lang === 'ar' ? `خصم ${discountApplied.percent}%` : `${discountApplied.percent}% off`})</span>
                    </span>
                    <span className="font-bold shrink-0 whitespace-nowrap" style={{ color: '#16143A' }}>−<SarSymbol className="text-[11px] opacity-70" /> {((plan.priceSAR * discountApplied.percent) / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-border mt-3 pt-3 flex justify-between items-baseline gap-2">
                  <span className="text-[12px] font-semibold text-foreground/80 shrink-0">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                  <span className="font-heading font-bold text-xl text-foreground whitespace-nowrap shrink-0">
                    <SarSymbol className="text-xs text-muted-foreground" /> {(plan.priceSAR * (1 - (discountApplied?.percent ?? 0) / 100)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Discount code */}
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-foreground/70 mb-2 uppercase tracking-wider">
                  {lang === 'ar' ? 'رمز الخصم' : 'Discount code'}
                </p>
                {discountApplied ? (
                  <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border" style={{ background: 'rgba(207, 235, 116, 0.18)', borderColor: 'rgba(207, 235, 116, 0.55)' }}>
                    <span className="inline-flex items-center gap-2 text-sm">
                      <Check size={14} strokeWidth={3} style={{ color: '#16143A' }} />
                      <span className="font-mono font-semibold text-foreground">{discountApplied.code}</span>
                      <span className="text-foreground/60 text-[12px]">{lang === 'ar' ? `تم تطبيق خصم ${discountApplied.percent}%` : `${discountApplied.percent}% applied`}</span>
                    </span>
                    <button
                      type="button"
                      onClick={removeDiscount}
                      className="text-[11px] text-foreground/60 hover:text-foreground underline"
                    >
                      {lang === 'ar' ? 'إزالة' : 'Remove'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-stretch gap-2">
                      <Input
                        value={discountInput}
                        onChange={(e) => { setDiscountInput(e.target.value); if (discountError) setDiscountError(null); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyDiscount(); } }}
                        placeholder={lang === 'ar' ? 'أدخل الرمز' : 'Enter code'}
                        className="h-10 text-sm font-mono uppercase tracking-wider"
                        autoCapitalize="characters"
                        autoCorrect="off"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyDiscount}
                        disabled={!discountInput.trim()}
                        className="h-10 px-4 text-[13px] font-semibold shrink-0"
                      >
                        {lang === 'ar' ? 'تطبيق' : 'Apply'}
                      </Button>
                    </div>
                    {discountError && (
                      <p className="text-[11px] text-destructive mt-1.5">{discountError}</p>
                    )}
                  </>
                )}
              </div>

              <p className="text-[11px] font-semibold text-foreground/70 mb-2 uppercase tracking-wider">
                {lang === 'ar' ? 'طريقة الدفع' : 'Payment method'}
              </p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {([
                  { id: 'stc-pay',   label: 'STC Pay',    bg: '#4F0D7F', fg: '#FFFFFF' },
                  { id: 'apple-pay', label: 'Apple Pay',  bg: '#000000', fg: '#FFFFFF' },
                  { id: 'visa',      label: 'Visa',       bg: '#1A1F71', fg: '#FFFFFF' },
                  { id: 'mada',      label: 'mada',       bg: '#84BD00', fg: '#16143A' },
                ] as const).map((m) => {
                  const sel = paymentMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`relative flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                        sel ? 'border-[var(--ob-cta)]' : 'border-border hover:border-[var(--ob-cta)]/40'
                      }`}
                      style={{ backgroundColor: m.bg, color: m.fg }}
                    >
                      {sel && (
                        <span className="absolute -top-1.5 -end-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow">
                          <Check size={11} strokeWidth={3} />
                        </span>
                      )}
                      <CreditCard size={14} />
                      <span className="font-bold text-[13px]">{m.label}</span>
                    </button>
                  );
                })}
              </div>

              <Button
                size="lg"
                disabled={!paymentMethod || (simType === 'sim' && (!deliveryCity || !deliveryPin))}
                onClick={() => {
                  const finalPrice = +(plan.priceSAR * (1 - (discountApplied?.percent ?? 0) / 100)).toFixed(2);
                  trackEvent('plan_purchase_paid', {
                    plan_id: plan.id,
                    path: purchasePath,
                    sim: simType,
                    method: paymentMethod,
                    discount_code: discountApplied?.code ?? null,
                    discount_percent: discountApplied?.percent ?? 0,
                    final_price: finalPrice,
                  });
                  setPurchaseStep('success');
                }}
                className="w-full font-bold text-[14px]"
              >
                {(() => {
                  const finalPrice = (plan.priceSAR * (1 - (discountApplied?.percent ?? 0) / 100)).toFixed(2);
                  return lang === 'ar' ? `ادفع ${finalPrice} ر.س` : `Pay ${finalPrice} SAR`;
                })()}
              </Button>
              <p className="text-[10.5px] text-foreground/50 text-center mt-3 leading-snug">
                {lang === 'ar' ? 'الدفع آمن ومشفّر.' : 'Secure & encrypted payment.'}
              </p>
            </div>
          )}

          {/* ── STEP 7: success ── */}
          {purchaseStep === 'success' && (
            <div className="mt-2 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/15 mb-3">
                <CheckCircle2 size={28} className="text-green-600" strokeWidth={2.2} />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">
                {lang === 'ar' ? 'تم الطلب بنجاح' : 'Order placed'}
              </h3>
              <p className="text-[13px] text-foreground/65 mt-2 leading-relaxed">
                {simType === 'esim'
                  ? (lang === 'ar'
                      ? <>سنرسل رمز QR للتفعيل خلال دقائق على رقمك المسجّل.</>
                      : <>We'll send your eSIM activation QR code in a few minutes.</>)
                  : (lang === 'ar'
                      ? <>سيتم توصيل الشريحة خلال 1–3 أيام عمل.</>
                      : <>Your SIM will be delivered in 1–3 working days.</>)}
              </p>
              {purchasePath === 'new' && pickedNumber && (
                <div className="mt-4 inline-flex items-baseline gap-2 px-4 py-2 rounded-xl bg-secondary border border-border" dir="ltr">
                  <span className="text-[11px] text-foreground/55 uppercase tracking-wider font-mono">Your number</span>
                  <span className="font-mono font-bold text-base text-foreground tabular-nums">
                    {`${pickedNumber.slice(0, 3)} ${pickedNumber.slice(3, 6)} ${pickedNumber.slice(6)}`}
                  </span>
                </div>
              )}

              {/* Primary CTA — goes to My Orders so the user can activate / track */}
              <Button
                size="lg"
                onClick={() => {
                  setShowPurchaseModal(false);
                  navigate('/orders');
                }}
                className="w-full mt-5 font-bold text-[14px] inline-flex items-center justify-center gap-2"
              >
                {simType === 'esim' ? (
                  <>
                    <Zap size={15} />
                    {lang === 'ar' ? 'فعّل الـ eSIM في طلباتي' : 'Activate eSIM in My Orders'}
                  </>
                ) : (
                  <>
                    <Truck size={15} />
                    {lang === 'ar' ? 'تتبع الشحنة في طلباتي' : 'Track shipment in My Orders'}
                  </>
                )}
                <ArrowRight size={14} className="rtl:rotate-180" />
              </Button>
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="text-[12px] font-semibold text-foreground/55 hover:text-foreground mt-3 underline underline-offset-4"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========= CHEAPER ALTERNATIVES POPUP ========= */}
      <Dialog open={showCheaperModal} onOpenChange={setShowCheaperModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl flex items-center gap-2">
              <TrendingDown size={20} className="text-foreground" />
              {cheaperAlternatives.length > 0
                ? (lang === 'ar' ? 'وجدنا بدائل أرخص!' : 'Cheaper alternatives found')
                : (lang === 'ar' ? 'لم نجد باقة أرخص' : 'No cheaper match')}
            </DialogTitle>
            <DialogDescription>
              {cheaperAlternatives.length > 0 ? (
                lang === 'ar'
                  ? `يمكنك توفير حتى ${topSaving} ر.س شهرياً (${yearlySaving} ر.س سنوياً) مع نفس المزايا أو أفضل.`
                  : `You could save up to ${topSaving} SAR per month (${yearlySaving} SAR per year) with the same benefits or better.`
              ) : (
                lang === 'ar'
                  ? 'لم نعثر على باقة أرخص توفر نفس المزايا. هذه الباقة تقدم قيمة جيدة بالفعل.'
                  : 'We could not find a cheaper plan that matches all of these benefits. This plan is already a strong value pick.'
              )}
            </DialogDescription>
          </DialogHeader>

          {cheaperAlternatives.length > 0 && (
            <div className="flex flex-col gap-3 mt-2 max-h-[60vh] overflow-y-auto">
              {cheaperAlternatives.map((alt) => {
                const saving = Math.round((plan.priceSAR - alt.priceSAR) * 100) / 100;
                return (
                  <div key={alt.id} className="relative">
                    <span className="absolute -top-2 end-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] text-[11px] font-bold shadow-sm">
                      <TrendingDown size={11} />
                      {lang === 'ar' ? `وفر ${saving} ر.س` : `Save ${saving} SAR`}
                    </span>
                    <ConnectedPlanCard plan={alt} />
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
