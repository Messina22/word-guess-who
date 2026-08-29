import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, requirePlayerIndex, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * POST /api/games/:code/end-turn
 *
 * Shared computer mode: current player explicitly passes the device.
 * Switches current_turn to the opponent.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const code = (req.query.code as string).toUpperCase();
  const user = await requireAuth(req, res);
  if (!user) return;

  const game = await requireGame(code, res);
  if (!game) return;

  const myIndex = requirePlayerIndex(game, user, res);
  if (myIndex === null) return;

  if (!game.shared_computer_mode) {
    return sendError(res, 'end-turn is only available in shared computer mode');
  }
  if (game.phase !== 'playing') {
    return sendError(res, 'Cannot end turn outside of playing phase');
  }
  if (game.current_turn !== myIndex) {
    return sendError(res, 'It is not your turn');
  }

  const opponentIndex = myIndex === 0 ? 1 : 0;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from('game_sessions')
    .update({ current_turn: opponentIndex, expires_at: expiresAt, updated_at: now })
    .eq('id', game.id);

  if (error) return sendError(res, error.message, 500);

  const { data: updatedGame } = await supabaseAdmin.from('game_sessions').select('*').eq('id', game.id).single();
  const { data: questions } = await supabaseAdmin.from('game_questions').select('*').eq('game_session_id', game.id).order('question_index', { ascending: true });

  const { data: mySecret } = await supabaseAdmin
    .from('game_secrets')
    .select('secret_word, secret_word_index')
    .eq('game_session_id', game.id)
    .eq('player_index', myIndex)
    .maybeSingle();

  return sendSuccess(res, buildGameState(updatedGame, questions ?? [], myIndex, mySecret?.secret_word ?? null, mySecret?.secret_word_index ?? null));
}
