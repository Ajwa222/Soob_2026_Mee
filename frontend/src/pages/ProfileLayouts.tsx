/**
 * ProfileLayouts — preview page at /profile-layouts.
 * Shows 4 layout variants of the V7 profile design — the design itself is the
 * same, only the placement of Edit info / Language / Help / Sign out changes
 * so the team can pick the cleanest information architecture.
 *
 *  L1 Gear menu — settings hidden behind a gear icon in the header (popover)
 *  L2 Account card — settings as a list-card under the dashboard
 *  L3 Sticky topbar — small icon bar at top, body is pure dashboard
 *  L4 iOS-style rows — full-width settings rows + clear sign-out at bottom
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Bookmark, ChevronRight, Globe, LifeBuoy, LogOut, Edit3,
  Clock, RotateCcw, Plus, Zap, Settings,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

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

export default function ProfileLayouts() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  type L = 1 | 2 | 3 | 4;
  const [layout, setLayout] = useState<L>(1);

  const layoutInfo: { id: L; name: string; hint: string }[] = [
    { id: 1, name: 'Gear menu',     hint: 'Settings hidden behind a gear icon in the header — minimal body' },
    { id: 2, name: 'Account card',  hint: 'Settings as a clean list-card under the dashboard' },
    { id: 3, name: 'Sticky topbar', hint: 'Small icon bar at top — body is pure dashboard' },
    { id: 4, name: 'iOS rows',      hint: 'Full-width settings rows + clear red sign-out at the bottom' },
  ];

  return (
    <div className="safe-pb">
      {/* Switcher */}
      <section className="border-b border-border bg-card sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="font-heading font-bold text-base text-foreground">Profile · layout preview</h1>
            <Link to="/profile" className="text-[11px] font-bold underline underline-offset-4 text-foreground/60 hover:text-foreground">
              ← current
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {layoutInfo.map(v => {
              const active = layout === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setLayout(v.id)}
                  className="shrink-0 inline-flex flex-col items-start rounded-xl px-3 py-2 text-start border-2 transition-all"
                  style={active
                    ? { background: '#16143A', color: '#FFFFFF', borderColor: '#16143A' }
                    : { borderColor: 'var(--border)', color: 'inherit' }}
                >
                  <span className="text-[10px] font-mono tracking-wider opacity-60">L{v.id}</span>
                  <span className="font-bold text-[12px] leading-tight whitespace-nowrap">{v.name}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-foreground/55">{layoutInfo.find(v => v.id === layout)?.hint}</p>
        </div>
      </section>

      <div className="max-w-md md:max-w-2xl lg:max-w-6xl mx-auto px-4 sm:px-6 md:px-8 pt-4 lg:pt-8 pb-20 lg:pb-28">
        {layout === 1 ? <L1Gear isAr={isAr} />
         : layout === 2 ? <L2AccountCard isAr={isAr} />
         : layout === 3 ? <L3StickyTopbar isAr={isAr} />
         : <L4IOSRows isAr={isAr} />}
      </div>
    </div>
  );
}

// ─── Shared sub-pieces ────────────────────────────────────────────────
function PrimaryLineHero({ isAr }: { isAr: boolean }) {
  const primary = MOCK_LINES[0];
  const pct = Math.round((primary.dataUsedGB / primary.dataTotalGB) * 100);
  const remaining = primary.dataTotalGB - primary.dataUsedGB;
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 lg:p-6 text-white shadow-md" style={{ background: primary.color }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-widest font-bold text-white/85">{primary.carrier}</div>
          <div className="font-heading font-bold text-[16px] mt-0.5 text-white">{primary.plan}</div>
          <div className="font-mono text-[12.5px] text-white/90 mt-0.5" dir="ltr">{primary.number}</div>
        </div>
        <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/25 text-white">
          {isAr ? 'الأساسي' : 'Primary'}
        </span>
      </div>
      <div className="flex items-center gap-4 mt-4">
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 276} 276`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-heading font-bold text-2xl leading-none text-white">{remaining}</div>
            <div className="text-[10.5px] font-semibold text-white/90 mt-0.5">GB {isAr ? 'متبقي' : 'left'}</div>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <UsageRow label={isAr ? 'البيانات' : 'Data'} used={primary.dataUsedGB} total={primary.dataTotalGB} unit="GB" />
          <UsageRow label={isAr ? 'مكالمات محلية' : 'Local calls'} used={primary.localMinUsed} total={primary.localMinTotal} unit={isAr ? 'د' : 'min'} />
          <UsageRow label={isAr ? 'مكالمات دولية' : 'International'} used={primary.intlMinUsed} total={primary.intlMinTotal} unit={isAr ? 'د' : 'min'} />
        </div>
      </div>
      <div className="text-[12px] font-semibold text-white/90 mt-3 inline-flex items-center gap-1.5">
        <Clock size={12} /> {primary.daysLeft} {isAr ? 'أيام للتجديد' : 'days to renewal'}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button className="rounded-lg bg-white/25 hover:bg-white/35 py-2 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-white transition-colors">
          <RotateCcw size={13} /> {isAr ? 'تجديد' : 'Renew'}
        </button>
        <button className="rounded-lg bg-white/25 hover:bg-white/35 py-2 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold text-white transition-colors">
          <Plus size={13} /> {isAr ? 'إضافة' : 'Add-on'}
        </button>
        <button className="rounded-lg bg-white text-[#16143A] hover:bg-white/90 py-2 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold transition-colors">
          <Zap size={13} /> {isAr ? 'تبديل' : 'Switch'}
        </button>
      </div>
    </div>
  );
}

function UsageRow({ label, used, total, unit }: { label: string; used: number; total: number | 'unlimited'; unit: string }) {
  const isUnlimited = total === 'unlimited';
  const pct = isUnlimited ? 6 : Math.min(100, Math.round((used / (total as number)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-semibold text-white">{label}</span>
        <span className="font-mono font-bold text-[12px] text-white whitespace-nowrap">
          {used.toLocaleString()}
          <span className="text-white/75 font-semibold"> / {isUnlimited ? '∞' : (total as number).toLocaleString()} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/25 overflow-hidden mt-1.5">
        <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function OtherLines({ isAr }: { isAr: boolean }) {
  const otherLines = MOCK_LINES.slice(1);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55">
          {isAr ? 'خطوطي الأخرى' : 'My other lines'}
        </p>
        <span className="text-[10.5px] text-foreground/45 font-mono">{otherLines.length}</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2">
        {otherLines.map(l => (
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
  );
}

function DashboardTiles({ isAr, includeSupport = true }: { isAr: boolean; includeSupport?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
        {isAr ? 'لوحة التحكم' : 'Dashboard'}
      </p>
      <div className="grid grid-cols-2 gap-2.5 lg:gap-3">
        <div className="group relative overflow-hidden rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: '#C59AFA' }}>
          <div className="flex items-start justify-between mb-3">
            <span className="w-9 h-9 rounded-lg bg-white/35 flex items-center justify-center">
              <Package size={17} style={{ color: '#16143A' }} strokeWidth={2.4} />
            </span>
            <ChevronRight size={14} className="text-[#16143A]/55 rtl:rotate-180" />
          </div>
          <div className="font-heading font-bold text-2xl leading-none" style={{ color: '#16143A' }}>9</div>
          <div className="font-heading font-bold text-[13px] mt-0.5" style={{ color: '#16143A' }}>{isAr ? 'طلباتي' : 'My Orders'}</div>
          <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(22,20,58,0.65)' }}>{isAr ? '2 تحتاج إجراء' : '2 need action'}</div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md text-white" style={{ background: '#FE7151' }}>
          <div className="flex items-start justify-between mb-3">
            <span className="w-9 h-9 rounded-lg bg-white/25 flex items-center justify-center">
              <Bookmark size={17} className="text-white" strokeWidth={2.4} fill="currentColor" />
            </span>
            <ChevronRight size={14} className="text-white/70 rtl:rotate-180" />
          </div>
          <div className="font-heading font-bold text-2xl leading-none">3</div>
          <div className="font-heading font-bold text-[13px] mt-0.5">{isAr ? 'محفوظة' : 'Saved Plans'}</div>
          <div className="text-[10.5px] mt-0.5 opacity-85">{isAr ? 'مرجعك السريع' : 'Your shortlist'}</div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: '#CFEB74' }}>
          <div className="flex items-start justify-between mb-3">
            <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#16143A' }}>
              <Zap size={17} style={{ color: '#CFEB74' }} strokeWidth={2.4} />
            </span>
            <ChevronRight size={14} className="text-[#16143A]/55 rtl:rotate-180" />
          </div>
          <div className="font-heading font-bold text-2xl leading-none" style={{ color: '#16143A' }}>80<span className="text-base"> SAR</span></div>
          <div className="font-heading font-bold text-[13px] mt-0.5" style={{ color: '#16143A' }}>{isAr ? 'وفّر شهرياً' : 'Save / month'}</div>
          <div className="text-[10.5px] mt-0.5" style={{ color: 'rgba(22,20,58,0.65)' }}>{isAr ? 'بدّل خط Mobily' : 'Switch your Mobily line'}</div>
        </div>
        {includeSupport && (
          <div className="group relative overflow-hidden rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-md border-2 border-border bg-card">
            <div className="flex items-start justify-between mb-3">
              <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(254, 113, 81, 0.15)' }}>
                <LifeBuoy size={17} style={{ color: '#FE7151' }} strokeWidth={2.4} />
              </span>
              <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
            </div>
            <div className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">{isAr ? 'متاح الآن' : 'Online now'}</span>
            </div>
            <div className="font-heading font-bold text-[13px] mt-1.5 text-foreground">{isAr ? 'الدعم والمساعدة' : 'Help & Support'}</div>
            <div className="text-[10.5px] mt-0.5 text-foreground/55">{isAr ? 'محادثة أو تذكرة' : 'Live chat or ticket'}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserChip({ name, photoURL, initial, isAr, right }: { name: string; photoURL: string | null; initial: string; isAr: boolean; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {photoURL
        ? <img src={photoURL} alt="" className="w-10 h-10 lg:w-12 lg:h-12 rounded-full" />
        : (
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-white font-bold text-[13px] lg:text-[15px] shadow-sm" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
            {initial}
          </div>
        )}
      <div className="flex-1 min-w-0">
        <div className="font-heading font-bold text-[14px] lg:text-[17px] text-foreground truncate">
          {isAr ? `حياك الله، ${name}` : `Welcome, ${name}`}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// L1 — Gear menu in header (settings hidden behind a popover)
// ─────────────────────────────────────────────────────────────────────────
function L1Gear({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-4 lg:space-y-6">
      <UserChip
        name={u.name}
        photoURL={u.photoURL}
        initial={u.initial}
        isAr={isAr}
        right={
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-secondary hover:bg-secondary/70 flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
              aria-label={isAr ? 'الإعدادات' : 'Settings'}
            >
              <Settings size={17} />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute end-0 top-12 z-20 w-64 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                  <button onClick={() => setOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 text-start">
                    <Edit3 size={15} className="text-foreground/70" />
                    <span className="text-[13px] font-semibold text-foreground">{isAr ? 'تعديل المعلومات' : 'Edit information'}</span>
                  </button>
                  <button onClick={() => setOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 text-start border-t border-border">
                    <Globe size={15} className="text-foreground/70" />
                    <span className="text-[13px] font-semibold text-foreground flex-1">{isAr ? 'اللغة' : 'Language'}</span>
                    <span className="text-[11.5px] text-foreground/55">{isAr ? 'العربية' : 'English'}</span>
                  </button>
                  <button onClick={() => setOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 text-start border-t border-border">
                    <LifeBuoy size={15} className="text-foreground/70" />
                    <span className="text-[13px] font-semibold text-foreground">{isAr ? 'الدعم والمساعدة' : 'Help & Support'}</span>
                  </button>
                  <button onClick={() => setOpen(false)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-destructive/10 text-start border-t border-border">
                    <LogOut size={15} className="text-destructive" />
                    <span className="text-[13px] font-semibold text-destructive">{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        }
      />
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 lg:gap-6 lg:items-start">
        <div className="space-y-4 lg:space-y-5">
          <PrimaryLineHero isAr={isAr} />
          <OtherLines isAr={isAr} />
        </div>
        <DashboardTiles isAr={isAr} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// L2 — Account card (settings as a clean list-card under the dashboard)
// ─────────────────────────────────────────────────────────────────────────
function L2AccountCard({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="space-y-4 lg:space-y-6">
      <UserChip
        name={u.name}
        photoURL={u.photoURL}
        initial={u.initial}
        isAr={isAr}
        right={
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-secondary/60 px-3 py-1.5 text-foreground/80">
            <Edit3 size={13} />
            <span className="text-[12px] font-semibold">{isAr ? 'تعديل المعلومات' : 'Edit information'}</span>
          </button>
        }
      />
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 lg:gap-6 lg:items-start">
        <div className="space-y-4 lg:space-y-5">
          <PrimaryLineHero isAr={isAr} />
          <OtherLines isAr={isAr} />
        </div>
        <div className="space-y-4 lg:space-y-5">
          <DashboardTiles isAr={isAr} />
          {/* Account settings card */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2">
              {isAr ? 'الحساب' : 'Account'}
            </p>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 text-start">
                <Globe size={16} className="text-foreground/55" />
                <span className="flex-1 font-semibold text-[13.5px] text-foreground">{isAr ? 'اللغة' : 'Language'}</span>
                <span className="text-[12px] text-foreground/55">{isAr ? 'العربية' : 'English'}</span>
                <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 text-start">
                <LifeBuoy size={16} className="text-foreground/55" />
                <span className="flex-1 font-semibold text-[13.5px] text-foreground">{isAr ? 'الدعم والمساعدة' : 'Help & Support'}</span>
                <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-destructive/10 text-start">
                <LogOut size={16} className="text-destructive" />
                <span className="flex-1 font-semibold text-[13.5px] text-destructive">{isAr ? 'تسجيل الخروج' : 'Sign out'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// L3 — Sticky topbar (icon bar at top, body is pure dashboard)
// ─────────────────────────────────────────────────────────────────────────
function L3StickyTopbar({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Sticky topbar */}
      <div className="rounded-2xl bg-card border border-border px-3 py-2.5 flex items-center gap-3">
        {u.photoURL
          ? <img src={u.photoURL} alt="" className="w-9 h-9 rounded-full" />
          : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[12px]" style={{ background: 'linear-gradient(135deg, #C59AFA 0%, #FE7151 100%)' }}>
              {u.initial}
            </div>
          )}
        <div className="flex-1 min-w-0">
          <div className="font-heading font-bold text-[13.5px] text-foreground truncate">{u.name}</div>
          <div className="text-[11px] text-foreground/55 truncate">{u.email}</div>
        </div>
        {/* Action icons */}
        <button className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-foreground/70" aria-label={isAr ? 'تعديل' : 'Edit'}>
          <Edit3 size={16} />
        </button>
        <button className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-foreground/70" aria-label={isAr ? 'اللغة' : 'Language'}>
          <Globe size={16} />
        </button>
        <button className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-foreground/70" aria-label={isAr ? 'الدعم' : 'Help'}>
          <LifeBuoy size={16} />
        </button>
        <div className="w-px h-6 bg-border mx-1" />
        <button className="w-9 h-9 rounded-lg hover:bg-destructive/10 flex items-center justify-center text-destructive" aria-label={isAr ? 'خروج' : 'Sign out'}>
          <LogOut size={16} />
        </button>
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 lg:gap-6 lg:items-start">
        <div className="space-y-4 lg:space-y-5">
          <PrimaryLineHero isAr={isAr} />
          <OtherLines isAr={isAr} />
        </div>
        <DashboardTiles isAr={isAr} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// L4 — iOS-style rows (clean settings list + clear red sign-out)
// ─────────────────────────────────────────────────────────────────────────
function L4IOSRows({ isAr }: { isAr: boolean }) {
  const u = useMockUser();
  return (
    <div className="space-y-4 lg:space-y-6">
      <UserChip
        name={u.name}
        photoURL={u.photoURL}
        initial={u.initial}
        isAr={isAr}
        right={
          <button className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card hover:bg-secondary/60 px-3 py-1.5 text-foreground/80">
            <Edit3 size={13} />
            <span className="text-[12px] font-semibold">{isAr ? 'تعديل المعلومات' : 'Edit information'}</span>
          </button>
        }
      />
      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-4 lg:gap-6 lg:items-start">
        <div className="space-y-4 lg:space-y-5">
          <PrimaryLineHero isAr={isAr} />
          <OtherLines isAr={isAr} />
        </div>
        <div className="space-y-4 lg:space-y-5">
          <DashboardTiles isAr={isAr} includeSupport={false} />

          {/* Preferences group */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2 px-1">
              {isAr ? 'التفضيلات' : 'Preferences'}
            </p>
            <div className="rounded-2xl bg-card border border-border divide-y divide-border overflow-hidden">
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 text-start">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#CFEB74' }}>
                  <Globe size={15} style={{ color: '#16143A' }} />
                </span>
                <span className="flex-1 font-semibold text-[13.5px] text-foreground">{isAr ? 'اللغة' : 'Language'}</span>
                <span className="text-[12px] text-foreground/55">{isAr ? 'العربية' : 'English'}</span>
                <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/40 text-start">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(254, 113, 81, 0.15)' }}>
                  <LifeBuoy size={15} style={{ color: '#FE7151' }} />
                </span>
                <span className="flex-1 font-semibold text-[13.5px] text-foreground">{isAr ? 'الدعم والمساعدة' : 'Help & Support'}</span>
                <span className="inline-flex items-center gap-1 me-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                    {isAr ? 'متاح' : 'Online'}
                  </span>
                </span>
                <ChevronRight size={14} className="text-foreground/35 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Clear sign-out — separate, red, full width */}
          <button className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-destructive/25 bg-destructive/5 hover:bg-destructive/10 px-4 py-3 text-destructive font-bold text-[13.5px] transition-colors">
            <LogOut size={15} />
            {isAr ? 'تسجيل الخروج' : 'Sign out'}
          </button>
        </div>
      </div>
    </div>
  );
}
