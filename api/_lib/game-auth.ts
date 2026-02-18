import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { User } from '@supabase/supabase-js';
import { createUserClient, supabaseAdmin } from './supabase';
import { sendError } from './response';

export interface GameRow {
  id: string;
  code: string;
  config_id: string | null;
  phase: string;
  player0_uid: string | null;
  player0_name: string | null;
  player0_connected: boolean;
  player0_ready: boolean;
  player0_flipped_cards: number[];
  player1_uid: string | null;
  player1_name: string | null;
  player1_connected: boolean;
  player1_ready: boolean;
  player1_flipped_cards: number[];
  cards_json: Array<{ word: string; index: number }> | null;
  current_turn: number | null;
  pending_question: string | null;
  awaiting_answer: boolean;
  winner: number | null;
  is_local_mode: boolean;
  show_only_last_question: boolean;
  random_secret_words: boolean;
  shared_computer_mode: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export interface QuestionRow {
  id: string;
  game_session_id: string;
  question_index: number;
  asker_index: number;
  question_text: string;
  answer: boolean | null;
  is_guess: boolean;
  created_at: string;
  answered_at: string | null;
}

/**
 * Authenticate the request and return the Supabase user.
 * Returns null and sends a 401 if unauthenticated.
 */
export async function requireAuth(req: VercelRequest, res: VercelResponse): Promise<User | null> {
  const authHeader = req.headers.authorization ?? null;
  if (!authHeader) {
    sendError(res, 'Authentication required', 401);
    return null;
  }
  const client = createUserClient(authHeader);
  const { data: { user } } = await client.auth.getUser();
  if (!user) {
    sendError(res, 'Authentication required', 401);
    return null;
  }
  return user;
}

/**
 * Fetch a game session row by code.
 * Returns null and sends 404 if not found.
 */
export async function requireGame(code: string, res: VercelResponse): Promise<GameRow | null> {
  const { data, error } = await supabaseAdmin
    .from('game_sessions')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) {
    sendError(res, error.message, 500);
    return null;
  }
  if (!data) {
    sendError(res, 'Game not found', 404);
    return null;
  }
  return data as GameRow;
}

/**
 * Given a game row and an authenticated user, return the player index (0 or 1).
 * Returns null and sends 403 if the user is not a player in this game.
 */
export function requirePlayerIndex(game: GameRow, user: User, res: VercelResponse): number | null {
  if (game.player0_uid === user.id) return 0;
  if (game.player1_uid === user.id) return 1;
  sendError(res, 'You are not a player in this game', 403);
  return null;
}

/**
 * Build a client-safe game state from a DB row + questions.
 * Excludes opponent secret word (only caller's own is included if available).
 */
export function buildGameState(
  game: GameRow,
  questions: QuestionRow[],
  myIndex: number | null,
  mySecretWord: string | null,
  mySecretWordIndex: number | null
) {
  const players = [
    {
      id: game.player0_uid ?? '',
      name: game.player0_name ?? '',
      connected: game.player0_connected,
      hasSelectedWord: game.player0_ready,
      flippedCards: game.player0_flipped_cards ?? [],
      // secretWordIndex only returned for the viewing player
      secretWordIndex: myIndex === 0 ? mySecretWordIndex : null,
    },
    {
      id: game.player1_uid ?? '',
      name: game.player1_name ?? '',
      connected: game.player1_connected,
      hasSelectedWord: game.player1_ready,
      flippedCards: game.player1_flipped_cards ?? [],
      secretWordIndex: myIndex === 1 ? mySecretWordIndex : null,
    },
  ];

  return {
    code: game.code,
    configId: game.config_id,
    phase: game.phase,
    isLocalMode: game.is_local_mode,
    showOnlyLastQuestion: game.show_only_last_question,
    randomSecretWords: game.random_secret_words,
    sharedComputerMode: game.shared_computer_mode,
    players: game.player1_uid ? players : [players[0]],
    gameState: game.cards_json ? {
      cards: game.cards_json,
      currentTurn: game.current_turn,
      pendingQuestion: game.pending_question,
      awaitingAnswer: game.awaiting_answer,
      winner: game.winner,
    } : null,
    questionLog: questions.map((q) => ({
      id: q.id,
      questionIndex: q.question_index,
      askerIndex: q.asker_index,
      question: q.question_text,
      answer: q.answer,
      isGuess: q.is_guess,
      createdAt: q.created_at,
      answeredAt: q.answered_at,
    })),
    myPlayerIndex: myIndex,
    mySecretWord,
    createdAt: game.created_at,
    expiresAt: game.expires_at,
  };
}
