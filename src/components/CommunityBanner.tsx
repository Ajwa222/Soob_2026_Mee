import { useState } from 'react';
import { Users, MessageCircle, ArrowRight, X } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

const ENGLISH_LINK = 'https://t.me/+savcYu7Ja41kODQ0';
const ARABIC_LINK = 'https://chat.whatsapp.com/IuixL2fLPFgD5aAraoFz6D';

function TelegramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.492-1.302.48-.428-.013-1.252-.242-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export default function CommunityBanner() {
  const { lang } = useLang();
  const isArabic = lang === 'ar';
  const [showModal, setShowModal] = useState(false);

  const handleJoin = () => {
    if (isArabic) {
      window.open(ARABIC_LINK, '_blank', 'noopener,noreferrer');
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-10"
        style={{ background: 'var(--gradient-hero)' }}
      >
        <div className="absolute top-0 end-0 w-40 h-40 rounded-full bg-white/[0.06] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 start-0 w-28 h-28 rounded-full bg-white/[0.06] translate-y-1/3 -translate-x-1/3" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-[11px] font-medium mb-2.5">
              <Users size={11} />
              {isArabic ? 'مجتمع سيمبا' : 'Community'}
            </div>
            <h2 className="font-heading font-bold text-lg md:text-2xl text-white leading-tight">
              {isArabic ? 'انضم لمجتمع سيمبا' : 'Join the Simba Community'}
            </h2>
            <p className="mt-1 text-white/70 text-sm max-w-sm leading-relaxed">
              {isArabic
                ? 'كن أول من يعرف عن أفضل العروض والباقات الجديدة'
                : 'Connect with others and be the first to know about the best deals'}
            </p>
          </div>

          <button
            onClick={handleJoin}
            className="inline-flex items-center gap-2 px-6 h-[48px] rounded-xl bg-white text-[#213E53] font-bold text-[15px]
              hover:bg-white/90 active:scale-[0.98] transition-all duration-200 cursor-pointer shrink-0 self-start md:self-center"
          >
            {isArabic ? 'انضم الآن' : 'Join Now'}
            <ArrowRight size={17} className="rtl:rotate-180" />
          </button>
        </div>
      </div>

      {/* Community choice modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-surface rounded-2xl p-6 shadow-2xl"
            style={{ animation: 'scaleIn 0.2s ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users size={28} className="text-primary" />
              </div>
              <h3 className="font-heading font-bold text-lg text-text-primary">Choose your community</h3>
              <p className="text-sm text-text-secondary mt-1">Pick the language you're most comfortable with</p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={ARABIC_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowModal(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/10 hover:bg-primary/20
                  transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Users size={20} className="text-white" />
                </div>
                <p className="font-bold text-sm text-text-primary">المجتمع العربي</p>
                <ArrowRight size={16} className="text-text-tertiary ms-auto rtl:rotate-180" />
              </a>

              <a
                href={ENGLISH_LINK}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowModal(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/10 hover:bg-primary/20
                  transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <Users size={20} className="text-white" />
                </div>
                <p className="font-bold text-sm text-text-primary">English Community</p>
                <ArrowRight size={16} className="text-text-tertiary ms-auto rtl:rotate-180" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
