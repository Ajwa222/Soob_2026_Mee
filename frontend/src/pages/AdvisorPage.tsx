/**
 * Advisor page ("/advisor") — AI-powered plan recommendation chat.
 *
 * Features:
 *  - Full-height chat interface with message bubbles (user + assistant)
 *  - Sends messages to POST /api/advisor/message (OpenAI GPT-4 mini backend)
 *  - Renders referenced plans as inline PlanCard components within chat messages
 *  - Two entry modes: "Guide me" (structured Q&A) or "I know what I want" (freeform)
 *  - Conversation history persisted in Firestore for logged-in users
 *  - Auto-scrolls to latest message, typing indicators while AI responds
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Loader2,
  Bot, ArrowLeft,
  HelpCircle, MessageSquareText,
  Wifi, Phone, Globe, Share2,
  ChevronRight,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { getFirebaseDb } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { usePlans } from '../context/PlansContext';
import { CARRIERS } from '../data/plans';
import type { Plan } from '../types';
import { trackEvent } from '../lib/analytics';
import {
  sendAdvisorMessage, getPlansById,
  type ChatMessage,
} from '../services/advisor.service';
import { ConnectedPlanCard } from '../components/PlanCard';
import WaveLines from '../components/WaveLines';
import { Button } from '@/components/ui/button';

// ─── Simple markdown renderer (bold, italic, bullet lists) ───
function renderMarkdown(text: string) {
  // Split into lines for list handling
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-1 my-1">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^[\s]*[-•*]\s+(.*)/);
    const numberedMatch = line.match(/^[\s]*\d+[.)]\s+(.*)/);

    if (bulletMatch || numberedMatch) {
      listItems.push((bulletMatch || numberedMatch)![1]);
    } else {
      flushList();
      if (line.trim() === '') {
        if (i > 0 && i < lines.length - 1) {
          elements.push(<br key={`br-${i}`} />);
        }
      } else {
        if (elements.length > 0) elements.push(<br key={`br-${i}`} />);
        elements.push(<span key={`line-${i}`}>{renderInline(line)}</span>);
      }
    }
  }
  flushList();
  return <>{elements}</>;
}

function renderInline(text: string): React.ReactNode {
  // Parse **bold** and *italic*
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

// Rotating search status messages
function useSearchStatus(loading: boolean, t: (k: string) => string) {
  const [statusIdx, setStatusIdx] = useState(0);
  const statusMessages = [t('advisor.searching'), t('advisor.findingBest'), t('advisor.almostThere')];

  useEffect(() => {
    if (!loading) { setStatusIdx(0); return; }
    const interval = setInterval(() => {
      setStatusIdx(prev => (prev + 1) % statusMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [loading, statusMessages.length]);

  return statusMessages[statusIdx];
}

function InlineScanningWidget({ plans, lang, searchStatus }: { plans: Plan[]; lang: string; searchStatus: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [litCarriers, setLitCarriers] = useState<Set<string>>(new Set());

  const shuffled = useMemo(() => {
    const arr = plans.filter(p => p.planType !== 'Data-only');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [plans]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const next = (prev + 1) % shuffled.length;
        const plan = shuffled[next];
        setLitCarriers(s => new Set(s).add(plan.provider));
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [shuffled]);

  const current = shuffled[currentIndex];
  const carrierLogo = CARRIERS.find(c => c.name === current?.provider);

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] md:max-w-[75%] bg-muted rounded-2xl rounded-bl-md p-4 space-y-3">
        {/* Scanning plan card */}
        <div className="relative bg-background/60 border border-border/40 rounded-xl p-3 overflow-hidden">
          {/* Scan line */}
          <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
            <div className="absolute inset-x-0 h-6 bg-gradient-to-b from-primary/8 to-transparent animate-[scan_1s_ease-in-out_infinite]" />
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {carrierLogo && (
                <img
                  key={current?.id}
                  src={carrierLogo.logo}
                  alt={current?.provider}
                  className="w-6 h-6 object-contain opacity-70"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-xs font-medium truncate blur-[1px]">
                {current?.planName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-foreground font-bold text-sm tabular-nums blur-[1.5px]">
                  {current?.priceSAR}
                </span>
                <span className="text-muted-foreground/50 text-[10px]">{lang === 'ar' ? 'ر.س' : 'SAR'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Carrier dots */}
        <div className="flex items-center justify-center gap-1.5">
          {CARRIERS.map(c => (
            <div
              key={c.name}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-300 ${
                litCarriers.has(c.name)
                  ? 'bg-background border border-border scale-100'
                  : 'bg-muted/50 border border-transparent scale-90 opacity-30'
              }`}
            >
              <img src={c.logo} alt={c.name} className="w-4 h-4 object-contain" />
            </div>
          ))}
        </div>

        {/* Status */}
        <p className="text-center text-muted-foreground text-xs animate-pulse">
          {searchStatus}
        </p>
      </div>
    </div>
  );
}

// ─── Guided flow: conversational step-by-step questionnaire ───
// Each step shows a question with interactive chips/slider inside the chat.
// When the user picks an option, a user bubble + AI acknowledgment are added
// to the conversation before the next question appears.

type GuideAnswers = {
  internet: 'lot' | 'sometimes' | 'none' | '';
  calls: 'none' | 'some' | 'lot' | '';
  intl: 'no' | 'sometimes' | 'lot' | '';
  social: 'no' | 'sometimes' | 'lot' | '';
  budget: number;       // SAR, 0 = no limit
};

/** Returns the ordered list of guide steps, skipping social if internet='none' */
function getGuideSteps(answers: GuideAnswers): ('internet' | 'calls' | 'intl' | 'social' | 'budget')[] {
  const steps: ('internet' | 'calls' | 'intl' | 'social' | 'budget')[] = ['internet', 'calls', 'intl'];
  if (answers.internet !== 'none') steps.push('social');
  steps.push('budget');
  return steps;
}
const BUDGET_MIN = 30;
const BUDGET_MAX = 500;
const BUDGET_STEP = 10;

function OptionChip({ selected, onClick, icon, label }: {
  selected: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all cursor-pointer
        ${selected
          ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
          : 'border-border bg-background hover:border-primary/40'
        }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
        selected ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
      }`}>
        {icon}
      </div>
      <span className={`font-medium text-sm ${selected ? 'text-primary' : 'text-foreground'}`}>{label}</span>
    </button>
  );
}

/** Renders the current guide step question with interactive UI */
function GuideStepUI({ stepIndex, steps, answers, setAnswers, onSubmit, t }: {
  stepIndex: number;
  steps: ReturnType<typeof getGuideSteps>;
  answers: GuideAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<GuideAnswers>>;
  onSubmit: () => void;
  t: (k: string) => string;
}) {
  const totalSteps = steps.length;
  const currentStep = steps[stepIndex];
  const stepIndicator = t('advisor.guideStepOf')
    .replace('{current}', String(stepIndex + 1))
    .replace('{total}', String(totalSteps));

  const canSubmit = () => {
    switch (currentStep) {
      case 'internet': return answers.internet !== '';
      case 'calls': return answers.calls !== '';
      case 'intl': return answers.intl !== '';
      case 'social': return answers.social !== '';
      case 'budget': return true;
      default: return false;
    }
  };

  return (
    <div className="flex justify-start">
      <div className="w-full max-w-[85%] md:max-w-[75%] bg-muted rounded-2xl rounded-bl-md p-4 space-y-4 animate-fade-up">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-medium">{stepIndicator}</span>
          <div className="flex gap-1">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'w-5 bg-primary' : 'w-2 bg-border'
              }`} />
            ))}
          </div>
        </div>

        {/* Internet usage */}
        {currentStep === 'internet' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t('advisor.guideInternetTitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              <OptionChip selected={answers.internet === 'none'} onClick={() => setAnswers(a => ({ ...a, internet: 'none' }))} icon={<Wifi size={18} />} label={t('advisor.guideInternetNone')} />
              <OptionChip selected={answers.internet === 'sometimes'} onClick={() => setAnswers(a => ({ ...a, internet: 'sometimes' }))} icon={<Wifi size={18} />} label={t('advisor.guideInternetSometimes')} />
              <OptionChip selected={answers.internet === 'lot'} onClick={() => setAnswers(a => ({ ...a, internet: 'lot' }))} icon={<Wifi size={18} />} label={t('advisor.guideInternetLot')} />
            </div>
          </div>
        )}

        {/* Local calls */}
        {currentStep === 'calls' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t('advisor.guideCallsTitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              <OptionChip selected={answers.calls === 'none'} onClick={() => setAnswers(a => ({ ...a, calls: 'none' }))} icon={<Phone size={18} />} label={t('advisor.guideCallsNone')} />
              <OptionChip selected={answers.calls === 'some'} onClick={() => setAnswers(a => ({ ...a, calls: 'some' }))} icon={<Phone size={18} />} label={t('advisor.guideCallsSome')} />
              <OptionChip selected={answers.calls === 'lot'} onClick={() => setAnswers(a => ({ ...a, calls: 'lot' }))} icon={<Phone size={18} />} label={t('advisor.guideCallsLot')} />
            </div>
          </div>
        )}

        {/* International calls */}
        {currentStep === 'intl' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t('advisor.guideIntlTitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              <OptionChip selected={answers.intl === 'no'} onClick={() => setAnswers(a => ({ ...a, intl: 'no' }))} icon={<Globe size={18} />} label={t('advisor.guideIntlNo')} />
              <OptionChip selected={answers.intl === 'sometimes'} onClick={() => setAnswers(a => ({ ...a, intl: 'sometimes' }))} icon={<Globe size={18} />} label={t('advisor.guideIntlSometimes')} />
              <OptionChip selected={answers.intl === 'lot'} onClick={() => setAnswers(a => ({ ...a, intl: 'lot' }))} icon={<Globe size={18} />} label={t('advisor.guideIntlLot')} />
            </div>
          </div>
        )}

        {/* Social media */}
        {currentStep === 'social' && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t('advisor.guideSocialTitle')}</p>
            <div className="grid grid-cols-3 gap-2">
              <OptionChip selected={answers.social === 'no'} onClick={() => setAnswers(a => ({ ...a, social: 'no' }))} icon={<Share2 size={18} />} label={t('advisor.guideSocialNo')} />
              <OptionChip selected={answers.social === 'sometimes'} onClick={() => setAnswers(a => ({ ...a, social: 'sometimes' }))} icon={<Share2 size={18} />} label={t('advisor.guideSocialSometimes')} />
              <OptionChip selected={answers.social === 'lot'} onClick={() => setAnswers(a => ({ ...a, social: 'lot' }))} icon={<Share2 size={18} />} label={t('advisor.guideSocialLot')} />
            </div>
          </div>
        )}

        {/* Budget slider */}
        {currentStep === 'budget' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">{t('advisor.guideBudgetTitle')}</p>
            <div className="space-y-3">
              <div className="text-center">
                <span className="text-2xl font-bold text-primary tabular-nums">
                  {answers.budget === 0
                    ? t('advisor.guideBudgetAny')
                    : t('advisor.guideBudgetValue').replace('{value}', String(answers.budget))
                  }
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={answers.budget}
                onChange={e => {
                  const v = Number(e.target.value);
                  setAnswers(a => ({ ...a, budget: v < BUDGET_MIN ? 0 : v }));
                }}
                className="w-full h-2 bg-border rounded-full appearance-none cursor-pointer accent-primary
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t('advisor.guideBudgetAny')}</span>
                <span>{BUDGET_MAX}+</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit()}
            onClick={onSubmit}
            className="rounded-xl gap-1"
          >
            {stepIndex === totalSteps - 1 ? t('advisor.guideFindPlans') : t('advisor.guideNext')}
            <ChevronRight size={14} className="rtl:rotate-180" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Returns the user-facing text for a guide answer (shown as user bubble) */
function guideUserText(stepName: string, answers: GuideAnswers, t: (k: string) => string): string {
  switch (stepName) {
    case 'internet': return t(`advisor.guideInternet${capitalize(answers.internet)}`);
    case 'calls': return t(`advisor.guideCalls${capitalize(answers.calls)}`);
    case 'intl': return t(`advisor.guideIntl${capitalize(answers.intl)}`);
    case 'social': return t(`advisor.guideSocial${capitalize(answers.social)}`);
    case 'budget': return answers.budget === 0 ? t('advisor.guideBudgetAny') : t('advisor.guideBudgetValue').replace('{value}', String(answers.budget));
    default: return '';
  }
}


function capitalize(s: string): string {
  if (s === 'lot') return 'Lot';
  if (s === 'none') return 'None';
  if (s === 'some') return 'Some';
  if (s === 'sometimes') return 'Sometimes';
  if (s === 'yes') return 'Yes';
  if (s === 'no') return 'No';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function AdvisorPage() {
  const { t, lang } = useLang();
  const [, setSearchParams] = useSearchParams();
  const { plans } = usePlans();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchStatus = useSearchStatus(loading, t);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitialized = useRef(false);

  // Whether the user has picked a quick-action card (hides the cards once chosen)
  const [started, setStarted] = useState(false);
  // Guided flow state: -1 = not active, 0-4 = current step
  const [guideStep, setGuideStep] = useState(-1);
  const [guideAnswers, setGuideAnswers] = useState<GuideAnswers>({
    internet: '', calls: '', intl: '', social: '', budget: 150,
  });
  // True only when doing the final plan search (shows scanning widget)
  const searchingPlans = useRef(false);

  // Try to resume saved conversation on mount (logged-in users)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    if (!user?.uid) return;
    const init = async () => {
      try {
        const db = await getFirebaseDb();
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'users', user.uid, 'advisor', 'lastConversation'));
        if (snap.exists()) {
          const data = snap.data();
          if (data?.messages?.length > 0) {
            setMessages(data.messages as ChatMessage[]);
            setStarted(true);
            setSearchParams({ chat: '1' }, { replace: true });
            trackEvent('advisor_conversation_resumed');
          }
        }
      } catch {
        // Silently fail — show welcome + cards
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle quick-action card click
  const handleQuickAction = useCallback(async (mode: 'guide' | 'direct') => {
    if (loading) return;
    setStarted(true);
    setSearchParams({ chat: '1' }, { replace: true });
    trackEvent('advisor_started', { mode });

    if (mode === 'guide') {
      // Show interactive questionnaire — start at step 0
      setGuideStep(0);
      return;
    }

    // Direct mode — show a prompt asking user to describe their needs
    const askText = lang === 'ar'
      ? 'حياك! وش تبي في باقتك؟ قول لي احتياجك وأرشح لك الأنسب.'
      : 'Welcome! What are you looking for in a plan? Tell me your needs and I\'ll find the best match.';

    setMessages([{ role: 'assistant', text: askText }]);
  }, [loading, lang, setSearchParams]);

  // Handle guided flow step submission — send user answer to AI, get ack, advance
  const handleGuideStepSubmit = useCallback(async () => {
    const steps = getGuideSteps(guideAnswers);
    const stepName = steps[guideStep];
    const isLastStep = guideStep === steps.length - 1;
    const userText = guideUserText(stepName, guideAnswers, t);
    const userMsg: ChatMessage = { role: 'user', text: userText };

    // Hide the step UI while AI responds
    setGuideStep(-1);
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setError(null);

    if (!isLastStep) {
      // Intermediate step: send to AI for brief ack, then show next step
      const contextHint = lang === 'ar'
        ? `المستخدم يجاوب على أسئلة لمساعدته يلقى باقة. اعترف بجوابه بجملة وحدة قصيرة وودية. لا ترشح باقات الحين.`
        : `The user is answering guided questions to find a plan. Acknowledge their answer in one short friendly sentence. Do NOT recommend plans yet.`;
      const msgWithHint = `${userText}\n\n[System: ${contextHint}]`;

      try {
        const allMsgs = [...messages, userMsg];
        const { reply } = await sendAdvisorMessage(lang, allMsgs, msgWithHint);
        setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
        setGuideStep(guideStep + 1);
      } catch (e) {
        console.error('Advisor error:', e);
        setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
        setGuideStep(guideStep);
      } finally {
        setLoading(false);
      }
    } else {
      // Final step (budget): compile all answers and ask AI for recommendations
      searchingPlans.current = true;
      trackEvent('advisor_guide_completed');

      const a = guideAnswers;
      const intlMap = { lot: 'a lot', sometimes: 'sometimes', no: 'no' } as const;
      const socialMap = { lot: 'very important', sometimes: 'somewhat important', no: 'not important' } as const;
      const intlMapAr = { lot: 'كثير', sometimes: 'أحياناً', no: 'لا' } as const;
      const socialMapAr = { lot: 'مهمة جداً', sometimes: 'شوي مهمة', no: 'مو مهمة' } as const;

      const summary = lang === 'ar'
        ? `أبي باقة. استخدامي للإنترنت ${a.internet === 'lot' ? 'كثير' : a.internet === 'sometimes' ? 'أحياناً' : 'ما أستخدم'}. ${a.calls === 'none' ? 'ما أحتاج مكالمات محلية' : a.calls === 'some' ? 'أحتاج شوي مكالمات محلية' : 'أحتاج مكالمات محلية كثير'}. مكالمات دولية: ${intlMapAr[a.intl as keyof typeof intlMapAr] ?? 'لا'}. ${a.internet !== 'none' ? `بيانات السوشل ميديا: ${socialMapAr[a.social as keyof typeof socialMapAr] ?? 'مو مهمة'}.` : ''} ميزانيتي ${a.budget === 0 ? 'مفتوحة' : `حوالي ${a.budget} ريال/شهر`}.`
        : `I'm looking for a plan. My internet usage is ${a.internet === 'lot' ? 'heavy' : a.internet === 'sometimes' ? 'moderate' : 'minimal'}. I ${a.calls === 'none' ? "don't need local calls" : a.calls === 'some' ? 'need some local calls' : 'need a lot of local calls'}. International calls: ${intlMap[a.intl as keyof typeof intlMap] ?? 'no'}. ${a.internet !== 'none' ? `Social media data: ${socialMap[a.social as keyof typeof socialMap] ?? 'not important'}.` : ''} My budget is ${a.budget === 0 ? 'flexible, no limit' : `around ${a.budget} SAR/month`}.`;

      try {
        const allMsgs = [...messages, userMsg];
        const { reply, planIds } = await sendAdvisorMessage(lang, allMsgs, summary);
        setMessages(prev => [...prev, { role: 'assistant', text: reply, planIds }]);
      } catch (e) {
        console.error('Advisor error:', e);
        setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
      } finally {
        searchingPlans.current = false;
        setLoading(false);
      }
    }
  }, [guideStep, guideAnswers, lang, t, messages]);

  // Save conversation to Firestore (debounced)
  useEffect(() => {
    if (!user?.uid || messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      getFirebaseDb().then(async (db) => {
        const { doc, setDoc } = await import('firebase/firestore');
        await setDoc(
          doc(db, 'users', user.uid, 'advisor', 'lastConversation'),
          { messages, updatedAt: Date.now(), lang },
          { merge: true },
        );
      }).catch(() => {});
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [messages, user?.uid, lang]);

  // Auto-scroll chat after every change
  const scrollChat = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const t = setTimeout(scrollChat, 100);
    return () => clearTimeout(t);
  }, [messages, loading, scrollChat]);

  // Focus input once first message arrives (desktop only)
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (messages.length > 0 && !loading && !hasAutoFocused.current) {
      hasAutoFocused.current = true;
      if (window.matchMedia('(min-width: 768px)').matches) {
        inputRef.current?.focus();
      }
    }
  }, [messages.length, loading]);

  // Free-chat send
  const sendText = useCallback(async (text: string) => {
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);
    trackEvent('advisor_message_sent');

    try {
      const { reply, planIds } = await sendAdvisorMessage(
        lang,
        [...messages, userMsg],
        text,
      );
      setMessages(prev => [...prev, { role: 'assistant', text: reply, planIds }]);
    } catch (e) {
      console.error('Advisor error:', e);
      setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loading, lang, messages]);

  const send = useCallback(() => {
    sendText(input.trim());
  }, [input, sendText]);

  const restart = () => {
    trackEvent('advisor_restarted');
    hasInitialized.current = true; // prevent resume check from re-firing
    setStarted(false);
    setGuideStep(-1);
    setGuideAnswers({ internet: '', calls: '', intl: '', social: '', budget: 150 });
    setMessages([]);
    setInput('');
    setError(null);
    setLoading(false);
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="relative z-10 h-[calc(100dvh-56px)] md:h-[calc(100dvh-64px)] flex flex-col">
      {/* Header */}
      <section className="shrink-0 relative overflow-hidden hero-gradient grain">
        <WaveLines />
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 pb-3 md:pt-6 md:pb-4 relative z-[2]">
          <button onClick={restart} className="flex items-center gap-1 text-black/60 text-xs font-medium mb-2 hover:text-black transition-colors">
            <ArrowLeft size={14} className="rtl:rotate-180" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <div className="flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <Bot size={18} className="text-black" />
              </div>
              <div>
                <h1 className="font-heading font-normal text-lg md:text-xl text-black tracking-tight">
                  {t('advisor.chatTitle')}
                </h1>
                <p className="text-black/50 text-[11px] md:text-xs">
                  {t('advisor.chatSubtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat messages */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 pb-24 md:pb-4 space-y-4">
          {/* Fixed welcome message — always visible */}
          <div className="flex justify-start">
            <div className="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-muted text-foreground rounded-bl-md">
              {t('advisor.welcomeMessage')}
            </div>
          </div>

          {/* Quick-action cards — shown until user picks one */}
          {!started && !loading && (
            <div className="grid grid-cols-2 gap-3 max-w-[85%] md:max-w-[75%]">
              <button
                onClick={() => handleQuickAction('guide')}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-background p-5 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <HelpCircle size={20} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">{t('advisor.quickGuide')}</span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('advisor.quickGuideDesc')}
                </span>
              </button>

              <button
                onClick={() => handleQuickAction('direct')}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-background p-5 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <MessageSquareText size={20} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">{t('advisor.quickDirect')}</span>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  {t('advisor.quickDirectDesc')}
                </span>
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {/* Message bubble */}
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md whitespace-pre-wrap'
                      : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                >
                  {msg.role === 'assistant' ? renderMarkdown(msg.text) : msg.text}
                </div>
              </div>

              {/* Plan cards for assistant messages */}
              {msg.role === 'assistant' && msg.planIds && msg.planIds.length > 0 && (
                <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-x-visible sm:pb-0">
                  {getPlansById(plans, msg.planIds).map((plan, idx) => (
                    <div key={plan.id} className="min-w-[75vw] snap-start sm:min-w-0" onClick={() => trackEvent('advisor_plan_card_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, position: idx + 1 })}>
                      <ConnectedPlanCard plan={plan} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Guided flow — current step question (after messages, at bottom) */}
          {guideStep >= 0 && !loading && (
            <GuideStepUI
              stepIndex={guideStep}
              steps={getGuideSteps(guideAnswers)}
              answers={guideAnswers}
              setAnswers={setGuideAnswers}
              onSubmit={handleGuideStepSubmit}
              t={t}
            />
          )}

          {/* Loading indicator */}
          {loading && (
            searchingPlans.current
              ? <InlineScanningWidget plans={plans} lang={lang} searchStatus={searchStatus} />
              : (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2.5">
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground animate-pulse">{searchStatus}</span>
                  </div>
                </div>
              )
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 text-red-600 rounded-xl px-4 py-2.5 text-xs font-medium">
                {error}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 border-t border-border bg-background z-50 mb-16 md:mb-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-3">
          <form
            onSubmit={e => { e.preventDefault(); send(); }}
            className="flex items-center gap-2"
          >
            <Button
              type="button"
              onClick={restart}
              variant="ghost"
              size="sm"
              className="rounded-xl h-10 w-10 p-0 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" />
            </Button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t('advisor.inputPlaceholder')}
              disabled={loading}
              className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              size="sm"
              className="rounded-xl h-10 w-10 p-0 shrink-0"
            >
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
