import { useTranslation } from 'react-i18next';
import type { OrderStatus, ReservationStatus, TableStatus } from '../types';
import type { LiveOrderStatus } from '../api/orders';

type Status = OrderStatus | ReservationStatus | TableStatus | LiveOrderStatus;
const styles: Record<Status, string> = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  served: 'bg-teal-50 text-teal-700 ring-teal-200',
  ready: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  preparing: 'bg-blue-50 text-blue-700 ring-blue-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  reserved: 'bg-amber-50 text-amber-700 ring-amber-200',
  occupied: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  unknown: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function StatusBadge({ status }: { status: Status }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{t(`statuses.${status}`)}
    </span>
  );
}
