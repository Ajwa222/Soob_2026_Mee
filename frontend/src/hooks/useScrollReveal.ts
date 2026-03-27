/**
 * Scroll animation hooks for reveal-on-scroll and count-up effects.
 *
 *  - useScrollReveal(threshold) — returns [ref, isVisible]; once the element scrolls into view
 *    (IntersectionObserver), isVisible becomes true permanently (fires once, then unobserves).
 *  - useCountUp(target, duration, isVisible) — animates a number from 0 to target over duration ms,
 *    triggered when isVisible becomes true. Used for stat counters on the homepage.
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

/**
 * Animates a number from 0 → target over `duration` ms using setInterval at ~60fps.
 * Only starts when isVisible becomes true (pair with useScrollReveal).
 *
 * @param target    - Final number to count up to
 * @param duration  - Animation duration in milliseconds (default 1500)
 * @param isVisible - Trigger flag (usually from useScrollReveal)
 * @returns Current animated count value
 */
export function useCountUp(target: number, duration = 1500, isVisible = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, isVisible]);

  return count;
}
