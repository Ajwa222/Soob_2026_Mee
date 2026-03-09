import { apiFetch } from './api';
import type { Plan } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  planIds?: number[];
}

export async function sendAdvisorMessage(
  lang: 'en' | 'ar',
  history: ChatMessage[],
  userMessage: string,
): Promise<{ reply: string; planIds: number[] }> {
  return apiFetch<{ reply: string; planIds: number[] }>('/api/advisor/message', {
    method: 'POST',
    body: JSON.stringify({ lang, history, userMessage }),
  });
}

/** Look up plans by IDs from the provided plans array. */
export function getPlansById(allPlans: Plan[], ids: number[]): Plan[] {
  return ids.map(id => allPlans.find(p => p.id === id)).filter(Boolean) as Plan[];
}
