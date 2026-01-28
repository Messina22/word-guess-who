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

/** Initialize the database schema */
function initSchema(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS game_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      config_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index for listing configs
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_game_configs_updated_at
    ON game_configs(updated_at DESC)
  `);
}

/** Close the database connection */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
