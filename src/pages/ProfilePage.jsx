import { useState } from 'react';
import {
  User, Phone, Lock, Eye, EyeOff,
  LogOut, MessageCircle,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { t, lang } = useLang();
  const { user, isLoggedIn, needsPhone, login, loginWithGoogle, updatePhone, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const navTo = useNavigate();

  const redirectAfterLogin = () => {
    if (localStorage.getItem('simba-finder-pending')) {
      navTo('/finder?reveal=1');
    } else {
      navTo('/finder');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone || !password) return;
    login(tab === 'signup' ? name : '', phone);
    redirectAfterLogin();
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
      redirectAfterLogin();
    } catch (error) {
      console.error('Google sign-in failed:', error);
    }
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phoneInput) return;
    await updatePhone(phoneInput);
    redirectAfterLogin();
  };

  // Phone number prompt for Google users
  if (isLoggedIn && needsPhone) {
    return (
      <div className="relative z-10 safe-pb flex flex-col">
        <div className="relative flex items-center justify-center pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="max-w-[480px] w-full mx-auto px-6 text-center"
            style={{ animation: 'fadeUp 0.5s ease-out both' }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg shadow-black/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm
                flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
                <span className="text-2xl font-bold text-white">
                  {(user.name || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">
              {t('profile.almostDone')}
            </h1>
            <p className="text-white/70 mt-1 text-sm">
              {t('profile.phonePrompt')}
            </p>
          </div>
        </div>

        <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl">
          <div className="max-w-[480px] mx-auto px-6 md:px-8 pt-8 pb-8"
            style={{ animation: 'fadeUp 0.5s ease-out 0.1s both' }}>
            <form onSubmit={handlePhoneSubmit}
              className="bg-surface rounded-2xl border border-border/60 p-6 shadow-sm">
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
              <button type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm
                  hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press">
                {t('profile.savePhone')}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Logged-in view
  if (isLoggedIn) {
    return (
      <div className="relative z-10 safe-pb flex flex-col">
        {/* Gradient area — header */}
        <div className="relative flex items-center justify-center pt-24 pb-10 md:pt-32 md:pb-14">
          <div
            className="max-w-[480px] w-full mx-auto px-6 text-center"
            style={{ animation: 'fadeUp 0.5s ease-out both' }}
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-4 shadow-lg shadow-black/10" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm
                flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
                <span className="text-2xl font-bold text-white">
                  {(user.name || user.phone || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">
              {t('profile.welcome')}, {user.name || user.phone}!
            </h1>
            {user.phone && <p className="text-white/70 mt-1 text-sm" dir="ltr">{user.phone}</p>}
            {user.email && <p className="text-white/70 mt-1 text-sm">{user.email}</p>}
          </div>
        </div>

        {/* White area — content */}
        <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl">
          <div
            className="max-w-[480px] mx-auto px-6 md:px-8 pt-8 pb-8"
            style={{ animation: 'fadeUp 0.5s ease-out 0.1s both' }}
          >
            <div className="bg-surface rounded-2xl border border-border/60 p-5 shadow-sm space-y-3">
              <Link
                to="/chat"
                className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors"
              >
                <MessageCircle size={20} className="text-primary" />
                <div className="text-start">
                  <p className="text-sm font-bold text-text-primary">{t('meetChat.title')}</p>
                  <p className="text-xs text-text-secondary">{t('profile.chatDesc')}</p>
                </div>
              </Link>

              <button
                onClick={logout}
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
    );
  }

  return (
    <div className="relative z-10 safe-pb flex flex-col">
      {/* Gradient area — header */}
      <div className="relative flex items-center justify-center pt-24 pb-10 md:pt-32 md:pb-14">
        <div
          className="max-w-[480px] w-full mx-auto px-6 text-center"
          style={{ animation: 'fadeUp 0.5s ease-out both' }}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-white" />
          </div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">
            {t('profile.title')}
          </h1>
          <p className="text-white/70 mt-1 text-sm">
            {t('profile.subtitle')}
          </p>
        </div>
      </div>

      {/* White area — form content */}
      <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl">
        <div
          className="max-w-[480px] mx-auto px-6 md:px-8 pt-8 pb-8"
          style={{ animation: 'fadeUp 0.5s ease-out 0.1s both' }}
        >
          {/* Tab switcher */}
          <div className="flex bg-surface-alt rounded-xl p-1 mb-6">
            {['signin', 'signup'].map(key => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all
                  ${tab === key
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                  }`}
              >
                {t(`profile.${key === 'signin' ? 'signIn' : 'signUp'}`)}
              </button>
            ))}
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl
              bg-surface border border-border hover:bg-surface-alt
              transition-all duration-200 mb-4 shadow-sm btn-press"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-bold text-text-primary">
              {t('profile.googleSignIn')}
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border"></div>
            <span className="text-xs font-semibold text-text-tertiary">
              {t('profile.or')}
            </span>
            <div className="flex-1 h-px bg-border"></div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-2xl border border-border/60 p-6 shadow-sm"
          >
            {tab === 'signup' && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-text-secondary mb-2">
                  {t('profile.name')}
                </label>
                <div className="relative">
                  <User size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-text-tertiary" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('profile.namePlaceholder')}
                    className="w-full ps-11 pe-4 py-3 rounded-xl bg-surface-alt border border-border text-sm text-text-primary
                      placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-bold text-text-secondary mb-2">
                {t('profile.phone')}
              </label>
              <div className="relative">
                <Phone size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-text-tertiary" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('profile.phonePlaceholder')}
                  dir="ltr"
                  className="w-full ps-11 pe-4 py-3 rounded-xl bg-surface-alt border border-border text-sm text-text-primary
                    placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-bold text-text-secondary mb-2">
                {t('profile.password')}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('profile.passwordPlaceholder')}
                  className="w-full ps-11 pe-11 py-3 rounded-xl bg-surface-alt border border-border text-sm text-text-primary
                    placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 -translate-y-1/2 end-4 text-text-tertiary hover:text-text-secondary"
                  type="button"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm
              hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press"
            >
              {tab === 'signin' ? t('profile.signInBtn') : t('profile.signUpBtn')}
            </button>

            {tab === 'signin' && (
              <button type="button" className="w-full text-center mt-3 text-xs font-semibold text-primary hover:text-primary-dark transition-colors">
                {t('profile.forgot')}
              </button>
            )}
          </form>

          <p className="text-center text-xs text-text-tertiary mt-4">
            {t('profile.demoNotice')}
          </p>
        </div>
      </div>
    </div>
  );
}
