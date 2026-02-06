import { Database } from "bun:sqlite";
import { join } from "path";

const DATA_DIR = join(import.meta.dir, "../../data");
const DB_PATH = join(DATA_DIR, "game.db");

let db: Database | null = null;

/** Get the database connection, creating it if needed */
export function getDb(): Database {
  if (db) return db;

  // Ensure data directory exists
  const fs = require("fs");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrency
  db.run("PRAGMA journal_mode = WAL");

  // Initialize schema
  initSchema(db);

  return db;
}

/** Check if a column exists in a table */
function columnExists(db: Database, table: string, column: string): boolean {
  const result = db.query<{ name: string }, []>(
    `PRAGMA table_info(${table})`
  ).all();
  return result.some((row) => row.name === column);
}

/** Initialize the database schema */
function initSchema(db: Database): void {
  // Create instructors table
  db.run(`
    CREATE TABLE IF NOT EXISTS instructors (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index for email lookup
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_instructors_email
    ON instructors(email)
  `);

  // Create game_configs table
  db.run(`
    CREATE TABLE IF NOT EXISTS game_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      owner_id TEXT,
      is_system_template INTEGER NOT NULL DEFAULT 0,
      is_public INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (owner_id) REFERENCES instructors(id)
    )
  `);

  // Migrate existing game_configs table if needed
  if (!columnExists(db, "game_configs", "owner_id")) {
    db.run("ALTER TABLE game_configs ADD COLUMN owner_id TEXT");
  }
  if (!columnExists(db, "game_configs", "is_system_template")) {
    db.run("ALTER TABLE game_configs ADD COLUMN is_system_template INTEGER NOT NULL DEFAULT 0");
  }
  if (!columnExists(db, "game_configs", "is_public")) {
    db.run("ALTER TABLE game_configs ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0");
  }

  // Create index for listing configs
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_game_configs_updated_at
    ON game_configs(updated_at DESC)
  `);

  // Create index for owner lookup
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_game_configs_owner_id
    ON game_configs(owner_id)
  `);

  // Create password reset tokens table
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      instructor_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_instructor_id
    ON password_reset_tokens(instructor_id)
  `);
}

/** Close the database connection */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
