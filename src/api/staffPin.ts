import { apiRequest } from './client';

export type MyPinStatus = { hasPin: boolean; isEnabled: boolean; updatedAt: string | null };

function pinPath(restaurantId: string): string {
  if (!restaurantId.trim()) throw new Error('Restaurant is required.');
  return `/api/restaurants/${encodeURIComponent(restaurantId)}/staff-pin/me`;
}

function readStatus(value: MyPinStatus): MyPinStatus {
  if (!value || typeof value.hasPin !== 'boolean' || typeof value.isEnabled !== 'boolean') {
    throw new Error('Invalid PIN status response.');
  }
  return value;
}

export async function getMyPinStatus(token: string, restaurantId: string, signal?: AbortSignal) {
  return readStatus(await apiRequest<MyPinStatus>(pinPath(restaurantId), token, { signal }));
}

export async function setMyPin(token: string, restaurantId: string,
  currentPassword: string, newPin: string, signal?: AbortSignal) {
  return readStatus(await apiRequest<MyPinStatus>(pinPath(restaurantId), token, {
    method: 'PUT', body: JSON.stringify({ currentPassword, newPin }), signal,
  }));
}

export function disableMyPin(token: string, restaurantId: string,
  currentPassword: string, signal?: AbortSignal) {
  return apiRequest<void>(`${pinPath(restaurantId)}/disable`, token, {
    method: 'POST', body: JSON.stringify({ currentPassword }), signal,
  });
}

// Mirrors the current backend blocklist; the server remains authoritative.
export function isCommonPin(pin: string): boolean {
  return /^(\d)\1{5}$/.test(pin) || [
    '123456', '654321', '012345', '987654', '111222',
    '121212', '123123', '112233', '000123',
  ].includes(pin);
}
