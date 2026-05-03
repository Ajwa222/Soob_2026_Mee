/**
 * Onboarding overlay — full-screen welcome flow for first-time visitors.
 *
 * Flow:
 *  0. Language selection
 *  1. Intro: "All carriers in one place"
 *  2. Intro: "Matched in seconds"
 *  3. Intent — Absher check (Saudi ID / Iqama holder?)
 *  4. If no Absher → Status (moving long-term vs. visiting)
 *  5. If moving → Steps explainer (Iqama → Absher → long-term plan)
 *  5. If visiting → Short-stay visitor options
 *  Then → /advisor (Plan Finder)
 *
 * Answers are persisted to localStorage ('soob-onboarding-answers') so downstream
 * pages (advisor, explore) can adapt recommendations.
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check, CheckCircle2, XCircle, Home, Plane, IdCard, Clock3, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang, SUPPORTED_LANGS, LANG_LABELS, type Lang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { CARRIERS } from '../data/plans';
import { trackEvent } from '../lib/analytics';
import {
  trackStepReached,
  trackAnswer,
  trackBack,
  trackCarrierOpened,
  trackCompleted,
  trackAbandoned,
  type OnboardingStep,
} from '../lib/onboarding-analytics';

type AbsherAnswer = 'yes' | 'no';
type StatusAnswer = 'moving' | 'visiting';

interface OnboardingAnswers {
  absher?: AbsherAnswer;
  status?: StatusAnswer;
}

/** Waves only — no floating bubbles */
function WaveLinesOnly() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full z-[1]"
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 1440 800"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M-50,500 C150,380 350,580 600,450 C850,320 1050,520 1250,400 C1350,340 1400,380 1500,360" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d="M-50,520 C180,400 380,600 630,470 C880,340 1080,540 1280,420 C1380,360 1420,400 1500,380" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M-50,560 C200,440 400,640 650,510 C900,380 1100,560 1300,440 C1400,380 1440,420 1500,400" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path d="M-50,500 C150,380 350,580 600,450 C850,320 1050,520 1250,400 C1350,340 1400,380 1500,360" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="25" filter="url(#waveGlowOnb)" />
      <defs><filter id="waveGlowOnb"><feGaussianBlur stdDeviation="6" /></filter></defs>
    </svg>
  );
}

function SceneCarriers() {
  return (
    <div className="w-52 h-28 md:w-72 md:h-40 rounded-2xl bg-[var(--ob-chip)] backdrop-blur-sm border border-[var(--ob-chip-border)] p-3 md:p-4 grid grid-cols-4 grid-rows-2 gap-2 md:gap-3">
      {CARRIERS.map((c) => (
        <div key={c.name} className="rounded-xl bg-[var(--ob-chip)] flex items-center justify-center">
          <img src={c.logo} alt={c.name} className="w-6 h-6 md:w-8 md:h-8 object-contain" />
        </div>
      ))}
    </div>
  );
}

function SceneMatch() {
  return (
    <div className="flex items-end justify-center gap-3">
      {[0, 1, 2].map((i) => {
        const best = i === 1;
        return (
          <div
            key={i}
            className={`rounded-2xl bg-[var(--ob-chip)] backdrop-blur-sm border flex flex-col items-center p-3 gap-2 ${
              best
                ? 'w-[76px] h-40 md:w-24 md:h-48 border-white/40 shadow-md'
                : 'w-16 h-28 md:w-20 md:h-36 border-white/10 opacity-40'
            }`}
          >
            <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg shrink-0 ${best ? 'bg-[var(--ob-chip)]' : 'bg-[var(--ob-chip)]'}`} />
            <div className="w-full h-1.5 rounded-full bg-[var(--ob-chip)]" />
            <div className="w-2/3 h-1.5 rounded-full bg-[var(--ob-chip)]" />
            {best && (
              <div className="mt-auto w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                <Check size={14} className="text-primary" strokeWidth={3} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Reusable big option-card button — light surface with dark text, matches intro slides.
 *  `tone` controls the icon-tile color (and a faint left-edge accent) so each
 *  question's options can read in distinct brand colors instead of all being
 *  navy on lavender. */
type OptionTone = 'navy' | 'lavender' | 'lime' | 'coral';

const TONE_STYLES: Record<OptionTone, { bg: string; fg: string; edge: string }> = {
  navy:     { bg: 'var(--ob-icon)', fg: 'var(--ob-icon-text)', edge: 'rgba(22, 20, 58, 0.18)' },
  lavender: { bg: '#C59AFA', fg: '#16143A', edge: 'rgba(197, 154, 250, 0.55)' },
  lime:     { bg: '#CFEB74', fg: '#16143A', edge: 'rgba(207, 235, 116, 0.65)' },
  coral:    { bg: '#FE7151', fg: '#FFFFFF', edge: 'rgba(254, 113, 81, 0.55)' },
};

function OptionCard({
  icon,
  title,
  desc,
  onClick,
  tone = 'navy',
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  onClick: () => void;
  tone?: OptionTone;
}) {
  const t = TONE_STYLES[tone];
  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl bg-[var(--ob-card)] hover:bg-[var(--ob-card)] active:bg-[var(--ob-card)] backdrop-blur-sm border border-[var(--ob-card-border)] transition-all p-3.5 sm:p-4 md:p-5 flex items-start gap-3 sm:gap-4 ob-card-elev relative overflow-hidden"
      style={{ borderLeft: `4px solid ${t.edge}` }}
    >
      <div
        className="shrink-0 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center border"
        style={{ background: t.bg, color: t.fg, borderColor: 'var(--ob-card-border)' }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-heading font-semibold text-[15px] sm:text-[16px] md:text-[17px] text-[var(--ob-card-text)] leading-snug ${desc ? 'mb-0.5 sm:mb-1' : ''}`}>
          {title}
        </div>
        {desc && (
          <div className="text-[12.5px] sm:text-[13px] md:text-[14px] text-[var(--ob-card-text-soft)] leading-relaxed">
            {desc}
          </div>
        )}
      </div>
      <ArrowRight size={16} className="shrink-0 mt-1.5 sm:mt-2 text-[var(--ob-card-text-soft)] group-hover:text-[var(--ob-card-text)] group-hover:translate-x-0.5 transition-all" />
    </button>
  );
}

/** Copy — kept local since onboarding is one-off and translations dict is large */
export type CopyDict = {
  introCarriersTitle: string;
  introCarriersSub: string;
  introMatchTitle: string;
  introMatchSub: string;
  absherTitle: string;
  absherSub: string;
  absherYesTitle: string;
  absherYesDesc: string;
  absherNoTitle: string;
  absherNoDesc: string;
  statusTitle: string;
  statusSub: string;
  statusMovingTitle: string;
  statusMovingDesc: string;
  statusVisitingTitle: string;
  statusVisitingDesc: string;
  movingTitle: string;
  movingSub: string;
  movingStep1: string;
  movingStep1Desc: string;
  movingStep2: string;
  movingStep2Desc: string;
  movingStep3: string;
  movingStep3Desc: string;
  movingStep4: string;
  movingStep4Desc: string;
  movingHint: string;
  visitingTitle: string;
  visitingSub: string;
  visitingPrepaid: string;
  visitingData: string;
  visitingSocial: string;
  visitingMins: string;
  visitingSms: string;
  visitingValidity: string;
  visitingCountries: string;
  visitingVat: string;
  visitingGet: string;
  visitingUnlimited: string;
  visitingDays: (n: number) => string;
  visitingMinsUnit: (n: number) => string;
  visitingSmsUnit: (n: number) => string;
  visitingCta: string;
  ctaFindPlans: string;
  ctaContinue: string;
  ctaClose: string;
  ctaHome: string;
  ctaGetTemp: string;
  quickCheck: string;
  aboutStay: string;
  howItWorks: string;
  forVisitors: string;
  plansWord: string;
  zainCugNote: string;
};

export const COPY: Record<Lang, CopyDict> = {
  en: {
    introCarriersTitle: 'All carriers in one place.',
    introCarriersSub: 'Compare plans instantly.',
    introMatchTitle: 'Matched in seconds.',
    introMatchSub: 'Just tell us what you need.',
    absherTitle: 'Do you have an Absher account?',
    absherSub: 'Absher is Saudi Arabia\'s digital ID — required to register a SIM on your Iqama or National ID. If you\'re Saudi or have an Iqama, you either already have it or can create one.',
    absherYesTitle: 'Yes, I have Absher',
    absherYesDesc: 'Saudi citizen or expat with Iqama. You get full access — prepaid, postpaid, eSIMs, and family plans.',
    absherNoTitle: 'No, not yet',
    absherNoDesc: 'No problem — we\'ll guide you through what to do next.',
    statusTitle: 'Are you living here long-term, or just visiting?',
    statusSub: 'We\'ll show you the plans that fit your stay.',
    statusMovingTitle: 'Moving to live here',
    statusMovingDesc: 'Long-term stay — waiting on Iqama and Absher.',
    statusVisitingTitle: 'Just visiting',
    statusVisitingDesc: 'Tourist, business trip, family visit, or pilgrimage.',
    movingTitle: 'Before your long-term line',
    movingSub: 'Here\'s how it works from Iqama to buying online:',
    movingStep1: 'Get your Iqama',
    movingStep1Desc: 'Your Saudi residency permit. Issued after your employer finalizes your visa. Usually 2–8 weeks.',
    movingStep2: 'Visit a store to issue your first number',
    movingStep2Desc: 'Head to any carrier store (STC, Mobily, Zain, Lebara, Salam…) with your Iqama. They\'ll register your first SIM. This step has to be in-person.',
    movingStep3: 'Create your Absher account',
    movingStep3Desc: 'Use that new number to sign up on Absher — it needs SMS verification. Absher is Saudi Arabia\'s digital identity platform.',
    movingStep4: 'Buy SIMs & eSIMs online',
    movingStep4Desc: 'With Absher set up, you can buy more SIMs or eSIMs online without visiting a store — prepaid, postpaid, family bundles. We\'ll show the best matches.',
    movingHint: 'While you wait for your Iqama, visitor plans keep you connected today.',
    visitingTitle: 'Short-stay plans for visitors',
    visitingSub: 'Prepaid visitor plans from Salam Mobile. No Iqama needed — passport is enough.',
    visitingPrepaid: 'Prepaid',
    visitingData: 'Data',
    visitingSocial: 'Social media',
    visitingMins: 'Flex Minutes',
    visitingSms: 'Flex SMS',
    visitingValidity: 'Validity',
    visitingCountries: 'Eligible Countries',
    visitingVat: 'VAT inclusive',
    visitingGet: 'How to Buy',
    visitingDays: (n: number) => `${n} Days`,
    visitingMinsUnit: (n: number) => `${n} MINs`,
    visitingSmsUnit: (n: number) => `${n} SMS`,
    visitingUnlimited: 'Unlimited',
    visitingCta: 'See all plans on SOOB',
    ctaFindPlans: 'See plans that fit me',
    ctaContinue: 'Continue',
    ctaClose: 'Close',
    ctaHome: 'Go to home page',
    ctaGetTemp: 'Find closest store to buy temporary SIM',
    quickCheck: 'Quick check',
    aboutStay: 'About your stay',
    howItWorks: 'How it works',
    forVisitors: 'For visitors',
    plansWord: 'plans',
    zainCugNote: 'Unlimited calls in visitor network',
  },
  ar: {
    introCarriersTitle: 'كل الشركات في مكان واحد.',
    introCarriersSub: 'قارن الباقات على طول.',
    introMatchTitle: 'باقتك بثواني.',
    introMatchSub: 'بس قل لنا وش تبغى.',
    absherTitle: 'عندك حساب أبشر؟',
    absherSub: 'أبشر تطبيق حكومي يثبت هويتك إلكترونياً. ولأن الحكومة تشترط تسجيل كل شريحة باسم صاحبها، يستخدمون أبشر للتحقق منك وقت الشراء.',
    absherYesTitle: 'إيه، عندي أبشر',
    absherYesDesc: 'سعودي أو مقيم',
    absherNoTitle: 'لا ما عندي',
    absherNoDesc: '',
    statusTitle: 'مخطط تعيش بالسعودية؟',
    statusSub: '',
    statusMovingTitle: 'جاي أسكن هنا',
    statusMovingDesc: 'جاي أشتغل، أعيش مع أهلي، أو لأي سبب طويل الأمد.',
    statusVisitingTitle: 'بس زيارة',
    statusVisitingDesc: 'سياحة، شغل، عزيمة، أو حج وعمرة.',
    movingTitle: 'عشان تطلع خط دائم تحتاج تتبع هالخطوات',
    movingSub: 'الخطوات من الإقامة لين الشراء أونلاين:',
    movingStep1: 'استخرج الإقامة',
    movingStep1Desc: 'تصريح إقامتك بالسعودية. يطلع بعد ما يخلص صاحب العمل الفيزا. غالباً من أسبوعين لـ8 أسابيع.',
    movingStep2: 'روح لأقرب محل وخذ أول رقم',
    movingStep2Desc: 'أي فرع من شركات الاتصالات (STC، موبايلي، زين، ليبارا، سلام…) وخذ معك الإقامة. يسجلون لك أول شريحة. هالخطوة لازم تكون في المحل.',
    movingStep3: 'سوّي حساب أبشر',
    movingStep3Desc: 'استخدم الرقم الجديد عشان تسجل في أبشر — يحتاج تحقق برسالة SMS. أبشر هي منصة الهوية الرقمية بالسعودية.',
    movingStep4: 'اشتري شريحة أو شريحة الكترونية أونلاين',
    movingStep4Desc: 'بعد ما يجهز أبشر، تقدر تشتري شريحة أو شريحة الكترونية أونلاين بدون ما تروح المحل — مسبقة، مفوترة، أو باقات عائلة. بنعرض لك أحسن الخيارات.',
    movingHint: 'خذلك باقة مؤقتة لين ما تطلع الإقامة وتسوي لك حساب أبشر.',
    visitingTitle: 'باقات للزوار',
    visitingSub: 'باقات مدفوعة مقدماً من سلام، موبايلي، وزين. ما تحتاج إقامة — الجواز يكفي.',
    visitingPrepaid: 'مدفوع مقدماً',
    visitingData: 'انترنت',
    visitingSocial: 'سوشيال',
    visitingMins: 'دقائق',
    visitingSms: 'رسائل',
    visitingValidity: 'المدة',
    visitingCountries: 'الدول',
    visitingVat: 'شامل الضريبة',
    visitingGet: 'كيف أشتريها',
    visitingDays: (n: number) => `${n} يوم`,
    visitingMinsUnit: (n: number) => `${n} دقيقة`,
    visitingSmsUnit: (n: number) => `${n} رسالة`,
    visitingUnlimited: 'مفتوح',
    visitingCta: 'شف كل الباقات بسمبا',
    ctaFindPlans: 'وريني الباقات اللي تناسبني',
    ctaContinue: 'كمّل',
    ctaClose: 'أغلق',
    ctaHome: 'الصفحة الرئيسية',
    ctaGetTemp: 'ابحث عن أقرب فرع لشراء شريحة مؤقتة',
    quickCheck: '',
    aboutStay: '',
    howItWorks: 'كيف تمشي الأمور',
    forVisitors: 'للزوار',
    plansWord: 'باقات',
    zainCugNote: 'مكالمات مفتوحة داخل شبكة الزوار',
  },
  ur: {
    introCarriersTitle: 'تمام کیریئرز ایک جگہ۔',
    introCarriersSub: 'فوری پلانز کا موازنہ کریں۔',
    introMatchTitle: 'چند سیکنڈز میں پلان۔',
    introMatchSub: 'ہمیں بتائیں آپ کو کیا چاہیے۔',
    absherTitle: 'کیا آپ کے پاس ابشر اکاؤنٹ ہے؟',
    absherSub: 'ابشر سعودی عرب کی ڈیجیٹل شناخت ہے — اقامہ پر سم رجسٹر کرانے کے لیے ضروری۔ اگر آپ سعودی ہیں یا اقامہ رکھتے ہیں تو آپ کے پاس یہ ہوگا یا آپ بنا سکتے ہیں۔',
    absherYesTitle: 'جی ہاں، میرے پاس ابشر ہے',
    absherYesDesc: 'سعودی شہری یا اقامہ ہولڈر۔ آپ کو مکمل رسائی ہے — پری پیڈ، پوسٹ پیڈ، eSIM، اور فیملی پلانز۔',
    absherNoTitle: 'نہیں، ابھی نہیں',
    absherNoDesc: 'کوئی بات نہیں — ہم آپ کو اگلے قدم کی رہنمائی کریں گے۔',
    statusTitle: 'کیا آپ یہاں لمبے عرصے کے لیے رہ رہے ہیں یا صرف آئے ہیں؟',
    statusSub: 'ہم آپ کے قیام کے مطابق پلانز دکھائیں گے۔',
    statusMovingTitle: 'یہاں رہنے آیا ہوں',
    statusMovingDesc: 'طویل قیام — اقامہ اور ابشر کا انتظار۔',
    statusVisitingTitle: 'صرف دورہ',
    statusVisitingDesc: 'سیاح، کاروباری سفر، خاندانی ملاقات، یا حج و عمرہ۔',
    movingTitle: 'اپنی طویل مدتی لائن سے پہلے',
    movingSub: 'اقامہ سے لے کر آن لائن خریداری تک مکمل طریقہ:',
    movingStep1: 'اپنا اقامہ حاصل کریں',
    movingStep1Desc: 'آپ کا سعودی رہائشی اجازت نامہ۔ آجر کی جانب سے ویزا مکمل کرنے کے بعد جاری ہوتا ہے۔ عموماً 2–8 ہفتے۔',
    movingStep2: 'قریبی اسٹور جائیں اور پہلا نمبر لیں',
    movingStep2Desc: 'کسی بھی ٹیلی کام اسٹور (STC، موبائلی، زین، لیبارا، سلام…) جائیں، اقامہ ساتھ لے جائیں۔ وہ آپ کی پہلی سم رجسٹر کریں گے۔ یہ قدم شخصی طور پر ضروری ہے۔',
    movingStep3: 'اپنا ابشر اکاؤنٹ بنائیں',
    movingStep3Desc: 'اس نئے نمبر سے ابشر پر سائن اپ کریں — SMS تصدیق درکار۔ ابشر سعودی عرب کا ڈیجیٹل شناخت پلیٹ فارم ہے۔',
    movingStep4: 'سم اور eSIM آن لائن خریدیں',
    movingStep4Desc: 'ابشر بننے کے بعد آپ اسٹور جائے بغیر آن لائن سم یا eSIM خرید سکتے ہیں — پری پیڈ، پوسٹ پیڈ، یا فیملی بنڈل۔ ہم بہترین میچز دکھائیں گے۔',
    movingHint: 'اقامہ کے انتظار میں، وزیٹر پلانز آپ کو آج ہی جُڑا رکھتے ہیں۔',
    visitingTitle: 'زائرین کے لیے مختصر قیام کے پلانز',
    visitingSub: 'پری پیڈ زائرین پلانز سلام موبائل، موبائلی اور زین سے۔ اقامہ درکار نہیں — پاسپورٹ کافی ہے۔',
    visitingPrepaid: 'پری پیڈ',
    visitingData: 'ڈیٹا',
    visitingSocial: 'سوشل میڈیا',
    visitingMins: 'فلیکس منٹس',
    visitingSms: 'فلیکس SMS',
    visitingValidity: 'مدت',
    visitingCountries: 'اہل ممالک',
    visitingVat: 'VAT شامل',
    visitingGet: 'کیسے خریدیں',
    visitingUnlimited: 'لامحدود',
    visitingDays: (n: number) => `${n} دن`,
    visitingMinsUnit: (n: number) => `${n} منٹ`,
    visitingSmsUnit: (n: number) => `${n} SMS`,
    visitingCta: 'سمبا پر تمام پلانز دیکھیں',
    ctaFindPlans: 'مجھے مناسب پلانز دکھائیں',
    ctaContinue: 'جاری رکھیں',
    ctaClose: 'بند کریں',
    ctaHome: 'ہوم پیج پر جائیں',
    ctaGetTemp: 'عارضی سم خریدنے کے لیے قریبی اسٹور تلاش کریں',
    quickCheck: 'فوری چیک',
    aboutStay: 'آپ کے قیام کے بارے میں',
    howItWorks: 'یہ کیسے کام کرتا ہے',
    forVisitors: 'زائرین کے لیے',
    plansWord: 'پلانز',
    zainCugNote: 'زائرین نیٹ ورک میں لامحدود کالز',
  },
  hi: {
    introCarriersTitle: 'सभी कैरियर एक जगह।',
    introCarriersSub: 'तुरंत प्लान्स की तुलना करें।',
    introMatchTitle: 'सेकंडों में मैच।',
    introMatchSub: 'बस हमें बताएं आपको क्या चाहिए।',
    absherTitle: 'क्या आपके पास Absher खाता है?',
    absherSub: 'Absher सऊदी अरब की डिजिटल ID है — Iqama पर SIM रजिस्टर कराने के लिए ज़रूरी। अगर आप सऊदी हैं या Iqama रखते हैं तो यह पहले से होगा या आप बना सकते हैं।',
    absherYesTitle: 'हाँ, मेरे पास Absher है',
    absherYesDesc: 'सऊदी नागरिक या Iqama धारक। आपको पूरी पहुँच है — प्रीपेड, पोस्टपेड, eSIM, और फ़ैमिली प्लान्स।',
    absherNoTitle: 'नहीं, अभी नहीं',
    absherNoDesc: 'कोई बात नहीं — हम आपको अगले चरण के लिए मार्गदर्शन देंगे।',
    statusTitle: 'क्या आप यहाँ लंबे समय के लिए रह रहे हैं या केवल घूमने आए हैं?',
    statusSub: 'हम आपकी अवधि के अनुसार प्लान्स दिखाएँगे।',
    statusMovingTitle: 'यहाँ रहने आया हूँ',
    statusMovingDesc: 'लंबा प्रवास — Iqama और Absher का इंतज़ार।',
    statusVisitingTitle: 'केवल यात्रा',
    statusVisitingDesc: 'पर्यटक, व्यापार यात्रा, परिवार मिलन, या हज व उमरा।',
    movingTitle: 'आपकी दीर्घकालिक लाइन से पहले',
    movingSub: 'Iqama से लेकर ऑनलाइन खरीद तक पूरा तरीका:',
    movingStep1: 'अपना Iqama लें',
    movingStep1Desc: 'आपका सऊदी निवास परमिट। नियोक्ता द्वारा वीज़ा पूरा होने के बाद जारी। आमतौर पर 2–8 सप्ताह।',
    movingStep2: 'नज़दीकी स्टोर जाएँ और पहला नंबर लें',
    movingStep2Desc: 'किसी भी carrier स्टोर (STC, Mobily, Zain, Lebara, Salam…) पर Iqama के साथ जाएँ। वे आपकी पहली SIM रजिस्टर करेंगे। यह क़दम व्यक्तिगत रूप से करना ज़रूरी है।',
    movingStep3: 'अपना Absher खाता बनाएँ',
    movingStep3Desc: 'उस नए नंबर से Absher पर साइन अप करें — SMS सत्यापन चाहिए। Absher सऊदी अरब का डिजिटल पहचान प्लेटफ़ॉर्म है।',
    movingStep4: 'SIM और eSIM ऑनलाइन खरीदें',
    movingStep4Desc: 'Absher सेट होने पर, बिना स्टोर गए ऑनलाइन SIM या eSIM खरीद सकते हैं — प्रीपेड, पोस्टपेड, या फ़ैमिली बंडल। हम सर्वोत्तम मैच दिखाएँगे।',
    movingHint: 'Iqama के इंतज़ार में, विज़िटर प्लान्स आपको आज ही जुड़े रखते हैं।',
    visitingTitle: 'आगंतुकों के लिए अल्पकालिक प्लान्स',
    visitingSub: 'Salam Mobile, Mobily और Zain के प्रीपेड विज़िटर प्लान्स। Iqama की ज़रूरत नहीं — पासपोर्ट पर्याप्त है।',
    visitingPrepaid: 'प्रीपेड',
    visitingData: 'डेटा',
    visitingSocial: 'सोशल मीडिया',
    visitingMins: 'Flex मिनट',
    visitingSms: 'Flex SMS',
    visitingValidity: 'वैधता',
    visitingCountries: 'पात्र देश',
    visitingVat: 'VAT शामिल',
    visitingGet: 'कैसे खरीदें',
    visitingUnlimited: 'असीमित',
    visitingDays: (n: number) => `${n} दिन`,
    visitingMinsUnit: (n: number) => `${n} मिनट`,
    visitingSmsUnit: (n: number) => `${n} SMS`,
    visitingCta: 'SOOB पर सभी प्लान्स देखें',
    ctaFindPlans: 'मुझे उपयुक्त प्लान्स दिखाएँ',
    ctaContinue: 'जारी रखें',
    ctaClose: 'बंद करें',
    ctaHome: 'होम पेज पर जाएँ',
    ctaGetTemp: 'अस्थायी सिम के लिए नज़दीकी स्टोर खोजें',
    quickCheck: 'त्वरित जाँच',
    aboutStay: 'आपके प्रवास के बारे में',
    howItWorks: 'यह कैसे काम करता है',
    forVisitors: 'आगंतुकों के लिए',
    plansWord: 'प्लान्स',
    zainCugNote: 'विज़िटर नेटवर्क में असीमित कॉल',
  },
  bn: {
    introCarriersTitle: 'সব ক্যারিয়ার এক জায়গায়।',
    introCarriersSub: 'সঙ্গে সঙ্গে প্ল্যান তুলনা করুন।',
    introMatchTitle: 'সেকেন্ডেই মিল পাবেন।',
    introMatchSub: 'শুধু জানান আপনার কী দরকার।',
    absherTitle: 'আপনার কি Absher অ্যাকাউন্ট আছে?',
    absherSub: 'Absher হলো সৌদি আরবের ডিজিটাল আইডি — Iqama-তে সিম রেজিস্টার করতে প্রয়োজন। আপনি সৌদি নাগরিক বা Iqama ধারক হলে এটি ইতিমধ্যে আছে বা বানাতে পারবেন।',
    absherYesTitle: 'হ্যাঁ, আমার Absher আছে',
    absherYesDesc: 'সৌদি নাগরিক বা Iqama ধারক। আপনি সম্পূর্ণ অ্যাক্সেস পাবেন — প্রিপেইড, পোস্টপেইড, eSIM, ও ফ্যামিলি প্ল্যান।',
    absherNoTitle: 'না, এখনো নেই',
    absherNoDesc: 'সমস্যা নেই — আমরা পরবর্তী পদক্ষেপের জন্য গাইড করব।',
    statusTitle: 'আপনি কি এখানে দীর্ঘমেয়াদে থাকছেন, নাকি শুধু ভিজিটে?',
    statusSub: 'আপনার থাকার সময়ের জন্য উপযুক্ত প্ল্যান দেখাব।',
    statusMovingTitle: 'এখানে থাকতে এসেছি',
    statusMovingDesc: 'দীর্ঘ প্রবাস — Iqama ও Absher-এর অপেক্ষায়।',
    statusVisitingTitle: 'শুধু ভিজিট',
    statusVisitingDesc: 'পর্যটক, ব্যবসায়িক সফর, পারিবারিক সাক্ষাৎ, বা হজ/উমরা।',
    movingTitle: 'আপনার দীর্ঘমেয়াদী লাইনের আগে',
    movingSub: 'Iqama থেকে অনলাইন কেনাকাটা পর্যন্ত পুরো ধাপ:',
    movingStep1: 'আপনার Iqama নিন',
    movingStep1Desc: 'আপনার সৌদি রেসিডেন্স পারমিট। নিয়োগকর্তা ভিসা সম্পন্ন করলে ইস্যু হয়। সাধারণত 2–8 সপ্তাহ।',
    movingStep2: 'কাছের স্টোরে গিয়ে প্রথম নম্বর নিন',
    movingStep2Desc: 'যেকোনো carrier স্টোরে (STC, Mobily, Zain, Lebara, Salam…) Iqama সহ যান। তারা আপনার প্রথম সিম রেজিস্টার করবে। এ ধাপটি সশরীরে করা আবশ্যক।',
    movingStep3: 'আপনার Absher অ্যাকাউন্ট তৈরি করুন',
    movingStep3Desc: 'সেই নতুন নম্বর দিয়ে Absher-এ সাইন আপ করুন — SMS যাচাইকরণ প্রয়োজন। Absher হলো সৌদি আরবের ডিজিটাল পরিচয় প্ল্যাটফর্ম।',
    movingStep4: 'সিম ও eSIM অনলাইনে কিনুন',
    movingStep4Desc: 'Absher তৈরি হলে, স্টোরে না গিয়ে অনলাইনেই সিম বা eSIM কিনতে পারবেন — প্রিপেইড, পোস্টপেইড, বা ফ্যামিলি বান্ডেল। আমরা সেরা মিল দেখাব।',
    movingHint: 'Iqama-র অপেক্ষায় থাকাকালীন, ভিজিটর প্ল্যান আপনাকে আজই সংযুক্ত রাখবে।',
    visitingTitle: 'ভিজিটরদের জন্য স্বল্পমেয়াদী প্ল্যান',
    visitingSub: 'Salam Mobile, Mobily এবং Zain থেকে প্রিপেইড ভিজিটর প্ল্যান। Iqama লাগবে না — পাসপোর্টই যথেষ্ট।',
    visitingPrepaid: 'প্রিপেইড',
    visitingData: 'ডেটা',
    visitingSocial: 'সোশ্যাল মিডিয়া',
    visitingMins: 'Flex মিনিট',
    visitingSms: 'Flex SMS',
    visitingValidity: 'মেয়াদ',
    visitingCountries: 'যোগ্য দেশ',
    visitingVat: 'VAT অন্তর্ভুক্ত',
    visitingGet: 'কীভাবে কিনবেন',
    visitingUnlimited: 'অসীম',
    visitingDays: (n: number) => `${n} দিন`,
    visitingMinsUnit: (n: number) => `${n} মিনিট`,
    visitingSmsUnit: (n: number) => `${n} SMS`,
    visitingCta: 'SOOB-তে সব প্ল্যান দেখুন',
    ctaFindPlans: 'আমার জন্য উপযুক্ত প্ল্যান দেখান',
    ctaContinue: 'চালিয়ে যান',
    ctaClose: 'বন্ধ করুন',
    ctaHome: 'হোম পেজে যান',
    ctaGetTemp: 'অস্থায়ী সিম কিনতে নিকটতম দোকান খুঁজুন',
    quickCheck: 'দ্রুত চেক',
    aboutStay: 'আপনার অবস্থান সম্পর্কে',
    howItWorks: 'এটি কীভাবে কাজ করে',
    forVisitors: 'ভিজিটরদের জন্য',
    plansWord: 'প্ল্যান',
    zainCugNote: 'ভিজিটর নেটওয়ার্কে অসীম কল',
  },
  tl: {
    introCarriersTitle: 'Lahat ng carrier sa isang lugar.',
    introCarriersSub: 'Mabilis na ihambing ang mga plano.',
    introMatchTitle: 'Tugma sa ilang segundo.',
    introMatchSub: 'Sabihin mo lang kung ano ang kailangan mo.',
    absherTitle: 'May Absher account ka ba?',
    absherSub: 'Ang Absher ay digital ID ng Saudi Arabia — kailangan para mairehistro ang SIM sa Iqama mo. Kung Saudi ka o may Iqama, meron ka na nito o pwede kang gumawa.',
    absherYesTitle: 'Oo, meron ako ng Absher',
    absherYesDesc: 'Saudi citizen o Iqama holder. Buong access ka — prepaid, postpaid, eSIM, at family plans.',
    absherNoTitle: 'Hindi pa',
    absherNoDesc: 'Walang problema — gagabayan ka namin sa susunod na hakbang.',
    statusTitle: 'Matagal ka bang dito o bumibisita lang?',
    statusSub: 'Ipapakita namin ang mga planong akma sa iyong pananatili.',
    statusMovingTitle: 'Lilipat para tumira',
    statusMovingDesc: 'Matagalang pananatili — naghihintay ng Iqama at Absher.',
    statusVisitingTitle: 'Bumibisita lang',
    statusVisitingDesc: 'Turista, business trip, pamilya, o Hajj/Umrah.',
    movingTitle: 'Bago ang iyong long-term line',
    movingSub: 'Mula Iqama hanggang online na pagbili — ito ang buong proseso:',
    movingStep1: 'Kunin ang iyong Iqama',
    movingStep1Desc: 'Ang residency permit mo sa Saudi. Inisyu matapos tapusin ng employer mo ang visa. Kadalasan 2–8 linggo.',
    movingStep2: 'Pumunta sa pinakamalapit na store para sa unang numero',
    movingStep2Desc: 'Pumunta sa alinmang carrier store (STC, Mobily, Zain, Lebara, Salam…) dala ang Iqama. Itatatala nila ang iyong unang SIM. Dapat ito ay in-person.',
    movingStep3: 'Gumawa ng Absher account',
    movingStep3Desc: 'Gamitin ang bagong numero para mag-sign up sa Absher — may SMS verification. Ang Absher ay digital identity platform ng Saudi Arabia.',
    movingStep4: 'Bumili ng SIM at eSIM online',
    movingStep4Desc: 'Kapag handa na ang Absher, puwede ka nang bumili online ng SIM o eSIM nang hindi na kailangan pumunta sa store — prepaid, postpaid, o family bundle. Ipapakita namin ang pinakamatch.',
    movingHint: 'Habang hinihintay ang Iqama, ang visitor plans ay magpapanatiling konektado ka ngayon.',
    visitingTitle: 'Mga short-stay plan para sa mga bisita',
    visitingSub: 'Mga prepaid visitor plan mula sa Salam Mobile, Mobily, at Zain. Hindi kailangan ang Iqama — sapat na ang pasaporte.',
    visitingPrepaid: 'Prepaid',
    visitingData: 'Data',
    visitingSocial: 'Social media',
    visitingMins: 'Flex Minutes',
    visitingSms: 'Flex SMS',
    visitingValidity: 'Bisa',
    visitingCountries: 'Saklaw na Bansa',
    visitingVat: 'Kasama ang VAT',
    visitingGet: 'Paano Bilhin',
    visitingUnlimited: 'Unlimited',
    visitingDays: (n: number) => `${n} araw`,
    visitingMinsUnit: (n: number) => `${n} MIN`,
    visitingSmsUnit: (n: number) => `${n} SMS`,
    visitingCta: 'Tingnan lahat sa SOOB',
    ctaFindPlans: 'Ipakita ang mga planong bagay sa akin',
    ctaContinue: 'Magpatuloy',
    ctaClose: 'Isara',
    ctaHome: 'Bumalik sa home page',
    ctaGetTemp: 'Hanapin ang pinakamalapit na store para sa SIM',
    quickCheck: 'Mabilis na pagsusuri',
    aboutStay: 'Tungkol sa iyong pananatili',
    howItWorks: 'Paano ito gumagana',
    forVisitors: 'Para sa mga bisita',
    plansWord: 'mga plano',
    zainCugNote: 'Walang hanggang tawag sa visitor network',
  },
};

export function getCopy(lang: Lang): CopyDict {
  return COPY[lang] ?? COPY.en;
}

type Page =
  | 'lang'
  | 'intro1'
  | 'intro2'
  | 'absher'
  | 'status'
  | 'moving'
  | 'visiting';

const pageToStep: Record<Page, OnboardingStep> = {
  lang: 'language',
  intro1: 'intro_carriers',
  intro2: 'intro_match',
  absher: 'absher',
  status: 'status',
  moving: 'moving',
  visiting: 'visiting_plans',
};

export default function Onboarding() {
  const { lang, setLang } = useLang();
  const { markOnboarded, isLoggedIn, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => !localStorage.getItem('soob-onboarded'));
  const [page, setPage] = useState<Page>('lang');
  const [answers, setAnswers] = useState<OnboardingAnswers>({});
  const startedAtRef = useRef<number>(Date.now());
  const [showStores, setShowStores] = useState(false);
  type StoresStep = 'account' | 'otp' | 'map';
  const [storesStep, setStoresStep] = useState<StoresStep>('map');
  const [storeFirstName, setStoreFirstName] = useState('');
  const [storeLastName, setStoreLastName] = useState('');
  const [storeKind, setStoreKind] = useState<'phone' | 'email'>('phone');
  const [storeContact, setStoreContact] = useState('');
  const [storeOtp, setStoreOtp] = useState<string[]>(['', '', '', '']);
  const storeOtpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);

  // Mock map of nearby physical stores where short-term visitors can buy a
  // visitor SIM. Coordinates are 0–100 percent of a stylized map background.
  const NEARBY_STORES = [
    { id: 's1', provider: 'STC',    name: 'STC Olaya Branch',           x: 32, y: 28, distance: '0.8 km', open: '24/7' },
    { id: 's2', provider: 'Mobily', name: 'Mobily Sahafa',              x: 58, y: 22, distance: '1.4 km', open: '9 AM – 11 PM' },
    { id: 's3', provider: 'Zain',   name: 'Zain Hittin',                x: 74, y: 38, distance: '2.1 km', open: '10 AM – 10 PM' },
    { id: 's4', provider: 'STC',    name: 'STC Diplomatic Quarter',     x: 22, y: 62, distance: '2.5 km', open: '8 AM – 12 AM' },
    { id: 's5', provider: 'Mobily', name: 'Mobily Granada Mall',        x: 68, y: 70, distance: '3.0 km', open: 'Mall hours' },
    { id: 's6', provider: 'Salam',  name: 'Salam Yasmin Plaza',         x: 44, y: 54, distance: '3.2 km', open: '9 AM – 11 PM' },
  ];
  const [pickedStore, setPickedStore] = useState<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      startedAtRef.current = Date.now();
      trackEvent('onboarding_started', { onboarding_kind: 'classic' });
      trackStepReached('language', 'classic', startedAtRef.current);
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [visible]);

  // Track abandonment — fires once if the user closes the tab or unmounts without completing.
  useEffect(() => {
    if (!visible) return;
    const onUnload = () => {
      if (!completedRef.current) {
        trackAbandoned(pageToStep[page], 'classic', startedAtRef.current);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [visible, page]);

  if (!visible) return null;

  const t = getCopy(lang);
  const isRtl = lang === 'ar' || lang === 'ur';

  const gotoPage = (next: Page) => {
    setPage(next);
    trackStepReached(pageToStep[next], 'classic', startedAtRef.current);
  };

  const chooseLang = (chosen: Lang) => {
    if (chosen !== lang) setLang(chosen);
    trackAnswer('language', 'language', chosen, 'classic', startedAtRef.current);
    gotoPage('intro1');
  };

  const complete = () => {
    completedRef.current = true;
    localStorage.setItem('soob-onboarded', 'true');
    localStorage.setItem('soob-onboarding-answers', JSON.stringify(answers));
    markOnboarded();
    const variant = localStorage.getItem('soob-onboarding-variant');
    const autoGuide = variant === 'B' || variant === 'D';
    trackCompleted('/advisor', { ...answers }, 'classic', startedAtRef.current);
    setVisible(false);
    navigate('/advisor', { state: { fromOnboarding: true, autoGuide } });
  };

  const pickAbsher = (value: AbsherAnswer) => {
    setAnswers(a => ({ ...a, absher: value }));
    trackAnswer('absher', 'has_absher', value, 'classic', startedAtRef.current);
    if (value === 'yes') {
      complete();
    } else {
      gotoPage('status');
    }
  };

  const pickStatus = (value: StatusAnswer) => {
    setAnswers(a => ({ ...a, status: value }));
    trackAnswer('status', 'residence_intent', value, 'classic', startedAtRef.current);
    gotoPage(value === 'moving' ? 'moving' : 'visiting');
  };

  const goBack = () => {
    const prev: Page | null =
      page === 'intro1' ? 'lang'
      : page === 'intro2' ? 'intro1'
      : page === 'absher' ? 'intro2'
      : page === 'status' ? 'absher'
      : page === 'moving' ? 'status'
      : page === 'visiting' ? (answers.status === 'moving' ? 'moving' : 'status')
      : null;
    if (!prev) return;
    trackBack(pageToStep[page], pageToStep[prev], 'classic', startedAtRef.current);
    setPage(prev);
  };

  // ── Page 0: Language selection ──
  if (page === 'lang') {
    return (
      <div
        className="fixed inset-0 z-[300] flex flex-col items-center justify-center hero-gradient grain overflow-y-auto"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
          paddingLeft: 'max(env(safe-area-inset-left), 1.25rem)',
          paddingRight: 'max(env(safe-area-inset-right), 1.25rem)',
        }}
      >
        {/* WaveLinesOnly intentionally skipped on the language page — the
            gaussian-blur filter is expensive to paint on first mount and was
            delaying the language buttons from becoming interactive. */}
        <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 mb-6 sm:mb-8 md:mb-10 rounded-[22%] overflow-hidden shadow-lg shrink-0">
          <img
            src="/icon-192.png"
            alt="SOOB"
            className="w-full h-full object-cover scale-[1.05]"
            decoding="async"
            width={112}
            height={112}
          />
        </div>
        <div className="relative z-10 flex flex-col gap-3 w-full max-w-xs md:max-w-sm">
          <div className="flex gap-3">
            <Button
              onClick={() => chooseLang('en')}
              variant="secondary"
              className="flex-1 h-12 sm:h-14 text-base font-medium bg-[var(--ob-cta)] text-[var(--ob-cta-text)] hover:bg-[var(--ob-cta-hover)] ob-cta-elev"
            >
              English
            </Button>
            <Button
              onClick={() => chooseLang('ar')}
              variant="secondary"
              className="flex-1 h-12 sm:h-14 text-base font-medium bg-[var(--ob-cta)] text-[var(--ob-cta-text)] hover:bg-[var(--ob-cta-hover)] ob-cta-elev"
            >
              العربية
            </Button>
          </div>
          {/* Classic variant shows only EN + AR to keep the language picker snappy.
              The chat variant still offers all 6 via its reply chips. */}
        </div>
      </div>
    );
  }

  // ── Pages 1-2: Intro slides ──
  if (page === 'intro1' || page === 'intro2') {
    const slides = [
      { scene: <SceneCarriers />, title: t.introCarriersTitle, sub: t.introCarriersSub },
      { scene: <SceneMatch />, title: t.introMatchTitle, sub: t.introMatchSub },
    ];
    const idx = page === 'intro1' ? 0 : 1;
    const current = slides[idx];
    const next = () => setPage(page === 'intro1' ? 'intro2' : 'absher');

    return (
      <div
        className="fixed inset-0 z-[300] flex flex-col hero-gradient grain overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <WaveLinesOnly />
        <div className="relative z-10 px-5 pt-4 sm:px-6 sm:pt-6 flex items-center shrink-0">
          <button
            onClick={goBack}
            className="text-[var(--ob-text-soft)] hover:text-[var(--ob-text)] p-2 -ml-2 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 sm:px-6 overflow-y-auto" key={page}>
          <div className="mb-6 sm:mb-10 shrink-0">{current.scene}</div>
          <h2 className="font-heading font-medium text-[20px] sm:text-[22px] md:text-[30px] text-black text-center leading-tight max-w-xs md:max-w-md">
            {current.title}
          </h2>
          <p className="mt-2 sm:mt-2.5 text-[14px] sm:text-[15px] md:text-[17px] text-black/60 text-center max-w-xs md:max-w-md leading-relaxed">
            {current.sub}
          </p>
        </div>

        <div className={`relative z-10 px-5 pb-5 sm:px-6 sm:pb-8 flex items-center justify-between shrink-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
          <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
            {[0, 1].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === idx ? 'w-6' : i < idx ? 'w-1.5 bg-[var(--ob-chip-border)]' : 'w-1.5 bg-[var(--ob-chip)]'
                }`}
                style={i === idx ? { background: '#FE7151' } : undefined}
              />
            ))}
          </div>

          <Button
            onClick={next}
            variant="secondary"
            className="ob-cta-elev font-medium w-12 h-12 p-0 hover:opacity-90"
            style={{ background: '#FE7151', color: '#FFFFFF' }}
          >
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    );
  }

  // ── Shared header for question pages (dark theme) ──
  const QuestionShell = ({
    hint,
    title,
    subtitle,
    children,
    footer,
  }: {
    hint?: string;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
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
      <WaveLinesOnly />

      {/* Header with back button */}
      <div className="relative z-10 px-4 pt-3 sm:px-5 sm:pt-5 flex items-center justify-between shrink-0">
        <button
          onClick={goBack}
          className="text-[var(--ob-text-soft)] hover:text-[var(--ob-text)] hover:bg-[var(--ob-chip-hover)] p-2 -ml-2 rounded-lg transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
        </button>
        <div className="text-[11px] font-mono tracking-widest text-[var(--ob-text-faint)] uppercase">SOOB</div>
      </div>

      {/* Scrollable content */}
      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col px-4 sm:px-5 md:px-8 pt-2 pb-4 max-w-lg w-full mx-auto">
          {hint && (
            <div className="inline-flex self-start px-3 py-1 rounded-full bg-[var(--ob-chip)] border border-[var(--ob-chip-border)] text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-[var(--ob-text-soft)] mb-3 sm:mb-4 max-w-full">
              <span className="truncate">{hint}</span>
            </div>
          )}
          <h2 className="font-heading font-semibold text-[22px] sm:text-[24px] md:text-[30px] text-[var(--ob-text)] leading-tight mb-2">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[13px] sm:text-[14px] md:text-[15px] text-[var(--ob-text-soft)] leading-relaxed mb-5 sm:mb-6">
              {subtitle}
            </p>
          )}

          <div className="flex flex-col gap-2.5 sm:gap-3">
            {children}
          </div>
        </div>
      </div>

      {/* Sticky footer so CTA is always in reach on phone */}
      {footer && (
        <div
          className="relative z-10 px-4 sm:px-5 md:px-8 pt-3 pb-4 sm:pb-5 max-w-lg w-full mx-auto shrink-0"
          style={{ background: 'linear-gradient(to top, rgba(255,208,112,0.6), transparent)' }}
        >
          {footer}
        </div>
      )}
    </div>
  );

  // ── Page 3: Absher check ──
  if (page === 'absher') {
    return (
      <QuestionShell
        hint={t.quickCheck}
        title={t.absherTitle}
        subtitle={t.absherSub}
      >
        <OptionCard
          icon={<CheckCircle2 size={22} />}
          title={t.absherYesTitle}
          desc={t.absherYesDesc}
          onClick={() => pickAbsher('yes')}
          tone="lime"
        />
        <OptionCard
          icon={<XCircle size={22} />}
          title={t.absherNoTitle}
          desc={t.absherNoDesc}
          onClick={() => pickAbsher('no')}
          tone="coral"
        />
      </QuestionShell>
    );
  }

  // ── Page 4: Status (moving vs visiting) ──
  if (page === 'status') {
    return (
      <QuestionShell
        hint={t.aboutStay}
        title={t.statusTitle}
        subtitle={t.statusSub}
      >
        <OptionCard
          icon={<Home size={22} />}
          title={t.statusMovingTitle}
          desc={t.statusMovingDesc}
          onClick={() => pickStatus('moving')}
          tone="lavender"
        />
        <OptionCard
          icon={<Plane size={22} />}
          title={t.statusVisitingTitle}
          desc={t.statusVisitingDesc}
          onClick={() => pickStatus('visiting')}
          tone="coral"
        />
      </QuestionShell>
    );
  }

  // ── Stores map overlay (when "Find closest store" is tapped on the moving page) ──
  if (page === 'moving' && showStores) {
    const picked = NEARBY_STORES.find(s => s.id === pickedStore);

    // Account-creation gate: validation + OTP handlers ─────────────────
    const acctNamesValid = storeFirstName.trim().length >= 2 && storeLastName.trim().length >= 2;
    const acctContactValid = storeKind === 'phone'
      ? /^[0-9+\s-]{8,}$/.test(storeContact.trim())
      : /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(storeContact.trim());
    const acctOtpComplete = storeOtp.every(d => d.length === 1);

    const onAcctOtpChange = (i: number, v: string) => {
      if (!/^\d?$/.test(v)) return;
      const n = [...storeOtp]; n[i] = v; setStoreOtp(n);
      if (v && i < 3) storeOtpRefs.current[i + 1]?.focus();
    };
    const onAcctOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !storeOtp[i] && i > 0) storeOtpRefs.current[i - 1]?.focus();
    };
    const onAcctOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      if (!p) return;
      e.preventDefault();
      const n = ['', '', '', '']; for (let i = 0; i < p.length; i++) n[i] = p[i];
      setStoreOtp(n); storeOtpRefs.current[Math.min(p.length, 3)]?.focus();
    };
    const verifyAndContinue = async () => {
      try {
        await loginWithOtp(storeKind, storeContact.trim(), `${storeFirstName.trim()} ${storeLastName.trim()}`.trim());
        trackAnswer('moving', 'store_account_verified', true, 'classic', startedAtRef.current);
        setStoresStep('map');
      } catch { /* ignore — show error inline if needed */ }
    };

    return (
      <div
        className="fixed inset-0 z-[300] flex flex-col hero-gradient overflow-hidden"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {/* Header with back arrow */}
        <div className="relative z-10 w-full max-w-md mx-auto flex items-center gap-2 px-5 pt-4 sm:px-6 sm:pt-6 shrink-0">
          <button
            onClick={() => {
              if (storesStep === 'otp') { setStoresStep('account'); return; }
              setShowStores(false); setPickedStore(null);
              setStoresStep('map'); setStoreOtp(['', '', '', '']);
            }}
            className="text-[var(--ob-text-soft)] hover:text-[var(--ob-text)] p-2 -ml-2 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          </button>
          <div className="flex-1">
            <h2 className="font-heading font-bold text-[18px] sm:text-[20px] text-[var(--ob-text)] leading-tight">
              {storesStep === 'account'
                ? (lang === 'ar' ? 'أنشئ حسابك أولاً' : 'Create your account first')
                : storesStep === 'otp'
                  ? (lang === 'ar' ? 'أدخل رمز التحقق' : 'Enter verification code')
                  : (lang === 'ar' ? 'أقرب الفروع' : 'Nearest stores')}
            </h2>
            <p className="text-[12px] text-[var(--ob-text-soft)] leading-tight mt-0.5">
              {storesStep === 'account'
                ? (lang === 'ar' ? 'نحتاج تفاصيلك قبل إظهار الفروع.' : 'We need your details before showing stores.')
                : storesStep === 'otp'
                  ? <>{lang === 'ar' ? 'أرسلنا رمزاً إلى ' : 'We sent a 4-digit code to '}<span className="font-mono">{storeContact}</span></>
                  : (lang === 'ar' ? 'اختر فرعاً قريباً منك لشراء شريحة مؤقتة.' : 'Pick a nearby store to buy a visitor SIM.')}
            </p>
          </div>
        </div>

        {/* Account-creation step ─────────────────────────────────────── */}
        {storesStep === 'account' && (
          <div className="relative z-10 w-full max-w-md mx-auto flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6 mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ob-text-soft)] mb-1.5 uppercase tracking-wider">
                  {lang === 'ar' ? 'الاسم الأول' : 'First name'}
                </label>
                <input
                  value={storeFirstName}
                  onChange={(e) => setStoreFirstName(e.target.value)}
                  placeholder={lang === 'ar' ? 'محمد' : 'Mohammed'}
                  className="w-full h-11 px-3 rounded-lg border-2 border-[var(--ob-card-border)] bg-[var(--ob-card)] text-[var(--ob-card-text)] text-sm focus:border-[var(--ob-cta)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--ob-text-soft)] mb-1.5 uppercase tracking-wider">
                  {lang === 'ar' ? 'اسم العائلة' : 'Last name'}
                </label>
                <input
                  value={storeLastName}
                  onChange={(e) => setStoreLastName(e.target.value)}
                  placeholder={lang === 'ar' ? 'العتيبي' : 'Al-Otaibi'}
                  className="w-full h-11 px-3 rounded-lg border-2 border-[var(--ob-card-border)] bg-[var(--ob-card)] text-[var(--ob-card-text)] text-sm focus:border-[var(--ob-cta)] focus:outline-none"
                />
              </div>
            </div>

            <label className="block text-[11px] font-semibold text-[var(--ob-text-soft)] mb-1.5 uppercase tracking-wider">
              {storeKind === 'phone' ? (lang === 'ar' ? 'رقم الجوال' : 'Phone number') : (lang === 'ar' ? 'البريد الإلكتروني' : 'Email')}
            </label>
            <input
              type={storeKind === 'email' ? 'email' : 'tel'}
              inputMode={storeKind === 'email' ? 'email' : 'numeric'}
              value={storeContact}
              onChange={(e) => setStoreContact(e.target.value)}
              placeholder={storeKind === 'email' ? 'you@example.com' : '05xxxxxxxx'}
              dir="ltr"
              className={`w-full h-11 px-3 rounded-lg border-2 border-[var(--ob-card-border)] bg-[var(--ob-card)] text-[var(--ob-card-text)] text-sm focus:border-[var(--ob-cta)] focus:outline-none ${storeKind === 'phone' ? 'font-mono' : ''}`}
            />
            <button
              type="button"
              onClick={() => { setStoreKind(storeKind === 'phone' ? 'email' : 'phone'); setStoreContact(''); }}
              className="inline-flex items-center gap-1.5 text-[12px] text-[var(--ob-text-soft)] hover:text-[var(--ob-text)] transition-colors"
            >
              <span className="underline underline-offset-4">
                {storeKind === 'phone'
                  ? (lang === 'ar' ? 'أو استخدم البريد الإلكتروني' : 'or use email instead')
                  : (lang === 'ar' ? 'أو استخدم رقم الجوال' : 'or use phone instead')}
              </span>
            </button>

            <Button
              size="lg"
              disabled={!acctNamesValid || !acctContactValid}
              onClick={() => {
                setStoresStep('otp');
                setStoreOtp(['', '', '', '']);
                setTimeout(() => storeOtpRefs.current[0]?.focus(), 0);
              }}
              className="w-full h-12 font-bold ob-cta-elev hover:opacity-90 mt-2"
              style={{ background: '#CFEB74', color: '#16143A' }}
            >
              {lang === 'ar' ? 'إرسال رمز التحقق' : 'Send verification code'}
            </Button>
            <p className="text-center text-[10.5px] text-[var(--ob-text-soft)] leading-relaxed px-2">
              {lang === 'ar'
                ? 'بالضغط على متابعة فإنك توافق على شروط الاستخدام وسياسة الخصوصية.'
                : 'By continuing, you agree to our Terms of Service and Privacy Policy.'}
            </p>
          </div>
        )}

        {/* OTP verification step ─────────────────────────────────────── */}
        {storesStep === 'otp' && (
          <div className="relative z-10 w-full max-w-md mx-auto flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6 mt-4 space-y-4">
            <div className="flex gap-2 justify-center" dir="ltr">
              {storeOtp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { storeOtpRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => onAcctOtpChange(i, e.target.value)}
                  onKeyDown={(e) => onAcctOtpKey(i, e)}
                  onPaste={i === 0 ? onAcctOtpPaste : undefined}
                  className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-[var(--ob-card-border)] bg-[var(--ob-card)] text-[var(--ob-card-text)] focus:border-[var(--ob-cta)] focus:outline-none"
                />
              ))}
            </div>
            <Button
              size="lg"
              disabled={!acctOtpComplete}
              onClick={verifyAndContinue}
              className="w-full h-12 font-bold ob-cta-elev hover:opacity-90"
              style={{ background: '#CFEB74', color: '#16143A' }}
            >
              {lang === 'ar' ? 'تحقق وتابع' : 'Verify & continue'}
            </Button>
          </div>
        )}

        {/* Map step ─────────────────────────────────────────────────── */}
        {storesStep === 'map' && (
          <>

        {/* Map */}
        <div className="relative z-10 w-full max-w-md mx-auto flex-1 overflow-y-auto px-5 sm:px-6 pb-5 sm:pb-6 mt-3">
          {/* Map preview — small, realistic colors (like Apple Maps / Uber preview cards) */}
          <div className="rounded-xl overflow-hidden border border-[var(--ob-card-border)] shadow-sm">
            <div
              className="relative w-full"
              style={{ height: 140, background: '#E8EAEC' }}
            >
              {/* Park / green area */}
              <div className="absolute pointer-events-none rounded-md" style={{ left: '8%', top: '55%', width: '22%', height: '32%', background: '#D9E8C9' }} />
              <div className="absolute pointer-events-none rounded-md" style={{ left: '78%', top: '8%', width: '14%', height: '24%', background: '#D9E8C9' }} />
              {/* Water ribbon */}
              <div className="absolute pointer-events-none" style={{ left: '0%', top: '78%', width: '100%', height: '8%', background: '#C7DBEB', opacity: 0.85 }} />

              {/* Road grid — light, like real maps */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Major roads — white wide */}
                <line x1="0"  y1="35" x2="100" y2="38" stroke="#FFFFFF" strokeWidth="2.4" />
                <line x1="0"  y1="65" x2="100" y2="62" stroke="#FFFFFF" strokeWidth="2.4" />
                <line x1="40" y1="0"  x2="38"  y2="100" stroke="#FFFFFF" strokeWidth="2.4" />
                <line x1="72" y1="0"  x2="74"  y2="100" stroke="#FFFFFF" strokeWidth="2.4" />
                {/* Minor roads — thin */}
                <line x1="0"  y1="20" x2="100" y2="22" stroke="#FFFFFF" strokeWidth="1.0" />
                <line x1="0"  y1="50" x2="100" y2="48" stroke="#FFFFFF" strokeWidth="1.0" />
                <line x1="20" y1="0"  x2="20"  y2="100" stroke="#FFFFFF" strokeWidth="1.0" />
                <line x1="56" y1="0"  x2="58"  y2="100" stroke="#FFFFFF" strokeWidth="1.0" />
                <line x1="88" y1="0"  x2="90"  y2="100" stroke="#FFFFFF" strokeWidth="1.0" />
              </svg>

              {/* "You are here" marker — center */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: '50%', top: '50%' }}>
                <div className="relative w-3 h-3">
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: '#1976D2', opacity: 0.45 }} />
                  <div className="absolute inset-0 rounded-full border-2 border-white" style={{ background: '#1976D2', boxShadow: '0 1px 3px rgba(0,0,0,0.30)' }} />
                </div>
              </div>

              {/* Store pins — teardrop style like real map pins */}
              {NEARBY_STORES.map(store => {
                const sel = pickedStore === store.id;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => setPickedStore(store.id)}
                    className="absolute -translate-x-1/2 -translate-y-full group"
                    style={{ left: `${store.x}%`, top: `${store.y}%` }}
                    aria-label={store.name}
                  >
                    <svg width={sel ? 22 : 18} height={sel ? 28 : 22} viewBox="0 0 24 32" className="drop-shadow-sm transition-all">
                      <path
                        d="M12 0 C5.4 0 0 5.4 0 12 c0 9 12 20 12 20 s12-11 12-20 C24 5.4 18.6 0 12 0z"
                        fill={sel ? '#FE7151' : '#16143A'}
                        stroke="#fff"
                        strokeWidth="1.5"
                      />
                      <circle cx="12" cy="12" r="4" fill="#fff" />
                    </svg>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stores list */}
          <div className="mt-4 space-y-2">
            {NEARBY_STORES.map(store => {
              const sel = pickedStore === store.id;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setPickedStore(store.id)}
                  className={`w-full flex items-center gap-3 rounded-xl border-2 transition-all px-3.5 py-3 text-start ${
                    sel ? '' : 'border-[var(--ob-card-border)] bg-[var(--ob-card)] hover:border-[var(--ob-cta)]/40'
                  }`}
                  style={sel ? { background: 'rgba(254, 113, 81, 0.10)', borderColor: '#FE7151' } : {}}
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: sel ? '#FE7151' : '#16143A', color: '#fff' }}>
                    <MapPin size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-heading font-semibold text-[14px] text-[var(--ob-card-text)] leading-tight truncate">
                      {store.name}
                    </div>
                    <div className="text-[11px] text-[var(--ob-card-text-soft)] mt-0.5 inline-flex items-center gap-2">
                      <span>{store.distance}</span>
                      <span className="text-[var(--ob-card-text-soft)]/50">·</span>
                      <span>{store.open}</span>
                    </div>
                  </div>
                  <ArrowRight size={14} className={`shrink-0 text-[var(--ob-card-text-soft)] ${isRtl ? 'rotate-180' : ''}`} />
                </button>
              );
            })}
          </div>

          {picked && (
            <div className="mt-4 rounded-xl border-2 px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(254, 113, 81, 0.10)', borderColor: '#FE7151' }}>
              <Phone size={16} style={{ color: '#16143A' }} />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold text-[var(--ob-card-text)]">{picked.name}</div>
                <div className="text-[11px] text-[var(--ob-card-text-soft)]">
                  {lang === 'ar' ? `${picked.distance} · ${picked.open}` : `${picked.distance} · open ${picked.open}`}
                </div>
              </div>
              <Button
                size="sm"
                className="font-bold"
                style={{ background: '#16143A', color: '#FFFFFF' }}
                onClick={() => {
                  trackAnswer('moving', 'store_directions', picked.id, 'classic', startedAtRef.current);
                  // In production this'd open Google Maps with directions; for now keep onboarding intact.
                }}
              >
                {lang === 'ar' ? 'الاتجاهات' : 'Get directions'}
              </Button>
            </div>
          )}
          </div>
        </>
        )}
      </div>
    );
  }

  // ── Page 5a: Moving info (Iqama → Absher → long-term plan) ──
  if (page === 'moving') {
    return (
      <QuestionShell
        hint={t.howItWorks}
        title={t.movingTitle}
        subtitle={t.movingSub}
        footer={
          <div className="flex flex-col gap-2.5 sm:gap-3">
            <div className="rounded-xl bg-[var(--ob-card)] border border-[var(--ob-card-border)] px-3 py-2.5 sm:px-4 sm:py-3 text-[12.5px] sm:text-[13px] text-[var(--ob-card-text)] leading-relaxed">
              <span className="font-semibold">💡 </span>
              {t.movingHint}
            </div>
            <Button
              onClick={() => {
                trackAnswer('moving', 'find_closest_store', true, 'classic', startedAtRef.current);
                setStoresStep(isLoggedIn ? 'map' : 'account');
                setShowStores(true);
              }}
              className="w-full h-12 sm:h-14 text-[14px] sm:text-[15px] font-semibold ob-cta-elev hover:opacity-90"
              style={{ background: '#CFEB74', color: '#16143A' }}
            >
              <MapPin size={18} className="mr-2" />
              {t.ctaGetTemp}
            </Button>
          </div>
        }
      >
        {[
          { n: 1, icon: <Clock3 size={18} />, title: t.movingStep1, desc: t.movingStep1Desc },
          { n: 2, icon: <IdCard size={18} />, title: t.movingStep2, desc: t.movingStep2Desc },
          { n: 3, icon: <IdCard size={18} />, title: t.movingStep3, desc: t.movingStep3Desc },
          { n: 4, icon: <Check size={18} />, title: t.movingStep4, desc: t.movingStep4Desc },
        ].map((step) => (
          <div key={step.n} className="flex items-start gap-3 rounded-2xl bg-[var(--ob-card)] border border-[var(--ob-card-border)] p-3 sm:p-4 ob-card-elev">
            <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[var(--ob-icon)] text-[var(--ob-icon-text)] border border-[var(--ob-card-border)] flex items-center justify-center font-bold text-[13px] sm:text-sm">
              {step.n}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-heading font-semibold text-[14px] sm:text-[15px] text-[var(--ob-card-text)] mb-0.5 sm:mb-1">
                {step.title}
              </div>
              <div className="text-[12.5px] sm:text-[13px] text-[var(--ob-card-text-soft)] leading-relaxed">
                {step.desc}
              </div>
            </div>
          </div>
        ))}
      </QuestionShell>
    );
  }

  // ── Page 5b: Visitor short-stay options (real carrier visitor plans) ──
  if (page === 'visiting') {
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

    const carriers: CarrierGroup[] = [
      {
        key: 'salam',
        name: 'Salam Mobile',
        color: '#00AD42',
        url: 'https://salammobile.sa/en/visitor-plans/',
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
        url: 'https://www.mobily.com.sa/wps/portal/web/personal/services/details/communications-add-ons/more-services/mobily-visitors-package',
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
        url: 'https://sa.zain.com/en/mobile/visitor/visitor-40',
        plans: [
          { name: 'Visitor 40', price: '40', validityDays: 14, data: '7 GB', mins: 60, url: 'https://sa.zain.com/en/mobile/visitor/visitor-40' },
          { name: 'Visitor 60', price: '60', validityDays: 14, data: '20 GB', mins: 150, url: 'https://sa.zain.com/en/mobile/visitor/visitor-60' },
          { name: 'Visitor 85', price: '85', validityDays: 21, data: '28 GB', mins: 250, note: t.zainCugNote, url: 'https://sa.zain.com/en/mobile/visitor/visitor-85' },
          { name: 'Visitor 120', price: '120', validityDays: 28, data: '55 GB', mins: 350, note: t.zainCugNote, url: 'https://sa.zain.com/en/mobile/visitor/visitor-120' },
          { name: 'Visitor 160', price: '160', validityDays: 28, data: '75 GB', mins: 500, note: t.zainCugNote, url: 'https://sa.zain.com/en/mobile/visitor/visitor-160' },
        ],
      },
    ];

    const openUrl = (carrier: CarrierGroup, plan: VisitorPlan) => {
      const url = plan.url ?? carrier.url;
      const planId = `onboarding-${carrier.key}-${plan.name.toLowerCase().replace(/\s+/g, '-')}`;
      // Fire the same event as the main app's plan-detail redirect so visitor plan
      // clicks roll up into the same "get_plan_clicked" funnel.
      trackEvent(
        'get_plan_clicked',
        {
          plan_id: planId,
          plan_name: plan.name,
          provider: carrier.name,
          url,
          source: 'onboarding-visitor',
        },
        { useBeacon: true },
      );
      // Onboarding-specific event for step-level funnels.
      trackCarrierOpened(carrier.key, 'classic', startedAtRef.current, {
        url,
        plan_id: planId,
        plan_name: plan.name,
      });
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
      <QuestionShell
        hint={t.forVisitors}
        title={t.visitingTitle}
        subtitle={t.visitingSub}
        footer={
          <Button
            onClick={() => {
              completedRef.current = true;
              localStorage.setItem('soob-onboarded', 'true');
              localStorage.setItem('soob-onboarding-answers', JSON.stringify(answers));
              markOnboarded();
              trackCompleted('/', { ...answers }, 'classic', startedAtRef.current);
              setVisible(false);
              navigate('/');
            }}
            className="w-full h-12 sm:h-14 text-[15px] sm:text-base font-semibold ob-cta-elev hover:opacity-90"
            style={{ background: '#CFEB74', color: '#16143A' }}
          >
            <Home size={18} className="mr-2" />
            {t.ctaHome}
          </Button>
        }
      >
        <div className="flex flex-col gap-5 sm:gap-6 -mx-4 sm:-mx-5 md:-mx-8">
          {carriers.map((carrier) => (
            <div key={carrier.key} className="flex flex-col gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 px-4 sm:px-5 md:px-8">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: carrier.color }}
                />
                <span className="font-heading font-semibold text-[14px] sm:text-[15px] text-[var(--ob-text)]">
                  {carrier.name}
                </span>
                <span className="text-[11px] text-[var(--ob-text-faint)]">
                  · {carrier.plans.length} {t.plansWord}
                </span>
              </div>

              {/* Netflix-style horizontal scroll strip */}
              <div
                className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth px-4 sm:px-5 md:px-8 pb-2 [&::-webkit-scrollbar]:hidden"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
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
                    <div
                      key={p.name}
                      className="shrink-0 snap-start w-[78vw] max-w-[280px] sm:w-[260px] rounded-2xl bg-[var(--ob-card)] border border-[var(--ob-card-border)] ob-card-elev overflow-hidden"
                    >
                      {/* Colored top accent bar */}
                      <div className="h-1 w-full" style={{ backgroundColor: carrier.color }} />

                      <div className="p-3.5 sm:p-4 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div
                              className="inline-block text-[9.5px] sm:text-[10.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-md mb-1.5"
                              style={{
                                color: carrier.color,
                                backgroundColor: `${carrier.color}1A`,
                              }}
                            >
                              {t.visitingPrepaid}
                            </div>
                            <div className="font-heading font-bold text-[17px] sm:text-[18px] text-[var(--ob-card-text)] leading-tight">
                              {p.name}
                            </div>
                          </div>
                        </div>

                        <div className={`flex items-baseline gap-1.5 mb-2.5 ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
                          <div className="font-heading font-bold text-[22px] sm:text-[24px] text-[var(--ob-card-text)] leading-none">
                            {p.price}
                          </div>
                          <div className="text-[12px] font-semibold text-[var(--ob-card-text)]">SAR</div>
                          <div className="text-[11px] text-[var(--ob-card-text-soft)] ml-1">
                            / {t.visitingDays(p.validityDays)}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 py-2.5 border-y border-[var(--ob-card-border)]">
                          {rows.map(([label, value]) => (
                            <div key={label} className="min-w-0">
                              <div className="text-[9.5px] sm:text-[10px] uppercase tracking-wider text-[var(--ob-card-text-soft)] mb-0.5 truncate">
                                {label}
                              </div>
                              <div className="text-[12.5px] sm:text-[13px] font-semibold text-[var(--ob-card-text)] truncate">
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>

                        {p.note && (
                          <div className="mt-2 text-[11px] text-[var(--ob-card-text-soft)] font-medium leading-snug">
                            ★ {p.note}
                          </div>
                        )}

                        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
                          <div className="text-[10px] text-[var(--ob-card-text-soft)]">
                            {t.visitingVat}
                          </div>
                          <button
                            onClick={() => openUrl(carrier, p)}
                            className="inline-flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-[var(--ob-card-text)] hover:text-[var(--ob-card-text-soft)] transition-colors"
                          >
                            {t.visitingGet}
                            <ArrowRight size={13} />
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
      </QuestionShell>
    );
  }

  return null;
}
