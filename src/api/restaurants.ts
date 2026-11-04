
import { apiBaseUrl } from "./client";

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
  if (import.meta.env.DEV) {
    return path;
  }

  const base = apiBaseUrl.replace(/\/+$/, "");

  if (!base) {
    throw new Error("VITE_API_URL is missing.");
  }

  return `${base}${path}`;
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
