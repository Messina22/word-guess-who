import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const DEFAULT_SECRET = "development-secret-change-in-production";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable must be set in production. " +
    "Using the default secret in production would allow token forgery."
  );
}

const JWT_SECRET = new globalThis.TextEncoder().encode(
  process.env.JWT_SECRET || DEFAULT_SECRET
);
const INSTRUCTOR_JWT_EXPIRATION = "7d";
const STUDENT_JWT_EXPIRATION = "24h";

export interface InstructorTokenPayload extends JWTPayload {
  role: "instructor";
  instructorId: string;
  email: string;
}

export interface StudentTokenPayload extends JWTPayload {
  role: "student";
  studentId: string;
  classId: string;
  username: string;
}

export type TokenPayload = InstructorTokenPayload | StudentTokenPayload;

/** Hash a password using bcrypt via Bun */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

/** Verify a password against a hash */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

/** Generate a JWT token for an instructor */
export async function generateToken(
  instructorId: string,
  email: string
): Promise<string> {
  return await new SignJWT({ role: "instructor", instructorId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(INSTRUCTOR_JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/** Generate a JWT token for a student */
export async function generateStudentToken(
  studentId: string,
  classId: string,
  username: string
): Promise<string> {
  return await new SignJWT({ role: "student", studentId, classId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(STUDENT_JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/** Verify and decode a JWT token */
export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Check for student token
    if (
      payload.role === "student" &&
      typeof payload.studentId === "string" &&
      typeof payload.classId === "string" &&
      typeof payload.username === "string"
    ) {
      return payload as StudentTokenPayload;
    }

    // Instructor token (role may be missing for backward compat with old tokens)
    if (
      typeof payload.instructorId === "string" &&
      typeof payload.email === "string"
    ) {
      return { ...payload, role: "instructor" } as InstructorTokenPayload;
    }

    return null;
  } catch {
    return null;
  }
}

/** Extract token from Authorization header */
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}
