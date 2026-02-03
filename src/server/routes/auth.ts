import type { AuthResponse, Instructor } from "@shared/types";
import { validateRegisterInput, validateLoginInput } from "@shared/validation";
import {
  createInstructor,
  authenticateInstructor,
  getInstructorById,
} from "../instructor-manager";
import { extractTokenFromHeader, verifyToken } from "../auth";
import { jsonResponse } from "../utils/response";

/** POST /api/auth/register - Create a new instructor account */
export async function handleRegister(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = validateRegisterInput(body);
  if (!validation.success) {
    return jsonResponse<null>(
      { success: false, errors: validation.errors },
      400
    );
  }

  const result = await createInstructor(validation.data);
  if (!result.success) {
    return jsonResponse<null>({ success: false, error: result.error }, 400);
  }

  return jsonResponse<AuthResponse>({ success: true, data: result.data }, 201);
}

/** POST /api/auth/login - Authenticate and return token */
export async function handleLogin(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = validateLoginInput(body);
  if (!validation.success) {
    return jsonResponse<null>(
      { success: false, errors: validation.errors },
      400
    );
  }

  const result = await authenticateInstructor(validation.data);
  if (!result.success) {
    return jsonResponse<null>({ success: false, error: result.error }, 401);
  }

  return jsonResponse<AuthResponse>({ success: true, data: result.data });
}

/** GET /api/auth/me - Get current instructor profile */
export async function handleMe(request: Request): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return jsonResponse<null>(
      { success: false, error: "Authentication required" },
      401
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return jsonResponse<null>(
      { success: false, error: "Invalid or expired token" },
      401
    );
  }

  const instructor = getInstructorById(payload.instructorId);
  if (!instructor) {
    return jsonResponse<null>(
      { success: false, error: "Instructor not found" },
      404
    );
  }

  return jsonResponse<Instructor>({ success: true, data: instructor });
}
