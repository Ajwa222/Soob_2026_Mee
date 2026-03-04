import { Link } from 'react-router-dom';
import {
  ArrowRight, Users, Target, Award,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { CARRIERS, PLANS_DATA } from '../data/plans';

export default function AboutPage() {
  const { t } = useLang();

  const stats = [
    { icon: Target, value: '150+', label: t('about.statPlans') },
    { icon: Users, value: '8', label: t('about.statCarriers') },
    { icon: Award, value: '100%', label: t('about.statFree') },
  ];

  return (
    <div className="relative z-10 safe-pb flex flex-col">
      {/* Hero — gradient area */}
      <div className="relative flex items-center justify-center pt-24 pb-10 md:pt-32 md:pb-14">
        <div
          className="max-w-[800px] w-full mx-auto px-4 sm:px-6 md:px-8 text-center"
          style={{ animation: 'fadeUp 0.5s ease-out both' }}
        >
          <h1 className="font-heading font-bold text-3xl md:text-5xl text-white leading-tight">
            {t('about.title')}
          </h1>
          <p className="text-white/70 mt-4 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            {t('about.subtitle')}
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mt-10">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="text-center">
                  <Icon size={20} className="text-white/80 mx-auto mb-1.5" />
                  <p className="font-heading font-bold text-2xl md:text-3xl text-white">{stat.value}</p>
                  <p className="text-xs text-white/60 font-medium mt-0.5">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* White area — content */}
      <div className="relative z-20 bg-[var(--color-bg)] rounded-t-3xl">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 md:px-8 py-12 md:py-16">
        {/* Mission */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-text-primary mb-4">
            {t('about.missionTitle')}
          </h2>
          <p className="text-text-secondary leading-relaxed">
            {t('about.missionDesc')}
          </p>
        </section>

        {/* Vision */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-text-primary mb-4">
            {t('about.visionTitle')}
          </h2>
          <p className="text-text-secondary leading-relaxed">
            {t('about.visionDesc')}
          </p>
        </section>

        {/* Values */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-text-primary mb-4">
            {t('about.valuesTitle')}
          </h2>
          <p className="text-text-secondary leading-relaxed">
            {t('about.valuesDesc')}
          </p>
        </section>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-text-primary mb-8 text-center">
            {t('about.howTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(step => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="font-heading font-bold text-lg text-primary">{step}</span>
                </div>
                <h3 className="font-heading font-bold text-sm text-text-primary">
                  {t(`howItWorks.step${step}Title`)}
                </h3>
                <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                  {t(`howItWorks.step${step}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Carriers */}
        <section className="mb-16">
          <h2 className="font-heading font-bold text-2xl text-text-primary mb-8 text-center">
            {t('about.carriersTitle')}
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {CARRIERS.map(c => (
              <div
                key={c.name}
                className="flex items-center gap-2.5 px-5 py-3 rounded-xl bg-surface border border-border/60"
              >
                <img src={c.logo} alt={c.name} className="h-6 w-auto object-contain" />
                <span className="text-sm font-semibold text-text-primary">{c.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <div className="relative overflow-hidden rounded-3xl p-8 md:p-12"
            style={{ background: 'linear-gradient(135deg, #1890e0 0%, #1FA9FF 50%, #6dcbca 100%)' }}>
            <div className="absolute top-0 end-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
            <div className="relative">
              <h3 className="font-heading font-bold text-2xl md:text-3xl text-white">
                {t('about.ctaTitle')}
              </h3>
              <p className="text-white/60 mt-2 text-sm max-w-md mx-auto">
                {t('about.ctaSubtitle')}
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <Link
                  to="/finder"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-primary
                    font-bold text-sm hover:bg-white/95 hover:shadow-lg transition-all duration-200 btn-press shadow-md"
                >
                  {t('finderCta.cta')}
                  <ArrowRight size={16} className="rtl:rotate-180" />
                </Link>
                <Link
                  to="/plans"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white
                    font-bold text-sm hover:bg-white/20 transition-all duration-200 btn-press"
                >
                  {t('nav.plans')}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
