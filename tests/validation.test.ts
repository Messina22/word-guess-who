import { describe, expect, test } from "bun:test";
import {
  validateGameConfigInput,
  validateGameConfig,
  generateIdFromName,
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  wordEntrySchema,
  questionSchema,
  gameSettingsSchema,
} from "@shared/validation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid game config input for testing */
function validConfigInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Config",
    wordBank: Array.from({ length: 12 }, (_, i) => ({ word: `word${i}` })),
    suggestedQuestions: [{ text: "Does it start with A?", category: "letters" }],
    settings: {
      gridSize: 12,
      allowCustomQuestions: true,
      turnTimeLimit: 0,
      showPhoneticHints: false,
      enableSounds: false,
    },
    ...overrides,
  };
}

// ===========================================================================
// wordEntrySchema
// ===========================================================================

describe("wordEntrySchema", () => {
  test("accepts valid word entry", () => {
    expect(wordEntrySchema.safeParse({ word: "hello" }).success).toBe(true);
  });

  test("accepts word with optional fields", () => {
    const result = wordEntrySchema.safeParse({
      word: "cat",
      phonetic: "/kæt/",
      category: "animals",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty word", () => {
    expect(wordEntrySchema.safeParse({ word: "" }).success).toBe(false);
  });

  test("rejects word exceeding 20 characters", () => {
    expect(
      wordEntrySchema.safeParse({ word: "a".repeat(21) }).success
    ).toBe(false);
  });

  test("accepts word at exactly 20 characters", () => {
    expect(
      wordEntrySchema.safeParse({ word: "a".repeat(20) }).success
    ).toBe(true);
  });
});

// ===========================================================================
// questionSchema
// ===========================================================================

describe("questionSchema", () => {
  test("accepts valid question", () => {
    expect(
      questionSchema.safeParse({
        text: "Does it start with A?",
        category: "letters",
      }).success
    ).toBe(true);
  });

  test("accepts all valid categories", () => {
    const categories = ["letters", "sounds", "length", "patterns", "meaning"];
    for (const category of categories) {
      expect(
        questionSchema.safeParse({ text: "Q?", category }).success
      ).toBe(true);
    }
  });

  test("rejects invalid category", () => {
    expect(
      questionSchema.safeParse({ text: "Q?", category: "colors" }).success
    ).toBe(false);
  });

  test("rejects empty question text", () => {
    expect(
      questionSchema.safeParse({ text: "", category: "letters" }).success
    ).toBe(false);
  });

  test("rejects question exceeding 200 characters", () => {
    expect(
      questionSchema.safeParse({
        text: "a".repeat(201),
        category: "letters",
      }).success
    ).toBe(false);
  });
});

// ===========================================================================
// gameSettingsSchema
// ===========================================================================

describe("gameSettingsSchema", () => {
  test("accepts valid settings", () => {
    const result = gameSettingsSchema.safeParse({
      gridSize: 12,
      allowCustomQuestions: true,
      turnTimeLimit: 0,
      showPhoneticHints: false,
      enableSounds: false,
    });
    expect(result.success).toBe(true);
  });

  test("rejects gridSize below minimum (4)", () => {
    const result = gameSettingsSchema.safeParse({
      gridSize: 3,
      allowCustomQuestions: true,
      turnTimeLimit: 0,
      showPhoneticHints: false,
      enableSounds: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects gridSize above maximum (100)", () => {
    const result = gameSettingsSchema.safeParse({
      gridSize: 101,
      allowCustomQuestions: true,
      turnTimeLimit: 0,
      showPhoneticHints: false,
      enableSounds: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-integer gridSize", () => {
    const result = gameSettingsSchema.safeParse({
      gridSize: 12.5,
      allowCustomQuestions: true,
      turnTimeLimit: 0,
      showPhoneticHints: false,
      enableSounds: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative turnTimeLimit", () => {
    const result = gameSettingsSchema.safeParse({
      gridSize: 12,
      allowCustomQuestions: true,
      turnTimeLimit: -1,
      showPhoneticHints: false,
      enableSounds: false,
    });
    expect(result.success).toBe(false);
  });

  test("rejects turnTimeLimit above 300", () => {
    const result = gameSettingsSchema.safeParse({
      gridSize: 12,
      allowCustomQuestions: true,
      turnTimeLimit: 301,
      showPhoneticHints: false,
      enableSounds: false,
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// validateGameConfigInput
// ===========================================================================

describe("validateGameConfigInput", () => {
  test("accepts valid config input", () => {
    const result = validateGameConfigInput(validConfigInput());
    expect(result.success).toBe(true);
  });

  test("accepts config with optional id", () => {
    const result = validateGameConfigInput(
      validConfigInput({ id: "my-config" })
    );
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = validateGameConfigInput(validConfigInput({ name: "" }));
    expect(result.success).toBe(false);
  });

  test("rejects name exceeding 100 characters", () => {
    const result = validateGameConfigInput(
      validConfigInput({ name: "a".repeat(101) })
    );
    expect(result.success).toBe(false);
  });

  test("rejects word bank with fewer than 12 words", () => {
    const result = validateGameConfigInput(
      validConfigInput({
        wordBank: [{ word: "a" }, { word: "b" }],
      })
    );
    expect(result.success).toBe(false);
  });

  test("rejects word bank with more than 100 words", () => {
    const result = validateGameConfigInput(
      validConfigInput({
        wordBank: Array.from({ length: 101 }, (_, i) => ({
          word: `w${i}`,
        })),
      })
    );
    expect(result.success).toBe(false);
  });

  test("rejects empty suggested questions", () => {
    const result = validateGameConfigInput(
      validConfigInput({ suggestedQuestions: [] })
    );
    expect(result.success).toBe(false);
  });

  test("rejects gridSize larger than word bank", () => {
    const result = validateGameConfigInput(
      validConfigInput({
        settings: {
          gridSize: 20,
          allowCustomQuestions: true,
          turnTimeLimit: 0,
          showPhoneticHints: false,
          enableSounds: false,
        },
      })
    );
    // Word bank has 12 words but grid asks for 20
    expect(result.success).toBe(false);
  });

  test("rejects invalid config id format", () => {
    const result = validateGameConfigInput(
      validConfigInput({ id: "INVALID ID!" })
    );
    expect(result.success).toBe(false);
  });

  test("accepts valid config id format", () => {
    const result = validateGameConfigInput(
      validConfigInput({ id: "my-config-v2" })
    );
    expect(result.success).toBe(true);
  });

  test("returns error messages for invalid input", () => {
    const result = validateGameConfigInput({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// validateGameConfig
// ===========================================================================

describe("validateGameConfig", () => {
  /** Build a valid complete game config for testing */
  function validConfig(overrides: Record<string, unknown> = {}) {
    return {
      id: "test-config",
      name: "Test Config",
      wordBank: Array.from({ length: 12 }, (_, i) => ({ word: `word${i}` })),
      suggestedQuestions: [{ text: "Does it start with A?", category: "letters" }],
      settings: {
        gridSize: 12,
        allowCustomQuestions: true,
        turnTimeLimit: 0,
        showPhoneticHints: false,
        enableSounds: false,
      },
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  test("accepts valid complete config", () => {
    const result = validateGameConfig(validConfig());
    expect(result.success).toBe(true);
  });

  test("rejects config without id", () => {
    const config = validConfig();
    delete (config as Record<string, unknown>).id;
    const result = validateGameConfig(config);
    expect(result.success).toBe(false);
  });

  test("rejects config with invalid id format", () => {
    const result = validateGameConfig(validConfig({ id: "INVALID ID!" }));
    expect(result.success).toBe(false);
  });

  test("rejects config without createdAt", () => {
    const config = validConfig();
    delete (config as Record<string, unknown>).createdAt;
    const result = validateGameConfig(config);
    expect(result.success).toBe(false);
  });

  test("rejects config without updatedAt", () => {
    const config = validConfig();
    delete (config as Record<string, unknown>).updatedAt;
    const result = validateGameConfig(config);
    expect(result.success).toBe(false);
  });

  test("rejects config with invalid datetime format", () => {
    const result = validateGameConfig(validConfig({ createdAt: "not-a-date" }));
    expect(result.success).toBe(false);
  });

  test("rejects gridSize larger than word bank", () => {
    const result = validateGameConfig(
      validConfig({
        settings: {
          gridSize: 20,
          allowCustomQuestions: true,
          turnTimeLimit: 0,
          showPhoneticHints: false,
          enableSounds: false,
        },
      })
    );
    // Word bank has 12 words but grid asks for 20
    expect(result.success).toBe(false);
  });

  test("returns error messages for invalid input", () => {
    const result = validateGameConfig({});
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ===========================================================================
// generateIdFromName
// ===========================================================================

describe("generateIdFromName", () => {
  test("converts name to lowercase hyphenated slug", () => {
    expect(generateIdFromName("My Config Name")).toBe("my-config-name");
  });

  test("removes special characters", () => {
    expect(generateIdFromName("Hello! World @#$")).toBe("hello-world");
  });

  test("trims leading and trailing hyphens", () => {
    expect(generateIdFromName("  --hello--  ")).toBe("hello");
  });

  test("truncates to 50 characters", () => {
    const longName = "a".repeat(100);
    expect(generateIdFromName(longName).length).toBeLessThanOrEqual(50);
  });

  test("handles empty string", () => {
    expect(generateIdFromName("")).toBe("");
  });

  test("collapses consecutive special characters into single hyphen", () => {
    expect(generateIdFromName("foo   bar")).toBe("foo-bar");
    expect(generateIdFromName("foo---bar")).toBe("foo-bar");
  });
});

// ===========================================================================
// validateRegisterInput
// ===========================================================================

describe("validateRegisterInput", () => {
  test("accepts valid registration input", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      name: "Test User",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid email", () => {
    const result = validateRegisterInput({
      email: "not-an-email",
      password: "password123",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects short password", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "short",
      name: "Test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty name", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "password123",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects password exceeding 100 characters", () => {
    const result = validateRegisterInput({
      email: "test@example.com",
      password: "a".repeat(101),
      name: "Test",
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// validateLoginInput
// ===========================================================================

describe("validateLoginInput", () => {
  test("accepts valid login input", () => {
    const result = validateLoginInput({
      email: "test@example.com",
      password: "any-password",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid email", () => {
    const result = validateLoginInput({
      email: "bad",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty password", () => {
    const result = validateLoginInput({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// validateForgotPasswordInput
// ===========================================================================

describe("validateForgotPasswordInput", () => {
  test("accepts valid email", () => {
    const result = validateForgotPasswordInput({ email: "user@test.com" });
    expect(result.success).toBe(true);
  });

  test("rejects invalid email", () => {
    const result = validateForgotPasswordInput({ email: "nope" });
    expect(result.success).toBe(false);
  });

  test("rejects missing email", () => {
    const result = validateForgotPasswordInput({});
    expect(result.success).toBe(false);
  });
});

// ===========================================================================
// validateResetPasswordInput
// ===========================================================================

describe("validateResetPasswordInput", () => {
  test("accepts valid reset input", () => {
    const result = validateResetPasswordInput({
      token: "abc123",
      password: "newpassword123",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty token", () => {
    const result = validateResetPasswordInput({
      token: "",
      password: "newpassword123",
    });
    expect(result.success).toBe(false);
  });

  test("rejects short password", () => {
    const result = validateResetPasswordInput({
      token: "abc123",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing fields", () => {
    expect(validateResetPasswordInput({}).success).toBe(false);
    expect(validateResetPasswordInput({ token: "abc" }).success).toBe(false);
    expect(
      validateResetPasswordInput({ password: "longpassword" }).success
    ).toBe(false);
  });
});
