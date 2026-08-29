import type { ApiResponse, GameConfig, GameConfigInput } from "@shared/types";
import { supabase } from "./supabase";

const API_BASE = "/api";

/** Get the Authorization header from the active Supabase session */
async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

async function request<T>(
  path: string,
  options?: RequestInit & { skipAuth?: boolean },
): Promise<ApiResponse<T>> {
  try {
    const authHeaders = options?.skipAuth ? {} : await getAuthHeader();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options?.headers as Record<string, string> | undefined),
    };

    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    return (await response.json()) as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export const api = {
  configs: {
    list: (ownedOnly?: boolean) => {
      const params = ownedOnly ? "?ownedOnly=true" : "";
      return request<GameConfig[]>(`/configs${params}`);
    },

    get: (id: string) =>
      request<GameConfig>(`/configs/${encodeURIComponent(id)}`, { skipAuth: true }),

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
      request<null>(`/configs/${encodeURIComponent(id)}`, { method: "DELETE" }),
  },

  games: {
    create: (input: {
      configId: string;
      isLocalMode?: boolean;
      showOnlyLastQuestion?: boolean;
      randomSecretWords?: boolean;
      sharedComputerMode?: boolean;
      playerName?: string;
    }) =>
      request<{ code: string; expiresAt: string }>("/games", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    get: (code: string) =>
      request<unknown>(`/games/${encodeURIComponent(code)}`),

    join: (code: string, playerName?: string) =>
      request<unknown>(`/games/${encodeURIComponent(code)}/join`, {
        method: "POST",
        body: JSON.stringify({ playerName }),
      }),
  },

  auth: {
    studentLogin: (classId: string, username: string) =>
      request<{ session: unknown }>("/auth/student", {
        method: "POST",
        body: JSON.stringify({ classId, username }),
        skipAuth: true,
      }),
  },
};
