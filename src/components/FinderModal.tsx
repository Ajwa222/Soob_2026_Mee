import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';

const STORAGE_KEY = 'simba-finder-modal-dismissed';

export function useFinderModal() {
  const [show, setShow] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setShow(false);
  }, []);
  return { show, dismiss };
}

export default function FinderModal({ show, onDismiss }: { show: boolean; onDismiss: () => void }) {
  const { t } = useLang();
  const navigate = useNavigate();

  return (
    <Dialog open={show} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles size={22} className="text-primary" />
        </div>
        <DialogTitle className="text-center">{t('finderModal.title')}</DialogTitle>
        <DialogDescription className="text-center">{t('finderModal.desc')}</DialogDescription>
        <div className="flex flex-col gap-2.5 mt-2">
          <Button
            onClick={() => { onDismiss(); navigate('/finder'); }}
            className="bg-primary text-white"
          >
            {t('finderCta.cta')}
          </Button>
          <Button variant="secondary" onClick={onDismiss}>
            {t('finderModal.dismiss')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
