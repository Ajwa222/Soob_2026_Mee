import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
