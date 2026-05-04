/**
 * Bookmarks ("/saved") — anything the user has bookmarked: telecom plans,
 * vouchers, etc. Auth-gated; redirects to /profile if not logged in.
 *
 * Plans are rendered with the existing ConnectedPlanCard.
 * Vouchers are rendered with a compact tile that opens /vouchers on click.
 */
import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Smartphone, Gift } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useBookmarks } from '../context/BookmarkContext';
import { usePlans } from '../context/PlansContext';
import { ConnectedPlanCard } from '../components/PlanCard';
import { Button } from '@/components/ui/button';
import { MOCK_VOUCHERS, BrandTile, PriceStrip } from './VouchersPage';

export default function SavedPlansPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const { isLoggedIn, loading } = useAuth();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const { plans } = usePlans();
  const navigate = useNavigate();
  const planScrollRef = useRef<HTMLDivElement>(null);

  const bookmarkedPlans = useMemo(
    () => plans.filter(p => bookmarks.some(b => b.kind === 'plan' && b.id === String(p.id))),
    [plans, bookmarks],
  );
  const bookmarkedVouchers = useMemo(
    () => MOCK_VOUCHERS.filter(v => bookmarks.some(b => b.kind === 'voucher' && b.id === v.id)),
    [bookmarks],
  );
  const totalCount = bookmarkedPlans.length + bookmarkedVouchers.length;

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/profile?tab=signup&from=saved');
    }
  }, [loading, isLoggedIn, navigate]);

  const scrollPlans = (dir: 'left' | 'right') => {
    const el = planScrollRef.current;
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
                {isAr ? 'المفضلة' : 'Bookmarks'}
              </h1>
              <p className="text-foreground/55 text-[11px] md:text-xs leading-tight">
                {totalCount > 0
                  ? (isAr
                      ? `${totalCount} عنصر محفوظ`
                      : `${totalCount} item${totalCount === 1 ? '' : 's'} saved for later`)
                  : (isAr ? 'لا يوجد محفوظات بعد' : 'Nothing saved yet')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {totalCount === 0 ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
            <Bookmark size={28} className="text-muted-foreground" />
          </div>
          <h3 className="font-heading font-bold text-lg text-foreground">
            {isAr ? 'لا يوجد محفوظات' : 'No bookmarks yet'}
          </h3>
          <p className="text-muted-foreground mt-1.5 text-sm max-w-sm mx-auto">
            {isAr
              ? 'استخدم رمز العلامة المرجعية على أي بطاقة باقة أو قسيمة لحفظها هنا للرجوع إليها لاحقاً.'
              : 'Tap the bookmark icon on any plan or voucher card to save it here for later.'}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button asChild variant="default">
              <Link to="/plans">{isAr ? 'تصفّح الباقات' : 'Browse plans'}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/vouchers">{isAr ? 'القسائم' : 'Vouchers'}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-6 pb-12 space-y-8">
          {/* Plans section */}
          {bookmarkedPlans.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={16} className="text-foreground/70" />
                <h2 className="font-heading font-bold text-sm md:text-base text-foreground">
                  {isAr ? 'الباقات' : 'Plans'}
                </h2>
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-foreground/50 ms-1">
                  {bookmarkedPlans.length}
                </span>
              </div>
              <div className="relative">
                {/* Desktop scroll arrows */}
                <button
                  onClick={() => scrollPlans('left')}
                  aria-label="Scroll left"
                  className="hidden md:flex absolute start-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card border-2 border-border ob-card-elev items-center justify-center text-foreground/70 hover:text-foreground hover:scale-110 transition-transform"
                >
                  <ChevronLeft size={18} className="rtl:rotate-180" />
                </button>
                <button
                  onClick={() => scrollPlans('right')}
                  aria-label="Scroll right"
                  className="hidden md:flex absolute end-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-card border-2 border-border ob-card-elev items-center justify-center text-foreground/70 hover:text-foreground hover:scale-110 transition-transform"
                >
                  <ChevronRight size={18} className="rtl:rotate-180" />
                </button>
                <div
                  ref={planScrollRef}
                  className="flex gap-3 md:gap-4 overflow-x-auto pb-3 snap-x snap-mandatory -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 scroll-smooth"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {bookmarkedPlans.map(plan => (
                    <div key={plan.id} className="shrink-0 w-[260px] sm:w-[280px] md:w-[300px] snap-start">
                      <ConnectedPlanCard plan={plan} compact style={{ height: '100%' }} source="bookmarks" />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Vouchers section */}
          {bookmarkedVouchers.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Gift size={16} className="text-foreground/70" />
                <h2 className="font-heading font-bold text-sm md:text-base text-foreground">
                  {isAr ? 'القسائم' : 'Vouchers'}
                </h2>
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-foreground/50 ms-1">
                  {bookmarkedVouchers.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                {bookmarkedVouchers.map(v => (
                  <div
                    key={v.id}
                    className="flex flex-col rounded-2xl bg-card border border-border ob-card-elev p-3 hover:shadow-lg transition-all relative"
                  >
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark({ kind: 'voucher', id: v.id }); }}
                      aria-label={isAr ? 'إزالة من المفضلة' : 'Remove bookmark'}
                      className="absolute top-2 end-2 z-20 w-7 h-7 rounded-full bg-[#FE7151] text-white shadow-md flex items-center justify-center"
                    >
                      <Bookmark size={13} fill="currentColor" strokeWidth={2.4} />
                    </button>
                    <Link to="/vouchers" className="flex flex-col text-start">
                      <BrandTile v={v} />
                      <h3 className="font-bold text-[13px] text-foreground mt-2 leading-tight">{v.brand}</h3>
                      <p className="text-[10.5px] text-foreground/55 truncate mt-0.5">{v.tagline}</p>
                      <PriceStrip denominations={v.denominations} isAr={isAr} />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
