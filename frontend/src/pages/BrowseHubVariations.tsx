/**
 * Browse Hub — design variations page (internal review).
 *
 * 4 distinct card designs stacked on one page so the team can compare them
 * side by side and pick a winner. Once a variant is chosen, paste its JSX
 * into BrowseHubPage.tsx and delete this file.
 */
import { Link } from 'react-router-dom';
import { Smartphone, Wifi, Gift, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { usePlans } from '../context/PlansContext';

const useCategories = () => {
  const { plans } = usePlans();
  const { lang } = useLang();
  const isAr = lang === 'ar';

  return [
    {
      key: 'mobile',
      href: '/plans',
      icon: Smartphone,
      title: isAr ? 'باقات الجوال' : 'Mobile Plans',
      tagline: isAr
        ? 'كل المشغلين السعوديين في مكان واحد.'
        : 'Every Saudi carrier, one place.',
      count: plans.length,
      countLabel: isAr ? 'باقة' : 'plans',
    },
    {
      key: 'internet',
      href: '/internet',
      icon: Wifi,
      title: isAr ? 'إنترنت المنزل' : 'Home Internet',
      tagline: isAr
        ? 'باقات الألياف الضوئية لعنوانك.'
        : 'Fiber-to-the-home for your address.',
      count: 8,
      countLabel: isAr ? 'مزود' : 'providers',
    },
    {
      key: 'vouchers',
      href: '/vouchers',
      icon: Gift,
      title: isAr ? 'القسائم' : 'Vouchers',
      tagline: isAr
        ? 'بطاقات شحن، ألعاب، تطبيقات — رموز فورية.'
        : 'Recharge, gaming, app store — instant codes.',
      count: 120,
      countLabel: isAr ? 'نوع' : 'types',
    },
  ];
};

export default function BrowseHubVariations() {
  const cats = useCategories();
  const { lang } = useLang();
  const isAr = lang === 'ar';

  return (
    <div className="safe-pb">
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-5 md:py-7">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground tracking-tight leading-tight">
            Browse Hub — Variants
          </h1>
          <p className="text-foreground/65 mt-1 text-sm md:text-base">
            4 designs. Pick one and I'll lock it in. Reply with the letter.
          </p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 flex flex-col gap-12 md:gap-16">

        {/* ============ VARIANT A — Editorial / Numbered list ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">A</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Editorial · numbered list · no icons
            </span>
          </div>
          <div className="flex flex-col">
            {cats.map((cat, i) => (
              <Link
                key={cat.key}
                to={cat.href}
                className="group flex items-center gap-5 md:gap-8 py-6 md:py-7 border-t border-border last:border-b hover:bg-secondary/40 transition-colors -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8"
              >
                <span className="font-heading font-bold text-3xl md:text-4xl text-foreground/30 tabular-nums shrink-0 w-10">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-xl md:text-2xl text-foreground leading-tight tracking-tight">
                    {cat.title}
                  </h3>
                  <p className="text-foreground/65 text-sm mt-1">
                    {cat.tagline}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="font-heading font-bold text-2xl text-foreground tabular-nums leading-none">
                    {cat.count}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-foreground/50 font-mono mt-0.5">
                    {cat.countLabel}
                  </span>
                </div>
                <ArrowUpRight
                  size={20}
                  className="shrink-0 text-foreground/30 group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
                />
              </Link>
            ))}
          </div>
        </section>

        {/* ============ VARIANT B — Vertical icon tiles (3-up grid) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">B</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Vertical tiles · big icon top · 3-up grid
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {cats.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  to={cat.href}
                  className="group flex flex-col items-center text-center rounded-2xl bg-card border border-border ob-card-elev hover:shadow-xl hover:-translate-y-0.5 transition-all p-6 md:p-8"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#C59AFA]/20 flex items-center justify-center mb-4 group-hover:bg-[#C59AFA]/35 transition-colors">
                    <Icon size={28} className="text-[#16143A]" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-heading font-bold text-base md:text-lg text-foreground leading-tight">
                    {cat.title}
                  </h3>
                  <p className="text-foreground/65 text-xs mt-1.5 leading-snug">
                    {cat.tagline}
                  </p>
                  <div className="mt-4 pt-4 border-t border-border w-full text-[11px] font-mono uppercase tracking-wider text-foreground/55">
                    <span className="font-bold text-foreground/80">{cat.count}</span> {cat.countLabel}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============ VARIANT C — Accent rail (Transparency-style) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">C</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Accent rail · clean horizontal · navy ink
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {cats.map((cat, i) => {
              const Icon = cat.icon;
              const railColors = ['#C59AFA', '#9B7DEE', '#16143A'];
              return (
                <Link
                  key={cat.key}
                  to={cat.href}
                  className="group flex items-center gap-4 md:gap-5 rounded-xl bg-card border border-border ob-card-elev hover:shadow-lg hover:translate-x-0.5 transition-all p-4 md:p-5 border-l-4"
                  style={{ borderLeftColor: railColors[i] }}
                >
                  <Icon size={22} className="text-foreground/70 shrink-0" strokeWidth={2} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-base md:text-lg text-foreground leading-tight">
                      {cat.title}
                    </h3>
                    <p className="text-foreground/60 text-[12.5px] mt-0.5">
                      {cat.tagline}
                    </p>
                  </div>
                  <span className="hidden sm:flex items-baseline gap-1 shrink-0 px-3 py-1 rounded-full bg-secondary text-foreground/70 text-[11px] font-mono uppercase tracking-wider">
                    <strong className="text-foreground">{cat.count}</strong> {cat.countLabel}
                  </span>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all rtl:rotate-180"
                  />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============ VARIANT D — Featured + sub-grid (asymmetric) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">D</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Featured + sub · Mobile dominant · others below
            </span>
          </div>
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Featured: Mobile */}
            {(() => {
              const cat = cats[0];
              const Icon = cat.icon;
              return (
                <Link
                  to={cat.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl ob-card-elev hover:shadow-xl transition-all min-h-[200px] md:min-h-[240px] p-6 md:p-8"
                  style={{
                    backgroundColor: '#C59AFA',
                    backgroundImage: 'url(/patterns/wave-purple-deep.png)',
                    backgroundSize: '120% auto',
                    backgroundPosition: '90% 50%',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/85 text-[#16143A] text-[10px] font-bold uppercase tracking-wider">
                      ★ {isAr ? 'الأكثر شعبية' : 'Most popular'}
                    </span>
                    <Icon size={28} className="text-[#16143A]" strokeWidth={2.2} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-heading font-bold text-2xl md:text-3xl text-[#16143A] leading-tight tracking-tight">
                      {cat.title}
                    </h3>
                    <p className="text-[#16143A]/75 text-sm mt-1.5 max-w-md">
                      {cat.tagline}
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 text-[#16143A] font-bold text-sm">
                      <span>{cat.count} {cat.countLabel}</span>
                      <ArrowRight size={16} className="rtl:rotate-180 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })()}

            {/* Sub-grid: Internet + Vouchers */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {cats.slice(1).map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.key}
                    to={cat.href}
                    className="group flex flex-col rounded-2xl bg-card border border-border ob-card-elev hover:shadow-lg transition-all p-5"
                  >
                    <Icon size={22} className="text-foreground/70" strokeWidth={2.2} />
                    <h3 className="font-heading font-bold text-base md:text-lg text-foreground leading-tight mt-3">
                      {cat.title}
                    </h3>
                    <p className="text-foreground/60 text-[12px] mt-1 leading-snug flex-1">
                      {cat.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10.5px] font-mono uppercase tracking-wider text-foreground/55">
                        <strong className="text-foreground/80">{cat.count}</strong> {cat.countLabel}
                      </span>
                      <ArrowRight
                        size={16}
                        className="text-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all rtl:rotate-180"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ============ VARIANT E — Solid color blocks (no white) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">E</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Solid color blocks · navy ink · no white card
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {cats.map((cat, i) => {
              const Icon = cat.icon;
              const blockBg = ['#C59AFA', '#DCCFFF', '#9B7DEE'];
              return (
                <Link
                  key={cat.key}
                  to={cat.href}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl ob-card-elev hover:shadow-xl hover:-translate-y-0.5 transition-all p-6 min-h-[180px]"
                  style={{ backgroundColor: blockBg[i] }}
                >
                  <Icon size={28} className="text-[#16143A] relative z-10" strokeWidth={2.2} />
                  <div className="relative z-10">
                    <h3 className="font-heading font-bold text-xl md:text-2xl text-[#16143A] leading-tight tracking-tight">
                      {cat.title}
                    </h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[#16143A]/70 text-[11px] font-mono uppercase tracking-wider">
                        {cat.count} {cat.countLabel}
                      </span>
                      <ArrowRight size={16} className="text-[#16143A] rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============ VARIANT F — Wave-corner cards (visual brand) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">F</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              SOOB wave in the corner · big mark · brand-forward
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {cats.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  to={cat.href}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border ob-card-elev hover:shadow-xl transition-all p-5 min-h-[200px] flex flex-col justify-between"
                >
                  {/* Wave corner accent */}
                  <div
                    className="absolute -top-4 -end-4 w-32 h-32 opacity-30 pointer-events-none"
                    style={{
                      backgroundImage: 'url(/patterns/wave-purple-medium.png)',
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'top right',
                    }}
                  />
                  <div className="relative z-10 w-12 h-12 rounded-xl bg-[#C59AFA]/15 flex items-center justify-center">
                    <Icon size={22} className="text-[#16143A]" strokeWidth={2.2} />
                  </div>
                  <div className="relative z-10">
                    <h3 className="font-heading font-bold text-lg text-foreground leading-tight">
                      {cat.title}
                    </h3>
                    <p className="text-foreground/60 text-[12px] mt-1 leading-snug">
                      {cat.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-wider text-foreground/55 pt-3 border-t border-border">
                      <span><strong className="text-foreground/85">{cat.count}</strong> {cat.countLabel}</span>
                      <ArrowRight size={14} className="text-foreground/50 rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============ VARIANT G — Minimal pills (compact / mobile-first) ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">G</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Minimal pills · ultra compact · iOS-style
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border overflow-hidden ob-card-elev">
            {cats.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  to={cat.href}
                  className={`group flex items-center gap-3 px-5 py-4 hover:bg-secondary/40 transition-colors ${i < cats.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#C59AFA]/20 flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-[#16143A]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-foreground leading-tight">{cat.title}</h3>
                    <p className="text-foreground/60 text-[11.5px] mt-0.5 truncate">{cat.tagline}</p>
                  </div>
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-foreground/55 shrink-0">
                    <strong className="text-foreground/85">{cat.count}</strong> {cat.countLabel}
                  </span>
                  <ArrowRight size={16} className="text-foreground/30 group-hover:text-foreground transition-colors rtl:rotate-180" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* ============ VARIANT H — Glass cards on lavender hero ============ */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-heading font-bold text-3xl text-[var(--ob-cta)]">H</span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/60">
              Glass cards · floating on lavender hero · premium
            </span>
          </div>
          <div
            className="relative overflow-hidden rounded-3xl p-6 md:p-8"
            style={{
              backgroundColor: '#C59AFA',
              backgroundImage: 'url(/patterns/wave-purple-deep.png)',
              backgroundSize: '140% auto',
              backgroundPosition: '80% 50%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 relative z-10">
              {cats.map((cat) => {
                const Icon = cat.icon;
                return (
                  <Link
                    key={cat.key}
                    to={cat.href}
                    className="group flex flex-col rounded-2xl bg-white/85 backdrop-blur-md border border-white/40 hover:bg-white hover:shadow-lg transition-all p-5 min-h-[180px]"
                  >
                    <Icon size={26} className="text-[#16143A]" strokeWidth={2.2} />
                    <h3 className="font-heading font-bold text-lg text-[#16143A] leading-tight mt-auto">
                      {cat.title}
                    </h3>
                    <p className="text-[#16143A]/65 text-[12px] mt-1 leading-snug">
                      {cat.tagline}
                    </p>
                    <div className="mt-3 flex items-center justify-between text-[10.5px] font-mono uppercase tracking-wider text-[#16143A]/60">
                      <span><strong className="text-[#16143A]">{cat.count}</strong> {cat.countLabel}</span>
                      <ArrowRight size={14} className="rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
