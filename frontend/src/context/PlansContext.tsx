/**
 * Plans context — fetches and provides the plan catalog and engagement data to the entire app.
 *
 * On mount:
 *  1. Fetches slim card data from GET /api/plans/cards (no auth needed, smaller payload)
 *  2. Fetches engagement counts (likes, dislikes, comments) from GET /api/plan-interactions/engagement
 *
 * The engagement data can be manually refreshed via refreshEngagement() (e.g. after a user likes a plan).
 */
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { Plan } from '../types';
import { getPlansCards, getEngagement } from '../services/plans.service';

/** Aggregated engagement counts for a single plan. */
export interface PlanEngagement {
  likes: number;
  dislikes: number;
  comments: number;
}

interface PlansContextValue {
  plans: Plan[];                                    // Full plan catalog (150+ plans)
  loading: boolean;                                 // True while initial fetch is in progress
  engagement: Record<string, PlanEngagement>;       // Keyed by plan ID
  refreshEngagement: () => void;                    // Re-fetch engagement data
}

const PlansContext = createContext<PlansContextValue | null>(null);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<Record<string, PlanEngagement>>({});

  const refreshEngagement = useCallback(() => {
    getEngagement()
      .then(setEngagement)
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('Failed to fetch engagement:', err);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Fetch slim card data — no auth needed, smaller payload
    getPlansCards()
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

/**
 * Hook to access the plan catalog and engagement data.
 * Must be used within a PlansProvider — throws if not.
 */
export function usePlans(): PlansContextValue {
  const ctx = useContext(PlansContext);
  if (!ctx) throw new Error('usePlans must be used within PlansProvider');
  return ctx;
}
