/**
 * Browse Hub ("/browse") — landing page that splits the catalog into the
 * three SOOB product categories: Mobile Plans, Home Internet (FTTH), Vouchers.
 *
 * Layout (variant D — Featured + sub-grid):
 *   - Mobile Plans is the big featured card (full width, lavender + soft
 *     purple wave, navy ink).
 *   - Internet + Vouchers sit below in a 2-up sub-grid.
 *
 * The featured card uses wave-purple-medium (#8772E0) at low opacity so
 * navy text stays readable. The deeper purple variant was overpowering
 * the title.
 */
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Gift, ArrowRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { usePlans } from '../context/PlansContext';
import { trackEvent } from '../lib/analytics';

interface Category {
  key: 'mobile' | 'internet' | 'vouchers';
  href: string;
  icon: typeof Smartphone;
  title: { en: string; ar: string };
  tagline: { en: string; ar: string };
}

export default function BrowseHubPage() {
  const { lang } = useLang();
  const { plans } = usePlans();
  const isAr = lang === 'ar';

  const categories: Array<Category & { count: number; countLabel: { en: string; ar: string } }> = [
    {
      key: 'mobile',
      href: '/plans',
      icon: Smartphone,
      title: { en: 'Mobile Plans', ar: 'باقات الجوال' },
      tagline: {
        en: 'Compare prepaid, postpaid and data-only plans from every Saudi carrier.',
        ar: 'قارن باقات الدفع المسبق، الدفع الآجل، والبيانات فقط من كل مشغل في السعودية.',
      },
      count: plans.length,
      countLabel: { en: 'plans · 8 carriers', ar: 'باقة · 8 مشغلين' },
    },
    {
      key: 'internet',
      href: '/internet',
      icon: Wifi,
      title: { en: 'Home Internet', ar: 'إنترنت المنزل' },
      tagline: {
        en: 'Fiber-to-the-home plans for your address.',
        ar: 'باقات الألياف الضوئية لعنوانك.',
      },
      count: 8,
      countLabel: { en: 'fiber providers', ar: 'مزود ألياف' },
    },
    {
      key: 'vouchers',
      href: '/vouchers',
      icon: Gift,
      title: { en: 'Vouchers', ar: 'القسائم' },
      tagline: {
        en: 'Recharge cards, gaming credits, app store vouchers — instant codes.',
        ar: 'بطاقات شحن، ائتمان ألعاب، قسائم تطبيقات — رموز فورية.',
      },
      count: 120,
      countLabel: { en: 'voucher types', ar: 'نوع قسيمة' },
    },
  ];

  const featured = categories[0];
  const FeaturedIcon = featured.icon;
  const subs = categories.slice(1);

  return (
    <div className="safe-pb">
      {/* Hero — slim themed bar like /plans and /advisor */}
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-tight leading-tight">
            {isAr ? 'تصفح كل المنتجات' : 'Browse all products'}
          </h1>
          <p className="text-foreground/65 mt-1 text-sm md:text-base">
            {isAr
              ? 'الجوال، إنترنت المنزل، والقسائم — كل شيء في مكان واحد.'
              : 'Mobile plans, home internet, and vouchers — everything in one place.'}
          </p>
        </div>
      </section>

      {/* Featured + sub-grid */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-6 md:pt-10 pb-16 md:pb-24 flex flex-col gap-3 md:gap-4">

        {/* Featured: Mobile Plans — big lavender card with calm wave */}
        <Link
          to={featured.href}
          onClick={() => trackEvent('browse_category_clicked', { category: featured.key })}
          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl ob-card-elev hover:shadow-xl transition-all min-h-[200px] md:min-h-[240px] p-6 md:p-8"
          style={{ backgroundColor: '#C59AFA' }}
        >
          {/* Wave anchored to the RIGHT edge as a corner accent — never
           * crosses past the title area. Matches the homepage cards. */}
          <div
            className="absolute top-0 bottom-0 right-0 pointer-events-none"
            style={{
              width: '55%',
              backgroundImage: 'url(/patterns/wave-purple-medium.png)',
              backgroundSize: 'auto 130%',
              backgroundPosition: 'left center',
              backgroundRepeat: 'no-repeat',
              opacity: 0.32,
            }}
          />
          <div className="relative z-10 flex items-start justify-end">
            <FeaturedIcon size={28} className="text-[#16143A]" strokeWidth={2.2} />
          </div>
          <div className="relative z-10">
            <h3 className="font-heading font-bold text-2xl md:text-3xl text-[#16143A] leading-tight tracking-tight">
              {featured.title[isAr ? 'ar' : 'en']}
            </h3>
            <p className="text-[#16143A]/75 text-sm md:text-base mt-1.5 max-w-md">
              {featured.tagline[isAr ? 'ar' : 'en']}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-[#16143A] font-bold text-sm">
              <span>
                {featured.count} {featured.countLabel[isAr ? 'ar' : 'en']}
              </span>
              <ArrowRight size={16} className="rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </Link>

        {/* Sub-grid: Internet + Vouchers — each on its own brand color */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {subs.map((cat) => {
            const Icon = cat.icon;
            const tint = cat.key === 'internet'
              ? { bg: '#CFEB74', wave: 0.18 }      // lime — fresh / fast (fiber)
              : { bg: '#FE7151', wave: 0.20 };      // coral — warm / gift
            return (
              <Link
                key={cat.key}
                to={cat.href}
                onClick={() => trackEvent('browse_category_clicked', { category: cat.key })}
                className="group relative flex flex-col overflow-hidden rounded-2xl ob-card-elev hover:shadow-lg transition-all p-5"
                style={{ backgroundColor: tint.bg }}
              >
                <div
                  className="absolute top-0 bottom-0 right-0 pointer-events-none"
                  style={{
                    width: '55%',
                    backgroundImage: 'url(/patterns/wave-purple-medium.png)',
                    backgroundSize: 'auto 130%',
                    backgroundPosition: 'left center',
                    backgroundRepeat: 'no-repeat',
                    opacity: tint.wave,
                    mixBlendMode: 'multiply',
                  }}
                />
                <Icon size={22} className="relative z-10 text-[#16143A]" strokeWidth={2.2} />
                <h3 className="relative z-10 font-heading font-bold text-base md:text-lg text-[#16143A] leading-tight mt-3">
                  {cat.title[isAr ? 'ar' : 'en']}
                </h3>
                <p className="relative z-10 text-[#16143A]/75 text-[12px] mt-1 leading-snug flex-1">
                  {cat.tagline[isAr ? 'ar' : 'en']}
                </p>
                <div className="relative z-10 mt-3 flex items-center justify-between">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#16143A]/65">
                    <strong className="text-[#16143A]">{cat.count}</strong>{' '}
                    {cat.countLabel[isAr ? 'ar' : 'en']}
                  </span>
                  <ArrowRight
                    size={16}
                    className="text-[#16143A] group-hover:translate-x-0.5 transition-all rtl:rotate-180"
                  />
                </div>
              </Link>
            );
          })}
        </div>

      </div>
    </div>
  );
}
