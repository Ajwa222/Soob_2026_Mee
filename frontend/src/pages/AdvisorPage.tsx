import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, RotateCcw, Loader2,
  Bot, Wifi, DollarSign, Globe2, MessageCircle, Phone,
} from 'lucide-react';
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

// ─── Quick-reply chip definitions ───
interface QuickChip {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelEn: string;
  labelAr: string;
  messageEn: string;
  messageAr: string;
}

const QUICK_CHIPS: QuickChip[] = [
  { icon: Wifi, labelEn: 'Big Data', labelAr: 'بيانات كبيرة', messageEn: 'I need a plan with lots of data for streaming and heavy use.', messageAr: 'أبي باقة فيها بيانات كثيرة للبث والاستخدام الكثير.' },
  { icon: DollarSign, labelEn: 'Cheapest', labelAr: 'أرخص سعر', messageEn: 'I want the cheapest plan available.', messageAr: 'أبي أرخص باقة متوفرة.' },
  { icon: Globe2, labelEn: 'Intl Calls', labelAr: 'مكالمات دولية', messageEn: 'I need a plan with international calling minutes.', messageAr: 'أبي باقة فيها دقائق مكالمات دولية.' },
  { icon: MessageCircle, labelEn: 'Social Media', labelAr: 'سوشل ميديا', messageEn: 'I need dedicated social media data.', messageAr: 'أبي بيانات مخصصة للسوشل ميديا.' },
  { icon: Phone, labelEn: 'Local Calls', labelAr: 'مكالمات محلية', messageEn: 'I need lots of local call minutes.', messageAr: 'أبي باقة فيها دقائق محلية كثيرة.' },
];

// ─── Budget pill values ───
const BUDGET_PILLS = [50, 100, 150, 200, 300, 500];

/** Check if a message is asking about budget */
function isBudgetQuestion(text: string): boolean {
  const lower = text.toLowerCase();
  return /budget|price|cost|how much|spend|afford|ميزانية|سعر|كم تدفع|كم تصرف|المبلغ/.test(lower);
}

export default function AdvisorPage() {
  const { t, lang } = useLang();
  const { plans } = usePlans();

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Whether the user has sent at least one message (hides quick chips)
  const hasUserMessage = messages.some(m => m.role === 'user');

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  // Reset welcome message when language changes
  useEffect(() => {
    setMessages([{ role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] }]);
  }, [lang]);

  // Core send function that accepts a text string directly
  const sendText = useCallback(async (text: string) => {
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    const isFirst = messages.length === 1;
    trackEvent(isFirst ? 'advisor_started' : 'advisor_message_sent');

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

  // Send from input field
  const send = useCallback(() => {
    sendText(input.trim());
  }, [input, sendText]);

  // Quick chip handler
  const handleChip = (chip: QuickChip) => {
    const text = lang === 'ar' ? chip.messageAr : chip.messageEn;
    trackEvent('advisor_chip_tapped', { chip: chip.labelEn });
    sendText(text);
  };

  // Budget pill handler
  const handleBudgetPill = (amount: number) => {
    const text = lang === 'ar'
      ? `ميزانيتي ${amount} ريال بالشهر`
      : `My budget is ${amount} SAR per month`;
    trackEvent('advisor_budget_selected', { amount });
    sendText(text);
  };

  const restart = () => {
    trackEvent('advisor_restarted');
    setMessages([{ role: 'assistant', text: t('advisor.welcomeMessage'), planIds: [] }]);
    setInput('');
    setError(null);
    setLoading(false);
  };

  return (
    <div className="relative z-10 min-h-dvh flex flex-col safe-pb">
      {/* Header */}
      <section className="relative overflow-hidden hero-gradient grain">
        <WaveLines />
        <div className="max-w-3xl mx-auto px-4 md:px-8 pt-4 pb-3 md:pt-6 md:pb-4 relative z-[2]">
          <div className="flex items-center justify-between animate-fade-up">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                <Bot size={18} className="text-white" />
              </div>
              <div>
                <h1 className="font-heading font-normal text-lg md:text-xl text-white tracking-tight">
                  {t('advisor.chatTitle')}
                </h1>
                <p className="text-white/50 text-[11px] md:text-xs">
                  {t('advisor.chatSubtitle')}
                </p>
              </div>
            </div>
            <Button
              onClick={restart}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold glass text-white hover:bg-white/20 border-white/15 hover:text-white"
            >
              <RotateCcw size={14} />
              {t('advisor.restart')}
            </Button>
          </div>
        </div>
      </section>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-4 space-y-4">
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

              {/* Quick-reply chips after welcome message */}
              {i === 0 && msg.role === 'assistant' && !hasUserMessage && !loading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {QUICK_CHIPS.map(chip => {
                    const Icon = chip.icon;
                    return (
                      <button
                        key={chip.labelEn}
                        onClick={() => handleChip(chip)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer"
                      >
                        <Icon size={14} className="text-primary shrink-0" />
                        {lang === 'ar' ? chip.labelAr : chip.labelEn}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Budget quick-select pills after AI budget question */}
              {msg.role === 'assistant' && i === messages.length - 1 && !loading && isBudgetQuestion(msg.text) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {BUDGET_PILLS.map(amount => (
                    <button
                      key={amount}
                      onClick={() => handleBudgetPill(amount)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border bg-background text-xs font-medium text-foreground hover:bg-muted hover:border-primary/30 transition-colors cursor-pointer"
                    >
                      <DollarSign size={12} className="text-primary shrink-0" />
                      {amount} {lang === 'ar' ? 'ريال' : 'SAR'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={16} className="animate-spin" />
                {t('advisor.thinking')}
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

      {/* Input bar */}
      <div className="border-t border-border bg-background">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-3">
          <form
            onSubmit={e => { e.preventDefault(); send(); }}
            className="flex items-center gap-2"
          >
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
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            {t('advisor.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Strip [#ID] tags from display text. */
function formatReply(text: string): string {
  return text.replace(/\[#\d+\]/g, '').trim();
}
