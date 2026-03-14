import { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, TrendingDown, BadgeCheck, Search, X } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { usePlans } from '../context/PlansContext';
import { getValueScore, getCarrierLogo } from '../data/plans';
import { ConnectedPlanCard } from '../components/PlanCard';
import WaveLines from '../components/WaveLines';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { trackEvent } from '../lib/analytics';
import type { Plan } from '../types';

export default function SwitchSavePage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const { plans } = usePlans();

  const [currentPrice, setCurrentPrice] = useState(150);
  const [currentData, setCurrentData] = useState(20);
  const [currentMins, setCurrentMins] = useState(100);
  const [currentIntlMins, setCurrentIntlMins] = useState(0);
  const [currentSocial, setCurrentSocial] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Plan search
  const [planSearch, setPlanSearch] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const searchResults = useMemo(() => {
    if (!planSearch.trim()) return [];
    const q = planSearch.trim().toLowerCase();
    return plans
      .filter(p => p.planName.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q))
      .slice(0, 6);
  }, [plans, planSearch]);

  const selectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setPlanSearch('');
    setShowDropdown(false);
    setCurrentPrice(plan.priceSAR);
    const gb = plan.dataGB === 'Unlimited' ? 501 : parseFloat(plan.dataGB) || 20;
    setCurrentData(Math.min(gb, 501));
    const mins = plan.localCallMinutes === 'Unlimited' ? 1001 : parseFloat(plan.localCallMinutes) || 100;
    setCurrentMins(Math.min(mins, 1001));
    const intl = plan.internationalCallMinutes === 'Unlimited' ? 501 : parseFloat(plan.internationalCallMinutes) || 0;
    setCurrentIntlMins(Math.min(intl, 501));
    const social = plan.socialMediaData === 'Unlimited' ? 101 : parseFloat(plan.socialMediaData) || 0;
    setCurrentSocial(Math.min(social, 101));
    setShowResults(false);
    trackEvent('switch_plan_selected', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider });
  };

  const clearSelectedPlan = () => {
    setSelectedPlan(null);
    setPlanSearch('');
    setShowResults(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo(() => {
    if (!showResults) return [];

    return plans
      .filter(p => {
        // Must be cheaper
        if (p.priceSAR >= currentPrice) return false;
        // Must have at least as much data
        const wantUnlimitedData = currentData >= 501;
        const planGB = p.dataGB === 'Unlimited' ? Infinity : parseFloat(p.dataGB) || 0;
        if (wantUnlimitedData) { if (p.dataGB !== 'Unlimited') return false; }
        else if (planGB < currentData) return false;
        // Must have at least as many local call minutes
        const wantUnlimitedMins = currentMins >= 1001;
        const planMins = p.localCallMinutes === 'Unlimited' ? Infinity : parseFloat(p.localCallMinutes) || 0;
        if (wantUnlimitedMins) { if (p.localCallMinutes !== 'Unlimited') return false; }
        else if (planMins < currentMins) return false;
        // International calls
        if (currentIntlMins > 0) {
          const wantUnlimitedIntl = currentIntlMins >= 501;
          const planIntl = p.internationalCallMinutes === 'Unlimited' ? Infinity : parseFloat(p.internationalCallMinutes) || 0;
          if (wantUnlimitedIntl) { if (p.internationalCallMinutes !== 'Unlimited') return false; }
          else if (planIntl < currentIntlMins) return false;
        }
        // Social media data
        if (currentSocial > 0) {
          const wantUnlimitedSocial = currentSocial >= 101;
          const planSocial = p.socialMediaData === 'Unlimited' ? Infinity : parseFloat(p.socialMediaData) || 0;
          if (wantUnlimitedSocial) { if (p.socialMediaData !== 'Unlimited' && !p.socialMediaData?.toLowerCase().includes('unlimited')) return false; }
          else if (planSocial < currentSocial) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by savings (biggest first), then by value score
        const savingsA = currentPrice - a.priceSAR;
        const savingsB = currentPrice - b.priceSAR;
        if (savingsB !== savingsA) return savingsB - savingsA;
        return getValueScore(b) - getValueScore(a);
      })
      .slice(0, 3);
  }, [plans, currentPrice, currentData, currentMins, showResults]);

  const maxSaving = results.length > 0 ? Math.round((currentPrice - results[0].priceSAR) * 100) / 100 : 0;
  const yearlySaving = Math.round(maxSaving * 12 * 100) / 100;

  // Track results after they render
  useEffect(() => {
    if (!showResults) return;
    trackEvent('switch_save_results_viewed', {
      results_count: results.length,
      max_saving: maxSaving,
      yearly_saving: yearlySaving,
    });
  }, [showResults, results.length, maxSaving, yearlySaving]);

  const handleCalculate = () => {
    setShowResults(true);
    trackEvent('switch_save_calculated', {
      current_price: currentPrice,
      current_data: currentData,
      current_mins: currentMins,
    });
  };

  const isAr = lang === 'ar';

  return (
    <div className="safe-pb">
      {/* Hero */}
      <section className="relative overflow-hidden hero-gradient grain">
        <WaveLines />
        <div className="relative z-[2] max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-5 pb-4 md:pt-8 md:pb-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-black/60 text-xs font-medium mb-2 hover:text-black transition-colors">
            <ArrowLeft size={14} className="rtl:rotate-180" />
            {isAr ? 'رجوع' : 'Back'}
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
              <TrendingDown size={14} className="text-black" />
            </div>
            <h1 className="font-heading font-normal text-xl md:text-2xl text-black tracking-tight">
              {isAr ? 'غيّر ووفّر' : 'Switch & Save'}
            </h1>
          </div>
          <p className="text-black/60 text-xs md:text-sm max-w-lg">
            {isAr
              ? 'عطنا باقتك، ونجيب لك عرض أفضل.'
              : 'Tell us your plan. We\'ll find a better deal.'}
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 pb-20">
        {/* Calculator inputs */}
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <h2 className="font-heading font-bold text-sm text-foreground">
            {isAr ? 'باقتك الحالية' : 'Your Current Plan'}
          </h2>

          {/* Plan search */}
          <div ref={searchRef} className="relative">
            <label className="text-sm font-medium text-foreground mb-2 block">
              {isAr ? 'ابحث عن باقتك الحالية' : 'Find your current plan'}
            </label>
            {selectedPlan ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
                {getCarrierLogo(selectedPlan.provider) && (
                  <img src={getCarrierLogo(selectedPlan.provider)!} alt={selectedPlan.provider} className="h-5 w-auto object-contain shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedPlan.planName}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedPlan.provider} · {selectedPlan.priceSAR} SAR</p>
                </div>
                <button onClick={clearSelectedPlan} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={planSearch}
                  onChange={e => { setPlanSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={isAr ? 'مثال: Mini X 5G, Sawa...' : 'e.g. Mini X 5G, Sawa...'}
                  className="w-full ps-10 pe-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30"
                />
              </div>
            )}
            {showDropdown && searchResults.length > 0 && !selectedPlan && (
              <div className="absolute z-20 top-full mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                {searchResults.map(plan => (
                  <button
                    key={plan.id}
                    onClick={() => selectPlan(plan)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-muted/50 transition-colors"
                  >
                    {getCarrierLogo(plan.provider) && (
                      <img src={getCarrierLogo(plan.provider)!} alt={plan.provider} className="h-4 w-auto object-contain shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{plan.planName}</p>
                      <p className="text-[11px] text-muted-foreground">{plan.provider} · {plan.priceSAR} SAR</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-1.5">
              {isAr ? 'أو عدّل القيم يدوياً بالأسفل' : 'Or adjust the values manually below'}
            </p>
          </div>

          {/* Price */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">{isAr ? 'السعر الشهري' : 'Monthly price'}</label>
              <span className="text-xs font-bold text-primary">{currentPrice} SAR</span>
            </div>
            <div dir="ltr"><Slider min={30} max={1000} step={5} value={[currentPrice]} onValueChange={([v]) => { setCurrentPrice(v); setShowResults(false); }} /></div>
          </div>

          {/* Data */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">{isAr ? 'البيانات' : 'Data'}</label>
              <span className="text-xs font-bold text-primary">{currentData >= 501 ? (isAr ? 'مفتوح' : 'Unlimited') : `${currentData} GB`}</span>
            </div>
            <div dir="ltr"><Slider min={0} max={501} step={5} value={[currentData]} onValueChange={([v]) => { setCurrentData(v); setShowResults(false); }} /></div>
          </div>

          {/* Social media data */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">{isAr ? 'بيانات التواصل' : 'Social media data'}</label>
              <span className="text-xs font-bold text-primary">{currentSocial >= 101 ? (isAr ? 'مفتوح' : 'Unlimited') : `${currentSocial} GB`}</span>
            </div>
            <div dir="ltr"><Slider min={0} max={101} step={1} value={[currentSocial]} onValueChange={([v]) => { setCurrentSocial(v); setShowResults(false); }} /></div>
          </div>

          {/* Local calls */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">{isAr ? 'مكالمات محلية' : 'Local calls'}</label>
              <span className="text-xs font-bold text-primary">{currentMins >= 1001 ? (isAr ? 'مفتوح' : 'Unlimited') : `${currentMins} min`}</span>
            </div>
            <div dir="ltr"><Slider min={0} max={1001} step={50} value={[currentMins]} onValueChange={([v]) => { setCurrentMins(v); setShowResults(false); }} /></div>
          </div>

          {/* International calls */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-foreground">{isAr ? 'مكالمات دولية' : 'International calls'}</label>
              <span className="text-xs font-bold text-primary">{currentIntlMins >= 501 ? (isAr ? 'مفتوح' : 'Unlimited') : `${currentIntlMins} min`}</span>
            </div>
            <div dir="ltr"><Slider min={0} max={501} step={10} value={[currentIntlMins]} onValueChange={([v]) => { setCurrentIntlMins(v); setShowResults(false); }} /></div>
          </div>

          <Button
            onClick={handleCalculate}
            className="w-full h-12 rounded-xl font-bold text-sm"
          >
            {isAr ? 'ابحث عن باقة أوفر' : 'Find cheaper plans'}
            <ArrowRight size={16} className="rtl:rotate-180" />
          </Button>
        </div>
      </div>

      {/* Results — fullscreen bottom sheet, Netflix-style horizontal scroll */}
      {showResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowResults(false)} />

          {/* Modal */}
          <div className="relative bg-background rounded-3xl flex flex-col animate-fade-in mx-4 w-full max-w-md overflow-hidden" style={{ maxHeight: 'min(600px, 80dvh)' }}>
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-bold text-lg text-foreground">
                  {results.length > 0
                    ? (isAr ? 'باقات أوفر' : 'Cheaper plans found')
                    : (isAr ? 'النتائج' : 'Results')}
                </h3>
                <button onClick={() => setShowResults(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>

              {results.length > 0 && (
                <div className="flex items-center justify-center gap-3 bg-success/10 border border-success/20 rounded-xl px-4 py-2.5">
                  <BadgeCheck size={18} className="text-success shrink-0" />
                  <p className="text-sm font-bold text-foreground">
                    {isAr ? `وفّر لين ${maxSaving} ريال/شهر` : `Save up to ${maxSaving} SAR/mo`}
                    <span className="text-muted-foreground font-normal"> · {isAr ? `${yearlySaving} ريال/سنة` : `${yearlySaving} SAR/yr`}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Horizontal slider */}
            <div className="flex-1 min-h-0 overflow-y-auto pb-6 pt-3">
              {results.length > 0 ? (
                <div
                  className="flex gap-4 overflow-x-auto pb-2 pt-4 px-5 snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                  {results.map((plan, idx) => (
                    <div
                      key={plan.id}
                      className="relative shrink-0 snap-center flex flex-col w-[75%] max-w-[280px]"
                      onClick={() => trackEvent('switch_save_plan_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, saving: Math.round((currentPrice - plan.priceSAR) * 100) / 100, position: idx + 1 })}
                    >
                      <div className="absolute -top-3 start-3 z-10 bg-success text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                        -{Math.round((currentPrice - plan.priceSAR) * 100) / 100} SAR
                      </div>
                      <ConnectedPlanCard plan={plan} compact style={{ height: '100%' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 px-5">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <TrendingDown size={24} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-heading font-bold text-lg text-foreground">
                    {isAr ? 'ما لقينا باقات أرخص' : 'No cheaper plans found'}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm max-w-xs mx-auto">
                    {isAr
                      ? 'جرب تقلل المتطلبات أو تصفح كل الباقات.'
                      : 'Try lowering your requirements or browse all plans.'}
                  </p>
                  <Button asChild variant="ghost" className="mt-3 text-primary font-bold">
                    <Link to="/browse">
                      {isAr ? 'تصفح كل الباقات' : 'Browse all plans'}
                      <ArrowRight size={16} className="rtl:rotate-180" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
