import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { getDb } from "./db";
import type { GameConfig, GameConfigInput, GameConfigRow } from "@shared/types";
import {
  validateGameConfigInput,
  generateIdFromName,
} from "@shared/validation";

const CONFIGS_DIR = join(import.meta.dir, "../../configs");

/** Normalize author name for comparison (lowercase, trimmed) */
function normalizeAuthor(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

/** Convert a database row to a GameConfig object */
function rowToConfig(row: GameConfigRow): GameConfig {
  const config = JSON.parse(row.config_json);
  return {
    ...config,
    id: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** List all game configurations */
export function listConfigs(): GameConfig[] {
  const db = getDb();
  const rows = db
    .query<GameConfigRow, []>(
      "SELECT id, name, config_json, created_at, updated_at FROM game_configs ORDER BY updated_at DESC"
    )
    .all();
  return rows.map(rowToConfig);
}

/** Get a single game configuration by ID */
export function getConfig(id: string): GameConfig | null {
  const db = getDb();
  const row = db
    .query<GameConfigRow, [string]>(
      "SELECT id, name, config_json, created_at, updated_at FROM game_configs WHERE id = ?"
    )
    .get(id);
  return row ? rowToConfig(row) : null;
}

/** Check if a config with the given ID exists */
export function configExists(id: string): boolean {
  const db = getDb();
  const row = db
    .query<{ count: number }, [string]>(
      "SELECT COUNT(*) as count FROM game_configs WHERE id = ?"
    )
    .get(id);
  return (row?.count ?? 0) > 0;
}

/** Create a new game configuration */
export function createConfig(
  input: GameConfigInput
): { success: true; data: GameConfig } | { success: false; errors: string[] } {
  // Validate input
  const validation = validateGameConfigInput(input);
  if (!validation.success) {
    return validation;
  }

  const validInput = validation.data;

  // Generate ID if not provided
  const generatedId = generateIdFromName(validInput.name);
  if (!validInput.id && !generatedId) {
    return { success: false, errors: ["Unable to generate valid ID from config name. Please provide an ID manually."] };
  }
  const id = validInput.id || generatedId;

  // Check for duplicate ID
  if (configExists(id)) {
    return { success: false, errors: [`Config with ID '${id}' already exists`] };
  }

  const now = new Date().toISOString();
  const config: GameConfig = {
    ...validInput,
    id,
    createdAt: now,
    updatedAt: now,
  };

  // Store in database (config_json excludes id and timestamps since they're in columns)
  const configJson = JSON.stringify({
    name: config.name,
    description: config.description,
    author: config.author,
    wordBank: config.wordBank,
    suggestedQuestions: config.suggestedQuestions,
    settings: config.settings,
  });

  const db = getDb();
  db.run(
    "INSERT INTO game_configs (id, name, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [config.id, config.name, configJson, config.createdAt, config.updatedAt]
  );

  return { success: true, data: config };
}

/** Update an existing game configuration */
export function updateConfig(
  id: string,
  input: GameConfigInput
): { success: true; data: GameConfig } | { success: false; errors: string[] } {
  // Check if config exists
  const existing = getConfig(id);
  if (!existing) {
    return { success: false, errors: [`Config with ID '${id}' not found`] };
  }

  // Verify ownership: requesting author must match existing author
  const existingAuthor = normalizeAuthor(existing.author);
  const requestingAuthor = normalizeAuthor(input.author);
  if (existingAuthor !== "" && existingAuthor !== requestingAuthor) {
    return { success: false, errors: ["You do not have permission to edit this configuration"] };
  }

  // Validate input
  const validation = validateGameConfigInput(input);
  if (!validation.success) {
    return validation;
  }

  const validInput = validation.data;
  const author = validInput.author ?? existing.author;

  // If ID is being changed, check for conflicts
  const newId = validInput.id || id;
  if (newId !== id && configExists(newId)) {
    return { success: false, errors: [`Config with ID '${newId}' already exists`] };
  }

  const now = new Date().toISOString();
  const config: GameConfig = {
    ...validInput,
    id: newId,
    author,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const configJson = JSON.stringify({
    name: config.name,
    description: config.description,
    author: config.author,
    wordBank: config.wordBank,
    suggestedQuestions: config.suggestedQuestions,
    settings: config.settings,
  });

  const db = getDb();

  if (newId !== id) {
    // ID changed: delete old, insert new
    db.run("DELETE FROM game_configs WHERE id = ?", [id]);
    db.run(
      "INSERT INTO game_configs (id, name, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [config.id, config.name, configJson, config.createdAt, config.updatedAt]
    );
  } else {
    // Same ID: update in place
    db.run(
      "UPDATE game_configs SET name = ?, config_json = ?, updated_at = ? WHERE id = ?",
      [config.name, configJson, config.updatedAt, id]
    );
  }

  return { success: true, data: config };
}

/** Delete a game configuration */
export function deleteConfig(
  id: string,
  requestingAuthor?: string
): { success: true } | { success: false; error: string } {
  // Check if config exists and get author
  const existing = getConfig(id);
  if (!existing) {
    return { success: false, error: `Config with ID '${id}' not found` };
  }

  // Verify ownership: requesting author must match existing author
  const existingAuthor = normalizeAuthor(existing.author);
  const normalizedRequestingAuthor = normalizeAuthor(requestingAuthor);
  if (existingAuthor !== "" && existingAuthor !== normalizedRequestingAuthor) {
    return { success: false, error: "You do not have permission to delete this configuration" };
  }

  const db = getDb();
  db.run("DELETE FROM game_configs WHERE id = ?", [id]);
  return { success: true };
}

/** Load JSON config files from the configs directory into the database */
export async function loadConfigsFromFiles(): Promise<void> {
  try {
    const files = await readdir(CONFIGS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = join(CONFIGS_DIR, file);
      try {
        const content = await readFile(filePath, "utf-8");
        const data = JSON.parse(content);

        // Generate ID from filename if not in data
        const fileId = basename(file, ".json");
        const configInput: GameConfigInput = {
          id: data.id || fileId,
          name: data.name,
          description: data.description,
          author: data.author,
          wordBank: data.wordBank,
          suggestedQuestions: data.suggestedQuestions,
          settings: data.settings,
        };

        // Only load if not already in database
        if (!configExists(configInput.id!)) {
          const result = createConfig(configInput);
          if (result.success) {
            console.log(`Loaded config from ${file}`);
          } else {
            console.error(`Failed to load ${file}:`, result.errors);
          }
        }
      } catch (err) {
        console.error(`Error loading ${file}:`, err);
      }
    }
  } catch (err) {
    // configs directory might not exist yet
    console.log("No configs directory found, skipping file loading");
  }
}
