/**
 * OnboardingChat — conversational A/B variant of onboarding.
 *
 * Uses the SAME copy dictionary (`COPY`, `getCopy`) as the classic
 * Onboarding.tsx — only the delivery differs (chat bubbles + quick replies
 * instead of full-screen cards).
 *
 * Flow mirrors the classic:
 *   greeting → language → absher yes/no
 *     yes → /advisor
 *     no  → moving vs visiting
 *       moving   → Iqama/Absher/buy-online steps → offer visitor plans
 *       visiting → carrier links (Salam/Mobily/Zain)
 *
 * Persists answers to localStorage['simba-onboarding-answers'] just like
 * the classic flow.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Home as HomeIcon, ArrowLeft } from 'lucide-react';
import { useLang, type Lang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../lib/analytics';
import {
  trackStepReached,
  trackAnswer,
  trackCarrierOpened,
  trackCompleted,
  trackAbandoned,
  type OnboardingStep,
} from '../lib/onboarding-analytics';
import { getCopy, type CopyDict } from './Onboarding';

type Msg =
  | { id: number; role: 'bot' | 'user'; text: string }
  | { id: number; role: 'plans' };

type VisitorPlan = {
  name: string;
  price: string;
  validityDays: number;
  data: string;
  social?: string;
  mins: number;
  sms?: number;
  countries?: number;
  note?: string;
  url?: string;
};
type CarrierGroup = {
  key: string;
  name: string;
  color: string;
  url: string;
  plans: VisitorPlan[];
};
type Reply = { label: string; onClick: () => void };
type StepId =
  | 'start'
  | 'lang'
  | 'absher'
  | 'status'
  | 'moving'
  | 'visiting'
  | 'done';

interface OnboardingAnswers {
  variant?: 'chat';
  absher?: 'yes' | 'no';
  status?: 'moving' | 'visiting';
}

const SALAM_URL = 'https://salammobile.sa/en/visitor-plans/';
const MOBILY_URL = 'https://www.mobily.com.sa/wps/portal/web/personal/services/details/communications-add-ons/more-services/mobily-visitors-package';
const ZAIN_URL = 'https://sa.zain.com/en/mobile/visitor/visitor-40';

// Pre-language welcome (English, user hasn't picked a language yet)
const PRE_LANG_WELCOME = "Welcome to Simba 👋 Please select your language to get started.";

// Combined greeting + first question, localized. Delivered as one bubble after
// the user picks their language so we don't send two bot messages in a row.
const GREETING_WITH_ABSHER: Record<Lang, (absherTitle: string) => string> = {
  en: (q) => `I'm Simba, here to help you in the telecom world. But let me understand you first.\n\n${q}`,
  ar: (q) => `أنا سيمبا، موجود هنا عشان أساعدك في عالم الاتصالات. بس خلّني أفهمك أول.\n\n${q}`,
  ur: (q) => `میں Simba ہوں — سعودی عرب کے ٹیلی کام کی دنیا میں آپ کا رہنما۔ صحیح مشورہ دینے کے لیے پہلے آپ کی صورتحال سمجھ لوں۔\n\n${q}`,
  hi: (q) => `मैं Simba हूँ — सऊदी अरब की टेलीकॉम दुनिया में आपका गाइड। सही रास्ता बताने के लिए पहले आपकी स्थिति समझ लूँ।\n\n${q}`,
  bn: (q) => `আমি Simba — সৌদি আরবের টেলিকম দুনিয়ায় আপনার গাইড। সঠিক পথ দেখাতে পারলে ভালো, তাই প্রথমে আপনার অবস্থাটা বুঝে নিই।\n\n${q}`,
  tl: (q) => `Ako si Simba — gabay mo sa mundo ng telecom sa Saudi Arabia. Para maigabay kita nang tama, maintindihan ko muna ang sitwasyon mo.\n\n${q}`,
};

/** Strips markdown-style bold and renders newlines. Kept minimal — no raw HTML. */
function renderBotText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    }
    return p.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

export default function OnboardingChat() {
  const { lang, setLang } = useLang();
  const { markOnboarded } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => !localStorage.getItem('simba-onboarded'));
  const [messages, setMessages] = useState<Msg[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [typing, setTyping] = useState(false);
  const [answers, setAnswers] = useState<OnboardingAnswers>({ variant: 'chat' });
  const idRef = useRef(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const startedAtRef = useRef<number>(Date.now());
  const completedRef = useRef(false);
  const currentStepRef = useRef<OnboardingStep>('language');

  const t = getCopy(lang);
  const isRtl = lang === 'ar' || lang === 'ur';

  // Ref to the latest copy dict so async handlers always read fresh strings.
  const tRef = useRef<CopyDict>(t);
  tRef.current = t;

  const complete = (target: '/' | '/advisor' = '/advisor', extra: Partial<OnboardingAnswers> = {}) => {
    const finalAnswers = { ...answers, ...extra };
    completedRef.current = true;
    localStorage.setItem('simba-onboarded', 'true');
    localStorage.setItem('simba-onboarding-answers', JSON.stringify(finalAnswers));
    markOnboarded();
    trackCompleted(target, finalAnswers, 'chat', startedAtRef.current);
    setVisible(false);
    const variant = localStorage.getItem('simba-onboarding-variant');
    const autoGuide = target === '/advisor' && (variant === 'B' || variant === 'D');
    navigate(target, { state: { fromOnboarding: true, autoGuide } });
  };

  const pushBot = (text: string, delay = 650) =>
    new Promise<void>((resolve) => {
      if (!text) return resolve();
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        setMessages((m) => [...m, { id: ++idRef.current, role: 'bot', text }]);
        resolve();
      }, delay);
    });

  const pushUser = (text: string) => {
    setMessages((m) => [...m, { id: ++idRef.current, role: 'user', text }]);
  };

  /** Run a step. Steps deliver bot messages (from shared COPY) then set quick replies. */
  const goStep = async (step: StepId) => {
    setReplies([]);

    if (step === 'start') {
      await pushBot(PRE_LANG_WELCOME, 500);
      await goStep('lang');
      return;
    }

    if (step === 'lang') {
      setReplies([
        { label: '🇬🇧 English', onClick: () => pickLang('en') },
        { label: '🇸🇦 العربية', onClick: () => pickLang('ar') },
        { label: '🇵🇰 اردو', onClick: () => pickLang('ur') },
        { label: '🇮🇳 हिन्दी', onClick: () => pickLang('hi') },
        { label: '🇧🇩 বাংলা', onClick: () => pickLang('bn') },
        { label: '🇵🇭 Filipino', onClick: () => pickLang('tl') },
      ]);
      return;
    }

    if (step === 'absher') {
      // Combined greeting + absher question as ONE bubble (no back-to-back messages).
      const tr = tRef.current;
      const greet = GREETING_WITH_ABSHER[lang] ?? GREETING_WITH_ABSHER.en;
      await pushBot(greet(tr.absherTitle), 600);
      setReplies([
        { label: tr.absherYesTitle, onClick: () => pickAbsher('yes') },
        { label: tr.absherNoTitle, onClick: () => pickAbsher('no') },
      ]);
      return;
    }

    if (step === 'status') {
      const tr = tRef.current;
      const msg = tr.statusSub ? `${tr.statusTitle}\n\n${tr.statusSub}` : tr.statusTitle;
      await pushBot(msg, 700);
      setReplies([
        { label: tr.statusMovingTitle, onClick: () => pickStatus('moving') },
        { label: tr.statusVisitingTitle, onClick: () => pickStatus('visiting') },
      ]);
      return;
    }

    if (step === 'moving') {
      const tr = tRef.current;
      const parts: string[] = [];
      parts.push(`**${tr.movingTitle}**`);
      if (tr.movingSub) parts.push(tr.movingSub);
      parts.push(`**1. ${tr.movingStep1}**\n${tr.movingStep1Desc}`);
      parts.push(`**2. ${tr.movingStep2}**\n${tr.movingStep2Desc}`);
      parts.push(`**3. ${tr.movingStep3}**\n${tr.movingStep3Desc}`);
      parts.push(`**4. ${tr.movingStep4}**\n${tr.movingStep4Desc}`);
      if (tr.movingHint) parts.push(`💡 ${tr.movingHint}`);
      await pushBot(parts.join('\n\n'), 900);
      setReplies([
        { label: tr.ctaGetTemp, onClick: () => goStep('visiting') },
        { label: tr.ctaHome, onClick: () => complete('/') },
      ]);
      return;
    }

    if (step === 'visiting') {
      const tr = tRef.current;
      const msg = tr.visitingSub ? `${tr.visitingTitle}\n\n${tr.visitingSub}` : tr.visitingTitle;
      await pushBot(msg, 800);
      // Append the plan carousel as a special "plans" message
      setMessages((m) => [...m, { id: ++idRef.current, role: 'plans' }]);
      setReplies([
        { label: tr.ctaHome, onClick: () => complete('/') },
      ]);
      return;
    }

    if (step === 'done') {
      const tr = tRef.current;
      setReplies([
        { label: tr.ctaHome, onClick: () => complete('/') },
        { label: tr.ctaFindPlans, onClick: () => complete('/advisor') },
      ]);
      return;
    }
  };

  const pickLang = async (chosen: Lang) => {
    pushUser(chosen === lang ? 'OK' : chosen.toUpperCase());
    if (chosen !== lang) setLang(chosen);
    trackAnswer('language', 'language', chosen, 'chat', startedAtRef.current);
    // Give React a tick so tRef reflects the new language before the next step
    setTimeout(() => {
      currentStepRef.current = 'absher';
      trackStepReached('absher', 'chat', startedAtRef.current);
      goStep('absher');
    }, 250);
  };

  const pickAbsher = async (value: 'yes' | 'no') => {
    const tr = tRef.current;
    pushUser(value === 'yes' ? tr.absherYesTitle : tr.absherNoTitle);
    setAnswers((a) => ({ ...a, absher: value }));
    trackAnswer('absher', 'has_absher', value, 'chat', startedAtRef.current);
    if (value === 'yes') {
      complete('/advisor', { absher: 'yes' });
    } else {
      currentStepRef.current = 'status';
      trackStepReached('status', 'chat', startedAtRef.current);
      await goStep('status');
    }
  };

  const pickStatus = async (value: 'moving' | 'visiting') => {
    const tr = tRef.current;
    pushUser(value === 'moving' ? tr.statusMovingTitle : tr.statusVisitingTitle);
    setAnswers((a) => ({ ...a, status: value }));
    trackAnswer('status', 'residence_intent', value, 'chat', startedAtRef.current);
    const nextStep: OnboardingStep = value === 'moving' ? 'moving' : 'visiting_plans';
    currentStepRef.current = nextStep;
    trackStepReached(nextStep, 'chat', startedAtRef.current);
    await goStep(value === 'moving' ? 'moving' : 'visiting');
  };

  const openCarrier = (key: string, url: string) => {
    trackCarrierOpened(key, 'chat', startedAtRef.current, { url });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Abandonment — fires if the user closes the tab before completing.
  useEffect(() => {
    if (!visible) return;
    const onUnload = () => {
      if (!completedRef.current) {
        trackAbandoned(currentStepRef.current, 'chat', startedAtRef.current);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [visible]);

  // Start the chat when component mounts (guarded against Strict Mode double-fire)
  useEffect(() => {
    if (!visible) return;
    document.body.style.overflow = 'hidden';
    if (!startedRef.current) {
      startedRef.current = true;
      startedAtRef.current = Date.now();
      trackEvent('onboarding_started', { onboarding_kind: 'chat' });
      trackStepReached('language', 'chat', startedAtRef.current);
      goStep('start');
    }
    return () => {
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, typing, replies]);

  if (!visible) return null;

  const goBack = () => complete('/');

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col hero-gradient grain overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Header */}
      <div className="relative z-10 px-4 pt-3 sm:px-5 sm:pt-5 flex items-center justify-between shrink-0">
        <button
          onClick={goBack}
          className="text-[#213E53]/70 hover:text-[#213E53] hover:bg-black/5 p-2 -ml-2 rounded-lg transition-colors"
          aria-label="Close"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm shrink-0">
            <img src="/icon-512.png" alt="Simba" className="w-full h-full object-cover scale-[1.05]" />
          </div>
          <div className="leading-tight">
            <div className="font-heading font-semibold text-[14px] text-[#213E53]">Simba</div>
            <div className="text-[10px] text-[#213E53]/60 font-mono tracking-wider uppercase">
              {typing ? '…' : 'online'}
            </div>
          </div>
        </div>
        <button
          onClick={() => complete('/')}
          className="text-[#213E53]/70 hover:text-[#213E53] hover:bg-black/5 p-2 -mr-2 rounded-lg transition-colors"
          aria-label="Home"
        >
          <HomeIcon size={18} />
        </button>
      </div>

      {/* Chat area */}
      <div
        ref={chatRef}
        className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5 pt-3 pb-2"
      >
        <div className="max-w-lg w-full mx-auto flex flex-col gap-2">
          {messages.map((m) =>
            m.role === 'plans' ? (
              <PlansCarousel key={m.id} t={t} isRtl={isRtl} onOpenUrl={openCarrier} />
            ) : (
              <MessageBubble key={m.id} role={m.role} text={m.text} isRtl={isRtl} />
            )
          )}
          {typing && <TypingBubble />}
        </div>
      </div>

      {/* Quick replies */}
      {replies.length > 0 && (
        <div className="relative z-10 shrink-0 px-3 sm:px-5 pt-2 pb-3 sm:pb-4">
          <div className="max-w-lg w-full mx-auto flex flex-wrap gap-2 justify-end">
            {replies.map((r, i) => (
              <button
                key={i}
                onClick={r.onClick}
                className="rounded-full bg-[#FFF0D0] hover:bg-[#FFE4A0] active:bg-[#FFD568] text-[#213E53] border border-[#213E53]/10 hover:border-[#213E53]/25 px-4 py-2 text-[13px] sm:text-[14px] font-medium shadow-sm hover:shadow-md transition-all"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Visual-only input row so this feels like a chat */}
      <div className="relative z-10 shrink-0 border-t border-[#213E53]/10 bg-white/60 backdrop-blur-sm px-3 sm:px-5 py-2.5">
        <div className="max-w-lg w-full mx-auto flex items-center gap-2">
          <input
            disabled
            placeholder="…"
            className="flex-1 bg-transparent text-[13px] sm:text-[14px] text-[#213E53] placeholder-[#213E53]/50 outline-none py-2 px-2"
          />
          <button
            disabled
            className="w-9 h-9 rounded-full bg-[#FFF0D0] text-[#213E53]/50 flex items-center justify-center opacity-50"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, text, isRtl }: { role: 'bot' | 'user'; text: string; isRtl: boolean }) {
  const isBot = role === 'bot';
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[82%] px-3.5 py-2.5 text-[14px] sm:text-[15px] leading-relaxed shadow-sm ${
          isBot
            ? `bg-white/95 text-[#213E53] border border-[#213E53]/10 ${isRtl ? 'rounded-2xl rounded-tr-md' : 'rounded-2xl rounded-tl-md'}`
            : `bg-[#FFF0D0] text-[#213E53] font-medium border border-[#213E53]/10 ${isRtl ? 'rounded-2xl rounded-tl-md' : 'rounded-2xl rounded-tr-md'}`
        }`}
      >
        {renderBotText(text)}
      </div>
    </div>
  );
}

function PlansCarousel({
  t,
  isRtl,
  onOpenUrl,
}: {
  t: CopyDict;
  isRtl: boolean;
  onOpenUrl: (carrierKey: string, url: string) => void;
}) {
  const carriers: CarrierGroup[] = [
    {
      key: 'salam',
      name: 'Salam Mobile',
      color: '#00AD42',
      url: SALAM_URL,
      plans: [
        { name: 'Visitor 29', price: '29.75', validityDays: 14, data: '2 GB', social: '2 GB', mins: 50, sms: 20, countries: 11 },
        { name: 'Visitor 59', price: '67.85', validityDays: 14, data: '12 GB', social: '15 GB', mins: 60, sms: 20, countries: 39 },
        { name: 'Visitor 89', price: '102.35', validityDays: 28, data: '20 GB', social: t.visitingUnlimited, mins: 120, sms: 50, countries: 40 },
      ],
    },
    {
      key: 'mobily',
      name: 'Mobily',
      color: '#0099E5',
      url: MOBILY_URL,
      plans: [
        { name: 'Visitors 30', price: '34.50', validityDays: 14, data: '5 GB', mins: 60 },
        { name: 'Visitors 50', price: '57.50', validityDays: 14, data: '20 GB', mins: 120 },
        { name: 'Visitors 65', price: '74.75', validityDays: 21, data: '30 GB', mins: 200 },
        { name: 'Visitors 90', price: '103.50', validityDays: 30, data: '55 GB', mins: 300 },
        { name: 'Visitors 100', price: '115.00', validityDays: 14, data: '25 GB', social: t.visitingUnlimited, mins: 400 },
        { name: 'Visitors 150', price: '172.50', validityDays: 30, data: '40 GB', social: t.visitingUnlimited, mins: 600 },
      ],
    },
    {
      key: 'zain',
      name: 'Zain',
      color: '#8DC63F',
      url: ZAIN_URL,
      plans: [
        { name: 'Visitor 40', price: '40', validityDays: 14, data: '7 GB', mins: 60, url: 'https://sa.zain.com/en/mobile/visitor/visitor-40' },
        { name: 'Visitor 60', price: '60', validityDays: 14, data: '20 GB', mins: 150, url: 'https://sa.zain.com/en/mobile/visitor/visitor-60' },
        { name: 'Visitor 85', price: '85', validityDays: 21, data: '28 GB', mins: 250, note: t.zainCugNote, url: 'https://sa.zain.com/en/mobile/visitor/visitor-85' },
        { name: 'Visitor 120', price: '120', validityDays: 28, data: '55 GB', mins: 350, note: t.zainCugNote, url: 'https://sa.zain.com/en/mobile/visitor/visitor-120' },
        { name: 'Visitor 160', price: '160', validityDays: 28, data: '75 GB', mins: 500, note: t.zainCugNote, url: 'https://sa.zain.com/en/mobile/visitor/visitor-160' },
      ],
    },
  ];

  return (
    <div className="-mx-3 sm:-mx-5 my-1">
      <div className="flex flex-col gap-4">
        {carriers.map((carrier) => (
          <div key={carrier.key} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 px-3 sm:px-5">
              <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: carrier.color }} />
              <span className="font-heading font-semibold text-[14px] text-[#213E53]">{carrier.name}</span>
              <span className="text-[11px] text-[#213E53]/50">· {carrier.plans.length} {t.plansWord}</span>
            </div>
            <div
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-3 sm:px-5 pb-2 [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {carrier.plans.map((p) => {
                const rows: Array<[string, string]> = [
                  [t.visitingData, p.data],
                  ...(p.social ? [[t.visitingSocial, p.social] as [string, string]] : []),
                  [t.visitingMins, t.visitingMinsUnit(p.mins)],
                  ...(p.sms !== undefined ? [[t.visitingSms, t.visitingSmsUnit(p.sms)] as [string, string]] : []),
                  [t.visitingValidity, t.visitingDays(p.validityDays)],
                  ...(p.countries !== undefined ? [[t.visitingCountries, String(p.countries)] as [string, string]] : []),
                ];
                return (
                  <div key={p.name} className="shrink-0 snap-start w-[76vw] max-w-[260px] sm:w-[240px] rounded-2xl bg-white/95 border border-[#213E53]/10 shadow-sm overflow-hidden">
                    <div className="h-1 w-full" style={{ backgroundColor: carrier.color }} />
                    <div className="p-3 sm:p-3.5 flex flex-col">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div
                            className="inline-block text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1.5"
                            style={{ color: carrier.color, backgroundColor: `${carrier.color}1A` }}
                          >
                            {t.visitingPrepaid}
                          </div>
                          <div className="font-heading font-bold text-[16px] text-[#213E53] leading-tight">
                            {p.name}
                          </div>
                        </div>
                      </div>
                      <div className={`flex items-baseline gap-1.5 mb-2 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                        <div className="font-heading font-bold text-[20px] text-[#C45F0A] leading-none">{p.price}</div>
                        <div className="text-[11px] font-semibold text-[#C45F0A]">SAR</div>
                        <div className="text-[10px] text-[#213E53]/55 ml-1">/ {t.visitingDays(p.validityDays)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 py-2 border-y border-[#213E53]/10">
                        {rows.map(([label, value]) => (
                          <div key={label} className="min-w-0">
                            <div className="text-[9.5px] uppercase tracking-wider text-[#213E53]/55 mb-0.5 truncate">{label}</div>
                            <div className="text-[12px] font-semibold text-[#213E53] truncate">{value}</div>
                          </div>
                        ))}
                      </div>
                      {p.note && (
                        <div className="mt-1.5 text-[10.5px] text-[#C45F0A] font-medium leading-snug">★ {p.note}</div>
                      )}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="text-[9.5px] text-[#213E53]/55">{t.visitingVat}</div>
                        <button
                          onClick={() => onOpenUrl(carrier.key, p.url ?? carrier.url)}
                          className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#C45F0A] hover:text-[#213E53] transition-colors"
                        >
                          {t.visitingGet}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/95 border border-[#213E53]/10 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#213E53]/50 animate-[pulse_1.2s_ease-in-out_infinite]" />
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#213E53]/50 animate-[pulse_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: '0.2s' }}
          />
          <span
            className="w-1.5 h-1.5 rounded-full bg-[#213E53]/50 animate-[pulse_1.2s_ease-in-out_infinite]"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
