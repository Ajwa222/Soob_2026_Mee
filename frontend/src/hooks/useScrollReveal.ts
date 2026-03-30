/**
 * Scroll animation hook for reveal-on-scroll effects.
 *
 * useScrollReveal(threshold) — returns [ref, isVisible]; once the element scrolls into view
 * (IntersectionObserver), isVisible becomes true permanently (fires once, then unobserves).
 */
import { useEffect, useRef, useState } from 'react';

/**
 * @param threshold - Fraction of the element that must be visible to trigger (0–1, default 0.15)
 * @returns [ref, isVisible] — attach ref to the element, isVisible flips to true once in viewport
 */
export function useScrollReveal(threshold = 0.15): [React.RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, isVisible] as const;
}
