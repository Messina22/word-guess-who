/**
 * REST API handlers for game sessions
 */

import type { ApiResponse, CreateGameInput, CreateGameResponse, PublicGameSession } from "@shared/types";
import { sessionManager } from "../session-manager";

/** Helper to create JSON responses */
function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
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

/** POST /api/games - Create a new game session */
export async function handleCreateGame(request: Request): Promise<Response> {
  try {
    const body = await request.json() as CreateGameInput;

    if (!body.configId) {
      return jsonResponse({ success: false, error: "configId is required" }, 400);
    }

    const result = await sessionManager.createSession(body.configId);

    if ("error" in result) {
      return jsonResponse({ success: false, error: result.error }, 400);
    }

    const response: CreateGameResponse = {
      code: result.code,
      expiresAt: result.expiresAt,
    };

    return jsonResponse({ success: true, data: response }, 201);
  } catch {
    return jsonResponse({ success: false, error: "Invalid request body" }, 400);
  }
}

/** GET /api/games/:code - Get game session info */
export function handleGetGame(code: string): Response {
  const session = sessionManager.getSession(code);

  if (!session) {
    return jsonResponse({ success: false, error: "Game not found" }, 404);
  }

  // Return public session info (no secret words)
  const publicSession: PublicGameSession = {
    code: session.code,
    configId: session.configId,
    phase: session.phase,
    players: session.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
    })),
    createdAt: session.createdAt,
  };

  return jsonResponse({ success: true, data: publicSession });
}
