import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ClipboardList, RefreshCw, Table2, CalendarCheck2 } from 'lucide-react';
import { fetchOrders, type LiveOrder } from '../api/orders';
import { fetchTables, type LiveTable } from '../api/tables';
import type { Page } from '../types';
import type { RestaurantRole } from '../auth/restaurantAccess';

type Props = {
  token: string;
  restaurantId: string;
  role: RestaurantRole;
  onNavigate: (page: Page) => void;
};

type Data = {
  orders: LiveOrder[] | null;
  tables: LiveTable[] | null;
  ordersError?: string;
  tablesError?: string;
};

const translations = {
  ka: {
    title: 'თანამშრომლის სამუშაო სივრცე',
    subtitle: 'მიმდინარე რესტორნის შეკვეთები და მაგიდები',
    refresh: 'განახლება', orders: 'სულ შეკვეთები', tables: 'სულ მაგიდები',
    recent: 'ბოლო შეკვეთები', viewOrders: 'შეკვეთების ნახვა',
    viewTables: 'მაგიდების ნახვა', reservations: 'ჯავშნები',
    loading: 'იტვირთება…', noOrders: 'შეკვეთები ჯერ არ არის.',
    unavailable: 'მონაცემები მიუწვდომელია', table: 'მაგიდა',
    status: 'სტატუსი', created: 'თარიღი', order: 'შეკვეთა',
    notAllowed: 'ამ როლისთვის Dashboard-ის მონაცემები არ არის ხელმისაწვდომი.',
  },
  en: {
    title: 'Staff workspace', subtitle: 'Orders and tables for the selected restaurant',
    refresh: 'Refresh', orders: 'Total orders', tables: 'Total tables',
    recent: 'Recent orders', viewOrders: 'View orders',
    viewTables: 'View tables', reservations: 'Reservations',
    loading: 'Loading…', noOrders: 'No orders yet.',
    unavailable: 'Data unavailable', table: 'Table',
    status: 'Status', created: 'Date', order: 'Order',
    notAllowed: 'Dashboard data is not available for this role.',
  },
  ru: {
    title: 'Рабочее место сотрудника', subtitle: 'Заказы и столики выбранного ресторана',
    refresh: 'Обновить', orders: 'Всего заказов', tables: 'Всего столиков',
    recent: 'Последние заказы', viewOrders: 'Просмотреть заказы',
    viewTables: 'Просмотреть столики', reservations: 'Бронирования',
    loading: 'Загрузка…', noOrders: 'Заказов пока нет.',
    unavailable: 'Данные недоступны', table: 'Стол',
    status: 'Статус', created: 'Дата', order: 'Заказ',
    notAllowed: 'Данные панели недоступны для этой роли.',
  },
};

export default function OperationalDashboard({ token, restaurantId, role, onNavigate }: Props) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
  const t = translations[lang as keyof typeof translations] ?? translations.en;
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data>({ orders: null, tables: null });

  // NO financial endpoints are requested by this component.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setData({ orders: null, tables: null });
    if (!restaurantId.trim() || (role !== 'waiter' && role !== 'cashier')) {
      setLoading(false);
      return () => controller.abort();
    }

    void Promise.allSettled([
      fetchOrders(token, restaurantId, controller.signal),
      fetchTables(token, restaurantId, controller.signal),
    ]).then(([ordersResult, tablesResult]) => {
      if (controller.signal.aborted) return;
      setData({
        orders: ordersResult.status === 'fulfilled' ? ordersResult.value : null,
        tables: tablesResult.status === 'fulfilled' ? tablesResult.value : null,
        ordersError: ordersResult.status === 'rejected'
          ? ordersResult.reason instanceof Error ? ordersResult.reason.message : t.unavailable
          : undefined,
        tablesError: tablesResult.status === 'rejected'
          ? tablesResult.reason instanceof Error ? tablesResult.reason.message : t.unavailable
          : undefined,
      });
      setLoading(false);
    });
    return () => controller.abort();
  }, [token, restaurantId, role, revision, t.unavailable]);

  if (role !== 'waiter' && role !== 'cashier') {
    return <div role="alert" className="rounded-xl bg-amber-50 p-5 text-sm text-amber-900">{t.notAllowed}</div>;
  }

  const locale = lang === 'ka' ? 'ka-GE' : lang === 'ru' ? 'ru-RU' : 'en-GB';
  const recent = data.orders?.slice()
    .sort((a, b) => Date.parse(b.orderDate) - Date.parse(a.orderDate))
    .slice(0, 5) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>
        <button type="button" onClick={() => setRevision(n => n + 1)} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>{t.refresh}
        </button>
      </div>

      {(data.ordersError || data.tablesError) && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {[data.ordersError && `${t.orders}: ${data.ordersError}`,
            data.tablesError && `${t.tables}: ${data.tablesError}`].filter(Boolean).join(' · ')}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ClipboardList className="mb-3 text-violet-600" size={22}/>
          <div className="text-xs font-medium text-slate-500">{t.orders}</div>
          <div className="mt-1 text-2xl font-bold">{loading ? '…' : data.orders ? data.orders.length : '—'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Table2 className="mb-3 text-blue-600" size={22}/>
          <div className="text-xs font-medium text-slate-500">{t.tables}</div>
          <div className="mt-1 text-2xl font-bold">{loading ? '…' : data.tables ? data.tables.length : '—'}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={() => onNavigate('orders')} type="button"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
          <ClipboardList size={17}/>{t.viewOrders}<ArrowRight size={16}/>
        </button>
        <button onClick={() => onNavigate('tables')} type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <Table2 size={17}/>{t.viewTables}
        </button>
        {role === 'waiter' && <button onClick={() => onNavigate('reservations')} type="button"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
          <CalendarCheck2 size={17}/>{t.reservations}
        </button>}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-5 py-4 font-semibold text-slate-900">{t.recent}</h2>
        {loading ? <p className="p-6 text-sm text-slate-500">{t.loading}</p>
          : !data.orders ? <p className="p-6 text-sm text-slate-500">{t.unavailable}</p>
          : recent.length === 0 ? <p className="p-6 text-sm text-slate-500">{t.noOrders}</p>
          : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500"><tr>
                <th className="px-5 py-3">{t.order}</th>
                <th className="px-5 py-3">{t.table}</th>
                <th className="px-5 py-3">{t.status}</th>
                <th className="px-5 py-3">{t.created}</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">{recent.map(order => <tr key={order.id}>
                <td className="px-5 py-3 font-semibold">#{order.id}</td>
                <td className="px-5 py-3">{data.tables?.find(table => table.id === order.tableId)?.tableNumber ?? order.tableId}</td>
                <td className="px-5 py-3 capitalize">{String(order.status)}</td>
                <td className="px-5 py-3 text-slate-500">{new Date(order.orderDate).toLocaleString(locale)}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </div>
  );
}
