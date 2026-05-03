/**
 * OrdersVariations — preview page at /orders-variants showing 5 design
 * directions for the My Orders screen so the team can pick one.
 *
 * Variants:
 *  1. Action Inbox   — "what needs my attention?" + collapsible recent + history
 *  2. Two Tabs       — Active / History, flat chronological list inside each
 *  3. Gmail Rows     — slim one-line rows, click to expand details + actions
 *  4. Timeline       — single chronological feed, status as left-edge stripe
 *  5. Status Stripped— same status grouping as today, but with all duplicate metadata removed
 *
 * All five share the same mock data so the comparison is fair. Source order
 * data: localStorage `soob-orders-v3` (seeded by /orders on first visit).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, QrCode, Truck, CheckCircle2, Clock, AlertCircle,
  Smartphone, Wifi, Gift, ChevronDown, ChevronRight,
  Calendar, Eye,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { Button } from '@/components/ui/button';
import SarSymbol from '../components/SarSymbol';
import { getCarrierLogo, getCarrierColor } from '../data/plans';

type OrderStatus = 'pending-activation' | 'shipped' | 'delivered' | 'activated' | 'expired';
type OrderKind = 'mobile' | 'voucher' | 'internet';
type SimType = 'esim' | 'physical';

interface Order {
  id: string;
  kind: OrderKind;
  planName: string;
  provider: string;
  priceSAR: number;
  purchasedAt: string;
  simType?: SimType;
  status: OrderStatus;
  assignedNumber?: string;
  iccid?: string;
  qrPayload?: string;
  trackingNumber?: string;
  shippedAt?: string;
  estimatedDelivery?: string;
  shippingLocation?: string;
  expiresAt?: string;
}

// Same mock data shape as OrdersPage; falls back to local seed if storage empty.
const MOCK: Order[] = [
  { id: 'o1', kind: 'mobile',   planName: 'STC Jood Plus 80',     provider: 'STC',           priceSAR: 80,  purchasedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),         simType: 'esim',     status: 'pending-activation', assignedNumber: '0501234567', qrPayload: 'LPA:1$rsp.stc.com.sa$ABCD-1234' },
  { id: 'o2', kind: 'mobile',   planName: 'Mobily Connect 120',   provider: 'Mobily',        priceSAR: 120, purchasedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),    simType: 'physical', status: 'shipped',            shippedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(), estimatedDelivery: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), trackingNumber: 'SMSA-AR-2026-1882913', shippingLocation: 'Riyadh sorting facility' },
  { id: 'o3', kind: 'mobile',   planName: 'Zain Shabab 99',       provider: 'Zain',          priceSAR: 99,  purchasedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),    simType: 'physical', status: 'delivered',          trackingNumber: 'SMSA-AR-2026-1881044' },
  { id: 'o4', kind: 'mobile',   planName: 'Salam Light 65',       provider: 'Salam',         priceSAR: 65,  purchasedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),   simType: 'esim',     status: 'activated',          assignedNumber: '0561112233' },
  { id: 'o5', kind: 'voucher',  planName: 'Netflix Premium · 100', provider: 'Netflix',       priceSAR: 100, purchasedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),         status: 'activated',          qrPayload: 'NTFX-PREM-2K2J-9F7H-X4M2' },
  { id: 'o6', kind: 'voucher',  planName: 'STC Recharge · 50',    provider: 'STC',           priceSAR: 50,  purchasedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),    status: 'activated',          qrPayload: 'STC-VC-44871-22310' },
  { id: 'o7', kind: 'internet', planName: 'STC Fiber 300',        provider: 'STC',           priceSAR: 299, purchasedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),    status: 'shipped',            shippedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),     estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), shippingLocation: 'Technician en route — tomorrow 10am-12pm' },
  { id: 'o8', kind: 'mobile',   planName: 'Virgin Pure 80',       provider: 'Virgin Mobile', priceSAR: 80,  purchasedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),   simType: 'esim',     status: 'expired',            assignedNumber: '0541234567', expiresAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'o9', kind: 'voucher',  planName: 'Spotify · 50',         provider: 'Spotify',       priceSAR: 50,  purchasedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),  status: 'expired',            qrPayload: 'SPOT-2025-EXPIRED-CODE', expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
];

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem('soob-orders-v3');
    if (raw) {
      const parsed = JSON.parse(raw) as Order[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return MOCK;
}

const STATUS_TONE: Record<OrderStatus, { dot: string; bg: string; fg: string; en: string; ar: string }> = {
  'pending-activation': { dot: '#FE7151', bg: '#FE7151',                fg: '#FFFFFF', en: 'Ready to activate',  ar: 'جاهزة للتفعيل' },
  shipped:              { dot: '#C59AFA', bg: '#C59AFA',                fg: '#16143A', en: 'In transit',          ar: 'في الطريق' },
  delivered:            { dot: '#CFEB74', bg: '#CFEB74',                fg: '#16143A', en: 'Delivered',           ar: 'تم التوصيل' },
  activated:            { dot: '#16143A', bg: 'rgba(22, 20, 58, 0.08)', fg: '#16143A', en: 'Active',              ar: 'مفعّلة' },
  expired:              { dot: '#9B2222', bg: 'rgba(239, 68, 68, 0.10)',fg: '#9B2222', en: 'Expired',             ar: 'منتهية' },
};

function timeAgo(iso: string, lang: 'en' | 'ar'): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return lang === 'ar' ? 'الآن' : 'now';
  if (min < 60) return lang === 'ar' ? `منذ ${min} د` : `${min}m ago`;
  const h = Math.round(min / 60);
  if (h < 24) return lang === 'ar' ? `منذ ${h} س` : `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return lang === 'ar' ? `منذ ${d} يوم` : `${d}d ago`;
  const mo = Math.round(d / 30);
  return lang === 'ar' ? `منذ ${mo} شهر` : `${mo}mo ago`;
}

function fmtDate(iso: string, lang: 'en' | 'ar'): string {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function kindIcon(kind: OrderKind, sim?: SimType, size = 12) {
  if (kind === 'voucher') return <Gift size={size} />;
  if (kind === 'internet') return <Wifi size={size} />;
  return sim === 'esim' ? <Wifi size={size} /> : <Smartphone size={size} />;
}

function kindLabel(kind: OrderKind, sim: SimType | undefined, lang: 'en' | 'ar'): string {
  const isAr = lang === 'ar';
  if (kind === 'voucher') return isAr ? 'قسيمة' : 'Voucher';
  if (kind === 'internet') return isAr ? 'ألياف' : 'Fiber';
  return sim === 'esim' ? 'eSIM' : (isAr ? 'شريحة' : 'SIM');
}

// ─────────────────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────────────────
type VariantId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export default function OrdersVariations() {
  const { lang } = useLang();
  const isAr = lang === 'ar';
  const [orders, setOrders] = useState<Order[]>([]);
  const [variant, setVariant] = useState<VariantId>(1);

  useEffect(() => { setOrders(loadOrders()); }, []);

  const variantInfo: { id: VariantId; name: string; hint: string }[] = [
    { id: 1,  name: 'Action Inbox',     hint: 'What needs your attention, then everything else'  },
    { id: 2,  name: 'Two Tabs',         hint: 'Active / History — simplest mental model'         },
    { id: 3,  name: 'Gmail Rows',       hint: 'Slim rows, expand to act'                         },
    { id: 4,  name: 'Timeline',         hint: 'One chronological feed with edge stripe'           },
    { id: 5,  name: 'Status Stripped',  hint: "Today's grouping but with noise removed"          },
    { id: 6,  name: 'Progress Stepper', hint: 'Apple/Shopify — each order has a horizontal step bar' },
    { id: 7,  name: 'Hero Live',        hint: 'Uber Eats — one giant card for the most urgent order'  },
    { id: 8,  name: 'Status Pills',     hint: 'AliExpress — pill row at top, click to filter'    },
    { id: 9,  name: 'Date Grouped',     hint: 'Banking apps — Today / This week / This month'    },
    { id: 10, name: 'Visual Cards',     hint: 'Amazon-style — big cards with ETA banner + actions row' },
  ];

  return (
    <div className="safe-pb">
      {/* Variant switcher header */}
      <section className="border-b border-border bg-card sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-3">
          <div className="flex items-baseline justify-between mb-2">
            <h1 className="font-heading font-bold text-base text-foreground">Orders · variant preview</h1>
            <Link to="/orders" className="text-[11px] font-bold underline underline-offset-4 text-foreground/60 hover:text-foreground">
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

      {/* Selected variant */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4">
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">Loading mock orders…</p>
        ) : variant === 1 ? <Variant1Inbox    orders={orders} isAr={isAr} />
         : variant === 2 ? <Variant2TwoTabs   orders={orders} isAr={isAr} />
         : variant === 3 ? <Variant3GmailRows orders={orders} isAr={isAr} />
         : variant === 4 ? <Variant4Timeline  orders={orders} isAr={isAr} />
         : variant === 5 ? <Variant5StatusStripped orders={orders} isAr={isAr} />
         : variant === 6 ? <Variant6Stepper       orders={orders} isAr={isAr} />
         : variant === 7 ? <Variant7HeroLive      orders={orders} isAr={isAr} />
         : variant === 8 ? <Variant8StatusPills   orders={orders} isAr={isAr} />
         : variant === 9 ? <Variant9DateGrouped   orders={orders} isAr={isAr} />
         : <Variant10VisualCards orders={orders} isAr={isAr} />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 1 — Action Inbox
// Top: large action cards. Middle: collapsible Recent. Bottom: collapsible History.
// ─────────────────────────────────────────────────────────────────────────
function Variant1Inbox({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const action = orders.filter(o => o.status === 'pending-activation' || o.status === 'delivered');
  const recent = orders.filter(o => o.status === 'shipped' || o.status === 'activated');
  const history = orders.filter(o => o.status === 'expired');
  const [openRecent, setOpenRecent] = useState(true);
  const [openHistory, setOpenHistory] = useState(false);

  return (
    <div className="space-y-6">
      {action.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#FE7151', color: '#fff' }}>
              <AlertCircle size={14} strokeWidth={2.5} />
            </span>
            <h2 className="font-heading font-bold text-[14px] text-foreground">
              {isAr ? `يحتاج إجراء (${action.length})` : `Action needed (${action.length})`}
            </h2>
          </div>
          <div className="space-y-3">
            {action.map(o => <BigActionCard key={o.id} order={o} isAr={isAr} />)}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <button onClick={() => setOpenRecent(!openRecent)} className="flex items-center gap-2 mb-2 w-full text-start hover:opacity-80">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(197, 154, 250, 0.30)', color: '#16143A' }}>
              <Package size={14} />
            </span>
            <h2 className="font-heading font-bold text-[14px] text-foreground flex-1">
              {isAr ? `الطلبات الحالية (${recent.length})` : `Current orders (${recent.length})`}
            </h2>
            <ChevronDown size={16} className={`text-foreground/55 transition-transform ${openRecent ? '' : '-rotate-90'}`} />
          </button>
          {openRecent && (
            <div className="space-y-2">
              {recent.map(o => <CompactRow key={o.id} order={o} isAr={isAr} />)}
            </div>
          )}
        </section>
      )}

      {history.length > 0 && (
        <section>
          <button onClick={() => setOpenHistory(!openHistory)} className="flex items-center gap-2 mb-2 w-full text-start hover:opacity-80">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(22, 20, 58, 0.06)', color: '#16143A' }}>
              <Clock size={14} />
            </span>
            <h2 className="font-heading font-bold text-[14px] text-foreground/70 flex-1">
              {isAr ? `السجل (${history.length})` : `History (${history.length})`}
            </h2>
            <ChevronDown size={16} className={`text-foreground/55 transition-transform ${openHistory ? '' : '-rotate-90'}`} />
          </button>
          {openHistory && (
            <div className="space-y-2">
              {history.map(o => <CompactRow key={o.id} order={o} isAr={isAr} muted />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function BigActionCard({ order, isAr }: { order: Order; isAr: boolean }) {
  const ctaLabel = order.status === 'pending-activation'
    ? (order.kind === 'voucher' ? (isAr ? 'عرض الرمز' : 'View code') : (isAr ? 'تفعيل الآن' : 'Activate now'))
    : (isAr ? 'تفعيل الشريحة' : 'Activate SIM');
  const ctaIcon  = order.status === 'pending-activation' ? <QrCode size={14} /> : <CheckCircle2 size={14} />;
  const ctaBg   = order.status === 'pending-activation' ? '#FE7151' : '#CFEB74';
  const ctaFg   = order.status === 'pending-activation' ? '#fff'    : '#16143A';
  const carrierLogo = getCarrierLogo(order.provider);

  return (
    <article className="rounded-2xl bg-card border-2 border-border ob-card-elev p-4 flex items-center gap-3">
      <div className="shrink-0">
        {carrierLogo
          ? <img src={carrierLogo} alt="" className="h-8 w-auto object-contain" />
          : <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: getCarrierColor(order.provider), color: '#fff' }}>{kindIcon(order.kind, order.simType, 16)}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-heading font-bold text-[14px] text-foreground truncate">{order.planName}</h3>
        <p className="text-[11px] text-foreground/60 mt-0.5">
          {kindLabel(order.kind, order.simType, isAr ? 'ar' : 'en')} · <SarSymbol className="text-[10px]" /> {order.priceSAR}
        </p>
      </div>
      <Button size="sm" className="font-bold shrink-0" style={{ background: ctaBg, color: ctaFg }}>
        {ctaIcon}
        <span>{ctaLabel}</span>
      </Button>
    </article>
  );
}

function CompactRow({ order, isAr, muted = false }: { order: Order; isAr: boolean; muted?: boolean }) {
  const tone = STATUS_TONE[order.status];
  return (
    <div className={`rounded-xl bg-card border border-border px-3.5 py-2.5 flex items-center gap-3 ${muted ? 'opacity-70' : ''}`}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone.dot }} />
      <span className="text-foreground/55">{kindIcon(order.kind, order.simType, 13)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground truncate">{order.planName}</div>
        <div className="text-[10.5px] text-foreground/55 mt-0.5">{timeAgo(order.purchasedAt, isAr ? 'ar' : 'en')} · {tone[isAr ? 'ar' : 'en']}</div>
      </div>
      <span className="text-[11px] font-bold text-foreground/70 font-mono"><SarSymbol className="text-[10px]" /> {order.priceSAR}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 2 — Two Tabs (Active / History)
// ─────────────────────────────────────────────────────────────────────────
function Variant2TwoTabs({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const list = useMemo(() => {
    const isActive = (s: OrderStatus) => s !== 'expired';
    return orders
      .filter(o => tab === 'active' ? isActive(o.status) : !isActive(o.status))
      .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  }, [orders, tab]);
  const activeCount = orders.filter(o => o.status !== 'expired').length;
  const historyCount = orders.filter(o => o.status === 'expired').length;

  return (
    <div>
      <div className="flex border-b border-border mb-4">
        {[
          { id: 'active'  as const, en: 'Active',  ar: 'فعّالة', count: activeCount },
          { id: 'history' as const, en: 'History', ar: 'السجل',  count: historyCount },
        ].map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-4 py-2.5 font-bold text-[13px] border-b-2 -mb-px transition-all ${
                active ? 'border-foreground text-foreground' : 'border-transparent text-foreground/45 hover:text-foreground/70'
              }`}
            >
              {isAr ? t.ar : t.en}
              <span className={`ms-1.5 text-[10.5px] font-mono ${active ? 'opacity-100' : 'opacity-50'}`}>{t.count}</span>
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {list.map(o => <CompactRow key={o.id} order={o} isAr={isAr} muted={tab === 'history'} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 3 — Gmail Rows
// ─────────────────────────────────────────────────────────────────────────
function Variant3GmailRows({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()), [orders]);

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {sorted.map((order, i) => {
        const expanded = expandedId === order.id;
        const tone = STATUS_TONE[order.status];
        return (
          <div key={order.id} className={i > 0 ? 'border-t border-border' : ''}>
            <button
              onClick={() => setExpandedId(expanded ? null : order.id)}
              className="w-full px-4 py-3 flex items-center gap-3 text-start hover:bg-secondary/40 transition-colors"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tone.dot }} title={tone[isAr ? 'ar' : 'en']} />
              <span className="text-foreground/55 shrink-0">{kindIcon(order.kind, order.simType, 14)}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13.5px] text-foreground truncate">{order.planName}</div>
              </div>
              <span className="text-[11px] text-foreground/45 shrink-0">{timeAgo(order.purchasedAt, isAr ? 'ar' : 'en')}</span>
              <span className="text-[12px] font-bold text-foreground/75 font-mono shrink-0 tabular-nums"><SarSymbol className="text-[10px]" /> {order.priceSAR}</span>
              <ChevronRight size={14} className={`text-foreground/40 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
            {expanded && (
              <div className="px-4 pb-4 pt-1 bg-secondary/30 border-t border-border">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] mb-3">
                  <Field label={isAr ? 'الحالة' : 'Status'} value={tone[isAr ? 'ar' : 'en']} />
                  <Field label={isAr ? 'النوع' : 'Type'} value={kindLabel(order.kind, order.simType, isAr ? 'ar' : 'en')} />
                  <Field label={isAr ? 'التاريخ' : 'Date'} value={fmtDate(order.purchasedAt, isAr ? 'ar' : 'en')} />
                  {order.assignedNumber && <Field label={isAr ? 'الرقم' : 'Number'} value={order.assignedNumber} mono />}
                  {order.trackingNumber && <Field label={isAr ? 'تتبّع' : 'Tracking'} value={order.trackingNumber} mono />}
                  {order.expiresAt && <Field label={isAr ? 'انتهت' : 'Expired'} value={fmtDate(order.expiresAt, isAr ? 'ar' : 'en')} />}
                </div>
                <RowActions order={order} isAr={isAr} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-foreground/45 font-semibold">{label}</div>
      <div className={`text-[12.5px] text-foreground ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function RowActions({ order, isAr }: { order: Order; isAr: boolean }) {
  if (order.status === 'pending-activation') {
    return (
      <Button size="sm" className="font-bold w-full" style={{ background: '#FE7151', color: '#fff' }}>
        <QrCode size={14} /> {order.kind === 'voucher' ? (isAr ? 'عرض الرمز' : 'View code') : (isAr ? 'تفعيل' : 'Activate')}
      </Button>
    );
  }
  if (order.status === 'delivered') {
    return (
      <Button size="sm" className="font-bold w-full" style={{ background: '#CFEB74', color: '#16143A' }}>
        <CheckCircle2 size={14} /> {isAr ? 'تفعيل الشريحة' : 'Activate SIM'}
      </Button>
    );
  }
  if (order.status === 'shipped') {
    return (
      <Button size="sm" variant="outline" className="font-bold w-full">
        <Truck size={14} /> {isAr ? 'تتبّع' : 'Track'}
      </Button>
    );
  }
  if (order.status === 'activated' && order.kind === 'voucher') {
    return (
      <Button size="sm" className="font-bold w-full" style={{ background: '#FE7151', color: '#fff' }}>
        <Eye size={14} /> {isAr ? 'عرض الرمز' : 'View code'}
      </Button>
    );
  }
  if (order.status === 'expired') {
    return (
      <Button size="sm" variant="outline" className="font-bold w-full">{isAr ? 'تجديد' : 'Renew'}</Button>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 4 — Timeline (chronological feed)
// ─────────────────────────────────────────────────────────────────────────
function Variant4Timeline({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const sorted = useMemo(() => [...orders].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()), [orders]);

  return (
    <div className="space-y-3">
      {sorted.map(order => {
        const tone = STATUS_TONE[order.status];
        return (
          <article key={order.id} className="relative rounded-xl bg-card border border-border overflow-hidden">
            <span className="absolute inset-y-0 start-0 w-1" style={{ background: tone.dot }} />
            <div className="ps-4 pe-3 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: tone.bg, color: tone.fg }}>
                    {tone[isAr ? 'ar' : 'en']}
                  </span>
                  <span className="text-[11px] text-foreground/45">{timeAgo(order.purchasedAt, isAr ? 'ar' : 'en')}</span>
                </div>
                <h3 className="font-semibold text-[13.5px] text-foreground truncate">{order.planName}</h3>
                <p className="text-[11px] text-foreground/55 mt-0.5">
                  {kindLabel(order.kind, order.simType, isAr ? 'ar' : 'en')}
                  {' · '}
                  <SarSymbol className="text-[10px]" /> {order.priceSAR}
                </p>
              </div>
              <RowActions order={order} isAr={isAr} />
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 5 — Status Stripped (today's grouping, less metadata)
// ─────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────
// VARIANT 10 helper — full step path for an order so the stepper UI can map.
// Mobile path:    placed → shipped → delivered → activated
// Voucher path:   placed → activated (instant)
// Internet path:  placed → install scheduled → install in progress → active
// ─────────────────────────────────────────────────────────────────────────
function getStepperPath(order: Order, isAr: boolean): { label: string; reached: boolean }[] {
  const A = (en: string, ar: string) => isAr ? ar : en;
  if (order.kind === 'voucher') {
    const reachedActivated = order.status === 'activated';
    const reachedExpired = order.status === 'expired';
    return [
      { label: A('Ordered', 'تم الطلب'),    reached: true },
      { label: A('Code ready', 'الرمز جاهز'), reached: reachedActivated || reachedExpired },
    ];
  }
  if (order.kind === 'internet') {
    return [
      { label: A('Ordered', 'تم الطلب'),                 reached: true },
      { label: A('Install scheduled', 'تم الجدولة'),     reached: order.status === 'shipped' || order.status === 'activated' },
      { label: A('On-site', 'في الموقع'),                reached: order.status === 'activated' },
      { label: A('Active', 'مفعّلة'),                     reached: order.status === 'activated' },
    ];
  }
  // Mobile (eSIM or physical)
  const isEsim = order.simType === 'esim';
  return [
    { label: A('Ordered', 'تم الطلب'),                                        reached: true },
    { label: isEsim ? A('eSIM ready', 'eSIM جاهزة') : A('Shipped', 'تم الشحن'), reached: ['shipped', 'delivered', 'pending-activation', 'activated', 'expired'].includes(order.status) },
    { label: isEsim ? A('Activated', 'مفعّلة') : A('Delivered', 'تم التوصيل'),  reached: ['delivered', 'activated', 'expired'].includes(order.status) },
    { label: A('Active', 'مفعّلة'),                                              reached: order.status === 'activated' || order.status === 'expired' },
  ];
}

function Variant5StatusStripped({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const groups: { status: OrderStatus; items: Order[] }[] = (
    ['pending-activation', 'delivered', 'shipped', 'activated', 'expired'] as OrderStatus[]
  )
    .map(s => ({ status: s, items: orders.filter(o => o.status === s) }))
    .filter(g => g.items.length > 0);

  return (
    <div className="space-y-5">
      {groups.map(group => {
        const tone = STATUS_TONE[group.status];
        return (
          <section key={group.status}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: tone.dot }} />
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-foreground/65">
                {tone[isAr ? 'ar' : 'en']} <span className="text-foreground/40 font-mono ms-1">{group.items.length}</span>
              </h2>
            </div>
            <div className="space-y-2">
              {group.items.map(o => (
                <article key={o.id} className="rounded-xl bg-card border border-border px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[13.5px] text-foreground truncate">{o.planName}</h3>
                    <p className="text-[11px] text-foreground/55 mt-0.5 inline-flex items-center gap-1">
                      <Calendar size={10} /> {fmtDate(o.purchasedAt, isAr ? 'ar' : 'en')}
                      <span className="text-foreground/30">·</span>
                      <span className="font-bold text-foreground/70"><SarSymbol className="text-[10px]" /> {o.priceSAR}</span>
                    </p>
                  </div>
                  <RowActions order={o} isAr={isAr} />
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 6 — Progress Stepper (Apple Store / Shopify-style)
// Each card has a horizontal step indicator. Visual lifecycle.
// ─────────────────────────────────────────────────────────────────────────
function Variant6Stepper({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const sorted = [...orders].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  return (
    <div className="space-y-4">
      {sorted.map(order => {
        const path = getStepperPath(order, isAr);
        const tone = STATUS_TONE[order.status];
        const carrierLogo = getCarrierLogo(order.provider);
        return (
          <article key={order.id} className="rounded-2xl bg-card border border-border ob-card-elev p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                {carrierLogo
                  ? <img src={carrierLogo} alt="" className="h-7 w-auto object-contain shrink-0" />
                  : <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: getCarrierColor(order.provider), color: '#fff' }}>{kindIcon(order.kind, order.simType, 16)}</div>}
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-[14px] text-foreground truncate">{order.planName}</h3>
                  <p className="text-[11px] text-foreground/55">{fmtDate(order.purchasedAt, isAr ? 'ar' : 'en')} · <SarSymbol className="text-[10px]" /> {order.priceSAR}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0" style={{ background: tone.bg, color: tone.fg }}>
                {tone[isAr ? 'ar' : 'en']}
              </span>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-1 mt-3 mb-2">
              {path.map((step, i) => (
                <div key={i} className="flex-1 flex items-center gap-1">
                  <div
                    className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2"
                    style={{
                      background: step.reached ? tone.dot : 'transparent',
                      borderColor: step.reached ? tone.dot : 'rgba(22, 20, 58, 0.20)',
                      color: step.reached ? (tone.fg === '#FFFFFF' ? '#fff' : '#16143A') : 'rgba(22, 20, 58, 0.45)',
                    }}
                  >
                    {step.reached ? <CheckCircle2 size={11} strokeWidth={3} /> : i + 1}
                  </div>
                  {i < path.length - 1 && (
                    <div className="flex-1 h-0.5 rounded" style={{ background: path[i + 1].reached ? tone.dot : 'rgba(22, 20, 58, 0.12)' }} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-1 text-[10px] mb-3">
              {path.map((step, i) => (
                <span key={i} className={`flex-1 leading-tight ${step.reached ? 'font-semibold text-foreground/85' : 'text-foreground/40'}`}>
                  {step.label}
                </span>
              ))}
            </div>

            <RowActions order={order} isAr={isAr} />
          </article>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 7 — Hero Live (Uber Eats / Airbnb Trips style)
// One giant "live now" card up top. Compact list below.
// ─────────────────────────────────────────────────────────────────────────
function Variant7HeroLive({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const priority: Record<OrderStatus, number> = {
    'pending-activation': 5, delivered: 4, shipped: 3, activated: 2, expired: 1,
  };
  const sorted = [...orders].sort((a, b) => {
    const p = priority[b.status] - priority[a.status];
    if (p !== 0) return p;
    return new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime();
  });
  const hero = sorted[0];
  const rest = sorted.slice(1);
  if (!hero) return null;

  const heroBg = hero.status === 'pending-activation' ? '#FE7151'
    : hero.status === 'delivered' ? '#CFEB74'
    : hero.status === 'shipped' ? '#C59AFA'
    : '#16143A';
  const heroFg = hero.status === 'pending-activation' || hero.status === 'shipped' || hero.status === 'activated' || hero.status === 'expired' ? '#FFFFFF' : '#16143A';

  return (
    <div className="space-y-5">
      <article className="relative overflow-hidden rounded-2xl ob-card-elev p-5 md:p-6" style={{ background: heroBg, color: heroFg }}>
        <div
          className="absolute top-0 bottom-0 right-0 pointer-events-none"
          style={{
            width: '40%', maxWidth: 320,
            backgroundImage: 'url(/patterns/wave-purple-medium.png)',
            backgroundSize: 'auto 130%', backgroundPosition: 'right center', backgroundRepeat: 'no-repeat',
            opacity: 0.18, mixBlendMode: 'multiply',
          }}
        />
        <div className="relative z-10">
          <div className="flex items-center gap-1.5 mb-2 opacity-85">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {hero.status === 'pending-activation' ? (isAr ? 'بحاجة إجراء' : 'Action needed')
                : hero.status === 'shipped' ? (isAr ? 'في الطريق' : 'In transit')
                : hero.status === 'delivered' ? (isAr ? 'تم التوصيل' : 'Delivered')
                : (isAr ? 'الأحدث' : 'Most recent')}
            </span>
          </div>
          <h2 className="font-heading font-bold text-xl md:text-2xl leading-tight">{hero.planName}</h2>
          <p className="text-[13px] mt-1 opacity-85">
            {kindLabel(hero.kind, hero.simType, isAr ? 'ar' : 'en')} · <SarSymbol className="text-[11px] opacity-70" /> {hero.priceSAR}
            {hero.estimatedDelivery && hero.status === 'shipped' && (
              <> · {isAr ? 'يصل ' : 'arrives '}{fmtDate(hero.estimatedDelivery, isAr ? 'ar' : 'en')}</>
            )}
          </p>
          <div className="mt-4 inline-block">
            <RowActions order={hero} isAr={isAr} />
          </div>
        </div>
      </article>

      {rest.length > 0 && (
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground/55 mb-2 px-1">
            {isAr ? 'باقي الطلبات' : 'Other orders'} <span className="text-foreground/35 font-mono ms-1">{rest.length}</span>
          </h3>
          <div className="space-y-2">
            {rest.map(o => <CompactRow key={o.id} order={o} isAr={isAr} muted={o.status === 'expired'} />)}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 8 — Status Pills (AliExpress: To pay / To ship / To receive)
// Horizontal scrollable pill row at top with counts. Clicking filters list.
// ─────────────────────────────────────────────────────────────────────────
function Variant8StatusPills({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const [activeStatus, setActiveStatus] = useState<OrderStatus | 'all'>('all');
  const pills: { id: OrderStatus | 'all'; en: string; ar: string; icon: typeof QrCode; bg: string }[] = [
    { id: 'all',                en: 'All',        ar: 'الكل',         icon: Package,      bg: '#16143A' },
    { id: 'pending-activation', en: 'Activate',   ar: 'تفعيل',        icon: QrCode,       bg: '#FE7151' },
    { id: 'shipped',            en: 'In transit', ar: 'في الطريق',    icon: Truck,        bg: '#C59AFA' },
    { id: 'delivered',          en: 'Delivered',  ar: 'تم التوصيل',   icon: Package,      bg: '#CFEB74' },
    { id: 'activated',          en: 'Active',     ar: 'مفعّلة',        icon: CheckCircle2, bg: 'rgba(22, 20, 58, 0.10)' },
    { id: 'expired',            en: 'Expired',    ar: 'منتهية',        icon: Clock,        bg: 'rgba(239, 68, 68, 0.10)' },
  ];
  const counts = orders.reduce((acc, o) => { acc[o.status] = (acc[o.status] ?? 0) + 1; return acc; }, {} as Record<OrderStatus, number>);
  const filtered = activeStatus === 'all' ? orders : orders.filter(o => o.status === activeStatus);

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-5">
        {pills.map(p => {
          const count = p.id === 'all' ? orders.length : (counts[p.id as OrderStatus] ?? 0);
          const active = activeStatus === p.id;
          const Icon = p.icon;
          const fg = p.id === 'all' ? '#fff' : p.id === 'pending-activation' ? '#fff' : '#16143A';
          return (
            <button
              key={p.id}
              onClick={() => setActiveStatus(p.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2.5 px-1 border-2 transition-all ${
                active ? 'shadow-md' : 'border-border bg-card hover:border-foreground/30'
              }`}
              style={active ? { background: p.bg, color: fg, borderColor: '#16143A' } : {}}
            >
              <div className="relative">
                <Icon size={18} />
                {count > 0 && (
                  <span
                    className="absolute -top-1.5 -end-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold inline-flex items-center justify-center"
                    style={{ background: active ? '#fff' : '#16143A', color: active ? '#16143A' : '#fff' }}
                  >
                    {count}
                  </span>
                )}
              </div>
              <span className="text-[10.5px] font-bold leading-tight text-center">{isAr ? p.ar : p.en}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filtered
          .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
          .map(o => (
            <article key={o.id} className="rounded-xl bg-card border border-border px-4 py-3 flex items-center gap-3">
              <span className="text-foreground/60 shrink-0">{kindIcon(o.kind, o.simType, 14)}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[13.5px] text-foreground truncate">{o.planName}</h3>
                <p className="text-[11px] text-foreground/55 mt-0.5">
                  {fmtDate(o.purchasedAt, isAr ? 'ar' : 'en')} · <SarSymbol className="text-[10px]" /> {o.priceSAR}
                </p>
              </div>
              <RowActions order={o} isAr={isAr} />
            </article>
          ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 9 — Date Grouped (banking apps / Apple Wallet)
// Today / This week / This month / Older sections.
// ─────────────────────────────────────────────────────────────────────────
function Variant9DateGrouped({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  type Bucket = 'today' | 'week' | 'month' | 'older';
  const bucketize = (iso: string): Bucket => {
    const diff = now - new Date(iso).getTime();
    if (diff < 1 * ONE_DAY)  return 'today';
    if (diff < 7 * ONE_DAY)  return 'week';
    if (diff < 30 * ONE_DAY) return 'month';
    return 'older';
  };
  const labels: Record<Bucket, { en: string; ar: string }> = {
    today: { en: 'Today',       ar: 'اليوم' },
    week:  { en: 'This week',   ar: 'هذا الأسبوع' },
    month: { en: 'This month',  ar: 'هذا الشهر' },
    older: { en: 'Older',       ar: 'أقدم' },
  };
  const groups: Record<Bucket, Order[]> = { today: [], week: [], month: [], older: [] };
  orders.forEach(o => groups[bucketize(o.purchasedAt)].push(o));
  (['today', 'week', 'month', 'older'] as Bucket[]).forEach(b =>
    groups[b].sort((x, y) => new Date(y.purchasedAt).getTime() - new Date(x.purchasedAt).getTime())
  );

  return (
    <div className="space-y-5">
      {(['today', 'week', 'month', 'older'] as Bucket[]).map(bucket => {
        if (groups[bucket].length === 0) return null;
        return (
          <section key={bucket}>
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground/55 mb-2.5 px-1 py-1">
              {labels[bucket][isAr ? 'ar' : 'en']}
              <span className="text-foreground/35 font-mono ms-1.5">{groups[bucket].length}</span>
            </h3>
            <div className="rounded-xl bg-card border border-border divide-y divide-border overflow-hidden">
              {groups[bucket].map(o => {
                const tone = STATUS_TONE[o.status];
                return (
                  <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="text-foreground/55 shrink-0">{kindIcon(o.kind, o.simType, 14)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-[13.5px] text-foreground truncate">{o.planName}</h4>
                      <p className="text-[11px] text-foreground/55 mt-0.5">
                        <span style={{ color: tone.dot }}>●</span> {tone[isAr ? 'ar' : 'en']}
                        <span className="text-foreground/30"> · </span>
                        {timeAgo(o.purchasedAt, isAr ? 'ar' : 'en')}
                      </p>
                    </div>
                    <span className="text-[12px] font-bold text-foreground/75 font-mono shrink-0 tabular-nums"><SarSymbol className="text-[10px]" /> {o.priceSAR}</span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// VARIANT 10 — Visual Cards (Amazon-style)
// Big cards with carrier brand strip, ETA banner, full action row.
// ─────────────────────────────────────────────────────────────────────────
function Variant10VisualCards({ orders, isAr }: { orders: Order[]; isAr: boolean }) {
  const sorted = [...orders].sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  return (
    <div className="space-y-4">
      {sorted.map(order => {
        const tone = STATUS_TONE[order.status];
        const carrierLogo = getCarrierLogo(order.provider);
        const carrierColor = getCarrierColor(order.provider);

        const bannerCopy = (() => {
          if (order.status === 'shipped' && order.estimatedDelivery) {
            return isAr ? `يصل ${fmtDate(order.estimatedDelivery, 'ar')}` : `Arriving ${fmtDate(order.estimatedDelivery, 'en')}`;
          }
          if (order.status === 'pending-activation') return isAr ? 'جاهزة للتفعيل الآن' : 'Ready to activate now';
          if (order.status === 'delivered') return isAr ? 'وصلت — جاهزة للتفعيل' : 'Delivered — ready to activate';
          if (order.status === 'activated') return isAr ? 'مفعّلة وتعمل' : 'Active and running';
          if (order.status === 'expired') return isAr ? `انتهت ${order.expiresAt ? fmtDate(order.expiresAt, 'ar') : ''}` : `Expired ${order.expiresAt ? fmtDate(order.expiresAt, 'en') : ''}`;
          return tone[isAr ? 'ar' : 'en'];
        })();

        return (
          <article key={order.id} className="rounded-2xl bg-card border border-border ob-card-elev overflow-hidden">
            <div className="h-1.5" style={{ background: carrierColor }} />

            <div className="px-4 py-2.5 flex items-center gap-2 text-[12px] font-semibold border-b border-border" style={{ background: tone.bg, color: tone.fg }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'currentColor' }} />
              <span>{bannerCopy}</span>
              <span className="ms-auto text-[10.5px] opacity-70 font-mono uppercase tracking-wider">{tone[isAr ? 'ar' : 'en']}</span>
            </div>

            <div className="p-4 flex items-center gap-4">
              <div className="shrink-0 w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(22, 20, 58, 0.04)' }}>
                {carrierLogo
                  ? <img src={carrierLogo} alt="" className="h-9 w-auto object-contain" />
                  : <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: carrierColor, color: '#fff' }}>{kindIcon(order.kind, order.simType, 18)}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-bold text-[15px] text-foreground leading-tight truncate">{order.planName}</h3>
                <p className="text-[11.5px] text-foreground/55 mt-1 inline-flex items-center gap-1.5">
                  <Calendar size={11} />
                  <span>{fmtDate(order.purchasedAt, isAr ? 'ar' : 'en')}</span>
                  <span className="text-foreground/30">·</span>
                  <span>{kindLabel(order.kind, order.simType, isAr ? 'ar' : 'en')}</span>
                  <span className="text-foreground/30">·</span>
                  <span className="font-bold text-foreground/75"><SarSymbol className="text-[10px]" /> {order.priceSAR}</span>
                </p>
              </div>
            </div>

            <div className="px-4 pb-4 flex items-center gap-2">
              <RowActions order={order} isAr={isAr} />
              {order.status !== 'expired' && (
                <Button size="sm" variant="outline" className="font-bold shrink-0 px-3">
                  {isAr ? 'تفاصيل' : 'Details'}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="font-bold shrink-0 px-3 text-foreground/55">
                {isAr ? 'مساعدة' : 'Help'}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
