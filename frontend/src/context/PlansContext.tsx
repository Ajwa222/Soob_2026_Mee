import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import type { Plan } from '../types';

interface PlansContextValue {
  plans: Plan[];
  loading: boolean;
}

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    apiFetch<Plan[]>('/api/plans')
      .then((data) => {
        if (!cancelled) {
          setPlans(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch plans:', err);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <PlansContext.Provider value={{ plans, loading }}>
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans(): PlansContextValue {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used within PlansProvider');
  return ctx;
}
