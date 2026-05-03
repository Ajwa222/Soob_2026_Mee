/**
 * Reusable plan card component — displays a single telecom plan's key details.
 *
 * Shows: carrier logo + color accent, plan name, price, data, calls, SMS, social media,
 * engagement counts (likes/dislikes/comments), and action buttons (View Details, Compare, Bookmark).
 *
 * Used on: ExplorePage, PlansPage, HomePage (trending), AdvisorPage (recommended plans).
 * Each card links to /plan/:id for full details.
 */
import React from 'react';
import { Wifi, Phone, MessageSquare, Globe, Plus, Check, ThumbsUp, ThumbsDown, MessageCircle, Bookmark, Users } from 'lucide-react';
import SocialIcons from './SocialIcons';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLang } from '../context/LanguageContext';
import SarSymbol from './SarSymbol';
import { useNavigate } from 'react-router-dom';
import { useCompare } from '../context/CompareContext';
import { useBookmarks } from '../context/BookmarkContext';
import { getCarrierColor, getCarrierLogo, isValidValue } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { trackEvent } from '../lib/analytics';
import { Link } from 'react-router-dom';
import type { Plan } from '../types';
import { getBillingLabel } from '../lib/utils';

const typeBadgeVariant: Record<string, string> = {
  Prepaid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Postpaid: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'Data-only': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

interface PlanCardProps {
  plan: Plan;
  style?: React.CSSProperties;
  compact?: boolean;
  selected?: boolean;
  bookmarked?: boolean;
  likes?: number;
  dislikes?: number;
  commentCount?: number;
  segmentBadge?: string | null;
  onToggleCompare?: (plan: Plan) => void;
  onToggleBookmark?: (planId: number) => void;
  onViewPlan?: () => void;
  source?: string;
}

const PlanCard = React.memo(function PlanCard({ plan, style, compact, selected = false, bookmarked = false, likes = 0, dislikes = 0, commentCount = 0, segmentBadge, onToggleCompare, onToggleBookmark, onViewPlan, source }: PlanCardProps) {
  const { t } = useLang();
  const carrierColor = getCarrierColor(plan.provider);
  const carrierLogo = getCarrierLogo(plan.provider);
  const badgeClass = typeBadgeVariant[plan.planType] || typeBadgeVariant['Prepaid'];

  return (
    <Card
      className={`relative flex flex-col overflow-hidden ${compact ? '' : 'card-hover'} gradient-border
        ${selected ? 'ring-2 ring-primary shadow-lg' : ''}`}
      style={{ borderInlineStart: `4px solid ${carrierColor}`, ...style }}
    >
      {selected && (
        <div className="absolute top-3 end-3 w-7 h-7 rounded-full bg-primary flex items-center justify-center z-10 shadow-md shadow-primary/30">
          <Check size={14} className="text-white" strokeWidth={3} />
        </div>
      )}

      <CardContent className={`${compact ? 'p-3.5' : 'p-5'} flex flex-col flex-1`}>
        {/* Carrier + Type */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {carrierLogo && (
              <img src={carrierLogo} alt={plan.provider} loading="lazy" className="h-5 w-auto object-contain max-w-[48px] shrink-0" />
            )}
            <span className="text-[11px] font-bold uppercase tracking-wider truncate" style={{ color: carrierColor }}>
              {plan.provider}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.preventDefault(); onToggleBookmark?.(plan.id); }}
              className={`p-1 rounded-lg transition-colors ${bookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
              aria-label={bookmarked ? t('bookmark.remove') : t('bookmark.add')}
            >
              <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
            <Badge variant="secondary" className={`${badgeClass} text-[11px] border-0 font-semibold`}>
              {t(`types.${plan.planType}`)}
            </Badge>
          </div>
        </div>

        {/* Plan name */}
        <h3 className={`font-heading font-bold ${compact ? 'text-base' : 'text-lg'} text-foreground leading-snug mt-2 line-clamp-2 ${compact ? 'min-h-[2.25rem]' : 'min-h-[2.75rem]'}`}>
          {plan.planName}
        </h3>

        {/* Price — coral on the number for visual pop (warm/eye-catching). */}
        <div className={`plan-price ${compact ? 'mt-1' : 'mt-2'} flex items-baseline gap-1`}>
          <SarSymbol className="text-sm font-medium text-muted-foreground" />
          <span className={`${compact ? 'text-lg' : 'text-2xl sm:text-3xl'} font-heading font-extrabold tracking-tight`} style={{ color: '#FE7151' }}>
            {plan.priceSAR}
          </span>
          <span className="text-sm text-muted-foreground">{getBillingLabel(plan.contractTerms, t)}</span>
        </div>

        <Separator className={compact ? 'my-2.5' : 'my-4'} />

        {/* Key metrics */}
        {(() => {
          const hasSocial = isValidValue(plan.socialMediaData) && plan.socialMediaData !== '-';
          const hasIntl = isValidValue(plan.internationalCallMinutes) && plan.internationalCallMinutes !== '-' && plan.internationalCallMinutes !== '0';
          type Metric = {
            key: string;
            icon?: React.ComponentType<{ size?: number; className?: string }>;
            customIcon?: React.ReactNode;
            value: string;
            label: string;
          };
          const metrics: Metric[] = [
            { key: 'data', icon: Wifi, value: isValidValue(plan.dataGB) ? (plan.dataGB === 'Unlimited' ? t('detail.unlimited') : `${plan.dataGB} GB`) : '—', label: t('planCard.data') },
            { key: 'mins', icon: Phone, value: isValidValue(plan.localCallMinutes) ? (plan.localCallMinutes === 'Unlimited' ? t('detail.unlimited') : `${plan.localCallMinutes}`) : '—', label: t('planCard.mins') },
            { key: 'sms', icon: MessageSquare, value: isValidValue(plan.sms) && plan.sms !== '-' ? (plan.sms === 'Unlimited' ? t('detail.unlimited') : plan.sms) : '—', label: t('planCard.sms') },
            ...(hasSocial ? [{
              key: 'social',
              customIcon: <SocialIcons size={compact ? 11 : 13} max={4} />,
              value: plan.socialMediaData === 'Unlimited' ? t('detail.unlimited') : (/gb/i.test(plan.socialMediaData) ? plan.socialMediaData : `${plan.socialMediaData} GB`),
              label: t('planCard.social'),
            }] : []),
            ...(hasIntl ? [{ key: 'intl', icon: Globe, value: plan.internationalCallMinutes === 'Unlimited' ? t('detail.unlimited') : plan.internationalCallMinutes, label: t('planCard.intl') }] : []),
          ];
          // 3 metrics → 3 cols, 4 → 2 cols (2x2), 5 → 3 cols (2 rows of 3, last cell empty).
          const colsClass = metrics.length === 3 ? 'grid-cols-3' : metrics.length === 4 ? 'grid-cols-2' : 'grid-cols-3';
          return (
            <div className={`grid ${colsClass} gap-2 text-sm`}>
              {metrics.map((m) => (
                <div key={m.key} className={`flex flex-col items-center gap-1 ${compact ? 'py-1.5' : 'py-2.5'} px-1 rounded-xl bg-muted/50 dark:bg-muted/30 transition-colors`}>
                  {m.customIcon ?? (m.icon && <m.icon size={compact ? 12 : 14} className="text-primary" />)}
                  <p className={`font-bold text-foreground ${compact ? 'text-[12px]' : 'text-[13px]'} leading-tight text-center break-words`}>{m.value}</p>
                  <p className="text-[11px] text-muted-foreground text-center">{m.label}</p>
                </div>
              ))}
            </div>
          );
        })()}


        {/* Segment social proof badge */}
        {segmentBadge && (
          <div className={`${compact ? 'mt-2' : 'mt-3'}`}>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
              <Users size={10} />
              {segmentBadge}
            </span>
          </div>
        )}

        {/* Engagement */}
        <div className={`flex items-center gap-4 ${compact ? 'mt-2' : 'mt-3'} text-muted-foreground`}>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ThumbsUp size={compact ? 13 : 16} />
            <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-medium`}>{likes}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-destructive transition-colors">
            <ThumbsDown size={compact ? 13 : 16} />
            <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-medium`}>{dislikes}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MessageCircle size={compact ? 13 : 16} />
            <span className={`${compact ? 'text-[11px]' : 'text-xs'} font-medium`}>{commentCount}</span>
          </div>
        </div>

        <div className="flex-1" />
      </CardContent>

      <CardFooter className={`flex-nowrap gap-2 ${compact ? 'px-3.5 pb-2 pt-0' : 'px-5 pb-5'}`}>
        <Button variant="secondary" size={compact ? 'sm' : 'default'} className={`flex-1 min-w-0 rounded-xl ${compact ? 'text-xs font-medium py-1' : 'font-semibold'}`} asChild>
          <Link
            to={`/plan/${plan.id}${source ? `?source=${source}` : ''}`}
            onClick={() => { trackEvent('plan_card_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, price: plan.priceSAR, source }); onViewPlan?.(); }}
            className="truncate"
          >
            {t('planCard.viewDetails')}
          </Link>
        </Button>
        <Button
          variant={selected ? 'default' : 'outline'}
          size={compact ? 'sm' : 'default'}
          onClick={(e) => { e.preventDefault(); onToggleCompare?.(plan); }}
          className={`shrink-0 rounded-xl px-3 ${compact ? 'text-xs font-medium py-1' : 'font-semibold'} ${selected ? 'shadow-md shadow-primary/20' : 'text-primary border-primary/30 hover:bg-primary/10'}`}
          aria-label={selected ? t('planCard.selected') : t('planCard.compare')}
        >
          {selected ? <Check size={compact ? 13 : 15} /> : <Plus size={compact ? 13 : 15} />}
          <span className="hidden min-[420px]:inline truncate">{selected ? t('planCard.selected') : t('planCard.compare')}</span>
        </Button>
      </CardFooter>
    </Card>
  );
});

/** Thin wrapper that subscribes to CompareContext.
 *  Only this component re-renders on context changes —
 *  the memoized PlanCard underneath skips if `selected` didn't change. */
export const ConnectedPlanCard = React.memo(function ConnectedPlanCard({ plan, style, compact, source }: { plan: Plan; style?: React.CSSProperties; compact?: boolean; source?: string }) {
  const { togglePlan, isSelected } = useCompare();
  const { requestBookmark, isBookmarked } = useBookmarks();
  const { engagement } = usePlans();
  const navigate = useNavigate();
  const e = engagement[String(plan.id)];
  const handleToggleBookmark = React.useCallback((id: number) => {
    if (!requestBookmark(id)) navigate('/profile');
  }, [requestBookmark, navigate]);
  const handleToggleCompare = React.useCallback((p: Plan) => {
    togglePlan(p);
  }, [togglePlan]);
  return (
    <PlanCard
      plan={plan}
      style={style}
      compact={compact}
      selected={isSelected(plan.id)}
      bookmarked={isBookmarked(plan.id)}
      likes={e?.likes ?? 0}
      dislikes={e?.dislikes ?? 0}
      commentCount={e?.comments ?? 0}
      onToggleCompare={handleToggleCompare}
      onToggleBookmark={handleToggleBookmark}
      source={source}
    />
  );
});

export default PlanCard;
