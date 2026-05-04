/**
 * TopupVariants — preview page at /topup-variants showing 5 different
 * patterns for picking a mobile top-up amount, so the team can pick the
 * best UX. Same line summary + same "Pay" CTA in every variant — only
 * the amount-picker differs.
 *
 *  V1 Numeric keypad   — banking-app style, big display + 3x4 keypad
 *  V2 Slider           — drag slider with snap points, dynamic amount label
 *  V3 Bundle cards     — amount cards with bonus offers (+data, +bonus credit)
 *  V4 Receipt builder  — tap +5 / +10 / +25 / +50 chips to build a running total
 *  V5 Smart input      — single big input with quick chips + suggestions
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Plus, RotateCcw, Delete, CheckCircle2, Zap, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLang } from '../context/LanguageContext';

const FOCUSED = {
  carrier: 'STC',
  color: '#4F0D7F',
  plan: 'STC Jood Plus 80',
  number: '0501234567',
};
const QUICK = [10, 20, 50, 100, 200];

export default function TopupVariants() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  type V = 1 | 2 | 3 | 4 | 5;
  const [variant, setVariant] = useState<V>(1);

  const variantInfo: { id: V; name: string; hint: string }[] = [
    { id: 1, name: 'Numeric keypad', hint: 'Banking-app style — big display + custom on-screen 3×4 keypad' },
    { id: 2, name: 'Slider',         hint: 'Drag a slider with snap points; live amount label and quick jumps' },
    { id: 3, name: 'Bundle cards',   hint: 'Each amount tile shows a bonus offer (data, credit) for promotion feel' },
    { id: 4, name: 'Receipt builder',hint: 'Tap +5 / +10 / +25 chips to build the total — fast, no typing' },
    { id: 5, name: 'Smart input',    hint: 'Single big number input + chips that fill it; minimal but flexible' },
  ];

  return (
    <div className="safe-pb">
      {/* Switcher */}
      <section className="border-b border-border bg-card sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-3">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="font-heading font-bold text-base text-foreground">Top-up · UX preview</h1>
            <Link to="/profile" className="text-[11px] font-bold underline underline-offset-4 text-foreground/60 hover:text-foreground">
              ← profile
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {variantInfo.map(v => {
              const active = variant === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                  className="shrink-0 inline-flex flex-col items-start rounded-xl px-3 py-2 text-start border-2 transition-all"
                  style={active
                    ? { background: '#16143A', color: '#FFFFFF', borderColor: '#16143A' }
                    : { borderColor: 'var(--border)', color: 'inherit' }}
                >
                  <span className="text-[10px] font-mono tracking-wider opacity-60">V{v.id}</span>
                  <span className="font-bold text-[12px] leading-tight whitespace-nowrap">{v.name}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-foreground/55">{variantInfo.find(v => v.id === variant)?.hint}</p>
        </div>
      </section>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-5">
        {/* Shared selected-line summary */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border bg-secondary/30 p-2.5 mb-4">
          <span className="w-1.5 h-9 rounded-full shrink-0" style={{ background: FOCUSED.color }} />
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-[12.5px] text-foreground truncate">{FOCUSED.plan}</div>
            <div className="font-mono text-[11px] text-foreground/55" dir="ltr">{FOCUSED.number}</div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/55">{FOCUSED.carrier}</span>
        </div>

        {variant === 1 ? <V1Keypad isAr={isAr} />
         : variant === 2 ? <V2Slider isAr={isAr} />
         : variant === 3 ? <V3Bundles isAr={isAr} />
         : variant === 4 ? <V4Receipt isAr={isAr} />
         : <V5SmartInput isAr={isAr} />}
      </div>
    </div>
  );
}

// Helper — bottom Pay bar shared by every variant.
function PayBar({ amount, isAr }: { amount: number; isAr: boolean }) {
  const valid = amount >= 5 && amount <= 1000;
  return (
    <div className="mt-5 space-y-2">
      <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-3 py-2.5">
        <span className="text-[12px] text-foreground/65">{isAr ? 'إجمالي الدفع' : 'Total to pay'}</span>
        <span className="font-heading font-bold text-lg text-foreground">
          {valid ? amount : '—'} <span className="text-[12px] text-foreground/55">{isAr ? 'ر.س' : 'SAR'}</span>
        </span>
      </div>
      <Button disabled={!valid} className="w-full font-bold">
        {valid
          ? (isAr ? `ادفع ${amount} ر.س` : `Pay ${amount} SAR`)
          : (isAr ? 'اختر مبلغاً' : 'Pick an amount')}
      </Button>
    </div>
  );
}

// ─── V1 — Numeric keypad ────────────────────────────────────────────
function V1Keypad({ isAr }: { isAr: boolean }) {
  const [amount, setAmount] = useState('');
  const value = parseInt(amount, 10) || 0;

  const tap = (k: string) => {
    if (k === 'del') return setAmount(s => s.slice(0, -1));
    if (k === 'clear') return setAmount('');
    if (amount.length >= 4) return;
    setAmount(s => (s + k).replace(/^0+/, ''));
  };

  return (
    <div className="space-y-4">
      {/* Big display */}
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <div className="font-heading font-bold text-5xl tabular-nums text-foreground leading-none">
          {amount || '0'}
        </div>
        <div className="text-[12px] uppercase tracking-widest font-mono text-foreground/55 mt-2">
          {isAr ? 'ريال سعودي' : 'SAR'}
        </div>
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {QUICK.map(a => (
          <button
            key={a}
            onClick={() => setAmount(String(a))}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-mono font-bold text-[12px] transition-colors ${
              value === a ? 'bg-foreground text-background' : 'bg-secondary text-foreground/70 hover:bg-secondary/70'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button key={d} onClick={() => tap(d)}
            className="h-14 rounded-xl bg-card border border-border hover:bg-secondary/40 font-heading font-bold text-xl text-foreground transition-colors">
            {d}
          </button>
        ))}
        <button onClick={() => tap('clear')}
          className="h-14 rounded-xl bg-card border border-border hover:bg-secondary/40 font-heading font-bold text-[10px] uppercase tracking-wider text-foreground/55 transition-colors">
          {isAr ? 'مسح' : 'Clear'}
        </button>
        <button onClick={() => tap('0')}
          className="h-14 rounded-xl bg-card border border-border hover:bg-secondary/40 font-heading font-bold text-xl text-foreground transition-colors">
          0
        </button>
        <button onClick={() => tap('del')}
          className="h-14 rounded-xl bg-card border border-border hover:bg-secondary/40 inline-flex items-center justify-center text-foreground/65 transition-colors">
          <Delete size={18} />
        </button>
      </div>

      <PayBar amount={value} isAr={isAr} />
    </div>
  );
}

// ─── V2 — Slider with snap points ───────────────────────────────────
function V2Slider({ isAr }: { isAr: boolean }) {
  const [amount, setAmount] = useState(50);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <div className="text-[10.5px] uppercase tracking-widest text-foreground/55 font-mono">
          {isAr ? 'اسحب لاختيار المبلغ' : 'Drag to choose amount'}
        </div>
        <div className="font-heading font-bold text-5xl tabular-nums text-foreground leading-none mt-2">
          {amount}
        </div>
        <div className="text-[12px] uppercase tracking-widest font-mono text-foreground/55 mt-2">
          {isAr ? 'ريال سعودي' : 'SAR'}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-5">
        <input
          type="range"
          min={5}
          max={300}
          step={1}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value, 10))}
          className="w-full accent-[#16143A]"
        />
        <div className="flex justify-between mt-2 text-[10px] font-mono text-foreground/55">
          <span>5</span><span>50</span><span>100</span><span>200</span><span>300</span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
          {isAr ? 'قفز سريع' : 'Jump to'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {QUICK.map(a => (
            <button key={a} onClick={() => setAmount(a)}
              className={`py-2 rounded-lg font-mono font-bold text-[12px] border-2 transition-all ${
                amount === a ? 'border-[#16143A] bg-[#16143A] text-white' : 'border-border bg-card text-foreground hover:border-foreground/30'
              }`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <PayBar amount={amount} isAr={isAr} />
    </div>
  );
}

// ─── V3 — Bundle cards (amount + bonus offer) ──────────────────────
function V3Bundles({ isAr }: { isAr: boolean }) {
  const [amount, setAmount] = useState<number | null>(50);
  const [custom, setCustom] = useState('');
  const finalAmount = custom ? parseInt(custom, 10) || 0 : (amount ?? 0);

  const bundles = [
    { amt: 10,  bonus: isAr ? 'شحن سريع' : 'Quick top-up',                tag: '' },
    { amt: 20,  bonus: isAr ? '+5 ر.س رصيد إضافي' : '+5 SAR bonus credit', tag: isAr ? 'هدية' : 'Bonus' },
    { amt: 50,  bonus: isAr ? '+1 جيجا داتا' : '+1 GB data',                tag: isAr ? 'الأكثر شعبية' : 'Popular' },
    { amt: 100, bonus: isAr ? '+5 جيجا · أسبوع مجاني' : '+5 GB · 1 week free', tag: isAr ? 'قيمة' : 'Best value' },
    { amt: 200, bonus: isAr ? '+15 جيجا · شهر كامل' : '+15 GB · whole month',  tag: isAr ? 'كبير' : 'Big' },
  ];
  const tagBg = (label: string) => label === 'Popular' || label === 'الأكثر شعبية' ? '#FE7151'
    : label === 'Best value' || label === 'قيمة' ? '#CFEB74'
    : label === 'Bonus' || label === 'هدية' ? '#C59AFA' : '#16143A';
  const tagFg = (label: string) => label === 'Best value' || label === 'قيمة' ? '#16143A' : '#FFFFFF';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {bundles.map(b => {
          const selected = amount === b.amt && !custom;
          return (
            <button key={b.amt} onClick={() => { setAmount(b.amt); setCustom(''); }}
              className={`w-full text-start rounded-2xl border-2 p-3.5 transition-all ${
                selected ? 'border-[#16143A] bg-[#16143A]/5' : 'border-border bg-card hover:border-foreground/30'
              }`}>
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl flex items-center justify-center font-heading font-bold text-foreground" style={{ background: selected ? '#16143A' : '#F5EFFF', color: selected ? '#FFFFFF' : '#16143A' }}>
                  <span className="text-base tabular-nums">{b.amt}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-heading font-bold text-[14px] text-foreground">
                      {b.amt} <span className="text-foreground/55 text-[12px]">{isAr ? 'ر.س' : 'SAR'}</span>
                    </span>
                    {b.tag && (
                      <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: tagBg(b.tag), color: tagFg(b.tag) }}>
                        {b.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[11.5px] text-foreground/65 mt-0.5 inline-flex items-center gap-1">
                    {b.bonus.includes('GB') || b.bonus.includes('جيجا') ? <Zap size={10} /> : b.bonus.toLowerCase().includes('bonus') || b.bonus.includes('هدية') ? <Gift size={10} /> : null}
                    {b.bonus}
                  </div>
                </div>
                {selected && <CheckCircle2 size={18} className="text-emerald-600" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom */}
      <div className="rounded-2xl border border-border bg-card p-3">
        <label className="block text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
          {isAr ? 'مبلغ مخصص' : 'Other amount'}
        </label>
        <div className="relative">
          <Input
            inputMode="numeric"
            value={custom}
            onChange={(e) => { setCustom(e.target.value.replace(/\D/g, '').slice(0, 4)); setAmount(null); }}
            placeholder={isAr ? 'مثلاً 49 أو 75' : 'e.g. 49 or 75'}
            className="bg-card font-mono pr-12"
          />
          <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[11px] font-mono font-bold text-foreground/55">
            {isAr ? 'ر.س' : 'SAR'}
          </span>
        </div>
      </div>

      <PayBar amount={finalAmount} isAr={isAr} />
    </div>
  );
}

// ─── V4 — Receipt builder (tap chips to add) ──────────────────────
function V4Receipt({ isAr }: { isAr: boolean }) {
  const [amount, setAmount] = useState(0);
  const COINS = [5, 10, 25, 50, 100];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border border-border p-6 text-center">
        <div className="font-heading font-bold text-5xl tabular-nums text-foreground leading-none">
          {amount}
        </div>
        <div className="text-[12px] uppercase tracking-widest font-mono text-foreground/55 mt-2">
          {isAr ? 'ريال سعودي' : 'SAR'}
        </div>
        {amount > 0 && (
          <button onClick={() => setAmount(0)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive mt-3 hover:opacity-80">
            <RotateCcw size={11} />
            {isAr ? 'إعادة تعيين' : 'Reset'}
          </button>
        )}
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
          {isAr ? 'اضغط لإضافة' : 'Tap to add'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {COINS.map(c => (
            <button key={c} onClick={() => setAmount(a => Math.min(1000, a + c))}
              className="aspect-square rounded-2xl border-2 border-border bg-card hover:border-foreground/40 hover:-translate-y-0.5 transition-all flex flex-col items-center justify-center gap-0.5">
              <span className="font-heading font-bold text-base text-foreground tabular-nums">+{c}</span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-foreground/45">
                {isAr ? 'ر.س' : 'SAR'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick complete chips */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        <span className="text-[10.5px] uppercase tracking-wider text-foreground/55 font-mono self-center shrink-0 pr-1">
          {isAr ? 'أو اختر' : 'Or pick'}
        </span>
        {QUICK.map(a => (
          <button key={a} onClick={() => setAmount(a)}
            className={`shrink-0 px-3 py-1.5 rounded-full font-mono font-bold text-[11.5px] transition-colors ${
              amount === a ? 'bg-foreground text-background' : 'bg-secondary text-foreground/70 hover:bg-secondary/70'
            }`}>
            {a}
          </button>
        ))}
      </div>

      <PayBar amount={amount} isAr={isAr} />
    </div>
  );
}

// ─── V5 — Smart input (single big input + chips) ───────────────────
function V5SmartInput({ isAr }: { isAr: boolean }) {
  const [val, setVal] = useState('50');
  const amount = parseInt(val, 10) || 0;
  const isQuick = QUICK.includes(amount);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-card border-2 border-border focus-within:border-[#16143A] transition-colors p-6 text-center">
        <input
          type="text"
          inputMode="numeric"
          value={val}
          onChange={(e) => setVal(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="0"
          className="w-full font-heading font-bold text-6xl tabular-nums text-center bg-transparent text-foreground leading-none outline-none"
        />
        <div className="text-[12px] uppercase tracking-widest font-mono text-foreground/55 mt-2">
          {isAr ? 'ريال سعودي' : 'SAR'}
        </div>
        <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold">
          {amount >= 5 && amount <= 1000
            ? <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 size={11} /> {isAr ? 'مبلغ صالح' : 'Valid amount'}</span>
            : amount === 0
              ? <span className="text-foreground/55">{isAr ? 'أدخل المبلغ' : 'Enter an amount'}</span>
              : <span className="text-destructive">{isAr ? '5 ر.س — 1000 ر.س' : '5 SAR — 1000 SAR'}</span>}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
          {isAr ? 'الأكثر شعبية' : 'Most common'}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {QUICK.map(a => (
            <button key={a} onClick={() => setVal(String(a))}
              className={`py-2.5 rounded-xl font-mono font-bold text-[13px] border-2 transition-all ${
                amount === a ? 'border-[#16143A] bg-[#16143A] text-white' : 'border-border bg-card text-foreground hover:border-foreground/30'
              }`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Smart suggestions: "did you mean?" near common round amounts */}
      {!isQuick && amount > 0 && amount <= 500 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-foreground/55 inline-flex items-center gap-1">
            <Plus size={11} />
            {isAr ? 'أو جرب' : 'Or try'}:
          </span>
          {[5, 10, 25].map(d => {
            const candidate = Math.round((amount + d) / 5) * 5;
            if (candidate === amount || candidate < 5 || candidate > 500) return null;
            return (
              <button key={candidate} onClick={() => setVal(String(candidate))}
                className="text-[11px] font-mono font-bold text-[#FE7151] hover:underline underline-offset-4">
                {candidate} {isAr ? 'ر.س' : 'SAR'}
              </button>
            );
          })}
        </div>
      )}

      <PayBar amount={amount} isAr={isAr} />
    </div>
  );
}
