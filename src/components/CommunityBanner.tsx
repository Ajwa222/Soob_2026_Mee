import { useState } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useLang } from '../context/LanguageContext';

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
      <div className="relative overflow-hidden rounded-xl p-6 md:p-10 bg-primary">
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

          <Button
            onClick={handleJoin}
            variant="secondary"
            className="bg-white text-[#213E53] hover:bg-white/90 font-bold shrink-0 self-start md:self-center h-12 px-6"
          >
            {isArabic ? 'انضم الآن' : 'Join Now'}
            <ArrowRight size={17} className="rtl:rotate-180" />
          </Button>
        </div>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Users size={28} className="text-primary" />
            </div>
            <DialogTitle>Choose your community</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Pick the language you're most comfortable with</p>
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={ARABIC_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowModal(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Users size={20} className="text-white" />
              </div>
              <p className="font-bold text-sm text-foreground">المجتمع العربي</p>
              <ArrowRight size={16} className="text-muted-foreground ms-auto rtl:rotate-180" />
            </a>

            <a
              href={ENGLISH_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setShowModal(false)}
              className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-primary/10 hover:bg-primary/15 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Users size={20} className="text-white" />
              </div>
              <p className="font-bold text-sm text-foreground">English Community</p>
              <ArrowRight size={16} className="text-muted-foreground ms-auto rtl:rotate-180" />
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
