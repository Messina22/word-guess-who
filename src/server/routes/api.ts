import type { ApiResponse, GameConfig } from "@shared/types";
import {
  listConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
} from "../config-manager";

/** Create a JSON response with proper headers */
function jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** Handle OPTIONS preflight requests */
export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/** GET /api/configs - List all configurations */
export function handleListConfigs(): Response {
  const configs = listConfigs();
  return jsonResponse<GameConfig[]>({ success: true, data: configs });
}

/** GET /api/configs/:id - Get a single configuration */
export function handleGetConfig(id: string): Response {
  const config = getConfig(id);
  if (!config) {
    return jsonResponse<null>(
      { success: false, error: `Config '${id}' not found` },
      404
    );
  }
  return jsonResponse<GameConfig>({ success: true, data: config });
}

/** POST /api/configs - Create a new configuration */
export async function handleCreateConfig(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const result = createConfig(body as any);
  if (!result.success) {
    return jsonResponse<null>(
      { success: false, errors: result.errors },
      400
    );
  }

  return jsonResponse<GameConfig>({ success: true, data: result.data }, 201);
}

/** PUT /api/configs/:id - Update a configuration */
export async function handleUpdateConfig(
  id: string,
  request: Request
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const result = updateConfig(id, body as any);
  if (!result.success) {
    // Determine if it's a 404 or validation error
    const is404 = result.errors.some((e) => e.includes("not found"));
    return jsonResponse<null>(
      { success: false, errors: result.errors },
      is404 ? 404 : 400
    );
  }

  return jsonResponse<GameConfig>({ success: true, data: result.data });
}

/** DELETE /api/configs/:id - Delete a configuration */
export function handleDeleteConfig(id: string): Response {
  const deleted = deleteConfig(id);
  if (!deleted) {
    return jsonResponse<null>(
      { success: false, error: `Config '${id}' not found` },
      404
    );
  }
  return jsonResponse<null>({ success: true });
}
