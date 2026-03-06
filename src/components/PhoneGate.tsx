import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';

const PHONE_REGEX = /^\+?\d{7,15}$/;

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

  const navigateAway = () => {
    if (localStorage.getItem('simba-finder-pending')) {
      navigate('/finder?reveal=1');
    } else {
      navigate('/finder');
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    try {
      await updatePhone('skipped');
      trackEvent('phone_skipped');
      navigateAway();
    } catch {
      navigateAway();
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleaned = phoneInput.replace(/\s/g, '');
    if (!PHONE_REGEX.test(cleaned)) {
      setError(lang === 'ar' ? 'ادخل رقم جوال صحيح' : 'Enter a valid phone number');
      return;
    }
    setSaving(true);
    try {
      await updatePhone(cleaned);
      trackEvent('phone_saved');
      navigateAway();
    } catch {
      setError(lang === 'ar' ? 'فشل حفظ الرقم. حاول مرة ثانية.' : 'Failed to save phone number. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 bg-primary">
      <div className="w-full max-w-[420px] mx-auto text-center">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-20 h-20 rounded-full mx-auto mb-5 shadow-lg" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-5 shadow-lg">
            <span className="text-2xl font-bold text-white">{(user?.name || '?')[0].toUpperCase()}</span>
          </div>
        )}

        <h1 className="font-heading font-bold text-2xl md:text-3xl text-white mb-1">
          {t('profile.almostDone')}
        </h1>
        <p className="text-white/70 text-sm md:text-base mb-8">
          {t('profile.phonePrompt')}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <Phone size={16} className="absolute top-1/2 -translate-y-1/2 start-3 text-white/50 z-10" />
            <Input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder={t('profile.phonePlaceholder')}
              dir="ltr"
              className="ps-10 bg-white/15 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-white/30"
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-300 text-start">{error}</p>
          )}

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-white text-[#213E53] hover:bg-white/90 font-bold"
          >
            {saving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : t('profile.savePhone')}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={saving}
            className="w-full text-white/60 hover:text-white hover:bg-white/10"
          >
            {lang === 'ar' ? 'تخطي' : 'Skip'}
          </Button>
        </form>
      </div>
    </div>
  );
}
