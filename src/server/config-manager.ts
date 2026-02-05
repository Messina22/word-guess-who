import { readdir, readFile } from "fs/promises";
import { join, basename } from "path";
import { supabaseAdmin } from "./supabase";
import type { GameConfig, GameConfigInput, GameConfigRow } from "@shared/types";
import {
  validateGameConfigInput,
  generateIdFromName,
} from "@shared/validation";

const CONFIGS_DIR = join(import.meta.dir, "../../configs");
const GAME_CONFIG_COLUMNS =
  "id, name, config_json, owner_id, is_system_template, is_public, created_at, updated_at";

/** Convert a database row to a GameConfig object */
function parseConfigJson(value: unknown): GameConfigInput | null {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as GameConfigInput;
    } catch (error) {
      console.error("Invalid config_json value:", error);
      return null;
    }
  }
  if (value && typeof value === "object") {
    return value as GameConfigInput;
  }
  return null;
}

function rowToConfig(row: GameConfigRow): GameConfig | null {
  const config = parseConfigJson(row.config_json);
  if (!config) return null;

  return {
    ...config,
    id: row.id,
    ownerId: row.owner_id,
    isSystemTemplate: row.is_system_template,
    isPublic: row.is_public,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getConfigRow(id: string): Promise<GameConfigRow | null> {
  const { data, error } = await supabaseAdmin
    .from("game_configs")
    .select(GAME_CONFIG_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching config row:", error);
    return null;
  }

  return data ?? null;
}

/** List game configurations visible to an instructor (their own + public + system) */
export async function listConfigs(instructorId?: string): Promise<GameConfig[]> {
  if (!instructorId) {
    return listPublicConfigs();
  }

  const { data, error } = await supabaseAdmin
    .from("game_configs")
    .select(GAME_CONFIG_COLUMNS)
    .or(
      `is_system_template.eq.true,is_public.eq.true,owner_id.eq.${instructorId}`
    )
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listing configs:", error);
    return [];
  }

  return (data ?? [])
    .map(rowToConfig)
    .filter((config): config is GameConfig => Boolean(config));
}

/** List only public configurations and system templates (for unauthenticated users) */
export async function listPublicConfigs(): Promise<GameConfig[]> {
  const { data, error } = await supabaseAdmin
    .from("game_configs")
    .select(GAME_CONFIG_COLUMNS)
    .or("is_system_template.eq.true,is_public.eq.true")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error listing public configs:", error);
    return [];
  }

  return (data ?? [])
    .map(rowToConfig)
    .filter((config): config is GameConfig => Boolean(config));
}

/** Get a single game configuration by ID (any config, for students entering codes) */
export async function getConfig(id: string): Promise<GameConfig | null> {
  const row = await getConfigRow(id);
  return row ? rowToConfig(row) : null;
}

/** Check if a config with the given ID exists */
export async function configExists(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("game_configs")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Error checking config existence:", error);
    return false;
  }

  return Boolean(data);
}

/** Create a new game configuration */
export async function createConfig(
  input: GameConfigInput & { isPublic?: boolean },
  ownerId?: string,
  isSystemTemplate = false
): Promise<
  { success: true; data: GameConfig } | { success: false; errors: string[] }
> {
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
  if (await configExists(id)) {
    return { success: false, errors: [`Config with ID '${id}' already exists`] };
  }

  const now = new Date().toISOString();
  // System templates are always public; user configs respect the provided isPublic value
  const isPublic = isSystemTemplate ? true : (input.isPublic ?? false);

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
  const configPayload = {
    name: config.name,
    description: config.description,
    author: config.author,
    wordBank: config.wordBank,
    suggestedQuestions: config.suggestedQuestions,
    settings: config.settings,
  };

  const { error } = await supabaseAdmin.from("game_configs").insert({
    id: config.id,
    name: config.name,
    config_json: configPayload,
    owner_id: config.ownerId,
    is_system_template: config.isSystemTemplate,
    is_public: config.isPublic,
    created_at: config.createdAt,
    updated_at: config.updatedAt,
  });

  if (error) {
    console.error("Error creating config:", error);
    return { success: false, errors: [error.message] };
  }

  return { success: true, data: config };
}

/** Update an existing game configuration */
export async function updateConfig(
  id: string,
  input: GameConfigInput & { isPublic?: boolean },
  instructorId?: string
): Promise<
  { success: true; data: GameConfig } | { success: false; errors: string[] }
> {
  // Check if config exists
  const existing = await getConfig(id);
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
  if (newId !== id && (await configExists(newId))) {
    return { success: false, errors: [`Config with ID '${newId}' already exists`] };
  }

  const now = new Date().toISOString();
  const isPublic = typeof input.isPublic === "boolean" ? input.isPublic : existing.isPublic;
  const author = validInput.author ?? existing.author;

  const config: GameConfig = {
    ...validInput,
    id: newId,
    author,
    ownerId: existing.ownerId,
    isSystemTemplate: existing.isSystemTemplate,
    isPublic,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  const configPayload = {
    name: config.name,
    description: config.description,
    author: config.author,
    wordBank: config.wordBank,
    suggestedQuestions: config.suggestedQuestions,
    settings: config.settings,
  };

  if (newId !== id) {
    // ID changed: delete old, insert new
    const { error: deleteError } = await supabaseAdmin
      .from("game_configs")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting old config:", deleteError);
      return { success: false, errors: [deleteError.message] };
    }

    const { error: insertError } = await supabaseAdmin.from("game_configs").insert({
      id: config.id,
      name: config.name,
      config_json: configPayload,
      owner_id: config.ownerId,
      is_system_template: config.isSystemTemplate,
      is_public: config.isPublic,
      created_at: config.createdAt,
      updated_at: config.updatedAt,
    });

    if (insertError) {
      console.error("Error inserting updated config:", insertError);
      return { success: false, errors: [insertError.message] };
    }
  } else {
    // Same ID: update in place
    const { error: updateError } = await supabaseAdmin
      .from("game_configs")
      .update({
        name: config.name,
        config_json: configPayload,
        is_public: config.isPublic,
        updated_at: config.updatedAt,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating config:", updateError);
      return { success: false, errors: [updateError.message] };
    }
  }

  return { success: true, data: config };
}

/** Delete a game configuration */
export async function deleteConfig(
  id: string,
  instructorId?: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Check if config exists
  const existing = await getConfig(id);
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

  const { error } = await supabaseAdmin.from("game_configs").delete().eq("id", id);
  if (error) {
    console.error("Error deleting config:", error);
    return { success: false, error: error.message };
  }
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
        if (!(await configExists(configInput.id!))) {
          // Mark configs loaded from files as system templates (no owner, public)
          const result = await createConfig(configInput, undefined, true);
          if (result.success) {
            console.log(`Loaded system template from ${file}`);
          } else {
            console.error(`Failed to load ${file}:`, result.errors);
          }
        } else {
          // Update existing config to be a system template if it was loaded from a file before
          const configId = configInput.id!;
          const { error } = await supabaseAdmin
            .from("game_configs")
            .update({ is_system_template: true, is_public: true })
            .eq("id", configId)
            .is("owner_id", null);

          if (error) {
            console.error(`Failed to update system template ${configId}:`, error);
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
