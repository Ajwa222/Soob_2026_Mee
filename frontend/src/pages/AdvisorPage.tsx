import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, RotateCcw, Loader2,
  Bot, X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { usePlans } from '../context/PlansContext';
import { trackEvent } from '../lib/analytics';
import {
  sendAdvisorMessage, getPlansById,
  type ChatMessage,
} from '../lib/advisorAI';
import { ConnectedPlanCard } from '../components/PlanCard';
import WaveLines from '../components/WaveLines';
import { Button } from '@/components/ui/button';

// ─── Guided questionnaire config ───
interface QuizStep {
  questionEn: string;
  questionAr: string;
  options: { labelEn: string; labelAr: string; valueEn: string; valueAr: string }[];
}

const QUIZ_STEPS: QuizStep[] = [
  {
    questionEn: 'How much mobile data do you need?',
    questionAr: 'كم تحتاج بيانات جوال؟',
    options: [
      { labelEn: 'Light browsing', labelAr: 'تصفح خفيف', valueEn: 'I only need light data for browsing and messaging.', valueAr: 'أحتاج بيانات خفيفة للتصفح والرسائل بس.' },
      { labelEn: 'Moderate use', labelAr: 'استخدام متوسط', valueEn: 'I need moderate data for social media and some streaming.', valueAr: 'أحتاج بيانات متوسطة للسوشل وشوية بث.' },
      { labelEn: 'Heavy / Unlimited', labelAr: 'كثير / لا محدود', valueEn: 'I need heavy or unlimited data for streaming and downloads.', valueAr: 'أحتاج بيانات كثيرة أو لا محدودة للبث والتحميل.' },
    ],
  },
  {
    questionEn: 'Do you make a lot of calls?',
    questionAr: 'تسوي مكالمات كثير؟',
    options: [
      { labelEn: 'Local calls', labelAr: 'مكالمات محلية', valueEn: 'I mostly make local calls.', valueAr: 'أغلب مكالماتي محلية.' },
      { labelEn: 'International calls', labelAr: 'مكالمات دولية', valueEn: 'I need international calling minutes.', valueAr: 'أحتاج دقائق مكالمات دولية.' },
      { labelEn: 'Both', labelAr: 'الاثنين', valueEn: 'I need both local and international calls.', valueAr: 'أحتاج مكالمات محلية ودولية.' },
      { labelEn: 'Not really', labelAr: 'مو كثير', valueEn: "I don't make many calls.", valueAr: 'ما أسوي مكالمات كثير.' },
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
    options: [
      { labelEn: 'Under 50 SAR', labelAr: 'أقل من 50 ريال', valueEn: 'My budget is under 50 SAR per month.', valueAr: 'ميزانيتي أقل من 50 ريال بالشهر.' },
      { labelEn: '50–100 SAR', labelAr: '50–100 ريال', valueEn: 'My budget is 50 to 100 SAR per month.', valueAr: 'ميزانيتي من 50 إلى 100 ريال بالشهر.' },
      { labelEn: '100–200 SAR', labelAr: '100–200 ريال', valueEn: 'My budget is 100 to 200 SAR per month.', valueAr: 'ميزانيتي من 100 إلى 200 ريال بالشهر.' },
      { labelEn: '200–300 SAR', labelAr: '200–300 ريال', valueEn: 'My budget is 200 to 300 SAR per month.', valueAr: 'ميزانيتي من 200 إلى 300 ريال بالشهر.' },
      { labelEn: '300+ SAR', labelAr: 'أكثر من 300 ريال', valueEn: 'My budget is over 300 SAR per month.', valueAr: 'ميزانيتي أكثر من 300 ريال بالشهر.' },
    ],
  },
];

export default function AdvisorPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const { plans } = usePlans();

  // Quiz state: which step we're on (0-3), or null if quiz is done
  const [quizStep, setQuizStep] = useState<number | null>(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] },
    { role: 'assistant', text: lang === 'ar' ? QUIZ_STEPS[0].questionAr : QUIZ_STEPS[0].questionEn, planIds: [] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quizDone = quizStep === null;

  // Auto-scroll chat after every change
  const scrollChat = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const t = setTimeout(scrollChat, 100);
    return () => clearTimeout(t);
  }, [messages, loading, scrollChat]);

  // Focus input when quiz is done
  useEffect(() => {
    if (quizDone && !loading) inputRef.current?.focus();
  }, [quizDone, loading]);

  // Reset when language changes
  useEffect(() => {
    setQuizStep(0);
    setQuizAnswers([]);
    setMessages([
      { role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] },
      { role: 'assistant', text: lang === 'ar' ? QUIZ_STEPS[0].questionAr : QUIZ_STEPS[0].questionEn, planIds: [] },
    ]);
  }, [lang]);

  // Handle quiz option tap
  const handleQuizOption = useCallback(async (option: QuizStep['options'][number]) => {
    if (quizStep === null || loading) return;

    const userText = lang === 'ar' ? option.valueAr : option.valueEn;
    const userLabel = lang === 'ar' ? option.labelAr : option.labelEn;
    const newAnswers = [...quizAnswers, userText];

    // Add user's answer as a chat bubble (show the short label)
    setMessages(prev => [...prev, { role: 'user', text: userLabel }]);
    setQuizAnswers(newAnswers);

    trackEvent('advisor_quiz_answered', { step: quizStep, answer: option.labelEn });

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
    setQuizStep(0);
    setQuizAnswers([]);
    setMessages([
      { role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] },
      { role: 'assistant', text: lang === 'ar' ? QUIZ_STEPS[0].questionAr : QUIZ_STEPS[0].questionEn, planIds: [] },
    ]);
    setInput('');
    setError(null);
    setLoading(false);
  };

  // Determine which message index is the current quiz question (last assistant message)
  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  })();

  return (
    <div className="relative z-10 h-[calc(100dvh-56px)] md:h-[calc(100dvh-64px)] flex flex-col">
      {/* Header */}
      <section className="shrink-0 relative overflow-hidden hero-gradient grain">
        <WaveLines />
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 pb-3 md:pt-6 md:pb-4 relative z-[2]">
          <div className="flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <Bot size={18} className="text-white" />
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
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {getPlansById(plans, msg.planIds).map(plan => (
                    <ConnectedPlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              )}

              {/* Quiz option chips — show on the last assistant message during quiz */}
              {!quizDone && quizStep !== null && i === lastAssistantIdx && !loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUIZ_STEPS[quizStep].options.map(option => (
                    <button
                      key={option.labelEn}
                      onClick={() => handleQuizOption(option)}
                      className="inline-flex items-center px-3.5 py-2 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      {lang === 'ar' ? option.labelAr : option.labelEn}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl px-4 py-2.5 text-xs font-medium">
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
                <RotateCcw size={16} />
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
