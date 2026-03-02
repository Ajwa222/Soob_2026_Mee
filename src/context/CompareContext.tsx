import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { Plan } from '../types';

type ToastType = 'max' | null;

interface CompareContextValue {
  selectedPlans: Plan[];
  showOverlay: boolean;
  setShowOverlay: (show: boolean) => void;
  toast: ToastType;
  setToast: (t: ToastType) => void;
  addPlan: (plan: Plan) => void;
  removePlan: (planId: number) => void;
  togglePlan: (plan: Plan) => void;
  isSelected: (planId: number) => boolean;
  clearAll: () => void;
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
      return [...prev, plan];
    });
  }, []);

  const removePlan = useCallback((planId: number) => {
    setSelectedPlans(prev => prev.filter(p => p.id !== planId));
  }, []);

  const togglePlan = useCallback((plan: Plan) => {
    setSelectedPlans(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) return prev.filter(p => p.id !== plan.id);
      if (prev.length >= 3) {
        setToast('max');
        return prev;
      }
      return [...prev, plan];
    });
  }, []);

  const isSelected = useCallback((planId: number) => {
    return selectedPlans.some(p => p.id === planId);
  }, [selectedPlans]);

  const clearAll = useCallback(() => {
    setSelectedPlans([]);
    setShowOverlay(false);
  }, []);

  return (
    <CompareContext.Provider value={{
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
    }}>
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used within CompareProvider');
  return ctx;
};
