/**
 * My Orders ("/orders") — list of the user's purchases with activation flows.
 *
 * Order states (per item):
 *   - pending-activation  → eSIM ready: tap "Activate" → QR-code modal
 *   - shipped             → physical SIM in transit: tap "Track" → timeline modal
 *   - delivered           → physical SIM at door: tap "Activate" → MSISDN+ICCID form
 *   - activated           → already live, shows the assigned number
 *
 * Source of truth: localStorage `soob-orders` (shaped as Order[]). Seeded with
 * 4 mock orders the first time the page is loaded so the UI demos cleanly.
 * Real backend wiring should replace the loadOrders/saveOrders helpers.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, QrCode, Truck, CheckCircle2, Clock, ArrowLeft,
  MapPin, Smartphone, Wifi, AlertCircle, Gift, Eye, Shield, FileText,
} from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import SarSymbol from '../components/SarSymbol';
import { getCarrierLogo, getCarrierColor } from '../data/plans';
import { trackEvent } from '../lib/analytics';

type OrderStatus = 'pending-activation' | 'shipped' | 'delivered' | 'activated' | 'expired';
type SimType = 'esim' | 'physical';
type OrderKind = 'mobile' | 'voucher' | 'internet';

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

const STORAGE_KEY = 'soob-orders-v7';

const MOCK_ORDERS: Order[] = [
  // Fresh just-purchased eSIM — walks through the ID → Nafath → QR activation flow.
  {
    id: 'ord-000',
    kind: 'mobile',
    planName: 'STC Jood Plus 80',
    provider: 'STC',
    priceSAR: 80,
    purchasedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    simType: 'esim',
    status: 'pending-activation',
    assignedNumber: '0509998877',
    qrPayload: 'LPA:1$rsp.stc.com.sa$NEW1-2222-3333-4444',
  },
  // Fresh just-delivered physical SIM — walks through the ID → Nafath → MSISDN+ICCID flow.
  {
    id: 'ord-000b',
    kind: 'mobile',
    planName: 'Zain Shabab 99',
    provider: 'Zain',
    priceSAR: 99,
    purchasedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'physical',
    status: 'delivered',
    shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'SMSA-AR-2026-1991774',
  },
  {
    id: 'ord-001',
    kind: 'mobile',
    planName: 'Mobily Connect 60',
    provider: 'Mobily',
    priceSAR: 60,
    purchasedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'esim',
    status: 'activated',
    assignedNumber: '0501234567',
    iccid: '8966033321987654321',
    qrPayload: 'LPA:1$rsp.mobily.com.sa$ABCD-1234-EFGH-5678',
  },
  {
    id: 'ord-002',
    kind: 'mobile',
    planName: 'Mobily Connect 120',
    provider: 'Mobily',
    priceSAR: 120,
    purchasedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'physical',
    status: 'shipped',
    shippedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'SMSA-AR-2026-1882913',
    shippingLocation: 'Riyadh sorting facility',
  },
  {
    id: 'ord-003',
    kind: 'mobile',
    planName: 'STC Najeed 50',
    provider: 'STC',
    priceSAR: 50,
    purchasedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'physical',
    status: 'activated',
    assignedNumber: '0506677889',
    iccid: '8966033012345678901',
    shippedAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'SMSA-AR-2026-1881044',
  },
  {
    id: 'ord-004',
    kind: 'mobile',
    planName: 'Salam Light 65',
    provider: 'Salam',
    priceSAR: 65,
    purchasedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'esim',
    status: 'activated',
    assignedNumber: '0561112233',
    iccid: '8966033123456789012',
  },
  // ── Vouchers — instant delivery, no SIM ──
  {
    id: 'ord-005',
    kind: 'voucher',
    planName: 'Netflix Premium · 100 SAR',
    provider: 'Netflix',
    priceSAR: 100,
    purchasedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    status: 'activated', // vouchers ship instantly = "activated" (delivered code)
    qrPayload: 'NTFX-PREM-2K2J-9F7H-X4M2',
  },
  {
    id: 'ord-006',
    kind: 'voucher',
    planName: 'STC Recharge · 50 SAR',
    provider: 'STC',
    priceSAR: 50,
    purchasedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'activated',
    qrPayload: 'STC-VC-44871-22310',
  },
  // ── Home internet (FTTH) — needs install appointment ──
  {
    id: 'ord-007',
    kind: 'internet',
    planName: 'STC Fiber 300',
    provider: 'STC',
    priceSAR: 299,
    purchasedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'shipped', // "shipped" = technician scheduled / on the way
    shippedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'STC-INSTALL-A-77321',
    shippingLocation: 'Technician en route — tomorrow 10am-12pm window',
  },
  // ── Expired plans / vouchers (history) ──
  {
    id: 'ord-008',
    kind: 'mobile',
    planName: 'Virgin Pure 80',
    provider: 'Virgin Mobile',
    priceSAR: 80,
    purchasedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'esim',
    status: 'expired',
    assignedNumber: '0541234567',
    expiresAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-009',
    kind: 'voucher',
    planName: 'Spotify · 50 SAR',
    provider: 'Spotify',
    priceSAR: 50,
    purchasedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expired',
    qrPayload: 'SPOT-2025-EXPIRED-CODE',
    expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // ── Additional plans for richer list view ──
  {
    id: 'ord-010',
    kind: 'mobile',
    planName: 'Jawwy Data 50',
    provider: 'Jawwy',
    priceSAR: 50,
    purchasedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'esim',
    status: 'activated',
    assignedNumber: '0508888777',
    iccid: '8966033455123456788',
    qrPayload: 'LPA:1$rsp.jawwy.sa$JAWY-2266-PRMA',
  },
  {
    id: 'ord-011',
    kind: 'mobile',
    planName: 'Lebara Connect 79',
    provider: 'Lebara',
    priceSAR: 79,
    purchasedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'physical',
    status: 'shipped',
    shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'SMSA-AR-2026-1903522',
    shippingLocation: 'Jeddah delivery hub',
  },
  {
    id: 'ord-012',
    kind: 'mobile',
    planName: 'STC Postpaid 199',
    provider: 'STC',
    priceSAR: 199,
    purchasedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'physical',
    status: 'activated',
    assignedNumber: '0509934455',
    iccid: '8966033987654321098',
  },
  {
    id: 'ord-013',
    kind: 'mobile',
    planName: 'Yaqoot Prepaid 39',
    provider: 'Yaqoot',
    priceSAR: 39,
    purchasedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'physical',
    status: 'activated',
    assignedNumber: '0563344556',
  },
  {
    id: 'ord-014',
    kind: 'voucher',
    planName: 'PlayStation Plus · 75 SAR',
    provider: 'PlayStation',
    priceSAR: 75,
    purchasedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'activated',
    qrPayload: 'PSN-PLUS-A1B2-C3D4-E5F6',
  },
  {
    id: 'ord-015',
    kind: 'voucher',
    planName: 'Apple iTunes · 100 SAR',
    provider: 'Apple',
    priceSAR: 100,
    purchasedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'activated',
    qrPayload: 'ITUNES-2026-XKD9-PAL2',
  },
  {
    id: 'ord-016',
    kind: 'voucher',
    planName: 'Mobily Recharge · 30 SAR',
    provider: 'Mobily',
    priceSAR: 30,
    purchasedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'activated',
    qrPayload: 'MOB-VC-99221-44103',
  },
  {
    id: 'ord-017',
    kind: 'voucher',
    planName: 'Shahid VIP · 60 SAR',
    provider: 'Shahid',
    priceSAR: 60,
    purchasedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expired',
    qrPayload: 'SHD-VIP-EXPIRED-2025',
    expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-018',
    kind: 'internet',
    planName: 'Mobily Home 500',
    provider: 'Mobily',
    priceSAR: 369,
    purchasedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'activated',
    shippedAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'MOB-INSTALL-B-44119',
  },
  {
    id: 'ord-019',
    kind: 'internet',
    planName: 'Zain Home 200',
    provider: 'Zain',
    priceSAR: 229,
    purchasedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'expired',
    shippedAt: new Date(Date.now() - 98 * 24 * 60 * 60 * 1000).toISOString(),
    trackingNumber: 'ZAIN-INSTALL-C-77820',
    expiresAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ord-020',
    kind: 'mobile',
    planName: 'Zain eSIM Plus 149',
    provider: 'Zain',
    priceSAR: 149,
    purchasedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    simType: 'esim',
    status: 'activated',
    assignedNumber: '0557766554',
    iccid: '8966033099887766554',
    qrPayload: 'LPA:1$rsp.zain.sa$ZAIN-PLUS-9876',
  },
];

function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Order[];
  } catch { /* ignore */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ORDERS));
  return MOCK_ORDERS;
}

function saveOrders(orders: Order[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

const STATUS_TONES: Record<OrderStatus, { label: { en: string; ar: string }; bg: string; fg: string; dot: string; icon: typeof Clock }> = {
  'pending-activation': { label: { en: 'Ready to activate', ar: 'جاهزة للتفعيل' },  bg: '#FE7151', fg: '#FFFFFF', dot: '#FE7151', icon: AlertCircle },
  shipped:              { label: { en: 'In transit',         ar: 'في الطريق' },        bg: '#C59AFA', fg: '#16143A', dot: '#C59AFA', icon: Truck },
  delivered:            { label: { en: 'Delivered',          ar: 'تم التوصيل' },       bg: '#CFEB74', fg: '#16143A', dot: '#CFEB74', icon: Package },
  activated:            { label: { en: 'Active',             ar: 'مفعّلة' },           bg: 'rgba(22, 20, 58, 0.08)', fg: '#16143A', dot: '#16143A', icon: CheckCircle2 },
  expired:              { label: { en: 'Expired',            ar: 'منتهية' },           bg: 'rgba(239, 68, 68, 0.10)', fg: '#9B2222', dot: '#9B2222', icon: Clock },
};

// Stepper path per kind. Mobile (eSIM/physical), voucher (instant), internet (install).
function getStepperPath(order: Order, isAr: boolean): { label: string; reached: boolean }[] {
  const A = (en: string, ar: string) => isAr ? ar : en;
  if (order.kind === 'voucher') {
    const done = order.status === 'activated' || order.status === 'expired';
    return [
      { label: A('Ordered', 'تم الطلب'),       reached: true },
      { label: A('Code ready', 'الرمز جاهز'), reached: done },
    ];
  }
  if (order.kind === 'internet') {
    return [
      { label: A('Ordered', 'تم الطلب'),               reached: true },
      { label: A('Install set', 'تم الجدولة'),         reached: order.status === 'shipped' || order.status === 'activated' },
      { label: A('On-site', 'في الموقع'),              reached: order.status === 'activated' },
      { label: A('Active', 'مفعّلة'),                   reached: order.status === 'activated' },
    ];
  }
  // Mobile
  const isEsim = order.simType === 'esim';
  return [
    { label: A('Ordered', 'تم الطلب'),                                          reached: true },
    { label: isEsim ? A('eSIM ready', 'eSIM جاهزة') : A('Shipped', 'تم الشحن'), reached: ['shipped', 'delivered', 'pending-activation', 'activated', 'expired'].includes(order.status) },
    { label: isEsim ? A('Activated', 'مفعّلة') : A('Delivered', 'تم التوصيل'),    reached: ['delivered', 'activated', 'expired'].includes(order.status) },
    { label: A('Active', 'مفعّلة'),                                                reached: order.status === 'activated' || order.status === 'expired' },
  ];
}

function formatDate(iso: string, lang: 'en' | 'ar') {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function OrdersPage() {
  const { lang } = useLang();
  const { isLoggedIn, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [modalKind, setModalKind] = useState<'qr' | 'tracking' | 'activate-physical' | null>(null);
  const [filter, setFilter] = useState<'all' | OrderKind>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'action-needed'>('all');
  const isAr = lang === 'ar';

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  // Redirect to profile sign-in if not logged in
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/profile?tab=signup&from=orders');
    }
  }, [loading, isLoggedIn, navigate]);

  // Apply kind filter first, then status filter on top.
  const kindFiltered = useMemo(
    () => filter === 'all' ? orders : orders.filter(o => o.kind === filter),
    [orders, filter],
  );

  const filteredOrders = useMemo(() => {
    const isActive = (s: OrderStatus) => s !== 'expired';
    const isActionNeeded = (s: OrderStatus) => s === 'pending-activation' || s === 'delivered';
    const list = kindFiltered.filter(o => {
      if (statusFilter === 'all')           return true;
      if (statusFilter === 'active')        return isActive(o.status);
      if (statusFilter === 'expired')       return o.status === 'expired';
      if (statusFilter === 'action-needed') return isActionNeeded(o.status);
      return true;
    });
    return list.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
  }, [kindFiltered, statusFilter]);

  // Counts shown beside each status pill — scoped to current kind selection.
  const statusCounts = useMemo(() => ({
    all:            kindFiltered.length,
    'action-needed': kindFiltered.filter(o => o.status === 'pending-activation' || o.status === 'delivered').length,
    active:         kindFiltered.filter(o => o.status !== 'expired').length,
    expired:        kindFiltered.filter(o => o.status === 'expired').length,
  }), [kindFiltered]);

  const statusChips: { id: 'all' | 'action-needed' | 'active' | 'expired'; en: string; ar: string }[] = [
    { id: 'all',            en: 'All',           ar: 'الكل' },
    { id: 'action-needed',  en: 'Action needed', ar: 'يحتاج إجراء' },
    { id: 'active',         en: 'Active',        ar: 'فعّالة' },
    { id: 'expired',        en: 'Expired',       ar: 'منتهية' },
  ];

  const counts = useMemo(() => ({
    all:      orders.length,
    mobile:   orders.filter(o => o.kind === 'mobile').length,
    internet: orders.filter(o => o.kind === 'internet').length,
    voucher:  orders.filter(o => o.kind === 'voucher').length,
  }), [orders]);

  const filterChips: { id: 'all' | OrderKind; en: string; ar: string; activeBg: string }[] = [
    { id: 'all',      en: 'All',          ar: 'الكل',         activeBg: '#16143A' },
    { id: 'mobile',   en: 'Mobile plans', ar: 'باقات الجوال', activeBg: '#C59AFA' },
    { id: 'internet', en: 'Internet',     ar: 'الإنترنت',      activeBg: '#CFEB74' },
    { id: 'voucher',  en: 'Vouchers',     ar: 'القسائم',       activeBg: '#FE7151' },
  ];

  const openQr = (order: Order) => {
    setActiveOrder(order);
    setModalKind('qr');
    trackEvent('order_activate_qr_opened', { order_id: order.id, sim_type: order.simType });
  };

  const openTracking = (order: Order) => {
    setActiveOrder(order);
    setModalKind('tracking');
  };

  const openActivatePhysical = (order: Order) => {
    setActiveOrder(order);
    setModalKind('activate-physical');
  };

  const closeModal = () => { setActiveOrder(null); setModalKind(null); };

  const markActivated = (orderId: string, assignedNumber: string, iccid?: string) => {
    const next = orders.map(o => o.id === orderId
      ? { ...o, status: 'activated' as OrderStatus, assignedNumber, iccid }
      : o);
    setOrders(next);
    saveOrders(next);
    trackEvent('order_activated', { order_id: orderId, sim_type: orders.find(o => o.id === orderId)?.simType });
    closeModal();
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
      {/* Hero — slim themed bar */}
      <section className="relative overflow-hidden page-hero border-b border-border">
        <div className="relative z-[2] max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-5">
          <Link to="/profile" className="inline-flex items-center gap-1 text-foreground/60 text-[11px] font-medium hover:text-foreground transition-colors">
            <ArrowLeft size={13} className="rtl:rotate-180" />
            {isAr ? 'الحساب' : 'Account'}
          </Link>
          <div className="flex items-center gap-2.5 mt-1.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#C59AFA', border: '1px solid rgba(22, 20, 58, 0.20)' }}>
              <Package size={18} style={{ color: '#16143A' }} />
            </div>
            <div>
              <h1 className="font-heading font-bold text-lg md:text-xl text-foreground tracking-tight leading-tight">
                {isAr ? 'طلباتي' : 'My Orders'}
              </h1>
              <p className="text-foreground/55 text-[11px] md:text-xs leading-tight">
                {isAr ? `${orders.length} طلب · تتبّع وفعّل شرائحك` : `${orders.length} orders · track & activate your SIMs`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter chips — primary axis: kind */}
      {orders.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-4 space-y-2.5">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {filterChips.map(chip => {
              const count = counts[chip.id];
              const isActive = filter === chip.id;
              const textColor = isActive
                ? (chip.id === 'all' ? '#FFFFFF' : '#16143A')
                : '#16143A';
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => { setFilter(chip.id); setStatusFilter('all'); }}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold border-2 transition-all ${
                    isActive ? '' : 'border-border bg-card hover:border-foreground/30'
                  }`}
                  style={isActive ? { background: chip.activeBg, borderColor: '#16143A', color: textColor } : { color: 'inherit' }}
                >
                  <span>{isAr ? chip.ar : chip.en}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 rounded-full"
                    style={{
                      background: isActive ? 'rgba(22, 20, 58, 0.18)' : 'rgba(22, 20, 58, 0.08)',
                      color: isActive ? textColor : '#16143A',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary axis: status (lighter pills, scoped to current kind) */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {statusChips.map(chip => {
              const count = statusCounts[chip.id];
              const isActive = statusFilter === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  disabled={count === 0}
                  className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    isActive
                      ? 'bg-foreground text-background'
                      : 'text-foreground/60 hover:text-foreground hover:bg-secondary/60 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
                  }`}
                >
                  <span>{isAr ? chip.ar : chip.en}</span>
                  <span className={`text-[10px] font-mono ${isActive ? 'opacity-75' : 'opacity-50'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-8 py-4 md:py-6 space-y-6">
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
              <Package size={28} className="text-muted-foreground" />
            </div>
            <h3 className="font-heading font-bold text-lg text-foreground">
              {isAr ? 'لا يوجد طلبات بعد' : 'No orders yet'}
            </h3>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {isAr ? 'أول باقة تشتريها ستظهر هنا.' : 'Your first purchased plan will show up here.'}
            </p>
            <Button asChild className="mt-5">
              <Link to="/plans">{isAr ? 'تصفّح الباقات' : 'Browse plans'}</Link>
            </Button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {isAr ? 'ما في طلبات في هذا التصنيف.' : 'No orders in this category.'}
            </p>
            <button onClick={() => setFilter('all')} className="text-[12px] font-semibold text-foreground underline underline-offset-4 mt-2 hover:opacity-80">
              {isAr ? 'عرض الكل' : 'Show all'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                isAr={isAr}
                onQr={() => openQr(order)}
                onTrack={() => openTracking(order)}
                onActivatePhysical={() => openActivatePhysical(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* QR activation modal (eSIM) */}
      <QrModal open={modalKind === 'qr'} order={activeOrder} onClose={closeModal} onMarkActivated={markActivated} isAr={isAr} />

      {/* Shipment tracking modal (physical, in transit) */}
      <TrackingModal open={modalKind === 'tracking'} order={activeOrder} onClose={closeModal} isAr={isAr} />

      {/* Physical SIM activation modal */}
      <PhysicalActivateModal open={modalKind === 'activate-physical'} order={activeOrder} onClose={closeModal} onMarkActivated={markActivated} isAr={isAr} />
    </div>
  );
}

// ─── Order card ────────────────────────────────────────────────────────
function OrderCard({
  order, isAr, onQr, onTrack, onActivatePhysical,
}: {
  order: Order;
  isAr: boolean;
  onQr: () => void;
  onTrack: () => void;
  onActivatePhysical: () => void;
}) {
  const tone = STATUS_TONES[order.status];
  const carrierLogo = getCarrierLogo(order.provider);
  const carrierColor = getCarrierColor(order.provider);
  const path = getStepperPath(order, isAr);

  return (
    <article className="rounded-2xl bg-card border border-border ob-card-elev overflow-hidden">
      {/* Carrier color strip */}
      <div className="h-1" style={{ background: carrierColor }} />
      <div className="p-4 md:p-5">
        {/* Header: carrier + plan + status pill */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {carrierLogo ? (
              <img src={carrierLogo} alt={order.provider} className="h-7 w-auto object-contain shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: carrierColor, color: '#fff' }}>
                {order.kind === 'voucher' ? <Gift size={16} /> : order.kind === 'internet' ? <Wifi size={16} /> : <Smartphone size={16} />}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-[14px] md:text-[15px] text-foreground truncate">
                {order.planName}
              </h3>
              <p className="text-[11px] text-foreground/55 mt-0.5">
                {formatDate(order.purchasedAt, isAr ? 'ar' : 'en')}
                <span className="text-foreground/30 mx-1">·</span>
                <span className="font-bold text-foreground/75">
                  <SarSymbol className="text-[10px]" /> {order.priceSAR}
                </span>
              </p>
            </div>
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {tone.label[isAr ? 'ar' : 'en']}
          </span>
        </div>

        {/* Stepper — visual lifecycle */}
        <div className="flex items-center gap-1 mb-2">
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
        <div className="flex justify-between gap-1 text-[10px] mb-4">
          {path.map((step, i) => (
            <span key={i} className={`flex-1 leading-tight ${step.reached ? 'font-semibold text-foreground/85' : 'text-foreground/40'}`}>
              {step.label}
            </span>
          ))}
        </div>

        {/* Action row — varies by kind + status */}
        <div className="flex items-center gap-2">
          {order.kind === 'mobile' && order.status === 'pending-activation' && order.simType === 'esim' && (
            <Button onClick={onQr} size="sm" className="font-bold flex-1" style={{ background: '#FE7151', color: '#FFFFFF' }}>
              <QrCode size={14} />
              {isAr ? 'تفعيل عبر رمز QR' : 'Activate with QR'}
            </Button>
          )}
          {order.kind === 'mobile' && order.status === 'shipped' && (
            <Button onClick={onTrack} size="sm" variant="outline" className="font-bold flex-1">
              <Truck size={14} />
              {isAr ? 'تتبّع الشحنة' : 'Track shipment'}
            </Button>
          )}
          {order.kind === 'mobile' && order.status === 'delivered' && order.simType === 'physical' && (
            <Button onClick={onActivatePhysical} size="sm" className="font-bold flex-1" style={{ background: '#CFEB74', color: '#16143A' }}>
              <CheckCircle2 size={14} />
              {isAr ? 'تفعيل الشريحة' : 'Activate SIM'}
            </Button>
          )}
          {order.kind === 'internet' && order.status === 'shipped' && (
            <Button onClick={onTrack} size="sm" className="font-bold flex-1" style={{ background: '#CFEB74', color: '#16143A' }}>
              <Truck size={14} />
              {isAr ? 'موعد التركيب' : 'Install schedule'}
            </Button>
          )}
          {order.kind === 'voucher' && order.status === 'activated' && (
            <Button onClick={onQr} size="sm" className="font-bold flex-1" style={{ background: '#FE7151', color: '#FFFFFF' }}>
              <Eye size={14} />
              {isAr ? 'عرض الرمز' : 'View code'}
            </Button>
          )}
          {order.kind === 'mobile' && order.status === 'activated' && (
            <p className="text-[11px] text-foreground/55 italic">
              {isAr ? 'تم التفعيل بنجاح.' : 'Successfully activated.'}
            </p>
          )}
          {order.status === 'expired' && (
            <>
              <p className="text-[11px] text-foreground/55 flex-1">
                {order.expiresAt && (
                  <>
                    {isAr ? 'انتهت في ' : 'Expired on '}
                    <span className="font-semibold text-foreground/75">{formatDate(order.expiresAt, isAr ? 'ar' : 'en')}</span>
                  </>
                )}
              </p>
              <Link
                to={order.kind === 'voucher' ? '/vouchers' : order.kind === 'internet' ? '/internet' : '/plans'}
                className="text-[11.5px] font-bold underline underline-offset-4 text-foreground hover:opacity-80"
              >
                {isAr ? 'تجديد' : 'Renew'}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── eSIM activation modal — ID → Nafath number → QR ──────────────────
function QrModal({
  open, order, onClose, onMarkActivated, isAr,
}: {
  open: boolean; order: Order | null; onClose: () => void;
  onMarkActivated: (id: string, num: string, iccid?: string) => void;
  isAr: boolean;
}) {
  type Step = 'id' | 'nafath' | 'qr';
  const [step, setStep] = useState<Step>('id');
  const [idNumber, setIdNumber] = useState('');
  // Nafath-style 2-digit challenge — user must pick this in the Nafath app.
  const [nafathNumber, setNafathNumber] = useState<number>(() => Math.floor(Math.random() * 90) + 10);

  // Reset everything whenever the modal opens.
  useEffect(() => {
    if (open) {
      setStep('id');
      setIdNumber('');
      setNafathNumber(Math.floor(Math.random() * 90) + 10);
    }
  }, [open]);

  if (!order) return null;
  const isVoucher = order.kind === 'voucher';
  const idValid = /^[12]\d{9}$/.test(idNumber);

  // Vouchers stay simple — no identity step needed for digital codes.
  if (isVoucher) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-xl flex items-center gap-2">
              <QrCode size={20} style={{ color: '#FE7151' }} />
              {isAr ? 'رمز القسيمة' : 'Your voucher code'}
            </DialogTitle>
            <DialogDescription>
              {isAr ? 'استخدم الرمز التالي عند الاستبدال على موقع المزود.' : 'Use the code below to redeem on the provider\'s site.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center my-3">
            <div className="w-56 h-56 rounded-2xl bg-white p-4 grid grid-cols-12 grid-rows-12 gap-px border-2 border-foreground" aria-label="Voucher QR">
              {Array.from({ length: 144 }).map((_, i) => {
                const seed = (i * 9301 + 49297) % 233280;
                const on = (seed / 233280) > 0.45;
                const isCorner = ((i < 36 && i % 12 < 3) || (i < 36 && i % 12 > 8) || (i >= 108 && i % 12 < 3));
                return <div key={i} className="rounded-[1px]" style={{ background: (isCorner || on) ? '#16143A' : 'transparent' }} />;
              })}
            </div>
          </div>
          <p className="text-[11px] text-foreground/60 text-center font-mono break-all px-2 mb-2">
            {order.qrPayload}
          </p>
          <Button onClick={onClose} className="w-full font-bold mt-2" style={{ background: '#16143A', color: '#FFFFFF' }}>
            {isAr ? 'تم' : 'Done'}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // eSIM activation flow — three steps gated by Saudi identity rules.
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-xl flex items-center gap-2">
            {step === 'id' && (
              <>
                <FileText size={20} style={{ color: '#FE7151' }} />
                {isAr ? 'تأكيد الهوية' : 'Verify your identity'}
              </>
            )}
            {step === 'nafath' && (
              <>
                <Shield size={20} style={{ color: '#16143A' }} />
                {isAr ? 'تحقق عبر نفاذ' : 'Confirm with Nafath'}
              </>
            )}
            {step === 'qr' && (
              <>
                <QrCode size={20} style={{ color: '#FE7151' }} />
                {isAr ? 'تفعيل eSIM' : 'Activate your eSIM'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'id'     && (isAr ? 'أدخل رقم الهوية أو الإقامة لتفعيل eSIM.' : 'Enter your National ID or Iqama to activate the eSIM.')}
            {step === 'nafath' && (isAr ? 'افتح تطبيق نفاذ واختر الرقم التالي.' : 'Open the Nafath app and tap the matching number.')}
            {step === 'qr'     && (isAr ? 'افتح إعدادات الجوال > البيانات > أضف خطة، ثم امسح الرمز.' : 'Open Settings → Cellular → Add eSIM, then scan the code below.')}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: ID ── */}
        {step === 'id' && (
          <div className="mt-3 space-y-3">
            <Input
              inputMode="numeric"
              maxLength={10}
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1xxxxxxxxx / 2xxxxxxxxx"
              className="bg-card font-mono text-center text-lg tracking-wider"
            />
            <p className="text-[11px] text-foreground/55 text-center">
              {isAr
                ? '10 أرقام · يبدأ بـ 1 (هوية) أو 2 (إقامة)'
                : '10 digits · starts with 1 (National ID) or 2 (Iqama)'}
            </p>
            <Button onClick={() => setStep('nafath')} disabled={!idValid} className="w-full font-bold">
              {isAr ? 'متابعة' : 'Continue'}
            </Button>
          </div>
        )}

        {/* ── STEP 2: Nafath challenge number ── */}
        {step === 'nafath' && (
          <div className="mt-2">
            <button onClick={() => setStep('id')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
              <ArrowLeft size={12} className="rtl:rotate-180" />
              {isAr ? 'رجوع' : 'Back'}
            </button>

            <div className="flex flex-col items-center my-3">
              <div className="text-[10.5px] uppercase tracking-widest text-foreground/55 font-mono mb-2">
                {isAr ? 'اختر هذا الرقم في تطبيق نفاذ' : 'Pick this number in the Nafath app'}
              </div>
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center font-heading font-bold text-6xl tabular-nums shadow-xl"
                style={{ background: '#16143A', color: '#CFEB74' }}
              >
                {nafathNumber}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-[12px] text-foreground/65">
                <span className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/45 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </span>
                {isAr ? 'بانتظار التأكيد في نفاذ' : 'Waiting for Nafath confirmation'}
              </div>
            </div>

            <ol className="rounded-xl bg-secondary/40 border border-border p-3 text-[11.5px] text-foreground/80 leading-relaxed list-decimal ms-5">
              <li>{isAr ? 'افتح تطبيق نفاذ.' : 'Open the Nafath app.'}</li>
              <li>{isAr ? 'سيظهر لك ٣ أرقام.' : 'You will see 3 numbers.'}</li>
              <li>
                {isAr
                  ? <>اضغط على <span className="font-mono font-bold text-foreground">{nafathNumber}</span> لتأكيد الهوية.</>
                  : <>Tap <span className="font-mono font-bold text-foreground">{nafathNumber}</span> to confirm your identity.</>}
              </li>
            </ol>

            <Button onClick={() => setStep('qr')} className="w-full font-bold mt-4" style={{ background: '#16143A', color: '#FFFFFF' }}>
              <CheckCircle2 size={16} />
              {isAr ? 'تم التأكيد في نفاذ' : 'I confirmed in Nafath'}
            </Button>
          </div>
        )}

        {/* ── STEP 3: QR — auto-shown after Nafath ── */}
        {step === 'qr' && (
          <>
            <div className="flex justify-center my-3">
              <div
                className="w-56 h-56 rounded-2xl bg-white p-4 grid grid-cols-12 grid-rows-12 gap-px border-2 border-foreground"
                aria-label="eSIM activation QR"
              >
                {Array.from({ length: 144 }).map((_, i) => {
                  const seed = (i * 9301 + 49297) % 233280;
                  const on = (seed / 233280) > 0.45;
                  const isCorner = ((i < 36 && i % 12 < 3) || (i < 36 && i % 12 > 8) || (i >= 108 && i % 12 < 3));
                  return <div key={i} className="rounded-[1px]" style={{ background: (isCorner || on) ? '#16143A' : 'transparent' }} />;
                })}
              </div>
            </div>

            <p className="text-[11px] text-foreground/60 text-center font-mono break-all px-2 mb-2">
              {order.qrPayload}
            </p>

            <Button
              onClick={() => onMarkActivated(order.id, order.assignedNumber || '', undefined)}
              className="w-full font-bold mt-2"
              style={{ background: '#CFEB74', color: '#16143A' }}
            >
              <CheckCircle2 size={16} />
              {isAr ? 'تم المسح، فعّل الآن' : "I've scanned it — activate"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Shipment tracking modal ────────────────────────────────────────────
function TrackingModal({
  open, order, onClose, isAr,
}: {
  open: boolean; order: Order | null; onClose: () => void; isAr: boolean;
}) {
  if (!order) return null;

  const steps = [
    { key: 'placed',   label: { en: 'Order placed',           ar: 'تم استلام الطلب' },        date: order.purchasedAt, done: true },
    { key: 'packed',   label: { en: 'Packed',                  ar: 'تم التغليف' },              date: order.shippedAt,    done: !!order.shippedAt },
    { key: 'in-transit', label: { en: 'In transit · ' + (order.shippingLocation ?? '—'), ar: 'في الطريق · ' + (order.shippingLocation ?? '—') }, date: order.shippedAt, done: order.status === 'shipped' || order.status === 'delivered' || order.status === 'activated' },
    { key: 'delivered', label: { en: 'Out for delivery / delivered', ar: 'في الطريق للتوصيل / تم' }, date: order.estimatedDelivery, done: order.status === 'delivered' || order.status === 'activated' },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-xl flex items-center gap-2">
            <Truck size={20} style={{ color: '#C59AFA' }} />
            {isAr ? 'تتبّع الشحنة' : 'Track your SIM'}
          </DialogTitle>
          <DialogDescription>
            {order.trackingNumber && (
              <span className="font-mono text-[11px]">{order.trackingNumber}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 space-y-3">
          {steps.map((step, i) => (
            <div key={step.key} className="flex items-start gap-3">
              <div className="relative shrink-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: step.done ? '#CFEB74' : 'rgba(22, 20, 58, 0.08)', color: '#16143A' }}
                >
                  {step.done ? <CheckCircle2 size={14} strokeWidth={2.5} /> : <Clock size={13} />}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-1/2 top-7 -translate-x-1/2 w-px h-6"
                    style={{ background: step.done ? '#CFEB74' : 'rgba(22, 20, 58, 0.15)' }}
                  />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className={`text-sm ${step.done ? 'font-semibold text-foreground' : 'text-foreground/55'}`}>
                  {step.label[isAr ? 'ar' : 'en']}
                </div>
                {step.date && step.done && (
                  <div className="text-[11px] text-foreground/50 mt-0.5">
                    {formatDate(step.date, isAr ? 'ar' : 'en')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {order.shippingLocation && order.status === 'shipped' && (
          <div className="rounded-xl bg-secondary/50 border border-border p-3 flex items-center gap-2">
            <MapPin size={14} className="text-foreground/60 shrink-0" />
            <p className="text-[12px] text-foreground/75">
              {isAr ? 'آخر موقع: ' : 'Last location: '}
              <strong className="text-foreground">{order.shippingLocation}</strong>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Physical SIM activation modal ──────────────────────────────────────
function PhysicalActivateModal({
  open, order, onClose, onMarkActivated, isAr,
}: {
  open: boolean; order: Order | null; onClose: () => void;
  onMarkActivated: (id: string, num: string, iccid?: string) => void;
  isAr: boolean;
}) {
  // Order: ID → MSISDN/ICCID (activate form) → Nafath → activation completes.
  type Step = 'id' | 'activate' | 'nafath';
  const [step, setStep] = useState<Step>('id');
  const [idNumber, setIdNumber] = useState('');
  const [nafathNumber, setNafathNumber] = useState<number>(() => Math.floor(Math.random() * 90) + 10);
  const [msisdn, setMsisdn] = useState('');
  const [iccid, setIccid] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state every time the modal opens.
  useEffect(() => {
    if (open) {
      setStep('id');
      setIdNumber('');
      setNafathNumber(Math.floor(Math.random() * 90) + 10);
      setMsisdn('');
      setIccid('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  if (!order) return null;

  const idValid = /^[12]\d{9}$/.test(idNumber);
  const msisdnValid = /^05\d{8}$/.test(msisdn.trim());
  const iccidValid = /^\d{18,20}$/.test(iccid.trim().replace(/\s/g, ''));

  // Validates the MSISDN/ICCID form. Returns false if invalid (and surfaces an
  // error). Used both before advancing to Nafath and as a final check.
  const validateActivation = (): boolean => {
    setError(null);
    if (!msisdnValid) { setError(isAr ? 'رقم الجوال غير صالح. يجب أن يبدأ بـ 05.' : 'Invalid phone. Must start with 05.'); return false; }
    if (!iccidValid)  { setError(isAr ? 'رقم ICCID غير صالح (18-20 رقم).' : 'Invalid ICCID (18-20 digits).'); return false; }
    return true;
  };

  const continueToNafath = () => {
    if (!validateActivation()) return;
    setStep('nafath');
  };

  // Final activation, called after Nafath confirmation.
  const submit = async () => {
    if (!validateActivation()) { setStep('activate'); return; }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    onMarkActivated(order.id, msisdn.trim(), iccid.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-4 sm:p-5">
        <DialogHeader>
          <DialogTitle className="font-heading font-bold text-xl flex items-center gap-2">
            {step === 'id' && (
              <>
                <FileText size={20} style={{ color: '#FE7151' }} />
                {isAr ? 'تأكيد الهوية' : 'Verify your identity'}
              </>
            )}
            {step === 'nafath' && (
              <>
                <Shield size={20} style={{ color: '#16143A' }} />
                {isAr ? 'تحقق عبر نفاذ' : 'Confirm with Nafath'}
              </>
            )}
            {step === 'activate' && (
              <>
                <Smartphone size={20} style={{ color: '#CFEB74' }} />
                {isAr ? 'تفعيل الشريحة' : 'Activate your SIM'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'id'       && (isAr ? 'أدخل رقم الهوية أو الإقامة لتفعيل الشريحة.' : 'Enter your National ID or Iqama to activate the SIM.')}
            {step === 'activate' && (isAr
              ? 'أدخل رقم MSISDN (الجوال) ورقم ICCID المطبوع على الشريحة.'
              : 'Enter the MSISDN (phone number) and the ICCID printed on the SIM.')}
            {step === 'nafath'   && (isAr
              ? 'الخطوة الأخيرة — أكّد عبر نفاذ لتفعيل الشريحة.'
              : 'Final step — confirm in Nafath to activate the SIM.')}
          </DialogDescription>
        </DialogHeader>

        {/* ── STEP 1: ID ── */}
        {step === 'id' && (
          <div className="mt-3 space-y-3">
            <Input
              inputMode="numeric"
              maxLength={10}
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="1xxxxxxxxx / 2xxxxxxxxx"
              className="bg-card font-mono text-center text-lg tracking-wider"
            />
            <p className="text-[11px] text-foreground/55 text-center">
              {isAr
                ? '10 أرقام · يبدأ بـ 1 (هوية) أو 2 (إقامة)'
                : '10 digits · starts with 1 (National ID) or 2 (Iqama)'}
            </p>
            <Button onClick={() => setStep('activate')} disabled={!idValid} className="w-full font-bold">
              {isAr ? 'متابعة' : 'Continue'}
            </Button>
          </div>
        )}

        {/* ── STEP 3: Nafath challenge — final verification before activation ── */}
        {step === 'nafath' && (
          <div className="mt-2">
            <button onClick={() => setStep('activate')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mb-3">
              <ArrowLeft size={12} className="rtl:rotate-180" />
              {isAr ? 'رجوع' : 'Back'}
            </button>

            <div className="flex flex-col items-center my-3">
              <div className="text-[10.5px] uppercase tracking-widest text-foreground/55 font-mono mb-2">
                {isAr ? 'اختر هذا الرقم في تطبيق نفاذ' : 'Pick this number in the Nafath app'}
              </div>
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center font-heading font-bold text-6xl tabular-nums shadow-xl"
                style={{ background: '#16143A', color: '#CFEB74' }}
              >
                {nafathNumber}
              </div>
              <div className="mt-3 inline-flex items-center gap-2 text-[12px] text-foreground/65">
                <span className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/45 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </span>
                {isAr ? 'بانتظار التأكيد في نفاذ' : 'Waiting for Nafath confirmation'}
              </div>
            </div>

            <ol className="rounded-xl bg-secondary/40 border border-border p-3 text-[11.5px] text-foreground/80 leading-relaxed list-decimal ms-5">
              <li>{isAr ? 'افتح تطبيق نفاذ.' : 'Open the Nafath app.'}</li>
              <li>{isAr ? 'سيظهر لك ٣ أرقام.' : 'You will see 3 numbers.'}</li>
              <li>
                {isAr
                  ? <>اضغط على <span className="font-mono font-bold text-foreground">{nafathNumber}</span> لتأكيد الهوية.</>
                  : <>Tap <span className="font-mono font-bold text-foreground">{nafathNumber}</span> to confirm your identity.</>}
              </li>
            </ol>

            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full font-bold mt-4"
              style={{ background: '#CFEB74', color: '#16143A' }}
            >
              {submitting
                ? <span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" /> {isAr ? 'جاري التفعيل...' : 'Activating...'}</span>
                : <><CheckCircle2 size={16} /> {isAr ? 'تم التأكيد، فعّل الشريحة' : 'Confirmed — activate SIM'}</>}
            </Button>
          </div>
        )}

        {/* ── STEP 2: MSISDN + ICCID — entered before Nafath verification ── */}
        {step === 'activate' && (
          <>
            <button onClick={() => setStep('id')} className="inline-flex items-center gap-1 text-[11px] text-foreground/60 hover:text-foreground mt-2 mb-1">
              <ArrowLeft size={12} className="rtl:rotate-180" />
              {isAr ? 'رجوع' : 'Back'}
            </button>
            <div className="my-3 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  {isAr ? 'رقم الجوال (MSISDN)' : 'Phone number (MSISDN)'}
                </label>
                <Input
                  value={msisdn}
                  onChange={(e) => setMsisdn(e.target.value)}
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                  inputMode="numeric"
                  className="font-mono bg-card"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground/70 mb-1.5 uppercase tracking-wider">
                  ICCID
                </label>
                <Input
                  value={iccid}
                  onChange={(e) => setIccid(e.target.value)}
                  placeholder="89-9601-xxxx-xxxx-xxxx"
                  dir="ltr"
                  inputMode="numeric"
                  className="font-mono bg-card"
                />
                <p className="text-[10.5px] text-foreground/50 mt-1">
                  {isAr ? 'رقم مكوّن من 18-20 خانة على ظهر الشريحة.' : '18-20 digit number on the back of the SIM card.'}
                </p>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-[12px] text-destructive font-medium">
                  {error}
                </div>
              )}
            </div>

            <Button onClick={continueToNafath} className="w-full font-bold">
              <Shield size={16} />
              {isAr ? 'متابعة عبر نفاذ' : 'Continue with Nafath'}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
