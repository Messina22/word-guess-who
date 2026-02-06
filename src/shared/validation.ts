import { z } from "zod";
import type {
  GameConfig,
  GameConfigInput,
  GameSettings,
  Question,
  WordEntry,
  RegisterInput,
  LoginInput,
} from "./types";

/** Valid question categories */
const questionCategories = [
  "letters",
  "sounds",
  "length",
  "patterns",
  "meaning",
] as const;


/** Schema for a word entry */
export const wordEntrySchema = z.object({
  word: z
    .string()
    .min(1, "Word cannot be empty")
    .max(20, "Word must be 20 characters or less"),
  phonetic: z.string().optional(),
  category: z.string().optional(),
});

/** Schema for a suggested question */
export const questionSchema = z.object({
  text: z
    .string()
    .min(1, "Question text cannot be empty")
    .max(200, "Question must be 200 characters or less"),
  category: z.enum(questionCategories, {
    errorMap: () => ({
      message: `Category must be one of: ${questionCategories.join(", ")}`,
    }),
  }),
});

/** Schema for game settings */
export const gameSettingsSchema = z.object({
  gridSize: z
    .number()
    .int("Grid size must be a whole number")
    .min(4, "Grid size must be at least 4")
    .max(100, "Grid size cannot exceed 100"),
  allowCustomQuestions: z.boolean(),
  turnTimeLimit: z
    .number()
    .int()
    .min(0, "Turn time limit cannot be negative")
    .max(300, "Turn time limit cannot exceed 300 seconds"),
  showPhoneticHints: z.boolean(),
  enableSounds: z.boolean(),
});

/** Schema for config ID */
const configIdSchema = z
  .string()
  .min(1, "ID cannot be empty")
  .max(50, "ID must be 50 characters or less")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "ID must be lowercase alphanumeric with hyphens (e.g., 'my-config-v1')"
  );

/** Base schema for game config input (without refinements) */
const gameConfigInputBaseSchema = z.object({
  id: configIdSchema.optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less"),
  description: z.string().max(500, "Description must be 500 characters or less").optional(),
  author: z.string().max(100, "Author must be 100 characters or less").optional(),
  wordBank: z
    .array(wordEntrySchema)
    .min(12, "Word bank must contain at least 12 words")
    .max(100, "Word bank cannot exceed 100 words"),
  suggestedQuestions: z
    .array(questionSchema)
    .min(1, "At least one suggested question is required")
    .max(50, "Cannot have more than 50 suggested questions"),
  settings: gameSettingsSchema,
});

/** Schema for game config input (creation/update) */
export const gameConfigInputSchema = gameConfigInputBaseSchema.refine(
  (data) => data.settings.gridSize <= data.wordBank.length,
  {
    message: "Grid size cannot exceed the number of words in the word bank",
    path: ["settings", "gridSize"],
  }
);

/** Schema for a complete game config (with auto-generated fields) */
export const gameConfigSchema = gameConfigInputBaseSchema.extend({
  id: configIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).refine(
  (data) => data.settings.gridSize <= data.wordBank.length,
  {
    message: "Grid size cannot exceed the number of words in the word bank",
    path: ["settings", "gridSize"],
  }
);

/** Validate game config input and return typed result */
export function validateGameConfigInput(data: unknown): {
  success: true;
  data: GameConfigInput;
} | {
  success: false;
  errors: string[];
} {
  const result = gameConfigInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as GameConfigInput };
  }
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { success: false, errors };
}

/** Validate a complete game config */
export function validateGameConfig(data: unknown): {
  success: true;
  data: GameConfig;
} | {
  success: false;
  errors: string[];
} {
  const result = gameConfigSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data as GameConfig };
  }
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { success: false, errors };
}

/** Generate a URL-safe ID from a name */
export function generateIdFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

// ============================================
// Auth Validation Schemas
// ============================================

/** Email validation schema */
export const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .max(255, "Email must be 255 characters or less");

/** Password validation schema */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be 100 characters or less");

/** Name validation schema for instructors */
export const instructorNameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must be 100 characters or less");

/** Schema for registration input */
export const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: instructorNameSchema,
});

/** Schema for login input */
export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/** Validate registration input */
export function validateRegisterInput(data: unknown): {
  success: true;
  data: RegisterInput;
} | {
  success: false;
  errors: string[];
} {
  const result = registerInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { success: false, errors };
}

/** Validate login input */
export function validateLoginInput(data: unknown): {
  success: true;
  data: LoginInput;
} | {
  success: false;
  errors: string[];
} {
  const result = loginInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { success: false, errors };
}

// ============================================
// Forgot / Reset Password Validation
// ============================================

/** Schema for forgot password input */
export const forgotPasswordInputSchema = z.object({
  email: emailSchema,
});

/** Schema for reset password input */
export const resetPasswordInputSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordSchema,
});

/** Validate forgot password input */
export function validateForgotPasswordInput(data: unknown): {
  success: true;
  data: { email: string };
} | {
  success: false;
  errors: string[];
} {
  const result = forgotPasswordInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { success: false, errors };
}

/** Validate reset password input */
export function validateResetPasswordInput(data: unknown): {
  success: true;
  data: { token: string; password: string };
} | {
  success: false;
  errors: string[];
} {
  const result = resetPasswordInputSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.errors.map((e) => {
    const path = e.path.join(".");
    return path ? `${path}: ${e.message}` : e.message;
  });
  return { success: false, errors };
}
