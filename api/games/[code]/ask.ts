import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, requirePlayerIndex, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * POST /api/games/:code/ask
 * Body: { question: string }
 *
 * Current player asks a yes/no question.
 * In non-local mode: auto-evaluates against the opponent's secret word.
 * In local mode: queues the question for the opponent to answer manually.
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
    return sendError(res, 'Questions can only be asked during the playing phase');
  }
  if (game.current_turn !== myIndex) {
    return sendError(res, 'It is not your turn');
  }
  if (game.awaiting_answer) {
    return sendError(res, 'Waiting for an answer to the current question');
  }

  const { question } = req.body ?? {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return sendError(res, 'question is required');
  }

  const opponentIndex = myIndex === 0 ? 1 : 0;

  // Count existing questions for this game
  const { count } = await supabaseAdmin
    .from('game_questions')
    .select('*', { count: 'exact', head: true })
    .eq('game_session_id', game.id);

  const questionIndex = count ?? 0;

  // In non-local mode, auto-evaluate against opponent's secret word
  let autoAnswer: boolean | null = null;
  if (!game.is_local_mode) {
    const { data: opponentSecret } = await supabaseAdmin
      .from('game_secrets')
      .select('secret_word')
      .eq('game_session_id', game.id)
      .eq('player_index', opponentIndex)
      .maybeSingle();

    if (!opponentSecret) {
      return sendError(res, 'Opponent has not selected a secret word yet');
    }

    // Questions are always manually answered — auto-evaluation requires evaluator metadata
    // For now, queue the question and let the server determine answer from question text
    autoAnswer = null;
  }

  const now = new Date().toISOString();

  // In non-local mode without auto-eval, we still need an answer — mark awaiting
  // Auto-eval would require a separate evaluator service; for now all non-local questions await
  const { error: questionError } = await supabaseAdmin.from('game_questions').insert({
    game_session_id: game.id,
    question_index: questionIndex,
    asker_index: myIndex,
    question_text: question.trim(),
    answer: autoAnswer,
    is_guess: false,
    created_at: now,
    answered_at: autoAnswer !== null ? now : null,
  });
  if (questionError) return sendError(res, questionError.message, 500);

  // If auto-answered, switch turn; otherwise mark awaiting_answer
  const nowTurn = autoAnswer !== null ? opponentIndex : game.current_turn;
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const { error: updateError } = await supabaseAdmin
    .from('game_sessions')
    .update({
      pending_question: autoAnswer === null ? question.trim() : null,
      awaiting_answer: autoAnswer === null,
      current_turn: nowTurn,
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
