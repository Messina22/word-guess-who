import type { User } from "@supabase/supabase-js";
import type { AuthResponse, Instructor, LoginInput, RegisterInput } from "@shared/types";
import { supabaseAdmin, supabaseAuth } from "./supabase";

const FALLBACK_NAME = "Instructor";

function getUserName(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown> | null;
  const metadataName =
    (typeof metadata?.name === "string" ? metadata.name : "") ||
    (typeof metadata?.full_name === "string" ? metadata.full_name : "");
  if (metadataName.trim()) return metadataName.trim();
  if (user.email) {
    const emailPrefix = user.email.split("@")[0];
    if (emailPrefix) return emailPrefix;
  }
  return FALLBACK_NAME;
}

export function mapUserToInstructor(user: User): Instructor {
  return {
    id: user.id,
    email: user.email ?? "",
    name: getUserName(user),
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
  };
}

/** Create a new instructor account */
export async function createInstructor(
  input: RegisterInput
): Promise<
  { success: true; data: AuthResponse } | { success: false; error: string }
> {
  const email = input.email.toLowerCase().trim();
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.name,
    },
  });

  if (createError) {
    const message = createError.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already exists")) {
      return { success: false, error: "An account with this email already exists" };
    }
    return { success: false, error: createError.message };
  }

  const { data: signInData, error: signInError } =
    await supabaseAuth.auth.signInWithPassword({
      email,
      password: input.password,
    });

  if (signInError || !signInData.session || !signInData.user) {
    return {
      success: false,
      error: "Account created, but automatic sign-in failed. Please log in.",
    };
  }

  const instructor = mapUserToInstructor(signInData.user);
  return {
    success: true,
    data: {
      instructor,
      token: signInData.session.access_token,
      refreshToken: signInData.session.refresh_token,
    },
  };
}

/** Authenticate an instructor and return token */
export async function authenticateInstructor(
  input: LoginInput
): Promise<
  { success: true; data: AuthResponse } | { success: false; error: string }
> {
  const email = input.email.toLowerCase().trim();
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password: input.password,
  });

  if (error || !data.session || !data.user) {
    return { success: false, error: "Invalid email or password" };
  }

  const instructor = mapUserToInstructor(data.user);
  return {
    success: true,
    data: {
      instructor,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    },
  };
}
