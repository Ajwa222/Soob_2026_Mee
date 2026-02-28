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
  const { user, isLoggedIn, login, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'signup' ? 'signup' : 'signin');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const navTo = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone || !password) return;
    login(tab === 'signup' ? name : '', phone);
    // Redirect to finder — with reveal if user came from blur gate
    if (localStorage.getItem('simba-finder-pending')) {
      navTo('/finder?reveal=1');
    } else {
      navTo('/finder');
    }
  };

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
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm
              flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/10">
              <span className="text-2xl font-bold text-white">
                {(user.name || user.phone)[0].toUpperCase()}
              </span>
            </div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-white">
              {t('profile.welcome')}, {user.name || user.phone}!
            </h1>
            <p className="text-white/70 mt-1 text-sm" dir="ltr">{user.phone}</p>
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
