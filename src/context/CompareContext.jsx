import { createContext, useContext, useState, useCallback } from 'react';

const CompareContext = createContext();

export function CompareProvider({ children }) {
  const [selectedPlans, setSelectedPlans] = useState([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [toast, setToast] = useState(null);

  const addPlan = useCallback((plan) => {
    setSelectedPlans(prev => {
      if (prev.length >= 3) {
        setToast('max');
        setTimeout(() => setToast(null), 4000);
        return prev;
      }
      if (prev.find(p => p.id === plan.id)) return prev;
      return [...prev, plan];
    });
  }, []);

  const removePlan = useCallback((planId) => {
    setSelectedPlans(prev => prev.filter(p => p.id !== planId));
  }, []);

  const togglePlan = useCallback((plan) => {
    setSelectedPlans(prev => {
      const exists = prev.find(p => p.id === plan.id);
      if (exists) return prev.filter(p => p.id !== plan.id);
      if (prev.length >= 3) {
        setToast('max');
        setTimeout(() => setToast(null), 4000);
        return prev;
      }
      return [...prev, plan];
    });
  }, []);

  const isSelected = useCallback((planId) => {
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

export const useCompare = () => useContext(CompareContext);
