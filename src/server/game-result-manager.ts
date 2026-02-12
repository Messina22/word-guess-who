import { nanoid } from "nanoid";
import { getDb } from "./db";
import type { GameResult, GameResultRow } from "@shared/types";

function rowToGameResult(row: GameResultRow): GameResult {
  return {
    id: row.id,
    gameCode: row.game_code,
    configId: row.config_id,
    classId: row.class_id,
    player1Id: row.player1_id,
    player2Id: row.player2_id,
    player1Name: row.player1_name,
    player2Name: row.player2_name,
    winnerIndex: row.winner_index,
    player1SecretWord: row.player1_secret_word,
    player2SecretWord: row.player2_secret_word,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
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
      params.player1Id ?? null,
      params.player2Id ?? null,
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
    player1Id: params.player1Id ?? null,
    player2Id: params.player2Id ?? null,
    player1Name: params.player1Name,
    player2Name: params.player2Name,
    winnerIndex: params.winnerIndex,
    player1SecretWord: params.player1SecretWord,
    player2SecretWord: params.player2SecretWord,
    startedAt: params.startedAt,
    finishedAt: now,
  };
}

