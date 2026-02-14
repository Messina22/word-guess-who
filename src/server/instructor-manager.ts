import { nanoid } from "nanoid";
import { randomBytes, createHash } from "crypto";
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

/** Get an instructor password hash by ID */
export function getInstructorPasswordHashById(id: string): string | null {
  const db = getDb();
  const row = db
    .query<{ password_hash: string }, [string]>(
      `SELECT password_hash FROM instructors WHERE id = ?`
    )
    .get(id);

  return row?.password_hash ?? null;
}

/** Get an instructor by email (case-insensitive) */
export function getInstructorByEmail(email: string): Instructor | null {
  const db = getDb();
  const row = db
    .query<InstructorRow, [string]>(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM instructors WHERE LOWER(email) = LOWER(?)`
    )
    .get(email);

  return row ? rowToInstructor(row) : null;
}

/** List all instructors (for local development tooling) */
export function listInstructors(): Instructor[] {
  const db = getDb();
  const rows = db
    .query<InstructorRow, []>(
      `SELECT id, email, password_hash, name, created_at, updated_at
       FROM instructors
       ORDER BY datetime(created_at) ASC`
    )
    .all();

  return rows.map(rowToInstructor);
}

/** Hash a token with SHA-256 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Create a password reset token for an instructor, invalidating any previous unused tokens */
export function createPasswordResetToken(instructorId: string): string {
  const db = getDb();
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const id = nanoid();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  // Invalidate any previous unused tokens for this instructor
  db.run(
    `UPDATE password_reset_tokens SET used_at = datetime('now')
     WHERE instructor_id = ? AND used_at IS NULL`,
    [instructorId]
  );

  db.run(
    `INSERT INTO password_reset_tokens (id, instructor_id, token_hash, expires_at)
     VALUES (?, ?, ?, ?)`,
    [id, instructorId, tokenHash, expiresAt]
  );

  return token;
}

/** Verify a reset token — returns instructor ID if valid, null otherwise */
export function verifyResetToken(token: string): string | null {
  const db = getDb();
  const tokenHash = hashToken(token);
  const row = db
    .query<{ instructor_id: string; expires_at: string; used_at: string | null }, [string]>(
      `SELECT instructor_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = ?`
    )
    .get(tokenHash);

  if (!row) return null;
  if (row.used_at) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  return row.instructor_id;
}

/** Mark a reset token as used */
export function consumeResetToken(token: string): void {
  const db = getDb();
  const tokenHash = hashToken(token);
  db.run(
    `UPDATE password_reset_tokens SET used_at = datetime('now')
     WHERE token_hash = ?`,
    [tokenHash]
  );
}

/** Update an instructor's password.
 * When expectedOldHash is provided, performs an atomic update that only succeeds
 * if the current password hash matches. Returns true if the update succeeded,
 * false if the expectedOldHash didn't match (indicating the password was changed
 * by another concurrent request).
 * When expectedOldHash is not provided, performs a regular update (for token-based resets).
 */
export function updateInstructorPassword(
  instructorId: string,
  newPasswordHash: string,
  expectedOldHash?: string
): boolean {
  const db = getDb();
  if (expectedOldHash !== undefined) {
    // Atomic update: only succeeds if current hash matches expected
    const result = db.run(
      `UPDATE instructors SET password_hash = ?, updated_at = datetime('now')
       WHERE id = ? AND password_hash = ?`,
      [newPasswordHash, instructorId, expectedOldHash]
    );
    return result.changes > 0;
  } else {
    // Non-atomic update: for token-based resets
    const result = db.run(
      `UPDATE instructors SET password_hash = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [newPasswordHash, instructorId]
    );
    return result.changes > 0;
  }
}
