/**
 * REST API handlers for game sessions
 */

import type { ApiResponse, CreateGameInput, CreateGameResponse, PublicGameSession } from "@shared/types";
import { sessionManager } from "../session-manager";
import { getClassById } from "../class-manager";
import { getStudentById } from "../student-manager";

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

    // Validate classId and studentId if provided
    let validatedClassId: string | undefined;
    let validatedStudentId: string | undefined;

    if (body.classId) {
      const cls = getClassById(body.classId);
      if (!cls) {
        return jsonResponse({ success: false, error: "Invalid classId" }, 400);
      }
      validatedClassId = cls.id;
    }

    if (body.studentId) {
      const student = getStudentById(body.studentId);
      if (!student) {
        return jsonResponse({ success: false, error: "Invalid studentId" }, 400);
      }
      // If classId is provided, ensure the student belongs to that class
      if (validatedClassId && student.classId !== validatedClassId) {
        return jsonResponse({ success: false, error: "Student does not belong to the specified class" }, 400);
      }
      validatedStudentId = student.id;
      // If student is valid but classId wasn't provided, use the student's classId
      if (!validatedClassId) {
        validatedClassId = student.classId;
      }
    }

    const result = await sessionManager.createSession(
      body.configId,
      body.isLocalMode ?? false,
      body.showOnlyLastQuestion ?? false,
      body.randomSecretWords ?? false,
      body.sharedComputerMode ?? false,
      validatedClassId,
      validatedStudentId,
    );

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
    isLocalMode: session.isLocalMode,
    showOnlyLastQuestion: session.showOnlyLastQuestion,
    randomSecretWords: session.randomSecretWords,
    sharedComputerMode: session.sharedComputerMode,
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
