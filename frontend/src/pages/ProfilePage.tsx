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
import { User, LogOut, Bookmark, Phone, Mail, Package, ChevronRight, Globe, Check, LifeBuoy } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarkContext';
import { SUPPORTED_LANGS, LANG_LABELS, type Lang } from '../context/LanguageContext';
import { usePlans } from '../context/PlansContext';
import { trackEvent } from '../lib/analytics';

export default function ProfilePage() {
  const { t, lang, setLang } = useLang();
  const { user, isLoggedIn, needsPhone, loading, loginWithGoogle, loginWithOtp, logout } = useAuth();
  const { bookmarkedIds } = useBookmarks();
  const { plans } = usePlans();
  const bookmarkedPlans = plans.filter(p => bookmarkedIds.includes(p.id));
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [searchParams] = useSearchParams();
  // Initial mode comes from localStorage / URL — but user can toggle in the UI.
  const [isSignUp, setIsSignUp] = useState(() => {
    return !localStorage.getItem('soob-has-account') || searchParams.get('tab') === 'signup';
  });

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

  // Logged-in view
  if (isLoggedIn) {
    return (
      <div className="safe-pb flex flex-col md:min-h-[calc(100dvh-72px)]">
        {/* Mobile header */}
        <div className="md:hidden relative flex items-center justify-center pt-16 pb-10 bg-primary">
          <div className="max-w-md w-full mx-auto px-6 text-center">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-2xl font-bold text-white">{(user?.name || user?.phone || '?')[0].toUpperCase()}</span>
              </div>
            )}
            <h1 className="font-heading font-bold text-2xl text-white">
              {t('profile.welcome')}, {user?.name || user?.phone}!
            </h1>
            {user?.phone && user.phone !== 'skipped' && <p className="text-white/70 mt-1 text-sm" dir="ltr">{user.phone}</p>}
            {user?.email && <p className="text-white/70 mt-1 text-sm">{user.email}</p>}
          </div>
        </div>

        {/* Content */}
        <div className="bg-background flex-1 md:py-12 md:px-8">
          <div className="max-w-5xl mx-auto">
            <Card className="max-w-md mx-auto md:shadow-lg">
              {/* Desktop header */}
              <div className="hidden md:block text-center px-10 pt-10 pb-2">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
                    <span className="text-3xl font-bold text-white">{(user?.name || user?.phone || '?')[0].toUpperCase()}</span>
                  </div>
                )}
                <h1 className="font-heading font-bold text-3xl text-foreground">
                  {t('profile.welcome')}, {user?.name || user?.phone}!
                </h1>
                {user?.phone && user.phone !== 'skipped' && <p className="text-muted-foreground mt-1.5 text-sm" dir="ltr">{user.phone}</p>}
                {user?.email && <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>}
              </div>

              <CardContent className="px-6 md:px-10 pt-8 md:pt-6 pb-8 md:pb-10 space-y-2">
                <Link
                  to="/orders"
                  className="w-full inline-flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)]/40 hover:bg-secondary/40 transition-all px-4 py-3"
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C59AFA' }}>
                    <Package size={18} style={{ color: '#16143A' }} />
                  </span>
                  <span className="flex-1 text-start">
                    <span className="block font-heading font-bold text-sm text-foreground">
                      {lang === 'ar' ? 'طلباتي' : 'My Orders'}
                    </span>
                    <span className="block text-[11px] text-foreground/60">
                      {lang === 'ar' ? 'تتبّع وفعّل شرائحك' : 'Track shipments & activate SIMs'}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-foreground/40 rtl:rotate-180" />
                </Link>

                <Link
                  to="/saved"
                  className="w-full inline-flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)]/40 hover:bg-secondary/40 transition-all px-4 py-3"
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FE7151' }}>
                    <Bookmark size={18} className="text-white" fill="currentColor" />
                  </span>
                  <span className="flex-1 text-start">
                    <span className="block font-heading font-bold text-sm text-foreground">
                      {lang === 'ar' ? 'الباقات المحفوظة' : 'Saved Plans'}
                    </span>
                    <span className="block text-[11px] text-foreground/60">
                      {bookmarkedPlans.length > 0
                        ? (lang === 'ar' ? `${bookmarkedPlans.length} باقة محفوظة` : `${bookmarkedPlans.length} saved plan${bookmarkedPlans.length === 1 ? '' : 's'}`)
                        : (lang === 'ar' ? 'الباقات التي تابعتها' : 'Plans you bookmarked')}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-foreground/40 rtl:rotate-180" />
                </Link>

                {/* Help & Support — opens the floating support modal */}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && typeof window.Intercom === 'function') {
                      window.Intercom('show');
                    } else {
                      // Click the floating FAB so the chooser modal opens.
                      const fab = document.querySelector<HTMLButtonElement>('button[aria-label="Support"], button[aria-label="الدعم"]');
                      fab?.click();
                    }
                    trackEvent('support_opened_from_profile');
                  }}
                  className="w-full inline-flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[#FE7151]/40 hover:bg-secondary/40 transition-all px-4 py-3"
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FE7151' }}>
                    <LifeBuoy size={18} className="text-white" />
                  </span>
                  <span className="flex-1 text-start">
                    <span className="block font-heading font-bold text-sm text-foreground">
                      {lang === 'ar' ? 'الدعم والمساعدة' : 'Help & Support'}
                    </span>
                    <span className="block text-[11px] text-foreground/60">
                      {lang === 'ar' ? 'محادثة مباشرة أو فتح تذكرة' : 'Live chat or open a ticket'}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-foreground/40 rtl:rotate-180" />
                </button>

                {/* Language picker — opens modal */}
                <button
                  type="button"
                  onClick={() => setShowLangPicker(true)}
                  className="w-full inline-flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[var(--ob-cta)]/40 hover:bg-secondary/40 transition-all px-4 py-3 text-start"
                >
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#CFEB74' }}>
                    <Globe size={18} style={{ color: '#16143A' }} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-heading font-bold text-sm text-foreground">
                      {lang === 'ar' ? 'اللغة' : 'Language'}
                    </span>
                    <span className="block text-[11px] text-foreground/60">
                      {LANG_LABELS[lang]}
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-foreground/40 rtl:rotate-180" />
                </button>
                <Button
                  variant="ghost"
                  onClick={() => { trackEvent('logout'); logout(); }}
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut size={20} />
                  {t('profile.logout')}
                </Button>
              </CardContent>
            </Card>

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
