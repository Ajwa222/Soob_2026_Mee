import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, ExternalLink, Plus, Check,
  Wifi, Phone, MessageSquare, Globe2, Share2, Clock,
  Zap, ArrowLeft, ArrowRight, Plane, Bookmark,
  ThumbsUp, ThumbsDown, Send, Trash2, MessageCircle, LogIn,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import SarSymbol from '../components/SarSymbol';
import { useCompare } from '../context/CompareContext';
import { useBookmarks } from '../context/BookmarkContext';
import { usePlanInteractions } from '../hooks/usePlanInteractions';
import { getCarrierLogo, isValidValue } from '../data/plans';
import { usePlans } from '../context/PlansContext';
import { trackEvent } from '../lib/analytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

function timeAgo(ts: number, t: (k: string, p?: Record<string, string>) => string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('interactions.justNow');
  if (mins < 60) return t('interactions.minutesAgo', { n: String(mins) });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('interactions.hoursAgo', { n: String(hrs) });
  const days = Math.floor(hrs / 24);
  return t('interactions.daysAgo', { n: String(days) });
}

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

export default function PlanDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { togglePlan, isSelected } = useCompare();
  const { requestBookmark, isBookmarked } = useBookmarks();
  const { user, isLoggedIn, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');

  const { plans } = usePlans();
  const planId = useMemo(() => Number(id), [id]);
  const plan = useMemo(() => plans.find(p => p.id === planId), [plans, planId]);
  const {
    reaction, comments, loading: interactionsLoading,
    toggleLike, toggleDislike, addComment, removeComment,
  } = usePlanInteractions(plan ? planId : undefined);

  useEffect(() => {
    if (plan) {
      trackEvent('plan_detail_viewed', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, price: plan.priceSAR });
    }
  }, [plan]);

  if (!plan) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h1 className="font-heading font-bold text-2xl text-foreground">
          {t('detail.notFound')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('detail.notFoundDesc')}
        </p>
        <Button asChild className="mt-6">
          <Link to="/plans">
            {t('detail.backToPlans')}
          </Link>
        </Button>
      </div>
    );
  }

  const carrierLogo = getCarrierLogo(plan.provider);
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
    <div className="relative z-10 safe-pb">
      {/* ========= BREADCRUMB ========= */}
      <div className="bg-muted/50 border-b border-border/50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-3">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              {t('nav.home')}
            </Link>
            <Chevron size={14} />
            <Link to="/plans" className="hover:text-foreground transition-colors">
              {t('nav.plans')}
            </Link>
            <Chevron size={14} />
            <span className="text-foreground font-medium truncate max-w-50">
              {plan.planName}
            </span>
          </nav>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">

        {/* ========= PLAN HEADER ========= */}
        <div className="pt-6 pb-5">
          {/* Back */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-5 text-muted-foreground hover:text-foreground"
          >
            <BackArrow size={16} />
            {t('detail.back')}
          </Button>

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
            <Badge variant="secondary" className="text-[11px] font-bold">
              {t(`types.${plan.planType}`)}
            </Badge>
          </div>

          {/* Plan name */}
          <div className="flex items-start justify-between gap-3 mt-3">
            <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground leading-tight">
              {plan.planName}
            </h1>
            <button
              onClick={() => { if (!requestBookmark(plan.id)) navigate('/profile'); }}
              className={`p-2 rounded-xl transition-colors shrink-0 ${isBookmarked(plan.id) ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
              aria-label={isBookmarked(plan.id) ? t('bookmark.remove') : t('bookmark.add')}
            >
              <Bookmark size={22} fill={isBookmarked(plan.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-1.5">
            <SarSymbol className="text-base text-muted-foreground" />
            <span className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-foreground">
              {plan.priceSAR}
            </span>
            <span className="text-base text-muted-foreground">{getBillingLabel(plan.contractTerms, t)}</span>
          </div>
        </div>

        {/* ========= PLAN DETAILS ========= */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {activeSpecs.map((spec, i) => {
                const Icon = spec.icon;
                return (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground font-medium">{spec.label}</p>
                      <p className="font-bold text-sm mt-0.5 text-foreground">
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
                  <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                    <Zap size={18} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{t('detail.features')}</p>
                    <p className="font-bold text-sm mt-0.5 text-foreground">
                      {plan.specialFeatures}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ========= ACTION BUTTONS ========= */}
        <div className="mt-5 pb-12 flex flex-col gap-3">
          <Button
            asChild
            size="lg"
            className="w-full py-3.5 font-bold text-[15px] bg-primary hover:bg-primary/90"
          >
            <a
              href={plan.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent('get_plan_clicked', { plan_id: plan.id, plan_name: plan.planName, provider: plan.provider, url: plan.url })}
            >
              {t('detail.getThisPlan')}
              <ExternalLink size={16} />
            </a>
          </Button>

          <Button
            variant={selected ? 'default' : 'outline'}
            size="lg"
            className="w-full py-3.5 font-bold text-[15px]"
            onClick={() => togglePlan(plan)}
          >
            {selected ? <Check size={16} /> : <Plus size={16} />}
            {selected ? t('planCard.selected') : t('detail.addToCompare')}
          </Button>
        </div>

        {/* ========= LIKE / DISLIKE ========= */}
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={isLoggedIn ? toggleLike : loginWithGoogle}
              className={
                user && reaction.likedBy.includes(user.uid)
                  ? 'bg-green-500/15 text-green-600 ring-1 ring-green-500/30 hover:bg-green-500/20'
                  : 'bg-muted text-muted-foreground hover:bg-green-500/10 hover:text-green-600'
              }
            >
              <ThumbsUp size={16} />
              <span>{Math.max(0, reaction.likes)}</span>
            </Button>
            <Button
              variant="ghost"
              onClick={isLoggedIn ? toggleDislike : loginWithGoogle}
              className={
                user && reaction.dislikedBy.includes(user.uid)
                  ? 'bg-red-500/15 text-red-500 ring-1 ring-red-500/30 hover:bg-red-500/20'
                  : 'bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-500'
              }
            >
              <ThumbsDown size={16} />
              <span>{Math.max(0, reaction.dislikes)}</span>
            </Button>
          </div>
        </Card>

        {/* ========= COMMENTS ========= */}
        <Card className="mt-4 overflow-hidden">
          {/* Header */}
          <CardHeader className="flex-row items-center gap-2 py-4 px-5">
            <MessageCircle size={18} className="text-primary" />
            <h2 className="font-bold text-foreground text-sm">
              {t('interactions.comments')}
              {comments.length > 0 && (
                <span className="ms-1.5 text-muted-foreground font-normal">({comments.length})</span>
              )}
            </h2>
          </CardHeader>

          <Separator />

          {/* Comment Input */}
          {isLoggedIn ? (
            <div className="px-5 py-4 flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{user?.name?.[0] ?? '?'}</span>
                </div>
              )}
              <Input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    addComment(commentText);
                    setCommentText('');
                  }
                }}
                placeholder={t('interactions.commentPlaceholder')}
                className="flex-1"
                maxLength={500}
              />
              <Button
                size="icon"
                onClick={() => {
                  if (commentText.trim()) {
                    addComment(commentText);
                    setCommentText('');
                  }
                }}
                disabled={!commentText.trim()}
                className="shrink-0"
              >
                <Send size={16} />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={loginWithGoogle}
              className="w-full rounded-none px-5 py-4 h-auto flex items-center justify-center gap-2 text-sm text-primary font-medium"
            >
              <LogIn size={16} />
              {t('interactions.signInToInteract')}
            </Button>
          )}

          <Separator />

          {/* Comments List */}
          <div className="divide-y divide-border/30">
            {comments.length === 0 && !interactionsLoading && (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                {t('interactions.noComments')}
              </p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="px-5 py-4 flex gap-3">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover mt-0.5" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-primary">{comment.userName?.[0] ?? '?'}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground truncate">{comment.userName}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(comment.createdAt, t)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 wrap-break-word">{comment.text}</p>
                </div>
                {user?.uid === comment.userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeComment(comment.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0 self-start"
                    title={t('interactions.deleteComment')}
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        <div className="pb-12" />
      </div>

    </div>
  );
}
