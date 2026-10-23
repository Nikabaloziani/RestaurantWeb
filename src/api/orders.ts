/** RestaurantAPI: Controllers/OrderController.cs, OrderDTO.cs, OrderStatus.cs */
import { apiBaseUrl } from './client';

export type LiveOrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'paid'
  | 'cancelled'
  | 'unknown';

export type LiveOrder = {
  id: number;
  tableId: number;
  userId: string;
  orderDate: string;
  status: LiveOrderStatus;
  totalAmount: number;
  orderItems: Array<{
    id: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
};

// Matches RestaurantDATA/Entities/OrderStatus.cs exactly.
export const ORDER_STATUS_CODES = {
  pending: 1,
  preparing: 2,
  ready: 3,
  served: 4,
  paid: 5,
  cancelled: 6,
} as const;

export type EditableOrderStatus = keyof typeof ORDER_STATUS_CODES;

const orderStatusByNumber: Record<number, EditableOrderStatus> = {
  1: 'pending', 2: 'preparing', 3: 'ready',
  4: 'served', 5: 'paid', 6: 'cancelled',
};

function getApiPrefix(): string {
  // Local Vite proxy handles /api; production needs backend CORS enabled.
  if (import.meta.env.DEV) return '';
  if (!apiBaseUrl) throw new Error('VITE_API_URL is missing in the deployment environment.');
  return apiBaseUrl.replace(/\/$/, '');
}

function normalizeStatus(input: unknown): LiveOrderStatus {
  if (typeof input === 'number') return orderStatusByNumber[input] ?? 'unknown';
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower in ORDER_STATUS_CODES) return lower as EditableOrderStatus;
    const number = Number(input);
    if (Number.isInteger(number)) return orderStatusByNumber[number] ?? 'unknown';
  }
  return 'unknown';
}

type ApiOrder = {
  id?: number;
  tableId?: number;
  userId?: string;
  orderDate?: string;
  status?: string | number;
  totalAmount?: number;
  orderItems?: Array<{
    id?: number;
    productId?: number;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
  }>;
};

function parseOrder(value: ApiOrder): LiveOrder {
  if (typeof value.id !== 'number' || typeof value.tableId !== 'number') {
    throw new Error('API returned an unexpected order format.');
  }
  return {
    id: value.id,
    tableId: value.tableId,
    userId: value.userId ?? '',
    orderDate: value.orderDate ?? '',
    status: normalizeStatus(value.status),
    totalAmount: Number(value.totalAmount ?? 0),
    orderItems: (value.orderItems ?? []).map(item => ({
      id: Number(item.id ?? 0),
      productId: Number(item.productId ?? 0),
      productName: item.productName ?? '',
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
    })),
  };
}

async function request(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  const response = await fetch(`${getApiPrefix()}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error('orders.errorUnauthorized');
    if (response.status === 403) throw new Error('orders.errorForbidden');
    if (response.status === 404) throw new Error('orders.errorNotFound');
    throw new Error(`orders.errorHttp:${response.status}`);
  }
  return response;
}

export async function fetchOrders(token: string, signal?: AbortSignal): Promise<LiveOrder[]> {
  const response = await request('/api/Orders', token, { signal });
  const result: unknown = await response.json();
  if (!Array.isArray(result)) throw new Error('orders.errorFormat');
  return result.map(item => parseOrder(item as ApiOrder));
}

export async function changeOrderStatus(
  token: string, orderId: number, status: EditableOrderStatus,
): Promise<void> {
  // ASP.NET Core binds OrderStatus enum numerically unless JsonStringEnumConverter is configured.
  await request(`/api/Orders/${orderId}/status`, token, {
    method: 'PATCH',
    body: JSON.stringify({ status: ORDER_STATUS_CODES[status] }),
  });
}
