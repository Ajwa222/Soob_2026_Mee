/**
 * Profile page ("/profile") — user account management and bookmarked plans.
 *
 * Logged-in view:
 *  - User info (name, email, avatar from Google)
 *  - Bookmarked plans grid (fetched from BookmarkContext)
 *  - Sign out button
 *
 * Logged-out view:
 *  - Sign in / sign up prompt with Google OAuth button
 *  - "Why create an account?" feature highlights
 *
 * Supports ?action=login query param to auto-trigger the sign-in flow.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { User, LogOut, Bookmark, Phone, Mail, Package, ChevronRight, Globe, Check, LifeBuoy, Clock, RotateCcw, Zap, Edit3, Calendar, Camera, ArrowLeft, Trash2, Sparkles, Wallet, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarkContext';
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from '../context/LanguageContext';
import { trackEvent } from '../lib/analytics';

// Mock telecom data — replaced with backend integration once line API is wired.
type MockLine = {
  id: string;
  carrier: string;
  color: string;
  plan: string;
  number: string;
  dataUsedGB: number;
  dataTotalGB: number;
  localMinUsed: number;
  localMinTotal: number | 'unlimited';
  intlMinUsed: number;
  intlMinTotal: number;
  daysLeft: number;
  simType: string;
  primary: boolean;
  expiringSoon?: boolean;
  purchasedAt: string; // ISO date — when the plan was bought
  expiresAt: string;   // ISO date — when it expires
};
const MOCK_LINES: MockLine[] = [
  { id: 'L1', carrier: 'STC',    color: '#4F0D7F', plan: 'STC Jood Plus 80',   number: '0501234567', dataUsedGB: 72, dataTotalGB: 80, localMinUsed: 320, localMinTotal: 'unlimited', intlMinUsed: 18, intlMinTotal: 100, daysLeft: 2,  simType: 'eSIM',     primary: true,  expiringSoon: true, purchasedAt: '2026-04-06', expiresAt: '2026-05-06' },
  { id: 'L2', carrier: 'Mobily', color: '#0099E5', plan: 'Mobily Connect 120', number: '0552223344', dataUsedGB: 8,  dataTotalGB: 60, localMinUsed: 145, localMinTotal: 1500,        intlMinUsed: 12, intlMinTotal: 60,  daysLeft: 22, simType: 'Physical', primary: false, purchasedAt: '2026-04-26', expiresAt: '2026-05-26' },
  { id: 'L3', carrier: 'Zain',   color: '#8DC63F', plan: 'Zain Shabab 99',     number: '0539988776', dataUsedGB: 14, dataTotalGB: 40, localMinUsed: 220, localMinTotal: 1000,        intlMinUsed: 8,  intlMinTotal: 30,  daysLeft: 4,  simType: 'eSIM',     primary: false, purchasedAt: '2026-04-08', expiresAt: '2026-05-08' },
];

function fmtDate(iso: string, isAr: boolean) {
  return new Date(iso).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}


function UsageRowOnHero({ label, used, total, unit }: { label: string; used: number; total: number | 'unlimited'; unit: string }) {
  const isUnlimited = total === 'unlimited';
  const pct = isUnlimited ? 6 : Math.min(100, Math.round((used / (total as number)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-white">{label}</span>
        <span className="font-mono font-bold text-[12px] text-white whitespace-nowrap">
          {used.toLocaleString()}
          <span className="text-white/75 font-semibold"> / {isUnlimited ? '∞' : (total as number).toLocaleString()} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/25 overflow-hidden mt-1.5">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { t, lang, setLang } = useLang();
  const { user, isLoggedIn, needsPhone, loading, loginWithGoogle, loginWithOtp, updateProfile, logout } = useAuth();
  const { bookmarks } = useBookmarks();
  const bookmarkCount = bookmarks.length;
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [searchParams] = useSearchParams();
  // Initial mode comes from localStorage / URL — but user can toggle in the UI.
  const [isSignUp, setIsSignUp] = useState(() => {
    return !localStorage.getItem('soob-has-account') || searchParams.get('tab') === 'signup';
  });

  // ── Focused line state ───────────────────────────────────────────────
  // Default to the actual primary; clicking another line swaps it into the hero.
  const defaultFocusedLineId = MOCK_LINES.find(l => l.primary)?.id ?? MOCK_LINES[0]?.id;
  const [focusedLineId, setFocusedLineId] = useState<string>(defaultFocusedLineId);

  // ── Top-up modal state ───────────────────────────────────────────────
  const TOPUP_QUICK_AMOUNTS = [10, 20, 50, 100, 200];
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [topUpCustom, setTopUpCustom] = useState('');
  const [topUpStep, setTopUpStep] = useState<'amount' | 'success'>('amount');

  const topUpFinalAmount = topUpAmount ?? (topUpCustom ? parseInt(topUpCustom, 10) : NaN);
  const topUpValid = Number.isFinite(topUpFinalAmount) && topUpFinalAmount >= 5 && topUpFinalAmount <= 1000;

  const openTopUp = () => {
    setTopUpAmount(null);
    setTopUpCustom('');
    setTopUpStep('amount');
    setShowTopUp(true);
  };
  const handleTopUpPay = () => {
    if (!topUpValid) return;
    trackEvent('topup_paid', { amount: topUpFinalAmount });
    setTopUpStep('success');
  };

  // ── Edit-profile modal state ─────────────────────────────────────────
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editStep, setEditStep] = useState<'form' | 'phone-otp' | 'email-otp'>('form');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhotoURL, setEditPhotoURL] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editPhotoError, setEditPhotoError] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState(false);
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [editOtp, setEditOtp] = useState<string[]>(['', '', '', '']);
  const editOtpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const originalPhone = (user?.phone && user.phone !== 'skipped') ? user.phone : '';
  const originalEmail = user?.email || '';
  const phoneChanged = editPhone.trim() !== originalPhone;
  const emailChanged = editEmail.trim() !== originalEmail;
  const phoneNeedsVerify = phoneChanged && editPhone.trim().length > 0 && !verifiedPhone;
  const emailNeedsVerify = emailChanged && editEmail.trim().length > 0 && !verifiedEmail;

  const openEditProfile = () => {
    const fullName = (user?.name || '').trim();
    const parts = fullName.split(/\s+/);
    setEditFirstName(parts[0] || '');
    setEditLastName(parts.slice(1).join(' '));
    setEditEmail(user?.email || '');
    setEditPhone(user?.phone && user.phone !== 'skipped' ? user.phone : '');
    setEditPhotoURL(user?.photoURL ?? null);
    setEditError('');
    setEditPhotoError('');
    setEditStep('form');
    setEditOtp(['', '', '', '']);
    setVerifiedPhone(false);
    setVerifiedEmail(false);
    setPhoneEditing(false);
    setEmailEditing(false);
    setShowEditProfile(true);
  };

  const startChangePhone = () => {
    setEditPhone('');
    setVerifiedPhone(false);
    setPhoneEditing(true);
    setEditError('');
    setTimeout(() => phoneInputRef.current?.focus(), 50);
  };
  const cancelChangePhone = () => {
    setEditPhone(originalPhone);
    setVerifiedPhone(false);
    setPhoneEditing(false);
    setEditError('');
  };
  const startChangeEmail = () => {
    setEditEmail('');
    setVerifiedEmail(false);
    setEmailEditing(true);
    setEditError('');
    setTimeout(() => emailInputRef.current?.focus(), 50);
  };
  const cancelChangeEmail = () => {
    setEditEmail(originalEmail);
    setVerifiedEmail(false);
    setEmailEditing(false);
    setEditError('');
  };

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditPhotoError('');
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setEditPhotoError(lang === 'ar' ? 'الملف ليس صورة' : 'File is not an image');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setEditPhotoError(lang === 'ar' ? 'الصورة أكبر من 4 ميجابايت' : 'Image is larger than 4 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setEditPhotoURL((ev.target?.result as string) || null);
    reader.readAsDataURL(file);
  };

  const handleEditOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...editOtp];
    next[i] = v;
    setEditOtp(next);
    if (v && i < 3) editOtpRefs.current[i + 1]?.focus();
  };
  const handleEditOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !editOtp[i] && i > 0) editOtpRefs.current[i - 1]?.focus();
  };

  const persistProfile = async (overrides: { phone?: string | null; email?: string } = {}) => {
    const first = editFirstName.trim();
    const last = editLastName.trim();
    setEditSaving(true);
    try {
      await updateProfile({
        name: last ? `${first} ${last}` : first,
        email: overrides.email !== undefined ? overrides.email : (verifiedEmail ? editEmail.trim() : originalEmail),
        phone: overrides.phone !== undefined ? overrides.phone : (verifiedPhone ? (editPhone.trim() || null) : (originalPhone || null)),
        photoURL: editPhotoURL,
      });
      trackEvent('profile_updated');
      setShowEditProfile(false);
    } catch {
      setEditError(lang === 'ar' ? 'فشل الحفظ. حاول مرة ثانية.' : 'Save failed. Try again.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setEditError('');
    const first = editFirstName.trim();
    const email = editEmail.trim();
    const phone = editPhone.trim();
    if (first.length < 2) {
      setEditError(lang === 'ar' ? 'الاسم الأول قصير جداً' : 'First name is too short');
      return;
    }
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setEditError(lang === 'ar' ? 'بريد إلكتروني غير صالح' : 'Invalid email');
      return;
    }
    if (phone && !/^[0-9+\s-]{8,}$/.test(phone)) {
      setEditError(lang === 'ar' ? 'رقم جوال غير صالح' : 'Invalid phone number');
      return;
    }
    // Walk verification gates: phone first, then email.
    if (phoneNeedsVerify) {
      setEditOtp(['', '', '', '']);
      setEditStep('phone-otp');
      setTimeout(() => editOtpRefs.current[0]?.focus(), 50);
      return;
    }
    if (emailNeedsVerify) {
      setEditOtp(['', '', '', '']);
      setEditStep('email-otp');
      setTimeout(() => editOtpRefs.current[0]?.focus(), 50);
      return;
    }
    await persistProfile();
  };

  const handleVerifyOtp = async () => {
    if (editOtp.some(d => d.length !== 1)) return;
    setEditError('');
    if (editStep === 'phone-otp') {
      setVerifiedPhone(true);
      if (emailNeedsVerify) {
        setEditOtp(['', '', '', '']);
        setEditStep('email-otp');
        setTimeout(() => editOtpRefs.current[0]?.focus(), 50);
        return;
      }
      // Persist with the verified phone immediately.
      await persistProfile({ phone: editPhone.trim() || null });
      return;
    }
    if (editStep === 'email-otp') {
      setVerifiedEmail(true);
      // Persist with both verified values.
      await persistProfile({
        phone: phoneChanged ? (editPhone.trim() || null) : (originalPhone || null),
        email: editEmail.trim(),
      });
    }
  };

  // ── OTP sign-up form state ───────────────────────────────────────────
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [authStep, setAuthStep] = useState<'form' | 'otp'>('form');
  const [authKind, setAuthKind] = useState<'phone' | 'email'>('phone');
  const [authContact, setAuthContact] = useState('');
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authOtp, setAuthOtp] = useState<string[]>(['', '', '', '']);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  const contactValid = (() => {
    const v = authContact.trim();
    if (!v) return false;
    if (authKind === 'phone') return /^[0-9+\s-]{8,}$/.test(v);
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
  })();
  const namesValid = !isSignUp || (authFirstName.trim().length >= 2 && authLastName.trim().length >= 2);
  const otpComplete = authOtp.every(d => d.length === 1);

  const handleOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...authOtp];
    next[i] = v;
    setAuthOtp(next);
    if (v && i < 3) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !authOtp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasted) return;
    e.preventDefault();
    const next = ['', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setAuthOtp(next);
    otpRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleOtpVerify = async () => {
    setError('');
    if (signingIn) return;
    setSigningIn(true);
    try {
      const fullName = isSignUp
        ? `${authFirstName.trim()} ${authLastName.trim()}`.trim()
        : undefined;
      await loginWithOtp(authKind, authContact.trim(), fullName);
      trackEvent(isSignUp ? 'signup' : 'login', { method: authKind });
      redirectAfterLogin(isSignUp);
    } catch {
      setError(lang === 'ar' ? 'فشل التحقق. حاول مرة ثانية.' : 'Verification failed. Try again.');
    } finally {
      setSigningIn(false);
    }
  };
  const hasPendingBookmark = useMemo(() => !!localStorage.getItem('soob-pending-bookmark'), []);
  const navTo = useNavigate();

  const redirectAfterLogin = (signup: boolean) => {
    if (localStorage.getItem('soob-finder-pending')) {
      navTo('/advisor?reveal=1');
    } else if (signup) {
      navTo('/advisor');
    } else {
      navTo('/home');
    }
  };

  useEffect(() => {
    if (isLoggedIn && !needsPhone && localStorage.getItem('soob-auth-redirect') === 'pending') {
      const wasSignUp = localStorage.getItem('soob-auth-flow') === 'signup';
      localStorage.removeItem('soob-auth-redirect');
      localStorage.removeItem('soob-auth-flow');
      redirectAfterLogin(wasSignUp);
    }
  }, [isLoggedIn, needsPhone]);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setError('');
    setSigningIn(true);
    try {
      const wasSignUp = isSignUp;
      localStorage.setItem('soob-auth-flow', wasSignUp ? 'signup' : 'signin');
      await loginWithGoogle();
      trackEvent(wasSignUp ? 'signup' : 'login', { method: 'google' });
      localStorage.removeItem('soob-auth-flow');
      redirectAfterLogin(wasSignUp);
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Google sign-in failed:', err);
      const code = (err as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      if (code === 'auth/popup-blocked') return;
      if (code === 'auth/network-request-failed') {
        setError(lang === 'ar' ? 'خطأ في الاتصال. تحقق من الإنترنت وحاول مرة ثانية.' : 'Network error. Check your connection and try again.');
      } else if (code === 'auth/user-disabled') {
        setError(lang === 'ar' ? 'هذا الحساب معطّل. تواصل مع الدعم.' : 'This account has been disabled. Contact support.');
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError(lang === 'ar' ? 'يوجد حساب بهذا الإيميل بطريقة تسجيل مختلفة.' : 'An account already exists with this email using a different sign-in method.');
      } else {
        setError(lang === 'ar' ? 'فشل تسجيل الدخول. حاول مرة ثانية.' : 'Sign-in failed. Please try again.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="safe-pb flex items-center justify-center min-h-[calc(100dvh-72px)]">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Logged-in view — V7 Usage Dashboard
  if (isLoggedIn) {
    // The hero shows the *focused* line, which defaults to the primary but can
    // swap to any line when the user taps it in the "other lines" list.
    const focused = MOCK_LINES.find(l => l.id === focusedLineId) ?? MOCK_LINES[0];
    const pct = Math.round((focused.dataUsedGB / focused.dataTotalGB) * 100);
    const remaining = focused.dataTotalGB - focused.dataUsedGB;
    const displayName = user?.name || user?.phone || '';
    const initial = (displayName || '?').slice(0, 2).toUpperCase();
    const otherLines = MOCK_LINES.filter(l => l.id !== focused.id);

    return (
      <div className="safe-pb">
        <div className="max-w-md md:max-w-2xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-4 lg:pt-8 pb-20 lg:pb-28 space-y-4 lg:space-y-6">
          {/* User chip — full width header */}
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold text-[13px] lg:text-[15px] shadow-sm" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
                {initial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-heading font-bold text-[14px] lg:text-[17px] text-foreground truncate">
                {t('profile.welcome')}, {displayName}
              </div>
            </div>
            <button
              type="button"
              onClick={openEditProfile}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-secondary/60 hover:border-foreground/30 transition-colors px-3 py-1.5 lg:px-3.5 lg:py-2 text-foreground/80 hover:text-foreground"
              aria-label={lang === 'ar' ? 'تعديل المعلومات' : 'Edit information'}
            >
              <Edit3 size={13} />
              <span className="text-[12px] lg:text-[12.5px] font-semibold">
                {lang === 'ar' ? 'تعديل المعلومات' : 'Edit information'}
              </span>
            </button>
          </div>

          {/* Responsive grid: stacked on mobile/tablet, 2-column on desktop */}
          <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 lg:gap-6 lg:items-start">
            {/* ── LEFT column: hero + other lines ────────────────────────── */}
            <div className="space-y-4 lg:space-y-5">
          {/* Hero — shows the focused line; click "other lines" to swap */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 lg:p-6 text-white shadow-md transition-colors"
            style={{ background: focused.color }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[11px] uppercase tracking-widest font-bold text-white/85">{focused.carrier}</div>
                <div className="font-heading font-bold text-[16px] mt-0.5 text-white">{focused.plan}</div>
                <div className="font-mono text-[12.5px] text-white/90 mt-0.5" dir="ltr">{focused.number}</div>
              </div>
              {focused.primary && (
                <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white">
                  {lang === 'ar' ? 'الأساسي' : 'Primary'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(pct / 100) * 276} 276`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="font-heading font-bold text-2xl leading-none text-white">{remaining}</div>
                  <div className="text-[10.5px] font-semibold text-white/90 mt-0.5">GB {lang === 'ar' ? 'متبقي' : 'left'}</div>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <UsageRowOnHero
                  label={lang === 'ar' ? 'البيانات' : 'Data'}
                  used={focused.dataUsedGB}
                  total={focused.dataTotalGB}
                  unit="GB"
                />
                <UsageRowOnHero
                  label={lang === 'ar' ? 'مكالمات محلية' : 'Local calls'}
                  used={focused.localMinUsed}
                  total={focused.localMinTotal}
                  unit={lang === 'ar' ? 'د' : 'min'}
                />
                <UsageRowOnHero
                  label={lang === 'ar' ? 'مكالمات دولية' : 'International'}
                  used={focused.intlMinUsed}
                  total={focused.intlMinTotal}
                  unit={lang === 'ar' ? 'د' : 'min'}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] font-semibold text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={12} /> {focused.daysLeft} {lang === 'ar' ? 'أيام للتجديد' : 'days to renewal'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} />
                <span className="text-white/75 me-1">{lang === 'ar' ? 'الشراء' : 'Purchased'}</span>
                {fmtDate(focused.purchasedAt, lang === 'ar')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={12} />
                <span className="text-white/75 me-1">{lang === 'ar' ? 'الانتهاء' : 'Expires'}</span>
                {fmtDate(focused.expiresAt, lang === 'ar')}
              </span>
            </div>
            {/* Action row — Renew (when expiring) + Top up (always available) */}
            {focused.daysLeft <= 2 ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => trackEvent('renew_clicked')}
                  className="rounded-lg bg-white text-[#16143A] hover:bg-white/90 py-2.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold transition-colors"
                >
                  <RotateCcw size={14} />
                  {lang === 'ar'
                    ? `جدّد — ${focused.daysLeft} ${focused.daysLeft === 1 ? 'يوم' : 'أيام'}`
                    : `Renew — ${focused.daysLeft}d`}
                </button>
                <button
                  type="button"
                  onClick={openTopUp}
                  className="rounded-lg bg-white/25 hover:bg-white/35 text-white py-2.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold transition-colors"
                >
                  <Wallet size={14} />
                  {lang === 'ar' ? 'شحن رصيد' : 'Top up'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openTopUp}
                className="mt-4 w-full rounded-lg bg-white text-[#16143A] hover:bg-white/90 py-2.5 inline-flex items-center justify-center gap-1.5 text-[13px] font-bold transition-colors"
              >
                <Wallet size={14} />
                {lang === 'ar' ? 'شحن رصيد' : 'Top up'}
              </button>
            )}
          </div>

          {/* Other lines */}
          {otherLines.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
                  {lang === 'ar' ? 'خطوطي الأخرى' : 'My other lines'}
                </p>
                <span className="text-[10.5px] text-foreground/45 font-mono">{otherLines.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
                {otherLines.map(l => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setFocusedLineId(l.id);
                      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    aria-label={lang === 'ar' ? `عرض ${l.plan}` : `View ${l.plan}`}
                    className="text-start rounded-xl bg-card border border-border hover:border-foreground/30 hover:shadow-sm transition-all p-3 flex items-start gap-3"
                  >
                    <span className="w-2 h-10 rounded-full shrink-0 mt-0.5" style={{ background: l.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="font-heading font-bold text-[13px] text-foreground truncate flex-1 min-w-0">{l.plan}</div>
                        {l.primary && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(22, 20, 58, 0.10)', color: '#16143A' }}>
                            {lang === 'ar' ? 'الأساسي' : 'Primary'}
                          </span>
                        )}
                        {l.expiringSoon && (
                          <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0" style={{ background: 'rgba(254, 113, 81, 0.18)', color: '#FE7151' }}>
                            {lang === 'ar' ? `${l.daysLeft}ي` : `${l.daysLeft}d`}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-foreground/55 mt-0.5 inline-flex items-center gap-2">
                        <span className="font-mono" dir="ltr">{l.number}</span>
                        <span>·</span>
                        <span>{l.dataUsedGB}/{l.dataTotalGB} GB</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px] text-foreground/55">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} />
                          <span className="text-foreground/40 me-0.5">{lang === 'ar' ? 'الشراء' : 'Purchased'}</span>
                          {fmtDate(l.purchasedAt, lang === 'ar')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={10} />
                          <span className="text-foreground/40 me-0.5">{lang === 'ar' ? 'الانتهاء' : 'Expires'}</span>
                          {fmtDate(l.expiresAt, lang === 'ar')}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}
            </div>
            {/* ── End LEFT column ─────────────────────────────────────────── */}

            {/* ── RIGHT column: tiles + settings ──────────────────────────── */}
            <div className="space-y-4 lg:space-y-5">
          {/* Dashboard tile grid */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
              {lang === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
            </p>
            <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
              {/* My Orders — lavender */}
              <Link
                to="/orders"
                className="group relative overflow-hidden rounded-2xl p-3.5 text-start transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: '#C59AFA' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="w-9 h-9 rounded-lg bg-white/35 backdrop-blur-sm flex items-center justify-center">
                    <Package size={17} style={{ color: '#16143A' }} strokeWidth={2.4} />
                  </span>
                  <ChevronRight size={14} className="text-[#16143A]/55 group-hover:text-[#16143A] rtl:rotate-180 transition-colors" />
                </div>
                <div className="font-heading font-bold text-2xl leading-none" style={{ color: '#16143A' }}>9</div>
                <div className="font-heading font-bold text-[13px] mt-0.5" style={{ color: '#16143A' }}>
                  {lang === 'ar' ? 'طلباتي' : 'My Orders'}
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(22,20,58,0.65)' }}>
                  {lang === 'ar' ? '2 تحتاج إجراء' : '2 need action'}
                </div>
              </Link>

              {/* Bookmarks — coral (plans, vouchers, anything saved) */}
              <Link
                to="/saved"
                className="group relative overflow-hidden rounded-2xl p-3.5 text-start transition-all hover:-translate-y-0.5 hover:shadow-md text-white"
                style={{ background: '#FE7151' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="w-9 h-9 rounded-lg bg-white/25 backdrop-blur-sm flex items-center justify-center">
                    <Bookmark size={17} className="text-white" strokeWidth={2.4} fill="currentColor" />
                  </span>
                  <ChevronRight size={14} className="text-white/70 group-hover:text-white rtl:rotate-180 transition-colors" />
                </div>
                <div className="font-heading font-bold text-2xl leading-none">{bookmarkCount}</div>
                <div className="font-heading font-bold text-[13px] mt-0.5">
                  {lang === 'ar' ? 'المفضلة' : 'Bookmarks'}
                </div>
                <div className="text-[10.5px] mt-0.5 opacity-85">
                  {bookmarkCount > 0
                    ? (lang === 'ar' ? 'باقات وقسائم محفوظة' : 'Plans, vouchers & more')
                    : (lang === 'ar' ? 'احفظ ما يهمك' : 'Save anything to revisit')}
                </div>
              </Link>

              {/* Switch & Save — lime */}
              <Link
                to="/switch"
                className="group relative overflow-hidden rounded-2xl p-3.5 text-start transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: '#CFEB74' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#16143A' }}>
                    <Zap size={17} style={{ color: '#CFEB74' }} strokeWidth={2.4} />
                  </span>
                  <ChevronRight size={14} className="text-[#16143A]/55 group-hover:text-[#16143A] rtl:rotate-180 transition-colors" />
                </div>
                <div className="font-heading font-bold text-2xl leading-none" style={{ color: '#16143A' }}>
                  80<span className="text-base"> SAR</span>
                </div>
                <div className="font-heading font-bold text-[13px] mt-0.5" style={{ color: '#16143A' }}>
                  {lang === 'ar' ? 'وفّر شهرياً' : 'Save / month'}
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(22,20,58,0.65)' }}>
                  {lang === 'ar' ? 'بدّل خط Mobily' : 'Switch your Mobily line'}
                </div>
              </Link>

              {/* Plan finder — soft lavender, brand-aligned with the rest */}
              <Link
                to="/advisor"
                className="group relative overflow-hidden rounded-2xl p-3.5 text-start transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: '#E1CDFC' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#16143A' }}>
                    <Sparkles size={17} style={{ color: '#C59AFA' }} strokeWidth={2.4} />
                  </span>
                  <ChevronRight size={14} className="text-[#16143A]/55 group-hover:text-[#16143A] rtl:rotate-180 transition-colors" />
                </div>
                <div className="font-heading font-bold text-2xl leading-none" style={{ color: '#16143A' }}>
                  150<span className="text-base">+</span>
                </div>
                <div className="font-heading font-bold text-[13px] mt-0.5" style={{ color: '#16143A' }}>
                  {lang === 'ar' ? 'مرشد الباقات' : 'Plan finder'}
                </div>
                <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(22,20,58,0.65)' }}>
                  {lang === 'ar' ? 'الذكاء الاصطناعي يختار لك' : 'AI matches the right plan'}
                </div>
              </Link>

            </div>
          </div>

          {/* Preferences group — Language + Support as iOS-style rows */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2 px-1">
              {lang === 'ar' ? 'التفضيلات' : 'Preferences'}
            </p>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLangPicker(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 text-start transition-colors"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#CFEB74' }}>
                  <Globe size={15} style={{ color: '#16143A' }} />
                </span>
                <span className="flex-1 font-semibold text-[13.5px] text-foreground">
                  {lang === 'ar' ? 'اللغة' : 'Language'}
                </span>
                <span className="text-[12px] text-foreground/55">{LANG_LABELS[lang]}</span>
                <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && typeof window.Intercom === 'function') {
                    window.Intercom('show');
                  } else {
                    const fab = document.querySelector<HTMLButtonElement>('button[aria-label="Support"], button[aria-label="الدعم"]');
                    fab?.click();
                  }
                  trackEvent('support_opened_from_profile');
                }}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 text-start transition-colors"
              >
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(254, 113, 81, 0.15)' }}>
                  <LifeBuoy size={15} style={{ color: '#FE7151' }} />
                </span>
                <span className="flex-1 font-semibold text-[13.5px] text-foreground">
                  {lang === 'ar' ? 'الدعم والمساعدة' : 'Help & Support'}
                </span>
                <span className="inline-flex items-center gap-1 me-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    {lang === 'ar' ? 'متاح' : 'Online'}
                  </span>
                </span>
                <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Sign out — separate, red, full-width */}
          <button
            type="button"
            onClick={() => { trackEvent('logout'); logout(); }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-destructive/25 bg-destructive/5 hover:bg-destructive/10 px-4 py-3 text-destructive font-bold text-[13.5px] transition-colors"
          >
            <LogOut size={15} />
            {t('profile.logout')}
          </button>
            </div>
            {/* ── End RIGHT column ────────────────────────────────────────── */}
          </div>
          {/* ── End responsive grid ───────────────────────────────────────── */}

          {/* Edit profile modal — multi-step (form → phone OTP → email OTP) */}
          <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
                  {editStep === 'form' ? (
                    <>
                      <Edit3 size={16} style={{ color: '#FE7151' }} />
                      {lang === 'ar' ? 'تعديل المعلومات' : 'Edit your info'}
                    </>
                  ) : editStep === 'phone-otp' ? (
                    <>
                      <Phone size={16} style={{ color: '#FE7151' }} />
                      {lang === 'ar' ? 'تحقق من الجوال' : 'Verify phone number'}
                    </>
                  ) : (
                    <>
                      <Mail size={16} style={{ color: '#FE7151' }} />
                      {lang === 'ar' ? 'تحقق من البريد' : 'Verify email'}
                    </>
                  )}
                </DialogTitle>
              </DialogHeader>

              {editStep === 'form' && (
                <div className="mt-2 space-y-3">
                  {/* Avatar editor */}
                  <div className="flex flex-col items-center pt-1 pb-2">
                    <div className="relative">
                      {editPhotoURL ? (
                        <img src={editPhotoURL} alt="" className="w-20 h-20 rounded-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
                          {(editFirstName || user?.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        aria-label={lang === 'ar' ? 'تغيير الصورة' : 'Change photo'}
                        className="absolute -bottom-1 -end-1 w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center shadow-md hover:scale-105 transition-transform"
                      >
                        <Camera size={14} />
                      </button>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoPick}
                        className="hidden"
                      />
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[11.5px] font-semibold text-foreground underline underline-offset-4 hover:opacity-80"
                      >
                        {editPhotoURL
                          ? (lang === 'ar' ? 'تغيير الصورة' : 'Change photo')
                          : (lang === 'ar' ? 'إضافة صورة' : 'Add photo')}
                      </button>
                      {editPhotoURL && (
                        <button
                          type="button"
                          onClick={() => setEditPhotoURL(null)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-destructive hover:opacity-80"
                        >
                          <Trash2 size={11} />
                          {lang === 'ar' ? 'إزالة' : 'Remove'}
                        </button>
                      )}
                    </div>
                    {editPhotoError && (
                      <p className="text-[11px] font-semibold text-destructive mt-1">{editPhotoError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                        {lang === 'ar' ? 'الاسم الأول' : 'First name'}
                      </label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
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
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder={lang === 'ar' ? 'العتيبي' : 'Al-Otaibi'}
                        autoComplete="family-name"
                        className="bg-card"
                      />
                    </div>
                  </div>

                  {/* Email — locked by default, "Change" unlocks editing */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                        {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                      </label>
                      {emailEditing && emailChanged && editEmail.trim().length > 0 && (
                        verifiedEmail
                          ? <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
                              <Check size={10} strokeWidth={3} /> {lang === 'ar' ? 'تم التحقق' : 'Verified'}
                            </span>
                          : <span className="text-[10.5px] font-bold text-[#FE7151]">
                              {lang === 'ar' ? 'يحتاج تحقق' : 'Needs verification'}
                            </span>
                      )}
                    </div>
                    {!emailEditing ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                        <Mail size={14} className="text-foreground/45 shrink-0" />
                        <span className="flex-1 min-w-0 truncate text-[13px] text-foreground/85">
                          {originalEmail || <span className="text-foreground/45">{lang === 'ar' ? 'لا يوجد بريد' : 'No email on file'}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={startChangeEmail}
                          className="text-[11.5px] font-bold text-[#FE7151] hover:opacity-80 underline underline-offset-4 shrink-0"
                        >
                          {originalEmail
                            ? (lang === 'ar' ? 'تغيير البريد' : 'Change email')
                            : (lang === 'ar' ? 'إضافة بريد' : 'Add email')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Mail size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                          <Input
                            ref={emailInputRef}
                            type="email"
                            value={editEmail}
                            onChange={(e) => { setEditEmail(e.target.value); setVerifiedEmail(false); }}
                            placeholder={lang === 'ar' ? 'البريد الجديد' : 'New email address'}
                            autoComplete="email"
                            className="pl-9 bg-card"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10.5px] text-foreground/55">
                            {lang === 'ar' ? 'سنرسل رمز تحقق للبريد الجديد' : 'We’ll send a verification code to the new email'}
                          </p>
                          <button
                            type="button"
                            onClick={cancelChangeEmail}
                            className="text-[11px] font-semibold text-foreground/60 hover:text-foreground underline underline-offset-4"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Phone — locked by default, "Change" unlocks editing */}
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="block text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">
                        {lang === 'ar' ? 'رقم الجوال' : 'Phone number'}
                      </label>
                      {phoneEditing && phoneChanged && editPhone.trim().length > 0 && (
                        verifiedPhone
                          ? <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
                              <Check size={10} strokeWidth={3} /> {lang === 'ar' ? 'تم التحقق' : 'Verified'}
                            </span>
                          : <span className="text-[10.5px] font-bold text-[#FE7151]">
                              {lang === 'ar' ? 'يحتاج تحقق' : 'Needs verification'}
                            </span>
                      )}
                    </div>
                    {!phoneEditing ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                        <Phone size={14} className="text-foreground/45 shrink-0" />
                        <span className="flex-1 min-w-0 truncate font-mono text-[13px] text-foreground/85" dir="ltr">
                          {originalPhone || <span className="text-foreground/45 font-sans">{lang === 'ar' ? 'لا يوجد رقم' : 'No phone on file'}</span>}
                        </span>
                        <button
                          type="button"
                          onClick={startChangePhone}
                          className="text-[11.5px] font-bold text-[#FE7151] hover:opacity-80 underline underline-offset-4 shrink-0"
                        >
                          {originalPhone
                            ? (lang === 'ar' ? 'تغيير الرقم' : 'Change number')
                            : (lang === 'ar' ? 'إضافة رقم' : 'Add number')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                          <Input
                            ref={phoneInputRef}
                            type="tel"
                            inputMode="numeric"
                            value={editPhone}
                            onChange={(e) => { setEditPhone(e.target.value); setVerifiedPhone(false); }}
                            placeholder={lang === 'ar' ? 'الرقم الجديد' : 'New phone number'}
                            autoComplete="tel"
                            className="pl-9 bg-card font-mono"
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-[10.5px] text-foreground/55">
                            {lang === 'ar' ? 'سنرسل رمز تحقق للرقم الجديد' : 'We’ll send a verification code to the new number'}
                          </p>
                          <button
                            type="button"
                            onClick={cancelChangePhone}
                            className="text-[11px] font-semibold text-foreground/60 hover:text-foreground underline underline-offset-4"
                          >
                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {editError && (
                    <p className="text-[12px] font-semibold text-destructive">{editError}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      onClick={() => setShowEditProfile(false)}
                      disabled={editSaving}
                      className="flex-1"
                    >
                      {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      disabled={editSaving}
                      className="flex-1 font-bold"
                    >
                      {editSaving
                        ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                        : phoneNeedsVerify || emailNeedsVerify
                          ? (lang === 'ar' ? 'متابعة' : 'Continue')
                          : (lang === 'ar' ? 'حفظ' : 'Save')}
                    </Button>
                  </div>
                </div>
              )}

              {(editStep === 'phone-otp' || editStep === 'email-otp') && (
                <div className="mt-2 space-y-3">
                  <button
                    type="button"
                    onClick={() => { setEditStep('form'); setEditError(''); }}
                    className="inline-flex items-center gap-1 text-[12px] text-foreground/65 hover:text-foreground underline-offset-2 hover:underline"
                  >
                    <ArrowLeft size={12} className="rtl:rotate-180" />
                    {lang === 'ar' ? 'تعديل التفاصيل' : 'Edit details'}
                  </button>

                  <p className="text-[12.5px] text-foreground/75 leading-snug">
                    {editStep === 'phone-otp' ? (
                      lang === 'ar'
                        ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span className="font-mono font-bold text-foreground" dir="ltr">{editPhone.trim()}</span>. أدخله للتأكد أن هذا الرقم لك.</>
                        : <>We sent a 4-digit code to <span className="font-mono font-bold text-foreground" dir="ltr">{editPhone.trim()}</span>. Enter it to confirm this number is yours.</>
                    ) : (
                      lang === 'ar'
                        ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span className="font-bold text-foreground">{editEmail.trim()}</span>. أدخله للتأكد أن هذا البريد لك.</>
                        : <>We sent a 4-digit code to <span className="font-bold text-foreground">{editEmail.trim()}</span>. Enter it to confirm this email is yours.</>
                    )}
                  </p>

                  <div className="flex gap-2 justify-center" dir="ltr">
                    {editOtp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { editOtpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleEditOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleEditOtpKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-border bg-card focus:border-[var(--ob-cta)] focus:outline-none"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="text-[11.5px] text-foreground/55 hover:text-foreground underline underline-offset-4 mx-auto block"
                    onClick={() => setEditOtp(['', '', '', ''])}
                  >
                    {lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend code'}
                  </button>

                  {editError && (
                    <p className="text-[12px] font-semibold text-destructive text-center">{editError}</p>
                  )}

                  <Button
                    onClick={handleVerifyOtp}
                    disabled={editOtp.some(d => d.length !== 1) || editSaving}
                    className="w-full font-bold"
                  >
                    {editSaving
                      ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                      : (lang === 'ar' ? 'تحقق ومتابعة' : 'Verify & continue')}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Top-up modal — quick chips + custom amount + pay */}
          <Dialog open={showTopUp} onOpenChange={(o) => { if (!o) setShowTopUp(false); }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
                  <Wallet size={16} style={{ color: '#FE7151' }} />
                  {lang === 'ar' ? 'شحن رصيد' : 'Top up balance'}
                </DialogTitle>
              </DialogHeader>

              {topUpStep === 'amount' && (
                <div className="mt-2 space-y-4">
                  {/* Selected line summary */}
                  <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/30 p-2.5">
                    <span className="w-1.5 h-9 rounded-full shrink-0" style={{ background: focused.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-heading font-bold text-[12.5px] text-foreground truncate">{focused.plan}</div>
                      <div className="font-mono text-[11px] text-foreground/55" dir="ltr">{focused.number}</div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">
                      {focused.carrier}
                    </span>
                  </div>

                  {/* Quick amount chips */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
                      {lang === 'ar' ? 'مبلغ سريع' : 'Quick amount'}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {TOPUP_QUICK_AMOUNTS.map(amount => {
                        const selected = topUpAmount === amount && !topUpCustom;
                        return (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => { setTopUpAmount(amount); setTopUpCustom(''); }}
                            className={`rounded-xl border-2 py-2.5 font-mono font-bold text-[14px] transition-all ${
                              selected
                                ? 'border-[#16143A] bg-[#16143A] text-white'
                                : 'border-border bg-card text-foreground hover:border-foreground/30'
                            }`}
                          >
                            {amount}
                            <span className="text-[10px] font-sans font-semibold opacity-70 ms-1">
                              {lang === 'ar' ? 'ر.س' : 'SAR'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom amount */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
                      {lang === 'ar' ? 'مبلغ مخصص' : 'Custom amount'}
                    </label>
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={topUpCustom}
                        onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setTopUpCustom(v);
                          setTopUpAmount(null);
                        }}
                        placeholder={lang === 'ar' ? 'مثلاً 49 أو 75' : 'e.g. 49 or 75'}
                        className="bg-card font-mono pr-12 text-[15px]"
                      />
                      <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[11px] font-mono font-bold text-foreground/55">
                        {lang === 'ar' ? 'ر.س' : 'SAR'}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-foreground/50 mt-1">
                      {lang === 'ar' ? 'الحد الأدنى 5 ر.س · الحد الأقصى 1000 ر.س' : 'Min 5 SAR · max 1000 SAR'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
                    <span className="text-[12px] text-foreground/65">{lang === 'ar' ? 'إجمالي الدفع' : 'Total to pay'}</span>
                    <span className="font-heading font-bold text-lg text-foreground">
                      {topUpValid ? topUpFinalAmount : '—'} <span className="text-[12px] text-foreground/55">{lang === 'ar' ? 'ر.س' : 'SAR'}</span>
                    </span>
                  </div>

                  <Button
                    onClick={handleTopUpPay}
                    disabled={!topUpValid}
                    className="w-full font-bold"
                  >
                    {topUpValid
                      ? (lang === 'ar'
                          ? `ادفع ${topUpFinalAmount} ر.س`
                          : `Pay ${topUpFinalAmount} SAR`)
                      : (lang === 'ar' ? 'اختر مبلغاً' : 'Pick an amount')}
                  </Button>
                </div>
              )}

              {topUpStep === 'success' && (
                <div className="mt-2 text-center py-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={28} className="text-emerald-600" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    {lang === 'ar' ? 'تم الشحن' : 'Top-up successful'}
                  </h3>
                  <p className="text-[13px] text-foreground/65 mt-1.5 leading-snug">
                    {lang === 'ar'
                      ? <>تم إضافة <span className="font-mono font-bold text-foreground">{topUpFinalAmount} ر.س</span> إلى <span className="font-mono font-bold text-foreground" dir="ltr">{focused.number}</span></>
                      : <>Added <span className="font-mono font-bold text-foreground">{topUpFinalAmount} SAR</span> to <span className="font-mono font-bold text-foreground" dir="ltr">{focused.number}</span></>}
                  </p>
                  <Button onClick={() => setShowTopUp(false)} className="w-full mt-4 font-bold">
                    {lang === 'ar' ? 'تم' : 'Done'}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Language picker modal */}
          <Dialog open={showLangPicker} onOpenChange={setShowLangPicker}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
                  <Globe size={18} style={{ color: '#CFEB74' }} />
                  {lang === 'ar' ? 'اختر اللغة' : 'Choose language'}
                </DialogTitle>
              </DialogHeader>
              <div className="mt-2 space-y-1.5">
                {SUPPORTED_LANGS.map((l) => {
                  const isCurrent = lang === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setLang(l as Lang); setShowLangPicker(false); }}
                      className={`w-full inline-flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition-all ${
                        isCurrent
                          ? 'border-[#16143A] bg-[#CFEB74]/30'
                          : 'border-border bg-card hover:border-foreground/30 hover:bg-secondary/40'
                      }`}
                    >
                      <span className="font-heading font-bold text-base text-foreground flex-1 text-start">
                        {LANG_LABELS[l]}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/45">
                        {l}
                      </span>
                      {isCurrent && (
                        <span className="w-5 h-5 rounded-full inline-flex items-center justify-center" style={{ background: '#16143A' }}>
                          <Check size={11} strokeWidth={3} className="text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    );
  }

  // Not logged in
  return (
    <div className="safe-pb flex flex-col md:min-h-[calc(100dvh-72px)]">
      {/* Mobile header */}
      <div className="md:hidden relative flex items-center justify-center pt-16 pb-10 bg-primary">
        <div className="max-w-md w-full mx-auto px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">
            {isSignUp ? t('profile.signUpTitle') : t('profile.title')}
          </h1>
          <p className="text-white/70 mt-1 text-sm">
            {isSignUp ? t('profile.signUpSubtitle') : t('profile.subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="bg-background md:flex md:flex-1 md:items-center md:justify-center md:py-12 md:px-8">
        <Card className="max-w-md w-full mx-auto md:shadow-lg">
          {/* Desktop header */}
          <div className="hidden md:block text-center px-10 pt-10 pb-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <User size={28} className="text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl text-foreground">
              {isSignUp ? t('profile.signUpTitle') : t('profile.title')}
            </h1>
            <p className="text-muted-foreground mt-2 text-base leading-relaxed max-w-sm mx-auto">
              {isSignUp ? t('profile.signUpSubtitle') : t('profile.subtitle')}
            </p>
          </div>

          <CardContent className="px-6 md:px-10 pt-8 md:pt-6 pb-8 md:pb-10">
            {hasPendingBookmark && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-primary/10 text-primary text-sm font-medium">
                <Bookmark size={16} />
                {t('bookmark.loginPrompt')}
              </div>
            )}

            {authStep === 'form' && (
              <>
                {/* First + last name (sign-up only) */}
                {isSignUp && (
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
                <div className="mb-3">
                  <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                    {authKind === 'phone'
                      ? (lang === 'ar' ? 'رقم الجوال' : 'Phone number')
                      : (lang === 'ar' ? 'البريد الإلكتروني' : 'Email')}
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
                    onClick={() => {
                      setAuthKind(authKind === 'phone' ? 'email' : 'phone');
                      setAuthContact('');
                    }}
                    className="inline-flex items-center gap-1.5 mt-2 text-[12px] text-foreground/65 hover:text-foreground transition-colors"
                  >
                    {authKind === 'phone' ? <Mail size={12} /> : <Phone size={12} />}
                    <span className="underline underline-offset-4">
                      {authKind === 'phone'
                        ? (lang === 'ar' ? 'أو استخدم البريد الإلكتروني' : 'or use email instead')
                        : (lang === 'ar' ? 'أو استخدم رقم الجوال' : 'or use phone instead')}
                    </span>
                  </button>
                </div>

                <Button
                  size="lg"
                  disabled={!contactValid || !namesValid}
                  onClick={() => {
                    setAuthStep('otp');
                    setAuthOtp(['', '', '', '']);
                    setTimeout(() => otpRefs.current[0]?.focus(), 0);
                  }}
                  className="w-full font-bold text-[14px]"
                >
                  {lang === 'ar' ? 'متابعة' : 'Continue'}
                </Button>

                {/* T&C disclaimer */}
                <p className="text-center text-[10.5px] text-foreground/55 mt-2.5 leading-relaxed px-2">
                  {lang === 'ar' ? (
                    <>
                      بالضغط على {isSignUp ? 'تسجيل' : 'متابعة'}، فإنك توافق على{' '}
                      <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">شروط الاستخدام</Link>
                      {' '}و{' '}
                      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">سياسة الخصوصية</Link>.
                    </>
                  ) : (
                    <>
                      By clicking {isSignUp ? 'register' : 'continue'}, you agree to our{' '}
                      <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link>
                      {' '}and{' '}
                      <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>.
                    </>
                  )}
                </p>

                {/* Sign-up / Log-in toggle */}
                <p className="text-center text-[12px] text-foreground/65 mt-3">
                  {isSignUp ? (
                    <>
                      {lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(false); setError(''); }}
                        className="font-bold text-foreground underline underline-offset-4 hover:opacity-80"
                      >
                        {lang === 'ar' ? 'تسجيل الدخول' : 'Log in'}
                      </button>
                    </>
                  ) : (
                    <>
                      {lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?"}{' '}
                      <button
                        type="button"
                        onClick={() => { setIsSignUp(true); setError(''); }}
                        className="font-bold text-foreground underline underline-offset-4 hover:opacity-80"
                      >
                        {lang === 'ar' ? 'انضم لصوب' : 'Join SOOB'}
                      </button>
                    </>
                  )}
                </p>

                {/* Divider */}
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10.5px] uppercase tracking-wider text-foreground/45 font-mono">
                    {lang === 'ar' ? 'أو' : 'or'}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Google — secondary */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 rounded-xl border-2 border-border bg-card hover:bg-secondary/40 hover:border-[var(--ob-cta)]/40 transition-all font-semibold text-[13px] text-foreground/85 disabled:opacity-60"
                >
                  {signingIn ? (
                    <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span>{lang === 'ar' ? 'المتابعة عبر جوجل' : 'Continue with Google'}</span>
                </button>
              </>
            )}

            {authStep === 'otp' && (
              <div>
                <button
                  type="button"
                  onClick={() => setAuthStep('form')}
                  className="text-[12px] text-foreground/65 hover:text-foreground mb-3 underline-offset-2 hover:underline"
                >
                  ← {lang === 'ar' ? 'تعديل التفاصيل' : 'Edit details'}
                </button>
                <p className="text-sm text-foreground/75 mb-3">
                  {lang === 'ar'
                    ? <>أرسلنا رمزاً مكوناً من 4 أرقام إلى <span className="font-mono text-foreground">{authContact}</span></>
                    : <>We sent a 4-digit code to <span className="font-mono text-foreground">{authContact}</span></>}
                </p>
                <div className="flex gap-2 justify-center mb-4" dir="ltr">
                  {authOtp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-border bg-card focus:border-[var(--ob-cta)] focus:outline-none"
                    />
                  ))}
                </div>
                <Button size="lg" disabled={!otpComplete || signingIn} onClick={handleOtpVerify} className="w-full font-bold">
                  {signingIn
                    ? (lang === 'ar' ? 'جاري التحقق...' : 'Verifying...')
                    : (lang === 'ar' ? 'تحقق وأنشئ الحساب' : isSignUp ? 'Verify & create account' : 'Verify & log in')}
                </Button>
              </div>
            )}

            {error && (
              <p className="text-center text-xs font-semibold text-destructive mt-3">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
