import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles, ArrowRight, ArrowLeft, ChevronRight, Compass,
  Wifi, Phone, Globe2,
  RotateCcw, Trophy, Star, ThumbsUp,
  Check, Minus, X,
  MessageCircle, Zap, Shield, Clock, TreePalm, Lock,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { PLANS_DATA, getValueScore, isValidValue } from '../data/plans';
import PlanCard from '../components/PlanCard';
import SarSymbol from '../components/SarSymbol';

const SaudiRiyalIcon = ({ size = 24, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 1124.14 1256.39" className={className} fill="currentColor">
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/>
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/>
  </svg>
);

const STEPS = ['internet', 'localCalls', 'intlCalls', 'social', 'budget'];
const BUDGET_SHORTCUTS = [50, 100, 150, 200, 300, 500, 750, 1000];
const BUDGET_MIN = 30;
const BUDGET_MAX = 1000;

function parseData(val) {
  if (!val || val === '-') return 0;
  if (val === 'Unlimited') return Infinity;
  return parseFloat(val) || 0;
}

// --- Smart Scoring Engine ---
function scorePlans(answers) {
  const budget = answers.budget || 200;

  const scored = PLANS_DATA
    .filter(p => p.planType !== 'Data-only')
    .map(plan => {
      let score = 0;

      const gb = parseData(plan.dataGB);
      const mins = parseData(plan.localCallMinutes);
      const price = plan.priceSAR;
      const hasSocial = isValidValue(plan.socialMediaData) && plan.socialMediaData !== '1';
      const socialUnlimited = plan.socialMediaData === 'Unlimited' ||
        (plan.socialMediaData && plan.socialMediaData.toLowerCase().includes('unlimited'));
      const hasIntl = isValidValue(plan.internationalCallMinutes);
      const intlMins = parseData(plan.internationalCallMinutes);

      // --- Internet (+25 pts max) ---
      if (answers.internet === 'yes') {
        if (gb === Infinity) score += 25;
        else if (gb >= 50) score += 20;
        else if (gb >= 20) score += 12;
        else if (gb >= 5) score += 4;
      } else if (answers.internet === 'sometimes') {
        if (gb >= 10 && gb <= 50) score += 20;
        else if (gb > 50 || gb === Infinity) score += 12;
        else if (gb >= 3) score += 8;
      } else if (answers.internet === 'no') {
        if (gb <= 5) score += 15;
        else if (gb <= 15) score += 8;
      }

      // --- Local calls (+20 pts max) ---
      if (answers.localCalls === 'yes') {
        if (mins === Infinity) score += 20;
        else if (mins >= 500) score += 16;
        else if (mins >= 200) score += 8;
      } else if (answers.localCalls === 'sometimes') {
        if (mins >= 100 && mins <= 500) score += 16;
        else if (mins > 500 || mins === Infinity) score += 10;
        else if (mins >= 50) score += 6;
      } else if (answers.localCalls === 'no') {
        score += 4;
      }

      // --- International calls (+20 pts max) ---
      if (answers.intlCalls === 'yes') {
        if (hasIntl && intlMins >= 100) score += 20;
        else if (hasIntl) score += 12;
        else score -= 10;
      } else if (answers.intlCalls === 'sometimes') {
        if (hasIntl) score += 12;
      } else if (answers.intlCalls === 'no') {
        score += 2;
      }

      // --- Social media (+15 pts max) ---
      if (answers.social === 'yes') {
        if (socialUnlimited) score += 15;
        else if (hasSocial) score += 9;
      } else if (answers.social === 'sometimes') {
        if (socialUnlimited) score += 9;
        else if (hasSocial) score += 6;
      } else if (answers.social === 'no') {
        score += 2;
      }

      // --- Budget fit (+25 pts max) ---
      const diff = Math.abs(price - budget);
      const range = budget * 0.3; // 30% tolerance
      if (price <= budget) {
        // Under or at budget
        if (diff <= range) score += 25;
        else if (diff <= budget * 0.6) score += 15;
        else score += 8;
      } else {
        // Over budget — penalize proportionally
        if (diff <= range) score += 10;
        else if (diff <= budget * 0.6) score -= 5;
        else score -= 15;
      }

      // --- Value bonus (up to +5 pts) ---
      const valScore = getValueScore(plan);
      score += Math.min(valScore * 5, 5);

      return { plan, score, price };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score || a.price - b.price);

  const top3 = scored.slice(0, 3);
  const labels = ['best', 'runner', 'value'];
  return top3.map((item, i) => ({
    ...item,
    label: labels[i] || 'value',
  }));
}

export default function FinderPage() {
  const { t, lang } = useLang();
  const { isLoggedIn, hasAccount } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ budget: 150 });
  const [showResults, setShowResults] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const autoAdvanceTimer = useRef(null);
  const hasRestored = useRef(false);


  // Restore results after signup redirect
  useEffect(() => {
    if (hasRestored.current) return;
    if (searchParams.get('reveal') === '1' && isLoggedIn) {
      const pending = localStorage.getItem('simba-finder-pending');
      if (pending) {
        try {
          const { answers: savedAnswers } = JSON.parse(pending);
          setAnswers(savedAnswers);
          setStarted(true);
          setShowResults(true);
        } catch {}
        localStorage.removeItem('simba-finder-pending');
      }
      setSearchParams({}, { replace: true });
      hasRestored.current = true;
    }
  }, [searchParams, isLoggedIn, setSearchParams]);

  const isBudgetStep = STEPS[step] === 'budget';

  const setAnswer = (key, value) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  // Auto-advance for yes/sometimes/no questions
  const handleQuickAnswer = (key, value) => {
    setAnswer(key, value);
    // Clear any pending timer
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    // Short delay so the user sees their selection highlight
    autoAdvanceTimer.current = setTimeout(() => {
      if (step < STEPS.length - 1) {
        setStep(prev => prev + 1);
      }
    }, 350);
  };

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, []);

  const submitBudget = () => {
    localStorage.setItem('simba-finder-pending', JSON.stringify({ answers }));
    setIsThinking(true);
  };

  useEffect(() => {
    if (!isThinking) return;
    const timer = setTimeout(() => {
      setIsThinking(false);
      setShowResults(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isThinking]);

  const back = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    if (showResults) { setShowResults(false); return; }
    if (step > 0) setStep(step - 1);
  };

  const restart = () => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setStarted(false);
    setStep(0);
    setAnswers({ budget: 150 });
    setShowResults(false);
    setIsThinking(false);
  };

  const allNo = answers.internet === 'no' && answers.localCalls === 'no'
    && answers.intlCalls === 'no' && answers.social === 'no';

  const recommendations = useMemo(() => {
    if (!showResults) return [];
    if (allNo) {
      // Pick 3 cheapest non-data-only plans within budget
      const budget = answers.budget || 150;
      const cheap = PLANS_DATA
        .filter(p => p.planType !== 'Data-only' && p.priceSAR <= budget * 1.15)
        .sort((a, b) => a.priceSAR - b.priceSAR)
        .slice(0, 3);
      return cheap.map((plan, i) => ({
        plan,
        score: 0,
        label: ['best', 'runner', 'value'][i] || 'value',
      }));
    }
    return scorePlans(answers);
  }, [showResults, answers, allNo]);

  const answerOptions = [
    { key: 'yes', icon: Check, label: t('finder.ansYes') },
    { key: 'sometimes', icon: Minus, label: t('finder.ansSometimes') },
    { key: 'no', icon: X, label: t('finder.ansNo') },
  ];

  const stepConfig = {
    internet: { icon: Wifi, title: t('finder.qInternet'), subtitle: t('finder.qInternetSub') },
    localCalls: { icon: Phone, title: t('finder.qLocalCalls'), subtitle: t('finder.qLocalCallsSub') },
    intlCalls: { icon: Globe2, title: t('finder.qIntlCalls'), subtitle: t('finder.qIntlCallsSub') },
    social: { icon: MessageCircle, title: t('finder.qSocial'), subtitle: t('finder.qSocialSub') },
    budget: { icon: SaudiRiyalIcon, title: t('finder.qBudget'), subtitle: t('finder.qBudgetSub') },
  };

  const currentStep = stepConfig[STEPS[step]];
  const progress = showResults || isThinking ? 100 : ((step + 1) / STEPS.length) * 100;
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  const reasonLabel = (label) => {
    const map = {
      best: { icon: Trophy, text: t('finder.labelBest'), color: 'text-amber-500 bg-amber-500/10' },
      runner: { icon: Star, text: t('finder.labelRunner'), color: 'text-primary bg-primary/10' },
      value: { icon: ThumbsUp, text: t('finder.labelValue'), color: 'text-green-500 bg-green-500/10' },
    };
    return map[label] || map.value;
  };

  // --- Intro / Landing screen ---
  if (!started) {
    return (
      <div className="relative z-10 pb-24 md:pb-0 flex flex-col" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
        {/* Gradient area — content inside */}
        <div className="relative flex items-center justify-center pt-24 pb-10 md:pt-32 md:pb-14">
          <div className="max-w-[480px] w-full mx-auto px-5 text-center">
            {/* Icon */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#213E53]/15 flex items-center justify-center mx-auto mb-5">
              <Compass size={28} className="text-[#213E53] md:hidden" />
              <Compass size={34} className="text-[#213E53] hidden md:block" />
            </div>

            {/* Title & description */}
            <h1 className="font-heading font-bold text-xl md:text-3xl text-white mb-2">
              {t('finder.introTitle')}
            </h1>
            <p className="text-white/70 text-sm md:text-base max-w-sm mx-auto mb-4 leading-relaxed">
              {t('finder.introDesc')}
            </p>

            {/* Feature bullets */}
            <div className="inline-flex flex-col gap-3 mx-auto">
              {[
                { icon: Zap, text: t('finder.introBullet1') },
                { icon: Clock, text: t('finder.introBullet2') },
                { icon: Shield, text: t('finder.introBullet3') },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#213E53]/15 flex items-center justify-center shrink-0">
                    <item.icon size={16} className="text-[#213E53]" />
                  </div>
                  <span className="text-xs md:text-sm text-white font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* White area — button outside gradient */}
        <div className="relative z-20 bg-[var(--color-bg)]" style={{ minHeight: '50vh' }}>
          <div className="max-w-[480px] w-full mx-auto px-5 pt-28 md:pt-32 text-center">
            <button
              onClick={() => setStarted(true)}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold
                bg-[#1FA9FF] text-white hover:bg-[#1890e0] hover:shadow-lg shadow-md shadow-[#1FA9FF]/25
                active:scale-[0.98] transition-all btn-press"
            >
              {t('finder.introStart')}
              {lang === 'ar' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Thinking animation ---
  if (isThinking) {
    return (
      <div className={`relative z-10 pb-24 md:pb-0 flex items-center justify-center ${hasAccount ? 'min-h-[80vh]' : 'min-h-screen'}`}>
        <div className="text-center px-6" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full border-4 border-white/20" />
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-white"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={24} className="text-white" />
            </div>
          </div>
          <h2 className="font-heading font-bold text-lg md:text-2xl text-white mb-1">
            {t('finder.thinking')}
          </h2>
          <p className="text-white/70 text-xs md:text-sm">
            {t('finder.thinkingDesc')}
          </p>
        </div>
      </div>
    );
  }

  // --- Results view ---
  if (showResults) {
    return (
      <div className="relative z-10 pb-24 md:pb-0 min-h-screen">
        {/* All-No easter egg header */}
        {allNo ? (
          <section className="relative overflow-hidden bg-gradient-to-br from-amber-500/[0.06] via-bg to-primary/[0.03]">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-8 pb-6 md:pt-12 md:pb-10">
              <div className="flex flex-col items-center text-center" style={{ animation: 'fadeUp 0.5s ease-out both' }}>
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <TreePalm size={32} className="text-amber-500" />
                </div>
                <h1 className="font-heading font-bold text-xl md:text-3xl text-text-primary mb-2">
                  {t('finder.allNoTitle')}
                </h1>
                <p className="text-text-secondary text-sm md:text-base max-w-md leading-relaxed">
                  {t('finder.allNoDesc')}
                </p>
              </div>

            </div>
          </section>
        ) : (
          <section className="relative overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 pt-6 pb-4 md:pt-12 md:pb-10">
              <div className="w-full h-1.5 bg-white/20 rounded-full mb-5 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={18} className="text-white" />
                    <h1
                      className="font-heading font-bold text-xl md:text-3xl text-white"
                      style={{ animation: 'fadeUp 0.5s ease-out both' }}
                    >
                      {t('finder.resultsTitle')}
                    </h1>
                  </div>
                  <p className="text-white/70 text-xs md:text-base">
                    {t('finder.resultsSubtitle')}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="bg-[var(--color-bg)] rounded-t-3xl max-w-[1280px] mx-auto px-4 md:px-8 py-6">
          {/* Blur gate for non-logged-in users */}
          {!isLoggedIn && recommendations.length > 0 ? (
            <div className="relative" style={{ animation: 'fadeUp 0.5s ease-out both' }}>
              {/* Blurred results underneath */}
              <div className="blur-gate blur-[2px] pointer-events-none select-none opacity-75">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((rec, i) => {
                    const badge = reasonLabel(rec.label);
                    const BadgeIcon = badge.icon;
                    return (
                      <div key={rec.plan.id}>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2 ${badge.color}`}>
                          <BadgeIcon size={12} />
                          {badge.text}
                        </div>
                        <PlanCard plan={rec.plan} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overlay CTA */}
              <div className="absolute inset-0 flex items-start justify-center pt-6">
                <div className="bg-surface rounded-2xl border border-border shadow-xl px-6 py-5 max-w-sm w-full mx-4 text-center"
                     style={{ animation: 'scaleIn 0.3s ease-out 0.2s both' }}>
                  <h3 className="font-heading font-bold text-base text-text-primary mb-4">
                    {t('finder.blurTitle')}
                  </h3>
                  <button
                    onClick={() => {
                      localStorage.setItem('simba-finder-pending', JSON.stringify({ answers }));
                      navigate('/profile?tab=signup');
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-bold text-sm
                      hover:shadow-lg hover:shadow-primary/25 transition-all btn-press"
                  >
                    {t('finder.blurCta')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* "Just in case" label for all-No */}
              {allNo && recommendations.length > 0 && (
                <p className="text-center text-xs md:text-sm text-text-secondary mb-5 font-medium"
                   style={{ animation: 'fadeUp 0.5s ease-out 0.2s both' }}>
                  {t('finder.allNoJustInCase')}
                </p>
              )}

              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.map((rec, i) => {
                    const badge = reasonLabel(rec.label);
                    const BadgeIcon = badge.icon;
                    return (
                      <div key={rec.plan.id} style={{ animation: `fadeUp 0.5s ease-out ${i * 0.1 + (allNo ? 0.3 : 0)}s both` }}>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-2 ${badge.color}`}>
                          <BadgeIcon size={12} />
                          {badge.text}
                        </div>
                        <PlanCard plan={rec.plan} />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-surface-alt flex items-center justify-center mx-auto mb-3">
                    <Sparkles size={24} className="text-text-tertiary" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-text-primary">
                    {t('finder.noResults')}
                  </h3>
                  <p className="text-text-secondary mt-1.5 text-xs max-w-sm mx-auto">
                    {t('finder.noResultsDesc')}
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-5">
                    <button
                      onClick={restart}
                      className="px-5 py-2 rounded-xl bg-primary/10 text-primary font-bold text-xs
                        hover:bg-primary/20 transition-colors btn-press"
                    >
                      {t('finder.startOver')}
                    </button>
                    <Link
                      to="/plans"
                      className="px-5 py-2 rounded-xl bg-primary text-white font-bold text-xs
                        hover:bg-primary-dark transition-colors btn-press"
                    >
                      {t('nav.plans')}
                    </Link>
                  </div>
                </div>
              )}

              {recommendations.length > 0 && (
                <div className="text-center mt-8">
                  <Link
                    to="/plans"
                    className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-primary hover:text-primary-dark transition-colors"
                  >
                    {t('finder.notRight')}
                    <ChevronRight size={14} className="rtl:rotate-180" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Wizard view ---
  return (
    <div className={`relative z-10 pb-24 md:pb-0 flex flex-col min-h-[calc(100vh-72px)] transition-[backdrop-filter] duration-500 ${step === 3 ? 'backdrop-blur-lg' : ''}`}>
      {/* Progress header — compact */}
      <section>
        <div className="max-w-[800px] mx-auto px-4 md:px-8 pt-5 pb-4">
          <div className="w-full h-1 bg-white/20 rounded-full mb-3 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/50 font-medium">
            <span>{t('finder.step')} {step + 1} / {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </section>

      {/* Question header — top area */}
      <section className="pt-20 md:pt-28">
        <div
          key={`q-${step}`}
          className="max-w-[800px] w-full mx-auto px-4 md:px-8"
          style={{ animation: 'fadeUp 0.35s ease-out both' }}
        >
          <div className="text-center mb-0">
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-3">
              <currentStep.icon size={20} className="text-white md:hidden" />
              <currentStep.icon size={24} className="text-white hidden md:block" />
            </div>
            <h2 className="font-heading font-bold text-lg md:text-3xl text-white">
              {currentStep.title}
            </h2>
            <p className="text-white/70 mt-1 text-xs md:text-base max-w-md mx-auto">
              {currentStep.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Answers */}
      <section className="flex-1 flex items-center justify-center">
        <div
          key={`a-${step}`}
          className="max-w-[800px] w-full mx-auto px-4 md:px-8"
          style={{ animation: 'fadeUp 0.35s ease-out 0.1s both' }}
        >
          {/* Yes / Sometimes / No questions (steps 0-3) */}
          {!isBudgetStep && (
            <div className="grid grid-cols-3 gap-2.5 md:gap-4 max-w-[480px] mx-auto">
              {answerOptions.map(option => {
                const Icon = option.icon;
                const isSelected = answers[STEPS[step]] === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => handleQuickAnswer(STEPS[step], option.key)}
                    className={`relative text-center p-3.5 md:p-5 rounded-xl md:rounded-2xl border-2 transition-all duration-200 btn-press group
                      ${isSelected
                        ? 'border-white bg-white/20 shadow-md shadow-white/10'
                        : 'border-white/20 bg-white/10 backdrop-blur-sm hover:border-white/40 hover:shadow-sm'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-2 md:gap-3">
                      <div
                        className={`w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-white text-[#213E53]' : 'bg-white/15 text-white group-hover:bg-white/25'}`}
                      >
                        <Icon size={20} />
                      </div>
                      <p className={`font-heading font-bold text-sm ${isSelected ? 'text-white' : 'text-white/80'}`}>
                        {option.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Budget step (step 4) — slider + shortcuts */}
          {isBudgetStep && (
            <div className="max-w-[480px] mx-auto">
              {/* Budget display */}
              <div className="text-center mb-5">
                <span className="font-heading font-bold text-3xl md:text-4xl text-white">
                  {answers.budget}
                </span>
                <SarSymbol className="text-white/70 text-sm md:text-base ms-1.5" />
              </div>

              {/* Slider */}
              <div className="px-1 mb-5">
                <input
                  type="range"
                  min={BUDGET_MIN}
                  max={BUDGET_MAX}
                  step={5}
                  value={answers.budget}
                  onChange={(e) => setAnswer('budget', Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-black/20 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
                    [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
                  dir="ltr"
                  style={{
                    direction: 'ltr',
                    transform: lang === 'ar' ? 'scaleX(-1)' : undefined,
                    background: `linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.9) ${((answers.budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%, rgba(255,255,255,0.2) ${((answers.budget - BUDGET_MIN) / (BUDGET_MAX - BUDGET_MIN)) * 100}%, rgba(255,255,255,0.2) 100%)`,
                  }}
                />
                <div className="flex justify-between text-[10px] text-white/50 mt-1 px-0.5" dir="ltr">
                  <span>{BUDGET_MIN}</span>
                  <span>{BUDGET_MAX}+</span>
                </div>
              </div>

              {/* Shortcut pills */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {BUDGET_SHORTCUTS.map(val => (
                  <button
                    key={val}
                    onClick={() => setAnswer('budget', val)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all btn-press
                      ${answers.budget === val
                        ? 'bg-white text-[#213E53] shadow-sm shadow-black/10'
                        : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                      }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              {/* Confirm button */}
              <button
                onClick={submitBudget}
                className="w-full flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-sm font-bold
                  bg-white text-[#213E53] hover:bg-white/90 hover:shadow-lg
                  transition-all btn-press"
              >
                {t('finder.findMyPlans')}
                <Sparkles size={16} />
              </button>
            </div>
          )}

          {/* Back button (all steps) */}
          {step > 0 && (
            <div className="mt-6 max-w-[480px] mx-auto">
              <button
                onClick={back}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                  text-white/60 hover:text-white hover:bg-white/10 transition-all btn-press"
              >
                <BackIcon size={14} />
                {t('finder.back')}
              </button>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}
