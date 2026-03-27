/**
 * Community banner — invites users to join the Simba community chat.
 *
 * Arabic users are directed to WhatsApp, English users see a modal with
 * both Telegram and WhatsApp options. Displayed on the HomePage.
 */
import { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLang } from '../context/LanguageContext';

// Community links — different platforms per language
const ENGLISH_LINK = 'https://t.me/+savcYu7Ja41kODQ0';
const ARABIC_LINK = 'https://chat.whatsapp.com/IuixL2fLPFgD5aAraoFz6D';

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
      <div className="relative overflow-hidden rounded-2xl p-7 md:p-10 hero-gradient grain">
        {/* Decorative blobs */}
        <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-white/[0.05] -translate-y-1/3 translate-x-1/3 blob" />
        <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full bg-accent/[0.08] translate-y-1/3 -translate-x-1/3 blob-alt" />
        <div className="absolute top-1/2 end-1/3 w-20 h-20 rounded-full bg-white/[0.03] hidden md:block" />

        <div className="relative z-[2] flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF0D0] text-black/70 text-[11px] font-semibold tracking-wide uppercase mb-3">
              <Users size={11} />
              {isArabic ? 'مجتمع سيمبا' : 'Community'}
            </div>
            <h2 className="font-heading font-bold text-xl md:text-2xl text-black leading-tight">
              {isArabic ? 'انضم لمجتمع سيمبا' : 'Join the Simba Community'}
            </h2>
            <p className="mt-1.5 text-black/70 text-sm max-w-sm leading-relaxed">
              {isArabic
                ? 'كن أول من يعرف عن أفضل العروض والباقات الجديدة'
                : 'Connect with others and be the first to know about the best deals'}
            </p>
          </div>

          <Button
            onClick={handleJoin}
            variant="secondary"
            className="bg-white text-[#213E53] hover:bg-white/90 font-bold shrink-0 self-start md:self-center h-12 px-6 rounded-xl shadow-lg shadow-black/10 hover:shadow-xl transition-all duration-300"
          >
            {isArabic ? 'انضم الآن' : 'Join Now'}
            <ArrowRight size={17} className="rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users size={28} className="text-primary" />
            </div>
            <DialogTitle className="font-heading">Choose your community</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Pick the language you're most comfortable with</p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={ARABIC_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowModal(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/8 hover:bg-primary/12 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                <Users size={20} className="text-white" />
              </div>
              <p className="font-bold text-sm text-foreground">المجتمع العربي</p>
              <ArrowRight size={16} className="text-muted-foreground ms-auto rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <a
              href={ENGLISH_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowModal(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-primary/8 hover:bg-primary/12 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                <Users size={20} className="text-white" />
              </div>
              <p className="font-bold text-sm text-foreground">English Community</p>
              <ArrowRight size={16} className="text-muted-foreground ms-auto rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
