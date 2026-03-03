import { X, ChevronRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import SarSymbol from './SarSymbol';
import { useCompare } from '../context/CompareContext';
import { getCarrierColor, getCarrierLogo, isValidValue } from '../data/plans';
import { Link } from 'react-router-dom';
import type { Plan } from '../types';

/* Short display value — keep everything compact */
function shortVal(val: string): string {
  if (!val || val === '-' || val === '') return '—';
  if (val === 'Unlimited' || val.toLowerCase?.().includes('unlimited')) return '__unlimited__';
  return val;
}

interface Attr {
  en: string;
  ar: string;
  get: (p: Plan) => string;
  unit: string;
  unitClass?: string;
  compare: string;
}

const attrs: Attr[] = [
  { en: 'Price', ar: 'السعر', get: (p: Plan) => `${p.priceSAR}`, unit: '\xEA', unitClass: 'saudi-riyal', compare: 'lowest' },
  { en: 'Data', ar: 'البيانات', get: (p: Plan) => isValidValue(p.dataGB) ? shortVal(p.dataGB) : '—', unit: 'GB', compare: 'highest' },
  { en: 'Calls', ar: 'مكالمات', get: (p: Plan) => isValidValue(p.localCallMinutes) ? shortVal(p.localCallMinutes) : '—', unit: 'min', compare: 'highest' },
  { en: 'SMS', ar: 'رسائل', get: (p: Plan) => isValidValue(p.sms) ? shortVal(p.sms) : '—', unit: '', compare: 'highest' },
  { en: 'Social', ar: 'تواصل', get: (p: Plan) => isValidValue(p.socialMediaData) ? shortVal(p.socialMediaData) : '—', unit: '', compare: 'highest' },
  { en: 'Int\'l', ar: 'دولية', get: (p: Plan) => isValidValue(p.internationalCallMinutes) ? shortVal(p.internationalCallMinutes) : '—', unit: 'min', compare: 'highest' },
  { en: 'Roaming', ar: 'تجوال', get: (p: Plan) => isValidValue(p.roamingDataGB) ? shortVal(p.roamingDataGB) : '—', unit: 'GB', compare: 'highest' },
  { en: 'Contract', ar: 'العقد', get: (p: Plan) => isValidValue(p.contractTerms) ? p.contractTerms : '—', unit: '', compare: 'none' },
  { en: 'Extras', ar: 'إضافات', get: (p: Plan) => isValidValue(p.specialFeatures) ? p.specialFeatures : '—', unit: '', compare: 'none' },
];

function getBest(plans: Plan[], attr: Attr): number[] {
  if (attr.compare === 'none') return [];
  const vals = plans.map(p => attr.get(p));
  if (attr.compare === 'lowest') {
    const nums = vals.map(v => parseFloat(v) || Infinity);
    const min = Math.min(...nums);
    return nums.map((n, i) => n === min ? i : -1).filter(i => i >= 0);
  }
  if (vals.some(v => v === '__unlimited__')) return vals.map((v, i) => v === '__unlimited__' ? i : -1).filter(i => i >= 0);
  const nums = vals.map(v => parseFloat(v) || 0);
  const max = Math.max(...nums);
  if (max === 0) return [];
  return nums.map((n, i) => n === max ? i : -1).filter(i => i >= 0);
}

export default function CompareOverlay() {
  const { lang, t } = useLang();
  const { selectedPlans, setShowOverlay, removePlan } = useCompare();
  const cols = selectedPlans.length;

  return (
    <div className="fixed inset-0 z-[60]" onClick={(e) => { if (e.target === e.currentTarget) setShowOverlay(false); }}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" style={{ animation: 'fadeIn 0.2s ease-out' }} />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Compare plans"
        className="relative h-full sm:h-auto sm:max-h-[90vh] sm:my-8 sm:mx-auto sm:max-w-xl md:max-w-2xl sm:rounded-2xl
          bg-bg flex flex-col overflow-hidden"
        style={{ animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-heading font-bold text-lg text-text-primary">
            {t('compare.title')}
          </h2>
          <button
            onClick={() => setShowOverlay(false)}
            aria-label="Close comparison"
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-surface-alt transition-colors"
          >
            <X size={20} className="text-text-secondary" />
          </button>
        </div>

        {/* Scrollable grid */}
        <div className="flex-1 overflow-y-auto">

          {/* Plan column headers */}
          <div className="grid border-b border-border bg-surface sticky top-0 z-[5]"
            style={{ gridTemplateColumns: `minmax(56px, 72px) repeat(${cols}, 1fr)` }}>
            <div />
            {selectedPlans.map((plan) => {
              const color = getCarrierColor(plan.provider);
              const logo = getCarrierLogo(plan.provider);
              return (
                <div key={plan.id} className="relative flex flex-col items-center py-4 px-1 gap-1.5 border-s border-border/40">
                  <button
                    onClick={() => removePlan(plan.id)}
                    className="absolute top-2 end-2 w-5 h-5 rounded-full bg-error/10
                      flex items-center justify-center"
                  >
                    <X size={10} className="text-error" />
                  </button>
                  {logo && <img src={logo} alt={plan.provider} className="h-5 w-auto object-contain" />}
                  <p className="text-[12px] sm:text-[13px] font-semibold text-text-primary text-center leading-tight line-clamp-2 px-1">
                    {plan.planName}
                  </p>
                  <p className="font-heading font-bold text-base leading-none" style={{ color }}>
                    {plan.priceSAR}
                  </p>
                  <span className="text-[9px] text-text-tertiary -mt-1 flex items-center gap-0.5"><SarSymbol className="text-[9px]" />{t('compare.perMonth')}</span>
                </div>
              );
            })}
          </div>

          {/* Attribute rows */}
          {attrs.map((attr, ri) => {
            const best = getBest(selectedPlans, attr);
            return (
              <div
                key={attr.en}
                className={`grid items-center ${ri % 2 === 0 ? 'bg-surface' : 'bg-surface-alt/40'}
                  ${ri < attrs.length - 1 ? 'border-b border-border/30' : ''}`}
                style={{ gridTemplateColumns: `minmax(56px, 72px) repeat(${cols}, 1fr)` }}
              >
                {/* Label */}
                <div className="px-3 py-3 text-[11px] font-bold text-text-tertiary uppercase tracking-wide">
                  {lang === 'ar' ? attr.ar : attr.en}
                </div>

                {/* Values */}
                {selectedPlans.map((plan, ci) => {
                  const val = attr.get(plan);
                  const isBest = best.includes(ci);
                  const isDash = val === '—';
                  return (
                    <div
                      key={plan.id}
                      className={`py-3 px-2 text-center border-s border-border/30
                        ${isBest && !isDash ? 'bg-success/[0.06]' : ''}`}
                    >
                      <span className={`text-[13px] font-bold
                        ${isBest && !isDash ? 'text-success' : isDash ? 'text-text-tertiary' : 'text-text-primary'}`}>
                        {val === '__unlimited__' ? t('detail.unlimited') : val}
                      </span>
                      {!isDash && val !== '__unlimited__' && attr.unit && (
                        <span className={`text-[10px] text-text-tertiary ms-0.5 ${attr.unitClass || ''}`}>{attr.unit}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer: Get Plan buttons */}
        <div className="shrink-0 border-t border-border bg-surface">
          <div className="grid" style={{ gridTemplateColumns: `minmax(56px, 72px) repeat(${cols}, 1fr)` }}>
            <div />
            {selectedPlans.map((plan) => (
                <div key={plan.id} className="px-2 py-3">
                  <Link
                    to={`/plan/${plan.id}`}
                    onClick={() => setShowOverlay(false)}
                    className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-white text-[13px] font-bold min-h-11
                      bg-gradient-to-r from-primary to-primary-dark hover:shadow-lg hover:shadow-primary/25
                      active:scale-[0.97] transition-all"
                  >
                    {t('compare.viewPlan')}
                    <ChevronRight size={14} className="rtl:rotate-180" />
                  </Link>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
