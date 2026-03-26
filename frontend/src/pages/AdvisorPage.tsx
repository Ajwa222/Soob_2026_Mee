import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Send, Loader2,
  Bot, X, MessageSquareText, HelpCircle, History,
  ArrowLeftRight, Sparkles, ArrowLeft, Lock,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Slider } from '@/components/ui/slider';

// ─── Guided questionnaire config ───
interface QuizStep {
  questionEn: string;
  questionAr: string;
  type?: 'slider';
  sliderConfig?: { min: number; max: number; step: number; unitEn: string; unitAr: string };
  options: { labelEn: string; labelAr: string; valueEn: string; valueAr: string }[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    questionEn: 'Do you need internet in the plan?',
    questionAr: 'تبي الباقة يكون فيها انترنت ؟',
    options: [
      { labelEn: 'Yes', labelAr: 'ايه', valueEn: 'Yes, I need internet/data in my plan.', valueAr: 'ايه، أبي انترنت بالباقة.' },
      { labelEn: "I don't know", labelAr: 'مدري', valueEn: "I'm not sure if I need data.", valueAr: 'مدري إذا أحتاج انترنت.' },
      { labelEn: 'No', labelAr: 'لا', valueEn: "No, I don't need internet/data.", valueAr: 'لا، ما أحتاج انترنت.' },
    ],
  },
  {
    questionEn: 'Do you make a lot of calls?',
    questionAr: 'تكلم كثير ؟',
    options: [
      { labelEn: 'Local calls', labelAr: 'مكالمات محلية', valueEn: 'I mostly make local calls.', valueAr: 'أغلب مكالماتي محلية.' },
      { labelEn: 'International calls', labelAr: 'مكالمات دولية', valueEn: 'I need international calling minutes.', valueAr: 'أحتاج دقائق مكالمات دولية.' },
      { labelEn: 'Both', labelAr: 'الاثنين', valueEn: 'I need both local and international calls.', valueAr: 'أحتاج مكالمات محلية ودولية.' },
      { labelEn: 'No', labelAr: 'لا', valueEn: "I don't make many calls.", valueAr: 'لا، ما أكلم كثير.' },
    ],
  },
  {
    questionEn: 'Need dedicated social media data?',
    questionAr: 'تحتاج بيانات مخصصة للسوشل ميديا؟',
    options: [
      { labelEn: 'Yes, a must!', labelAr: 'أكيد، لازم!', valueEn: 'Yes, I need dedicated social media data.', valueAr: 'أي، أحتاج بيانات مخصصة للسوشل.' },
      { labelEn: 'Nice to have', labelAr: 'حلو لو فيه', valueEn: 'Social media data would be nice but not essential.', valueAr: 'حلو لو فيه بيانات سوشل بس مو ضروري.' },
      { labelEn: 'No', labelAr: 'لا', valueEn: "No, I don't need separate social media data.", valueAr: 'لا، ما أحتاج بيانات سوشل منفصلة.' },
    ],
  },
  {
    questionEn: "What's your monthly budget?",
    questionAr: 'كم ميزانيتك الشهرية؟',
    type: 'slider',
    sliderConfig: { min: 30, max: 1000, step: 10, unitEn: 'SAR', unitAr: 'ريال' },
    options: [],
  },
];

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

function InlineScanningWidget({ plans, lang, quizDone, searchStatus }: { plans: Plan[]; lang: string; quizDone: boolean; searchStatus: string }) {
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

  // Short loading between quiz questions — just show simple bubble
  if (!quizDone) {
    return (
      <div className="flex justify-start">
        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2.5">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span className="text-sm text-muted-foreground animate-pulse">{searchStatus}</span>
        </div>
      </div>
    );
  }

  // Full scanning widget for AI search
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

export default function AdvisorPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { plans } = usePlans();
  const { user } = useAuth();
  // Flow state: 'intent' = first layer, 'choice' = describe/guide picker, number = quiz step, null = quiz done / free chat
  const [quizStep, setQuizStep] = useState<number | 'intent' | 'choice' | null>('intent');
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizLabels, setQuizLabels] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [budgetValue, setBudgetValue] = useState(150);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedConvo, setHasSavedConvo] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchStatus = useSearchStatus(loading, t);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quizDone = quizStep === null;
  const inIntent = quizStep === 'intent';
  const inChoice = quizStep === 'choice';
  const inQuiz = typeof quizStep === 'number';

  // Check for saved conversation on mount (logged-in users only)
  useEffect(() => {
    if (!user?.uid || (quizStep !== 'intent' && quizStep !== 'choice')) return;
    getFirebaseDb().then(async (db) => {
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'users', user.uid, 'advisor', 'lastConversation'));
      if (snap.exists()) {
        const data = snap.data();
        if (data?.messages?.length > 0) setHasSavedConvo(true);
      }
    }).catch(() => {});
  }, [user?.uid, quizStep]);

  // Save conversation to Firestore (debounced, only when quiz is done)
  useEffect(() => {
    if (!user?.uid || !quizDone || messages.length === 0) return;
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
  }, [messages, user?.uid, quizDone, lang]);

  // Resume a saved conversation
  const resumeConversation = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const db = await getFirebaseDb();
      const { doc, getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(db, 'users', user.uid, 'advisor', 'lastConversation'));
      if (snap.exists()) {
        const data = snap.data();
        if (data?.messages?.length > 0) {
          setMessages(data.messages as ChatMessage[]);
          setQuizStep(null);
          setSearchParams({ chat: '1' }, { replace: true });
          trackEvent('advisor_conversation_resumed');
        }
      }
    } catch {
      // Silently fail — just show the choice screen
    }
    setHasSavedConvo(false);
  }, [user?.uid, setSearchParams]);

  // Auto-scroll chat after every change
  const scrollChat = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const t = setTimeout(scrollChat, 100);
    return () => clearTimeout(t);
  }, [messages, loading, scrollChat]);

  // Focus input once when quiz first completes (desktop only — on mobile it opens the keyboard and blocks results)
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (quizDone && !hasAutoFocused.current) {
      hasAutoFocused.current = true;
      if (window.matchMedia('(min-width: 768px)').matches) {
        inputRef.current?.focus();
      }
    }
  }, [quizDone]);

  // Reset when language changes
  useEffect(() => {
    setQuizStep('intent');
    setQuizAnswers([]);
    setQuizLabels([]);
    setMessages([]);
  }, [lang]);

  // Handle initial choice card tap
  const handleChoice = useCallback((mode: 'describe' | 'guide') => {
    if (quizStep !== 'choice') return;

    if (mode === 'describe') {
      setMessages([
        { role: 'assistant', text: t('advisor.describePrompt'), planIds: [] },
      ]);
      setQuizStep(null);
      setSearchParams({ chat: '1' }, { replace: true });
      trackEvent('advisor_choice_selected', { choice: 'describe' });
    } else {
      const firstQ = lang === 'ar' ? QUIZ_STEPS[0].questionAr : QUIZ_STEPS[0].questionEn;
      setMessages([
        { role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] },
        { role: 'assistant', text: firstQ, planIds: [] },
      ]);
      setQuizStep(0);
      trackEvent('advisor_choice_selected', { choice: 'guide' });
    }
  }, [quizStep, lang, t, setSearchParams]);

  // Handle quiz option tap
  const handleQuizOption = useCallback(async (option: QuizStep['options'][number]) => {
    if (typeof quizStep !== 'number' || loading) return;

    const userText = lang === 'ar' ? option.valueAr : option.valueEn;
    const userLabel = lang === 'ar' ? option.labelAr : option.labelEn;
    const newAnswers = [...quizAnswers, userText];

    // Add user's answer as a chat bubble (show the short label)
    setMessages(prev => [...prev, { role: 'user', text: userLabel }]);
    setQuizAnswers(newAnswers);
    setQuizLabels(prev => [...prev, option.labelEn]);

    trackEvent('advisor_quiz_answered', { step: quizStep, step_name: QUIZ_STEPS[quizStep].questionEn, answer: option.labelEn });

    const nextStep = quizStep + 1;

    if (nextStep < QUIZ_STEPS.length) {
      // Show thinking indicator, then reveal next question
      setLoading(true);
      const nextQ = lang === 'ar' ? QUIZ_STEPS[nextStep].questionAr : QUIZ_STEPS[nextStep].questionEn;
      setTimeout(() => {
        setLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', text: nextQ, planIds: [] }]);
        setQuizStep(nextStep);
      }, 800 + Math.random() * 400);
    } else {
      // Quiz complete — send all answers to AI
      setQuizStep(null);
      setSearchParams({ chat: '1' }, { replace: true });
      setLoading(true);
      setError(null);
      trackEvent('advisor_started');

      // Build a summary message from all answers
      const summary = newAnswers.join(' ');

      // Build the full history: welcome + Q&A pairs + summary
      const fullHistory: ChatMessage[] = [];
      for (let i = 0; i < QUIZ_STEPS.length; i++) {
        fullHistory.push({ role: 'assistant', text: lang === 'ar' ? QUIZ_STEPS[i].questionAr : QUIZ_STEPS[i].questionEn });
        fullHistory.push({ role: 'user', text: newAnswers[i] });
      }

      try {
        const { reply, planIds } = await sendAdvisorMessage(lang, fullHistory, summary);
        setMessages(prev => [...prev, { role: 'assistant', text: reply, planIds }]);
      } catch (e) {
        console.error('Advisor error:', e);
        setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }, [quizStep, loading, lang, quizAnswers]);

  // Handle budget slider submit
  const handleBudgetSubmit = useCallback(async () => {
    if (typeof quizStep !== 'number' || loading) return;

    const userTextEn = `My budget is ${budgetValue} SAR per month.`;
    const userTextAr = `ميزانيتي ${budgetValue} ريال بالشهر.`;
    const userText = lang === 'ar' ? userTextAr : userTextEn;
    const userLabel = `${budgetValue} ${lang === 'ar' ? 'ريال' : 'SAR'}`;
    const newAnswers = [...quizAnswers, userText];

    setMessages(prev => [...prev, { role: 'user', text: userLabel }]);
    setQuizAnswers(newAnswers);
    trackEvent('advisor_quiz_answered', { step: quizStep, step_name: 'budget', answer: `${budgetValue} SAR` });

    const nextStep = quizStep + 1;

    if (nextStep < QUIZ_STEPS.length) {
      setLoading(true);
      const nextQ = lang === 'ar' ? QUIZ_STEPS[nextStep].questionAr : QUIZ_STEPS[nextStep].questionEn;
      setTimeout(() => {
        setLoading(false);
        setMessages(prev => [...prev, { role: 'assistant', text: nextQ, planIds: [] }]);
        setQuizStep(nextStep);
      }, 800 + Math.random() * 400);
    } else {
      setQuizStep(null);
      setSearchParams({ chat: '1' }, { replace: true });
      setLoading(true);
      setError(null);
      trackEvent('advisor_started');

      const summary = newAnswers.join(' ');
      const fullHistory: ChatMessage[] = [];
      for (let i = 0; i < QUIZ_STEPS.length; i++) {
        fullHistory.push({ role: 'assistant', text: lang === 'ar' ? QUIZ_STEPS[i].questionAr : QUIZ_STEPS[i].questionEn });
        fullHistory.push({ role: 'user', text: newAnswers[i] });
      }

      try {
        const { reply, planIds } = await sendAdvisorMessage(lang, fullHistory, summary);
        setMessages(prev => [...prev, { role: 'assistant', text: reply, planIds }]);
      } catch (e) {
        console.error('Advisor error:', e);
        setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  }, [quizStep, loading, lang, quizAnswers, quizLabels, budgetValue, setSearchParams]);

  // Free-chat send (after quiz is done)
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
    setQuizStep('intent');
    setQuizAnswers([]);
    setQuizLabels([]);
    setMessages([]);
    setInput('');
    setError(null);
    setLoading(false);
    setHasSavedConvo(false);
    setSearchParams({}, { replace: true });
  };

  // Determine which message index is the current quiz question (last assistant message)
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  // ─── Intent screen (first layer) ───
  if (inIntent) {
    return (
      <div className="relative z-10 h-[calc(100dvh-56px)] md:min-h-[calc(100dvh-64px)] md:h-auto flex flex-col">
        <section className="shrink-0 relative overflow-hidden hero-gradient grain">
          <WaveLines />
          <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 pb-3 md:pt-6 md:pb-4 relative z-[2]">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black/60 text-xs font-medium mb-2 hover:text-black transition-colors">
              <ArrowLeft size={14} className="rtl:rotate-180" />
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <div className="flex items-center gap-2.5 animate-fade-up">
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
        </section>

        <div className="flex-1 flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full space-y-6 animate-fade-up">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-xl md:text-2xl font-medium text-foreground">
                {t('advisor.intentQuestion')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Card: I want a new plan */}
              <button
                onClick={() => {
                  trackEvent('advisor_intent_selected', { intent: 'new_plan' });
                  setQuizStep('choice');
                }}
                className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-background p-6 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <Sparkles size={24} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">{t('advisor.intentNew')}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('advisor.intentNewDesc')}
                </span>
              </button>

              {/* Card: Compare current plan */}
              <button
                onClick={() => {
                  trackEvent('advisor_intent_selected', { intent: 'compare' });
                  navigate('/switch');
                }}
                className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-background p-6 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <ArrowLeftRight size={24} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">{t('advisor.intentCompare')}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('advisor.intentCompareDesc')}
                </span>
              </button>
            </div>

            {/* Resume previous conversation */}
            {hasSavedConvo && (
              <button
                onClick={resumeConversation}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-muted/50 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
              >
                <History size={16} />
                {lang === 'ar' ? 'متابعة المحادثة السابقة' : 'Continue previous conversation'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Choice screen (before chat) ───
  if (inChoice) {
    return (
      <div className="relative z-10 h-[calc(100dvh-56px)] md:min-h-[calc(100dvh-64px)] md:h-auto flex flex-col">
        <section className="shrink-0 relative overflow-hidden hero-gradient grain">
          <WaveLines />
          <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 pb-3 md:pt-6 md:pb-4 relative z-[2]">
            <button onClick={() => setQuizStep('intent')} className="flex items-center gap-1 text-black/60 text-xs font-medium mb-2 hover:text-black transition-colors">
              <ArrowLeft size={14} className="rtl:rotate-180" />
              {lang === 'ar' ? 'رجوع' : 'Back'}
            </button>
            <div className="flex items-center gap-2.5 animate-fade-up">
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
        </section>

        <div className="flex-1 flex items-center justify-center bg-background px-4">
          <div className="max-w-md w-full space-y-6 animate-fade-up">
            <div className="text-center space-y-2">
              <h2 className="font-heading text-xl md:text-2xl font-medium text-foreground">
                {t('advisor.choiceQuestion')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Card: Guide me */}
              <button
                onClick={() => handleChoice('guide')}
                className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-background p-6 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <HelpCircle size={24} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">{t('advisor.choiceGuide')}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('advisor.choiceGuideDesc')}
                </span>
              </button>

              {/* Card: I know what I want */}
              <button
                onClick={() => handleChoice('describe')}
                className="group flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-background p-6 text-center transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center transition-colors group-hover:bg-primary/20">
                  <MessageSquareText size={24} className="text-primary" />
                </div>
                <span className="font-medium text-sm text-foreground">{t('advisor.choiceDescribe')}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t('advisor.choiceDescribeDesc')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat screen (quiz + free chat) ───
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
          {messages.map((msg, i) => (
            <div key={i}>
              {/* Message bubble */}
              <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                    }`}
                >
                  {formatReply(msg.text)}
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

              {/* Quiz option chips or slider — show on the last assistant message during quiz */}
              {inQuiz && i === lastAssistantIdx && !loading && (
                QUIZ_STEPS[quizStep as number].type === 'slider' ? (
                  <div className="mt-3 w-full max-w-[85%] md:max-w-[75%] bg-muted rounded-2xl rounded-bl-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">
                        {lang === 'ar' ? QUIZ_STEPS[quizStep as number].sliderConfig!.unitAr : QUIZ_STEPS[quizStep as number].sliderConfig!.unitEn}
                      </span>
                      <span className="text-sm font-bold text-primary">{budgetValue} {lang === 'ar' ? 'ريال' : 'SAR'}</span>
                    </div>
                    <div dir="ltr">
                      <Slider
                        min={QUIZ_STEPS[quizStep as number].sliderConfig!.min}
                        max={QUIZ_STEPS[quizStep as number].sliderConfig!.max}
                        step={QUIZ_STEPS[quizStep as number].sliderConfig!.step}
                        value={[budgetValue]}
                        onValueChange={([v]) => setBudgetValue(v)}
                      />
                    </div>
                    <Button onClick={handleBudgetSubmit} size="sm" className="w-full rounded-xl text-xs font-bold">
                      {lang === 'ar' ? 'التالي' : 'Next'}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {QUIZ_STEPS[quizStep as number].options.map((option: QuizStep['options'][number]) => (
                      <button
                        key={option.labelEn}
                        onClick={() => handleQuizOption(option)}
                        className="inline-flex items-center px-3.5 py-2 rounded-full border border-[#FFE4B0] bg-[#FFF0D0] text-xs font-medium text-foreground hover:bg-[#FFE4B0] transition-colors cursor-pointer"
                      >
                        {lang === 'ar' ? option.labelAr : option.labelEn}
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
          ))}

          {/* Loading indicator — inline scanning animation */}
          {loading && (
            <InlineScanningWidget plans={plans} lang={lang} quizDone={quizDone} searchStatus={searchStatus} />
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

      {/* Input bar — only shown after quiz is complete */}
      {quizDone && (
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
      )}
    </div>
  );
}

/** Strip [#ID] tags from display text. */
function formatReply(text: string): string {
  return text.replace(/\[#\d+\]/g, '').trim();
}
