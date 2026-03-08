import React, { useEffect, useState } from 'react';
import { Wifi, Phone, MessageSquare, Plus, Check, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useLang } from '../context/LanguageContext';
import SarSymbol from './SarSymbol';
import { useCompare } from '../context/CompareContext';
import { getCarrierColor, getCarrierLogo, isValidValue } from '../data/plans';
import { fetchReaction, fetchCommentCount } from '../lib/planInteractions';
import { Link } from 'react-router-dom';
import type { Plan } from '../types';

// Cache reactions/comments so duplicate cards (infinite scroll copies) don't re-fetch
const reactionCache = new Map<number, { likes: number; dislikes: number; ts: number }>();
const commentCache = new Map<number, { count: number; ts: number }>();
const CACHE_TTL = 60000; // 1 minute

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

export default function PlanCard({ plan, style }: { plan: Plan; style?: React.CSSProperties }) {
  const { t } = useLang();
  const { togglePlan, isSelected } = useCompare();
  const selected = isSelected(plan.id);
  const carrierColor = getCarrierColor(plan.provider);
  const carrierLogo = getCarrierLogo(plan.provider);
  const badgeClass = typeBadgeVariant[plan.planType] || typeBadgeVariant['Prepaid'];
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const cachedR = reactionCache.get(plan.id);
    if (cachedR && now - cachedR.ts < CACHE_TTL) {
      setLikes(cachedR.likes); setDislikes(cachedR.dislikes);
    } else {
      fetchReaction(plan.id).then(r => {
        const likes = Math.max(0, r.likes); const dislikes = Math.max(0, r.dislikes);
        reactionCache.set(plan.id, { likes, dislikes, ts: Date.now() });
        setLikes(likes); setDislikes(dislikes);
      }).catch(() => {});
    }
    const cachedC = commentCache.get(plan.id);
    if (cachedC && now - cachedC.ts < CACHE_TTL) {
      setCommentCount(cachedC.count);
    } else {
      fetchCommentCount(plan.id).then(c => {
        commentCache.set(plan.id, { count: c, ts: Date.now() });
        setCommentCount(c);
      }).catch(() => {});
    }
  }, [plan.id]);

  const perks = [];
  if (isValidValue(plan.socialMediaData) && plan.socialMediaData !== '1') {
    perks.push(plan.socialMediaData === 'Unlimited' ? t('planCard.unlimitedSocial') : `${plan.socialMediaData} ${t('planCard.social')}`);
  }
  if (isValidValue(plan.specialFeatures)) {
    perks.push(plan.specialFeatures);
  }

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

      <CardContent className="p-5 flex flex-col flex-1">
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
          <Badge variant="secondary" className={`${badgeClass} text-[11px] border-0 font-semibold`}>
            {t(`types.${plan.planType}`)}
          </Badge>
        </div>

        {/* Plan name */}
        <h3 className="font-heading font-bold text-lg text-foreground leading-snug mt-2.5 line-clamp-2 min-h-[2.75rem]">
          {plan.planName}
        </h3>

        {/* Price */}
        <div className="plan-price mt-3 flex items-baseline gap-1">
          <SarSymbol className="text-sm font-medium text-muted-foreground" />
          <span className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight">
            {plan.priceSAR}
          </span>
          <span className="text-sm text-muted-foreground">{getBillingLabel(plan.contractTerms, t)}</span>
        </div>

        <Separator className="my-4" />

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { icon: Wifi, value: isValidValue(plan.dataGB) ? (plan.dataGB === 'Unlimited' ? t('detail.unlimited') : `${plan.dataGB} GB`) : '—', label: t('planCard.data') },
            { icon: Phone, value: isValidValue(plan.localCallMinutes) ? (plan.localCallMinutes === 'Unlimited' ? t('detail.unlimited') : `${plan.localCallMinutes}`) : '—', label: t('planCard.mins') },
            { icon: MessageSquare, value: isValidValue(plan.sms) && plan.sms !== '-' ? (plan.sms === 'Unlimited' ? t('detail.unlimited') : plan.sms) : '—', label: t('planCard.sms') },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl bg-muted/50 dark:bg-muted/30 transition-colors">
              <Icon size={14} className="text-primary" />
              <p className="font-bold text-foreground text-[13px] leading-tight text-center">{value}</p>
              <p className="text-[11px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Perks */}
        <div className="min-h-[2rem] mt-3 flex flex-wrap items-start gap-1.5">
          {perks.slice(0, 2).map((perk, i) => (
            <Badge key={i} variant="outline" className="text-[11px] font-medium border-border/60">
              {perk}
            </Badge>
          ))}
        </div>

        {/* Engagement */}
        <div className="flex items-center gap-4 mt-3 text-muted-foreground">
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <ThumbsUp size={16} />
            <span className="text-xs font-medium">{likes}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-destructive transition-colors">
            <ThumbsDown size={16} />
            <span className="text-xs font-medium">{dislikes}</span>
          </div>
          <div className="flex items-center gap-1.5 hover:text-primary transition-colors">
            <MessageCircle size={16} />
            <span className="text-xs font-medium">{commentCount}</span>
          </div>
        </div>

        <div className="flex-1" />
      </CardContent>

      <CardFooter className="gap-2.5 px-5 pb-5">
        <Button variant="secondary" className="flex-1 rounded-xl font-semibold" asChild>
          <Link to={`/plan/${plan.id}`}>{t('planCard.viewDetails')}</Link>
        </Button>
        <Button
          variant={selected ? 'default' : 'outline'}
          onClick={(e) => { e.preventDefault(); togglePlan(plan); }}
          className={`rounded-xl font-semibold ${selected ? 'shadow-md shadow-primary/20' : 'text-primary border-primary/30 hover:bg-primary/10'}`}
        >
          {selected ? <Check size={15} /> : <Plus size={15} />}
          {selected ? t('planCard.selected') : t('planCard.compare')}
        </Button>
      </CardFooter>
    </Card>
  );
}
