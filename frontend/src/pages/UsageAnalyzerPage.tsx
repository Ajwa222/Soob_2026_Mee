/**
 * UsageAnalyzerPage — hidden lab tool at /lab/usage.
 *
 * UX: "Are you overpaying?" — two-step form, screenshot optional.
 *  Step 1 (required): search + pick your current plan
 *  Step 2 (optional): upload a data-usage screenshot for a more precise match
 *  Submit → backend matches against the real SOOB plan catalog → 3 cheaper plans
 */
import { useState, useRef, useEffect, useMemo, type ChangeEvent, type DragEvent } from 'react';
import { Upload, Loader2, RefreshCw, Check, Search, X, Sparkles, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConnectedPlanCard } from '@/components/PlanCard';
import { usePlans } from '@/context/PlansContext';
import { getCarrierLogo } from '@/data/plans';
import type { Plan } from '@/types';

type Usage = { totalGB: number; confidence: 'high' | 'medium' | 'low'; notes: string };
type Diagnosis = 'overpaying' | 'under-served' | 'good-fit' | 'no-current' | 'no-usage' | 'budget-too-low' | 'no-match';
type LabMatch = {
  usage: Usage;
  plans: Plan[];
  diagnosis: Diagnosis;
  headline: string;
  reasoning: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UsageAnalyzerPage() {
  const { plans } = usePlans();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [budget, setBudget] = useState<string>(''); // raw text so "" → empty state, parsed on submit
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LabMatch | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestWrapRef = useRef<HTMLDivElement>(null);

  // Close the suggestion dropdown when clicking outside the input area.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (suggestWrapRef.current && !suggestWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Filter plans for the autocomplete. Match the user's query against provider name
  // and plan name (case-insensitive, dedup by "Provider · Plan name") — top 6 hits.
  const suggestions = useMemo(() => {
    const q = currentPlan.trim().toLowerCase();
    if (q.length < 1) return [];
    return plans
      .filter((p) => {
        const hay = `${p.provider} ${p.planName}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6);
  }, [currentPlan, plans]);

  const handleFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Image too large (max 10 MB).');
      return;
    }
    setError(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const parsedBudget = Number(budget);
  const hasBudget = Number.isFinite(parsedBudget) && parsedBudget > 0;
  const canSubmit = hasBudget && (!!selectedPlan || !!file);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const dataUrl = file ? await fileToDataUrl(file) : undefined;
      const res = await fetch(`${API_URL}/api/lab/analyze-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: dataUrl,
          budget: parsedBudget,
          currentPlanId: selectedPlan?.id,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server error: ${res.status}`);
      }
      const match: LabMatch = await res.json();
      setResult(match);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setResult(null);
    setError(null);
    setSelectedPlan(null);
    setCurrentPlan('');
    setBudget('');
  };

  return (
    <div className="min-h-dvh flex flex-col" style={{ backgroundColor: '#F4F0FF' }}>
      <div className="max-w-xl w-full mx-auto px-4 sm:px-5 py-4 sm:py-6 flex-1 flex flex-col">
        {/* Header — SOOB branding + explains what this tool does */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-2 mb-3">
            <img
              src="/icon-192.png"
              alt="SOOB"
              width={28}
              height={28}
              decoding="async"
              className="rounded-lg shadow-sm"
            />
            {/* Use the darker end of SOOB's amber palette instead of the full
                light→dark gradient — the lightest tones (FFD568) were washing
                out against the cream background. Still on-brand amber. */}
            <span className="font-heading font-bold text-[15px] tracking-tight text-primary">
              SOOB
            </span>
            <span className="ml-1 text-[9px] font-mono uppercase tracking-[0.2em] text-primary bg-[#0A0826]/10 px-1.5 py-0.5 rounded-md">
              Lab
            </span>
          </div>
          <h1 className="font-heading font-bold text-[22px] sm:text-[26px] leading-tight text-foreground">
            Are you overpaying?
          </h1>
          <p className="mt-1.5 text-[13px] sm:text-[13.5px] text-muted-foreground leading-relaxed">
            Share your data usage and current plan — we&apos;ll tell you if there&apos;s a cheaper plan that fits your real needs.
          </p>
        </div>

        {!result && (
          <div className="flex-1 flex flex-col gap-4 min-h-0">
            {/* ── Step 1 — Pick your current plan (required) ────────────── */}
            <section ref={suggestWrapRef} className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <StepBadge n={1} filled={!!selectedPlan} />
                <label className="text-[13px] font-semibold text-foreground">
                  Your current plan
                </label>
              </div>

              {selectedPlan ? (
                <div className="flex items-center gap-3 rounded-xl border-2 border-primary/30 bg-card px-3.5 py-2.5">
                  {getCarrierLogo(selectedPlan.provider) && (
                    <img
                      src={getCarrierLogo(selectedPlan.provider)!}
                      alt={selectedPlan.provider}
                      className="h-5 w-auto object-contain shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-foreground truncate">{selectedPlan.planName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {selectedPlan.provider} · {selectedPlan.priceSAR} SAR/mo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(null);
                      setCurrentPlan('');
                    }}
                    className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1"
                    aria-label="Clear selected plan"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={currentPlan}
                    onChange={(e) => {
                      setCurrentPlan(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Search by plan name — e.g. Mofawtar, Sawa"
                    className="w-full ps-10 pe-4 py-3 rounded-xl border border-border bg-card text-[13.5px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-colors"
                    autoComplete="off"
                  />
                </div>
              )}
              {showSuggestions && !selectedPlan && suggestions.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-[280px] overflow-y-auto">
                  {suggestions.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setCurrentPlan(`${plan.provider} · ${plan.planName}`);
                        // Pre-fill budget to current plan price so the user has a sensible
                        // starting number — they can still change it before submitting.
                        if (!budget) setBudget(String(plan.priceSAR));
                        setShowSuggestions(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors"
                    >
                      {getCarrierLogo(plan.provider) && (
                        <img
                          src={getCarrierLogo(plan.provider)!}
                          alt={plan.provider}
                          className="h-4 w-auto object-contain shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13.5px] font-medium text-foreground truncate">{plan.planName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {plan.provider} · {plan.priceSAR} SAR
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* ── Step 2 — Upload screenshot (optional, for precision) ── */}
            <section className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-1.5">
                <StepBadge n={2} filled={!!file} />
                <label className="text-[13px] font-semibold text-foreground">
                  Data usage screenshot
                </label>
                <span className="text-[11px] text-muted-foreground">— optional, more precise</span>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative flex-1 min-h-[110px] rounded-xl border-2 border-dashed cursor-pointer transition-colors flex items-center justify-center ${
                  isDragging
                    ? 'border-primary bg-primary/5'
                    : preview
                      ? 'border-primary/40 bg-card p-2'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5 bg-card p-3'
                }`}
              >
                {preview ? (
                  <div className="flex flex-col items-center gap-1.5 w-full">
                    <img
                      src={preview}
                      alt="Your usage screenshot"
                      className="max-h-[160px] rounded-lg border border-border object-contain"
                    />
                    <div className="text-[11px] text-muted-foreground">Tap to change</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Upload size={16} />
                    </div>
                    <div className="font-medium text-[13px] text-foreground">
                      Tap to upload a screenshot
                    </div>
                    <div className="text-[10.5px] text-muted-foreground">
                      We&apos;ll read your actual usage to find a better fit
                    </div>
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  onChange={onInputChange}
                  className="hidden"
                />
              </div>

              {/* Collapsible "how to" — off by default so it doesn't clutter */}
              <details className="group mt-1.5 text-[11.5px] text-muted-foreground">
                <summary className="flex items-center gap-1 cursor-pointer select-none list-none hover:text-foreground transition-colors">
                  <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                  How do I get this screenshot?
                </summary>
                <div className="mt-1.5 pl-4 space-y-0.5">
                  <div><span className="font-semibold text-foreground">1.</span> Open Settings (the gears app).</div>
                  <div><span className="font-semibold text-foreground">2.</span> Tap Cellular (near the top).</div>
                  <div><span className="font-semibold text-foreground">3.</span> Scroll to Cellular Data and screenshot.</div>
                  <div className="text-[10.5px] pt-1">
                    Android: Settings → Network &amp; Internet → SIM → App data usage.
                  </div>
                </div>
              </details>
            </section>

            {/* ── Step 3 — Budget (required) ──────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-1.5">
                <StepBadge n={3} filled={hasBudget} />
                <label className="text-[13px] font-semibold text-foreground">
                  Your monthly budget
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={5}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={selectedPlan ? String(selectedPlan.priceSAR) : 'e.g. 150'}
                  className="w-full ps-4 pe-16 py-3 rounded-xl border border-border bg-card text-[13.5px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-colors"
                />
                <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 end-3.5 text-[12px] font-semibold text-muted-foreground">
                  SAR/mo
                </span>
              </div>
            </section>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-[12.5px] text-destructive">
                {error}
              </div>
            )}

            <Button
              onClick={onSubmit}
              disabled={!canSubmit || loading}
              className="w-full h-12 font-semibold text-[15px]"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  {file && selectedPlan ? 'Check my match' : selectedPlan ? 'Find cheaper plans' : 'Analyze my usage'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-5">
            {/* Warning — user uploaded a photo but GPT couldn't extract usage */}
            {file && (result.usage.totalGB <= 0 || result.usage.confidence === 'low') && (
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13.5px] text-amber-900">
                    We couldn&apos;t read your screenshot
                  </div>
                  <div className="text-[12.5px] text-amber-800 leading-relaxed mt-0.5">
                    {result.usage.notes ||
                      `The image doesn't show a clear data-usage number. We've matched plans based on your current plan and budget instead.`}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (preview) URL.revokeObjectURL(preview);
                      setPreview(null);
                      setResult(null);
                    }}
                    className="mt-2 text-[12px] font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                  >
                    Upload a different screenshot →
                  </button>
                </div>
              </div>
            )}

            {/* Diagnosis banner — color + emoji change with the verdict */}
            <div
              className={`rounded-2xl border-2 p-5 shadow-sm ${
                result.diagnosis === 'overpaying'
                  ? 'bg-amber-50 border-amber-500/40'
                  : result.diagnosis === 'under-served'
                    ? 'bg-rose-50 border-rose-500/40'
                    : result.diagnosis === 'good-fit'
                      ? 'bg-emerald-50 border-emerald-500/40'
                      : result.diagnosis === 'budget-too-low' || result.diagnosis === 'no-match'
                        ? 'bg-rose-50 border-rose-500/40'
                        : 'bg-card border-primary/30'
              }`}
            >
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest mb-2">
                {diagnosisLabel(result.diagnosis)}
              </div>
              <div className="font-heading font-bold text-[22px] sm:text-[24px] text-foreground leading-tight">
                {result.headline}
              </div>
              <p className="mt-1.5 text-[13.5px] text-foreground/75 leading-relaxed">
                {result.reasoning}
              </p>

              {/* Usage vs current plan visualization — only if both are known */}
              {selectedPlan && result.usage.totalGB > 0 && (
                <div className="mt-4 pt-4 border-t border-foreground/10">
                  <div className="flex items-baseline justify-between text-[11.5px] mb-1.5">
                    <span className="text-muted-foreground">You used</span>
                    <span className="font-semibold text-foreground">
                      {result.usage.totalGB.toFixed(1)} GB of {selectedPlan.dataGB}
                      {parsePlanDataLabel(selectedPlan.dataGB) ? '' : ' GB'}
                    </span>
                  </div>
                  <UsageBar usageGB={result.usage.totalGB} planData={selectedPlan.dataGB} />
                </div>
              )}
            </div>

            {/* Horizontal plan strip — uses the same ConnectedPlanCard as /plans, /advisor etc.
                so the card design matches the browsing experience. */}
            {result.plans.length > 0 && (
              <div>
                <div
                  className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth -mx-5 px-5 pb-3 [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {result.plans.map((p) => (
                    <div
                      key={p.id}
                      className="shrink-0 snap-start w-[300px] sm:w-[320px]"
                    >
                      <ConnectedPlanCard plan={p as Plan} source="lab-usage" />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/80 px-1 -mt-1">
                  Swipe or drag to see all options →
                </p>
              </div>
            )}

            <Button
              onClick={reset}
              variant="outline"
              className="w-full h-11 font-medium text-[14px]"
            >
              <RefreshCw size={14} className="mr-2" />
              Start over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n, filled }: { n: number; filled: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold shrink-0 transition-colors ${
        filled ? 'bg-[var(--ob-cta)] text-[var(--ob-cta-text)]' : 'bg-primary/10 text-primary'
      }`}
    >
      {filled ? <Check size={11} strokeWidth={3} /> : n}
    </span>
  );
}

/** Visual label for the 5 diagnosis states. */
function diagnosisLabel(d: Diagnosis): React.ReactNode {
  if (d === 'overpaying') return <span className="text-amber-700">💸 You&apos;re overpaying</span>;
  if (d === 'under-served') return <span className="text-rose-700">⚠️ Your plan is too small</span>;
  if (d === 'good-fit') return <span className="text-emerald-700">✅ Your plan fits</span>;
  if (d === 'budget-too-low') return <span className="text-rose-700">⚠️ Budget too low</span>;
  if (d === 'no-match') return <span className="text-rose-700">⚠️ Closest we can offer</span>;
  return <span className="text-primary">✨ Suggested plans</span>;
}

/** "Unlimited" / "20 GB" → numeric GB, Infinity for unlimited, 0 for unparseable. */
function parsePlanDataLabel(label: string): boolean {
  // Returns true if the label already includes "GB" (so we don't double-append)
  return /gb|unlimited/i.test(label);
}
function parsePlanDataNum(label: string): number {
  if (!label || label === '-') return 0;
  if (/unlimited/i.test(label)) return Infinity;
  const n = parseFloat(label);
  return Number.isFinite(n) ? n : 0;
}

/** Visual bar showing usage vs plan data allowance. Changes color by utilization. */
function UsageBar({ usageGB, planData }: { usageGB: number; planData: string }) {
  const planGB = parsePlanDataNum(planData);
  const isUnlimited = !Number.isFinite(planGB);
  const pct = isUnlimited ? Math.min(100, usageGB / 200 * 100) : Math.min(100, (usageGB / planGB) * 100);
  const color =
    pct < 60 ? 'bg-amber-500' : pct < 90 ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div className="relative h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
      <div className={`absolute inset-y-0 left-0 ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

