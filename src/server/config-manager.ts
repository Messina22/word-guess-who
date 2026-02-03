import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { getDb } from "./db";
import type { GameConfig, GameConfigInput, GameConfigRow } from "@shared/types";
import {
  validateGameConfigInput,
  generateIdFromName,
} from "@shared/validation";

const CONFIGS_DIR = join(import.meta.dir, "../../configs");

/** Convert a database row to a GameConfig object */
function rowToConfig(row: GameConfigRow): GameConfig {
  const config = JSON.parse(row.config_json);
  return {
    ...config,
    id: row.id,
    ownerId: row.owner_id,
    isSystemTemplate: row.is_system_template === 1,
    isPublic: row.is_public === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** List game configurations visible to an instructor (their own + public + system) */
export function listConfigs(instructorId?: string): GameConfig[] {
  const db = getDb();
  const rows = db
    .query<GameConfigRow, [string | null]>(
      `SELECT id, name, config_json, owner_id, is_system_template, is_public, created_at, updated_at
       FROM game_configs
       WHERE is_system_template = 1
          OR is_public = 1
          OR owner_id = ?
       ORDER BY updated_at DESC`
    )
    .all(instructorId ?? null);
  return rows.map(rowToConfig);
}

/** List only public configurations and system templates (for unauthenticated users) */
export function listPublicConfigs(): GameConfig[] {
  const db = getDb();
  const rows = db
    .query<GameConfigRow, []>(
      `SELECT id, name, config_json, owner_id, is_system_template, is_public, created_at, updated_at
       FROM game_configs
       WHERE is_system_template = 1 OR is_public = 1
       ORDER BY updated_at DESC`
    )
    .all();
  return rows.map(rowToConfig);
}

/** Get a single game configuration by ID (any config, for students entering codes) */
export function getConfig(id: string): GameConfig | null {
  const db = getDb();
  const row = db
    .query<GameConfigRow, [string]>(
      `SELECT id, name, config_json, owner_id, is_system_template, is_public, created_at, updated_at
       FROM game_configs WHERE id = ?`
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
  input: GameConfigInput,
  ownerId?: string,
  isSystemTemplate = false
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
  const isPublic = isSystemTemplate; // System templates are always public

  const config: GameConfig = {
    ...validInput,
    id,
    ownerId: ownerId ?? null,
    isSystemTemplate,
    isPublic,
    createdAt: now,
    updatedAt: now,
  };

  // Store in database (config_json excludes id, timestamps, and ownership since they're in columns)
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
    `INSERT INTO game_configs (id, name, config_json, owner_id, is_system_template, is_public, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [config.id, config.name, configJson, config.ownerId, isSystemTemplate ? 1 : 0, isPublic ? 1 : 0, config.createdAt, config.updatedAt]
  );

  return { success: true, data: config };
}

/** Update an existing game configuration */
export function updateConfig(
  id: string,
  input: GameConfigInput & { isPublic?: boolean },
  instructorId?: string
): { success: true; data: GameConfig } | { success: false; errors: string[] } {
  // Check if config exists
  const existing = getConfig(id);
  if (!existing) {
    return { success: false, errors: [`Config with ID '${id}' not found`] };
  }

  // Ownership checks are done in the route handler, but double-check here
  if (existing.isSystemTemplate) {
    return { success: false, errors: ["System templates cannot be modified"] };
  }

  if (instructorId && existing.ownerId !== instructorId) {
    return { success: false, errors: ["You do not have permission to edit this configuration"] };
  }

  // Validate input
  const validation = validateGameConfigInput(input);
  if (!validation.success) {
    return validation;
  }

  const validInput = validation.data;

  // If ID is being changed, check for conflicts
  const newId = validInput.id || id;
  if (newId !== id && configExists(newId)) {
    return { success: false, errors: [`Config with ID '${newId}' already exists`] };
  }

  const now = new Date().toISOString();
  const isPublic = typeof input.isPublic === "boolean" ? input.isPublic : existing.isPublic;

  const config: GameConfig = {
    ...validInput,
    id: newId,
    ownerId: existing.ownerId,
    isSystemTemplate: existing.isSystemTemplate,
    isPublic,
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
      `INSERT INTO game_configs (id, name, config_json, owner_id, is_system_template, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [config.id, config.name, configJson, config.ownerId, config.isSystemTemplate ? 1 : 0, config.isPublic ? 1 : 0, config.createdAt, config.updatedAt]
    );
  } else {
    // Same ID: update in place
    db.run(
      `UPDATE game_configs SET name = ?, config_json = ?, is_public = ?, updated_at = ? WHERE id = ?`,
      [config.name, configJson, config.isPublic ? 1 : 0, config.updatedAt, id]
    );
  }

  return { success: true, data: config };
}

/** Delete a game configuration */
export function deleteConfig(
  id: string,
  instructorId?: string
): { success: true } | { success: false; error: string } {
  // Check if config exists
  const existing = getConfig(id);
  if (!existing) {
    return { success: false, error: `Config with ID '${id}' not found` };
  }

  // Ownership checks are done in the route handler, but double-check here
  if (existing.isSystemTemplate) {
    return { success: false, error: "System templates cannot be deleted" };
  }

  if (instructorId && existing.ownerId !== instructorId) {
    return { success: false, error: "You do not have permission to delete this configuration" };
  }

  const db = getDb();
  db.run("DELETE FROM game_configs WHERE id = ?", [id]);
  return { success: true };
}

/** Load JSON config files from the configs directory into the database as system templates */
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
          // Mark configs loaded from files as system templates (no owner, public)
          const result = createConfig(configInput, undefined, true);
          if (result.success) {
            console.log(`Loaded system template from ${file}`);
          } else {
            console.error(`Failed to load ${file}:`, result.errors);
          }
        } else {
          // Update existing config to be a system template if it was loaded from a file before
          const db = getDb();
          const configId = configInput.id!;
          db.run(
            "UPDATE game_configs SET is_system_template = 1, is_public = 1 WHERE id = ? AND owner_id IS NULL",
            [configId]
          );
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
