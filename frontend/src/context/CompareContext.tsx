/**
 * Compare context — manages the "compare plans" feature (up to 3 plans side by side).
 *
 * State:
 *  - selectedPlans (max 3) — the plans currently in the compare tray
 *  - showOverlay — whether the full-screen compare overlay is visible
 *  - toast — shown when user tries to add a 4th plan ("max" toast)
 *
 * Actions: addPlan, removePlan, togglePlan, clearAll, loadPlans (from URL query), getShareUrl
 * All add/remove actions fire analytics events for tracking comparison behavior.
 */
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { Plan } from '../types';
import { trackEvent } from '../lib/analytics';

type ToastType = 'max' | null;    // 'max' = "you can only compare 3 plans" toast

interface CompareContextValue {
  selectedPlans: Plan[];           // Currently selected plans (0–3)
  showOverlay: boolean;            // Full-screen compare overlay visibility
  setShowOverlay: (show: boolean) => void;
  toast: ToastType;
  setToast: (t: ToastType) => void;
  addPlan: (plan: Plan) => void;
  removePlan: (planId: number) => void;
  togglePlan: (plan: Plan) => void;
  isSelected: (planId: number) => boolean;
  clearAll: () => void;
  loadPlans: (plans: Plan[]) => void;   // Bulk-load plans (e.g. from ?plans=1,2,3 URL)
  getShareUrl: () => string;            // Generates a shareable compare URL
}

const CompareContext = createContext<CompareContextValue | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [selectedPlans, setSelectedPlans] = useState<Plan[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [toast, setToast] = useState<ToastType>(null);

  // Auto-clear toast with proper cleanup (fixes timer leak)
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const addPlan = useCallback((plan: Plan) => {
    setSelectedPlans(prev => {
      if (prev.length >= 3) {
        setToast('max');
        return prev;
      }
      if (prev.find(p => p.id === plan.id)) return prev;
      trackEvent('plan_added_to_compare', { plan_id: plan.id, plan_name: plan.planName });
      return [...prev, plan];
    });
  }, []);

  const removePlan = useCallback((planId: number) => {
    trackEvent('plan_removed_from_compare', { plan_id: planId });
    setSelectedPlans(prev => prev.filter(p => p.id !== planId));
  }, []);

  const togglePlan = useCallback((plan: Plan) => {
    setSelectedPlans(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) {
        trackEvent('plan_removed_from_compare', { plan_id: plan.id });
        return prev.filter(p => p.id !== plan.id);
      }
      if (prev.length >= 3) {
        setToast('max');
        return prev;
      }
      trackEvent('plan_added_to_compare', { plan_id: plan.id, plan_name: plan.planName });
      return [...prev, plan];
    });
  }, []);

  // Use a ref so isSelected never changes identity
  const selectedPlansRef = useRef(selectedPlans);
  selectedPlansRef.current = selectedPlans;

  const isSelected = useCallback((planId: number) => {
    return selectedPlansRef.current.some(p => p.id === planId);
  }, []);

  const clearAll = useCallback(() => {
    setSelectedPlans([]);
    setShowOverlay(false);
  }, []);

  const loadPlans = useCallback((plans: Plan[]) => {
    setSelectedPlans(plans.slice(0, 3));
  }, []);

  const getShareUrl = useCallback(() => {
    const ids = selectedPlansRef.current.map(p => p.id).join(',');
    return `${window.location.origin}/compare?plans=${ids}`;
  }, []);

  // Memoize context value to prevent re-renders when unrelated state changes
  const value = useMemo(() => ({
    selectedPlans,
    showOverlay,
    setShowOverlay,
    toast,
    setToast,
    addPlan,
    removePlan,
    togglePlan,
    isSelected,
    clearAll,
    loadPlans,
    getShareUrl,
  }), [selectedPlans, showOverlay, toast, setShowOverlay, addPlan, removePlan, togglePlan, isSelected, clearAll, loadPlans, getShareUrl]);

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

/**
 * Hook to access compare state and actions.
 * Must be used within a CompareProvider — throws if not.
 */
export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};
