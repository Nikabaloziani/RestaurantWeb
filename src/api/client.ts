// PREPARED FOR THE NEXT STEP — NOT CALLED BY THE DEMO DASHBOARD.
// No secrets or tokens should be hard-coded in a VITE_ environment variable.
export const apiBaseUrl = import.meta.env.VITE_API_URL ?? '';

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  if (!apiBaseUrl) throw new Error('VITE_API_URL is not set');
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json() as Promise<T>;
}
