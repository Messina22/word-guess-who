import type {
  ApiResponse,
  GameConfig,
  GameConfigInput,
  CreateGameInput,
  CreateGameResponse,
  PublicGameSession,
  AuthResponse,
  Instructor,
  RegisterInput,
  LoginInput,
} from "@shared/types";

const API_BASE = "/api";
const AUTH_TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";

/** Get the stored auth token */
export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Set the auth token */
export function setAuthToken(token: string): void {
  setAuthTokens(token);
}

/** Clear the auth token */
export function clearAuthToken(): void {
  clearAuthTokens();
}

/** Get the stored refresh token */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Set auth access + refresh tokens */
export function setAuthTokens(token: string, refreshToken?: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

/** Clear auth access + refresh tokens */
export function clearAuthTokens(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** Get auth headers if token exists */
function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(
  path: string,
  options?: RequestInit & { authenticated?: boolean }
): Promise<ApiResponse<T>> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.authenticated !== false ? getAuthHeaders() : {}),
      ...(options?.headers as Record<string, string> | undefined),
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    return (await response.json()) as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    login: (input: LoginInput) =>
      request<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    me: () => request<Instructor>("/auth/me"),

    refresh: (refreshToken: string) =>
      request<AuthResponse>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        authenticated: false,
      }),
  },

  configs: {
    list: () => request<GameConfig[]>("/configs"),

    get: (id: string) =>
      request<GameConfig>(`/configs/${encodeURIComponent(id)}`, {
        authenticated: false,
      }),

    create: (input: GameConfigInput & { isPublic?: boolean }) =>
      request<GameConfig>("/configs", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    update: (id: string, input: GameConfigInput & { isPublic?: boolean }) =>
      request<GameConfig>(`/configs/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(input),
      }),

    delete: (id: string) =>
      request<null>(`/configs/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
  },

  games: {
    create: (input: CreateGameInput) =>
      request<CreateGameResponse>("/games", {
        method: "POST",
        body: JSON.stringify(input),
        authenticated: false,
      }),

    get: (code: string) =>
      request<PublicGameSession>(`/games/${encodeURIComponent(code)}`, {
        authenticated: false,
      }),
  },
};
