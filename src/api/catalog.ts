/** Tenant-scoped catalog. All endpoints require a selected restaurant GUID. */
import { apiBaseUrl } from './client';

export type LiveCategory = { id: number; name: string; description: string | null };
export type LiveProduct = {
  id: number;
  name: string;
  price: number;
  nuts: boolean;
  vegeterian: boolean;
  spiciness: number;
  categoryId: number;
  categoryName: string | null;
};
export type CategoryInput = { name: string; description: string };
export type ProductInput = Omit<LiveProduct, 'id' | 'categoryName'>;

type RawCategory = Record<string, unknown>;
type RawProduct = Record<string, unknown>;

function apiPrefix(): string {
  if (import.meta.env.DEV) return '';
  if (!apiBaseUrl) throw new Error('catalog.errorMissingUrl');
  return apiBaseUrl.replace(/\/+$/, '');
}

function catalogPath(restaurantId: string, resource: 'categories' | 'products'): string {
  if (!restaurantId.trim()) throw new Error('Select a restaurant first.');
  return `/api/restaurants/${encodeURIComponent(restaurantId)}/${resource}`;
}

async function request(path: string, token: string, options: RequestInit = {}): Promise<Response> {
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
    throw new Error('catalog.errorNetwork');
  }
  if (!response.ok) {
    if (response.status === 401) throw new Error('catalog.errorUnauthorized');
    if (response.status === 403) throw new Error('catalog.errorForbidden');
    if (response.status === 404) throw new Error('catalog.errorNotFound');
    if (response.status === 409) throw new Error('catalog.errorConflict');
    if (response.status === 400) throw new Error('catalog.errorBadRequest');
    throw new Error(`catalog.errorHttp:${response.status}`);
  }
  return response;
}

function getObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('catalog.errorFormat');
  }
  return value as Record<string, unknown>;
}

function parseCategory(value: unknown): LiveCategory {
  const row: RawCategory = getObject(value);
  if (typeof row.id !== 'number' || !Number.isInteger(row.id) || typeof row.name !== 'string') {
    throw new Error('catalog.errorFormat');
  }
  return {
    id: row.id,
    name: row.name,
    description: typeof row.description === 'string' ? row.description : null,
  };
}

function parseProduct(value: unknown): LiveProduct {
  const row: RawProduct = getObject(value);
  if (typeof row.id !== 'number' || !Number.isInteger(row.id) ||
      typeof row.name !== 'string' || typeof row.categoryId !== 'number' ||
      typeof row.price !== 'number' || !Number.isFinite(row.price)) {
    throw new Error('catalog.errorFormat');
  }
  return {
    id: row.id,
    name: row.name,
    categoryId: row.categoryId,
    categoryName: typeof row.categoryName === 'string' ? row.categoryName : null,
    price: row.price,
    nuts: row.nuts === true,
    vegeterian: row.vegeterian === true,
    spiciness: typeof row.spiciness === 'number' ? row.spiciness : 0,
  };
}

async function parseArray<T>(response: Response, parser: (value: unknown) => T): Promise<T[]> {
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('catalog.errorFormat');
  return data.map(parser);
}

export async function fetchCatalog(token: string, restaurantId: string, signal?: AbortSignal): Promise<{
  categories: LiveCategory[]; products: LiveProduct[];
}> {
  const [categoriesResponse, productsResponse] = await Promise.all([
    request(catalogPath(restaurantId, 'categories'), token, { signal }),
    request(catalogPath(restaurantId, 'products'), token, { signal }),
  ]);
  const [categories, products] = await Promise.all([
    parseArray(categoriesResponse, parseCategory),
    parseArray(productsResponse, parseProduct),
  ]);
  return {
    categories: categories.sort((a, b) => a.name.localeCompare(b.name)),
    products: products.sort((a, b) => a.id - b.id),
  };
}

export async function createCategory(token: string, restaurantId: string, data: CategoryInput): Promise<void> {
  await request(catalogPath(restaurantId, 'categories'), token, { method: 'POST', body: JSON.stringify(data) });
}
export async function updateCategory(token: string, restaurantId: string, id: number, data: CategoryInput): Promise<void> {
  await request(`${catalogPath(restaurantId, 'categories')}/${id}`, token, { method: 'PUT', body: JSON.stringify(data) });
}
export async function deleteCategory(token: string, restaurantId: string, id: number): Promise<void> {
  await request(`${catalogPath(restaurantId, 'categories')}/${id}`, token, { method: 'DELETE' });
}
export async function createProduct(token: string, restaurantId: string, data: ProductInput): Promise<void> {
  await request(catalogPath(restaurantId, 'products'), token, { method: 'POST', body: JSON.stringify(data) });
}
export async function updateProduct(token: string, restaurantId: string, id: number, data: ProductInput): Promise<void> {
  await request(`${catalogPath(restaurantId, 'products')}/${id}`, token, { method: 'PUT', body: JSON.stringify({ id, ...data }) });
}
export async function deleteProduct(token: string, restaurantId: string, id: number): Promise<void> {
  await request(`${catalogPath(restaurantId, 'products')}/${id}`, token, { method: 'DELETE' });
}
