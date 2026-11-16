
import { ApiError, apiBaseUrl } from "./client";

export type RestaurantRole = number | string;

export type RestaurantSummary = {
  id: string;
  code: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  role: RestaurantRole;
};

export async function createRestaurant(
  token: string,
  details: { organizationId: string; name: string; slug: string },
): Promise<RestaurantSummary> {
  const response = await fetch(getApiUrl('/api/Restaurant'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(details),
  });
  if (!response.ok) throw new ApiError('Restaurant creation failed.', response.status);
  return await response.json() as RestaurantSummary;
}

export function getRestaurantRoleName(
  role: RestaurantRole
): string {
  if (typeof role === "string") {
    return role;
  }

  switch (role) {
    case 1:
      return "Owner";
    case 2:
      return "Manager";
    case 3:
      return "Waiter";
    case 4:
      return "Cashier";
    default:
      return "Member";
  }
}

function getApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export async function getMyRestaurants(
  token: string,
  signal?: AbortSignal
): Promise<RestaurantSummary[]> {
  const response = await fetch(
    getApiUrl("/api/Restaurant/mine"),
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal,
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load restaurants (${response.status}).`
    );
  }

  const data: unknown = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Invalid restaurants response.");
  }

  return data as RestaurantSummary[];
}
