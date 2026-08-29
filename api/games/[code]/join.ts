import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * POST /api/games/:code/join
 * Body: { playerName?: string }
 *
 * Second player joins the waiting game.
 * - Validates phase === 'waiting' and no player1 yet
 * - Sets player1_uid / player1_name
 * - Transitions to 'selecting' (or 'playing' if randomSecretWords)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const code = (req.query.code as string).toUpperCase();
  const user = await requireAuth(req, res);
  if (!user) return;

  const game = await requireGame(code, res);
  if (!game) return;

  if (game.phase !== 'waiting') {
    return sendError(res, 'This game is no longer accepting players');
  }

  if (game.player0_uid === user.id) {
    return sendError(res, 'You are already in this game as player 1');
  }

  if (game.player1_uid) {
    return sendError(res, 'This game already has two players');
  }

  const { playerName = '' } = req.body ?? {};
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 20 * 60 * 1000).toISOString();

  // If randomSecretWords, move straight to playing; otherwise to selecting
  const nextPhase = game.random_secret_words ? 'playing' : 'selecting';
  let player1SecretWord: { word: string; index: number } | null = null;

  if (game.random_secret_words && game.cards_json) {
    const cards = game.cards_json;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    player1SecretWord = shuffled[0];
  }

  const { error: updateError } = await supabaseAdmin
    .from('game_sessions')
    .update({
      player1_uid: user.id,
      player1_name: playerName || null,
      phase: nextPhase,
      current_turn: nextPhase === 'playing' ? 0 : null,
      expires_at: expiresAt,
      updated_at: now.toISOString(),
    })
    .eq('id', game.id);

  if (updateError) return sendError(res, updateError.message, 500);

  // If random secret words, save player1's secret
  if (game.random_secret_words && player1SecretWord) {
    await supabaseAdmin.from('game_secrets').insert({
      game_session_id: game.id,
      player_index: 1,
      player_uid: user.id,
      secret_word: player1SecretWord.word,
      secret_word_index: player1SecretWord.index,
    });
  }

  // Fetch updated game + questions + caller's secret
  const { data: updatedGame } = await supabaseAdmin
    .from('game_sessions')
    .select('*')
    .eq('id', game.id)
    .single();

  const { data: questions } = await supabaseAdmin
    .from('game_questions')
    .select('*')
    .eq('game_session_id', game.id)
    .order('question_index', { ascending: true });

  let mySecretWord: string | null = null;
  let mySecretWordIndex: number | null = null;
  if (game.random_secret_words && player1SecretWord) {
    mySecretWord = player1SecretWord.word;
    mySecretWordIndex = player1SecretWord.index;
  }

  return sendSuccess(res, buildGameState(updatedGame, questions ?? [], 1, mySecretWord, mySecretWordIndex));
}
