/**
 * Sticky bottom compare bar — shows selected plans and triggers the comparison overlay.
 *
 * Visible when 1–3 plans are selected via CompareContext.
 * Shows plan thumbnails, a "Compare Now" button, and auto-suggests similar plans
 * when only 1 plan is selected (based on price range).
 * Also displays a toast when the user tries to add a 4th plan.
 */
import { useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLang } from '../context/LanguageContext';
import { useCompare } from '../context/CompareContext';
import { usePlans } from '../context/PlansContext';
import { getCarrierColor, getCarrierLogo } from '../data/plans';
import { trackEvent } from '../lib/analytics';
import CompareOverlay from './CompareOverlay';

export default function CompareBar() {
  const { t, lang } = useLang();
  const { selectedPlans, removePlan, addPlan, showOverlay, setShowOverlay, toast, setToast } = useCompare();
  const { plans } = usePlans();

  // Auto-suggest 2 plans when only 1 is selected — similar price range
  const suggestedPlans = useMemo(() => {
    if (selectedPlans.length !== 1 || plans.length === 0) return [];
    const current = selectedPlans[0];
    return plans
      .filter((p) => p.id !== current.id)
      .filter((p) => Math.abs(p.priceSAR - current.priceSAR) < current.priceSAR * 0.5)
      .sort((a, b) => Math.abs(a.priceSAR - current.priceSAR) - Math.abs(b.priceSAR - current.priceSAR))
      .slice(0, 2);
  }, [selectedPlans, plans]);

  if (selectedPlans.length === 0 && !toast && !showOverlay) return null;

  return (
    <>
      {/* Toast */}
      {toast === 'max' && (
        <div className="fixed top-20 inset-x-0 z-[70] flex justify-center pointer-events-none">
          <div className="bg-foreground text-background px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm mx-4 pointer-events-auto">
            <div className="flex items-center justify-between gap-3">
              <span>{t('compareBar.maxToast')}</span>
              <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Bar */}
      {selectedPlans.length > 0 && (
        <div
          className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 px-4 pointer-events-none"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-md mx-auto bg-card rounded-xl shadow-lg border border-border p-3 pointer-events-auto">
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
                      className="relative w-10 h-10 rounded-lg bg-card border-2 border-border flex items-center justify-center hover:border-destructive/40 transition-colors"
                      title={plan.planName}
                    >
                      {logo
                        ? <img src={logo} alt={plan.provider} className="w-6 h-6 object-contain" />
                        : <div className="w-6 h-6 rounded-md" style={{ backgroundColor: color }} />
                      }
                      <div className="absolute -top-1.5 -end-1.5 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                        <X size={8} className="text-white" strokeWidth={3} />
                      </div>
                    </button>
                  );
                })}
                {Array.from({ length: 3 - selectedPlans.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground font-bold">+</span>
                  </div>
                ))}
              </div>

              {/* Counter */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <Badge variant="secondary" className="text-xs">{selectedPlans.length}/3</Badge>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('compareBar.selected')}</p>
              </div>

              {/* CTA */}
              <Button
                onClick={() => {
                  if (selectedPlans.length >= 2) {
                    trackEvent('compare_overlay_opened', { plan_count: selectedPlans.length, plan_ids: selectedPlans.map(p => p.id) });
                    setShowOverlay(true);
                  }
                }}
                disabled={selectedPlans.length < 2}
                size="sm"
              >
                {selectedPlans.length >= 2
                  ? t('compareBar.compareAction')
                  : t('compareBar.selectMoreShort')}
              </Button>
            </div>

            {/* Auto-suggest comparisons */}
            {suggestedPlans.length > 0 && selectedPlans.length === 1 && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1.5">
                  <Sparkles size={10} className="text-primary" />
                  {lang === 'ar' ? 'مقترحات للمقارنة' : 'Suggested comparisons'}
                </p>
                <div className="flex gap-1.5">
                  {suggestedPlans.map((plan) => {
                    const logo = getCarrierLogo(plan.provider);
                    return (
                      <button
                        key={plan.id}
                        onClick={() => {
                          addPlan(plan);
                          trackEvent('compare_suggestion_added', { plan_id: plan.id });
                        }}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 hover:bg-muted text-[10px] font-medium text-foreground transition-colors"
                      >
                        {logo && <img src={logo} alt={plan.provider} className="w-4 h-4 object-contain" />}
                        <span className="truncate max-w-[80px]">{plan.priceSAR} SAR</span>
                        <span className="text-primary font-bold">+</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showOverlay && <CompareOverlay />}
    </>
  );
}
