import { Wifi, Phone, MessageSquare, Plus, Check } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import SarSymbol from './SarSymbol';
import { useCompare } from '../context/CompareContext';
import { getCarrierColor, getCarrierLogo, isValidValue } from '../data/plans';
import { Link } from 'react-router-dom';

const typeBadgeStyles = {
  Prepaid: { bg: '#2563EB12', color: '#2563EB' },
  Postpaid: { bg: '#F59E0B12', color: '#D97706' },
  'Data-only': { bg: '#64748B12', color: '#64748B' },
};

export default function PlanCard({ plan, style }) {
  const { t } = useLang();
  const { togglePlan, isSelected } = useCompare();
  const selected = isSelected(plan.id);
  const carrierColor = getCarrierColor(plan.provider);
  const carrierLogo = getCarrierLogo(plan.provider);
  const badge = typeBadgeStyles[plan.planType] || typeBadgeStyles['Prepaid'];

  const perks = [];
  if (isValidValue(plan.socialMediaData) && plan.socialMediaData !== '1') {
    perks.push(plan.socialMediaData === 'Unlimited' ? 'Unlimited Social' : `${plan.socialMediaData} Social`);
  }
  if (isValidValue(plan.specialFeatures)) {
    perks.push(plan.specialFeatures);
  }

  return (
    <div
      className={`relative bg-surface rounded-2xl overflow-hidden card-hover group flex flex-col
        ${selected
          ? 'ring-2 ring-primary shadow-lg'
          : 'shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.1)]'
        }`}
      style={{
        borderInlineStart: `4px solid ${carrierColor}`,
        ...style,
      }}
    >
      {/* Selected checkmark badge */}
      {selected && (
        <div
          className="absolute top-3 end-3 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ backgroundColor: '#6366F1', animation: 'scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* ---- TOP: Carrier + Type ---- */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {carrierLogo && (
              <img
                src={carrierLogo}
                alt={plan.provider}
                className="h-5 w-auto object-contain max-w-[48px] shrink-0"
              />
            )}
            <span
              className="text-[11px] font-bold uppercase tracking-wider truncate"
              style={{ color: carrierColor }}
            >
              {plan.provider}
            </span>
          </div>
          <span
            className="text-[11px] font-bold px-2.5 py-0.5 rounded-full shrink-0"
            style={{ backgroundColor: badge.bg, color: badge.color }}
          >
            {t(`types.${plan.planType}`)}
          </span>
        </div>

        {/* ---- Plan name (fixed 2-line height) ---- */}
        <h3 className="font-heading font-bold text-lg text-text-primary leading-snug mt-2 line-clamp-2 min-h-[2.75rem]">
          {plan.planName}
        </h3>

        {/* ---- Price ---- */}
        <div className="plan-price mt-3 flex items-baseline gap-1">
          <SarSymbol className="text-sm font-medium text-text-secondary" />
          <span className="text-3xl font-heading font-bold text-text-primary">
            {plan.priceSAR}
          </span>
          <span className="text-sm text-text-tertiary">{t('planCard.perMonth')}</span>
        </div>

        {/* ---- Divider ---- */}
        <div className="h-px bg-border my-4" />

        {/* ---- Key metrics (fixed 3-slot grid) ---- */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-surface-alt/70">
            <Wifi size={14} className="text-primary" />
            <p className="font-bold text-text-primary text-[12px] leading-tight text-center">
              {isValidValue(plan.dataGB)
                ? (plan.dataGB === 'Unlimited' ? t('detail.unlimited') : `${plan.dataGB} GB`)
                : '—'}
            </p>
            <p className="text-[11px] text-text-tertiary">Data</p>
          </div>
          <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-surface-alt/70">
            <Phone size={14} className="text-primary" />
            <p className="font-bold text-text-primary text-[12px] leading-tight text-center">
              {isValidValue(plan.localCallMinutes)
                ? (plan.localCallMinutes === 'Unlimited' ? t('detail.unlimited') : `${plan.localCallMinutes}`)
                : '—'}
            </p>
            <p className="text-[11px] text-text-tertiary">Mins</p>
          </div>
          <div className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg bg-surface-alt/70">
            <MessageSquare size={14} className="text-primary" />
            <p className="font-bold text-text-primary text-[12px] leading-tight text-center">
              {isValidValue(plan.sms) && plan.sms !== '-'
                ? (plan.sms === 'Unlimited' ? t('detail.unlimited') : plan.sms)
                : '—'}
            </p>
            <p className="text-[11px] text-text-tertiary">SMS</p>
          </div>
        </div>

        {/* ---- Perks (fixed height slot) ---- */}
        <div className="min-h-[2rem] mt-3 flex flex-wrap items-start gap-1.5">
          {perks.slice(0, 2).map((perk, i) => (
            <span
              key={i}
              className="text-[11px] px-2.5 py-1 rounded-full bg-surface-alt text-text-secondary font-medium border border-border leading-tight"
            >
              {perk}
            </span>
          ))}
        </div>

        {/* ---- Spacer to push actions to bottom ---- */}
        <div className="flex-1" />

        {/* ---- Actions (always at bottom) ---- */}
        <div className="flex items-center gap-2.5 mt-4">
          <Link
            to={`/plan/${plan.id}`}
            className="flex-1 text-center py-2.5 px-4 rounded-xl text-sm font-bold
              bg-surface-alt text-text-primary hover:bg-border transition-colors duration-150 btn-press"
          >
            {t('planCard.viewDetails')}
          </Link>
          <button
            onClick={(e) => { e.preventDefault(); togglePlan(plan); }}
            className={`flex items-center gap-1.5 py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 btn-press
              ${selected
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
          >
            {selected ? <Check size={15} /> : <Plus size={15} />}
            <span>{selected ? t('planCard.selected') : t('planCard.compare')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
