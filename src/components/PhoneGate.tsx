import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

const SAUDI_PHONE_REGEX = /^05\d{8}$/;

export default function PhoneGate() {
  const { t, lang } = useLang();
  const { user, isLoggedIn, needsPhone, updatePhone } = useAuth();
  const navigate = useNavigate();
  const [phoneInput, setPhoneInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLoggedIn && needsPhone) {
      trackEvent('phone_prompt_viewed');
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isLoggedIn, needsPhone]);

  if (!isLoggedIn || !needsPhone) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = phoneInput.replace(/\s/g, '');
    if (!SAUDI_PHONE_REGEX.test(cleaned)) {
      setError(lang === 'ar' ? 'ادخل رقم جوال سعودي صحيح (05XXXXXXXX)' : 'Enter a valid Saudi phone number (05XXXXXXXX)');
      return;
    }
    setSaving(true);
    try {
      await updatePhone(cleaned);
      trackEvent('phone_saved');
      if (localStorage.getItem('simba-finder-pending')) {
        navigate('/finder?reveal=1');
      } else {
        navigate('/finder');
      }
    } catch {
      setError(lang === 'ar' ? 'فشل حفظ الرقم. حاول مرة ثانية.' : 'Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] backdrop-blur-2xl bg-black/30 flex flex-col items-center justify-center px-6">
      <div
        className="w-full max-w-[420px] mx-auto text-center"
        style={{ animation: 'fadeUp 0.4s ease-out both' }}
      >
        {/* Avatar */}
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="w-20 h-20 rounded-full mx-auto mb-5 shadow-lg shadow-black/15"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-5 shadow-lg shadow-black/15">
            <span className="text-2xl font-bold text-white">
              {(user?.name || '?')[0].toUpperCase()}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white mb-1">
          {t('profile.almostDone')}
        </h1>
        <p className="text-white/70 text-sm md:text-base mb-8">
          {t('profile.phonePrompt')}
        </p>

        {/* Phone form */}
        <form onSubmit={handleSubmit} className="w-full">
          <div className="relative mb-4">
            <Phone size={16} className="absolute top-1/2 -translate-y-1/2 start-4 text-white/50" />
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={t('profile.phonePlaceholder')}
              dir="ltr"
              className="w-full ps-11 pe-4 py-3.5 rounded-xl bg-white/15 border border-white/20 text-sm text-white
                placeholder:text-white/40 outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40
                transition-all backdrop-blur-sm"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-400 mb-3 text-start">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 btn-press
              bg-white text-[#213E53] hover:bg-white/90 shadow-md shadow-black/10
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving
              ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...')
              : t('profile.savePhone')}
          </button>
        </form>
      </div>
    </div>
  );
}
