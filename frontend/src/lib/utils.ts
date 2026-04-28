/**
 * Shared utility functions for the frontend.
 *
 *  - cn()             — merges Tailwind class names with conflict resolution
 *  - getBillingLabel() — converts a plan's contract term string into a localized billing label
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names using clsx, then resolves Tailwind conflicts via twMerge.
 * Used throughout the UI wherever conditional or merged class strings are needed.
 *
 * @example cn("px-4 py-2", isActive && "bg-[var(--ob-cta)] text-[var(--ob-cta-text)]")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps a plan's contractTerms string (e.g. "1 month", "90 days", "1 year")
 * to a localized billing cycle label (e.g. "/mo", "/3 mo", "/yr").
 * Defaults to per-month if the term is empty or unrecognized.
 *
 * @param term - The raw contract term string from the plan data
 * @param t    - Translation function from useLang()
 * @returns Localized billing label string
 */
export function getBillingLabel(term: string, t: (k: string) => string): string {
  if (!term) return t('planCard.perMonth');
  const l = term.toLowerCase();
  if (l.includes('day') && (l.includes('1 ') || l === 'day' || l === '1 day')) return t('planCard.perDay');
  if (l.includes('7 day') || l === '1 week') return t('planCard.perWeek');
  if (l === '35 days' || l === '5 weeks') return t('planCard.per5Weeks');
  if (l === '60 days' || l === '2 months') return t('planCard.per2Months');
  if (l === '90 days' || l === '3 months' || l === '3 months promo' || l === '12 weeks') return t('planCard.per3Months');
  if (l === '1 year') return t('planCard.perYear');
  return t('planCard.perMonth');
}
