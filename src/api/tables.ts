/** Mirrors RestaurantAPI TablesController and the new TableDTO patch.
 * Legacy API returns id, tableNumber, capacity, status but NOT isOccupied/zone.
 * We deliberately do not fabricate occupancy when those fields are absent.
 */
import { apiBaseUrl } from './client';

export type TableZone = 1 | 2 | 3 | 4;
export type TableState = 'available' | 'occupied' | 'reserved' | 'unknown';

export type LiveTable = {
  id: number;
  tableNumber: number;
  capacity: number;
  isOccupied: boolean | null;
  zone: TableZone | null;
  status: TableState;
};

export type TableInput = { tableNumber: number; capacity: number; zone: TableZone };

type ApiTable = {
  id?: number;
  tableNumber?: number;
  capacity?: number;
  isOccupied?: boolean;
  zone?: string | number;
  status?: string | number;
};

function prefix(): string {
  if (import.meta.env.DEV) return ''; // Same Vite proxy as Orders/Login.
  if (!apiBaseUrl) throw new Error('tables.errorMissingUrl');
  return apiBaseUrl.replace(/\/$/, '');
}

function enumNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function parseZone(value: unknown): TableZone | null {
  const num = enumNumber(value);
  if (num === 1 || num === 2 || num === 3 || num === 4) return num;
  if (typeof value === 'string') {
    const names: Record<string, TableZone> = { mainhall: 1, terrace: 2, vip: 3, balcony: 4 };
    return names[value.toLowerCase()] ?? null;
  }
  return null;
}

function parseTable(value: unknown): LiveTable {
  if (!value || typeof value !== 'object') throw new Error('tables.errorFormat');
  const row = value as ApiTable;
  if (typeof row.id !== 'number' || !Number.isInteger(row.id) ||
      typeof row.tableNumber !== 'number' || !Number.isInteger(row.tableNumber) ||
      typeof row.capacity !== 'number' || !Number.isInteger(row.capacity)) {
    throw new Error('tables.errorFormat');
  }
  const isOccupied = typeof row.isOccupied === 'boolean' ? row.isOccupied : null;
  const statusCode = enumNumber(row.status);
  const reserved = statusCode === 3 || (typeof row.status === 'string' && row.status.toLowerCase() === 'reserved');
  let status: TableState = 'unknown';
  if (reserved) status = 'reserved';
  else if (isOccupied !== null) status = isOccupied ? 'occupied' : 'available';
  return {
    id: row.id!, tableNumber: row.tableNumber!, capacity: row.capacity!,
    isOccupied, zone: parseZone(row.zone), status,
  };
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
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error('tables.errorNetwork');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('tables.errorUnauthorized');
    if (response.status === 403) throw new Error('tables.errorForbidden');
    if (response.status === 404 || response.status === 405) throw new Error('tables.errorUnsupported');
    if (response.status === 409) throw new Error('tables.errorConflict');
    throw new Error(`tables.errorHttp:${response.status}`);
  }
  return response;
}

export async function fetchTables(token: string, signal?: AbortSignal): Promise<LiveTable[]> {
  const response = await request('/api/Tables', token, { signal });
  const result: unknown = await response.json();
  if (!Array.isArray(result)) throw new Error('tables.errorFormat');
  return result.map(parseTable).sort((a, b) => a.tableNumber - b.tableNumber);
}

export async function createTable(token: string, value: TableInput): Promise<void> {
  await request('/api/Tables', token, { method: 'POST', body: JSON.stringify(value) });
}

/** Added by our optional backend patch. Not available in the deployed legacy API. */
export async function updateTable(token: string, id: number, value: TableInput): Promise<void> {
  await request(`/api/Tables/${id}`, token, { method: 'PUT', body: JSON.stringify(value) });
}

export async function updateTableOccupancy(token: string, id: number, isOccupied: boolean): Promise<void> {
  await request(`/api/Tables/${id}/status`, token, {
    method: 'PATCH', body: JSON.stringify({ isOccupied }),
  });
}

export async function deleteTable(token: string, id: number): Promise<void> {
  await request(`/api/Tables/${id}`, token, { method: 'DELETE' });
}
