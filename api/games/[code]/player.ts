import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, requirePlayerIndex, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * PATCH /api/games/:code/player — Update player name
 * DELETE /api/games/:code/player — Leave game (mark disconnected, reset player slot if waiting)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const code = (req.query.code as string).toUpperCase();
  const user = await requireAuth(req, res);
  if (!user) return;

  const game = await requireGame(code, res);
  if (!game) return;

  const myIndex = requirePlayerIndex(game, user, res);
  if (myIndex === null) return;

  if (req.method === 'PATCH') {
    const { name } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return sendError(res, 'name is required');
    }

    const nameColumn = myIndex === 0 ? 'player0_name' : 'player1_name';
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('game_sessions')
      .update({ [nameColumn]: name.trim(), updated_at: now })
      .eq('id', game.id);

    if (error) return sendError(res, error.message, 500);

    const { data: updatedGame } = await supabaseAdmin.from('game_sessions').select('*').eq('id', game.id).single();
    const { data: questions } = await supabaseAdmin.from('game_questions').select('*').eq('game_session_id', game.id).order('question_index', { ascending: true });
    const { data: mySecret } = await supabaseAdmin.from('game_secrets').select('secret_word, secret_word_index').eq('game_session_id', game.id).eq('player_index', myIndex).maybeSingle();

    return sendSuccess(res, buildGameState(updatedGame, questions ?? [], myIndex, mySecret?.secret_word ?? null, mySecret?.secret_word_index ?? null));
  }

  if (req.method === 'DELETE') {
    const now = new Date().toISOString();
    const connectedColumn = myIndex === 0 ? 'player0_connected' : 'player1_connected';

    // If game is still waiting, remove the player slot entirely
    if (game.phase === 'waiting' && myIndex === 0) {
      // Creator leaving — delete the whole game
      await supabaseAdmin.from('game_sessions').delete().eq('id', game.id);
      return sendSuccess(res, null);
    }

    // Otherwise mark disconnected
    const { error } = await supabaseAdmin
      .from('game_sessions')
      .update({ [connectedColumn]: false, updated_at: now })
      .eq('id', game.id);

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, null);
  }

  return sendError(res, 'Method not allowed', 405);
}
