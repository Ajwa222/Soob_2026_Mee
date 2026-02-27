import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, ChevronDown, Phone, Mail, ArrowRight, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';

/* ── FAQ Data (moved from HelpPage) ── */
const FAQ_DATA = [
  {
    q: "What is Simba?", qAr: "وش هي سيمبا؟",
    a: "Simba is Saudi Arabia's smartest telecom comparison platform. We compare 155+ plans from all 8 licensed carriers — STC, Mobily, Zain, Virgin Mobile, Jawwy, Lebara, Yaqoot, and Salam. We're 100% free, independent, and we never sell SIMs.",
    aAr: "سيمبا أذكى منصة مقارنة اتصالات بالسعودية. نقارن أكثر من 155 باقة من 8 شركات مرخصة. مجانية 100% ومستقلة وما نبيع شرائح.",
  },
  {
    q: "Does Simba sell SIM cards?", qAr: "سيمبا تبيع شرائح؟",
    a: "No. Simba is a comparison platform only. When you choose a plan, we redirect you to the carrier's official website to purchase directly. We never handle payments or sell SIMs.",
    aAr: "لا. سيمبا منصة مقارنة بس. لما تختار باقة، نحوّلك لموقع الشركة الرسمي عشان تشتري مباشرة.",
  },
  {
    q: "How does the Smart Advisor work?", qAr: "كيف يشتغل المستشار الذكي؟",
    a: "The Smart Advisor asks 5 quick questions about your usage, data needs, budget, calling habits, and preferences. Our algorithm then scores every plan and shows you the best matches — takes about 30 seconds!",
    aAr: "المستشار الذكي يسألك 5 أسئلة سريعة عن استخدامك والبيانات والميزانية والمكالمات. خوارزميتنا تقيّم كل باقة وتعرض لك أفضل الخيارات — تاخذ 30 ثانية بس!",
  },
  {
    q: "Are the prices accurate?", qAr: "الأسعار دقيقة؟",
    a: "We update our database regularly. All prices include 15% VAT. However, carriers may change plans anytime, so always verify the final price on the carrier's official website before purchasing.",
    aAr: "نحدّث قاعدة بياناتنا بانتظام. كل الأسعار فيها ضريبة 15%. بس تأكد دايم من السعر النهائي بموقع الشركة الرسمي.",
  },
  {
    q: "I'm a tourist. Which plan should I get?", qAr: "أنا سائح، وش الباقة اللي تنفعني؟",
    a: "For tourists, we recommend Prepaid plans with 30-day validity and 20+ GB data. Use our Smart Advisor and select 'Tourist / Visitor' for tailored recommendations!",
    aAr: "للسياح ننصحك بباقات مسبقة الدفع بصلاحية 30 يوم و 20+ قيقا بيانات. جرب المستشار الذكي واختر 'سائح' عشان نلقالك أفضل الخيارات!",
  },
  {
    q: "How do I compare plans?", qAr: "كيف أقارن الباقات؟",
    a: "On any plan card, click 'Compare' to add it to your tray (up to 3). Once you've selected 2-3 plans, click 'Compare Now' to see them side by side.",
    aAr: "بأي بطاقة باقة، اضغط 'قارن' عشان تضيفها (لين 3). لما تختار 2-3 باقات، اضغط 'قارن الحين' عشان تشوفها جنب بعض.",
  },
  {
    q: "Is Simba affiliated with any carrier?", qAr: "سيمبا تابعة لأي شركة اتصالات؟",
    a: "No. Simba is 100% independent. We are not affiliated with or sponsored by any carrier. Our recommendations are completely unbiased.",
    aAr: "لا. سيمبا مستقلة 100%. ما نتبع ولا أحد يرعانا من شركات الاتصالات. توصياتنا محايدة تماماً.",
  },
  {
    q: "What does 'Best Value' mean?", qAr: "وش يعني 'الأفضل قيمة'؟",
    a: "Our value score algorithm weighs data, calls, SMS, social media data, international calls, and features, then divides by price. Higher score = better value per SAR.",
    aAr: "خوارزميتنا تحسب البيانات والمكالمات والرسائل والسوشل ميديا والمميزات، وبعدين تقسمها على السعر. نتيجة أعلى = قيمة أفضل لكل ريال.",
  },
];

/* ── Intent definitions ── */
const INTENTS = [
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'howdy', 'sup', 'مرحبا', 'هلا', 'السلام', 'اهلا', 'مرحبًا', 'هاي'],
    en: "Hey there! I'm Simba Bot — your telecom buddy. Ask me anything or tap a shortcut below!",
    ar: "هلا فيك! أنا بوت سيمبا — مساعدك للاتصالات. اسألني أي شي أو استخدم الأزرار تحت!",
  },
  {
    id: 'find_plan',
    keywords: ['find', 'plan', 'recommend', 'suggest', 'pick', 'choose', 'match', 'باقة', 'اختار', 'اقتراح', 'وش الباقة', 'اختار لي'],
    en: "Great choice! Our **Smart Advisor** takes just 30 seconds to match you with the best plan for your needs and budget.",
    ar: "ممتاز! **المستشار الذكي** يبي له بس 30 ثانية عشان يلقالك أفضل باقة حسب احتياجاتك وميزانيتك.",
    nav: { path: '/finder', en: 'Open Smart Advisor', ar: 'افتح المستشار الذكي' },
  },
  {
    id: 'tourist',
    keywords: ['tourist', 'visitor', 'visiting', 'travel', 'traveler', 'سائح', 'زائر', 'سياحة', 'مسافر'],
    en: "Welcome to Saudi Arabia! For tourists, I recommend **Prepaid plans** with 30-day validity and 20+ GB data. Try our Smart Advisor and select 'Tourist' for tailored options!",
    ar: "هلا فيك بالسعودية! للسياح أنصحك بـ **باقات مسبقة الدفع** بصلاحية 30 يوم و 20+ قيقا. جرب المستشار الذكي واختر 'سائح'!",
    nav: { path: '/finder', en: 'Open Smart Advisor', ar: 'افتح المستشار الذكي' },
  },
  {
    id: 'compare',
    keywords: ['compare', 'comparison', 'side by side', 'versus', 'vs', 'قارن', 'مقارنة', 'جنب بعض'],
    en: "You can compare up to 3 plans side by side! Head to Browse Plans, tap 'Compare' on any plan card, then hit 'Compare Now'.",
    ar: "تقدر تقارن لين 3 باقات جنب بعض! روح صفحة الباقات، اضغط 'قارن' على أي بطاقة، وبعدين 'قارن الحين'.",
    nav: { path: '/plans', en: 'Browse Plans', ar: 'تصفح الباقات' },
  },
  {
    id: 'browse_plans',
    keywords: ['browse', 'all plans', 'show plans', 'list', 'الباقات', 'تصفح', 'كل الباقات', 'عرض'],
    en: "We have **155+ plans** from all 8 Saudi carriers. Browse, filter, and sort to find exactly what you need!",
    ar: "عندنا **أكثر من 155 باقة** من 8 شركات. تصفح، فلتر، ورتب عشان تلقى اللي يناسبك!",
    nav: { path: '/plans', en: 'Browse All Plans', ar: 'تصفح كل الباقات' },
  },
  {
    id: 'prices',
    keywords: ['price', 'cost', 'cheap', 'expensive', 'affordable', 'budget', 'سعر', 'غالي', 'رخيص', 'تكلفة', 'ميزانية'],
    en: "All prices include 15% VAT. Use filters on our Browse page to set your budget range and find plans that fit!",
    ar: "كل الأسعار فيها ضريبة 15%. استخدم الفلاتر بصفحة الباقات عشان تحدد ميزانيتك وتلقى اللي يناسبك!",
    nav: { path: '/plans', en: 'Browse Plans', ar: 'تصفح الباقات' },
  },
  {
    id: 'what_is_simba',
    keywords: ['what is simba', 'about simba', 'who are you', 'what do you do', 'وش سيمبا', 'عن سيمبا', 'من انتم', 'وش تسوون'],
    en: "Simba is Saudi Arabia's smartest telecom comparison platform. We compare **155+ plans** from all 8 licensed carriers. We're 100% free, independent, and we **never sell SIMs** — we redirect you to the carrier's official website.",
    ar: "سيمبا أذكى منصة مقارنة اتصالات بالسعودية. نقارن **أكثر من 155 باقة** من 8 شركات. مجانية 100% ومستقلة و**ما نبيع شرائح** — نحوّلك لموقع الشركة الرسمي.",
    nav: { path: '/about', en: 'Learn More', ar: 'اعرف أكثر' },
  },
  {
    id: 'sell_sims',
    keywords: ['sell', 'buy sim', 'purchase', 'order', 'تبيع', 'شراء', 'اشتري', 'طلب'],
    en: "We **don't sell SIMs** or process payments. When you choose a plan, we redirect you to the carrier's official website. Zero risk, zero middlemen!",
    ar: "**ما نبيع شرائح** ولا نعالج مدفوعات. لما تختار باقة، نحوّلك لموقع الشركة الرسمي. بدون مخاطر وبدون وسطاء!",
  },
  {
    id: 'smart_advisor',
    keywords: ['advisor', 'smart', 'quiz', 'questions', 'المستشار', 'الذكي', 'أسئلة'],
    en: "The **Smart Advisor** asks 5 quick questions and matches you with the top 3 plans. Takes about 30 seconds!",
    ar: "**المستشار الذكي** يسألك 5 أسئلة سريعة ويلقالك أفضل 3 باقات. ما تاخذ أكثر من 30 ثانية!",
    nav: { path: '/finder', en: 'Start Smart Advisor', ar: 'ابدأ المستشار الذكي' },
  },
  {
    id: 'best_value',
    keywords: ['best value', 'value', 'worth', 'أفضل قيمة', 'قيمة', 'يستاهل'],
    en: "Our value score weighs data, calls, SMS, social media, and features, then divides by price. Higher score = better value per SAR! Check the Browse page sorted by Best Value.",
    ar: "خوارزميتنا تحسب البيانات والمكالمات والرسائل والسوشل ميديا والمميزات وتقسمها على السعر. نتيجة أعلى = قيمة أفضل لكل ريال!",
    nav: { path: '/plans', en: 'See Best Value Plans', ar: 'شوف أفضل الباقات قيمة' },
  },
  {
    id: 'contact',
    keywords: ['contact', 'call', 'phone', 'email', 'support', 'help me', 'agent', 'human', 'اتصل', 'دعم', 'تواصل', 'بشري', 'كلم'],
    en: "You can reach our team through:",
    ar: "تقدر تتواصل مع فريقنا عن طريق:",
    contact: true,
  },
  {
    id: 'game',
    keywords: ['game', 'play', 'feed simba', 'لعبة', 'العب', 'أطعم سيمبا'],
    en: "Want to play **Feed Simba**? Defeat monsters and grow your lion! It's our fun idle game.",
    ar: "تبي تلعب **أطعم سيمبا**؟ اهزم الوحوش وكبّر أسدك! لعبتنا الممتعة.",
    nav: { path: '/game', en: 'Play Now', ar: 'العب الحين' },
  },
];

/* ── Shortcuts ── */
const SHORTCUTS = [
  { emoji: '🔍', en: 'Find My Plan', ar: 'لقّني باقة', intentId: 'find_plan' },
  { emoji: '📊', en: 'Compare Plans', ar: 'قارن الباقات', intentId: 'compare' },
  { emoji: '✈️', en: 'Tourist Help', ar: 'مساعدة سائح', intentId: 'tourist' },
  { emoji: '📞', en: 'Call Support', ar: 'اتصل بالدعم', intentId: 'contact' },
  { emoji: '❓', en: 'FAQs', ar: 'الأسئلة الشائعة', intentId: 'faq' },
  { emoji: '💬', en: 'Live Agent', ar: 'وكيل مباشر', intentId: 'contact' },
];

/* ── Helpers ── */
function matchIntent(text) {
  const lower = text.toLowerCase().trim();
  let bestMatch = null;
  let bestLen = 0;
  for (const intent of INTENTS) {
    for (const kw of intent.keywords) {
      if (lower.includes(kw) && kw.length > bestLen) {
        bestMatch = intent;
        bestLen = kw.length;
      }
    }
  }
  return bestMatch;
}

function searchFAQ(text, lang) {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return null;
  let bestFaq = null;
  let bestScore = 0;
  for (const faq of FAQ_DATA) {
    const target = `${faq.q} ${faq.qAr} ${faq.a} ${faq.aAr}`.toLowerCase();
    const score = words.filter(w => target.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestFaq = faq;
    }
  }
  return bestScore > 0 ? bestFaq : null;
}

function renderBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold">{part}</strong> : part
  );
}

/* ── Component ── */
export default function ChatBubble() {
  const { t, lang, toggleLang } = useLang();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);


  // Open chat — reset to fresh state each time
  const openChat = useCallback(() => {
    setMessages([{ from: 'bot', type: 'text', text: t('chat.greeting') }]);
    setInput('');
    setIsTyping(false);
    setIsOpen(true);
  }, [t]);

  // Listen for simba-open-chat custom event
  useEffect(() => {
    const handler = () => openChat();
    window.addEventListener('simba-open-chat', handler);
    return () => window.removeEventListener('simba-open-chat', handler);
  }, [openChat]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addBotMessage = useCallback((msg) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, msg]);
    }, 600);
  }, []);

  const handleNav = useCallback((path) => {
    navigate(path);
    setIsOpen(false);
  }, [navigate]);

  const handleIntent = useCallback((intent) => {
    const text = lang === 'ar' ? intent.ar : intent.en;
    const msg = { from: 'bot', type: 'text', text };
    if (intent.contact) {
      msg.type = 'contact';
    }
    if (intent.nav) {
      msg.type = 'nav';
      msg.nav = intent.nav;
    }
    addBotMessage(msg);
  }, [lang, addBotMessage]);

  const handleFAQShortcut = useCallback(() => {
    addBotMessage({ from: 'bot', type: 'faq' });
  }, [addBotMessage]);

  const handleShortcut = useCallback((shortcut) => {
    const label = lang === 'ar' ? shortcut.ar : shortcut.en;
    setMessages(prev => [...prev, { from: 'user', type: 'text', text: `${shortcut.emoji} ${label}` }]);
    if (shortcut.intentId === 'faq') {
      handleFAQShortcut();
      return;
    }
    const intent = INTENTS.find(i => i.id === shortcut.intentId);
    if (intent) handleIntent(intent);
  }, [lang, handleIntent, handleFAQShortcut]);

  const handleSend = useCallback((text) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { from: 'user', type: 'text', text }]);
    setInput('');

    const intent = matchIntent(text);
    if (intent) {
      handleIntent(intent);
      return;
    }

    const faqMatch = searchFAQ(text, lang);
    if (faqMatch) {
      const answer = lang === 'ar' ? faqMatch.aAr : faqMatch.a;
      addBotMessage({ from: 'bot', type: 'text', text: answer });
      return;
    }

    // Fallback
    addBotMessage({
      from: 'bot',
      type: 'fallback',
      text: lang === 'ar'
        ? "ما لقيت إجابة دقيقة لسؤالك. جرب الأزرار السريعة أو تواصل مع فريقنا:"
        : "I couldn't find an exact answer. Try the shortcuts or reach out to our team:",
    });
  }, [lang, handleIntent, addBotMessage]);

  /* ── Message renderers ── */
  const renderMessage = (msg, i) => {
    if (msg.from === 'user') {
      return (
        <div key={i} className="flex justify-end">
          <div className="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed bg-primary text-white rounded-2xl rounded-ee-md">
            {msg.text}
          </div>
        </div>
      );
    }

    switch (msg.type) {
      case 'nav':
        return (
          <div key={i} className="flex justify-start">
            <div className="max-w-[85%] space-y-2.5">
              <div className="px-4 py-2.5 text-sm leading-relaxed bg-surface text-text-primary rounded-2xl rounded-es-md shadow-sm">
                {renderBold(msg.text)}
              </div>
              <button
                onClick={() => handleNav(msg.nav.path)}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white
                  bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/25
                  transition-all btn-press"
              >
                <span>{lang === 'ar' ? msg.nav.ar : msg.nav.en}</span>
                <ArrowRight size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
              </button>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div key={i} className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <div className="px-4 py-2.5 text-sm leading-relaxed bg-surface text-text-primary rounded-2xl rounded-es-md shadow-sm">
                {renderBold(msg.text)}
              </div>
              <a
                href="tel:+966500000000"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border/60 hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F59E0B18' }}>
                  <Phone size={16} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{lang === 'ar' ? 'اتصل بنا' : 'Call Us'}</p>
                  <p className="text-xs text-text-secondary">{lang === 'ar' ? 'أحد-خميس، 9ص-6م' : 'Sun-Thu, 9AM-6PM'}</p>
                </div>
              </a>
              <a
                href="mailto:support@simba.sa"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border/60 hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10B98118' }}>
                  <Mail size={16} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">support@simba.sa</p>
                  <p className="text-xs text-text-secondary">{lang === 'ar' ? 'نرد خلال 24 ساعة' : 'We reply within 24h'}</p>
                </div>
              </a>
            </div>
          </div>
        );

      case 'fallback':
        return (
          <div key={i} className="flex justify-start">
            <div className="max-w-[85%] space-y-2">
              <div className="px-4 py-2.5 text-sm leading-relaxed bg-surface text-text-primary rounded-2xl rounded-es-md shadow-sm">
                {renderBold(msg.text)}
              </div>
              <a
                href="tel:+966500000000"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border/60 hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F59E0B18' }}>
                  <Phone size={16} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">{lang === 'ar' ? 'اتصل بنا' : 'Call Us'}</p>
                  <p className="text-xs text-text-secondary">{lang === 'ar' ? 'أحد-خميس، 9ص-6م' : 'Sun-Thu, 9AM-6PM'}</p>
                </div>
              </a>
              <a
                href="mailto:support@simba.sa"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border/60 hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#10B98118' }}>
                  <Mail size={16} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-text-primary">support@simba.sa</p>
                  <p className="text-xs text-text-secondary">{lang === 'ar' ? 'نرد خلال 24 ساعة' : 'We reply within 24h'}</p>
                </div>
              </a>
            </div>
          </div>
        );

      case 'faq':
        return <FAQAccordion key={i} lang={lang} />;

      default:
        return (
          <div key={i} className="flex justify-start">
            <div className="max-w-[85%] px-4 py-2.5 text-sm leading-relaxed bg-surface text-text-primary rounded-2xl rounded-es-md shadow-sm">
              {renderBold(msg.text)}
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 md:bottom-8 end-4 md:end-8 z-50 w-[360px] max-w-[calc(100vw-2rem)]
            bg-surface rounded-3xl shadow-[0_16px_48px_rgba(0,0,0,0.15)] border border-border/60 overflow-hidden
            flex flex-col"
          style={{ animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)', maxHeight: 'min(600px, calc(100vh - 8rem))' }}
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between shrink-0"
            style={{ background: 'linear-gradient(135deg, #1FA9FF, #1890e0)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-heading font-bold text-sm">{lang === 'ar' ? 'بوت سيمبا' : 'Simba Bot'}</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-white/70 text-[11px]">{lang === 'ar' ? 'متصل الآن' : 'Online now'}</p>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-surface-alt/50 min-h-0">
            {/* Language switcher — first thing the user sees */}
            <button
              onClick={toggleLang}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl
                bg-gradient-to-r from-primary/10 to-primary-dark/10 border-2 border-primary/30
                hover:border-primary/60 hover:from-primary/15 hover:to-primary-dark/15
                transition-all duration-200 btn-press group"
            >
              <Globe size={18} className="text-primary" />
              <span className="text-sm font-bold text-primary">
                {lang === 'en' ? 'العربية' : 'English'}
              </span>
              <span className="text-xs text-text-tertiary">
                {lang === 'en' ? '— Switch to Arabic' : '— Switch to English'}
              </span>
            </button>

            {messages.map(renderMessage)}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="px-4 py-3 bg-surface rounded-2xl rounded-es-md shadow-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Shortcuts — always visible, horizontal scroll */}
          <div className="px-3 py-2.5 flex gap-2 overflow-x-auto border-t border-border/50 bg-surface shrink-0
            scrollbar-none" style={{ scrollbarWidth: 'none' }}>
            {SHORTCUTS.map(sc => (
              <button
                key={sc.intentId + sc.en}
                onClick={() => handleShortcut(sc)}
                className="shrink-0 text-xs px-3 py-2 rounded-xl bg-primary/8 text-primary font-semibold
                  hover:bg-primary/15 transition-colors btn-press border border-primary/15 whitespace-nowrap"
              >
                {sc.emoji} {lang === 'ar' ? sc.ar : sc.en}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-3 flex items-center gap-2.5 bg-surface shrink-0">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder={t('chat.placeholder')}
              className="flex-1 text-sm bg-surface-alt rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20
                text-text-primary placeholder:text-text-tertiary"
            />
            <button
              onClick={() => handleSend(input)}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-dark text-white flex items-center justify-center
                hover:shadow-md hover:shadow-primary/25 transition-all btn-press"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* No floating bubble — chat is accessible from the nav bar's chat icon */}
    </>
  );
}

/* ── FAQ Accordion sub-component ── */
function FAQAccordion({ lang }) {
  const [openId, setOpenId] = useState(null);

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] space-y-1.5">
        <div className="px-4 py-2.5 text-sm leading-relaxed bg-surface text-text-primary rounded-2xl rounded-es-md shadow-sm">
          {lang === 'ar' ? 'الأسئلة الشائعة:' : 'Frequently Asked Questions:'}
        </div>
        {FAQ_DATA.map((faq, i) => {
          const isOpen = openId === i;
          return (
            <div key={i} className="bg-surface rounded-xl border border-border/60 overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-start"
              >
                <span className="text-xs font-semibold text-text-primary leading-snug">
                  {lang === 'ar' ? faq.qAr : faq.q}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-text-tertiary shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {isOpen && (
                <div className="px-3.5 pb-2.5 -mt-0.5">
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {lang === 'ar' ? faq.aAr : faq.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
