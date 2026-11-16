/** Manual cash / external-terminal card payment recording.
 * Requires the patched backend. Never treats this as an online card charge.
 */
import { apiBaseUrl } from './client';
import { orderPath } from './orders';

export type PaymentRecord = {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: 'completed' | 'pending' | 'failed' | 'unknown';
  paymentDate: string;
};

export function paymentPath(restaurantId: string): string {
  if (!restaurantId.trim()) throw new Error('Select a restaurant first.');
  return `/api/restaurants/${encodeURIComponent(restaurantId)}/payments`;
}

function apiRoot(): string {
  return apiBaseUrl;
}

async function request(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${apiRoot()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
}

function parsePayment(value: unknown): PaymentRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid payment response');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'number' || typeof v.orderId !== 'number' ||
      typeof v.amount !== 'number' || !Number.isFinite(v.amount)) {
    throw new Error('Invalid payment response');
  }
  const rawStatus = String(v.status ?? '').toLowerCase();
  const status = rawStatus === 'completed' || rawStatus === '2' ? 'completed'
    : rawStatus === 'pending' || rawStatus === '1' ? 'pending'
    : rawStatus === 'failed' || rawStatus === '3' ? 'failed' : 'unknown';
  return {
    id: v.id, orderId: v.orderId, amount: v.amount,
    method: String(v.method ?? ''), status,
    paymentDate: String(v.paymentDate ?? ''),
  };
}

export async function fetchPaymentRecords(token: string, restaurantId: string, signal?: AbortSignal): Promise<PaymentRecord[]> {
  const response = await request(paymentPath(restaurantId), token, { signal });
  if (!response.ok) throw new Error(`Payments API: HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('Invalid payments list response');
  return payload.map(parsePayment);
}

export async function getPaymentForOrder(
  token: string, restaurantId: string, orderId: number, signal?: AbortSignal,
): Promise<PaymentRecord | null> {
  const response = await request(`${paymentPath(restaurantId)}/order/${orderId}`, token, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Payment check failed: HTTP ${response.status}`);
  return parsePayment(await response.json());
}

export type OrderPaymentCheck = { id: number; status: string; totalAmount: number };
export async function getOrderForPayment(
  token: string, restaurantId: string, orderId: number, signal?: AbortSignal,
): Promise<OrderPaymentCheck> {
  const response = await request(`${orderPath(restaurantId)}/${orderId}`, token, { signal });
  if (!response.ok) throw new Error(`Order check failed: HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Invalid order response');
  const row = payload as Record<string, unknown>;
  if (typeof row.id !== 'number' || typeof row.totalAmount !== 'number') throw new Error('Invalid order response');
  const status = String(row.status ?? '').toLowerCase();
  return { id: row.id, status, totalAmount: row.totalAmount };
}

export async function recordManualPayment(
  token: string, restaurantId: string, orderId: number, amount: number, method: 'cash' | 'card',
): Promise<PaymentRecord> {
  // Cash=1 and Card=2 in RestaurantDATA.Entities.PaymentMethod.
  const response = await request(paymentPath(restaurantId), token, {
    method: 'POST',
    body: JSON.stringify({ orderId, amount, method: method === 'cash' ? 1 : 2 }),
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.text();
      if (body && body.length < 400 && !body.includes('<')) message += `: ${body}`;
    } catch { /* Ignore unreadable error body. */ }
    throw new Error(message);
  }
  return parsePayment(await response.json());
}
