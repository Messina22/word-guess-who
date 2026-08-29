import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../../_lib/supabase';
import { requireAuth, requireGame, requirePlayerIndex, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * POST /api/games/:code/guess
 * Body: { word: string }
 *
 * Current player guesses the opponent's secret word.
 * - Correct: game transitions to 'finished', winner set.
 * - Wrong: logged as a guess (is_guess=true), turn switches.
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
    return sendError(res, 'Guesses can only be made during the playing phase');
  }
  if (game.current_turn !== myIndex) {
    return sendError(res, 'It is not your turn');
  }
  if (game.awaiting_answer) {
    return sendError(res, 'Waiting for an answer to the current question');
  }

  const { word } = req.body ?? {};
  if (!word || typeof word !== 'string' || !word.trim()) {
    return sendError(res, 'word is required');
  }

  const opponentIndex = myIndex === 0 ? 1 : 0;

  // Fetch opponent's secret word
  const { data: opponentSecret } = await supabaseAdmin
    .from('game_secrets')
    .select('secret_word')
    .eq('game_session_id', game.id)
    .eq('player_index', opponentIndex)
    .maybeSingle();

  if (!opponentSecret) {
    return sendError(res, 'Opponent has not selected a secret word yet');
  }

  const isCorrect = opponentSecret.secret_word.toLowerCase() === word.trim().toLowerCase();

  // Count existing questions
  const { count } = await supabaseAdmin
    .from('game_questions')
    .select('*', { count: 'exact', head: true })
    .eq('game_session_id', game.id);

  const questionIndex = count ?? 0;
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  // Log the guess
  await supabaseAdmin.from('game_questions').insert({
    game_session_id: game.id,
    question_index: questionIndex,
    asker_index: myIndex,
    question_text: word.trim(),
    answer: isCorrect,
    is_guess: true,
    created_at: now,
    answered_at: now,
  });

  const { error: updateError } = await supabaseAdmin
    .from('game_sessions')
    .update({
      phase: isCorrect ? 'finished' : 'playing',
      winner: isCorrect ? myIndex : null,
      current_turn: isCorrect ? game.current_turn : opponentIndex,
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
