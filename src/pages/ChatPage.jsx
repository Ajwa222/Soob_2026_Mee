import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, SkipForward, X, Loader2, Users, Lock, Check, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const STRANGER_MESSAGES = {
  en: [
    "Hey! Where are you from?",
    "Hi there! How's it going?",
    "Hello! What do you do for fun?",
    "Hey! What's your favorite movie?",
    "Hi! Do you like music?",
    "Hey! What games do you play?",
    "Hello! Nice to meet you!",
    "Hi! What brings you here?",
    "Hey! How's your day been?",
    "Hello! Any hobbies?",
    "That's cool!",
    "Haha nice 😄",
    "Oh really? Tell me more!",
    "Same here honestly",
    "That's interesting!",
    "I totally agree",
    "No way! That's awesome",
    "Lol that's funny",
    "Where are you from btw?",
    "What do you think about AI?",
  ],
  ar: [
    "هلا! من وين أنت؟",
    "أهلين! كيف الحال؟",
    "هلا! وش تسوي للمرح؟",
    "هاي! وش فلمك المفضل؟",
    "هلا! تحب الموسيقى؟",
    "هاي! وش الألعاب اللي تلعبها؟",
    "أهلين! تشرفنا!",
    "هلا! وش جابك هنا؟",
    "هاي! كيف يومك؟",
    "أهلين! عندك هوايات؟",
    "حلو!",
    "هههه نايس 😄",
    "صدق؟ قول أكثر!",
    "نفس الشي بصراحة",
    "شي مثير للاهتمام!",
    "أتفق معاك تماماً",
    "لا جد! رهيب",
    "ههههه مضحك",
    "من وين أنت بالمناسبة؟",
    "وش رأيك بالذكاء الاصطناعي؟",
  ],
};

const RANDOM_NAMES = [
  "Nora", "Fahad", "Lina", "Omar", "Sara", "Khalid",
  "Reem", "Turki", "Dana", "Majed", "Haya", "Sultan",
];

const RANDOM_AVATARS = [
  "bg-gradient-to-br from-violet-400 to-purple-600",
  "bg-gradient-to-br from-sky-400 to-blue-600",
  "bg-gradient-to-br from-emerald-400 to-green-600",
  "bg-gradient-to-br from-amber-400 to-orange-600",
  "bg-gradient-to-br from-rose-400 to-pink-600",
  "bg-gradient-to-br from-teal-400 to-cyan-600",
];

function generateMatch() {
  const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
  const avatar = RANDOM_AVATARS[Math.floor(Math.random() * RANDOM_AVATARS.length)];
  return { name, avatar, initial: name[0] };
}

export default function ChatPage() {
  const { t, lang } = useLang();
  const { isLoggedIn } = useAuth();
  const [phase, setPhase] = useState('landing'); // landing | searching | matched | chatting
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [strangerTyping, setStrangerTyping] = useState(false);
  const [usedIndices, setUsedIndices] = useState(new Set());
  const [match, setMatch] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const isRTL = lang === 'ar';

  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, strangerTyping, scrollToBottom]);

  const getRandomMessage = useCallback((isFirst) => {
    const pool = isFirst
      ? STRANGER_MESSAGES[lang].slice(0, 10)
      : STRANGER_MESSAGES[lang].slice(10);
    const available = pool
      .map((msg, i) => ({ msg, i: isFirst ? i : i + 10 }))
      .filter(({ i }) => !usedIndices.has(i));
    if (available.length === 0) {
      setUsedIndices(new Set());
      const idx = Math.floor(Math.random() * pool.length);
      return pool[idx];
    }
    const pick = available[Math.floor(Math.random() * available.length)];
    setUsedIndices(prev => new Set(prev).add(pick.i));
    return pick.msg;
  }, [lang, usedIndices]);

  const simulateStrangerReply = useCallback(() => {
    setStrangerTyping(true);
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      setStrangerTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'stranger',
        text: getRandomMessage(false),
      }]);
    }, delay);
  }, [getRandomMessage]);

  const findMatch = () => {
    setPhase('searching');
    setMessages([]);
    setUsedIndices(new Set());
    setShowReport(false);
    setReportSent(false);
    setTimeout(() => {
      setMatch(generateMatch());
      setPhase('matched');
    }, 1500 + Math.random() * 1500);
  };

  const acceptMatch = () => {
    setPhase('chatting');
    setTimeout(() => {
      setMessages([{
        id: Date.now(),
        sender: 'stranger',
        text: getRandomMessage(true),
      }]);
      inputRef.current?.focus();
    }, 500);
  };

  const skipMatch = () => {
    setPhase('searching');
    setTimeout(() => {
      setMatch(generateMatch());
      setPhase('matched');
    }, 1000 + Math.random() * 1000);
  };

  const nextPerson = () => {
    setMessages([]);
    setInput('');
    setStrangerTyping(false);
    setShowReport(false);
    setReportSent(false);
    findMatch();
  };

  const endChat = () => {
    setPhase('landing');
    setMessages([]);
    setInput('');
    setMatch(null);
    setStrangerTyping(false);
    setShowReport(false);
    setReportSent(false);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: 'user',
      text,
    }]);
    setInput('');
    simulateStrangerReply();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const confirmReport = () => {
    setShowReport(false);
    setReportSent(true);
    setTimeout(() => {
      setReportSent(false);
      nextPerson();
    }, 1500);
  };

  // ---- Auth Gate ----
  if (phase === 'landing' && !isLoggedIn) {
    return (
      <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 safe-pb">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary-dark
            flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
            <Users size={36} className="text-white" />
          </div>

          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-3">
            {t('meetChat.title')}
          </h1>
          <p className="text-text-secondary text-lg mb-8 leading-relaxed">
            {t('meetChat.subtitle')}
          </p>

          <div className="flex flex-col gap-3 mb-6 text-start">
            {['meetChat.feat1', 'meetChat.feat2', 'meetChat.feat3'].map((key) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-alt/60">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-sm text-text-secondary">{t(key)}</span>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border/60 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock size={16} className="text-primary" />
              <span className="text-sm font-bold text-text-primary">{t('meetChat.loginRequired')}</span>
            </div>
            <p className="text-xs text-text-secondary mb-4">{t('meetChat.loginDesc')}</p>
            <div className="flex gap-3">
              <Link
                to="/profile"
                className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-primary to-primary-dark
                  text-white hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press text-center"
              >
                {t('meetChat.signUp')}
              </Link>
              <Link
                to="/profile"
                className="flex-1 py-3 rounded-xl text-sm font-bold border border-border/60 text-text-primary
                  hover:bg-surface-alt transition-all duration-200 btn-press text-center"
              >
                {t('meetChat.signIn')}
              </Link>
            </div>
          </div>

          <p className="text-xs text-text-tertiary">
            {t('meetChat.disclaimer')}
          </p>
        </div>
      </div>
    );
  }

  // ---- Landing Screen (logged in) ----
  if (phase === 'landing') {
    return (
      <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 safe-pb">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary-dark
            flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/25">
            <Users size={36} className="text-white" />
          </div>

          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-3">
            {t('meetChat.title')}
          </h1>
          <p className="text-text-secondary text-lg mb-8 leading-relaxed">
            {t('meetChat.subtitle')}
          </p>

          <div className="flex flex-col gap-3 mb-8 text-start">
            {['meetChat.feat1', 'meetChat.feat2', 'meetChat.feat3'].map((key) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-surface-alt/60">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span className="text-sm text-text-secondary">{t(key)}</span>
              </div>
            ))}
          </div>

          <button
            onClick={findMatch}
            className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-primary to-primary-dark
              text-white hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press"
          >
            {t('meetChat.startBtn')}
          </button>

          <p className="mt-4 text-xs text-text-tertiary">
            {t('meetChat.disclaimer')}
          </p>
        </div>
      </div>
    );
  }

  // ---- Searching Screen ----
  if (phase === 'searching') {
    return (
      <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 safe-pb">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            {t('meetChat.searching')}
          </h2>
          <p className="text-text-secondary text-sm">
            {t('meetChat.searchingDesc')}
          </p>
        </div>
      </div>
    );
  }

  // ---- Match Preview Screen ----
  if (phase === 'matched' && match) {
    return (
      <div className="min-h-[calc(100dvh-60px)] flex items-center justify-center px-4 safe-pb">
        <div className="max-w-sm w-full text-center">
          <p className="text-sm font-semibold text-primary mb-6">{t('meetChat.foundMatch')}</p>

          {/* Match card */}
          <div className="bg-surface border border-border/60 rounded-3xl p-8 shadow-sm mb-6">
            <div className={`w-20 h-20 rounded-full ${match.avatar} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <span className="text-2xl font-bold text-white">{match.initial}</span>
            </div>
            <h2 className="text-xl font-heading font-bold text-text-primary mb-1">{match.name}</h2>
            <p className="text-sm text-text-tertiary">{t('meetChat.matchSub')}</p>
          </div>

          {/* Accept / Skip buttons */}
          <div className="flex gap-3">
            <button
              onClick={skipMatch}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold
                border border-border/60 text-text-secondary hover:bg-surface-alt transition-all duration-200 btn-press"
            >
              <SkipForward size={16} />
              {t('meetChat.skip')}
            </button>
            <button
              onClick={acceptMatch}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold
                bg-gradient-to-r from-primary to-primary-dark text-white
                hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press"
            >
              <Check size={16} />
              {t('meetChat.accept')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Chat Interface ----
  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] md:max-w-2xl md:mx-auto md:my-4 md:h-[calc(100dvh-104px)] md:rounded-2xl md:border md:border-border/60 md:overflow-hidden bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-surface/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {match && (
            <div className={`w-9 h-9 rounded-full ${match.avatar} flex items-center justify-center`}>
              <span className="text-sm font-bold text-white">{match.initial}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-sm text-text-primary">{match?.name || t('meetChat.stranger')}</p>
            <p className="text-xs text-green-500">{t('meetChat.online')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center justify-center w-8 h-8 rounded-xl text-text-tertiary
              hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
          >
            <Flag size={14} />
          </button>
          <button
            onClick={nextPerson}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold
              bg-primary/10 text-primary hover:bg-primary/20 transition-colors btn-press"
          >
            <SkipForward size={14} className="shrink-0" />
            <span className="hidden sm:inline">{t('meetChat.next')}</span>
          </button>
          <button
            onClick={endChat}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-semibold
              bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors btn-press"
          >
            <X size={14} className="shrink-0" />
            <span className="hidden sm:inline">{t('meetChat.endChat')}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="flex justify-center">
          <span className="text-xs text-text-tertiary bg-surface-alt/60 px-3 py-1 rounded-full">
            {t('meetChat.connected')}
          </span>
        </div>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                  ${isUser
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-surface-alt text-text-primary rounded-bl-md'
                  }`}
                style={isRTL ? {
                  borderBottomLeftRadius: isUser ? undefined : '6px',
                  borderBottomRightRadius: isUser ? '6px' : undefined,
                } : undefined}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {strangerTyping && (
          <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
            <div className="bg-surface-alt px-4 py-2.5 rounded-2xl rounded-bl-md">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-text-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border/60 bg-surface/80 backdrop-blur-sm chat-input-spacer">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('meetChat.placeholder')}
            className="flex-1 px-4 py-3 rounded-2xl bg-surface-alt border border-border/60 text-sm text-text-primary
              placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
              transition-all"
            dir="auto"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-11 h-11 rounded-2xl bg-primary text-white flex items-center justify-center
              hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed btn-press shrink-0"
          >
            <Send size={18} className={isRTL ? 'rotate-180' : ''} />
          </button>
        </div>
      </div>

      {/* Report confirm popup */}
      {showReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4" onClick={() => setShowReport(false)}>
          <div className="bg-surface rounded-2xl border border-border/60 shadow-xl w-full max-w-xs p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <Flag size={22} className="text-amber-500" />
            </div>
            <h3 className="font-heading font-bold text-lg text-text-primary mb-1">{t('meetChat.reportTitle')}</h3>
            <p className="text-sm text-text-secondary mb-5">{t('meetChat.reportDesc')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReport(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-border/60 text-text-secondary
                  hover:bg-surface-alt transition-colors btn-press"
              >
                {t('meetChat.cancel')}
              </button>
              <button
                onClick={confirmReport}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white
                  hover:bg-red-600 transition-colors btn-press"
              >
                {t('meetChat.reportConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report sent toast */}
      {reportSent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-surface rounded-2xl border border-border/60 shadow-xl w-full max-w-xs p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
              <Check size={22} className="text-green-500" />
            </div>
            <p className="font-bold text-sm text-text-primary">{t('meetChat.reportSent')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
