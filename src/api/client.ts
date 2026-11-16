/**
 * Shared RestaurantAPI HTTP helper.
 * In development, an empty VITE_API_URL intentionally uses Vite's /api proxy.
 * In production, configure VITE_API_URL to the publicly reachable API origin.
 * Never put JWTs, private keys or payment credentials into VITE_ env vars.
 */
export const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');

/** Structured status for callers; existing Error message handling still works. */
export class ApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function apiRequest<T>(
  path: string,
  token?: string,
  options: RequestInit = {},
): Promise<T> {
  if (!path.startsWith('/')) {
    throw new Error('API path must start with a slash.');
  }

  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    let message = body.trim();
    try {
      const json: unknown = JSON.parse(body);
      if (json && typeof json === 'object') {
        const problem = json as { detail?: unknown; title?: unknown; message?: unknown };
        const selected = problem.detail ?? problem.message ?? problem.title;
        if (typeof selected === 'string') message = selected;
      } else if (typeof json === 'string') {
        message = json;
      }
    } catch {
      // Plain text error body is already available above.
    }
    const retryAfter = response.headers.get('Retry-After');
    const seconds = retryAfter === null ? NaN : /^\d+$/.test(retryAfter)
      ? Number(retryAfter)
      : Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000);
    throw new ApiError(
      message ? `API ${response.status}: ${message}` : `API error ${response.status}`,
      response.status,
      Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined,
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

// Preserve the original apiGet<T>(path, token?) usage everywhere else.
export async function apiGet<T>(path: string, token?: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, token, { signal });
}
