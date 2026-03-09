import OpenAI from 'openai';
import { PLANS_DATA } from '../data/plans';
import type { Plan } from '../types';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY as string;

function getClient() {
  if (!API_KEY) throw new Error('VITE_OPENAI_API_KEY is not set');
  return new OpenAI({ apiKey: API_KEY, dangerouslyAllowBrowser: true });
}

/** Compact plan summary for the LLM context (keeps token count low). */
function planToRow(p: Plan): string {
  return [
    `#${p.id}`,
    p.provider,
    p.planName,
    p.planType,
    `${p.priceSAR} SAR`,
    `Data:${p.dataGB}GB`,
    `Social:${p.socialMediaData}`,
    `LocalMin:${p.localCallMinutes}`,
    `IntlMin:${p.internationalCallMinutes}`,
    `SMS:${p.sms}`,
    p.specialFeatures && p.specialFeatures !== '-' ? p.specialFeatures : '',
    p.contractTerms,
  ].filter(Boolean).join(' | ');
}

function buildPlansContext(): string {
  return PLANS_DATA.map(planToRow).join('\n');
}

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
  planIds?: number[]; // plan IDs mentioned/recommended in this message
}

function buildSystemPrompt(priorities: Priority[], lang: 'en' | 'ar'): string {
  const priorityLabels: Record<Priority, string> = {
    unlimited_data: 'Unlimited / large data',
    cheap_price: 'Cheapest price',
    international_calls: 'International calling',
    social_media: 'Social media data',
    five_g: '5G support',
    no_contract: 'No contract / flexibility',
    local_calls: 'Lots of local call minutes',
    roaming: 'Roaming support',
  };

  const picked = priorities.map(p => priorityLabels[p]).join(', ');

  return `You are Simba, a friendly Saudi telecom plan advisor.

ROLE:
- Help the user find the best mobile plan from the catalog below.
- The user's top priorities are: ${picked}.
- Start by recommending your top 3 plans based on their priorities. Briefly explain why each plan fits.
- Then invite the user to ask follow-up questions (e.g. budget, specific carrier preference, more details).
- Keep answers concise (under 200 words). Use bullet points for plan comparisons.

RULES:
- ONLY recommend plans from the catalog below. Never invent plans.
- When you mention a plan, always include its ID like [#ID] so the app can show the plan card.
- If the user asks about something outside telecom plans, politely redirect.
- Respond in ${lang === 'ar' ? 'Arabic (Saudi dialect preferred)' : 'English'}.
- Never mention that you are an AI or LLM. You are "Simba, your plan advisor".
- Prices include 15% VAT already.

PLAN CATALOG:
${buildPlansContext()}`;
}

export async function startAdvisorChat(
  priorities: Priority[],
  lang: 'en' | 'ar',
): Promise<{ reply: string; planIds: number[] }> {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(priorities, lang);

  const firstUserMessage = lang === 'ar'
    ? 'مرحبا! ابي تساعدني ألقى أفضل باقة جوال تناسبني.'
    : 'Hi! Help me find the best mobile plan for my needs.';

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: firstUserMessage },
    ],
  });

  const reply = response.choices[0]?.message?.content ?? '';
  const planIds = extractPlanIds(reply);

  return { reply, planIds };
}

export async function sendAdvisorMessage(
  priorities: Priority[],
  lang: 'en' | 'ar',
  history: ChatMessage[],
  userMessage: string,
): Promise<{ reply: string; planIds: number[] }> {
  const client = getClient();
  const systemPrompt = buildSystemPrompt(priorities, lang);

  // Build conversation history for the model
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.text,
    })),
    { role: 'user', content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });

  const reply = response.choices[0]?.message?.content ?? '';
  const planIds = extractPlanIds(reply);

  return { reply, planIds };
}

/** Extract plan IDs from text like [#12] or [#3]. */
function extractPlanIds(text: string): number[] {
  const matches = text.matchAll(/\[#(\d+)\]/g);
  const ids = [...matches].map(m => parseInt(m[1], 10));
  // Deduplicate and validate against actual plan IDs
  const validIds = PLANS_DATA.map(p => p.id);
  return [...new Set(ids)].filter(id => validIds.includes(id));
}

/** Look up plans by IDs. */
export function getPlansById(ids: number[]): Plan[] {
  return ids.map(id => PLANS_DATA.find(p => p.id === id)).filter(Boolean) as Plan[];
}
