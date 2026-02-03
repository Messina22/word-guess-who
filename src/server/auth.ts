import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const JWT_SECRET = new globalThis.TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-change-in-production"
);
const JWT_EXPIRATION = "7d";

export interface TokenPayload extends JWTPayload {
  instructorId: string;
  email: string;
}

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
  return await new SignJWT({ instructorId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/** Verify and decode a JWT token */
export async function verifyToken(
  token: string
): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (
      typeof payload.instructorId === "string" &&
      typeof payload.email === "string"
    ) {
      return payload as TokenPayload;
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
