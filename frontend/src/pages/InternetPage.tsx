/**
 * Home Internet ("/internet") — FTTH catalog placeholder.
 *
 * Mock data drives the UI shape so the team can review the design pattern.
 * Replace `MOCK_FTTH_PLANS` with real data from a /api/internet endpoint
 * when the FTTH catalog is wired up.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Wifi, Gauge, Calendar, MapPin } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import SarSymbol from '../components/SarSymbol';

interface FtthPlan {
  id: string;
  provider: string;
  name: string;
  speedMbps: number;
  uploadMbps: number;
  priceSAR: number;
  setupFeeSAR: number;
  installDays: number;
  contractMonths: number;
  popular?: boolean;
}

const MOCK_FTTH_PLANS: FtthPlan[] = [
  { id: 'stc-100',  provider: 'STC',     name: 'STC Fiber 100',  speedMbps: 100, uploadMbps: 50,  priceSAR: 199, setupFeeSAR: 0,    installDays: 3,  contractMonths: 12 },
  { id: 'stc-300',  provider: 'STC',     name: 'STC Fiber 300',  speedMbps: 300, uploadMbps: 150, priceSAR: 299, setupFeeSAR: 0,    installDays: 3,  contractMonths: 12, popular: true },
  { id: 'stc-1g',   provider: 'STC',     name: 'STC Fiber 1 Gig', speedMbps: 1000, uploadMbps: 500, priceSAR: 449, setupFeeSAR: 0,    installDays: 5,  contractMonths: 12 },
  { id: 'mob-200',  provider: 'Mobily',  name: 'Mobily Home 200', speedMbps: 200, uploadMbps: 100, priceSAR: 249, setupFeeSAR: 0,    installDays: 4,  contractMonths: 12 },
  { id: 'mob-500',  provider: 'Mobily',  name: 'Mobily Home 500', speedMbps: 500, uploadMbps: 250, priceSAR: 369, setupFeeSAR: 99,   installDays: 4,  contractMonths: 12 },
  { id: 'zain-200', provider: 'Zain',    name: 'Zain Home 200',   speedMbps: 200, uploadMbps: 100, priceSAR: 229, setupFeeSAR: 0,    installDays: 5,  contractMonths: 12 },
  { id: 'zain-500', provider: 'Zain',    name: 'Zain Home 500',   speedMbps: 500, uploadMbps: 250, priceSAR: 339, setupFeeSAR: 0,    installDays: 5,  contractMonths: 12 },
  { id: 'go-300',   provider: 'GO',      name: 'GO Fiber 300',    speedMbps: 300, uploadMbps: 150, priceSAR: 279, setupFeeSAR: 199,  installDays: 7,  contractMonths: 12 },
];

export default function InternetPage() {
  const { lang } = useLang();
  const isAr = lang === 'ar';

  return (
    <div className="safe-pb">
      {/* Slim themed hero */}
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-5">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1 text-foreground/60 text-[11px] font-medium hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} className="rtl:rotate-180" />
            {isAr ? 'كل المنتجات' : 'All products'}
          </Link>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-lg bg-card/40 backdrop-blur-md border border-border flex items-center justify-center">
              <Wifi size={18} className="text-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg md:text-xl text-foreground tracking-tight leading-tight">
                {isAr ? 'إنترنت المنزل (الألياف)' : 'Home Internet (Fiber)'}
              </h1>
              <p className="text-foreground/55 text-[11px] md:text-xs leading-tight">
                {isAr ? '8 مزودين · تركيب خلال 3-7 أيام' : '8 providers · install in 3–7 days'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Address check banner */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pt-5">
        <div className="flex items-center gap-3 rounded-xl bg-secondary border border-border px-4 py-3">
          <MapPin size={18} className="text-foreground/60 shrink-0" />
          <p className="flex-1 text-sm text-foreground/80">
            {isAr
              ? 'تحقق من توفر الألياف في عنوانك'
              : 'Check fiber availability at your address'}
          </p>
          <Button size="sm" className="text-xs shrink-0">
            {isAr ? 'تحقق' : 'Check'}
          </Button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {MOCK_FTTH_PLANS.map((plan) => (
          <article
            key={plan.id}
            className="relative flex flex-col rounded-2xl bg-card border border-border ob-card-elev p-5 hover:shadow-lg transition-all"
          >
            {plan.popular && (
              <span className="absolute -top-2 end-3 inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--ob-cta)] text-[var(--ob-cta-text)] text-[10px] font-bold shadow-sm">
                {isAr ? 'الأكثر شعبية' : 'Most popular'}
              </span>
            )}

            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {plan.provider}
              </span>
            </div>

            <h2 className="font-heading font-bold text-base text-foreground leading-tight">
              {plan.name}
            </h2>

            <div className="mt-3 flex items-baseline gap-1">
              <SarSymbol className="text-xs text-muted-foreground" />
              <span className="font-heading font-bold text-2xl text-foreground leading-none">
                {plan.priceSAR}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                / {isAr ? 'شهر' : 'month'}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-foreground/75">
                <Gauge size={13} className="text-foreground/50" />
                <span><strong>{plan.speedMbps}</strong> {isAr ? 'م.ب/ث' : 'Mbps'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-foreground/75">
                <Calendar size={13} className="text-foreground/50" />
                <span>{plan.installDays} {isAr ? 'أيام' : 'days'}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border text-[10px] text-foreground/60 leading-snug">
              {plan.setupFeeSAR > 0
                ? (isAr ? `رسوم تركيب ${plan.setupFeeSAR} ر.س` : `${plan.setupFeeSAR} SAR setup fee`)
                : (isAr ? '✓ تركيب مجاني' : '✓ Free installation')}
              {' · '}
              {plan.contractMonths === 0
                ? (isAr ? 'بدون عقد' : 'no contract')
                : (isAr ? `${plan.contractMonths} شهر عقد` : `${plan.contractMonths}-month contract`)}
            </div>

            <Button size="sm" className="mt-4 w-full font-bold text-[13px]">
              {isAr ? 'تحقق من العنوان' : 'Check address'}
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
