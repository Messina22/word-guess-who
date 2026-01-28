/**
 * Core type definitions for Sight Word Guess Who
 */

/** A single word entry in a word bank */
export interface WordEntry {
  word: string;
  phonetic?: string;
  category?: string;
}

/** Categories for suggested questions */
export type QuestionCategory =
  | "letters"
  | "sounds"
  | "length"
  | "patterns"
  | "meaning";

/** A suggested question for the game */
export interface Question {
  text: string;
  category: QuestionCategory;
}

/** Valid grid sizes for the game board */
export type GridSize = 12 | 16 | 20 | 24;

/** Game settings configuration */
export interface GameSettings {
  gridSize: GridSize;
  allowCustomQuestions: boolean;
  turnTimeLimit: number; // 0 = no limit, otherwise seconds
  showPhoneticHints: boolean;
  enableSounds: boolean;
}

/** Complete game configuration */
export interface GameConfig {
  id: string;
  name: string;
  description?: string;
  wordBank: WordEntry[];
  suggestedQuestions: Question[];
  settings: GameSettings;
  createdAt: string;
  updatedAt: string;
}

/** Input for creating a new game config (without auto-generated fields) */
export interface GameConfigInput {
  id?: string;
  name: string;
  description?: string;
  wordBank: WordEntry[];
  suggestedQuestions: Question[];
  settings: GameSettings;
}

/** Standard API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

/** Database row representation of a game config */
export interface GameConfigRow {
  id: string;
  name: string;
  config_json: string;
  created_at: string;
  updated_at: string;
}
