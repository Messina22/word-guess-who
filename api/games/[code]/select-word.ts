import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, requirePlayerIndex, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * POST /api/games/:code/select-word
 * Body: { word: string }
 *
 * Player selects their secret word during the 'selecting' phase.
 * When both players are ready, transitions to 'playing'.
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

  if (game.phase !== 'selecting') {
    return sendError(res, 'Word selection is not allowed in this game phase');
  }

  const { word } = req.body ?? {};
  if (!word || typeof word !== 'string') {
    return sendError(res, 'word is required');
  }

  // Validate the word is on the board
  const cards = game.cards_json ?? [];
  const card = cards.find((c) => c.word.toLowerCase() === word.toLowerCase());
  if (!card) {
    return sendError(res, 'That word is not on the game board');
  }

  // Check if already selected
  const { data: existingSecret } = await supabaseAdmin
    .from('game_secrets')
    .select('id')
    .eq('game_session_id', game.id)
    .eq('player_index', myIndex)
    .maybeSingle();

  if (existingSecret) {
    return sendError(res, 'You have already selected your secret word');
  }

  // Insert secret
  const { error: secretError } = await supabaseAdmin.from('game_secrets').insert({
    game_session_id: game.id,
    player_index: myIndex,
    player_uid: user.id,
    secret_word: card.word,
    secret_word_index: card.index,
  });
  if (secretError) return sendError(res, secretError.message, 500);

  // Mark this player as ready
  const readyColumn = myIndex === 0 ? 'player0_ready' : 'player1_ready';
  const otherReady = myIndex === 0 ? game.player1_ready : game.player0_ready;

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  const nextPhase = otherReady ? 'playing' : 'selecting';

  const { error: updateError } = await supabaseAdmin
    .from('game_sessions')
    .update({
      [readyColumn]: true,
      phase: nextPhase,
      current_turn: nextPhase === 'playing' ? 0 : null,
      expires_at: expiresAt,
      updated_at: now,
    })
    .eq('id', game.id);

  if (updateError) return sendError(res, updateError.message, 500);

  const { data: updatedGame } = await supabaseAdmin.from('game_sessions').select('*').eq('id', game.id).single();
  const { data: questions } = await supabaseAdmin.from('game_questions').select('*').eq('game_session_id', game.id).order('question_index', { ascending: true });

  return sendSuccess(res, buildGameState(updatedGame, questions ?? [], myIndex, card.word, card.index));
}
