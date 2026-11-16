import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, Wallet, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LiveOrder } from '../api/orders';
import { getOrderForPayment, getPaymentForOrder, recordManualPayment } from '../api/payments';

type Props = {
  token: string;
  restaurantId: string;
  order: LiveOrder;
  onClose: () => void;
  onPaid: (id: number) => void;
};

const cashLabels = {
  ka: { received: 'მიღებული თანხა', change: 'ხურდა', invalid: 'შეიყვანე სწორი თანხა, მაქსიმუმ ორი ათწილადი ნიშნით.', insufficient: 'მიღებული თანხა გადასახდელ თანხაზე ნაკლებია.' },
  en: { received: 'Cash received', change: 'Change', invalid: 'Enter a valid amount with up to two decimal places.', insufficient: 'Cash received is less than the amount due.' },
  ru: { received: 'Получено наличными', change: 'Сдача', invalid: 'Введите корректную сумму, не более двух знаков после запятой.', insufficient: 'Полученная сумма меньше суммы к оплате.' },
};

function parseCash(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export default function RecordPaymentDialog(props: Props) {
  return <PaymentForm key={JSON.stringify([props.token, props.restaurantId, props.order.id])} {...props}/>;
}

function PaymentForm({ token, restaurantId, order, onClose, onPaid }: Props) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
  const labels = cashLabels[language as keyof typeof cashLabels] ?? cashLabels.en;
  const [cashReceived, setCashReceived] = useState('');
  const submitted = useRef(false);
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [confirmed, setConfirmed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [serverAmount, setServerAmount] = useState<number | null>(null);
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setChecking(true);
    setServerAmount(null);
    setConfirmed(false);
    setBlockReason(null);
    setError(null);
    void Promise.all([
      getOrderForPayment(token, restaurantId, order.id, controller.signal),
      getPaymentForOrder(token, restaurantId, order.id, controller.signal),
    ]).then(([fresh, payment]) => {
      if (controller.signal.aborted) return;
      if (payment?.status === 'completed') {
        setBlockReason(t('payments.alreadyRecorded'));
      } else if (fresh.status === 'cancelled' || fresh.status === '6') {
        setBlockReason(t('payments.cancelled'));
      } else if (fresh.status === 'paid' || fresh.status === '5') {
        setBlockReason(t('payments.alreadyMarkedPaid'));
      } else if (!Number.isFinite(fresh.totalAmount) || fresh.totalAmount <= 0 ||
        !Number.isSafeInteger(Math.round(fresh.totalAmount * 100)) ||
        Math.abs(fresh.totalAmount * 100 - Math.round(fresh.totalAmount * 100)) > 0.000001) {
        setBlockReason(t('payments.invalidAmount'));
      } else if (!['pending', 'preparing', 'ready', 'served', '1', '2', '3', '4'].includes(fresh.status)) {
        setBlockReason(t('payments.invalidAmount'));
      } else {
        setServerAmount(fresh.totalAmount);
      }
    }).catch(e => {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    }).finally(() => {
      if (!controller.signal.aborted) setChecking(false);
    });
    return () => controller.abort();
  }, [order.id, token, restaurantId, t]);

  const dueCents = serverAmount === null ? null : Math.round(serverAmount * 100);
  const receivedCents = parseCash(cashReceived);
  const cashValid = dueCents !== null && receivedCents !== null && receivedCents >= dueCents;
  const cashError = cashReceived.trim() === '' ? null : receivedCents === null
    ? labels.invalid : dueCents !== null && receivedCents < dueCents ? labels.insufficient : null;

  const pay = async () => {
    if (submitted.current || sending || checking || error || blockReason || uncertain || !confirmed || serverAmount === null || (method === 'cash' && !cashValid)) return;
    if (!window.confirm(t('payments.confirmSubmit', { id: order.id, amount: serverAmount.toFixed(2) }))) return;
    submitted.current = true;
    setError(null);
    setSending(true);
    try {
      const payment = await recordManualPayment(token, restaurantId, order.id, serverAmount, method);
      onPaid(payment.orderId);
    } catch (e) {
      // Server might have committed even if the response was lost.
      // Never retry automatically; re-check the order and payments in Orders.
      setError(e instanceof Error ? e.message : String(e));
      setUncertain(true);
    } finally {
      setSending(false);
    }
  };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !sending) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title" className="max-h-[90dvh] overflow-y-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><h2 id="payment-dialog-title" className="text-xl font-bold text-slate-900">{t('payments.title')} — #{order.id}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('payments.subtitle')}</p></div>
        <button type="button" aria-label={t('payments.close')} onClick={onClose} disabled={sending} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19}/></button>
      </div>
      <div className="mb-4 rounded-xl bg-blue-50 p-4">
        <div className="text-xs font-semibold text-blue-700">{t('payments.amount')}</div>
        <div className="mt-1 text-2xl font-bold text-blue-950">{serverAmount === null ? '—' : serverAmount.toFixed(2)} ₾</div>
      </div>
      {checking && <p className="mb-4 flex items-center gap-2 text-sm text-slate-600"><Loader2 size={17} className="animate-spin"/>{t('payments.checking')}</p>}
      {blockReason && <p role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{blockReason}</p>}
      {error && <p role="alert" className="mb-4 flex gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><AlertTriangle size={17} className="shrink-0"/>{error}</p>}
      {uncertain && <p role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">{t('payments.uncertain')}</p>}
      <div className="mb-4 space-y-2">
        <label className="block text-sm font-semibold text-slate-700">{t('payments.method')}</label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => { setMethod('cash'); setConfirmed(false); }} disabled={checking || sending || !!blockReason || uncertain} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${method === 'cash' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}><Wallet size={17}/>{t('payments.cash')}</button>
          <button type="button" onClick={() => { setMethod('card'); setConfirmed(false); }} disabled={checking || sending || !!blockReason || uncertain} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${method === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}><CreditCard size={17}/>{t('payments.card')}</button>
        </div>
      </div>
      {method === 'cash' && <div className="mb-4 space-y-2">
        <label htmlFor="cash-received" className="block text-sm font-semibold text-slate-700">{labels.received} (₾)</label>
        <input id="cash-received" type="text" inputMode="decimal" autoComplete="off" maxLength={15}
          value={cashReceived} onChange={e => { setCashReceived(e.target.value); setConfirmed(false); }}
          disabled={checking || sending || !!blockReason || uncertain || !!error}
          aria-invalid={!!cashError} aria-describedby={cashError ? 'cash-error' : undefined}
          className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-blue-500"/>
        {cashError && <p id="cash-error" role="alert" className="text-sm text-rose-700">{cashError}</p>}
        <p role="status" className="rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-900">
          {labels.change}: {cashValid ? ((receivedCents! - dueCents!) / 100).toFixed(2) : '—'} ₾
        </p>
      </div>}
      <div className="mb-5 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{t('payments.manualOnly')}</div>
      <label className="mb-5 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
        <input type="checkbox" className="mt-1" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={checking || sending || !!blockReason || uncertain}/>
        <span>{method === 'card' ? t('payments.confirmCard') : t('payments.confirmCash')}</span>
      </label>
      <button type="button" onClick={() => void pay()} disabled={!confirmed || checking || sending || !!error || !!blockReason || uncertain || serverAmount === null || (method === 'cash' && !cashValid)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
        {sending ? <Loader2 size={17} className="animate-spin"/> : <CheckCircle2 size={17}/>} {t('payments.record')}
      </button>
    </section>
  </div>;
}
