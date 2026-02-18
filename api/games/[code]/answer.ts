import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, requirePlayerIndex, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * POST /api/games/:code/answer
 * Body: { answer: boolean }
 *
 * Opponent answers the pending yes/no question (local mode only).
 * Clears pending_question, records the answer, switches turn to the asker.
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

  if (game.phase !== 'playing') {
    return sendError(res, 'Answers can only be provided during the playing phase');
  }
  if (!game.awaiting_answer) {
    return sendError(res, 'No question is awaiting an answer');
  }
  // The answerer is the opponent of whoever asked (current_turn was not switched when question was queued)
  const askerIndex = game.current_turn!;
  if (myIndex === askerIndex) {
    return sendError(res, 'You cannot answer your own question');
  }

  const { answer } = req.body ?? {};
  if (typeof answer !== 'boolean') {
    return sendError(res, 'answer must be a boolean (true or false)');
  }

  // Find the most recent unanswered question
  const { data: pendingQuestion } = await supabaseAdmin
    .from('game_questions')
    .select('*')
    .eq('game_session_id', game.id)
    .is('answer', null)
    .order('question_index', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pendingQuestion) {
    return sendError(res, 'No pending question found');
  }

  const now = new Date().toISOString();

  // Record the answer
  const { error: answerError } = await supabaseAdmin
    .from('game_questions')
    .update({ answer, answered_at: now })
    .eq('id', pendingQuestion.id);

  if (answerError) return sendError(res, answerError.message, 500);

  // Switch turn to the asker; clear pending question state
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('game_sessions')
    .update({
      pending_question: null,
      awaiting_answer: false,
      current_turn: askerIndex,
      expires_at: expiresAt,
      updated_at: now,
    })
    .eq('id', game.id);

  if (updateError) return sendError(res, updateError.message, 500);

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
