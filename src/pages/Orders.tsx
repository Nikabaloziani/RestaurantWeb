import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, CreditCard, Loader2, Plus, RefreshCw, Search } from 'lucide-react';
import CreateOrderDialog from './CreateOrderDialog';
import RecordPaymentDialog from './RecordPaymentDialog';
import { fetchPaymentRecords, type PaymentRecord } from '../api/payments';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import {
  changeOrderStatus,
  fetchOrders,
  ORDER_STATUS_CODES,
  type EditableOrderStatus,
  type LiveOrder,
  type LiveOrderStatus,
} from '../api/orders';

// Paid is only reachable through a completed payment, never a manual status edit.
const STATUSES = Object.keys(ORDER_STATUS_CODES) as EditableOrderStatus[];
const EDITABLE_STATUSES = STATUSES.filter(value => value !== 'paid');
const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 });

type OrdersProps = {
  token: string;
  restaurantId: string;
};

export default function Orders({ token, restaurantId }: OrdersProps) {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [creating, setCreating] = useState(false);
  const [payingOrder, setPayingOrder] = useState<LiveOrder | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[] | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | LiveOrderStatus>('all');
  const [drafts, setDrafts] = useState<Record<number, EditableOrderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const hasRestaurant = restaurantId.trim().length > 0;

  useEffect(() => {
    setCreating(false);
    setPayingOrder(null);
    setDrafts({});
    setNotice(null);
    setStatus('all');
    setSearch('');
  }, [restaurantId]);

  // Do not keep old data visible following a failed refresh.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOrders([]);
    setDrafts({});
    if (!hasRestaurant) {
      setLoading(false);
      return () => controller.abort();
    }
    void fetchOrders(token, restaurantId, controller.signal)
      .then(data => {
        if (controller.signal.aborted) return;
        setOrders(data);
        setDrafts({});
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'orders.errorUnknown');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [token, restaurantId, hasRestaurant, reload]);

  useEffect(() => {
    const controller = new AbortController();
    setPaymentLoading(true);
    setPaymentError(null);
    setPayments(null);
    if (!hasRestaurant) {
      setPaymentLoading(false);
      return () => controller.abort();
    }
    void fetchPaymentRecords(token, restaurantId, controller.signal)
      .then(rows => { if (!controller.signal.aborted) setPayments(rows); })
      .catch(err => { if (!controller.signal.aborted) setPaymentError(err instanceof Error ? err.message : String(err)); })
      .finally(() => { if (!controller.signal.aborted) setPaymentLoading(false); });
    return () => controller.abort();
  }, [token, restaurantId, hasRestaurant, reload]);

  const refresh = useCallback(() => {
    if (savingId !== null || !hasRestaurant) return;
    setNotice(null);
    setReload(value => value + 1);
  }, [savingId, hasRestaurant]);

  const localizedError = (message: string) => {
    if (message.startsWith('orders.errorHttp:')) {
      return t('orders.errorHttp', { status: message.split(':')[1] });
    }
    if (message.startsWith('orders.')) return t(message);
    return message;
  };

  const filtered = useMemo(() => orders.filter(order =>
    (status === 'all' || status === order.status) &&
    `#${order.id} ${order.tableId}`.toLowerCase().includes(search.toLowerCase().trim())
  ).sort((a, b) => (Date.parse(b.orderDate) || 0) - (Date.parse(a.orderDate) || 0)), [orders, status, search]);

  const save = async (order: LiveOrder) => {
    if (!hasRestaurant) return;
    const nextStatus = drafts[order.id] ?? (order.status === 'unknown' ? 'pending' : order.status);
    if (order.status === 'cancelled' || order.status === 'paid' || order.status === 'unknown' || nextStatus === 'paid') return;
    if (order.status === nextStatus) return;
    if (!window.confirm(t('orders.confirmUpdate', { id: order.id, status: t(`statuses.${nextStatus}`) }))) return;
    setError(null);
    setNotice(null);
    setSavingId(order.id);
    try {
      await changeOrderStatus(token, restaurantId, order.id, nextStatus);
      setNotice(t('orders.updated', { id: order.id }));
      setReload(value => value + 1); // Read the actual saved value back from PostgreSQL.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'orders.errorUnknown');
    } finally {
      setSavingId(null);
    }
  };

  const dateText = (iso: string) => {
    if (!iso) return '—';
    const time = new Date(iso);
    if (Number.isNaN(time.getTime())) return '—';
    const locale = i18n.resolvedLanguage === 'ka' ? 'ka-GE' : i18n.resolvedLanguage === 'ru' ? 'ru-RU' : 'en-GB';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(time);
  };

  return <div>
    {!hasRestaurant && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Select a restaurant before managing orders.</p>}
    <PageHeader title={t('orders.title')} subtitle={t('orders.subtitle')}
      action={<div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setCreating(true)} disabled={savingId !== null || !hasRestaurant}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40">
          <Plus size={17}/>{t('basket.newOrder')}
        </button>
        <button type="button" onClick={refresh} disabled={loading || savingId !== null || !hasRestaurant}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
        <RefreshCw size={17} className={loading ? 'animate-spin' : ''}/>{t('orders.refresh')}
      </button></div>} />

    <div className="mb-4 flex flex-wrap items-center gap-3">
      <span className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">{t('orders.liveLabel')}</span>
      {!loading && !error && <span className="text-sm text-slate-600">{t('orders.results', { count: orders.length })}</span>}
    </div>

    {notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={18}/>{notice}</p>}
    {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-start gap-2"><AlertCircle size={18} className="mt-0.5 shrink-0"/><span>{localizedError(error)}</span></div>
      <button type="button" onClick={refresh} className="mt-2 font-semibold underline">{t('orders.retry')}</button>
    </div>}

    {paymentError && <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('payments.unavailable')} ({paymentError})</div>}

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4 sm:p-5">
        <label className="relative min-w-[220px] flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder={t('orders.searchPlaceholder')} value={search} onChange={event => setSearch(event.target.value)} />
        </label>
        <select aria-label={t('common.status')} value={status} onChange={event => setStatus(event.target.value as typeof status)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400">
          <option value="all">{t('common.allStatuses')}</option>
          {STATUSES.map(item => <option key={item} value={item}>{t(`statuses.${item}`)}</option>)}
        </select>
      </div>

      {loading ? <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><Loader2 className="animate-spin" size={21}/>{t('orders.loading')}</div>
      : !error && filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">{orders.length === 0 ? t('orders.noOrders') : t('common.noResults')}</div>
      : !error ? <div className="overflow-x-auto"><table className="w-full min-w-[1210px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>
          {['orderId','tableNo','items','amount','status','created'].map(key => <th key={key} className="px-5 py-3">{t(`orders.${key}`)}</th>)}
          <th className="px-5 py-3">{t('orders.changeStatus')}</th>
          <th className="px-5 py-3">{t('payments.title')}</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{filtered.map(order => {
          const next = drafts[order.id] ?? (order.status === 'unknown' ? 'pending' : order.status);
          const isSaving = savingId === order.id;
          const completedPayment = payments?.find(p => p.orderId === order.id && p.status === 'completed');
          const lockedStatus = order.status === 'paid' || order.status === 'cancelled' || order.status === 'unknown';
          const itemsCount = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
          return <tr key={order.id} className="hover:bg-slate-50">
            <td className="px-5 py-4 font-bold text-slate-900">#{order.id}</td>
            <td className="px-5 py-4 text-slate-600">{t('common.table')} {order.tableId}</td>
            <td className="px-5 py-4 text-slate-600">{itemsCount}</td>
            <td className="px-5 py-4 font-semibold text-slate-900">{formatter.format(order.totalAmount)} ₾</td>
            <td className="px-5 py-4"><StatusBadge status={order.status}/></td>
            <td className="px-5 py-4 text-slate-500">{dateText(order.orderDate)}</td>
            <td className="px-5 py-4">{lockedStatus ? <span className="text-xs text-slate-400">—</span> : <div className="flex items-center gap-2">
              <select aria-label={t('orders.changeStatus')} value={next} disabled={savingId !== null}
                onChange={event => setDrafts(current => ({ ...current, [order.id]: event.target.value as EditableOrderStatus }))}
                className="min-w-[125px] rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs outline-none focus:border-blue-400">
                {EDITABLE_STATUSES.map(item => <option key={item} value={item}>{t(`statuses.${item}`)}</option>)}
              </select>
              <button type="button" onClick={() => void save(order)} disabled={!hasRestaurant || savingId !== null || next === order.status}
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                {isSaving ? t('orders.saving') : t('orders.save')}
              </button>
            </div>}</td>
            <td className="px-5 py-4">{completedPayment
              ? <span className="text-xs font-bold text-emerald-700">{t('payments.recorded')} #{completedPayment.id}</span>
              : order.status === 'paid' ? <span className="text-xs font-semibold text-amber-700">{t('payments.unverified')}</span>
              : order.status === 'cancelled' || order.status === 'unknown' ? <span className="text-xs text-slate-400">—</span>
              : <button type="button" disabled={!hasRestaurant || savingId !== null || paymentLoading || payments === null || order.totalAmount <= 0}
                  onClick={() => setPayingOrder(order)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-40">
                  <CreditCard size={14}/>{t('payments.record')}
                </button>}</td>
          </tr>;
        })}</tbody>
      </table></div> : null}
    </section>
    <p className="mt-3 text-xs text-slate-500">{t('orders.tableIdNote')}</p>
    {payingOrder && <RecordPaymentDialog token={token} restaurantId={restaurantId} order={payingOrder} onClose={() => setPayingOrder(null)} onPaid={id => {
      setPayingOrder(null);
      setNotice(t('payments.success', { id }));
      setReload(value => value + 1);
    }}/>} 
    {creating && hasRestaurant && <CreateOrderDialog token={token} restaurantId={restaurantId} onClose={() => setCreating(false)} onCreated={orderId => {
      setCreating(false);
      setStatus('all');
      setSearch('');
      setNotice(t('basket.created', { id: orderId }));
      setReload(value => value + 1);
    }}/>}
  </div>;
}
