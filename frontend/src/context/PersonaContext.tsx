import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from '@/lib/api';
import { createEmptySignals, inferSegmentFromSignals } from '@/lib/persona';
import type { PersonaProfile, PersonaSegment, PersonaSignals } from '@/types';

const STORAGE_KEY = 'simba-persona';
const SIGNAL_FLUSH_INTERVAL = 10_000; // 10 seconds

interface PersonaContextValue {
  persona: PersonaProfile | null;
  segment: PersonaSegment | null;
  loading: boolean;
  setPersona: (profile: PersonaProfile) => void;
  trackSignal: (type: keyof PersonaSignals, key?: string) => void;
  clearPersona: () => void;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);

function loadFromStorage(): PersonaProfile | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveToStorage(persona: PersonaProfile | null) {
  if (persona) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persona));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Merge two persona profiles: higher confidence wins, signals merge additively */
function mergePersonas(local: PersonaProfile, remote: PersonaProfile): PersonaProfile {
  const base = local.confidence >= remote.confidence ? local : remote;
  const other = base === local ? remote : local;

  const mergedSignals: PersonaSignals = { ...base.signals };

  // Merge categoriesViewed
  for (const [k, v] of Object.entries(other.signals.categoriesViewed)) {
    mergedSignals.categoriesViewed[k] = (mergedSignals.categoriesViewed[k] || 0) + v;
  }
  // Merge priceRangeClicks
  mergedSignals.priceRangeClicks.low += other.signals.priceRangeClicks.low;
  mergedSignals.priceRangeClicks.mid += other.signals.priceRangeClicks.mid;
  mergedSignals.priceRangeClicks.high += other.signals.priceRangeClicks.high;
  // Merge filtersUsed
  for (const [k, v] of Object.entries(other.signals.filtersUsed)) {
    mergedSignals.filtersUsed[k] = (mergedSignals.filtersUsed[k] || 0) + v;
  }
  // Merge planTypesViewed
  for (const [k, v] of Object.entries(other.signals.planTypesViewed)) {
    mergedSignals.planTypesViewed[k] = (mergedSignals.planTypesViewed[k] || 0) + v;
  }
  mergedSignals.totalPlanViews += other.signals.totalPlanViews;
  mergedSignals.compareCount += other.signals.compareCount;

  return {
    ...base,
    signals: mergedSignals,
    updatedAt: Date.now(),
  };
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [persona, setPersonaState] = useState<PersonaProfile | null>(loadFromStorage);
  const [loading, setLoading] = useState(false);

  // Signal buffer for batching
  const signalBuffer = useRef<Partial<PersonaSignals>>(createEmptySignals());
  // Accumulated signals for users with no persona yet (persists across flushes)
  const pendingSignals = useRef<PersonaSignals>(createEmptySignals());
  const consecutiveInferenceMatches = useRef(0);
  const lastInferredSegment = useRef<PersonaSegment | null>(null);

  // Load persona from backend on login
  useEffect(() => {
    if (!isLoggedIn || !user) return;

    let cancelled = false;
    setLoading(true);

    apiFetch<{ persona: PersonaProfile | null }>('/api/persona')
      .then(({ persona: remote }) => {
        if (cancelled) return;
        const local = loadFromStorage();

        if (remote && local) {
          // Merge local + remote
          const merged = mergePersonas(local, remote);
          setPersonaState(merged);
          saveToStorage(merged);
          // Sync merged back to backend
          apiFetch('/api/persona', {
            method: 'PUT',
            body: JSON.stringify({ persona: merged }),
          }).catch(() => { /* non-critical */ });
        } else if (remote) {
          setPersonaState(remote);
          saveToStorage(remote);
        } else if (local) {
          // Push local to backend
          apiFetch('/api/persona', {
            method: 'PUT',
            body: JSON.stringify({ persona: local }),
          }).catch(() => { /* non-critical */ });
        }
      })
      .catch(() => { /* keep local */ })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [isLoggedIn, user]);

  // Set persona (from advisor inference or re-inference)
  const setPersona = useCallback((profile: PersonaProfile) => {
    // Merge any pending signals accumulated before persona existed
    const pending = pendingSignals.current;
    const mergedSignals = { ...profile.signals };
    for (const [k, v] of Object.entries(pending.categoriesViewed)) {
      mergedSignals.categoriesViewed[k] = (mergedSignals.categoriesViewed[k] || 0) + v;
    }
    mergedSignals.priceRangeClicks.low += pending.priceRangeClicks.low;
    mergedSignals.priceRangeClicks.mid += pending.priceRangeClicks.mid;
    mergedSignals.priceRangeClicks.high += pending.priceRangeClicks.high;
    for (const [k, v] of Object.entries(pending.filtersUsed)) {
      mergedSignals.filtersUsed[k] = (mergedSignals.filtersUsed[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(pending.planTypesViewed)) {
      mergedSignals.planTypesViewed[k] = (mergedSignals.planTypesViewed[k] || 0) + v;
    }
    mergedSignals.totalPlanViews += pending.totalPlanViews;
    mergedSignals.compareCount += pending.compareCount;
    pendingSignals.current = createEmptySignals();

    const finalProfile = { ...profile, signals: mergedSignals };
    setPersonaState(finalProfile);
    saveToStorage(finalProfile);

    if (isLoggedIn) {
      apiFetch('/api/persona', {
        method: 'PUT',
        body: JSON.stringify({ persona: finalProfile }),
      }).catch(() => { /* non-critical */ });
    }
  }, [isLoggedIn]);

  const clearPersona = useCallback(() => {
    setPersonaState(null);
    localStorage.removeItem(STORAGE_KEY);
    pendingSignals.current = createEmptySignals();
    signalBuffer.current = createEmptySignals();
    consecutiveInferenceMatches.current = 0;
    lastInferredSegment.current = null;

    if (isLoggedIn) {
      apiFetch('/api/persona', {
        method: 'DELETE',
      }).catch(() => { /* non-critical */ });
    }
  }, [isLoggedIn]);

  // Track a signal (accumulated in buffer, flushed periodically)
  const trackSignal = useCallback((type: keyof PersonaSignals, key?: string) => {
    const buf = signalBuffer.current;
    switch (type) {
      case 'categoriesViewed':
        if (key) {
          const cv = (buf.categoriesViewed || {});
          cv[key] = (cv[key] || 0) + 1;
          buf.categoriesViewed = cv;
        }
        break;
      case 'priceRangeClicks':
        if (key && (key === 'low' || key === 'mid' || key === 'high')) {
          const pr = buf.priceRangeClicks || { low: 0, mid: 0, high: 0 };
          pr[key] += 1;
          buf.priceRangeClicks = pr;
        }
        break;
      case 'filtersUsed':
        if (key) {
          const fu = (buf.filtersUsed || {});
          fu[key] = (fu[key] || 0) + 1;
          buf.filtersUsed = fu;
        }
        break;
      case 'planTypesViewed':
        if (key) {
          const pt = (buf.planTypesViewed || {});
          pt[key] = (pt[key] || 0) + 1;
          buf.planTypesViewed = pt;
        }
        break;
      case 'totalPlanViews':
        buf.totalPlanViews = (buf.totalPlanViews || 0) + 1;
        break;
      case 'compareCount':
        buf.compareCount = (buf.compareCount || 0) + 1;
        break;
    }
  }, []);

  // Flush signals periodically
  useEffect(() => {
    const flush = () => {
      const buf = signalBuffer.current;
      const hasData = Object.values(buf).some((v) =>
        typeof v === 'number' ? v > 0 : typeof v === 'object' && Object.keys(v).length > 0
      );
      if (!hasData) return;

      // Merge into current persona's signals locally
      setPersonaState((prev) => {
        const baseSignals = prev?.signals ?? pendingSignals.current;
        const merged = { ...baseSignals };
        if (buf.categoriesViewed) {
          for (const [k, v] of Object.entries(buf.categoriesViewed)) {
            merged.categoriesViewed[k] = (merged.categoriesViewed[k] || 0) + v;
          }
        }
        if (buf.priceRangeClicks) {
          merged.priceRangeClicks.low += buf.priceRangeClicks.low || 0;
          merged.priceRangeClicks.mid += buf.priceRangeClicks.mid || 0;
          merged.priceRangeClicks.high += buf.priceRangeClicks.high || 0;
        }
        if (buf.filtersUsed) {
          for (const [k, v] of Object.entries(buf.filtersUsed)) {
            merged.filtersUsed[k] = (merged.filtersUsed[k] || 0) + v;
          }
        }
        if (buf.planTypesViewed) {
          for (const [k, v] of Object.entries(buf.planTypesViewed)) {
            merged.planTypesViewed[k] = (merged.planTypesViewed[k] || 0) + v;
          }
        }
        merged.totalPlanViews += buf.totalPlanViews || 0;
        merged.compareCount += buf.compareCount || 0;

        // Re-inference check
        const inferred = inferSegmentFromSignals(merged);

        if (!prev) {
          // Persist accumulated signals so next flush builds on them
          pendingSignals.current = merged;

          // Bootstrap a new persona from signals alone
          if (inferred.confidence > 0.4) {
            if (inferred.segment === lastInferredSegment.current) {
              consecutiveInferenceMatches.current += 1;
            } else {
              lastInferredSegment.current = inferred.segment;
              consecutiveInferenceMatches.current = 1;
            }
            if (consecutiveInferenceMatches.current >= 2) {
              pendingSignals.current = createEmptySignals(); // reset
              const newPersona: PersonaProfile = {
                segment: inferred.segment,
                confidence: inferred.confidence,
                signals: merged,
                updatedAt: Date.now(),
                createdAt: Date.now(),
              };
              saveToStorage(newPersona);
              return newPersona;
            }
          }
          return prev; // not enough signal yet
        }

        const updated = { ...prev, signals: merged, updatedAt: Date.now() };
        saveToStorage(updated);

        if (inferred.confidence > 0.7) {
          if (inferred.segment === lastInferredSegment.current) {
            consecutiveInferenceMatches.current += 1;
          } else {
            lastInferredSegment.current = inferred.segment;
            consecutiveInferenceMatches.current = 1;
          }

          // Auto-update after 3 consecutive matches
          if (consecutiveInferenceMatches.current >= 3 && inferred.segment !== prev.segment) {
            const reInferred = {
              ...updated,
              segment: inferred.segment,
              confidence: inferred.confidence,
            };
            saveToStorage(reInferred);
            return reInferred;
          }
        }

        return updated;
      });

      // Send to backend if logged in
      if (isLoggedIn) {
        apiFetch('/api/persona/signals', {
          method: 'POST',
          body: JSON.stringify({ signals: buf }),
        }).catch(() => { /* non-critical */ });
      }

      // Reset buffer
      signalBuffer.current = createEmptySignals();
    };

    const interval = setInterval(flush, SIGNAL_FLUSH_INTERVAL);

    // Also flush on page unload
    const handleUnload = () => flush();
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      flush(); // flush on unmount
    };
  }, [isLoggedIn]);

  return (
    <PersonaContext.Provider value={{
      persona,
      segment: persona?.segment ?? null,
      loading,
      setPersona,
      trackSignal,
      clearPersona,
    }}>
      {children}
    </PersonaContext.Provider>
  );
}

export const usePersona = () => {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider');
  return ctx;
};
