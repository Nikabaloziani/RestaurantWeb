/**
 * RestaurantAPI ReportsController / PaymentsController.
 * No demo values: missing endpoints/errors remain unavailable, never become zero.
 * Reports summary is all-time; chart data is grouped from actual Completed payments.
 */
import { useEffect, useState } from 'react';
import { apiBaseUrl } from './client';
import { fetchOrders, type LiveOrder } from './orders';
import { fetchTables, type LiveTable } from './tables';

export type ReportSummary = {
  totalRevenue: number;
  totalOrders: number;
  totalReservations: number;
  activeOrders: number;
};
export type TopProduct = {
  productName: string;
  totalSoldQuantity: number;
  totalRevenue: number;
};
export type LivePayment = {
  id: number;
  orderId: number;
  amount: number;
  paymentDate: string;
  status: 'completed' | 'pending' | 'failed' | 'unknown';
};
export type InsightKey = 'summary' | 'orders' | 'payments' | 'topProducts' | 'tables';
export type InsightSnapshot = {
  summary: ReportSummary | null;
  orders: LiveOrder[] | null;
  payments: LivePayment[] | null;
  topProducts: TopProduct[] | null;
  tables: LiveTable[] | null;
  errors: Partial<Record<InsightKey, string>>;
};

function tenantPath(restaurantId: string, resource: 'reports' | 'payments'): string {
  if (!restaurantId.trim()) throw new Error('Select a restaurant first.');
  return `/api/restaurants/${encodeURIComponent(restaurantId)}/${resource}`;
}

function prefix(): string {
  if (import.meta.env.DEV) return '';
  if (!apiBaseUrl) throw new Error('VITE_API_URL is missing');
  return apiBaseUrl.replace(/\/+$/, '');
}

async function getJson(path: string, token: string, signal: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${prefix()}${path}`, {
      signal,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('Network error');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Session expired (401)');
    if (response.status === 403) throw new Error('Access denied (403)');
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Unexpected API response');
  }
  return value as Record<string, unknown>;
}
function numeric(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Unexpected numeric value from API');
  }
  return value;
}

async function fetchSummary(token: string, restaurantId: string, signal: AbortSignal): Promise<ReportSummary> {
  const data = record(await getJson(`${tenantPath(restaurantId, 'reports')}/summary`, token, signal));
  return {
    totalRevenue: numeric(data.totalRevenue),
    totalOrders: numeric(data.totalOrders),
    totalReservations: numeric(data.totalReservations),
    activeOrders: numeric(data.activeOrders),
  };
}

async function fetchTopProducts(token: string, restaurantId: string, signal: AbortSignal): Promise<TopProduct[]> {
  const data = await getJson(`${tenantPath(restaurantId, 'reports')}/top-products?count=5`, token, signal);
  if (!Array.isArray(data)) throw new Error('Unexpected top-products response');
  return data.map((value: unknown) => {
    const row = record(value);
    if (typeof row.productName !== 'string') throw new Error('Unexpected top-product name');
    return {
      productName: row.productName,
      totalSoldQuantity: numeric(row.totalSoldQuantity),
      totalRevenue: numeric(row.totalRevenue),
    };
  });
}

function statusOf(value: unknown): LivePayment['status'] {
  if (value === 2 || (typeof value === 'string' && /^(2|completed)$/i.test(value))) return 'completed';
  if (value === 1 || (typeof value === 'string' && /^(1|pending)$/i.test(value))) return 'pending';
  if (value === 3 || (typeof value === 'string' && /^(3|failed)$/i.test(value))) return 'failed';
  return 'unknown';
}
async function fetchPayments(token: string, restaurantId: string, signal: AbortSignal): Promise<LivePayment[]> {
  const data = await getJson(tenantPath(restaurantId, 'payments'), token, signal);
  if (!Array.isArray(data)) throw new Error('Unexpected payments response');
  return data.map((value: unknown) => {
    const row = record(value);
    if (typeof row.paymentDate !== 'string' || !Number.isFinite(Date.parse(row.paymentDate))) {
      throw new Error('Unexpected payment date');
    }
    return {
      id: numeric(row.id),
      orderId: numeric(row.orderId),
      amount: numeric(row.amount),
      paymentDate: row.paymentDate,
      status: statusOf(row.status),
    };
  });
}

export function useInsights(token: string, withTables = false, restaurantId = '') {
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<InsightSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);
    setSnapshot(null);

    if (!restaurantId.trim()) {
      setSnapshot({
        summary: null, orders: null, payments: null, topProducts: null, tables: null,
        errors: { summary: 'Select a restaurant first.' },
      });
      setLoading(false);
      return () => controller.abort();
    }

    const tasks: Array<[InsightKey, Promise<unknown>]> = [
      ['summary', fetchSummary(token, restaurantId, signal)],
      ['orders', fetchOrders(token, restaurantId, signal)],
      ['payments', fetchPayments(token, restaurantId, signal)],
      ['topProducts', fetchTopProducts(token, restaurantId, signal)],
    ];
    if (withTables) tasks.push(['tables', fetchTables(token, restaurantId, signal)]);

    void Promise.allSettled(tasks.map(([, task]) => task)).then(results => {
      if (signal.aborted) return;
      const next: InsightSnapshot = {
        summary: null, orders: null, payments: null, topProducts: null, tables: null, errors: {},
      };
      results.forEach((result, index) => {
        const key = tasks[index][0];
        if (result.status === 'fulfilled') {
          // All values are validated by their respective fetchers.
          if (key === 'summary') next.summary = result.value as ReportSummary;
          if (key === 'orders') next.orders = result.value as LiveOrder[];
          if (key === 'payments') next.payments = result.value as LivePayment[];
          if (key === 'topProducts') next.topProducts = result.value as TopProduct[];
          if (key === 'tables') next.tables = result.value as LiveTable[];
        } else {
          next.errors[key] = result.reason instanceof Error ? result.reason.message : 'Unexpected error';
        }
      });
      setSnapshot(next);
      setLoading(false);
    });
    return () => controller.abort();
  }, [token, withTables, restaurantId, revision]);

  return { snapshot, loading, refresh: () => setRevision(value => value + 1) };
}

export type RangeDays = 7 | 30 | 90;
export type PeriodPoint = { label: string; revenue: number; orders: number; start: number; end: number };

// Buckets are local-calendar-day intervals. One bucket per day (7d), 5 days (30d), 10 days (90d).
export function makePeriod(
  days: RangeDays,
  locale: string,
  payments: LivePayment[] | null,
  orders: LiveOrder[] | null,
  now = new Date(),
): PeriodPoint[] {
  const bucketSize = days === 7 ? 1 : days === 30 ? 5 : 10;
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const first = new Date(midnight);
  first.setDate(first.getDate() - (days - 1));
  const shortDate = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
  const points: PeriodPoint[] = [];

  for (let offset = 0; offset < days; offset += bucketSize) {
    const start = new Date(first);
    start.setDate(start.getDate() + offset);
    const end = new Date(start);
    end.setDate(end.getDate() + Math.min(bucketSize, days - offset));
    const lastDay = new Date(end);
    lastDay.setDate(lastDay.getDate() - 1);
    points.push({
      label: bucketSize === 1 ? shortDate.format(start) : `${shortDate.format(start)}–${shortDate.format(lastDay)}`,
      start: start.getTime(), end: end.getTime(), revenue: 0, orders: 0,
    });
  }
  if (payments) {
    payments.forEach(payment => {
      if (payment.status !== 'completed') return;
      const timestamp = Date.parse(payment.paymentDate);
      const point = points.find(p => timestamp >= p.start && timestamp < p.end);
      if (point) point.revenue += payment.amount;
    });
  }
  if (orders) {
    orders.forEach(order => {
      const timestamp = Date.parse(order.orderDate);
      const point = points.find(p => timestamp >= p.start && timestamp < p.end);
      if (point) point.orders += 1;
    });
  }
  return points;
}

export function formatGel(amount: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(amount)} ₾`;
}
