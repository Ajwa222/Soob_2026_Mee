import { useMemo } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLang } from '../context/LanguageContext';
import SarSymbol from './SarSymbol';
import { useCompare } from '../context/CompareContext';
import { usePersona } from '../context/PersonaContext';
import { SEGMENT_WEIGHTS } from '../lib/persona';
import { getCarrierColor, getCarrierLogo, isValidValue } from '../data/plans';
import { trackEvent } from '../lib/analytics';
import { Link } from 'react-router-dom';
import type { Plan, PersonaSegment } from '../types';

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
  weightKey?: keyof typeof SEGMENT_WEIGHTS.gamer;
}

const BASE_ATTRS: Attr[] = [
  { en: 'Price', ar: 'السعر', get: (p: Plan) => `${p.priceSAR}`, unit: '\xEA', unitClass: 'saudi-riyal', compare: 'lowest', weightKey: 'price' },
  { en: 'Data', ar: 'البيانات', get: (p: Plan) => isValidValue(p.dataGB) ? shortVal(p.dataGB) : '—', unit: 'GB', compare: 'highest', weightKey: 'data' },
  { en: 'Calls', ar: 'مكالمات', get: (p: Plan) => isValidValue(p.localCallMinutes) ? shortVal(p.localCallMinutes) : '—', unit: 'min', compare: 'highest', weightKey: 'calls' },
  { en: 'SMS', ar: 'رسائل', get: (p: Plan) => isValidValue(p.sms) ? shortVal(p.sms) : '—', unit: '', compare: 'highest' },
  { en: 'Social', ar: 'تواصل', get: (p: Plan) => isValidValue(p.socialMediaData) ? shortVal(p.socialMediaData) : '—', unit: '', compare: 'highest', weightKey: 'social' },
  { en: 'Int\'l', ar: 'دولية', get: (p: Plan) => isValidValue(p.internationalCallMinutes) ? shortVal(p.internationalCallMinutes) : '—', unit: 'min', compare: 'highest', weightKey: 'international' },
  { en: 'Roaming', ar: 'تجوال', get: (p: Plan) => isValidValue(p.roamingDataGB) ? shortVal(p.roamingDataGB) : '—', unit: 'GB', compare: 'highest', weightKey: 'roaming' },
  { en: 'Contract', ar: 'العقد', get: (p: Plan) => isValidValue(p.contractTerms) ? p.contractTerms : '—', unit: '', compare: 'none' },
  { en: 'Extras', ar: 'إضافات', get: (p: Plan) => isValidValue(p.specialFeatures) ? p.specialFeatures : '—', unit: '', compare: 'none' },
];

/** Sort attrs by persona weights — most important metrics first */
function getOrderedAttrs(segment: PersonaSegment | null): Attr[] {
  if (!segment) return BASE_ATTRS;
  const weights = SEGMENT_WEIGHTS[segment];
  return [...BASE_ATTRS].sort((a, b) => {
    const wa = a.weightKey ? weights[a.weightKey] : 0;
    const wb = b.weightKey ? weights[b.weightKey] : 0;
    return wb - wa;
  });
}

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
  const { segment } = usePersona();
  const attrs = useMemo(() => getOrderedAttrs(segment), [segment]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) setShowOverlay(false); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{t('compare.title')}</DialogTitle>
            <button
              onClick={() => setShowOverlay(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[72px]" />
                {selectedPlans.map((plan) => {
                  const color = getCarrierColor(plan.provider);
                  const logo = getCarrierLogo(plan.provider);
                  return (
                    <TableHead key={plan.id} className="text-center p-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <button
                          onClick={() => removePlan(plan.id)}
                          className="text-[10px] text-destructive hover:underline self-end"
                        >
                          {lang === 'ar' ? 'حذف' : 'Remove'}
                        </button>
                        {logo && <img src={logo} alt={plan.provider} className="h-5 w-auto object-contain" />}
                        <p className="text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">
                          {plan.planName}
                        </p>
                        <p className="font-heading font-bold text-base leading-none" style={{ color }}>
                          {plan.priceSAR}
                        </p>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <SarSymbol className="text-[9px]" />{t('compare.perMonth')}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {attrs.map((attr) => {
                const best = getBest(selectedPlans, attr);
                return (
                  <TableRow key={attr.en}>
                    <TableCell className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide px-3">
                      {lang === 'ar' ? attr.ar : attr.en}
                    </TableCell>
                    {selectedPlans.map((plan, ci) => {
                      const val = attr.get(plan);
                      const isBest = best.includes(ci);
                      const isDash = val === '—';
                      return (
                        <TableCell
                          key={plan.id}
                          className={`text-center ${isBest && !isDash ? 'bg-success/[0.06]' : ''}`}
                        >
                          <span className={`text-[13px] font-bold
                            ${isBest && !isDash ? 'text-success' : isDash ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {val === '__unlimited__' ? t('detail.unlimited') : val}
                          </span>
                          {!isDash && val !== '__unlimited__' && attr.unit && (
                            <span className={`text-[10px] text-muted-foreground ms-0.5 ${attr.unitClass || ''}`}>{attr.unit}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-3 pb-6 md:pb-3 flex gap-2">
          {selectedPlans.map((plan) => (
            <Button key={plan.id} className="flex-1" asChild>
              <Link to={`/plan/${plan.id}`} onClick={() => { trackEvent('compare_view_plan_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider }); setShowOverlay(false); }}>
                {t('compare.viewPlan')}
                <ChevronRight size={14} className="rtl:rotate-180" />
              </Link>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
