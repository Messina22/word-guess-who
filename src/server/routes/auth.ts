import type { AuthResponse, Instructor } from "@shared/types";
import { validateRegisterInput, validateLoginInput } from "@shared/validation";
import {
  createInstructor,
  authenticateInstructor,
  mapUserToInstructor,
} from "../instructor-manager";
import { extractTokenFromHeader, verifyToken } from "../auth";
import { jsonResponse } from "../utils/response";
import { supabaseAuth } from "../supabase";

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

  try {
    const result = await createInstructor(validation.data);
    if (!result.success) {
      return jsonResponse<null>({ success: false, error: result.error }, 400);
    }

    return jsonResponse<AuthResponse>(
      { success: true, data: result.data },
      201
    );
  } catch (error) {
    console.error("Registration error:", error);
    return jsonResponse<null>(
      { success: false, error: "Failed to create account. Please try again." },
      500
    );
  }
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

  try {
    const result = await authenticateInstructor(validation.data);
    if (!result.success) {
      return jsonResponse<null>({ success: false, error: result.error }, 401);
    }

    return jsonResponse<AuthResponse>({ success: true, data: result.data });
  } catch (error) {
    console.error("Login error:", error);
    return jsonResponse<null>(
      { success: false, error: "Login failed. Please try again." },
      500
    );
  }
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

  const instructor = await verifyToken(token);
  if (!instructor) {
    return jsonResponse<null>(
      { success: false, error: "Invalid or expired token" },
      401
    );
  }

  return jsonResponse<Instructor>({ success: true, data: instructor });
}

/** POST /api/auth/refresh - Refresh access token */
export async function handleRefresh(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const refreshToken =
    typeof (body as { refreshToken?: unknown }).refreshToken === "string"
      ? (body as { refreshToken: string }).refreshToken
      : null;

  if (!refreshToken) {
    return jsonResponse<null>(
      { success: false, error: "Refresh token is required" },
      400
    );
  }

  const { data, error } = await supabaseAuth.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error || !data.session || !data.user) {
    return jsonResponse<null>(
      { success: false, error: "Invalid or expired refresh token" },
      401
    );
  }

  const instructor = mapUserToInstructor(data.user);
  return jsonResponse<AuthResponse>({
    success: true,
    data: {
      instructor,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    },
  });
}
