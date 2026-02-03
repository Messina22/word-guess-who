import type { ApiResponse, GameConfig, Instructor } from "@shared/types";
import {
  listConfigs,
  listPublicConfigs,
  getConfig,
  createConfig,
  updateConfig,
  deleteConfig,
} from "../config-manager";
import { extractTokenFromHeader, verifyToken } from "../auth";
import { getInstructorById } from "../instructor-manager";

/** Create a JSON response with proper headers */
function jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/** Extract instructor from request (returns null if not authenticated) */
async function getInstructorFromRequest(
  request: Request
): Promise<Instructor | null> {
  const authHeader = request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader);
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return getInstructorById(payload.instructorId);
}

/** GET /api/configs - List public configurations and system templates */
export async function handleListConfigs(request: Request): Promise<Response> {
  const instructor = await getInstructorFromRequest(request);

  // If authenticated, include instructor's own configs too
  const configs = instructor
    ? listConfigs(instructor.id)
    : listPublicConfigs();

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

/** POST /api/configs - Create a new configuration (requires auth) */
export async function handleCreateConfig(request: Request): Promise<Response> {
  const instructor = await getInstructorFromRequest(request);
  if (!instructor) {
    return jsonResponse<null>(
      { success: false, error: "Authentication required" },
      401
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const result = createConfig(body as any, instructor.id);
  if (!result.success) {
    return jsonResponse<null>(
      { success: false, errors: result.errors },
      400
    );
  }

  return jsonResponse<GameConfig>({ success: true, data: result.data }, 201);
}

/** PUT /api/configs/:id - Update a configuration (requires auth + ownership) */
export async function handleUpdateConfig(
  id: string,
  request: Request
): Promise<Response> {
  const instructor = await getInstructorFromRequest(request);
  if (!instructor) {
    return jsonResponse<null>(
      { success: false, error: "Authentication required" },
      401
    );
  }

  // Check ownership before parsing body
  const existing = getConfig(id);
  if (!existing) {
    return jsonResponse<null>(
      { success: false, error: `Config '${id}' not found` },
      404
    );
  }

  if (existing.isSystemTemplate) {
    return jsonResponse<null>(
      { success: false, error: "System templates cannot be modified" },
      403
    );
  }

  if (existing.ownerId !== instructor.id) {
    return jsonResponse<null>(
      { success: false, error: "You do not have permission to edit this configuration" },
      403
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const result = updateConfig(id, body as any, instructor.id);
  if (!result.success) {
    const is404 = result.errors.some((e) => e.includes("not found"));
    return jsonResponse<null>(
      { success: false, errors: result.errors },
      is404 ? 404 : 400
    );
  }

  return jsonResponse<GameConfig>({ success: true, data: result.data });
}

/** DELETE /api/configs/:id - Delete a configuration (requires auth + ownership) */
export async function handleDeleteConfig(
  id: string,
  request: Request
): Promise<Response> {
  const instructor = await getInstructorFromRequest(request);
  if (!instructor) {
    return jsonResponse<null>(
      { success: false, error: "Authentication required" },
      401
    );
  }

  // Check ownership
  const existing = getConfig(id);
  if (!existing) {
    return jsonResponse<null>(
      { success: false, error: `Config '${id}' not found` },
      404
    );
  }

  if (existing.isSystemTemplate) {
    return jsonResponse<null>(
      { success: false, error: "System templates cannot be deleted" },
      403
    );
  }

  if (existing.ownerId !== instructor.id) {
    return jsonResponse<null>(
      { success: false, error: "You do not have permission to delete this configuration" },
      403
    );
  }

  const result = deleteConfig(id, instructor.id);
  if (!result.success) {
    return jsonResponse<null>({ success: false, error: result.error }, 400);
  }

  return jsonResponse<null>({ success: true });
}
