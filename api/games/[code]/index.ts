import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, createUserClient } from '../../_lib/supabase';
import { requireGame, buildGameState } from '../../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../../_lib/response';

/**
 * GET /api/games/:code — Get game session state
 * Auth is optional — authenticated players see their own secret word.
 * Unauthenticated requests get public state only (for join flow).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 'Method not allowed', 405);

  const code = (req.query.code as string).toUpperCase();

  const game = await requireGame(code, res);
  if (!game) return;

  // Fetch question log
  const { data: questions } = await supabaseAdmin
    .from('game_questions')
    .select('*')
    .eq('game_session_id', game.id)
    .order('question_index', { ascending: true });

  // Determine caller's player index (if authenticated)
  let myIndex: number | null = null;
  let mySecretWord: string | null = null;
  let mySecretWordIndex: number | null = null;

  const authHeader = req.headers.authorization ?? null;
  if (authHeader) {
    const client = createUserClient(authHeader);
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      if (game.player0_uid === user.id) myIndex = 0;
      else if (game.player1_uid === user.id) myIndex = 1;

      if (myIndex !== null) {
        const { data: secret } = await supabaseAdmin
          .from('game_secrets')
          .select('secret_word, secret_word_index')
          .eq('game_session_id', game.id)
          .eq('player_index', myIndex)
          .maybeSingle();
        if (secret) {
          mySecretWord = secret.secret_word as string;
          mySecretWordIndex = secret.secret_word_index as number | null;
        }
      }
    }
  }

  return sendSuccess(res, buildGameState(game, questions ?? [], myIndex, mySecretWord, mySecretWordIndex));
}
