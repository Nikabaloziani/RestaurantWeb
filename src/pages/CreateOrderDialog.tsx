import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, CheckCircle2, Loader2, Minus, Plus, RefreshCw,
  Search, ShoppingCart, Trash2, UtensilsCrossed, X,
} from 'lucide-react';
import { fetchCatalog, type LiveCategory, type LiveProduct } from '../api/catalog';
import { fetchTables, type LiveTable } from '../api/tables';
import {
  addBasketItem, changeBasketQuantity, clearBasket, fetchBasket,
  placeBasketOrder, removeBasketItem, type BasketItem,
} from '../api/basket';

type Props = {
  token: string;
  onClose: () => void;
  onCreated: (orderId: number) => void;
};

const priceFormat = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (price: number) => `${priceFormat.format(price)} ₾`;

export default function CreateOrderDialog({ token, onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<LiveProduct[]>([]);
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [tables, setTables] = useState<LiveTable[]>([]);
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [tableId, setTableId] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<number>(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const operationLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    // Never show stale basket/catalog if a reload fails.
    setBasket([]);
    setProducts([]);
    setTables([]);
    void Promise.all([
      fetchCatalog(token, controller.signal),
      fetchTables(token, controller.signal),
      fetchBasket(token, controller.signal),
    ]).then(([catalog, liveTables, items]) => {
      if (controller.signal.aborted) return;
      setProducts(catalog.products);
      setCategories(catalog.categories);
      setTables(liveTables);
      setBasket(items);
      setTableId(previous => liveTables.some(table => table.id === previous) ? previous : 0);
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'basket.errorUnknown');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [token, reload]);

  const visibleProducts = useMemo(() => products.filter(product =>
    (!categoryId || product.categoryId === categoryId) &&
    `${product.name} ${product.id}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  ), [products, categoryId, query]);
  const selectedTable = tables.find(table => table.id === tableId);
  const itemCount = basket.reduce((total, item) => total + item.quantity, 0);
  const total = basket.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const errorText = (raw: string): string => {
    if (raw.startsWith('basket.errorHttp:')) return t('basket.errorHttp', { status: raw.split(':')[1] });
    if (raw.startsWith('basket.') || raw.startsWith('catalog.') || raw.startsWith('tables.')) return t(raw);
    return raw;
  };

  const refreshBasket = async () => {
    const actual = await fetchBasket(token);
    setBasket(actual);
  };

  // Only one write at a time: basket is server-side and shared by this Admin account.
  const mutate = async (operation: () => Promise<void>) => {
    if (operationLock.current) return;
    operationLock.current = true;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      await operation();
      await refreshBasket();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'basket.errorUnknown');
      // A write may have reached the server despite a lost response.
      try { await refreshBasket(); } catch { setWarning('basket.uncertainBasket'); }
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  };

  const changeQuantity = (item: BasketItem, difference: number) => {
    const next = item.quantity + difference;
    if (next <= 0) {
      void mutate(() => removeBasketItem(token, item.id));
    } else if (next <= 100) {
      void mutate(() => changeBasketQuantity(token, item.id, next));
    }
  };

  const clearAll = () => {
    if (!basket.length || !window.confirm(t('basket.confirmClear'))) return;
    void mutate(() => clearBasket(token));
  };

  const submitOrder = async () => {
    if (operationLock.current || loading || busy || !selectedTable || !basket.length) return;
    if (!window.confirm(t('basket.confirmOrder', {
      table: selectedTable.tableNumber, count: itemCount, total: money(total),
    }))) return;
    operationLock.current = true;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const orderId = await placeBasketOrder(token, selectedTable.id);
      onCreated(orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'basket.errorUnknown');
      // Could already exist if API response was lost AFTER it created the order.
      setWarning('basket.uncertainOrder');
      try { await refreshBasket(); } catch { /* Still unsafe to retry automatically. */ }
    } finally {
      operationLock.current = false;
      setBusy(false);
    }
  };

  const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
  return (
    <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-2 sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="new-order-title"
        className="flex max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-[#f6f8fc] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div>
            <h2 id="new-order-title" className="text-lg font-bold text-slate-900 sm:text-xl">{t('basket.title')}</h2>
            <p className="mt-1 text-xs text-slate-500">{t('basket.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" disabled={busy || loading} onClick={() => setReload(v => v + 1)}
              className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40" title={t('basket.refresh')} aria-label={t('basket.refresh')}>
              <RefreshCw size={18} />
            </button>
            <button type="button" disabled={busy} onClick={onClose} title={t('basket.close')} aria-label={t('basket.close')}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 disabled:opacity-40"><X size={21}/></button>
          </div>
        </header>

        <div className="overflow-y-auto p-4 sm:p-6">
          {error && <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{errorText(error)}</div>}
          {warning && <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0"/>{t(warning)}</div>}
          {loading ? <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={20}/>{t('basket.loading')}</div>
          : !products.length && !categories.length && !tables.length && error ? null
          : <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
            <div className="min-w-0 space-y-4">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-blue-100 p-2 text-blue-700"><UtensilsCrossed size={18}/></span>
                <h3 className="text-base font-bold text-slate-900">{t('basket.menu')}</h3>
                <span className="ml-auto text-xs text-slate-500">{t('basket.productCount', { count: visibleProducts.length })}</span>
              </div>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input value={query} onChange={event => setQuery(event.target.value)}
                  placeholder={t('basket.search')} aria-label={t('basket.search')}
                  className={`${field} pl-10`}/>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCategoryId(0)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${categoryId === 0 ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{t('basket.allCategories')}</button>
                {categories.map(cat => <button type="button" key={cat.id} onClick={() => setCategoryId(cat.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold ${categoryId === cat.id ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>{cat.name}</button>)}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {visibleProducts.map(product => <article key={product.id} className="flex min-w-0 flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UtensilsCrossed size={18}/></div>
                    <div className="min-w-0">
                      <h4 className="break-words text-sm font-semibold text-slate-900">{product.name}</h4>
                      <p className="mt-1 text-xs text-slate-500">{product.categoryName ?? categories.find(cat=>cat.id===product.categoryId)?.name ?? '—'}</p>
                      <p className="mt-2 text-sm font-bold text-slate-900">{money(product.price)}</p>
                    </div>
                  </div>
                  <button type="button" disabled={busy || loading} onClick={() => void mutate(() => addBasketItem(token, product.id, 1))}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-40">
                    <Plus size={16}/>{t('basket.add')}
                  </button>
                </article>)}
              </div>
              {visibleProducts.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">{t('basket.noProducts')}</div>}
            </div>

            <aside className="min-w-0 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <label htmlFor="order-table" className="mb-2 block text-sm font-bold text-slate-900">{t('basket.selectTable')}</label>
                <select id="order-table" className={field} disabled={busy || loading} value={tableId}
                  onChange={event => setTableId(Number(event.target.value))}>
                  <option value={0}>{t('basket.chooseTable')}</option>
                  {tables.map(table => <option key={table.id} value={table.id}>
                    {t('basket.tableOption', { number: table.tableNumber, seats: table.capacity })}
                  </option>)}
                </select>
                {tables.length === 0 && <p className="mt-2 text-xs text-amber-700">{t('basket.noTables')}</p>}
                {selectedTable?.status === 'unknown' && <p className="mt-2 text-xs text-amber-700">{t('basket.unknownOccupancy')}</p>}
                <p className="mt-3 text-xs leading-5 text-slate-500">{t('basket.tableNote')}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><ShoppingCart size={19} className="text-blue-600"/><h3 className="text-base font-bold text-slate-900">{t('basket.cart')}</h3></div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{itemCount}</span>
                </div>
                <p className="mb-4 rounded-lg bg-blue-50 p-3 text-xs leading-5 text-blue-800">{t('basket.accountBasketNote')}</p>
                <div className="space-y-3">
                  {basket.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <div className="min-w-[120px] flex-1">
                      <p className="break-words text-sm font-semibold text-slate-900">{item.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{money(item.unitPrice)} × {item.quantity}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-800">{money(item.unitPrice * item.quantity)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={busy} onClick={() => changeQuantity(item, -1)} title={t('basket.decrease')} aria-label={t('basket.decrease')}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Minus size={15}/></button>
                      <span className="min-w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <button type="button" disabled={busy || item.quantity >= 100} onClick={() => changeQuantity(item, 1)} title={t('basket.increase')} aria-label={t('basket.increase')}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-40"><Plus size={15}/></button>
                      <button type="button" disabled={busy} onClick={() => void mutate(() => removeBasketItem(token, item.id))} title={t('basket.remove')} aria-label={t('basket.remove')}
                        className="ml-1 rounded-lg border border-rose-100 p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-40"><Trash2 size={15}/></button>
                    </div>
                  </div>)}
                  {basket.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-7 text-center text-sm text-slate-500">{t('basket.empty')}</div>}
                </div>
                {basket.length > 0 && <button type="button" disabled={busy} onClick={clearAll}
                  className="mt-3 text-xs font-semibold text-rose-600 hover:underline disabled:opacity-40">{t('basket.clear')}</button>}
                <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-sm font-medium text-slate-600">{t('basket.total')}</span>
                  <span className="text-xl font-extrabold text-slate-900">{money(total)}</span>
                </div>
                <button type="button" disabled={busy || !basket.length || !selectedTable || Boolean(warning)}
                  onClick={() => void submitOrder()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {busy ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle2 size={18}/>}{t('basket.placeOrder')}
                </button>
              </div>
            </aside>
          </div>}
        </div>
      </section>
    </div>
  );
}
