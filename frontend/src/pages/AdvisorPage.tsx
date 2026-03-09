import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, RotateCcw, Loader2,
  Bot,
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

export default function AdvisorPage() {
  const { t, lang } = useLang();
  const { plans } = usePlans();

  const welcomeText = lang === 'ar'
    ? t('advisor.welcomeMessage')
    : t('advisor.welcomeMessage');

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: welcomeText, planIds: [] },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Send a message
  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    // Track first message differently
    const isFirst = messages.length === 1;
    if (isFirst) {
      trackEvent('advisor_started');
    } else {
      trackEvent('advisor_message_sent');
    }

    try {
      const { reply, planIds } = await sendAdvisorMessage(
        lang,
        [...messages, userMsg],
        trimmed,
      );
      setMessages(prev => [...prev, { role: 'assistant', text: reply, planIds }]);
    } catch (e) {
      console.error('Advisor error:', e);
      setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, lang, messages]);

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
