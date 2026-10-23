/** Live REST contract: RestaurantAPI/BasketController, OrdersController.
 * Basket is scoped to the logged-in user, NOT a particular table.
 */
import { apiBaseUrl } from './client';

export type BasketItem = {
  id: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
};

const apiPrefix = (): string => {
  if (import.meta.env.DEV) return '';
  if (!apiBaseUrl) throw new Error('basket.errorMissingUrl');
  return apiBaseUrl.replace(/\/+$/, '');
};

async function callApi(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${apiPrefix()}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('basket.errorNetwork');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('basket.errorUnauthorized');
    if (response.status === 403) throw new Error('basket.errorForbidden');
    if (response.status === 404) throw new Error('basket.errorNotFound');
    if (response.status === 400) throw new Error('basket.errorBadRequest');
    if (response.status === 409) throw new Error('basket.errorConflict');
    throw new Error(`basket.errorHttp:${response.status}`);
  }
  return response;
}

const obj = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || !value || Array.isArray(value)) throw new Error('basket.errorFormat');
  return value as Record<string, unknown>;
};

function parseBasketItem(value: unknown): BasketItem {
  const item = obj(value);
  if (
    typeof item.id !== 'number' || !Number.isInteger(item.id) ||
    typeof item.productId !== 'number' || !Number.isInteger(item.productId) ||
    typeof item.productName !== 'string' ||
    typeof item.unitPrice !== 'number' || !Number.isFinite(item.unitPrice) ||
    typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1
  ) throw new Error('basket.errorFormat');
  return {
    id: item.id,
    productId: item.productId,
    productName: item.productName,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    totalPrice: item.unitPrice * item.quantity,
  };
}

export async function fetchBasket(token: string, signal?: AbortSignal): Promise<BasketItem[]> {
  const response = await callApi('/api/Basket', token, { signal });
  const value: unknown = await response.json();
  if (!Array.isArray(value)) throw new Error('basket.errorFormat');
  return value.map(parseBasketItem).sort((a, b) => a.id - b.id);
}

export async function addBasketItem(token: string, productId: number, quantity = 1): Promise<void> {
  if (!Number.isInteger(productId) || productId < 1 || !Number.isInteger(quantity) || quantity < 1 || quantity > 100)
    throw new Error('basket.errorQuantity');
  await callApi('/api/Basket', token, {
    method: 'POST', body: JSON.stringify({ productId, quantity }),
  });
}

export async function changeBasketQuantity(token: string, basketItemId: number, quantity: number): Promise<void> {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('basket.errorQuantity');
  await callApi(`/api/Basket/${basketItemId}`, token, {
    method: 'PUT', body: JSON.stringify({ quantity }),
  });
}

export async function removeBasketItem(token: string, basketItemId: number): Promise<void> {
  await callApi(`/api/Basket/${basketItemId}`, token, { method: 'DELETE' });
}

export async function clearBasket(token: string): Promise<void> {
  // Explicit clearing is destructive; only invoked after user confirms.
  await callApi('/api/Basket/clear', token, { method: 'DELETE' });
}

/** OrderService creates the order from ALL current basket items, then clears the user's basket.
 * On a lost/failed response, creation MAY have succeeded: never auto-retry POST.
 */
export async function placeBasketOrder(token: string, tableId: number): Promise<number> {
  if (!Number.isInteger(tableId) || tableId <= 0) throw new Error('basket.errorSelectTable');
  const response = await callApi('/api/Orders', token, {
    method: 'POST', body: JSON.stringify({ tableId }),
  });
  const value: unknown = await response.json();
  const order = obj(value);
  if (typeof order.id !== 'number' || !Number.isInteger(order.id)) throw new Error('basket.errorOrderResponse');
  return order.id;
}
