/**
 * About page ("/about") — Simba's mission, vision, values, and carrier list.
 *
 * Static marketing page with:
 *  - Mission, vision, and values sections
 *  - "How Simba Works" explainer (same as homepage)
 *  - Grid of all 8 carrier logos
 *  - CTA to start browsing plans
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Target, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useLang } from '../context/LanguageContext';
import { CARRIERS } from '../data/plans';
import WaveLines from '../components/WaveLines';

export default function AboutPage() {
  const { t } = useLang();

  const stats = [
    { icon: Target, value: '150+', label: t('about.statPlans') },
    { icon: Users, value: '8', label: t('about.statCarriers') },
  ];

  return (
    <div className="safe-pb flex flex-col">
      {/* Hero */}
      <div className="relative overflow-hidden flex items-center justify-center pt-16 pb-10 md:pt-24 md:pb-14 hero-gradient grain">
        <WaveLines />
        <div className="absolute top-0 end-0 w-80 h-80 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3 blob animate-float" />
        <div className="absolute bottom-0 start-0 w-52 h-52 rounded-full bg-white/[0.04] translate-y-1/3 -translate-x-1/3 blob-alt" style={{ animationDelay: '2s' }} />
        <div className="relative z-[2] max-w-3xl w-full mx-auto px-4 sm:px-6 md:px-8 text-center">
          <h1 className="font-heading font-normal text-3xl md:text-5xl text-black leading-tight">
            {t('about.title')}
          </h1>
          <p className="text-black/60 mt-4 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            {t('about.subtitle')}
          </p>

          <div className="flex items-center justify-center gap-8 md:gap-12 mt-10">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <Icon size={20} className="text-black/70 mx-auto mb-1.5" />
                  <p className="font-heading font-bold text-2xl md:text-3xl text-black">{stat.value}</p>
                  <p className="text-xs text-black/50 font-medium mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-16">
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-4">{t('about.missionTitle')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('about.missionDesc')}</p>
        </section>

        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-4">{t('about.visionTitle')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('about.visionDesc')}</p>
        </section>

        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-4">{t('about.valuesTitle')}</h2>
          <p className="text-muted-foreground leading-relaxed">{t('about.valuesDesc')}</p>
        </section>

        <Separator className="my-12" />

        {/* How it works */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-8 text-center">
            {t('about.howTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(step => (
              <Card key={step} className="text-center border-0 shadow-none bg-transparent">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <span className="font-heading font-bold text-lg text-primary">{step}</span>
                  </div>
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    {t(`howItWorks.step${step}Title`)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {t(`howItWorks.step${step}Desc`)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Carriers */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-8 text-center">
            {t('about.carriersTitle')}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {CARRIERS.map(c => (
              <Card key={c.name} className="flex items-center gap-2.5 px-5 py-3">
                <img src={c.logo} alt={c.name} className="h-6 w-auto object-contain" />
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="relative overflow-hidden rounded-xl p-8 md:p-12 hero-gradient grain">
            <WaveLines />
            <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-white/[0.04] -translate-y-1/3 translate-x-1/3 blob" />
            <div className="absolute bottom-0 start-0 w-32 h-32 rounded-full bg-white/[0.04] translate-y-1/3 -translate-x-1/3 blob-alt" />
            <div className="relative z-[2]">
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-black">
                {t('about.ctaTitle')}
              </h3>
              <p className="text-black/50 mt-2 text-sm max-w-md mx-auto">
                {t('about.ctaSubtitle')}
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Button asChild className="bg-white text-primary hover:bg-white/95 font-bold shadow-md">
                  <Link to="/advisor">
                    {t('finderCta.cta')}
                    <ArrowRight size={16} className="rtl:rotate-180" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 font-bold">
                  <Link to="/plans">{t('nav.plans')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
