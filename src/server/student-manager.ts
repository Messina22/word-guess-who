import { nanoid } from "nanoid";
import { getDb } from "./db";
import { generateStudentToken } from "./auth";
import { getClassByJoinCode, rowToStudent } from "./class-manager";
import type {
  Student,
  StudentRow,
  StudentAuthResponse,
} from "@shared/types";

/** Login or create a student — returns student + token */
export async function loginOrCreateStudent(
  classCode: string,
  username: string
): Promise<
  { success: true; data: StudentAuthResponse } | { success: false; error: string }
> {
  const cls = getClassByJoinCode(classCode);
  if (!cls) {
    return { success: false, error: "Class not found. Check the code and try again." };
  }

  const db = getDb();
  const trimmedUsername = username.trim();

  // Case-insensitive lookup for existing student
  const existingRow = db
    .query<StudentRow, [string, string]>(
      `SELECT * FROM students
       WHERE LOWER(username) = LOWER(?) AND class_id = ?`
    )
    .get(trimmedUsername, cls.id);

  let student: Student;

  if (existingRow) {
    // Update last_seen_at
    db.run(
      "UPDATE students SET last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      [existingRow.id]
    );
    student = rowToStudent(existingRow);
    student.lastSeenAt = new Date().toISOString();
  } else {
    // Create new student
    const id = nanoid();
    const now = new Date().toISOString();

    try {
      db.run(
        `INSERT INTO students (id, username, class_id, last_seen_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, trimmedUsername, cls.id, now, now, now]
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE")) {
        return {
          success: false,
          error: "That username is already taken in this class",
        };
      }
      throw error;
    }

    student = {
      id,
      username: trimmedUsername,
      classId: cls.id,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    };
  }

  const token = await generateStudentToken(student.id, cls.id, student.username);

  return {
    success: true,
    data: {
      student,
      className: cls.name,
      token,
    },
  };
}

/** Get a student by ID */
export function getStudentById(id: string): Student | null {
  const db = getDb();
  const row = db
    .query<StudentRow, [string]>(
      "SELECT * FROM students WHERE id = ?"
    )
    .get(id);
  return row ? rowToStudent(row) : null;
}
