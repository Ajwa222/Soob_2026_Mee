import { useState, useCallback } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';
import { usePersona } from '../context/PersonaContext';
import { inferSegmentFromQuiz, createEmptySignals, getSegmentLabel } from '../lib/persona';
import { trackEvent } from '../lib/analytics';
import type { PersonaQuizAnswers, PersonaSegment } from '@/types';

interface QuizStepConfig {
  key: keyof PersonaQuizAnswers;
  questionEn: string;
  questionAr: string;
  options: { labelEn: string; labelAr: string; value: string }[];
}

const QUIZ_STEPS: QuizStepConfig[] = [
  {
    key: 'usage',
    questionEn: 'What do you mainly use your phone for?',
    questionAr: 'وش أكثر شي تستخدم جوالك فيه؟',
    options: [
      { labelEn: 'Gaming', labelAr: 'ألعاب', value: 'gaming' },
      { labelEn: 'Streaming', labelAr: 'مشاهدة', value: 'streaming' },
      { labelEn: 'Social Media', labelAr: 'سوشل ميديا', value: 'social' },
      { labelEn: 'Work & Email', labelAr: 'شغل وإيميل', value: 'work' },
      { labelEn: 'Calls', labelAr: 'مكالمات', value: 'calls' },
      { labelEn: 'Basic browsing', labelAr: 'تصفح بسيط', value: 'basic' },
    ],
  },
  {
    key: 'budget',
    questionEn: "What's your monthly budget?",
    questionAr: 'كم ميزانيتك الشهرية؟',
    options: [
      { labelEn: 'Under 85 SAR', labelAr: 'أقل من 85 ريال', value: 'low' },
      { labelEn: '85 – 200 SAR', labelAr: '85 – 200 ريال', value: 'mid' },
      { labelEn: '200 – 400 SAR', labelAr: '200 – 400 ريال', value: 'high' },
      { labelEn: 'No limit', labelAr: 'بدون حد', value: 'unlimited' },
    ],
  },
  {
    key: 'priority',
    questionEn: 'What matters most to you?',
    questionAr: 'وش أهم شي لك؟',
    options: [
      { labelEn: 'Huge data', labelAr: 'بيانات ضخمة', value: 'data' },
      { labelEn: 'Call minutes', labelAr: 'دقائق مكالمات', value: 'calls' },
      { labelEn: 'International calls', labelAr: 'مكالمات دولية', value: 'international' },
      { labelEn: 'Cheapest price', labelAr: 'أرخص سعر', value: 'price' },
      { labelEn: 'Fast 5G speed', labelAr: 'سرعة 5G', value: 'speed' },
    ],
  },
  {
    key: 'household',
    questionEn: "Who's this plan for?",
    questionAr: 'الباقة لمين؟',
    options: [
      { labelEn: 'Just me', labelAr: 'لي بس', value: 'solo' },
      { labelEn: 'My family', labelAr: 'لعائلتي', value: 'family' },
      { labelEn: 'Shared with roommates', labelAr: 'مشتركة مع سكن', value: 'shared' },
    ],
  },
  {
    key: 'location',
    questionEn: 'Where are you based?',
    questionAr: 'وين ساكن؟',
    options: [
      { labelEn: 'Local Saudi', labelAr: 'سعودي محلي', value: 'local' },
      { labelEn: 'Expat in Saudi', labelAr: 'مقيم بالسعودية', value: 'expat' },
      { labelEn: 'Frequent traveler', labelAr: 'مسافر كثير', value: 'traveler' },
    ],
  },
];

interface PersonaQuizProps {
  onComplete: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

export default function PersonaQuiz({ onComplete, onSkip, showSkip = true }: PersonaQuizProps) {
  const { lang } = useLang();
  const { setPersona } = usePersona();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<PersonaQuizAnswers>>({});
  const [resultSegment, setResultSegment] = useState<string | null>(null);

  const currentStep = QUIZ_STEPS[step];

  const handleSelect = useCallback((value: string) => {
    const key = QUIZ_STEPS[step].key;
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    trackEvent('persona_quiz_answered', { step, question: key, answer: value });

    if (step < QUIZ_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Quiz complete
      const fullAnswers = updated as PersonaQuizAnswers;
      const { segment, confidence } = inferSegmentFromQuiz(fullAnswers);

      setResultSegment(segment);
      trackEvent('persona_quiz_completed', { segment, confidence });

      setPersona({
        segment,
        confidence,
        quizAnswers: fullAnswers,
        signals: createEmptySignals(),
        updatedAt: Date.now(),
        createdAt: Date.now(),
      });

      // Show result briefly, then complete
      setTimeout(onComplete, 1500);
    }
  }, [step, answers, setPersona, onComplete]);

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  // Result screen
  if (resultSegment) {
    const label = getSegmentLabel(resultSegment as PersonaSegment, lang);
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-6 animate-fade-up">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles size={32} className="text-primary" />
        </div>
        <h3 className="font-heading text-xl font-medium text-foreground text-center">
          {lang === 'ar' ? `أنت ${label}!` : `You're a ${label}!`}
        </h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {lang === 'ar'
            ? 'سمبا بيخلي التجربة تناسبك أكثر.'
            : "Simba will tailor your experience to match."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 animate-fade-up">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {step > 0 && (
          <button onClick={handleBack} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} className="rtl:rotate-180" />
          </button>
        )}
        <div className="flex-1 flex gap-1.5">
          {QUIZ_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full flex-1 transition-all duration-300 ${
                i <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{step + 1}/{QUIZ_STEPS.length}</span>
      </div>

      {/* Question */}
      <h3 className="font-heading text-lg md:text-xl font-medium text-foreground text-center">
        {lang === 'ar' ? currentStep.questionAr : currentStep.questionEn}
      </h3>

      {/* Options */}
      <div className="flex flex-wrap justify-center gap-2">
        {currentStep.options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleSelect(opt.value)}
            className="px-4 py-2.5 rounded-xl border-2 border-border bg-background text-sm font-medium text-foreground
              hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
          >
            {lang === 'ar' ? opt.labelAr : opt.labelEn}
          </button>
        ))}
      </div>

      {/* Skip */}
      {showSkip && onSkip && (
        <button
          onClick={() => {
            trackEvent('persona_quiz_skipped', { at_step: step });
            onSkip();
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          {lang === 'ar' ? 'تخطي' : 'Skip'}
        </button>
      )}
    </div>
  );
}
