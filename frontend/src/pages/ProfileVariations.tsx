/**
 * ProfileVariations — preview page at /profile-variants showing 5 design
 * directions for the My Profile screen so the team can pick one.
 *
 * Variants:
 *  1. Banking Dashboard   — Revolut/Wise — stats bar + horizontal action tiles
 *  2. Apple Account       — clean grouped settings list, big initial avatar
 *  3. Stripe Sidebar      — left sidebar navigation + right content panel
 *  4. Spotify Hero        — colorful gradient hero, avatar + pills below
 *  5. Compact Linear      — minimal centered, single column, lots of breathing room
 */
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Package, Bookmark, Globe, LifeBuoy, LogOut, ChevronRight,
  Wallet, TrendingUp, CreditCard, Bell, Shield, Settings,
  Gift, Wifi, Smartphone, Mail, Phone, Edit3, Sparkles, ArrowRight,
  Calendar, Plus, RotateCcw, Clock, Zap, BarChart3,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileVariations() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  type V = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  const [variant, setVariant] = useState<V>(6);

  const variantInfo: { id: V; name: string; hint: string }[] = [
    { id: 1,  name: 'Banking Dashboard', hint: 'Revolut / Wise — stats bar + action tiles' },
    { id: 2,  name: 'Apple Account',     hint: 'Clean grouped list, big initial avatar' },
    { id: 3,  name: 'Stripe Sidebar',    hint: 'Left nav + right content panel' },
    { id: 4,  name: 'Spotify Hero',      hint: 'Gradient hero with avatar + pills' },
    { id: 5,  name: 'Compact Linear',    hint: 'Minimal centered, lots of breathing room' },
    { id: 6,  name: 'Active Lines Wallet',  hint: 'Apple Wallet — stack of SIM/plan cards by carrier' },
    { id: 7,  name: 'Usage Dashboard',      hint: 'STC/Mobily app style — usage circle + days left + actions' },
    { id: 8,  name: 'Multi-Line Manager',   hint: 'Family/business — grid of line cards + total spend' },
    { id: 9,  name: 'Telecom Concierge',    hint: 'AI insights banner + renewal timeline + smart actions' },
    { id: 10, name: 'Stats-First',          hint: 'Data-rich dashboard — big numbers + carrier breakdown chart' },
  ];

  return (
    <div className="safe-pb">
      {/* Switcher */}
      <section className="border-b border-border bg-card sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-3">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="font-heading font-bold text-base text-foreground">Profile · variant preview</h1>
            <Link to="/profile" className="text-[11px] font-bold underline underline-offset-4 text-foreground/60 hover:text-foreground">
              ← current
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {variantInfo.map(v => {
              const active = variant === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                  className={`shrink-0 inline-flex flex-col items-start rounded-xl px-3 py-2 text-start border-2 transition-all ${
                    active ? '' : 'border-border bg-card hover:border-foreground/30'
                  }`}
                  style={active ? { background: '#16143A', color: '#FFFFFF', borderColor: '#16143A' } : { color: 'inherit' }}
                >
                  <span className="text-[10px] font-mono tracking-wider opacity-60">{v.id}</span>
                  <span className="font-bold text-[12px] leading-tight whitespace-nowrap">{v.name}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-foreground/55">{variantInfo.find(v => v.id === variant)?.hint}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-4">
        {variant === 1 ? <V1Banking isAr={isAr} />
         : variant === 2 ? <V2Apple isAr={isAr} />
         : variant === 3 ? <V3Stripe isAr={isAr} />
         : variant === 4 ? <V4Spotify isAr={isAr} />
         : variant === 5 ? <V5Compact isAr={isAr} />
         : variant === 6 ? <V6Wallet isAr={isAr} />
         : variant === 7 ? <V7Usage isAr={isAr} />
         : variant === 8 ? <V8MultiLine isAr={isAr} />
         : variant === 9 ? <V9Concierge isAr={isAr} />
         : <V10Stats isAr={isAr} />}
      </div>
    </div>
  );
}

// Shared mock user
function useMockUser() {
  const { user } = useAuth();
  return {
    name: user?.name ?? 'Mohammed Al-Otaibi',
    email: user?.email ?? 'mohammed@example.com',
    phone: user?.phone ?? '+966 50 123 4567',
    photoURL: user?.photoURL ?? null,
    initial: (user?.name ?? 'MA').slice(0, 2).toUpperCase(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 1 — Banking Dashboard (Revolut / Wise)
// ─────────────────────────────────────────────────────────────────────────
function V1Banking({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
            {u.initial}
          </div>
          <div>
            <div className="font-heading font-bold text-base text-foreground">{u.name}</div>
            <div className="text-[11.5px] text-foreground/60">{u.phone}</div>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-foreground/60 hover:text-foreground" aria-label="Edit">
          <Edit3 size={15} />
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-card border border-border p-1.5">
        <Stat icon={Package} value="9" label={isAr ? 'الطلبات' : 'Orders'} bg="rgba(197, 154, 250, 0.18)" iconColor="#16143A" />
        <Stat icon={Wallet} value="247 SAR" label={isAr ? 'وفّرت' : 'Saved'} bg="rgba(207, 235, 116, 0.30)" iconColor="#16143A" />
        <Stat icon={TrendingUp} value="3" label={isAr ? 'نشطة' : 'Active'} bg="rgba(254, 113, 81, 0.15)" iconColor="#FE7151" />
      </div>

      {/* Quick actions horizontal */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2 px-1">
          {isAr ? 'وصول سريع' : 'Quick actions'}
        </p>
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1" style={{ scrollbarWidth: 'none' }}>
          <ActionTile icon={Package} label={isAr ? 'طلباتي' : 'Orders'} bg="#C59AFA" />
          <ActionTile icon={Bookmark} label={isAr ? 'محفوظة' : 'Saved'} bg="#FE7151" fg="#fff" />
          <ActionTile icon={Smartphone} label="SIM" bg="#CFEB74" />
          <ActionTile icon={Wifi} label={isAr ? 'الإنترنت' : 'Fiber'} bg="rgba(197, 154, 250, 0.30)" />
          <ActionTile icon={Gift} label={isAr ? 'القسائم' : 'Vouchers'} bg="rgba(254, 113, 81, 0.18)" />
        </div>
      </div>

      {/* Account list */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2 px-1">
          {isAr ? 'الحساب' : 'Account'}
        </p>
        <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
          <Row icon={Bell} title={isAr ? 'الإشعارات' : 'Notifications'} hint={isAr ? '3 جديدة' : '3 new'} />
          <Row icon={CreditCard} title={isAr ? 'الدفع' : 'Payment methods'} hint="STC Pay" />
          <Row icon={Shield} title={isAr ? 'الأمان' : 'Security'} hint={isAr ? 'محمية' : 'Active'} />
          <Row icon={Globe} title={isAr ? 'اللغة' : 'Language'} hint={isAr ? 'العربية' : 'English'} />
          <Row icon={LifeBuoy} title={isAr ? 'المساعدة' : 'Support'} />
        </div>
      </div>

      <button className="w-full text-center text-[12px] font-semibold text-destructive py-3 hover:bg-destructive/5 rounded-xl transition-colors">
        <LogOut size={14} className="inline-block me-1" />
        {isAr ? 'تسجيل الخروج' : 'Sign out'}
      </button>
    </div>
  );
}

function Stat({ icon: Icon, value, label, bg, iconColor }: { icon: React.ComponentType<{ size?: number; className?: string }>; value: string; label: string; bg: string; iconColor: string }) {
  return (
    <div className="rounded-xl px-2 py-2.5 text-center" style={{ background: bg }}>
      <Icon size={14} className="mx-auto mb-0.5" style={{ color: iconColor }} />
      <div className="font-heading font-bold text-[14px] leading-tight" style={{ color: iconColor }}>{value}</div>
      <div className="text-[10px] text-foreground/60 mt-0.5">{label}</div>
    </div>
  );
}

function ActionTile({ icon: Icon, label, bg, fg = '#16143A' }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; bg: string; fg?: string }) {
  return (
    <button className="shrink-0 w-[88px] flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 transition-transform hover:-translate-y-0.5" style={{ background: bg, color: fg }}>
      <Icon size={20} strokeWidth={2.2} />
      <span className="text-[11px] font-bold leading-tight text-center">{label}</span>
    </button>
  );
}

function Row({ icon: Icon, title, hint, danger }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; hint?: string; danger?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/40 transition-colors text-start ${danger ? 'text-destructive' : ''}`}>
      <Icon size={16} className={danger ? 'text-destructive' : 'text-foreground/55'} />
      <span className="flex-1 font-semibold text-[13.5px]">{title}</span>
      {hint && <span className="text-[11px] text-foreground/45">{hint}</span>}
      <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 2 — Apple Account (clean grouped list)
// ─────────────────────────────────────────────────────────────────────────
function V2Apple({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="space-y-4 max-w-md mx-auto">
      {/* Hero card */}
      <div className="rounded-3xl bg-card border border-border p-6 text-center">
        <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-white font-bold text-2xl shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
          {u.initial}
        </div>
        <h2 className="font-heading font-bold text-xl text-foreground mt-3">{u.name}</h2>
        <p className="text-[12.5px] text-foreground/55 mt-0.5">{u.email}</p>
        <button className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground border border-border bg-secondary/40 hover:bg-secondary px-4 py-1.5 rounded-full">
          <Edit3 size={12} /> {isAr ? 'تعديل الحساب' : 'Edit account'}
        </button>
      </div>

      {/* Sections */}
      <Section title={isAr ? 'النشاط' : 'Activity'}>
        <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <Row icon={Bookmark} title={isAr ? 'الباقات المحفوظة' : 'Saved Plans'} hint="3" />
      </Section>
      <Section title={isAr ? 'الإعدادات' : 'Settings'}>
        <Row icon={Bell} title={isAr ? 'الإشعارات' : 'Notifications'} />
        <Row icon={Globe} title={isAr ? 'اللغة' : 'Language'} hint={isAr ? 'العربية' : 'English'} />
        <Row icon={Shield} title={isAr ? 'الخصوصية والأمان' : 'Privacy & security'} />
      </Section>
      <Section title={isAr ? 'الدعم' : 'Help'}>
        <Row icon={LifeBuoy} title={isAr ? 'الدعم والمساعدة' : 'Help & support'} />
        <Row icon={Mail} title={isAr ? 'تواصل معنا' : 'Contact us'} />
      </Section>

      <button className="w-full text-center text-[13px] font-semibold text-destructive py-3 mt-2">
        {isAr ? 'تسجيل الخروج' : 'Sign out'}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/50 mb-1.5 px-4">{title}</p>
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 3 — Stripe Sidebar (desktop split layout, mobile stacks)
// ─────────────────────────────────────────────────────────────────────────
function V3Stripe({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  const [active, setActive] = useState('orders');
  const items = [
    { id: 'orders',   icon: Package,  label: isAr ? 'طلباتي' : 'Orders' },
    { id: 'saved',    icon: Bookmark, label: isAr ? 'محفوظة' : 'Saved plans' },
    { id: 'payment',  icon: CreditCard, label: isAr ? 'الدفع' : 'Payment' },
    { id: 'security', icon: Shield,   label: isAr ? 'الأمان' : 'Security' },
    { id: 'lang',     icon: Globe,    label: isAr ? 'اللغة' : 'Language' },
    { id: 'help',     icon: LifeBuoy, label: isAr ? 'الدعم' : 'Support' },
  ];

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-4">
      {/* Sidebar */}
      <aside className="rounded-2xl bg-card border border-border p-3 h-fit">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-2 border-b border-border">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
            {u.initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-heading font-bold text-[12.5px] text-foreground truncate">{u.name.split(' ')[0]}</div>
            <div className="text-[10.5px] text-foreground/55 truncate">{u.email}</div>
          </div>
        </div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {items.map(it => {
            const Icon = it.icon;
            const sel = active === it.id;
            return (
              <button
                key={it.id}
                onClick={() => setActive(it.id)}
                className={`shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold transition-all whitespace-nowrap md:w-full text-start ${
                  sel ? 'bg-foreground text-background' : 'text-foreground/70 hover:bg-secondary'
                }`}
              >
                <Icon size={14} />
                {it.label}
              </button>
            );
          })}
          <button className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12.5px] font-semibold text-destructive hover:bg-destructive/10 mt-2 md:w-full text-start whitespace-nowrap">
            <LogOut size={14} />
            {isAr ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </nav>
      </aside>

      {/* Content panel */}
      <main className="rounded-2xl bg-card border border-border p-5 min-h-[320px]">
        <h2 className="font-heading font-bold text-lg text-foreground mb-1">
          {items.find(i => i.id === active)?.label}
        </h2>
        <p className="text-[12.5px] text-foreground/55 mb-4">
          {isAr ? 'إدارة هذا القسم.' : 'Manage this section.'}
        </p>
        <div className="rounded-xl bg-secondary/30 border border-dashed border-border p-8 text-center text-[12px] text-foreground/55">
          {isAr ? 'محتوى القسم يظهر هنا.' : 'Section content goes here.'}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 4 — Spotify Hero (gradient hero + pills + list)
// ─────────────────────────────────────────────────────────────────────────
function V4Spotify({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="-mx-4 sm:-mx-6 md:-mx-8 -mt-4">
      {/* Hero with gradient */}
      <div
        className="relative px-6 pt-10 pb-16 text-white overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #C59AFA 0%, #9B7DEE 50%, #16143A 100%)' }}
      >
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-28 h-28 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white font-heading font-bold text-3xl shadow-2xl border-4 border-white/20">
            {u.initial}
          </div>
          <p className="text-[10.5px] font-bold uppercase tracking-widest mt-4 opacity-80">
            {isAr ? 'عضو صوب' : 'SOOB Member'}
          </p>
          <h2 className="font-heading font-bold text-2xl mt-1">{u.name}</h2>
          <p className="text-[12.5px] mt-1 opacity-80">{u.email}</p>
        </div>
      </div>

      {/* Stats pills, overlapping the hero */}
      <div className="px-4 sm:px-6 md:px-8 -mt-8 relative z-20 mb-5">
        <div className="rounded-2xl bg-card shadow-xl border border-border p-3 grid grid-cols-3 divide-x divide-border">
          <PillStat value="9" label={isAr ? 'الطلبات' : 'Orders'} />
          <PillStat value="3" label={isAr ? 'محفوظة' : 'Saved'} />
          <PillStat value="247" label={isAr ? 'وفّرت ر.س' : 'SAR saved'} />
        </div>
      </div>

      {/* List */}
      <div className="px-4 sm:px-6 md:px-8 space-y-3 pb-6">
        <Section title={isAr ? 'النشاط' : 'Activity'}>
          <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
          <Row icon={Bookmark} title={isAr ? 'الباقات المحفوظة' : 'Saved Plans'} hint="3" />
        </Section>
        <Section title={isAr ? 'الإعدادات' : 'Settings'}>
          <Row icon={Bell} title={isAr ? 'الإشعارات' : 'Notifications'} />
          <Row icon={Globe} title={isAr ? 'اللغة' : 'Language'} hint={isAr ? 'العربية' : 'English'} />
          <Row icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
        </Section>
        <button className="w-full text-center text-[13px] font-semibold text-destructive py-3">
          {isAr ? 'تسجيل الخروج' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function PillStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 text-center">
      <div className="font-heading font-bold text-[18px] text-foreground leading-none">{value}</div>
      <div className="text-[10.5px] text-foreground/55 mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 5 — Compact Linear (minimal, lots of breathing room)
// ─────────────────────────────────────────────────────────────────────────
function V5Compact({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="max-w-sm mx-auto py-4 space-y-6">
      {/* Centered identity */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-white font-bold text-base" style={{ background: '#16143A' }}>
          {u.initial}
        </div>
        <h2 className="font-heading font-bold text-lg text-foreground mt-3">{u.name}</h2>
        <p className="text-[12px] text-foreground/55 mt-0.5">{u.email}</p>
      </div>

      {/* Plain link list */}
      <div className="space-y-px">
        <CompactLink icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <CompactLink icon={Bookmark} title={isAr ? 'الباقات المحفوظة' : 'Saved Plans'} hint="3" />
        <CompactLink icon={CreditCard} title={isAr ? 'طرق الدفع' : 'Payment'} />
        <CompactLink icon={Globe} title={isAr ? 'اللغة' : 'Language'} hint={isAr ? 'العربية' : 'EN'} />
        <CompactLink icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
      </div>

      <div className="border-t border-border pt-4">
        <button className="w-full inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-foreground/55 hover:text-destructive py-2">
          <LogOut size={14} />
          {isAr ? 'تسجيل الخروج' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

function CompactLink({ icon: Icon, title, hint }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; hint?: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-1 py-3 hover:bg-secondary/30 rounded-md transition-colors text-start">
      <Icon size={15} className="text-foreground/50" />
      <span className="flex-1 font-semibold text-[14px] text-foreground">{title}</span>
      {hint && <span className="text-[12px] text-foreground/45 font-mono">{hint}</span>}
      <ChevronRight size={14} className="text-foreground/30 rtl:rotate-180" />
    </button>
  );
}

// ─── Shared mock telecom data for variants 6-10 ─────────────────────────
type MockLine = {
  id: string;
  carrier: string;
  color: string;
  plan: string;
  number: string;
  dataUsedGB: number;
  dataTotalGB: number;
  localMinUsed: number;
  localMinTotal: number | 'unlimited';
  intlMinUsed: number;
  intlMinTotal: number;
  daysLeft: number;
  simType: string;
  primary: boolean;
  expiringSoon?: boolean;
};
const MOCK_LINES: MockLine[] = [
  { id: 'L1', carrier: 'STC',    color: '#4F0D7F', plan: 'STC Jood Plus 80',   number: '0501234567', dataUsedGB: 26, dataTotalGB: 80, localMinUsed: 320, localMinTotal: 'unlimited', intlMinUsed: 18, intlMinTotal: 100, daysLeft: 12, simType: 'eSIM',     primary: true  },
  { id: 'L2', carrier: 'Mobily', color: '#0099E5', plan: 'Mobily Connect 120', number: '0552223344', dataUsedGB: 8,  dataTotalGB: 60, localMinUsed: 145, localMinTotal: 1500,        intlMinUsed: 12, intlMinTotal: 60,  daysLeft: 22, simType: 'Physical', primary: false },
  { id: 'L3', carrier: 'Zain',   color: '#8DC63F', plan: 'Zain Shabab 99',     number: '0539988776', dataUsedGB: 14, dataTotalGB: 40, localMinUsed: 220, localMinTotal: 1000,        intlMinUsed: 8,  intlMinTotal: 30,  daysLeft: 4,  simType: 'eSIM',     primary: false, expiringSoon: true },
];

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 6 — Active Lines Wallet (Apple Wallet style)
// ─────────────────────────────────────────────────────────────────────────
function V6Wallet({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  const [active, setActive] = useState(MOCK_LINES[0].id);
  const expandedLine = MOCK_LINES.find(l => l.id === active) ?? MOCK_LINES[0];

  return (
    <div className="space-y-4">
      {/* Identity strip */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
          {u.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[15px] text-foreground truncate">{u.name}</div>
          <div className="text-[11px] text-foreground/55">
            {MOCK_LINES.length} {isAr ? 'خطوط نشطة' : 'active lines'}
          </div>
        </div>
        <button className="text-[11.5px] font-semibold text-foreground border border-border bg-secondary/40 hover:bg-secondary px-3 py-1.5 rounded-full inline-flex items-center gap-1">
          <Plus size={12} /> {isAr ? 'إضافة خط' : 'Add line'}
        </button>
      </div>

      {/* Stack of cards */}
      <div className="relative">
        {MOCK_LINES.map((line, i) => {
          const isActive = line.id === active;
          const stackOffset = i * 14;
          return (
            <button
              key={line.id}
              onClick={() => setActive(line.id)}
              className={`block w-full text-left rounded-2xl p-4 shadow-lg transition-all duration-300 ${
                isActive ? 'relative z-10' : 'absolute left-0 right-0 z-0'
              }`}
              style={{
                background: line.color,
                color: '#FFFFFF',
                ...(isActive ? {} : { top: stackOffset, transform: `scale(${1 - i * 0.025})`, opacity: 0.85 }),
                position: isActive ? 'relative' : 'absolute',
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-widest opacity-75 font-bold">{line.carrier}</div>
                  <div className="font-heading font-bold text-[15px] mt-0.5">{line.plan}</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm">
                  {line.simType}
                </span>
              </div>
              <div className="flex items-end justify-between mt-6">
                <div>
                  <div className="font-mono text-[13px] tracking-wider opacity-90" dir="ltr">{line.number}</div>
                  <div className="text-[10.5px] mt-0.5 opacity-75">
                    {line.dataUsedGB} / {line.dataTotalGB} GB · {line.daysLeft}d {isAr ? 'متبقي' : 'left'}
                  </div>
                </div>
                {isActive && <ChevronRight size={16} className="opacity-70 rtl:rotate-180" />}
              </div>
            </button>
          );
        })}
        {/* Spacer so absolute cards are visible */}
        <div style={{ height: (MOCK_LINES.length - 1) * 14 + 8 }} />
      </div>

      {/* Active line details */}
      <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-[13.5px] text-foreground">
            {expandedLine.plan}
          </h3>
          <span className="text-[10.5px] text-foreground/55 font-mono">{expandedLine.number}</span>
        </div>
        <UsageBar used={expandedLine.dataUsedGB} total={expandedLine.dataTotalGB} color={expandedLine.color} isAr={isAr} />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <MiniAction icon={RotateCcw} label={isAr ? 'تجديد' : 'Renew'} />
          <MiniAction icon={Zap} label={isAr ? 'تبديل' : 'Switch'} />
          <MiniAction icon={Smartphone} label={isAr ? 'إدارة' : 'Manage'} />
        </div>
      </div>

      {/* Account list */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <Row icon={Bookmark} title={isAr ? 'محفوظة' : 'Saved Plans'} hint="3" />
        <Row icon={Globe} title={isAr ? 'اللغة' : 'Language'} hint={isAr ? 'العربية' : 'EN'} />
        <Row icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
      </div>
    </div>
  );
}

function UsageBar({ used, total, color, isAr }: { used: number; total: number; color: string; isAr: boolean }) {
  const pct = Math.min(100, Math.round((used / total) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] text-foreground/55">{isAr ? 'البيانات' : 'Data'}</span>
        <span className="text-[11px] font-mono font-semibold text-foreground/75">
          {used} <span className="text-foreground/40">/ {total} GB</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function MiniAction({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string }) {
  return (
    <button className="rounded-lg bg-secondary/60 hover:bg-secondary py-2 inline-flex flex-col items-center gap-1 transition-colors">
      <Icon size={14} className="text-foreground/70" />
      <span className="text-[10.5px] font-bold text-foreground">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 7 — Usage Dashboard (STC/Mobily app style)
// ─────────────────────────────────────────────────────────────────────────
function V7Usage({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  const primary = MOCK_LINES[0];
  const pct = Math.round((primary.dataUsedGB / primary.dataTotalGB) * 100);
  const remaining = primary.dataTotalGB - primary.dataUsedGB;

  return (
    <div className="space-y-4">
      {/* User chip */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
          {u.initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[13.5px] text-foreground truncate">{u.name}</div>
          <div className="text-[10.5px] text-foreground/55">{u.email}</div>
        </div>
        <button className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center"><Edit3 size={13} className="text-foreground/55" /></button>
      </div>

      {/* Primary line — usage circle hero */}
      <div className="relative overflow-hidden rounded-2xl p-5 text-white" style={{ background: primary.color }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold opacity-75">{primary.carrier}</div>
            <div className="font-heading font-bold text-[15px] mt-0.5">{primary.plan}</div>
            <div className="font-mono text-[12px] opacity-85 mt-0.5" dir="ltr">{primary.number}</div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20">
            {isAr ? 'الأساسي' : 'Primary'}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-4">
          {/* Circular progress (data) */}
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(pct / 100) * 276} 276`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-heading font-bold text-2xl leading-none">{remaining}</div>
              <div className="text-[9.5px] opacity-80 mt-0.5">GB {isAr ? 'متبقي' : 'left'}</div>
            </div>
          </div>
          {/* Three usage rows: data / local / intl */}
          <div className="flex-1 space-y-2">
            <UsageRowOnHero
              label={isAr ? 'البيانات' : 'Data'}
              used={primary.dataUsedGB}
              total={primary.dataTotalGB}
              unit="GB"
            />
            <UsageRowOnHero
              label={isAr ? 'مكالمات محلية' : 'Local calls'}
              used={primary.localMinUsed}
              total={primary.localMinTotal}
              unit={isAr ? 'د' : 'min'}
            />
            <UsageRowOnHero
              label={isAr ? 'مكالمات دولية' : 'International'}
              used={primary.intlMinUsed}
              total={primary.intlMinTotal}
              unit={isAr ? 'د' : 'min'}
            />
          </div>
        </div>
        <div className="text-[11px] opacity-85 mt-3 inline-flex items-center gap-1.5">
          <Clock size={11} /> {primary.daysLeft} {isAr ? 'أيام للتجديد' : 'days to renewal'}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button className="rounded-lg bg-white/20 hover:bg-white/30 py-2 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors">
            <RotateCcw size={12} /> {isAr ? 'تجديد' : 'Renew'}
          </button>
          <button className="rounded-lg bg-white/20 hover:bg-white/30 py-2 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors">
            <Plus size={12} /> {isAr ? 'إضافة' : 'Add-on'}
          </button>
          <button className="rounded-lg bg-white text-[#16143A] hover:bg-white/90 py-2 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold transition-colors">
            <Zap size={12} /> {isAr ? 'تبديل' : 'Switch'}
          </button>
        </div>
      </div>

      {/* Other lines compact */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
            {isAr ? 'خطوطي الأخرى' : 'My other lines'}
          </p>
          <span className="text-[10.5px] text-foreground/45 font-mono">{MOCK_LINES.length - 1}</span>
        </div>
        <div className="space-y-2">
          {MOCK_LINES.slice(1).map(l => (
            <div key={l.id} className="rounded-xl bg-card border border-border p-3 flex items-center gap-3">
              <span className="w-2 h-10 rounded-full shrink-0" style={{ background: l.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-heading font-bold text-[13px] text-foreground truncate">{l.plan}</div>
                <div className="text-[11px] text-foreground/55 mt-0.5 inline-flex items-center gap-2">
                  <span className="font-mono" dir="ltr">{l.number}</span>
                  <span>·</span>
                  <span>{l.dataUsedGB}/{l.dataTotalGB} GB</span>
                </div>
              </div>
              {l.expiringSoon && (
                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(254, 113, 81, 0.18)', color: '#FE7151' }}>
                  {isAr ? `${l.daysLeft}ي` : `${l.daysLeft}d`}
                </span>
              )}
              <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
            </div>
          ))}
        </div>
      </div>

      {/* Account compact */}
      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <Row icon={Bookmark} title={isAr ? 'محفوظة' : 'Saved'} hint="3" />
        <Row icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
      </div>
    </div>
  );
}

// Compact usage row for V7 hero — shows label, value, and a thin progress bar.
function UsageRowOnHero({ label, used, total, unit }: { label: string; used: number; total: number | 'unlimited'; unit: string }) {
  const isUnlimited = total === 'unlimited';
  const pct = isUnlimited ? 6 : Math.min(100, Math.round((used / (total as number)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between text-[10.5px]">
        <span className="opacity-80">{label}</span>
        <span className="font-mono font-semibold">
          {used.toLocaleString()}<span className="opacity-65"> / {isUnlimited ? '∞' : (total as number).toLocaleString()} {unit}</span>
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/20 overflow-hidden mt-1">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 8 — Multi-Line Manager (family / business view)
// ─────────────────────────────────────────────────────────────────────────
function V8MultiLine({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  const totalSpend = 80 + 120 + 99;
  const totalGB = MOCK_LINES.reduce((sum, l) => sum + l.dataTotalGB, 0);
  const usedGB = MOCK_LINES.reduce((sum, l) => sum + l.dataUsedGB, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-heading font-bold text-lg text-foreground">{isAr ? `أهلاً، ${u.name.split(' ')[0]}` : `Hi, ${u.name.split(' ')[0]}`}</div>
          <div className="text-[12px] text-foreground/55">
            {isAr
              ? `إدارة ${MOCK_LINES.length} خطوط · ${totalSpend} ر.س / شهر`
              : `Managing ${MOCK_LINES.length} lines · ${totalSpend} SAR / mo`}
          </div>
        </div>
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
          {u.initial}
        </div>
      </div>

      {/* Aggregate stats */}
      <div className="rounded-2xl bg-card border border-border p-4 grid grid-cols-3 gap-3 divide-x divide-border">
        <div className="text-center">
          <div className="font-heading font-bold text-xl text-foreground" style={{ color: '#FE7151' }}>{totalSpend}</div>
          <div className="text-[10px] uppercase tracking-wider text-foreground/55 mt-0.5">{isAr ? 'ر.س / شهر' : 'SAR / mo'}</div>
        </div>
        <div className="text-center">
          <div className="font-heading font-bold text-xl text-foreground">{usedGB}<span className="text-[12px] text-foreground/45">/{totalGB}</span></div>
          <div className="text-[10px] uppercase tracking-wider text-foreground/55 mt-0.5">{isAr ? 'جيجا' : 'GB used'}</div>
        </div>
        <div className="text-center">
          <div className="font-heading font-bold text-xl text-foreground">{MOCK_LINES.length}</div>
          <div className="text-[10px] uppercase tracking-wider text-foreground/55 mt-0.5">{isAr ? 'خطوط' : 'Lines'}</div>
        </div>
      </div>

      {/* Lines grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
            {isAr ? 'خطوطي' : 'My lines'}
          </p>
          <button className="text-[11.5px] font-semibold text-foreground inline-flex items-center gap-1 hover:opacity-80">
            <Plus size={12} /> {isAr ? 'إضافة' : 'Add line'}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {MOCK_LINES.map(l => {
            const pct = Math.round((l.dataUsedGB / l.dataTotalGB) * 100);
            return (
              <button key={l.id} className="rounded-2xl bg-card border-2 border-border hover:border-foreground/30 p-4 text-left transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: l.color }}>{l.carrier}</span>
                  {l.primary && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(22,20,58,0.08)', color: '#16143A' }}>
                      {isAr ? 'أساسي' : 'Primary'}
                    </span>
                  )}
                </div>
                <div className="font-heading font-bold text-[14px] text-foreground leading-tight">{l.plan}</div>
                <div className="font-mono text-[11.5px] text-foreground/55 mt-0.5" dir="ltr">{l.number}</div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: l.color }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-foreground/55 mt-1 font-mono">
                    <span>{l.dataUsedGB}/{l.dataTotalGB} GB</span>
                    <span>{l.daysLeft}d</span>
                  </div>
                </div>
              </button>
            );
          })}
          {/* Add new line tile */}
          <button className="rounded-2xl border-2 border-dashed border-foreground/20 hover:border-foreground/40 p-4 flex flex-col items-center justify-center gap-1.5 text-foreground/55 hover:text-foreground transition-colors min-h-[140px]">
            <Plus size={20} />
            <span className="font-bold text-[13px]">{isAr ? 'أضف خطاً' : 'Add new line'}</span>
            <span className="text-[10.5px]">{isAr ? 'لك أو لشخص آخر' : 'For you or someone else'}</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <Row icon={Globe} title={isAr ? 'اللغة' : 'Language'} hint={isAr ? 'العربية' : 'EN'} />
        <Row icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 9 — Telecom Concierge (AI insights + renewal timeline)
// ─────────────────────────────────────────────────────────────────────────
function V9Concierge({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>{u.initial}</div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[14px] text-foreground truncate">{u.name}</div>
          <div className="text-[11px] text-foreground/55">{MOCK_LINES.length} {isAr ? 'خطوط · 299 ر.س / شهر' : 'lines · 299 SAR / mo'}</div>
        </div>
      </div>

      {/* AI insight banner */}
      <div className="relative overflow-hidden rounded-2xl p-4 ob-card-elev" style={{ background: '#CFEB74' }}>
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#16143A', color: '#CFEB74' }}>
            <Sparkles size={18} strokeWidth={2.4} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#16143A]/70">
              {isAr ? 'اكتشاف ذكي' : 'Smart insight'}
            </div>
            <div className="font-heading font-bold text-[14px] text-[#16143A] leading-tight mt-0.5">
              {isAr
                ? 'تقدر توفّر 80 ر.س شهرياً بتبديل خط Mobily'
                : 'You could save 80 SAR/mo by switching your Mobily line'}
            </div>
            <p className="text-[11.5px] text-[#16143A]/75 mt-1 leading-snug">
              {isAr
                ? 'استخدامك أقل من نصف الباقة — اقترحنا 3 بدائل أرخص.'
                : 'Your usage is under half — we found 3 cheaper alternatives.'}
            </p>
            <button className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold text-[#16143A] underline underline-offset-4">
              {isAr ? 'عرض البدائل' : 'See alternatives'}
              <ArrowRight size={11} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      {/* Renewal timeline */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-[13.5px] text-foreground inline-flex items-center gap-2">
            <Calendar size={14} className="text-foreground/55" />
            {isAr ? 'تجديدات قادمة' : 'Upcoming renewals'}
          </h3>
          <span className="text-[10.5px] text-foreground/45 font-mono">{MOCK_LINES.length}</span>
        </div>
        <div className="space-y-2.5">
          {MOCK_LINES.sort((a, b) => a.daysLeft - b.daysLeft).map(l => (
            <div key={l.id} className="flex items-center gap-3">
              <div className="w-12 shrink-0 text-center">
                <div className={`font-heading font-bold ${l.daysLeft <= 7 ? 'text-[#FE7151]' : 'text-foreground'}`} style={{ fontSize: 18 }}>{l.daysLeft}</div>
                <div className="text-[9px] uppercase tracking-wider text-foreground/45">{isAr ? 'يوم' : 'days'}</div>
              </div>
              <div className="w-1 h-10 rounded-full" style={{ background: l.color }} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[12.5px] text-foreground truncate">{l.plan}</div>
                <div className="text-[10.5px] text-foreground/55 font-mono" dir="ltr">{l.number}</div>
              </div>
              <button className="text-[11px] font-bold text-foreground border border-border bg-secondary/40 hover:bg-secondary px-2.5 py-1 rounded-full">
                {isAr ? 'تجديد' : 'Renew'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick smart actions */}
      <div className="grid grid-cols-2 gap-2">
        <SmartAction icon={Zap} label={isAr ? 'تبديل وتوفير' : 'Switch & save'} bg="#FE7151" fg="#fff" />
        <SmartAction icon={Plus} label={isAr ? 'إضافة خط' : 'Add line'} bg="#C59AFA" fg="#16143A" />
      </div>

      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <Row icon={Bookmark} title={isAr ? 'محفوظة' : 'Saved'} hint="3" />
        <Row icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
      </div>
    </div>
  );
}

function SmartAction({ icon: Icon, label, bg, fg }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; bg: string; fg: string }) {
  return (
    <button className="rounded-2xl py-3.5 px-4 inline-flex flex-col items-start gap-1 transition-transform hover:-translate-y-0.5" style={{ background: bg, color: fg }}>
      <Icon size={18} strokeWidth={2.4} />
      <span className="font-heading font-bold text-[13px]">{label}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 10 — Stats-First (data-rich dashboard)
// ─────────────────────────────────────────────────────────────────────────
function V10Stats({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  const monthlySpend = [185, 210, 245, 199, 210, 299, 299];
  const monthlyMax = Math.max(...monthlySpend);
  const months = ['Nov','Dec','Jan','Feb','Mar','Apr','May'];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[12px] shadow-sm" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>{u.initial}</div>
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[14px] text-foreground truncate">{u.name}</div>
          <div className="text-[10.5px] text-foreground/55">{u.email}</div>
        </div>
        <button className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"><Settings size={14} className="text-foreground/55" /></button>
      </div>

      {/* Big number stats */}
      <div className="grid grid-cols-2 gap-3">
        <BigStat value="299" unit={isAr ? 'ر.س / شهر' : 'SAR / mo'} label={isAr ? 'الإنفاق الحالي' : 'Current spend'} trend="-12%" trendColor="#10B981" />
        <BigStat value="247" unit={isAr ? 'ر.س' : 'SAR'} label={isAr ? 'وفّرت هذا العام' : 'Saved this year'} trend="+SOOB" trendColor="#FE7151" />
        <BigStat value={MOCK_LINES.length.toString()} unit={isAr ? 'خطوط' : 'lines'} label={isAr ? 'نشطة' : 'Active'} />
        <BigStat value="9" unit={isAr ? 'طلب' : 'orders'} label={isAr ? 'الإجمالي' : 'Total placed'} />
      </div>

      {/* Monthly spend chart */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-[13.5px] text-foreground inline-flex items-center gap-2">
            <BarChart3 size={14} className="text-foreground/55" />
            {isAr ? 'الإنفاق الشهري' : 'Monthly spend'}
          </h3>
          <span className="text-[10.5px] text-foreground/45 font-mono">7m</span>
        </div>
        <div className="flex items-end gap-1.5 h-24" dir="ltr">
          {monthlySpend.map((v, i) => {
            const h = Math.round((v / monthlyMax) * 100);
            const isLatest = i === monthlySpend.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t-sm transition-all" style={{ height: `${h}%`, background: isLatest ? '#FE7151' : 'rgba(22,20,58,0.18)' }} />
                <span className="text-[9.5px] text-foreground/45 font-mono">{months[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Carrier breakdown */}
      <div className="rounded-2xl bg-card border border-border p-4">
        <h3 className="font-heading font-bold text-[13.5px] text-foreground mb-3">
          {isAr ? 'توزيع الإنفاق حسب المشغل' : 'Spend by carrier'}
        </h3>
        <div className="space-y-2.5">
          {MOCK_LINES.map(l => {
            const linePrice = l.id === 'L1' ? 80 : l.id === 'L2' ? 120 : 99;
            const pct = Math.round((linePrice / 299) * 100);
            return (
              <div key={l.id} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                <span className="text-[12px] font-semibold text-foreground w-16">{l.carrier}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: l.color }} />
                </div>
                <span className="text-[11px] font-mono font-bold text-foreground/75 w-12 text-end">{linePrice} <span className="text-foreground/45">SAR</span></span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
        <Row icon={Package} title={isAr ? 'طلباتي' : 'My Orders'} hint="9" />
        <Row icon={Bookmark} title={isAr ? 'محفوظة' : 'Saved'} hint="3" />
        <Row icon={LifeBuoy} title={isAr ? 'الدعم' : 'Support'} />
      </div>
    </div>
  );
}

function BigStat({ value, unit, label, trend, trendColor }: { value: string; unit: string; label: string; trend?: string; trendColor?: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3.5">
      <div className="flex items-baseline justify-between">
        <div className="font-heading font-bold text-2xl text-foreground leading-none">{value}</div>
        {trend && (
          <span className="text-[10.5px] font-bold font-mono" style={{ color: trendColor }}>{trend}</span>
        )}
      </div>
      <div className="text-[10.5px] text-foreground/45 mt-0.5 font-mono uppercase tracking-wider">{unit}</div>
      <div className="text-[11.5px] text-foreground/65 mt-2 font-semibold">{label}</div>
    </div>
  );
}
