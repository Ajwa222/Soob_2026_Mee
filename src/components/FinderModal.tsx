import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
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

  if (!show) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onDismiss}
        style={{ animation: 'fadeIn 0.2s ease-out both' }}
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onDismiss}
      >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plan Finder suggestion"
        className="w-full max-w-sm bg-surface rounded-2xl shadow-2xl border border-border/60 p-4 sm:p-6 text-center"
        style={{ animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={22} className="text-primary" />
        </div>
        <h3 className="font-heading font-bold text-lg text-text-primary">
          {t('finderModal.title')}
        </h3>
        <p className="text-sm text-text-secondary mt-2 leading-relaxed">
          {t('finderModal.desc')}
        </p>
        <div className="flex flex-col gap-2.5 mt-5">
          <button
            onClick={() => { onDismiss(); navigate('/finder'); }}
            className="w-full py-3 rounded-xl text-white font-bold text-sm
              hover:opacity-90 transition-all btn-press"
            style={{ background: 'var(--gradient-cta)' }}
          >
            {t('finderCta.cta')}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-surface-alt text-text-secondary font-semibold text-sm
              hover:bg-border transition-colors btn-press"
          >
            {t('finderModal.dismiss')}
          </button>
        </div>
      </div>
      </div>
    </>
  );
}
