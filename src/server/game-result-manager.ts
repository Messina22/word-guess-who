import { nanoid } from "nanoid";
import { getDb } from "./db";
import type { GameResult } from "@shared/types";

/** Check if a student exists in the database */
function studentExists(db: ReturnType<typeof getDb>, studentId: string): boolean {
  const result = db
    .query<{ id: string }, [string]>("SELECT id FROM students WHERE id = ?")
    .get(studentId);
  return result !== null;
}

/** Save a game result when a game finishes */
export function saveGameResult(params: {
  gameCode: string;
  configId: string;
  classId?: string | null;
  player1Id?: string | null;
  player2Id?: string | null;
  player1Name: string;
  player2Name: string;
  winnerIndex: number;
  player1SecretWord: string;
  player2SecretWord: string;
  startedAt: string;
}): GameResult {
  const db = getDb();
  const id = nanoid();
  const now = new Date().toISOString();

  // Validate student IDs exist to avoid FK constraint violations
  // (student may have been deleted while game was in progress)
  const player1Id = params.player1Id && studentExists(db, params.player1Id)
    ? params.player1Id
    : null;
  const player2Id = params.player2Id && studentExists(db, params.player2Id)
    ? params.player2Id
    : null;

  db.run(
    `INSERT INTO game_results (
      id, game_code, config_id, class_id,
      player1_id, player2_id, player1_name, player2_name,
      winner_index, player1_secret_word, player2_secret_word,
      started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      params.gameCode,
      params.configId,
      params.classId ?? null,
      player1Id,
      player2Id,
      params.player1Name,
      params.player2Name,
      params.winnerIndex,
      params.player1SecretWord,
      params.player2SecretWord,
      params.startedAt,
      now,
    ]
  );

  return {
    id,
    gameCode: params.gameCode,
    configId: params.configId,
    classId: params.classId ?? null,
    player1Id,
    player2Id,
    player1Name: params.player1Name,
    player2Name: params.player2Name,
    winnerIndex: params.winnerIndex,
    player1SecretWord: params.player1SecretWord,
    player2SecretWord: params.player2SecretWord,
    startedAt: params.startedAt,
    finishedAt: now,
  };
}

