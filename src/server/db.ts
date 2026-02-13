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

  // Enable foreign key enforcement (required per-connection in SQLite)
  db.run("PRAGMA foreign_keys = ON");

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

/** Check if the students table needs migration for case-insensitive UNIQUE constraint */
function migrateStudentsTableCollation(db: Database): void {
  // Check the current table schema for the COLLATE NOCASE in the UNIQUE constraint
  const tableInfo = db.query<{ sql: string }, []>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='students'`
  ).get();

  if (!tableInfo || !tableInfo.sql) {
    return; // Table doesn't exist yet
  }

  // If the schema already has COLLATE NOCASE, no migration needed
  if (tableInfo.sql.toUpperCase().includes("COLLATE NOCASE")) {
    return;
  }

  // Need to recreate the table with the correct constraint
  // Use a transaction to ensure atomicity
  db.run("BEGIN TRANSACTION");
  try {
    // Create new table with correct constraint
    db.run(`
      CREATE TABLE students_new (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        class_id TEXT NOT NULL,
        last_seen_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(username COLLATE NOCASE, class_id),
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
      )
    `);

    // Copy data from old table
    db.run(`
      INSERT INTO students_new (id, username, class_id, last_seen_at, created_at, updated_at)
      SELECT id, username, class_id, last_seen_at, created_at, updated_at FROM students
    `);

    // Drop old table
    db.run("DROP TABLE students");

    // Rename new table
    db.run("ALTER TABLE students_new RENAME TO students");

    // Recreate the index
    db.run(`
      CREATE INDEX IF NOT EXISTS idx_students_class_id
      ON students(class_id)
    `);

    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
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

  // Create classes table
  db.run(`
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      join_code TEXT NOT NULL UNIQUE,
      instructor_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_classes_join_code
    ON classes(join_code)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_classes_instructor_id
    ON classes(instructor_id)
  `);

  // Create students table
  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      class_id TEXT NOT NULL,
      last_seen_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(username COLLATE NOCASE, class_id),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    )
  `);

  // Migrate students table if UNIQUE constraint is case-sensitive (old schema)
  migrateStudentsTableCollation(db);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_students_class_id
    ON students(class_id)
  `);

  // Create game_results table
  db.run(`
    CREATE TABLE IF NOT EXISTS game_results (
      id TEXT PRIMARY KEY,
      game_code TEXT NOT NULL,
      config_id TEXT NOT NULL,
      class_id TEXT,
      player1_id TEXT,
      player2_id TEXT,
      player1_name TEXT NOT NULL,
      player2_name TEXT NOT NULL,
      winner_index INTEGER NOT NULL,
      player1_secret_word TEXT NOT NULL,
      player2_secret_word TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
      FOREIGN KEY (player1_id) REFERENCES students(id) ON DELETE SET NULL,
      FOREIGN KEY (player2_id) REFERENCES students(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_game_results_class_id
    ON game_results(class_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_game_results_player1_id
    ON game_results(player1_id)
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_game_results_player2_id
    ON game_results(player2_id)
  `);
}

/** Close the database connection */
export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
