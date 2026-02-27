import { useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, ExternalLink, Plus, Check,
  Wifi, Phone, MessageSquare, Globe2, Share2, Clock,
  Zap, ArrowLeft, ArrowRight, Plane,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import SarSymbol from '../components/SarSymbol';
import { useCompare } from '../context/CompareContext';
import {
  PLANS_DATA, getCarrierLogo, isValidValue,
} from '../data/plans';

const typeBadgeStyles = {
  Prepaid: { bg: '#2563EB12', color: '#2563EB' },
  Postpaid: { bg: '#F59E0B12', color: '#D97706' },
  'Data-only': { bg: '#64748B12', color: '#64748B' },
};

export default function PlanDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { togglePlan, isSelected } = useCompare();
  const navigate = useNavigate();

  const plan = useMemo(() => PLANS_DATA.find(p => p.id === Number(id)), [id]);

  if (!plan) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h1 className="font-heading font-bold text-2xl text-text-primary">
          {lang === 'ar' ? 'الباقة غير موجودة' : 'Plan not found'}
        </h1>
        <p className="text-text-secondary mt-2">
          {lang === 'ar' ? 'الباقة اللي تبحث عنها غير متوفرة' : "The plan you're looking for doesn't exist."}
        </p>
        <Link
          to="/plans"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-primary text-white font-bold text-sm btn-press"
        >
          {t('detail.backToPlans')}
        </Link>
      </div>
    );
  }

  const carrierLogo = getCarrierLogo(plan.provider);
  const badge = typeBadgeStyles[plan.planType] || typeBadgeStyles['Prepaid'];
  const selected = isSelected(plan.id);
  const Chevron = lang === 'ar' ? ChevronLeft : ChevronRight;
  const BackArrow = lang === 'ar' ? ArrowRight : ArrowLeft;

  // Build specs list
  const specs = [
    { icon: Wifi, label: t('detail.data'), value: isValidValue(plan.dataGB) ? (plan.dataGB === 'Unlimited' ? t('detail.unlimited') : `${plan.dataGB} GB`) : null, highlight: plan.dataGB === 'Unlimited' },
    { icon: Phone, label: t('detail.localCalls'), value: isValidValue(plan.localCallMinutes) ? (plan.localCallMinutes === 'Unlimited' ? t('detail.unlimited') : `${plan.localCallMinutes} ${t('detail.mins')}`) : null, highlight: plan.localCallMinutes === 'Unlimited' },
    { icon: MessageSquare, label: t('detail.sms'), value: isValidValue(plan.sms) && plan.sms !== '-' ? (plan.sms === 'Unlimited' ? t('detail.unlimited') : plan.sms) : null, highlight: false },
    { icon: Share2, label: t('detail.socialMedia'), value: isValidValue(plan.socialMediaData) && plan.socialMediaData !== '1' ? (plan.socialMediaData === 'Unlimited' || plan.socialMediaData.toLowerCase?.().includes('unlimited') ? t('detail.unlimited') : plan.socialMediaData) : null, highlight: plan.socialMediaData === 'Unlimited' },
    { icon: Globe2, label: t('detail.intlCalls'), value: isValidValue(plan.internationalCallMinutes) ? `${plan.internationalCallMinutes} ${t('detail.mins')}` : null, highlight: false },
    { icon: Plane, label: t('detail.roaming'), value: isValidValue(plan.roamingDataGB) ? `${plan.roamingDataGB} GB` : null, highlight: false },
    { icon: Clock, label: t('detail.contract'), value: isValidValue(plan.contractTerms) ? plan.contractTerms : null, highlight: false },
  ];

  const activeSpecs = specs.filter(s => s.value !== null);
  const hasFeatures = isValidValue(plan.specialFeatures);

  return (
    <div className="relative z-10 pb-28 md:pb-0 backdrop-blur-xl bg-[var(--color-bg)]/80">
      {/* ========= BREADCRUMB ========= */}
      <div className="bg-surface-alt/50 border-b border-border/50">
        <div className="max-w-[1280px] mx-auto px-6 md:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-text-tertiary">
            <Link to="/" className="hover:text-text-primary transition-colors">
              {t('nav.home')}
            </Link>
            <Chevron size={14} />
            <Link to="/plans" className="hover:text-text-primary transition-colors">
              {t('nav.plans')}
            </Link>
            <Chevron size={14} />
            <span className="text-text-primary font-medium truncate max-w-[200px]">
              {plan.planName}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 md:px-8">

        {/* ========= PLAN HEADER ========= */}
        <div className="pt-6 pb-5" style={{ animation: 'fadeUp 0.4s ease-out both' }}>
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors mb-5"
          >
            <BackArrow size={16} />
            {t('detail.back')}
          </button>

          {/* Carrier + badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              {carrierLogo && (
                <img src={carrierLogo} alt={plan.provider} className="h-7 w-auto object-contain" />
              )}
              <span className="text-sm font-bold uppercase tracking-wider text-primary">
                {plan.provider}
              </span>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {t(`types.${plan.planType}`)}
            </span>
          </div>

          {/* Plan name */}
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-text-primary mt-3 leading-tight">
            {plan.planName}
          </h1>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-1.5">
            <SarSymbol className="text-base text-text-secondary" />
            <span className="text-4xl md:text-5xl font-heading font-bold text-text-primary">
              {plan.priceSAR}
            </span>
            <span className="text-base text-text-tertiary">/{lang === 'ar' ? 'شهر' : 'mo'}</span>
          </div>
        </div>

        {/* ========= PLAN DETAILS ========= */}
        <div
          className="bg-surface rounded-2xl border border-border/60 overflow-hidden"
          style={{ animation: 'fadeUp 0.4s ease-out 0.1s both' }}
        >
          <div className="divide-y divide-border/40">
            {activeSpecs.map((spec, i) => {
              const Icon = spec.icon;
              return (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0"
                  >
                    <Icon size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-tertiary font-medium">{spec.label}</p>
                    <p className="font-bold text-sm mt-0.5 text-text-primary">
                      {spec.highlight && (
                        <Zap size={12} className="inline-block me-1 -mt-0.5 text-accent" />
                      )}
                      {spec.value}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Special Features */}
            {hasFeatures && (
              <div className="flex items-center gap-4 px-5 py-4">
                <div
                  className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0"
                >
                  <Zap size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-tertiary font-medium">{t('detail.features')}</p>
                  <p className="font-bold text-sm mt-0.5 text-text-primary">
                    {plan.specialFeatures}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========= ACTION BUTTONS ========= */}
        <div
          className="mt-5 flex flex-col gap-3"
          style={{ animation: 'fadeUp 0.4s ease-out 0.2s both' }}
        >
          <a
            href={plan.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[15px]
              bg-gradient-to-r from-primary-dark to-primary text-white
              hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 btn-press"
          >
            {t('detail.getThisPlan')}
            <ExternalLink size={16} />
          </a>

          <button
            onClick={() => togglePlan(plan)}
            className={`flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[15px] transition-all duration-200 btn-press
              ${selected
                ? 'bg-primary text-white'
                : 'bg-surface border-2 border-border text-text-primary hover:border-primary/30'
              }`}
          >
            {selected ? <Check size={16} /> : <Plus size={16} />}
            {selected ? t('planCard.selected') : t('detail.addToCompare')}
          </button>

          <p className="text-[11px] text-text-tertiary text-center leading-relaxed mt-1">
            {t('detail.disclaimer')}
          </p>
        </div>
      </div>

    </div>
  );
}
