import type { AuthResponse, Instructor } from "@shared/types";
import {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
} from "@shared/validation";
import {
  createInstructor,
  authenticateInstructor,
  getInstructorById,
  getInstructorByEmail,
  listInstructors,
  createPasswordResetToken,
  verifyResetToken,
  consumeResetToken,
  updateInstructorPassword,
} from "../instructor-manager";
import { extractTokenFromHeader, verifyToken, hashPassword } from "../auth";
import { jsonResponse } from "../utils/response";
import { sendPasswordResetEmail } from "../email";

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

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "instructor") {
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

/** GET /api/auth/instructors - List instructor accounts (development only) */
export async function handleListInstructors(
  request: Request
): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return jsonResponse<null>({ success: false, error: "Not found" }, 404);
  }

  const authHeader = request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return jsonResponse<null>(
      { success: false, error: "Authentication required" },
      401
    );
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "instructor") {
    return jsonResponse<null>(
      { success: false, error: "Invalid or expired token" },
      401
    );
  }

  const instructors = listInstructors();
  return jsonResponse<Instructor[]>({ success: true, data: instructors });
}

// ============================================
// Forgot / Reset Password
// ============================================

/** In-memory rate limiter: email -> array of request timestamps */
const forgotPasswordRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const timestamps = forgotPasswordRateLimit.get(key) ?? [];

  // Remove expired entries
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  forgotPasswordRateLimit.set(key, recent);

  return recent.length >= RATE_LIMIT_MAX;
}

function recordRateLimitHit(email: string): void {
  const key = email.toLowerCase();
  const timestamps = forgotPasswordRateLimit.get(key) ?? [];
  timestamps.push(Date.now());
  forgotPasswordRateLimit.set(key, timestamps);
}

const GENERIC_SUCCESS_MESSAGE =
  "If an account with that email exists, a reset link has been sent.";

/** POST /api/auth/forgot-password */
export async function handleForgotPassword(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = validateForgotPasswordInput(body);
  if (!validation.success) {
    return jsonResponse<null>(
      { success: false, errors: validation.errors },
      400
    );
  }

  const { email } = validation.data;

  // Rate limit check — still return generic message to prevent enumeration
  if (isRateLimited(email)) {
    return jsonResponse<{ message: string }>({
      success: true,
      data: { message: GENERIC_SUCCESS_MESSAGE },
    });
  }

  recordRateLimitHit(email);

  try {
    const instructor = getInstructorByEmail(email);
    if (instructor) {
      const token = createPasswordResetToken(instructor.id);
      await sendPasswordResetEmail(email, token, instructor.name);
    }
    // Always return generic success to prevent email enumeration
    return jsonResponse<{ message: string }>({
      success: true,
      data: { message: GENERIC_SUCCESS_MESSAGE },
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return jsonResponse<null>(
      { success: false, error: "Something went wrong. Please try again." },
      500
    );
  }
}

/** POST /api/auth/reset-password */
export async function handleResetPassword(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = validateResetPasswordInput(body);
  if (!validation.success) {
    return jsonResponse<null>(
      { success: false, errors: validation.errors },
      400
    );
  }

  const { token, password } = validation.data;

  try {
    const instructorId = verifyResetToken(token);
    if (!instructorId) {
      return jsonResponse<null>(
        { success: false, error: "Invalid or expired reset link. Please request a new one." },
        400
      );
    }

    // Consume token immediately to prevent race condition (TOCTOU)
    // before the async hashPassword yields control
    consumeResetToken(token);

    const newPasswordHash = await hashPassword(password);
    updateInstructorPassword(instructorId, newPasswordHash);

    return jsonResponse<{ message: string }>({
      success: true,
      data: { message: "Your password has been reset successfully." },
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return jsonResponse<null>(
      { success: false, error: "Failed to reset password. Please try again." },
      500
    );
  }
}
