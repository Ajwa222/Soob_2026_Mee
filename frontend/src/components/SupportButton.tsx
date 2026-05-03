/**
 * SupportButton — floating customer support FAB (bottom-right) + chat / ticket UI.
 *
 * Visible to all users, signed-in or not. Hidden on /advisor (chat takes the
 * screen) and on /lab/* experimental pages.
 *
 * The button opens a chooser → either an in-page chat (with mock bot replies)
 * or a ticket form (subject + category + message → submit → success). When the
 * real Intercom snippet is loaded (`window.Intercom`) we hand off to it; until
 * then this is a self-contained working UI so users always have a way to reach
 * someone.
 */
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MessageCircle, Headphones, Mail, Send, ArrowLeft, Check,
  CreditCard, Wifi, Smartphone, Gift, HelpCircle,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trackEvent } from '../lib/analytics';

type IntercomFn = (cmd: 'show' | 'showNewMessage' | 'shutdown' | 'boot' | 'hide', payload?: unknown) => void;
declare global {
  interface Window { Intercom?: IntercomFn }
}

type View = 'chooser' | 'chat' | 'ticket' | 'ticket-success';
type ChatMsg = { id: string; role: 'bot' | 'user'; text: string; time: number };

// Mock canned bot replies for the demo chat. Real chat goes through Intercom.
const BOT_REPLIES = [
  'Thanks for reaching out! A support agent will join shortly. Meanwhile, is there a specific topic I can route you to?',
  "Got it — I've flagged your message to the team. Average wait is under 3 minutes.",
  'Could you share your order number or the plan name so we can pull it up faster?',
  "Noted! I'm passing that on. Anything else you'd like us to know before an agent picks up?",
];

const TICKET_CATEGORIES = [
  { id: 'billing',    icon: CreditCard,  en: 'Billing & payments',  ar: 'الفوترة والدفع' },
  { id: 'plan',       icon: Smartphone,  en: 'My plan or SIM',       ar: 'باقتي أو شريحتي' },
  { id: 'internet',   icon: Wifi,        en: 'Home internet',        ar: 'إنترنت المنزل' },
  { id: 'voucher',    icon: Gift,        en: 'Vouchers & gifts',     ar: 'القسائم والهدايا' },
  { id: 'other',      icon: HelpCircle,  en: 'Something else',       ar: 'شيء آخر' },
];

export default function SupportButton() {
  // ─── ALL HOOKS UP TOP — no early return between hooks (Rules of Hooks) ───
  const { lang } = useLang();
  const { user } = useAuth();
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chooser');
  const { pathname } = useLocation();

  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      id: 'm0',
      role: 'bot',
      text: isAr
        ? `أهلاً${user ? ` ${user.name?.split(' ')[0] ?? ''}` : ''}! أنا مساعد صوب. كيف أقدر أساعدك اليوم؟`
        : `Hi${user ? ` ${user.name?.split(' ')[0] ?? ''}` : ''}! I'm SOOB Support. How can I help you today?`,
      time: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom on new messages.
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatMessages, botTyping]);

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text, time: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setBotTyping(true);
    // Simulated bot response with a random reply.
    const replyDelay = 800 + Math.random() * 800;
    setTimeout(() => {
      const reply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
      setChatMessages(prev => [...prev, { id: `b-${Date.now()}`, role: 'bot', text: reply, time: Date.now() }]);
      setBotTyping(false);
    }, replyDelay);
    trackEvent('support_chat_message_sent');
  };

  // ── Ticket state ──────────────────────────────────────────────
  const [ticketCategory, setTicketCategory] = useState<string | null>(null);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [ticketContact, setTicketContact] = useState(user?.email || user?.phone || '');
  const [ticketId, setTicketId] = useState('');

  const ticketValid = !!ticketCategory && ticketSubject.trim().length >= 4 && ticketBody.trim().length >= 10 && ticketContact.trim().length >= 5;

  const submitTicket = () => {
    if (!ticketValid) return;
    const id = `SOB-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(id);
    setView('ticket-success');
    trackEvent('support_ticket_submitted', { category: ticketCategory });
  };

  const reset = () => {
    setView('chooser');
    setChatInput('');
    setTicketCategory(null);
    setTicketSubject('');
    setTicketBody('');
    setTicketId('');
  };

  const startChat = () => {
    if (typeof window !== 'undefined' && typeof window.Intercom === 'function') {
      window.Intercom('show');
      setOpen(false);
      return;
    }
    setView('chat');
    trackEvent('support_chat_opened');
  };

  const startTicket = () => {
    if (typeof window !== 'undefined' && typeof window.Intercom === 'function') {
      window.Intercom('showNewMessage', isAr ? 'مرحباً، أحتاج مساعدة بخصوص…' : "Hi, I'd like help with…");
      setOpen(false);
      return;
    }
    setView('ticket');
    trackEvent('support_ticket_opened');
  };

  // Hide on the chat advisor page and lab tools — they own the screen.
  // IMPORTANT: this conditional return MUST come AFTER every hook above,
  // otherwise hook count varies between renders and React throws.
  if (pathname === '/advisor' || pathname.startsWith('/lab')) return null;

  return (
    <>
      {/* Floating button — always visible for all users (no auth gate) */}
      <button
        type="button"
        onClick={() => { setOpen(true); reset(); trackEvent('support_fab_clicked'); }}
        aria-label={isAr ? 'الدعم' : 'Support'}
        title={isAr ? 'الدعم' : 'Support'}
        className="fixed z-[150] inline-flex items-center justify-center rounded-full shadow-xl hover:scale-105 transition-transform"
        style={{
          background: '#FE7151',
          color: '#FFFFFF',
          width: 52,
          height: 52,
          bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
          ...(isAr ? { left: 16 } : { right: 16 }),
        }}
      >
        {/* Stylized support-agent glyph — headset + mic, instantly readable */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {/* Headband arc */}
          <path d="M4 13a8 8 0 0 1 16 0" />
          {/* Left ear-cup */}
          <rect x="2" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
          {/* Right ear-cup */}
          <rect x="18" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
          {/* Mic boom */}
          <path d="M6 19v1a3 3 0 0 0 3 3h2" />
          {/* Mic capsule */}
          <circle cx="12" cy="22" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {/* Modal — chooser / chat / ticket / success */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden h-[560px] max-h-[88vh] flex flex-col">
          {/* Header — adapts to view */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card shrink-0">
            {view !== 'chooser' && view !== 'ticket-success' && (
              <button onClick={reset} className="p-1 -ml-1 rounded-md text-foreground/55 hover:text-foreground" aria-label="Back">
                <ArrowLeft size={16} className="rtl:rotate-180" />
              </button>
            )}
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FE7151' }}>
              {view === 'chat'
                ? <MessageCircle size={14} className="text-white" strokeWidth={2.5} />
                : view === 'ticket' || view === 'ticket-success'
                  ? <Mail size={14} className="text-white" strokeWidth={2.5} />
                  : <Headphones size={14} className="text-white" strokeWidth={2.5} />}
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-[14px] text-foreground leading-tight">
                {view === 'chat'
                  ? (isAr ? 'محادثة الدعم' : 'Support chat')
                  : view === 'ticket'
                    ? (isAr ? 'فتح تذكرة' : 'Open a ticket')
                    : view === 'ticket-success'
                      ? (isAr ? 'تم إرسال التذكرة' : 'Ticket sent')
                      : (isAr ? 'كيف يمكننا المساعدة؟' : 'How can we help?')}
              </h2>
              {view === 'chat' && (
                <p className="text-[10.5px] text-foreground/55 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10B981' }} />
                  {isAr ? 'متصل · رد خلال دقائق' : 'Online · replies within minutes'}
                </p>
              )}
            </div>
          </div>

          {/* CHOOSER */}
          {view === 'chooser' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              <p className="text-[12px] text-foreground/65 mb-2">
                {isAr ? 'اختر طريقة التواصل المناسبة لك.' : 'Pick the channel that suits you.'}
              </p>
              <button
                type="button"
                onClick={startChat}
                className="w-full flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[#FE7151] hover:bg-[#FE7151]/5 transition-all px-4 py-3 text-start"
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FE7151', color: '#fff' }}>
                  <MessageCircle size={18} strokeWidth={2.4} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-heading font-bold text-sm text-foreground leading-tight">
                    {isAr ? 'محادثة مباشرة' : 'Live chat'}
                  </span>
                  <span className="block text-[11.5px] text-foreground/60 mt-0.5">
                    {isAr ? 'تحدث مع الدعم الآن' : 'Chat with our team right now'}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full" style={{ background: '#CFEB74', color: '#16143A' }}>
                  {isAr ? 'متصل' : 'Online'}
                </span>
              </button>
              <button
                type="button"
                onClick={startTicket}
                className="w-full flex items-center gap-3 rounded-xl border-2 border-border bg-card hover:border-[#C59AFA] hover:bg-[#C59AFA]/5 transition-all px-4 py-3 text-start"
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#C59AFA', color: '#16143A' }}>
                  <Mail size={18} strokeWidth={2.4} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-heading font-bold text-sm text-foreground leading-tight">
                    {isAr ? 'فتح تذكرة' : 'Open a ticket'}
                  </span>
                  <span className="block text-[11.5px] text-foreground/60 mt-0.5">
                    {isAr ? 'سنرد خلال 24 ساعة' : "We'll get back to you within 24 hours"}
                  </span>
                </span>
              </button>
              <p className="text-[10.5px] text-foreground/50 text-center mt-2 leading-relaxed">
                {isAr ? 'أو راسلنا على support@soob.sa' : 'Or email us at support@soob.sa'}
              </p>
            </div>
          )}

          {/* CHAT */}
          {view === 'chat' && (
            <>
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 bg-secondary/30">
                {chatMessages.map((m) => (
                  <ChatBubble key={m.id} role={m.role} text={m.text} />
                ))}
                {botTyping && <ChatBubble role="bot" text="" typing />}
              </div>
              <div className="shrink-0 border-t border-border bg-card px-3 py-2 flex items-center gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder={isAr ? 'اكتب رسالتك…' : 'Type a message…'}
                  className="flex-1 bg-card"
                />
                <button
                  type="button"
                  onClick={sendChat}
                  disabled={!chatInput.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: '#FE7151', color: '#fff' }}
                  aria-label="Send"
                >
                  <Send size={16} className="rtl:rotate-180" />
                </button>
              </div>
            </>
          )}

          {/* TICKET FORM */}
          {view === 'ticket' && (
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {isAr ? 'الفئة' : 'Category'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TICKET_CATEGORIES.map(c => {
                    const sel = ticketCategory === c.id;
                    const Icon = c.icon;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setTicketCategory(c.id)}
                        className={`inline-flex items-center gap-2 px-2.5 py-2 rounded-lg border-2 text-[12px] font-semibold transition-all text-start ${
                          sel ? '' : 'border-border bg-card hover:border-foreground/30'
                        }`}
                        style={sel ? { background: '#FE7151', borderColor: '#16143A', color: '#fff' } : { color: 'inherit' }}
                      >
                        <Icon size={13} className="shrink-0" />
                        <span className="truncate">{isAr ? c.ar : c.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {isAr ? 'الموضوع' : 'Subject'}
                </label>
                <Input
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder={isAr ? 'اختصر مشكلتك بسطر واحد' : 'Sum up your issue in one line'}
                  className="bg-card"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {isAr ? 'الوصف' : 'Description'}
                </label>
                <textarea
                  value={ticketBody}
                  onChange={(e) => setTicketBody(e.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder={isAr ? 'اشرح مشكلتك بالتفصيل…' : 'Describe your issue in detail…'}
                  className="w-full px-3 py-2 rounded-lg border-2 border-border bg-card text-sm text-foreground resize-none focus:outline-none focus:border-[var(--ob-cta)]"
                />
                <p className="text-[10px] text-foreground/45 mt-1 text-end font-mono">{ticketBody.length}/1000</p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {isAr ? 'إيميل أو جوال للرد' : 'Email or phone for reply'}
                </label>
                <Input
                  value={ticketContact}
                  onChange={(e) => setTicketContact(e.target.value)}
                  placeholder="you@example.com / 05xxxxxxxx"
                  className="bg-card"
                />
              </div>

              <Button size="lg" disabled={!ticketValid} onClick={submitTicket} className="w-full font-bold mt-1">
                {isAr ? 'إرسال التذكرة' : 'Submit ticket'}
              </Button>
            </div>
          )}

          {/* TICKET SUCCESS */}
          {view === 'ticket-success' && (
            <div className="flex-1 overflow-y-auto p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-3" style={{ background: '#CFEB74' }}>
                <Check size={28} strokeWidth={3} style={{ color: '#16143A' }} />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground">
                {isAr ? 'تم إرسال تذكرتك!' : 'Ticket sent!'}
              </h3>
              <p className="text-sm text-foreground/65 mt-2">
                {isAr
                  ? 'سنرد خلال 24 ساعة على المعلومات التي قدمتها.'
                  : "We'll reply within 24 hours to the contact you provided."}
              </p>
              <div className="rounded-xl bg-secondary/50 border border-border px-4 py-3 mt-5">
                <div className="text-[11px] uppercase tracking-wider font-semibold text-foreground/55">
                  {isAr ? 'رقم التذكرة' : 'Ticket number'}
                </div>
                <div className="font-mono font-bold text-foreground text-[15px] mt-0.5">{ticketId}</div>
              </div>
              <Button onClick={() => setOpen(false)} className="w-full mt-4 font-bold">
                {isAr ? 'تم' : 'Done'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChatBubble({ role, text, typing = false }: { role: 'bot' | 'user'; text: string; typing?: boolean }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3 py-2 text-[13px] leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-2xl rounded-br-md font-medium'
            : 'rounded-2xl rounded-bl-md bg-card border border-border text-foreground'
        }`}
        style={isUser ? { background: '#FE7151', color: '#fff' } : undefined}
      >
        {typing ? (
          <span className="inline-flex items-center gap-1.5">
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </span>
        ) : text}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
