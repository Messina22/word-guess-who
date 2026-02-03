import { nanoid } from "nanoid";
import { getDb } from "./db";
import { hashPassword, verifyPassword, generateToken } from "./auth";
import type {
  Instructor,
  InstructorRow,
  AuthResponse,
  RegisterInput,
  LoginInput,
} from "@shared/types";

/** Convert a database row to an Instructor object */
function rowToInstructor(row: InstructorRow): Instructor {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Check if an email is already registered */
export function emailExists(email: string): boolean {
  const db = getDb();
  const row = db
    .query<
      { count: number },
      [string]
    >("SELECT COUNT(*) as count FROM instructors WHERE LOWER(email) = LOWER(?)")
    .get(email);
  return (row?.count ?? 0) > 0;
}

/** Create a new instructor account */
export async function createInstructor(
  input: RegisterInput
): Promise<
  { success: true; data: AuthResponse } | { success: false; error: string }
> {
  // Check for duplicate email
  if (emailExists(input.email)) {
    return {
      success: false,
      error: "An account with this email already exists",
    };
  }

  const id = nanoid();
  const passwordHash = await hashPassword(input.password);
  const now = new Date().toISOString();

  try {
    const db = getDb();
    db.run(
      `INSERT INTO instructors (id, email, password_hash, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, input.email.toLowerCase(), passwordHash, input.name, now, now]
    );
  } catch (error) {
    console.error("Database error creating instructor:", error);
    // Check for UNIQUE constraint violation (race condition)
    if (error instanceof Error && error.message.includes("UNIQUE")) {
      return {
        success: false,
        error: "An account with this email already exists",
      };
    }
    throw error; // Re-throw other errors to be caught by route handler
  }

  const instructor: Instructor = {
    id,
    email: input.email.toLowerCase(),
    name: input.name,
    createdAt: now,
    updatedAt: now,
  };

  const token = await generateToken(id, instructor.email);

  return { success: true, data: { instructor, token } };
}

/** Authenticate an instructor and return token */
export async function authenticateInstructor(
  input: LoginInput
): Promise<
  { success: true; data: AuthResponse } | { success: false; error: string }
> {
  const db = getDb();
  const row = db
    .query<InstructorRow, [string]>(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM instructors WHERE LOWER(email) = LOWER(?)`
    )
    .get(input.email);

  if (!row) {
    return { success: false, error: "Invalid email or password" };
  }

  const validPassword = await verifyPassword(input.password, row.password_hash);
  if (!validPassword) {
    return { success: false, error: "Invalid email or password" };
  }

  const instructor = rowToInstructor(row);
  const token = await generateToken(instructor.id, instructor.email);

  return { success: true, data: { instructor, token } };
}

/** Get an instructor by ID */
export function getInstructorById(id: string): Instructor | null {
  const db = getDb();
  const row = db
    .query<InstructorRow, [string]>(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM instructors WHERE id = ?`
    )
    .get(id);

  return row ? rowToInstructor(row) : null;
}
