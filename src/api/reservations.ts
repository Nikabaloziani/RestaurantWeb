/** RestaurantAPI ReservationsController integration (ASP.NET Core / PostgreSQL).
 * Uses the same local Vite proxy as Auth, Orders and Tables. No demo data.
 */
import { apiBaseUrl } from './client';

export type ReservationStatus = 'confirmed' | 'cancelled' | 'unknown';

export type LiveReservation = {
  id: number;
  tableId: number;
  tableNumber: number;
  userId: string;
  customerName: string;
  customerEmail: string | null;
  guestName: string | null;
  guestPhone: string | null;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  guestCount: number;
  note: string | null;
  status: ReservationStatus;
  createdAt: string;
};

export type ReservationInput = {
  tableId: number;
  startTime: string; // DateTimeOffset ISO-8601 with offset/UTC
  guestCount: number;
  durationMinutes: number;
  note: string | null;
  guestName: string;
  guestPhone: string;
};

export type AvailableTable = {
  id: number;
  tableNumber: number;
  capacity: number;
};

type RawReservation = Record<string, unknown>;

function prefix(): string {
  if (import.meta.env.DEV) return '';
  if (!apiBaseUrl) throw new Error('reservations.errorMissingUrl');
  return apiBaseUrl.replace(/\/+$/, '');
}

function number(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error('reservations.errorFormat');
}

function string(value: unknown): string {
  if (typeof value === 'string') return value;
  throw new Error('reservations.errorFormat');
}

function parseStatus(value: unknown): ReservationStatus {
  if (value === 1 || value === '1' || (typeof value === 'string' && value.toLowerCase() === 'confirmed')) return 'confirmed';
  if (value === 2 || value === '2' || (typeof value === 'string' && value.toLowerCase() === 'cancelled')) return 'cancelled';
  return 'unknown';
}

function parseReservation(value: unknown): LiveReservation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('reservations.errorFormat');
  const obj = value as RawReservation;
  return {
    id: number(obj.id),
    tableId: number(obj.tableId),
    tableNumber: typeof obj.tableNumber === 'number' ? obj.tableNumber : number(obj.tableId),
    userId: typeof obj.userId === 'string' ? obj.userId : '',
    customerName: typeof obj.customerName === 'string' ? obj.customerName : '',
    customerEmail: typeof obj.customerEmail === 'string' ? obj.customerEmail : null,
    guestName: typeof obj.guestName === 'string' ? obj.guestName : null,
    guestPhone: typeof obj.guestPhone === 'string' ? obj.guestPhone : null,
    startTime: string(obj.startTime),
    endTime: string(obj.endTime),
    durationMinutes: number(obj.durationMinutes),
    guestCount: number(obj.guestCount),
    note: typeof obj.note === 'string' ? obj.note : null,
    status: parseStatus(obj.status),
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : '',
  };
}

function parseTable(value: unknown): AvailableTable {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('reservations.errorFormat');
  const obj = value as Record<string, unknown>;
  return { id: number(obj.id), tableNumber: number(obj.tableNumber), capacity: number(obj.capacity) };
}

async function request(path: string, token: string, options: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${prefix()}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('reservations.errorNetwork');
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error('reservations.errorUnauthorized');
    if (response.status === 403) throw new Error('reservations.errorForbidden');
    if (response.status === 404 || response.status === 405) throw new Error('reservations.errorUnsupported');
    if (response.status === 409) throw new Error('reservations.errorConflict');
    const body = await response.json().catch(() => null) as { message?: unknown } | null;
    const message = typeof body?.message === 'string' ? body.message : null;
    throw new Error(message || `reservations.errorHttp:${response.status}`);
  }
  return response;
}

export async function fetchReservations(token: string, signal?: AbortSignal): Promise<LiveReservation[]> {
  const response = await request('/api/Reservations', token, { signal });
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('reservations.errorFormat');
  return data.map(parseReservation).sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
}

/** Uses backend collision/capacity checks. It returns only tables for the requested time slot. */
export async function fetchAvailableReservationTables(token: string, startTime: string, guestCount: number, durationMinutes: number): Promise<AvailableTable[]> {
  const params = new URLSearchParams({ startTime, guestCount: String(guestCount), durationMinutes: String(durationMinutes) });
  const response = await request(`/api/Reservations/available?${params.toString()}`, token);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('reservations.errorFormat');
  return data.map(parseTable).sort((a, b) => a.tableNumber - b.tableNumber);
}

export async function createReservation(token: string, input: ReservationInput): Promise<LiveReservation> {
  const response = await request('/api/Reservations', token, { method: 'POST', body: JSON.stringify(input) });
  return parseReservation(await response.json());
}

export async function updateReservation(token: string, id: number, input: ReservationInput): Promise<LiveReservation> {
  const response = await request(`/api/Reservations/${id}`, token, { method: 'PUT', body: JSON.stringify(input) });
  return parseReservation(await response.json());
}

export async function cancelReservation(token: string, id: number): Promise<LiveReservation> {
  const response = await request(`/api/Reservations/${id}/cancel`, token, { method: 'PATCH' });
  return parseReservation(await response.json());
}
