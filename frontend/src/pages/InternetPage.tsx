/**
 * Home Internet ("/internet") — FTTH catalog + purchase flow.
 *
 * Catalog: mock data (replace with /api/internet when wired).
 * Purchase flow (modal, multi-step):
 *   1. personal      — DOB, ID/Iqama, phone, email
 *   2. otp           — 4-digit verification sent to phone
 *   3. coverage      — map pin OR manual ODB number entry (with help popup)
 *   4. appointment   — date + 2-hour installation window
 *   5. review        — summary of everything
 *   6. payment       — pick method, pay
 *   7. success       — thank-you + order number, also saves order to /orders
 */
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Wifi, Gauge, Calendar, MapPin, Crosshair, HelpCircle,
  Phone, Mail, User, Check, CreditCard,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SarSymbol from '../components/SarSymbol';
import { trackEvent } from '../lib/analytics';

interface FtthPlan {
  id: string;
  provider: string;
  name: string;
  speedMbps: number;
  uploadMbps: number;
  priceSAR: number;
  setupFeeSAR: number;
  installDays: number;
  contractMonths: number;
  popular?: boolean;
}

const MOCK_FTTH_PLANS: FtthPlan[] = [
  { id: 'stc-100',  provider: 'STC',     name: 'STC Fiber 100',  speedMbps: 100, uploadMbps: 50,  priceSAR: 199, setupFeeSAR: 0,    installDays: 3,  contractMonths: 12 },
  { id: 'stc-300',  provider: 'STC',     name: 'STC Fiber 300',  speedMbps: 300, uploadMbps: 150, priceSAR: 299, setupFeeSAR: 0,    installDays: 3,  contractMonths: 12, popular: true },
  { id: 'stc-1g',   provider: 'STC',     name: 'STC Fiber 1 Gig', speedMbps: 1000, uploadMbps: 500, priceSAR: 449, setupFeeSAR: 0,    installDays: 5,  contractMonths: 12 },
  { id: 'mob-200',  provider: 'Mobily',  name: 'Mobily Home 200', speedMbps: 200, uploadMbps: 100, priceSAR: 249, setupFeeSAR: 0,    installDays: 4,  contractMonths: 12 },
  { id: 'mob-500',  provider: 'Mobily',  name: 'Mobily Home 500', speedMbps: 500, uploadMbps: 250, priceSAR: 369, setupFeeSAR: 99,   installDays: 4,  contractMonths: 12 },
  { id: 'zain-200', provider: 'Zain',    name: 'Zain Home 200',   speedMbps: 200, uploadMbps: 100, priceSAR: 229, setupFeeSAR: 0,    installDays: 5,  contractMonths: 12 },
  { id: 'zain-500', provider: 'Zain',    name: 'Zain Home 500',   speedMbps: 500, uploadMbps: 250, priceSAR: 339, setupFeeSAR: 0,    installDays: 5,  contractMonths: 12 },
  { id: 'go-300',   provider: 'GO',      name: 'GO Fiber 300',    speedMbps: 300, uploadMbps: 150, priceSAR: 279, setupFeeSAR: 199,  installDays: 7,  contractMonths: 12 },
];

type Step = 'personal' | 'otp' | 'coverage' | 'appointment' | 'review' | 'payment' | 'success';
type PaymentMethod = 'apple-pay' | 'mada' | 'stc-pay' | 'visa' | 'tabby' | 'tamara';

// 6 fake ODB pins scattered across the mock map. Each represents a fiber
// distribution box near a building cluster.
const MOCK_ODBS = [
  { id: 'ODB-RUH-A1', x: 22, y: 28, label: 'Olaya · A1' },
  { id: 'ODB-RUH-B7', x: 48, y: 18, label: 'Sahafa · B7' },
  { id: 'ODB-RUH-C3', x: 71, y: 35, label: 'Hittin · C3' },
  { id: 'ODB-RUH-D5', x: 35, y: 60, label: 'Malqa · D5' },
  { id: 'ODB-RUH-E2', x: 62, y: 70, label: 'Yasmin · E2' },
  { id: 'ODB-RUH-F9', x: 84, y: 58, label: 'Diplomatic · F9' },
];

// Generate 14 calendar days starting tomorrow
function getDateOptions(lang: 'en' | 'ar') {
  const out: { iso: string; label: string; weekday: string; day: string }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date(); d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const weekday = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short' });
    const day = d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short' });
    out.push({ iso, label: `${weekday} ${day}`, weekday, day });
  }
  return out;
}

const TIME_SLOTS = ['09:00 – 11:00', '11:00 – 13:00', '13:00 – 15:00', '15:00 – 17:00', '17:00 – 19:00'];

export default function InternetPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';

  const [selectedPlan, setSelectedPlan] = useState<FtthPlan | null>(null);
  const [step, setStep] = useState<Step>('personal');
  const [showHelp, setShowHelp] = useState(false);

  // Form state ─────────────────────────────────────────────────
  const [dob, setDob] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '']);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null]);
  const [coverageMode, setCoverageMode] = useState<'map' | 'manual'>('map');
  const [pickedOdb, setPickedOdb] = useState<string | null>(null);
  const [manualOdb, setManualOdb] = useState('');
  const [manualProvider, setManualProvider] = useState('');
  const [appointmentDate, setAppointmentDate] = useState<string | null>(null);
  const [appointmentSlot, setAppointmentSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [orderNumber, setOrderNumber] = useState<string>('');

  const dateOptions = useMemo(() => getDateOptions(isAr ? 'ar' : 'en'), [isAr]);

  const reset = () => {
    setStep('personal'); setDob(''); setIdNumber(''); setPhone(''); setEmail('');
    setOtp(['', '', '', '']); setCoverageMode('map'); setPickedOdb(null);
    setManualOdb(''); setManualProvider(''); setAppointmentDate(null);
    setAppointmentSlot(null); setPaymentMethod(null); setOrderNumber('');
  };

  const open = (plan: FtthPlan) => {
    reset();
    setSelectedPlan(plan);
    trackEvent('internet_purchase_started', { plan_id: plan.id, provider: plan.provider });
  };
  const close = () => { setSelectedPlan(null); };

  // Validation ─────────────────────────────────────────────────
  const dobValid = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const idValid = /^[12]\d{9}$/.test(idNumber.trim());
  const phoneValid = /^05\d{8}$/.test(phone.trim());
  const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const personalValid = dobValid && idValid && phoneValid && emailValid;
  const otpComplete = otp.every(d => d.length === 1);
  const coverageValid = coverageMode === 'map'
    ? !!pickedOdb
    : (manualOdb.trim().length >= 4 && manualProvider.trim().length >= 2);
  const appointmentValid = !!appointmentDate && !!appointmentSlot;

  // OTP handlers ───────────────────────────────────────────────
  const onOtpChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v; setOtp(next);
    if (v && i < 3) otpRefs.current[i + 1]?.focus();
  };
  const onOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };
  const onOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!p) return;
    e.preventDefault();
    const n = ['', '', '', '']; for (let i = 0; i < p.length; i++) n[i] = p[i];
    setOtp(n); otpRefs.current[Math.min(p.length, 3)]?.focus();
  };

  // Save order on success so it appears in /orders
  const finalize = () => {
    if (!selectedPlan) return;
    const num = `SOB-INET-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderNumber(num);
    try {
      const raw = localStorage.getItem('soob-orders-v3');
      const existing = raw ? JSON.parse(raw) : [];
      const order = {
        id: num,
        kind: 'internet',
        planName: selectedPlan.name,
        provider: selectedPlan.provider,
        priceSAR: selectedPlan.priceSAR + selectedPlan.setupFeeSAR,
        purchasedAt: new Date().toISOString(),
        status: 'shipped',
        shippedAt: new Date().toISOString(),
        estimatedDelivery: appointmentDate && appointmentSlot
          ? `${appointmentDate}T${appointmentSlot.split(' – ')[0]}:00`
          : undefined,
        trackingNumber: num,
        shippingLocation: appointmentDate
          ? `Install scheduled · ${dateOptions.find(d => d.iso === appointmentDate)?.label} · ${appointmentSlot}`
          : 'Install scheduled',
      };
      localStorage.setItem('soob-orders-v3', JSON.stringify([order, ...existing]));
    } catch { /* ignore */ }

    trackEvent('internet_purchase_completed', {
      plan_id: selectedPlan.id, provider: selectedPlan.provider,
      total: selectedPlan.priceSAR + selectedPlan.setupFeeSAR,
      payment_method: paymentMethod, order_number: num,
    });
    setStep('success');
  };

  return (
    <div className="safe-pb">
      {/* Slim themed hero */}
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-5">
          <Link to="/browse" className="inline-flex items-center gap-1 text-foreground/60 text-[11px] font-medium hover:text-foreground transition-colors">
            <ArrowLeft size={13} className="rtl:rotate-180" />
            {isAr ? 'كل المنتجات' : 'All products'}
          </Link>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#CFEB74', border: '1px solid rgba(22, 20, 58, 0.20)' }}>
              <Wifi size={18} style={{ color: '#16143A' }} />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg md:text-xl text-foreground tracking-tight leading-tight">
                {isAr ? 'إنترنت المنزل (الألياف)' : 'Home Internet (Fiber)'}
              </h1>
              <p className="text-foreground/55 text-[11px] md:text-xs leading-tight">
                {isAr ? '8 مزودين · تركيب خلال 3-7 أيام' : '8 providers · install in 3–7 days'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {MOCK_FTTH_PLANS.map((plan) => (
          <article key={plan.id} className="relative flex flex-col rounded-2xl bg-card border border-border ob-card-elev p-5 hover:shadow-lg transition-all">
            {plan.popular && (
              <span className="absolute -top-2 end-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm text-white" style={{ background: '#FE7151' }}>
                {isAr ? 'الأكثر شعبية' : 'Most popular'}
              </span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{plan.provider}</span>
            </div>
            <h2 className="font-heading font-bold text-base text-foreground leading-tight">{plan.name}</h2>
            <div className="mt-3 flex items-baseline gap-1">
              <SarSymbol className="text-xs text-muted-foreground" />
              <span className="font-heading font-bold text-2xl text-foreground leading-none" style={{ color: '#FE7151' }}>{plan.priceSAR}</span>
              <span className="text-xs text-muted-foreground ml-1">/ {isAr ? 'شهر' : 'month'}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-foreground/75"><Gauge size={13} className="text-foreground/50" /><span><strong>{plan.speedMbps}</strong> {isAr ? 'م.ب/ث' : 'Mbps'}</span></div>
              <div className="flex items-center gap-1.5 text-foreground/75"><Calendar size={13} className="text-foreground/50" /><span>{plan.installDays} {isAr ? 'أيام' : 'days'}</span></div>
            </div>
            <div className="mt-3 pt-3 border-t border-border text-[10px] text-foreground/60 leading-snug">
              {plan.setupFeeSAR > 0
                ? (isAr ? `رسوم تركيب ${plan.setupFeeSAR} ر.س` : `${plan.setupFeeSAR} SAR setup fee`)
                : (<span style={{ color: '#16143A', background: 'rgba(207, 235, 116, 0.45)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{isAr ? '✓ تركيب مجاني' : '✓ Free installation'}</span>)}
              {' · '}
              {plan.contractMonths === 0 ? (isAr ? 'بدون عقد' : 'no contract') : (isAr ? `${plan.contractMonths} شهر عقد` : `${plan.contractMonths}-month contract`)}
            </div>
            <Button onClick={() => open(plan)} size="sm" className="mt-4 w-full font-bold text-[13px]">
              {isAr ? 'احصل على الباقة' : 'Get this plan'}
            </Button>
          </article>
        ))}
      </div>

      {/* ── Purchase flow modal ───────────────────────────────────────── */}
      <Dialog open={!!selectedPlan} onOpenChange={(o) => !o && close()}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedPlan && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
                  <Wifi size={18} style={{ color: '#CFEB74' }} />
                  {selectedPlan.name}
                </DialogTitle>
                <DialogDescription className="text-[11px] uppercase tracking-wider font-mono">
                  {step !== 'success'
                    ? `${isAr ? 'الخطوة' : 'Step'} ${(['personal', 'otp', 'coverage', 'appointment', 'review', 'payment'] as Step[]).indexOf(step) + 1} / 6`
                    : (isAr ? 'تم!' : 'Done!')}
                </DialogDescription>
              </DialogHeader>

              {/* ── STEP 1: personal ──────────────────────────────────── */}
              {step === 'personal' && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/75">
                    {isAr ? 'لإكمال طلبك نحتاج بعض المعلومات الشخصية.' : 'We need a few personal details to complete your order.'}
                  </p>
                  <FieldLabel>{isAr ? 'تاريخ الميلاد' : 'Date of birth'}</FieldLabel>
                  <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="bg-card" />

                  <FieldLabel>{isAr ? 'رقم الهوية أو الإقامة' : 'National ID / Iqama number'}</FieldLabel>
                  <div className="relative">
                    <User size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                    <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="1xxxxxxxxx" inputMode="numeric" className="pl-9 bg-card font-mono" dir="ltr" />
                  </div>

                  <FieldLabel>{isAr ? 'رقم الجوال' : 'Phone number'}</FieldLabel>
                  <div className="relative">
                    <Phone size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" inputMode="numeric" className="pl-9 bg-card font-mono" dir="ltr" />
                  </div>

                  <FieldLabel>{isAr ? 'البريد الإلكتروني' : 'Email'}</FieldLabel>
                  <div className="relative">
                    <Mail size={15} className="absolute top-1/2 -translate-y-1/2 left-3 text-foreground/40" />
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="pl-9 bg-card" />
                  </div>

                  <Button size="lg" disabled={!personalValid} onClick={() => { setStep('otp'); setOtp(['', '', '', '']); setTimeout(() => otpRefs.current[0]?.focus(), 0); }} className="w-full font-bold mt-2">
                    {isAr ? 'إرسال رمز التحقق' : 'Send verification code'}
                  </Button>
                </div>
              )}

              {/* ── STEP 2: otp ───────────────────────────────────────── */}
              {step === 'otp' && (
                <div className="space-y-4">
                  <button onClick={() => setStep('personal')} className="text-[12px] text-foreground/65 hover:text-foreground inline-flex items-center gap-1">
                    <ArrowLeft size={13} className="rtl:rotate-180" />
                    {isAr ? 'تعديل التفاصيل' : 'Edit details'}
                  </button>
                  <p className="text-sm text-foreground/75">
                    {isAr
                      ? <>أرسلنا رمزاً إلى <span className="font-mono text-foreground">{phone}</span></>
                      : <>We sent a 4-digit code to <span className="font-mono text-foreground">{phone}</span></>}
                  </p>
                  <div className="flex gap-2 justify-center" dir="ltr">
                    {otp.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        onChange={(e) => onOtpChange(i, e.target.value)}
                        onKeyDown={(e) => onOtpKey(i, e)}
                        onPaste={i === 0 ? onOtpPaste : undefined}
                        className="w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-border bg-card focus:border-[var(--ob-cta)] focus:outline-none"
                      />
                    ))}
                  </div>
                  <Button size="lg" disabled={!otpComplete} onClick={() => setStep('coverage')} className="w-full font-bold">
                    {isAr ? 'تحقق' : 'Verify'}
                  </Button>
                </div>
              )}

              {/* ── STEP 3: coverage ──────────────────────────────────── */}
              {step === 'coverage' && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/75">
                    {isAr
                      ? 'الرجاء اختيار أقرب ODB. باختيارك أقرب ODB سنتمكن من تركيب الألياف لمنزلك.'
                      : 'Please select the nearest ODB. By selecting the nearest ODB we will be able to implement the fiber to your house.'}
                  </p>

                  {/* Mode toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <ModeButton active={coverageMode === 'map'} onClick={() => setCoverageMode('map')} icon={<MapPin size={13} />} label={isAr ? 'الخريطة' : 'On map'} />
                    <ModeButton active={coverageMode === 'manual'} onClick={() => setCoverageMode('manual')} icon={<HelpCircle size={13} />} label={isAr ? 'إدخال يدوي' : 'Manual entry'} />
                  </div>

                  {coverageMode === 'map' ? (
                    <div className="rounded-xl border-2 border-border overflow-hidden">
                      <div className="relative aspect-[3/2] w-full" style={{ background: 'linear-gradient(135deg, #E1CDFC 0%, #CFEB74 70%, #F0FAD0 100%)' }}>
                        {/* Fake roads */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 100 60" preserveAspectRatio="none">
                          <line x1="0" y1="20" x2="100" y2="22" stroke="#16143A" strokeWidth="0.4" strokeDasharray="2 1" />
                          <line x1="0" y1="42" x2="100" y2="38" stroke="#16143A" strokeWidth="0.4" strokeDasharray="2 1" />
                          <line x1="35" y1="0" x2="32" y2="60" stroke="#16143A" strokeWidth="0.4" strokeDasharray="2 1" />
                          <line x1="68" y1="0" x2="72" y2="60" stroke="#16143A" strokeWidth="0.4" strokeDasharray="2 1" />
                        </svg>
                        {MOCK_ODBS.map(odb => {
                          const sel = pickedOdb === odb.id;
                          return (
                            <button
                              key={odb.id}
                              type="button"
                              onClick={() => setPickedOdb(odb.id)}
                              className="absolute -translate-x-1/2 -translate-y-1/2 group"
                              style={{ left: `${odb.x}%`, top: `${odb.y}%` }}
                            >
                              <span className={`relative inline-flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all ${sel ? 'scale-125' : 'hover:scale-110'}`} style={{ background: sel ? '#FE7151' : '#16143A', borderColor: '#fff', boxShadow: sel ? '0 0 0 4px rgba(254,113,81,0.30)' : '0 2px 4px rgba(0,0,0,0.20)' }}>
                                <Crosshair size={12} className="text-white" strokeWidth={2.5} />
                              </span>
                              <span className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition-opacity ${sel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} style={{ background: '#16143A', color: '#fff' }}>
                                {odb.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {pickedOdb && (
                        <div className="px-3 py-2 bg-secondary/40 text-[12px] flex items-center gap-2">
                          <Check size={13} className="text-[#16143A]" />
                          <span className="font-mono font-semibold">{pickedOdb}</span>
                          <span className="text-foreground/55">· {MOCK_ODBS.find(o => o.id === pickedOdb)?.label}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <FieldLabel>{isAr ? 'رقم ODB' : 'ODB number'}</FieldLabel>
                      <Input value={manualOdb} onChange={(e) => setManualOdb(e.target.value)} placeholder="ODB-RUH-A1" className="bg-card font-mono" dir="ltr" />

                      <FieldLabel>{isAr ? 'المزود' : 'Provider'}</FieldLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {(['STC', 'Mobily', 'Zain', 'Salam'] as const).map(p => {
                          const sel = manualProvider === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setManualProvider(p)}
                              className={`rounded-lg border-2 px-3 py-2 text-[13px] font-bold transition-all ${
                                sel ? '' : 'border-border bg-card hover:border-[var(--ob-cta)]/40 text-foreground/75'
                              }`}
                              style={sel ? { background: '#CFEB74', borderColor: '#16143A', color: '#16143A' } : {}}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>

                      <button type="button" onClick={() => setShowHelp(true)} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-foreground underline underline-offset-4 hover:opacity-80 mt-1">
                        <HelpCircle size={13} />
                        {isAr ? 'ما هو رقم ODB؟ اضغط هنا' : 'What is the ODB plate number? Click here'}
                      </button>
                    </div>
                  )}

                  <Button size="lg" disabled={!coverageValid} onClick={() => setStep('appointment')} className="w-full font-bold mt-2">
                    {isAr ? 'متابعة' : 'Continue'}
                  </Button>
                </div>
              )}

              {/* ── STEP 4: appointment ───────────────────────────────── */}
              {step === 'appointment' && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/75">
                    {isAr ? 'اختر تاريخ ووقت التركيب.' : 'Pick an installation date and time slot.'}
                  </p>
                  <FieldLabel>{isAr ? 'التاريخ' : 'Date'}</FieldLabel>
                  <Input
                    type="date"
                    value={appointmentDate ?? ''}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    min={dateOptions[0].iso}
                    max={dateOptions[dateOptions.length - 1].iso}
                    className="bg-card"
                  />
                  <p className="text-[10.5px] text-foreground/50 -mt-1">
                    {isAr ? 'متاح خلال الـ 14 يوماً القادمة.' : 'Available within the next 14 days.'}
                  </p>

                  <FieldLabel>{isAr ? 'وقت التركيب' : 'Install time'}</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(slot => {
                      const sel = appointmentSlot === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setAppointmentSlot(slot)}
                          className={`rounded-lg border-2 px-3 py-2 text-[12px] font-mono font-semibold transition-all ${sel ? '' : 'border-border bg-card hover:border-[var(--ob-cta)]/40'}`}
                          style={sel ? { background: '#CFEB74', borderColor: '#16143A', color: '#16143A' } : {}}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>

                  <Button size="lg" disabled={!appointmentValid} onClick={() => setStep('review')} className="w-full font-bold mt-2">
                    {isAr ? 'متابعة' : 'Continue'}
                  </Button>
                </div>
              )}

              {/* ── STEP 5: review ────────────────────────────────────── */}
              {step === 'review' && (
                <div className="space-y-3">
                  <p className="text-sm text-foreground/75">{isAr ? 'راجع طلبك قبل الدفع.' : 'Review your order before payment.'}</p>
                  <SummaryCard plan={selectedPlan} setupFee={selectedPlan.setupFeeSAR} isAr={isAr} />
                  <ReviewRow label={isAr ? 'الجوال' : 'Phone'} value={phone} mono />
                  <ReviewRow label={isAr ? 'البريد' : 'Email'} value={email} />
                  <ReviewRow
                    label={isAr ? 'موقع ODB' : 'ODB location'}
                    value={coverageMode === 'map'
                      ? `${pickedOdb} · ${MOCK_ODBS.find(o => o.id === pickedOdb)?.label ?? ''}`
                      : `${manualOdb} · ${manualProvider}`}
                    mono
                  />
                  <ReviewRow
                    label={isAr ? 'موعد التركيب' : 'Install appointment'}
                    value={`${appointmentDate ? new Date(appointmentDate).toLocaleDateString(isAr ? 'ar-SA' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : ''} · ${appointmentSlot}`}
                  />
                  <Button size="lg" onClick={() => setStep('payment')} className="w-full font-bold mt-2">
                    {isAr ? 'متابعة للدفع' : 'Continue to payment'}
                  </Button>
                </div>
              )}

              {/* ── STEP 6: payment ───────────────────────────────────── */}
              {step === 'payment' && (
                <div className="space-y-3">
                  <SummaryCard plan={selectedPlan} setupFee={selectedPlan.setupFeeSAR} isAr={isAr} compact />
                  <FieldLabel>{isAr ? 'طريقة الدفع' : 'Payment method'}</FieldLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'stc-pay',   label: 'STC Pay',    bg: '#4F0D7F', fg: '#FFFFFF' },
                      { id: 'apple-pay', label: 'Apple Pay',  bg: '#000000', fg: '#FFFFFF' },
                      { id: 'visa',      label: 'Visa',       bg: '#1A1F71', fg: '#FFFFFF' },
                      { id: 'mada',      label: 'mada',       bg: '#84BD00', fg: '#16143A' },
                    ] as const).map(m => {
                      const sel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`relative flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 transition-all ${sel ? 'border-[var(--ob-cta)]' : 'border-border hover:border-[var(--ob-cta)]/40'}`}
                          style={{ backgroundColor: m.bg, color: m.fg }}
                        >
                          {sel && (
                            <span className="absolute -top-1.5 -end-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                          <CreditCard size={14} />
                          <span className="font-bold text-[13px]">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Buy now, pay later — Saudi BNPL options (FTTH only, not telecom plans) */}
                  <p className="text-[10px] font-bold uppercase tracking-wider text-foreground/55 mt-2 mb-1.5">
                    {isAr ? 'اشترِ الآن وادفع لاحقاً' : 'Buy now, pay later'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: 'tabby',  label: 'Tabby',  bg: '#3BFFC1', fg: '#16143A', sub: isAr ? '4 دفعات' : '4 payments' },
                      { id: 'tamara', label: 'Tamara', bg: '#E63B7A', fg: '#FFFFFF', sub: isAr ? 'ادفع لاحقاً' : 'Pay later' },
                    ] as const).map(m => {
                      const sel = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`relative flex flex-col items-center justify-center gap-0.5 py-3 rounded-xl border-2 transition-all ${sel ? 'border-[var(--ob-cta)]' : 'border-border hover:border-[var(--ob-cta)]/40'}`}
                          style={{ backgroundColor: m.bg, color: m.fg }}
                        >
                          {sel && (
                            <span className="absolute -top-1.5 -end-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] shadow">
                              <Check size={11} strokeWidth={3} />
                            </span>
                          )}
                          <span className="font-bold text-[14px]">{m.label}</span>
                          <span className="text-[10px] opacity-80">{m.sub}</span>
                        </button>
                      );
                    })}
                  </div>

                  <Button size="lg" disabled={!paymentMethod} onClick={finalize} className="w-full font-bold mt-2">
                    {isAr
                      ? `ادفع ${selectedPlan.priceSAR + selectedPlan.setupFeeSAR} ر.س`
                      : `Pay ${selectedPlan.priceSAR + selectedPlan.setupFeeSAR} SAR`}
                  </Button>
                  <p className="text-[10.5px] text-foreground/50 text-center leading-snug">
                    {isAr ? 'الدفع آمن ومشفّر.' : 'Secure & encrypted payment.'}
                  </p>
                </div>
              )}

              {/* ── STEP 7: success ───────────────────────────────────── */}
              {step === 'success' && (
                <div className="text-center py-3">
                  <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#CFEB74' }}>
                    <Check size={32} strokeWidth={3} style={{ color: '#16143A' }} />
                  </div>
                  <h3 className="font-heading font-bold text-xl text-foreground">
                    {isAr ? 'شكراً لطلبك!' : 'Thank you for your order!'}
                  </h3>
                  <p className="text-sm text-foreground/70 mt-2">
                    {isAr
                      ? 'سنتواصل معك قريباً عبر رقم جوالك.'
                      : "We'll contact you shortly through your phone number."}
                  </p>
                  <div className="rounded-xl bg-secondary/50 border border-border px-4 py-3 mt-5 mb-1">
                    <div className="text-[11px] uppercase tracking-wider text-foreground/55 font-semibold">
                      {isAr ? 'رقم الطلب' : 'Order number'}
                    </div>
                    <div className="font-mono font-bold text-foreground text-[15px] mt-0.5">{orderNumber}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <Button asChild variant="outline" className="font-bold">
                      <Link to="/orders">{isAr ? 'طلباتي' : 'My orders'}</Link>
                    </Button>
                    <Button onClick={close} className="font-bold">
                      {isAr ? 'تم' : 'Done'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ODB help popup */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-lg flex items-center gap-2">
              <HelpCircle size={18} style={{ color: '#FE7151' }} />
              {isAr ? 'ما هو رقم ODB؟' : 'What is the ODB plate number?'}
            </DialogTitle>
          </DialogHeader>
          <ol className="space-y-3 mt-2">
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-[12px] font-bold" style={{ background: '#CFEB74', color: '#16143A' }}>1</span>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {isAr
                  ? 'تأكد من وجود علبة ألياف أو لوحة معدنية خارج مبناك.'
                  : 'Make sure there is a fiber box or metal plate outside your building.'}
              </p>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full inline-flex items-center justify-center text-[12px] font-bold" style={{ background: '#CFEB74', color: '#16143A' }}>2</span>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {isAr ? 'أدخل رقم ODB المطبوع على اللوحة.' : 'Enter the fiber ODB number printed on the plate.'}
              </p>
            </li>
          </ol>
          <Button onClick={() => setShowHelp(false)} className="w-full font-bold mt-4">
            {isAr ? 'فهمت' : 'Got it'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Small reusable bits ───────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[11px] font-semibold text-foreground/70 uppercase tracking-wider">{children}</label>;
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border-2 ${active ? 'border-[var(--ob-cta)] bg-[var(--ob-cta)]/10 text-foreground' : 'border-border bg-card text-foreground/65'}`}
    >
      {icon}{label}
    </button>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-3 text-[12.5px] py-2 border-b border-border last:border-0">
      <span className="text-foreground/55 shrink-0">{label}</span>
      <span className={`text-foreground text-end ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function SummaryCard({ plan, setupFee, isAr, compact }: { plan: FtthPlan; setupFee: number; isAr: boolean; compact?: boolean }) {
  const total = plan.priceSAR + setupFee;
  return (
    <div className={`rounded-xl bg-secondary/50 border border-border p-3 ${compact ? '' : 'mb-1'}`}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-foreground/75 truncate">{plan.name}</span>
        <span className="font-bold text-foreground"><SarSymbol className="text-[11px] text-muted-foreground" /> {plan.priceSAR}</span>
      </div>
      <div className="flex justify-between text-[12px] text-foreground/60 mb-1">
        <span>{isAr ? 'رسوم التركيب' : 'Setup fee'}</span>
        <span>{setupFee > 0 ? <><SarSymbol className="text-[10px]" /> {setupFee}</> : (isAr ? 'مجاناً' : 'Free')}</span>
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between items-baseline">
        <span className="text-[12px] font-semibold text-foreground/80">{isAr ? 'الإجمالي' : 'Total'}</span>
        <span className="font-heading font-bold text-lg text-foreground"><SarSymbol className="text-xs text-muted-foreground" /> {total}</span>
      </div>
    </div>
  );
}
