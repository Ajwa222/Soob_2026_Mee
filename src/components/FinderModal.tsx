import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useLang } from '../context/LanguageContext';

const SESSION_KEY = 'simba-finder-modal-dismissed';

export function useFinderModal() {
  const [show, setShow] = useState(() => !sessionStorage.getItem(SESSION_KEY));
  const dismiss = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, 'true');
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
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onDismiss}
        style={{ animation: 'fadeIn 0.2s ease-out both' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plan Finder suggestion"
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] max-w-[calc(100vw-2rem)]
          bg-surface rounded-2xl shadow-2xl border border-border/60 p-6 text-center"
        style={{ animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
      >
        <div className="w-12 h-12 rounded-xl bg-[#1FA9FF]/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={22} className="text-[#1FA9FF]" />
        </div>
        <h3 className="font-heading font-bold text-lg text-[#213E53]">
          {t('finderModal.title')}
        </h3>
        <p className="text-sm text-[#213E53]/70 mt-2 leading-relaxed">
          {t('finderModal.desc')}
        </p>
        <div className="flex flex-col gap-2.5 mt-5">
          <button
            onClick={() => { onDismiss(); navigate('/finder'); }}
            className="w-full py-3 rounded-xl text-white font-bold text-sm
              hover:opacity-90 transition-all btn-press"
            style={{ background: 'linear-gradient(135deg, #1FA9FF, #6dcbca)' }}
          >
            {t('finderCta.cta')}
          </button>
          <button
            onClick={onDismiss}
            className="w-full py-3 rounded-xl bg-surface-alt text-[#213E53]/70 font-semibold text-sm
              hover:bg-border transition-colors btn-press"
          >
            {t('finderModal.dismiss')}
          </button>
        </div>
      </div>
    </>
  );
}
