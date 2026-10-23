
import { apiBaseUrl } from "./client";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  roles: string[];
};

type LoginResult = {
  isSuccess: boolean;
  message: string;
  token: string;
};

function getApiUrl(path: string): string {
  // Local development goes through the Vite proxy.
  if (import.meta.env.DEV) {
    return path;
  }

  const baseUrl = apiBaseUrl.replace(/\/+$/, "");

  if (!baseUrl) {
    throw new Error("VITE_API_URL is missing.");
  }

  return `${baseUrl}${path}`;
}

function decodeJwtClaims(
  token: string
): Record<string, unknown> {
  const encoded = token.split(".")[1];

  if (!encoded) {
    throw new Error("Invalid JWT token.");
  }

  const base64 = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = base64.padEnd(
    Math.ceil(base64.length / 4) * 4,
    "="
  );

  return JSON.parse(atob(padded)) as Record<string, unknown>;
}

export function isJwtExpired(token: string): boolean {
  try {
    const claims = decodeJwtClaims(token);

    if (typeof claims.exp !== "number") {
      return true;
    }

    return Date.now() >= claims.exp * 1000;
  } catch {
    return true;
  }
}

function getIdFromJwt(token: string): string {
  const claims = decodeJwtClaims(token);

  const id =
    claims[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
    ] ??
    claims.nameid ??
    claims.sub;

  if (typeof id !== "string" || !id) {
    throw new Error("Could not find user ID in JWT token.");
  }

  return id;
}

export async function authenticate(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {

  // Step 1: Login
  const response = await fetch(
    getApiUrl("/api/Auth/login"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Invalid email or password.");
    }

    throw new Error(
      `Login request failed (${response.status}).`
    );
  }

  const result = (await response.json()) as LoginResult;

  if (!result.isSuccess || !result.token) {
    throw new Error(result.message || "Login failed.");
  }

  if (isJwtExpired(result.token)) {
    throw new Error("The server returned an expired token.");
  }

  // Step 2: Get current user using the SAME API.
  const headers = {
    Authorization: `Bearer ${result.token}`,
  };

  const me = await fetch(
    getApiUrl("/api/Auth/me"),
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  );

  let user: AuthUser;

  if (me.ok) {
    user = (await me.json()) as AuthUser;
  } else if (me.status === 404 && import.meta.env.DEV) {
    const userId = getIdFromJwt(result.token);

    const legacy = await fetch(
      getApiUrl(
        `/api/Auth/users/${encodeURIComponent(userId)}`
      ),
      {
        headers,
        cache: "no-store",
      }
    );

    if (!legacy.ok) {
      throw new Error(
        `Could not load user profile (${legacy.status}).`
      );
    }

    user = (await legacy.json()) as AuthUser;
  } else {
    throw new Error(
      `Could not load account (${me.status}).`
    );
  }

  if (
    !user ||
    !Array.isArray(user.roles) ||
    !user.roles.includes("Admin")
  ) {
    throw new Error(
      "Only Admin users can access this dashboard."
    );
  }

  return {
    token: result.token,
    user,
  };
}
