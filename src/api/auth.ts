
import { ApiError, apiBaseUrl } from "./client";

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

export type RegistrationDetails = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

function getApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

export async function registerAccount(details: RegistrationDetails): Promise<void> {
  const response = await fetch(getApiUrl('/api/Auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(details),
  });

  if (!response.ok) {
    throw new ApiError('Registration failed.', response.status);
  }

  const result = (await response.json()) as Pick<LoginResult, 'isSuccess'>;
  if (!result?.isSuccess) throw new Error('Registration could not be confirmed.');
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

  return JSON.parse(atob(padded)) as Record<
    string,
    unknown
  >;
}

export function isJwtExpired(
  token: string
): boolean {
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
    throw new Error(
      "Could not find user ID in JWT token."
    );
  }

  return id;
}

export async function authenticate(
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> {
  // STEP 1: Authenticate credentials.
  const response = await fetch(
    getApiUrl("/api/Auth/login"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error(
        "Invalid email or password."
      );
    }

    throw new Error(
      `Login request failed (${response.status}).`
    );
  }

  const result =
    (await response.json()) as LoginResult;

  if (!result.isSuccess || !result.token) {
    throw new Error(
      result.message || "Login failed."
    );
  }

  if (isJwtExpired(result.token)) {
    throw new Error(
      "The server returned an expired token."
    );
  }

  const userId = getIdFromJwt(result.token);

  // STEP 2: Load the authenticated account.
  const headers = {
    Authorization: `Bearer ${result.token}`,
  };

  let me = await fetch(
    getApiUrl("/api/Auth/me"),
    {
      method: "GET",
      headers,
      cache: "no-store",
    }
  );

  // Backward compatibility for local development.
  if (me.status === 404 && import.meta.env.DEV) {
    me = await fetch(
      getApiUrl(
        `/api/Auth/users/${encodeURIComponent(userId)}`
      ),
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );
  }

  if (!me.ok) {
    throw new Error(
      `Could not load account (${me.status}).`
    );
  }

  const profile =
    (await me.json()) as Partial<AuthUser>;

  if (!profile || typeof profile !== "object") {
    throw new Error(
      "Invalid account information."
    );
  }

  if (
    typeof profile.id === "string" &&
    profile.id !== userId
  ) {
    throw new Error(
      "Account ID does not match the login token."
    );
  }

  const user: AuthUser = {
    id: userId,
    firstName: profile.firstName ?? "",
    lastName: profile.lastName ?? "",
    userName: profile.userName ?? "",
    email: profile.email ?? email,
    roles: Array.isArray(profile.roles)
      ? profile.roles
      : [],
  };

  return {
    token: result.token,
    user,
  };
}
