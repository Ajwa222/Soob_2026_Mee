import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, ArrowRight, ArrowLeft, Compass, Send, RotateCcw, Loader2,
  Wifi, DollarSign, Globe2, MessageCircle, Signal, FileX2, Phone, Plane,
  Bot,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { trackEvent } from '../lib/analytics';
import {
  startAdvisorChat, sendAdvisorMessage, getPlansById,
  type Priority, type ChatMessage,
} from '../lib/advisorAI';
import PlanCard from '../components/PlanCard';
import WaveLines from '../components/WaveLines';
import { Button } from '@/components/ui/button';

// ─── Priority card definitions ───
interface PriorityCard {
  id: Priority;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
}

const PRIORITY_CARDS: PriorityCard[] = [
  { id: 'unlimited_data', icon: Wifi, labelEn: 'Big Data', labelAr: 'بيانات كبيرة', descEn: 'Unlimited or large data allowance', descAr: 'بيانات غير محدودة أو كبيرة' },
  { id: 'cheap_price', icon: DollarSign, labelEn: 'Lowest Price', labelAr: 'أرخص سعر', descEn: 'Get the most for the least', descAr: 'أفضل قيمة بأقل سعر' },
  { id: 'international_calls', icon: Globe2, labelEn: 'Intl Calls', labelAr: 'مكالمات دولية', descEn: 'Call family & friends abroad', descAr: 'كلّم أهلك وأصدقائك بالخارج' },
  { id: 'social_media', icon: MessageCircle, labelEn: 'Social Media', labelAr: 'سوشل ميديا', descEn: 'Dedicated social data', descAr: 'بيانات مخصصة للسوشل' },
  { id: 'five_g', icon: Signal, labelEn: '5G', labelAr: '5G', descEn: 'Next-gen speed', descAr: 'سرعة الجيل الخامس' },
  { id: 'no_contract', icon: FileX2, labelEn: 'No Contract', labelAr: 'بدون عقد', descEn: 'Cancel anytime, no commitment', descAr: 'بدون التزام، الغِ أي وقت' },
  { id: 'local_calls', icon: Phone, labelEn: 'Local Calls', labelAr: 'مكالمات محلية', descEn: 'Lots of local minutes', descAr: 'دقائق محلية كثيرة' },
  { id: 'roaming', icon: Plane, labelEn: 'Roaming', labelAr: 'تجوال', descEn: 'Stay connected while traveling', descAr: 'ابقَ متصل وأنت مسافر' },
];

const MAX_PICKS = 3;

// ─── Component ───
export default function AdvisorPage() {
  const { t, lang } = useLang();

  // Phase 1 state
  const [selected, setSelected] = useState<Priority[]>([]);
  const [phase, setPhase] = useState<'cards' | 'chat'>('cards');

  // Phase 2 (chat) state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when chat starts
  useEffect(() => {
    if (phase === 'chat' && !loading) inputRef.current?.focus();
  }, [phase, loading]);

  // ─── Phase 1: toggle priority card ───
  const toggleCard = (id: Priority) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= MAX_PICKS) return prev;
      return [...prev, id];
    });
  };

  // ─── Transition to Phase 2 ───
  const startChat = useCallback(async () => {
    setPhase('chat');
    setLoading(true);
    setError(null);
    trackEvent('advisor_started', { priorities: selected.join(',') });

    try {
      const { reply, planIds } = await startAdvisorChat(selected, lang);
      setMessages([
        { role: 'user', text: lang === 'ar' ? 'مرحبا! ابي تساعدني ألقى أفضل باقة جوال تناسبني.' : 'Hi! Help me find the best mobile plan for my needs.', planIds: [] },
        { role: 'assistant', text: reply, planIds },
      ]);
    } catch (e) {
      console.error('Advisor error:', e);
      setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selected, lang]);

  // ─── Send a follow-up message ───
  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const { reply, planIds } = await sendAdvisorMessage(
        selected,
        lang,
        [...messages, userMsg],
        trimmed,
      );
      setMessages(prev => [...prev, { role: 'assistant', text: reply, planIds }]);
      trackEvent('advisor_message_sent');
    } catch (e) {
      console.error('Advisor error:', e);
      setError(lang === 'ar' ? 'حصل خطأ، جرب مرة ثانية.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, selected, lang, messages]);

  const restart = () => {
    trackEvent('advisor_restarted');
    setPhase('cards');
    setSelected([]);
    setMessages([]);
    setInput('');
    setError(null);
    setLoading(false);
  };

  // ══════════════════════════════════════════
  // Phase 1: Priority Card Selection
  // ══════════════════════════════════════════
  if (phase === 'cards') {
    return (
      <>
        <div className="relative z-10 flex flex-col min-h-[calc(100dvh-56px)] md:min-h-[calc(100dvh-64px)] hero-gradient grain overflow-hidden">
          <WaveLines />
          <div className="absolute top-20 end-10 w-32 h-32 rounded-full bg-white/5 blob animate-float" />
          <div className="absolute bottom-20 start-10 w-24 h-24 rounded-full bg-accent/8 blob-alt animate-float" style={{ animationDelay: '2s' }} />

          <div className="relative z-10 flex flex-1 items-center justify-center py-10 md:py-16">
            <div className="max-w-2xl w-full mx-auto px-5">
              {/* Header */}
              <div className="text-center mb-8 animate-fade-up">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-lg shadow-black/5 flex items-center justify-center mx-auto mb-5">
                  <Compass size={28} className="text-white md:hidden" />
                  <Compass size={34} className="text-white hidden md:block" />
                </div>
                <h1 className="font-heading font-normal text-2xl md:text-4xl text-white mb-2.5 tracking-tight">
                  {t('advisor.cardTitle')}
                </h1>
                <p className="text-white/65 text-sm md:text-base max-w-sm mx-auto leading-relaxed">
                  {t('advisor.cardSubtitle')}
                </p>
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 md:gap-3 mb-8 animate-fade-up delay-1">
                {PRIORITY_CARDS.map(card => {
                  const Icon = card.icon;
                  const isSelected = selected.includes(card.id);
                  const isDisabled = !isSelected && selected.length >= MAX_PICKS;
                  return (
                    <button
                      key={card.id}
                      onClick={() => toggleCard(card.id)}
                      disabled={isDisabled}
                      className={`relative text-start p-3.5 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all duration-200 group cursor-pointer
                        ${isSelected
                          ? 'border-white bg-white/20 shadow-lg shadow-white/10'
                          : isDisabled
                            ? 'border-white/10 bg-white/5 opacity-40 cursor-not-allowed'
                            : 'border-white/15 bg-white/8 backdrop-blur-sm hover:border-white/30 hover:bg-white/15'
                        }`}
                    >
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-2 end-2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                          <span className="text-[#213E53] text-xs font-bold">{selected.indexOf(card.id) + 1}</span>
                        </div>
                      )}
                      <div className={`w-9 h-9 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center mb-2 transition-all
                        ${isSelected ? 'bg-white text-[#213E53]' : 'bg-white/15 text-white group-hover:bg-white/25'}`}>
                        <Icon size={18} />
                      </div>
                      <p className={`font-heading font-bold text-xs md:text-sm leading-tight ${isSelected ? 'text-white' : 'text-white/90'}`}>
                        {lang === 'ar' ? card.labelAr : card.labelEn}
                      </p>
                      <p className="text-[10px] md:text-xs text-white/50 mt-0.5 leading-tight">
                        {lang === 'ar' ? card.descAr : card.descEn}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Counter + CTA */}
              <div className="text-center animate-fade-up delay-2">
                <p className="text-white/60 text-xs mb-4">
                  {selected.length}/{MAX_PICKS} {t('advisor.selected')}
                </p>
                <Button
                  onClick={startChat}
                  disabled={selected.length === 0}
                  size="lg"
                  className="w-full max-w-xs mx-auto rounded-xl text-sm font-bold shadow-lg shadow-black/10 bg-white text-[#213E53] hover:bg-white/90 glow-primary disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles size={16} />
                  {t('advisor.startChat')}
                  {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-background" style={{ minHeight: '50vh' }} />
      </>
    );
  }

  // ══════════════════════════════════════════
  // Phase 2: AI Chat
  // ══════════════════════════════════════════
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
          {messages.slice(1).map((msg, i) => (
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
                  {getPlansById(msg.planIds).map(plan => (
                    <PlanCard key={plan.id} plan={plan} />
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
