import type { Student, StudentAuthResponse } from "@shared/types";
import { validateStudentLoginInput } from "@shared/validation";
import { loginOrCreateStudent, getStudentById } from "../student-manager";
import { getClassById } from "../class-manager";
import { extractTokenFromHeader, verifyToken } from "../auth";
import { jsonResponse } from "../utils/response";

/** POST /api/auth/student-login - Join a class with code + username */
export async function handleStudentLogin(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = validateStudentLoginInput(body);
  if (!validation.success) {
    return jsonResponse<null>(
      { success: false, errors: validation.errors },
      400
    );
  }

  try {
    const result = await loginOrCreateStudent(
      validation.data.classCode,
      validation.data.username
    );
    if (!result.success) {
      return jsonResponse<null>({ success: false, error: result.error }, 400);
    }

    return jsonResponse<StudentAuthResponse>(
      { success: true, data: result.data },
      200
    );
  } catch (error) {
    console.error("Student login error:", error);
    return jsonResponse<null>(
      { success: false, error: "Failed to join class. Please try again." },
      500
    );
  }
}

/** GET /api/auth/student-me - Get current student profile + class name */
export async function handleStudentMe(request: Request): Promise<Response> {
  const authHeader = request.headers.get("Authorization");
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return jsonResponse<null>(
      { success: false, error: "Authentication required" },
      401
    );
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "student") {
    return jsonResponse<null>(
      { success: false, error: "Invalid or expired token" },
      401
    );
  }

  const student = getStudentById(payload.studentId);
  if (!student) {
    return jsonResponse<null>(
      { success: false, error: "Student not found" },
      404
    );
  }

  const cls = getClassById(student.classId);

  return jsonResponse<{ student: Student; className: string }>({
    success: true,
    data: { student, className: cls?.name ?? "Unknown" },
  });
}
