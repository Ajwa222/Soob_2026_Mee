import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TrendingDown, Sparkles, BadgeCheck, Search, X } from 'lucide-react';
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
  const { plans } = usePlans();

  const [currentPrice, setCurrentPrice] = useState(150);
  const [currentData, setCurrentData] = useState(20);
  const [currentMins, setCurrentMins] = useState(100);
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
    const gb = plan.dataGB === 'Unlimited' ? 100 : parseFloat(plan.dataGB) || 20;
    setCurrentData(Math.min(gb, 100));
    const mins = plan.localCallMinutes === 'Unlimited' ? 1000 : parseFloat(plan.localCallMinutes) || 100;
    setCurrentMins(Math.min(mins, 1000));
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
        const planGB = p.dataGB === 'Unlimited' ? Infinity : parseFloat(p.dataGB) || 0;
        if (planGB < currentData) return false;
        // Must have at least as many minutes
        const planMins = p.localCallMinutes === 'Unlimited' ? Infinity : parseFloat(p.localCallMinutes) || 0;
        if (planMins < currentMins) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by savings (biggest first), then by value score
        const savingsA = currentPrice - a.priceSAR;
        const savingsB = currentPrice - b.priceSAR;
        if (savingsB !== savingsA) return savingsB - savingsA;
        return getValueScore(b) - getValueScore(a);
      })
      .slice(0, 6);
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
        <div className="relative z-[2] max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-6 md:pt-12 md:pb-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
              <TrendingDown size={18} className="text-white" />
            </div>
            <h1 className="font-heading font-normal text-2xl md:text-3xl text-black tracking-tight">
              {isAr ? 'احسب توفيرك' : 'Switch & Save'}
            </h1>
          </div>
          <p className="text-black/60 text-sm md:text-base max-w-lg">
            {isAr
              ? 'ادخل تفاصيل باقتك الحالية وبنلقالك باقات أرخص وأفضل.'
              : 'Enter your current plan details and we\'ll find cheaper plans with the same or better features.'}
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8 pb-20">
        {/* Calculator inputs */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <h2 className="font-heading font-bold text-lg text-foreground">
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

          {/* Price slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                {isAr ? 'كم تدفع شهرياً؟' : 'Monthly price'}
              </label>
              <span className="text-sm font-bold text-primary">{currentPrice} SAR</span>
            </div>
            <div dir="ltr">
              <Slider
                min={30}
                max={500}
                step={5}
                value={[currentPrice]}
                onValueChange={([v]) => { setCurrentPrice(v); setShowResults(false); }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
              <span>30 SAR</span>
              <span>500 SAR</span>
            </div>
          </div>

          {/* Data slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                {isAr ? 'كم بيانات عندك؟' : 'Data included'}
              </label>
              <span className="text-sm font-bold text-primary">{currentData} GB</span>
            </div>
            <div dir="ltr">
              <Slider
                min={1}
                max={100}
                step={1}
                value={[currentData]}
                onValueChange={([v]) => { setCurrentData(v); setShowResults(false); }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
              <span>1 GB</span>
              <span>100 GB</span>
            </div>
          </div>

          {/* Minutes slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                {isAr ? 'كم دقائق مكالمات؟' : 'Call minutes'}
              </label>
              <span className="text-sm font-bold text-primary">
                {currentMins >= 1000 ? (isAr ? 'مفتوح' : 'Unlimited') : `${currentMins} min`}
              </span>
            </div>
            <div dir="ltr">
              <Slider
                min={0}
                max={1000}
                step={50}
                value={[currentMins]}
                onValueChange={([v]) => { setCurrentMins(v); setShowResults(false); }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[11px] text-muted-foreground">
              <span>0 min</span>
              <span>{isAr ? 'مفتوح' : 'Unlimited'}</span>
            </div>
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

      {/* Results — wider container */}
      {showResults && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-20">
          <div className="mt-8 space-y-6 animate-fade-up">
            {results.length > 0 ? (
              <>
                {/* Savings highlight */}
                <div className="bg-success/10 border border-success/20 rounded-2xl p-5 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <BadgeCheck size={20} className="text-success" />
                    <span className="text-sm font-bold text-success">
                      {isAr ? 'لقينا لك خيارات أوفر!' : 'We found cheaper options!'}
                    </span>
                  </div>
                  <p className="text-2xl font-heading font-bold text-foreground">
                    {isAr ? `وفّر لين ${maxSaving} ريال/شهر` : `Save up to ${maxSaving} SAR/month`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isAr
                      ? `يعني ${yearlySaving} ريال بالسنة`
                      : `That's ${yearlySaving} SAR per year`}
                  </p>
                </div>

                {/* Plan cards */}
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground mb-4">
                    {isAr ? `${results.length} باقات أوفر` : `${results.length} cheaper plan${results.length > 1 ? 's' : ''} found`}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.map((plan, idx) => (
                      <div key={plan.id} className="relative" onClick={() => trackEvent('switch_save_plan_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, saving: Math.round((currentPrice - plan.priceSAR) * 100) / 100, position: idx + 1 })}>
                        <div className="absolute -top-2.5 start-3 z-10 bg-success text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          -{Math.round((currentPrice - plan.priceSAR) * 100) / 100} SAR
                        </div>
                        <ConnectedPlanCard plan={plan} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* No results */
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <TrendingDown size={28} className="text-muted-foreground" />
                </div>
                <h3 className="font-heading font-bold text-xl text-foreground">
                  {isAr ? 'ما لقينا باقات أرخص' : 'No cheaper plans found'}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                  {isAr
                    ? 'يبدو إن باقتك الحالية سعرها كويس! جرب تقلل المتطلبات أو تصفح كل الباقات.'
                    : 'Looks like your current plan is well-priced! Try lowering your requirements or browse all plans.'}
                </p>
                <Button asChild variant="ghost" className="mt-4 text-primary font-bold">
                  <Link to="/browse">
                    {isAr ? 'تصفح كل الباقات' : 'Browse all plans'}
                    <ArrowRight size={16} className="rtl:rotate-180" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advisor CTA */}
      {!showResults && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pb-20">
          <div className="mt-8">
            <Link
              to="/advisor"
              className="relative block overflow-hidden rounded-2xl p-6 group hero-gradient grain"
            >
              <WaveLines />
              <div className="relative z-[2] flex items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF0D0] text-black/70 text-[11px] font-medium mb-2">
                    <Sparkles size={11} />
                    {t('home.just30Seconds')}
                  </div>
                  <h3 className="font-heading font-bold text-base md:text-lg text-black leading-tight">
                    {isAr ? 'مو متأكد من باقتك؟' : 'Not sure about your plan?'}
                  </h3>
                  <p className="mt-1 text-black/60 text-xs max-w-sm">
                    {isAr ? 'المستشار الذكي يساعدك تلقى الباقة المثالية' : 'Our Smart Advisor helps you find the perfect plan'}
                  </p>
                </div>
                <div className="shrink-0 w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <ArrowRight size={16} className="text-primary rtl:rotate-180" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
