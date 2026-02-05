import type { Instructor } from "@shared/types";
import { supabaseAdmin } from "./supabase";
import { mapUserToInstructor } from "./instructor-manager";

/** Verify a Supabase access token and return the instructor */
export async function verifyToken(token: string): Promise<Instructor | null> {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return mapUserToInstructor(data.user);
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
