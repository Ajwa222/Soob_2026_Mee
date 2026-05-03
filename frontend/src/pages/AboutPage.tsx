/**
 * About page ("/about") — SOOB's mission, vision, values, and carrier list.
 *
 * Static marketing page with:
 *  - Mission, vision, and values sections
 *  - "How SOOB Works" explainer (same as homepage)
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

export default function AboutPage() {
  const { t } = useLang();

  const stats = [
    { icon: Target, value: '150+', label: t('about.statPlans') },
    { icon: Users, value: '8', label: t('about.statCarriers') },
  ];

  return (
    <div className="safe-pb flex flex-col">
      {/* Hero — compact, content-driven height */}
      <div className="relative overflow-hidden flex items-center justify-center pt-8 pb-8 md:pt-12 md:pb-12 page-hero border-b border-border">
        <div className="relative z-[2] max-w-3xl w-full mx-auto px-4 sm:px-6 md:px-8 text-center">
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground leading-tight tracking-tight">
            {t('about.title')}
          </h1>
          <p className="text-foreground/65 mt-2 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            {t('about.subtitle')}
          </p>

          <div className="flex items-center justify-center gap-6 md:gap-10 mt-5">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <Icon size={20} className="mx-auto mb-1.5 text-foreground" />
                  <p className="font-heading font-bold text-xl md:text-2xl leading-none text-foreground">{stat.value}</p>
                  <p className="text-[10px] md:text-xs text-foreground/55 font-medium mt-0.5">{stat.label}</p>
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
        <section className="mb-10">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-6 text-center">
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

        {/* CTA — lavender with a contained right-anchored wave (no oversize pattern). */}
        <section className="text-center">
          <div
            className="relative overflow-hidden rounded-xl px-6 py-6 md:px-10 md:py-7"
            style={{ background: '#C59AFA' }}
          >
            {/* Wave anchored to the far-right corner — true edge accent, never crosses
             * past the title area. Smaller than the homepage cards because the About
             * CTA is much wider, so 55% would visually dominate the middle. */}
            <div
              className="absolute top-0 bottom-0 right-0 pointer-events-none"
              style={{
                width: '35%',
                maxWidth: '320px',
                backgroundImage: 'url(/patterns/wave-purple-medium.png)',
                backgroundSize: 'auto 130%',
                backgroundPosition: 'right center',
                backgroundRepeat: 'no-repeat',
                opacity: 0.30,
                mixBlendMode: 'multiply',
              }}
            />
            <div className="relative z-[2]">
              <h3 className="font-heading font-bold text-lg md:text-xl text-[#16143A] leading-tight">
                {t('about.ctaTitle')}
              </h3>
              <p className="text-[#16143A]/70 mt-1 text-sm max-w-md mx-auto">
                {t('about.ctaSubtitle')}
              </p>
              <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
                <Button asChild className="bg-[#16143A] text-white hover:bg-[#16143A]/90 font-bold">
                  <Link to="/advisor">
                    {t('finderCta.cta')}
                    <ArrowRight size={16} className="rtl:rotate-180" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="bg-transparent text-[#16143A] border-[#16143A]/40 hover:bg-[#16143A]/10 font-bold">
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
