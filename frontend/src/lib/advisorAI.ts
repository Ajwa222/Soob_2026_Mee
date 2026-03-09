import { apiFetch } from './api';
import type { Plan } from '../types';

export type Priority =
  | 'unlimited_data'
  | 'cheap_price'
  | 'international_calls'
  | 'social_media'
  | 'five_g'
  | 'no_contract'
  | 'local_calls'
  | 'roaming';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  planIds?: number[];
}

export async function startAdvisorChat(
  priorities: Priority[],
  lang: 'en' | 'ar',
): Promise<{ reply: string; planIds: number[] }> {
  return apiFetch<{ reply: string; planIds: number[] }>('/api/advisor/start', {
    method: 'POST',
    body: JSON.stringify({ priorities, lang }),
  });
}

export async function sendAdvisorMessage(
  priorities: Priority[],
  lang: 'en' | 'ar',
  history: ChatMessage[],
  userMessage: string,
): Promise<{ reply: string; planIds: number[] }> {
  return apiFetch<{ reply: string; planIds: number[] }>('/api/advisor/message', {
    method: 'POST',
    body: JSON.stringify({ priorities, lang, history, userMessage }),
  });
}

/** Look up plans by IDs from the provided plans array. */
export function getPlansById(allPlans: Plan[], ids: number[]): Plan[] {
  return ids.map(id => allPlans.find(p => p.id === id)).filter(Boolean) as Plan[];
}
