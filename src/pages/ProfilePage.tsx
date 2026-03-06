import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

export default function ProfilePage() {
  const { t, lang } = useLang();
  const { user, isLoggedIn, needsPhone, loading, loginWithGoogle, logout } = useAuth();
  const [error, setError] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [searchParams] = useSearchParams();
  const isSignUp = !localStorage.getItem('simba-has-account') || searchParams.get('tab') === 'signup';
  const navTo = useNavigate();

  const redirectAfterLogin = (signup: boolean) => {
    if (localStorage.getItem('simba-finder-pending')) {
      navTo('/finder?reveal=1');
    } else if (signup) {
      navTo('/finder');
    } else {
      navTo('/home');
    }
  };

  useEffect(() => {
    if (isLoggedIn && !needsPhone && localStorage.getItem('simba-auth-redirect') === 'pending') {
      const wasSignUp = localStorage.getItem('simba-auth-flow') === 'signup';
      localStorage.removeItem('simba-auth-redirect');
      localStorage.removeItem('simba-auth-flow');
      redirectAfterLogin(wasSignUp);
    }
  }, [isLoggedIn, needsPhone]);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setError('');
    setSigningIn(true);
    try {
      const wasSignUp = isSignUp;
      localStorage.setItem('simba-auth-flow', wasSignUp ? 'signup' : 'signin');
      await loginWithGoogle();
      trackEvent(wasSignUp ? 'signup' : 'login', { method: 'google' });
      localStorage.removeItem('simba-auth-flow');
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
        <div className="bg-background md:flex md:flex-1 md:items-center md:justify-center md:py-12 md:px-8">
          <Card className="max-w-md w-full mx-auto md:shadow-lg">
            {/* Desktop header */}
            <div className="hidden md:block text-center px-10 pt-10 pb-2">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full mx-auto mb-4 shadow-md" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl font-bold text-primary">{(user?.name || user?.phone || '?')[0].toUpperCase()}</span>
                </div>
              )}
              <h1 className="font-heading font-bold text-3xl text-foreground">
                {t('profile.welcome')}, {user?.name || user?.phone}!
              </h1>
              {user?.phone && user.phone !== 'skipped' && <p className="text-muted-foreground mt-1.5 text-sm" dir="ltr">{user.phone}</p>}
              {user?.email && <p className="text-muted-foreground mt-1 text-sm">{user.email}</p>}
            </div>

            <CardContent className="px-6 md:px-10 pt-8 md:pt-6 pb-8 md:pb-10">
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
            <Button
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="w-full py-6"
            >
              {signingIn ? (
                <div className="w-5 h-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span className="font-bold">
                {signingIn
                  ? (lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...')
                  : isSignUp ? t('profile.googleSignUp') : t('profile.googleSignIn')}
              </span>
            </Button>

            {error && (
              <p className="text-center text-xs font-semibold text-destructive mt-3">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
