import type {
  ApiResponse,
  GameConfig,
  CreateGameInput,
  CreateGameResponse,
  PublicGameSession,
} from "@shared/types";

const API_BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
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
  configs: {
    list: () => request<GameConfig[]>("/configs"),

    get: (id: string) => request<GameConfig>(`/configs/${encodeURIComponent(id)}`),
  },

  games: {
    create: (input: CreateGameInput) =>
      request<CreateGameResponse>("/games", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    get: (code: string) =>
      request<PublicGameSession>(`/games/${encodeURIComponent(code)}`),
  },
};
