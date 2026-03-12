import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { apiFetch } from '../lib/api';
import type { Plan } from '../types';

export interface PlanEngagement {
  likes: number;
  dislikes: number;
  comments: number;
}

interface PlansContextValue {
  plans: Plan[];
  loading: boolean;
  engagement: Record<string, PlanEngagement>;
  refreshEngagement: () => void;
}

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<Record<string, PlanEngagement>>({});

  const refreshEngagement = useCallback(() => {
    apiFetch<Record<string, PlanEngagement>>('/api/plans/engagement')
      .then(setEngagement)
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Failed to fetch engagement:', err);
      });
  }, []);

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

    refreshEngagement();

    return () => { cancelled = true; };
  }, [refreshEngagement]);

  const value = useMemo(() => ({ plans, loading, engagement, refreshEngagement }), [plans, loading, engagement, refreshEngagement]);

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans(): PlansContextValue {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used within PlansProvider');
  return ctx;
}
