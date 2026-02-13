import type { Class, ClassWithRoster } from "@shared/types";
import { validateCreateClassInput, classNameSchema } from "@shared/validation";
import {
  createClass,
  getClassesForInstructor,
  getClassWithRoster,
  updateClass,
  deleteClass,
  removeStudent,
} from "../class-manager";
import { extractTokenFromHeader, verifyToken } from "../auth";
import { jsonResponse } from "../utils/response";

/** Extract instructor ID from request, or return error response */
async function requireInstructor(
  request: Request
): Promise<string | Response> {
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

  return payload.instructorId;
}

/** POST /api/classes - Create a new class */
export async function handleCreateClass(request: Request): Promise<Response> {
  const instructorId = await requireInstructor(request);
  if (instructorId instanceof Response) return instructorId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const validation = validateCreateClassInput(body);
  if (!validation.success) {
    return jsonResponse<null>(
      { success: false, errors: validation.errors },
      400
    );
  }

  try {
    const cls = createClass(instructorId, validation.data);
    return jsonResponse<Class>({ success: true, data: cls }, 201);
  } catch (error) {
    console.error("Create class error:", error);
    return jsonResponse<null>(
      { success: false, error: "Failed to create class" },
      500
    );
  }
}

/** GET /api/classes - List instructor's classes */
export async function handleListClasses(request: Request): Promise<Response> {
  const instructorId = await requireInstructor(request);
  if (instructorId instanceof Response) return instructorId;

  const classes = getClassesForInstructor(instructorId);
  return jsonResponse<(Class & { studentCount: number })[]>({
    success: true,
    data: classes,
  });
}

/** GET /api/classes/:id - Get class with roster */
export async function handleGetClass(
  request: Request,
  classId: string
): Promise<Response> {
  const instructorId = await requireInstructor(request);
  if (instructorId instanceof Response) return instructorId;

  const classWithRoster = getClassWithRoster(classId);
  if (!classWithRoster) {
    return jsonResponse<null>(
      { success: false, error: "Class not found" },
      404
    );
  }

  if (classWithRoster.instructorId !== instructorId) {
    return jsonResponse<null>(
      { success: false, error: "Not authorized" },
      403
    );
  }

  return jsonResponse<ClassWithRoster>({
    success: true,
    data: classWithRoster,
  });
}

/** PUT /api/classes/:id - Update class name */
export async function handleUpdateClass(
  request: Request,
  classId: string
): Promise<Response> {
  const instructorId = await requireInstructor(request);
  if (instructorId instanceof Response) return instructorId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse<null>(
      { success: false, error: "Invalid JSON body" },
      400
    );
  }

  const nameResult = classNameSchema.safeParse(
    (body as Record<string, unknown>)?.name
  );
  if (!nameResult.success) {
    return jsonResponse<null>(
      { success: false, error: "Invalid class name" },
      400
    );
  }

  const result = updateClass(classId, instructorId, nameResult.data);
  if (!result.success) {
    return jsonResponse<null>(
      { success: false, error: result.error },
      result.error === "Not authorized" ? 403 : 404
    );
  }

  return jsonResponse<Class>({ success: true, data: result.data });
}

/** DELETE /api/classes/:id - Delete a class */
export async function handleDeleteClass(
  request: Request,
  classId: string
): Promise<Response> {
  const instructorId = await requireInstructor(request);
  if (instructorId instanceof Response) return instructorId;

  const result = deleteClass(classId, instructorId);
  if (!result.success) {
    return jsonResponse<null>(
      { success: false, error: result.error },
      result.error === "Not authorized" ? 403 : 404
    );
  }

  return jsonResponse<null>({ success: true }, 200);
}

/** DELETE /api/classes/:id/students/:studentId - Remove student from class */
export async function handleRemoveStudent(
  request: Request,
  classId: string,
  studentId: string
): Promise<Response> {
  const instructorId = await requireInstructor(request);
  if (instructorId instanceof Response) return instructorId;

  const result = removeStudent(studentId, classId, instructorId);
  if (!result.success) {
    return jsonResponse<null>(
      { success: false, error: result.error },
      result.error === "Not authorized" ? 403 : 404
    );
  }

  return jsonResponse<null>({ success: true }, 200);
}
