import { nanoid } from "nanoid";
import { getDb } from "./db";
import type {
  Class,
  ClassRow,
  Student,
  StudentRow,
  ClassWithRoster,
  CreateClassInput,
} from "@shared/types";

// Confusable-free alphabet (no i, l, o, 0, 1)
const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const CODE_LENGTH = 8;

/** Generate a random class join code */
function generateClassCode(): string {
  let code = "";
  const bytes = new Uint8Array(CODE_LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Convert a database row to a Class object */
function rowToClass(row: ClassRow): Class {
  return {
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    instructorId: row.instructor_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert a database row to a Student object */
export function rowToStudent(row: StudentRow): Student {
  return {
    id: row.id,
    username: row.username,
    classId: row.class_id,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Create a new class */
export function createClass(
  instructorId: string,
  input: CreateClassInput
): Class {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();

  // Generate unique join code
  let joinCode = generateClassCode();
  let attempts = 0;
  while (attempts < 100) {
    const existing = db
      .query<{ id: string }, [string]>(
        "SELECT id FROM classes WHERE join_code = ?"
      )
      .get(joinCode);
    if (!existing) break;
    joinCode = generateClassCode();
    attempts++;
  }
  if (attempts >= 100) {
    throw new Error("Failed to generate unique class code");
  }

  db.run(
    `INSERT INTO classes (id, name, join_code, instructor_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.name, joinCode, instructorId, now, now]
  );

  return {
    id,
    name: input.name,
    joinCode,
    instructorId,
    createdAt: now,
    updatedAt: now,
  };
}

/** Get a class by ID */
export function getClassById(id: string): Class | null {
  const db = getDb();
  const row = db
    .query<ClassRow, [string]>(
      "SELECT * FROM classes WHERE id = ?"
    )
    .get(id);
  return row ? rowToClass(row) : null;
}

/** Get a class by join code */
export function getClassByJoinCode(code: string): Class | null {
  const db = getDb();
  const row = db
    .query<ClassRow, [string]>(
      "SELECT * FROM classes WHERE join_code = ?"
    )
    .get(code.toLowerCase());
  return row ? rowToClass(row) : null;
}

/** Get all classes for an instructor */
export function getClassesForInstructor(instructorId: string): (Class & { studentCount: number })[] {
  const db = getDb();
  const rows = db
    .query<ClassRow & { student_count: number }, [string]>(
      `SELECT c.*, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       WHERE c.instructor_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`
    )
    .all(instructorId);
  return rows.map((row) => ({
    ...rowToClass(row),
    studentCount: row.student_count,
  }));
}

/** Update a class name */
export function updateClass(
  id: string,
  instructorId: string,
  name: string
): { success: true; data: Class } | { success: false; error: string } {
  const cls = getClassById(id);
  if (!cls) {
    return { success: false, error: "Class not found" };
  }
  if (cls.instructorId !== instructorId) {
    return { success: false, error: "Not authorized" };
  }

  const db = getDb();
  db.run(
    "UPDATE classes SET name = ?, updated_at = datetime('now') WHERE id = ?",
    [name, id]
  );

  return { success: true, data: { ...cls, name } };
}

/** Delete a class (cascades to students) */
export function deleteClass(
  id: string,
  instructorId: string
): { success: true } | { success: false; error: string } {
  const cls = getClassById(id);
  if (!cls) {
    return { success: false, error: "Class not found" };
  }
  if (cls.instructorId !== instructorId) {
    return { success: false, error: "Not authorized" };
  }

  const db = getDb();
  // Enable foreign key enforcement for CASCADE
  db.run("PRAGMA foreign_keys = ON");
  db.run("DELETE FROM classes WHERE id = ?", [id]);

  return { success: true };
}

/** Get the student roster for a class */
export function getClassRoster(classId: string): Student[] {
  const db = getDb();
  const rows = db
    .query<StudentRow, [string]>(
      "SELECT * FROM students WHERE class_id = ? ORDER BY username ASC"
    )
    .all(classId);
  return rows.map(rowToStudent);
}

/** Get a class with its roster */
export function getClassWithRoster(
  classId: string
): ClassWithRoster | null {
  const cls = getClassById(classId);
  if (!cls) return null;
  const students = getClassRoster(classId);
  return { ...cls, students };
}

/** Remove a student from a class (verifies instructor ownership) */
export function removeStudent(
  studentId: string,
  classId: string,
  instructorId: string
): { success: true } | { success: false; error: string } {
  const cls = getClassById(classId);
  if (!cls) {
    return { success: false, error: "Class not found" };
  }
  if (cls.instructorId !== instructorId) {
    return { success: false, error: "Not authorized" };
  }

  const db = getDb();
  const result = db.run(
    "DELETE FROM students WHERE id = ? AND class_id = ?",
    [studentId, classId]
  );

  if (result.changes === 0) {
    return { success: false, error: "Student not found in this class" };
  }

  return { success: true };
}
