import { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, ExternalLink, Plus, Check,
  Wifi, Phone, MessageSquare, Globe2, Share2, Clock,
  Zap, ArrowLeft, ArrowRight, Plane,
  ThumbsUp, ThumbsDown, Send, Trash2, MessageCircle, LogIn,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import SarSymbol from '../components/SarSymbol';
import { useCompare } from '../context/CompareContext';
import { usePlanInteractions } from '../hooks/usePlanInteractions';
import {
  PLANS_DATA, getCarrierLogo, isValidValue,
} from '../data/plans';

const typeBadgeStyles: Record<string, { bg: string; color: string }> = {
  Prepaid: { bg: '#2563EB12', color: '#2563EB' },
  Postpaid: { bg: '#F59E0B12', color: '#D97706' },
  'Data-only': { bg: '#64748B12', color: '#64748B' },
};

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

export default function PlanDetailPage() {
  const { id } = useParams();
  const { t, lang } = useLang();
  const { togglePlan, isSelected } = useCompare();
  const { user, isLoggedIn, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [commentText, setCommentText] = useState('');

  const planId = useMemo(() => Number(id), [id]);
  const plan = useMemo(() => PLANS_DATA.find(p => p.id === planId), [planId]);
  const {
    reaction, comments, loading: interactionsLoading,
    toggleLike, toggleDislike, addComment, removeComment,
  } = usePlanInteractions(plan ? planId : undefined);

  if (!plan) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h1 className="font-heading font-bold text-2xl text-text-primary">
          {t('detail.notFound')}
        </h1>
        <p className="text-text-secondary mt-2">
          {t('detail.notFoundDesc')}
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
    <div className="relative z-10 safe-pb backdrop-blur-xl bg-[var(--color-bg)]/80">
      {/* ========= BREADCRUMB ========= */}
      <div className="bg-surface-alt/50 border-b border-border/50">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 md:px-8 py-3">
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 md:px-8">

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
            <span className="text-3xl sm:text-4xl md:text-5xl font-heading font-bold text-text-primary">
              {plan.priceSAR}
            </span>
            <span className="text-base text-text-tertiary">/{t('compare.perMonth')}</span>
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
          className="mt-5 pb-12 flex flex-col gap-3"
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

        </div>

        {/* ========= LIKE / DISLIKE ========= */}
        <div
          className="bg-surface rounded-2xl border border-border/60 p-5"
          style={{ animation: 'fadeUp 0.4s ease-out 0.25s both' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={isLoggedIn ? toggleLike : loginWithGoogle}
              className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all duration-200 btn-press
                ${user && reaction.likedBy.includes(user.uid)
                  ? 'bg-green-500/15 text-green-600 ring-1 ring-green-500/30'
                  : 'bg-surface-alt text-text-secondary hover:bg-green-500/10 hover:text-green-600'
                }`}
            >
              <ThumbsUp size={16} />
              <span>{reaction.likes}</span>
            </button>
            <button
              onClick={isLoggedIn ? toggleDislike : loginWithGoogle}
              className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold transition-all duration-200 btn-press
                ${user && reaction.dislikedBy.includes(user.uid)
                  ? 'bg-red-500/15 text-red-500 ring-1 ring-red-500/30'
                  : 'bg-surface-alt text-text-secondary hover:bg-red-500/10 hover:text-red-500'
                }`}
            >
              <ThumbsDown size={16} />
              <span>{reaction.dislikes}</span>
            </button>
          </div>
        </div>

        {/* ========= COMMENTS ========= */}
        <div
          className="bg-surface rounded-2xl border border-border/60 overflow-hidden mt-4"
          style={{ animation: 'fadeUp 0.4s ease-out 0.3s both' }}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border/40 flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            <h2 className="font-bold text-text-primary text-sm">
              {t('interactions.comments')}
              {comments.length > 0 && (
                <span className="ms-1.5 text-text-tertiary font-normal">({comments.length})</span>
              )}
            </h2>
          </div>

          {/* Comment Input */}
          {isLoggedIn ? (
            <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full shrink-0 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{user?.name?.[0] ?? '?'}</span>
                </div>
              )}
              <input
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
                className="flex-1 bg-surface-alt rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-primary/30 border border-border/50"
                maxLength={500}
              />
              <button
                onClick={() => {
                  if (commentText.trim()) {
                    addComment(commentText);
                    setCommentText('');
                  }
                }}
                disabled={!commentText.trim()}
                className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 transition-opacity btn-press shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="w-full px-5 py-4 border-b border-border/40 flex items-center justify-center gap-2 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              <LogIn size={16} />
              {t('interactions.signInToInteract')}
            </button>
          )}

          {/* Comments List */}
          <div className="divide-y divide-border/30">
            {comments.length === 0 && !interactionsLoading && (
              <p className="px-5 py-8 text-center text-sm text-text-tertiary">
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
                    <span className="text-sm font-bold text-text-primary truncate">{comment.userName}</span>
                    <span className="text-[11px] text-text-tertiary shrink-0">{timeAgo(comment.createdAt, t)}</span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1 break-words">{comment.text}</p>
                </div>
                {user?.uid === comment.userId && (
                  <button
                    onClick={() => removeComment(comment.id)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 self-start"
                    title={t('interactions.deleteComment')}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="pb-12" />
      </div>

    </div>
  );
}
