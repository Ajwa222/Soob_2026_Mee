import React, { useEffect, useState } from 'react';
import { Wifi, Phone, MessageSquare, Share2, Plus, Check, ThumbsUp, ThumbsDown, MessageCircle, Bookmark } from 'lucide-react';
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
import { fetchReaction, fetchCommentCount } from '../lib/planInteractions';
import { Link } from 'react-router-dom';
import type { Plan } from '../types';

const typeBadgeVariant: Record<string, string> = {
  Prepaid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Postpaid: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  'Data-only': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

function getBillingLabel(term: string, t: (k: string) => string): string {
  if (!term) return t('planCard.perMonth');
  const l = term.toLowerCase();
  if (l.includes('day') && (l.includes('1 ') || l === 'day' || l === '1 day')) return t('planCard.perDay');
  if (l.includes('7 day') || l === '1 week') return t('planCard.perWeek');
  if (l === '35 days' || l === '5 weeks') return t('planCard.per5Weeks');
  if (l === '60 days' || l === '2 months') return t('planCard.per2Months');
  if (l === '90 days' || l === '3 months' || l === '3 months promo' || l === '12 weeks') return t('planCard.per3Months');
  if (l === '1 year') return t('planCard.perYear');
  return t('planCard.perMonth');
}

interface PlanCardProps {
  plan: Plan;
  style?: React.CSSProperties;
  compact?: boolean;
  selected?: boolean;
  bookmarked?: boolean;
  onToggleCompare?: (plan: Plan) => void;
  onToggleBookmark?: (planId: number) => void;
}

const PlanCard = React.memo(function PlanCard({ plan, style, compact, selected = false, bookmarked = false, onToggleCompare, onToggleBookmark }: PlanCardProps) {
  const { t } = useLang();
  const carrierColor = getCarrierColor(plan.provider);
  const carrierLogo = getCarrierLogo(plan.provider);
  const badgeClass = typeBadgeVariant[plan.planType] || typeBadgeVariant['Prepaid'];
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchReaction(plan.id).then(r => {
      if (!cancelled) {
        setLikes(Math.max(0, r.likes));
        setDislikes(Math.max(0, r.dislikes));
      }
    }).catch((err) => { console.error(`Failed to fetch reactions for plan ${plan.id}:`, err); });
    fetchCommentCount(plan.id).then(c => {
      if (!cancelled) setCommentCount(c);
    }).catch((err) => { console.error(`Failed to fetch comment count for plan ${plan.id}:`, err); });
    return () => { cancelled = true; };
  }, [plan.id]);

  return (
    <Card
      className={`relative flex flex-col overflow-hidden card-hover gradient-border
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
              <img src={carrierLogo} alt={plan.provider} className="h-5 w-auto object-contain max-w-[48px] shrink-0" />
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

        {/* Price */}
        <div className={`plan-price ${compact ? 'mt-1' : 'mt-2'} flex items-baseline gap-1`}>
          <SarSymbol className="text-sm font-medium text-muted-foreground" />
          <span className={`${compact ? 'text-lg' : 'text-2xl sm:text-3xl'} font-heading font-extrabold text-foreground tracking-tight`}>
            {plan.priceSAR}
          </span>
          <span className="text-sm text-muted-foreground">{getBillingLabel(plan.contractTerms, t)}</span>
        </div>

        <Separator className={compact ? 'my-2.5' : 'my-4'} />

        {/* Key metrics */}
        {(() => {
          const hasSocial = isValidValue(plan.socialMediaData) && plan.socialMediaData !== '-';
          const metrics = [
            { icon: Wifi, value: isValidValue(plan.dataGB) ? (plan.dataGB === 'Unlimited' ? t('detail.unlimited') : `${plan.dataGB} GB`) : '—', label: t('planCard.data') },
            { icon: Phone, value: isValidValue(plan.localCallMinutes) ? (plan.localCallMinutes === 'Unlimited' ? t('detail.unlimited') : `${plan.localCallMinutes}`) : '—', label: t('planCard.mins') },
            { icon: MessageSquare, value: isValidValue(plan.sms) && plan.sms !== '-' ? (plan.sms === 'Unlimited' ? t('detail.unlimited') : plan.sms) : '—', label: t('planCard.sms') },
            ...(hasSocial ? [{ icon: Share2, value: plan.socialMediaData === 'Unlimited' ? t('detail.unlimited') : (/gb/i.test(plan.socialMediaData) ? plan.socialMediaData : `${plan.socialMediaData} GB`), label: t('planCard.social') }] : []),
          ];
          return (
            <div className={`grid ${hasSocial ? 'grid-cols-2' : 'grid-cols-3'} gap-2 text-sm`}>
              {metrics.map(({ icon: Icon, value, label }) => (
                <div key={label} className={`flex flex-col items-center gap-1 ${compact ? 'py-1.5' : 'py-2.5'} px-1 rounded-xl bg-muted/50 dark:bg-muted/30 transition-colors`}>
                  <Icon size={compact ? 12 : 14} className="text-primary" />
                  <p className={`font-bold text-foreground ${compact ? 'text-[12px]' : 'text-[13px]'} leading-tight text-center`}>{value}</p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          );
        })()}


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

      <CardFooter className={`gap-2 ${compact ? 'px-3.5 pb-2 pt-0' : 'px-5 pb-5'}`}>
        <Button variant="secondary" size={compact ? 'sm' : 'default'} className={`flex-1 rounded-xl ${compact ? 'text-xs font-medium py-1' : 'font-semibold'}`} asChild>
          <Link to={`/plan/${plan.id}`}>{t('planCard.viewDetails')}</Link>
        </Button>
        <Button
          variant={selected ? 'default' : 'outline'}
          size={compact ? 'sm' : 'default'}
          onClick={(e) => { e.preventDefault(); onToggleCompare?.(plan); }}
          className={`rounded-xl ${compact ? 'text-xs font-medium py-1' : 'font-semibold'} ${selected ? 'shadow-md shadow-primary/20' : 'text-primary border-primary/30 hover:bg-primary/10'}`}
        >
          {selected ? <Check size={compact ? 13 : 15} /> : <Plus size={compact ? 13 : 15} />}
          {selected ? t('planCard.selected') : t('planCard.compare')}
        </Button>
      </CardFooter>
    </Card>
  );
});

/** Thin wrapper that subscribes to CompareContext.
 *  Only this component re-renders on context changes —
 *  the memoized PlanCard underneath skips if `selected` didn't change. */
export function ConnectedPlanCard({ plan, style, compact }: { plan: Plan; style?: React.CSSProperties; compact?: boolean }) {
  const { togglePlan, isSelected } = useCompare();
  const { requestBookmark, isBookmarked } = useBookmarks();
  const navigate = useNavigate();
  return (
    <PlanCard
      plan={plan}
      style={style}
      compact={compact}
      selected={isSelected(plan.id)}
      bookmarked={isBookmarked(plan.id)}
      onToggleCompare={togglePlan}
      onToggleBookmark={(id) => {
        if (!requestBookmark(id)) navigate('/profile');
      }}
    />
  );
}

export default PlanCard;
