import { useState, useEffect } from 'react';
import {
  User, Phone,
  LogOut, /* MessageCircle, */
} from 'lucide-react';
import { /* Link, */ useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

const SAUDI_PHONE_REGEX = /^05\d{8}$/;

export default function ProfilePage() {
  const { t, lang } = useLang();
  const { user, isLoggedIn, needsPhone, loading, loginWithGoogle, updatePhone, logout } = useAuth();
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const navTo = useNavigate();

  const redirectAfterLogin = () => {
    if (localStorage.getItem('simba-finder-pending')) {
      navTo('/finder?reveal=1');
    } else {
      navTo('/finder');
    }
  };

  // Handle post-redirect navigation (when signInWithRedirect was used as fallback)
  useEffect(() => {
    if (isLoggedIn && !needsPhone && localStorage.getItem('simba-auth-redirect') === 'pending') {
      localStorage.removeItem('simba-auth-redirect');
      redirectAfterLogin();
    }
  }, [isLoggedIn, needsPhone]);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setError('');
    setSigningIn(true);
    try {
      await loginWithGoogle();
      trackEvent('login', { method: 'google' });
      redirectAfterLogin();
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('Google sign-in failed:', err);
      const code = (err as { code?: string })?.code;
      // User cancelled or popup was replaced — no error needed
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      // Popup blocked is handled in AuthContext via redirect fallback
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

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = phoneInput.replace(/\s/g, '');
    if (!SAUDI_PHONE_REGEX.test(cleaned)) {
      setError(lang === 'ar' ? 'ادخل رقم جوال سعودي صحيح (05XXXXXXXX)' : 'Enter a valid Saudi phone number (05XXXXXXXX)');
      return;
    }
    try {
      await updatePhone(cleaned);
      trackEvent('phone_saved');
      redirectAfterLogin();
    } catch (err) {
      if (import.meta.env.DEV) console.error('Phone update failed:', err);
      setError(lang === 'ar' ? 'فشل حفظ الرقم. حاول مرة ثانية.' : 'Failed to save phone number. Please try again.');
    }
  };

  // ───────── Loading (prevents flash during redirect auth) ─────────
  if (loading) {
    return (
      <div className="relative z-10 safe-pb flex items-center justify-center min-h-[calc(100dvh-72px)]">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ───────── Phone number prompt (Google users) ─────────
  if (isLoggedIn && needsPhone) {
    return (
      <div className="relative z-10 safe-pb flex flex-col md:min-h-[calc(100dvh-72px)]">
        {/* ── Mobile: gradient header ── */}
        <div className="md:hidden relative flex items-center justify-center pt-24 pb-10">
          <div className="max-w-[480px] w-full mx-auto px-6 text-center"
            style={{ animation: 'fadeUp 0.5s ease-out both' }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg shadow-black/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm
                flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
                <span className="text-2xl font-bold text-white">
                  {(user?.name || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="font-heading font-bold text-2xl text-white">
              {t('profile.almostDone')}
            </h1>
            <p className="text-white/70 mt-1 text-sm">
              {t('profile.phonePrompt')}
            </p>
          </div>
        </div>

        {/* ── Content area (card on desktop, white section on mobile) ── */}
        <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl
          md:flex md:flex-1 md:items-center md:justify-center md:bg-transparent md:rounded-none md:py-12 md:px-8">
          <div className="max-w-[480px] md:max-w-[520px] w-full mx-auto
            md:bg-surface md:rounded-3xl md:shadow-xl md:border md:border-border/60">

            {/* Desktop header (hidden on mobile) */}
            <div className="hidden md:block text-center px-10 pt-10 pb-2"
              style={{ animation: 'fadeUp 0.5s ease-out both' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-md shadow-black/5" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary/10
                  flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {(user?.name || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <h1 className="font-heading font-bold text-3xl text-text-primary">
                {t('profile.almostDone')}
              </h1>
              <p className="text-text-secondary mt-2 text-sm">
                {t('profile.phonePrompt')}
              </p>
            </div>

            {/* Form */}
            <div className="px-6 md:px-10 pt-8 md:pt-6 pb-8 md:pb-10"
              style={{ animation: 'fadeUp 0.5s ease-out 0.1s both' }}>
              <form onSubmit={handlePhoneSubmit}
                className="bg-surface rounded-2xl border border-border/60 p-6 shadow-sm md:bg-transparent md:border-0 md:shadow-none md:p-0">
                <div className="mb-5">
                  <label className="block text-xs font-bold text-text-secondary mb-2">
                    {t('profile.phone')}
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-text-tertiary" />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder={t('profile.phonePlaceholder')}
                      dir="ltr"
                      className="w-full ps-11 pe-4 py-3 rounded-xl bg-surface-alt border border-border text-sm text-text-primary
                        placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                {error && (
                  <p className="text-xs font-semibold text-error mb-3">{error}</p>
                )}
                <button type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm
                    hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press">
                  {t('profile.savePhone')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────── Logged-in view ─────────
  if (isLoggedIn) {
    return (
      <div className="relative z-10 safe-pb flex flex-col md:min-h-[calc(100dvh-72px)]">
        {/* ── Mobile: gradient header ── */}
        <div className="md:hidden relative flex items-center justify-center pt-24 pb-10">
          <div className="max-w-[480px] w-full mx-auto px-6 text-center"
            style={{ animation: 'fadeUp 0.5s ease-out both' }}>
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg shadow-black/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm
                flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
                <span className="text-2xl font-bold text-white">
                  {(user?.name || user?.phone || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="font-heading font-bold text-2xl text-white">
              {t('profile.welcome')}, {user?.name || user?.phone}!
            </h1>
            {user?.phone && <p className="text-white/70 mt-1 text-sm" dir="ltr">{user.phone}</p>}
            {user?.email && <p className="text-white/70 mt-1 text-sm">{user.email}</p>}
          </div>
        </div>

        {/* ── Content area ── */}
        <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl
          md:flex md:flex-1 md:items-center md:justify-center md:bg-transparent md:rounded-none md:py-12 md:px-8">
          <div className="max-w-[480px] md:max-w-[520px] w-full mx-auto
            md:bg-surface md:rounded-3xl md:shadow-xl md:border md:border-border/60">

            {/* Desktop header (hidden on mobile) */}
            <div className="hidden md:block text-center px-10 pt-10 pb-2"
              style={{ animation: 'fadeUp 0.5s ease-out both' }}>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md shadow-black/5" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10
                  flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-primary">
                    {(user?.name || user?.phone || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <h1 className="font-heading font-bold text-3xl text-text-primary">
                {t('profile.welcome')}, {user?.name || user?.phone}!
              </h1>
              {user?.phone && <p className="text-text-secondary mt-1.5 text-sm" dir="ltr">{user.phone}</p>}
              {user?.email && <p className="text-text-secondary mt-1 text-sm">{user.email}</p>}
            </div>

            {/* Actions */}
            <div className="px-6 md:px-10 pt-8 md:pt-6 pb-8 md:pb-10"
              style={{ animation: 'fadeUp 0.5s ease-out 0.1s both' }}>
              <div className="bg-surface rounded-2xl border border-border/60 p-5 shadow-sm space-y-3
                md:bg-surface-alt md:border-border/40">
                {/* <Link
                  to="/chat"
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors"
                >
                  <MessageCircle size={20} className="text-primary" />
                  <div className="text-start">
                    <p className="text-sm font-bold text-text-primary">{t('meetChat.title')}</p>
                    <p className="text-xs text-text-secondary">{t('profile.chatDesc')}</p>
                  </div>
                </Link> */}

                <button
                  onClick={() => { trackEvent('logout'); logout(); }}
                  className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={20} className="text-red-500" />
                  <span className="text-sm font-semibold text-red-500">{t('profile.logout')}</span>
                </button>
              </div>

              <p className="text-center text-xs text-text-tertiary mt-4">
                {t('profile.demoNotice')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────── Not logged in — Google sign-in ─────────
  return (
    <div className="relative z-10 safe-pb flex flex-col md:min-h-[calc(100dvh-72px)]">
      {/* ── Mobile: gradient header ── */}
      <div className="md:hidden relative flex items-center justify-center pt-24 pb-10">
        <div className="max-w-[480px] w-full mx-auto px-6 text-center"
          style={{ animation: 'fadeUp 0.5s ease-out both' }}>
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl text-white">
            {t('profile.title')}
          </h1>
          <p className="text-white/70 mt-1 text-sm">
            {t('profile.subtitle')}
          </p>
        </div>
      </div>

      {/* ── Content area (card on desktop, white section on mobile) ── */}
      <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl
        md:flex md:flex-1 md:items-center md:justify-center md:bg-transparent md:rounded-none md:py-12 md:px-8">
        <div className="max-w-[480px] md:max-w-[520px] w-full mx-auto
          md:bg-surface md:rounded-3xl md:shadow-xl md:border md:border-border/60">

          {/* Desktop header (hidden on mobile) */}
          <div className="hidden md:block text-center px-10 pt-10 pb-2"
            style={{ animation: 'fadeUp 0.5s ease-out both' }}>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <User size={28} className="text-primary" />
            </div>
            <h1 className="font-heading font-bold text-3xl text-text-primary">
              {t('profile.title')}
            </h1>
            <p className="text-text-secondary mt-2 text-base leading-relaxed max-w-sm mx-auto">
              {t('profile.subtitle')}
            </p>
          </div>

          {/* Sign-in content */}
          <div className="px-6 md:px-10 pt-8 md:pt-6 pb-8 md:pb-10"
            style={{ animation: 'fadeUp 0.5s ease-out 0.1s both' }}>
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl
                bg-surface border border-border hover:bg-surface-alt
                transition-all duration-200 shadow-sm btn-press
                md:py-4 md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-text-tertiary/30 border-t-text-primary rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span className="text-sm font-bold text-text-primary">
                {signingIn
                  ? (lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...')
                  : t('profile.googleSignIn')}
              </span>
            </button>

            {error && (
              <p className="text-center text-xs font-semibold text-error mt-3">{error}</p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
