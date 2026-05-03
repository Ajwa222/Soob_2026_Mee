/**
 * Saved Plans ("/saved") — the user's bookmarked telecom plans, accessible
 * from the profile screen. Plans are presented in a horizontal scrolling
 * row (with mouse-drag scroll on desktop) so users can swipe through them
 * the same way they do across the rest of the SOOB site.
 *
 * Auth-gated: redirects to /profile if the user isn't logged in.
 */
import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarkContext';
import { usePlans } from '../context/PlansContext';
import { ConnectedPlanCard } from '../components/PlanCard';
import { Button } from '@/components/ui/button';

export default function SavedPlansPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const { isLoggedIn, loading } = useAuth();
  const { bookmarkedIds } = useBookmarks();
  const { plans } = usePlans();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const bookmarkedPlans = plans.filter(p => bookmarkedIds.includes(p.id));

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/profile?tab=signup&from=saved');
    }
  }, [loading, isLoggedIn, navigate]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>(':scope > div');
    const cw = (firstCard?.offsetWidth ?? 280) + 12;
    const visibleCards = Math.max(1, Math.floor(el.clientWidth / cw));
    const amount = cw * visibleCards;
    const forward = dir === 'right' ? 1 : -1;
    el.scrollBy({ left: (isAr ? -forward : forward) * amount, behavior: 'smooth' });
  };

  if (loading || !isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="safe-pb">
      {/* Slim themed hero */}
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-5">
          <Link to="/profile" className="inline-flex items-center gap-1 text-foreground/60 text-[11px] font-medium hover:text-foreground transition-colors">
            <ArrowLeft size={13} className="rtl:rotate-180" />
            {isAr ? 'الحساب' : 'Account'}
          </Link>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#FE7151' }}>
              <Bookmark size={18} className="text-white" fill="currentColor" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg md:text-xl text-foreground tracking-tight leading-tight">
                {isAr ? 'الباقات المحفوظة' : 'Saved Plans'}
              </h1>
              <p className="text-foreground/55 text-[11px] md:text-xs leading-tight">
                {bookmarkedPlans.length > 0
                  ? (isAr
                      ? `${bookmarkedPlans.length} باقة جاهزة للمراجعة`
                      : `${bookmarkedPlans.length} plan${bookmarkedPlans.length === 1 ? '' : 's'} ready to review`)
                  : (isAr ? 'لا يوجد باقات محفوظة بعد' : 'No saved plans yet')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {bookmarkedPlans.length === 0 ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Bookmark size={28} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-bold text-lg text-foreground">
            {isAr ? 'لا يوجد باقات محفوظة' : 'No saved plans yet'}
          </h3>
          <p className="text-muted-foreground mt-1.5 text-sm max-w-sm mx-auto">
            {isAr
              ? 'استخدم رمز العلامة المرجعية على أي بطاقة لحفظها هنا للرجوع إليها لاحقاً.'
              : 'Tap the bookmark icon on any plan card to save it here for later.'}
          </p>
          <Button asChild className="mt-5">
            <Link to="/plans">{isAr ? 'تصفّح الباقات' : 'Browse plans'}</Link>
          </Button>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12 relative">
          {/* Desktop scroll arrows */}
          <button
            onClick={() => scroll('left')}
            aria-label="Scroll left"
            className="hidden md:flex absolute start-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card border-2 border-border ob-card-elev items-center justify-center text-foreground/70 hover:text-foreground hover:scale-110 transition-transform"
          >
            <ChevronLeft size={18} className="rtl:rotate-180" />
          </button>
          <button
            onClick={() => scroll('right')}
            aria-label="Scroll right"
            className="hidden md:flex absolute end-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card border-2 border-border ob-card-elev items-center justify-center text-foreground/70 hover:text-foreground hover:scale-110 transition-transform"
          >
            <ChevronRight size={18} className="rtl:rotate-180" />
          </button>

          {/* Horizontal scroller — same UX as homepage trending row */}
          <div
            ref={scrollRef}
            className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {bookmarkedPlans.map(plan => (
              <div
                key={plan.id}
                className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px] snap-start"
              >
                <ConnectedPlanCard plan={plan} compact style={{ height: '100%' }} source="saved" />
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-foreground/45 text-center">
            {isAr ? '← اسحب للتنقل بين الباقات →' : '← Swipe to browse →'}
          </p>
        </div>
      )}
    </div>
  );
}
