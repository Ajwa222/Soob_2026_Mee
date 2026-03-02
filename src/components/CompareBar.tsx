import { X } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useCompare } from '../context/CompareContext';
import { getCarrierColor, getCarrierLogo } from '../data/plans';
import CompareOverlay from './CompareOverlay';

export default function CompareBar() {
  const { t } = useLang();
  const { selectedPlans, removePlan, showOverlay, setShowOverlay, toast, setToast } = useCompare();

  if (selectedPlans.length === 0 && !toast && !showOverlay) return null;

  return (
    <>
      {/* Toast */}
      {toast === 'max' && (
        <div className="fixed top-20 inset-x-0 z-[70] flex justify-center pointer-events-none"
          style={{ animation: 'slideDown 0.3s ease-out' }}>
          <div className="bg-text-primary text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm mx-4 pointer-events-auto">
            <div className="flex items-center justify-between gap-3">
              <span>{t('compareBar.maxToast')}</span>
              <button onClick={() => setToast(null)} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="mt-2 h-0.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ animation: 'shrinkBar 4s linear forwards' }} />
            </div>
          </div>
        </div>
      )}

      {/* Compare Bar — compact: logos + counter + CTA */}
      {selectedPlans.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 px-4 pb-4 md:pb-4 pointer-events-none"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
          <div
            className="max-w-md mx-auto bg-surface rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-border/80 p-3 pointer-events-auto"
            style={{ animation: 'springUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
          >
            <div className="flex items-center gap-3">
              {/* Carrier logos */}
              <div className="flex items-center -space-x-2 shrink-0">
                {selectedPlans.map((plan) => {
                  const logo = getCarrierLogo(plan.provider);
                  const color = getCarrierColor(plan.provider);
                  return (
                    <button
                      key={plan.id}
                      onClick={() => removePlan(plan.id)}
                      className="relative w-10 h-10 rounded-xl bg-surface border-2 border-border/60 flex items-center justify-center
                        hover:border-error/40 transition-colors group"
                      style={{ animation: 'scaleIn 0.15s ease-out forwards' }}
                      title={plan.planName}
                    >
                      {logo
                        ? <img src={logo} alt={plan.provider} className="w-6 h-6 object-contain" />
                        : <div className="w-6 h-6 rounded-md" style={{ backgroundColor: color }} />
                      }
                      <div className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-error/90
                        flex items-center justify-center shadow-sm">
                        <X size={8} className="text-white" strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
                {/* Empty slots */}
                {Array.from({ length: 3 - selectedPlans.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="w-10 h-10 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center"
                  >
                    <span className="text-[10px] text-text-tertiary font-bold">+</span>
                  </div>
                ))}
              </div>

              {/* Counter */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">
                  {selectedPlans.length}/3
                </p>
                <p className="text-[11px] text-text-tertiary">
                  {t('compareBar.selected')}
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => selectedPlans.length >= 2 && setShowOverlay(true)}
                disabled={selectedPlans.length < 2}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 btn-press shrink-0
                  ${selectedPlans.length >= 2
                    ? 'bg-primary text-white hover:shadow-lg hover:shadow-primary/25'
                    : 'bg-border text-text-tertiary cursor-not-allowed'
                  }`}
              >
                {selectedPlans.length >= 2
                  ? t('compareBar.compareAction')
                  : t('compareBar.selectMoreShort')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comparison Overlay */}
      {showOverlay && <CompareOverlay />}

      <style>{`
        @keyframes shrinkBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
}
