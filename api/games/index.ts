import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';
import { requireAuth } from '../_lib/game-auth';
import { sendSuccess, sendError, handleOptions } from '../_lib/response';
import type { WordEntry } from '../../src/shared/types';

/** Generate a short, readable 6-character game code */
function generateGameCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Shuffle an array and take first n elements */
function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}

/**
 * POST /api/games — Create a new game session
 * Body: { configId, isLocalMode?, showOnlyLastQuestion?, randomSecretWords?, sharedComputerMode?, playerName? }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 'Method not allowed', 405);

  const user = await requireAuth(req, res);
  if (!user) return;

  const {
    configId,
    isLocalMode = false,
    showOnlyLastQuestion = false,
    randomSecretWords = false,
    sharedComputerMode = false,
    playerName = '',
  } = req.body ?? {};

  if (!configId || typeof configId !== 'string') {
    return sendError(res, 'configId is required');
  }

  // Fetch config to get word bank and grid size
  const { data: config, error: configError } = await supabaseAdmin
    .from('game_configs')
    .select('config_json')
    .eq('id', configId)
    .maybeSingle();

  if (configError) return sendError(res, configError.message, 500);
  if (!config) return sendError(res, `Configuration '${configId}' not found`, 404);

  const configJson = config.config_json as {
    settings: { gridSize: number };
    wordBank: WordEntry[];
  };

  const { gridSize } = configJson.settings;
  const { wordBank } = configJson;

  if (wordBank.length < gridSize) {
    return sendError(res, `Word bank has ${wordBank.length} words but grid size is ${gridSize}`);
  }

  // Select words for the board
  const selectedWords = pickRandom(wordBank, gridSize);
  const cards = selectedWords.map((entry, index) => ({ word: entry.word, index }));

  // Generate unique game code
  let code: string;
  let attempts = 0;
  do {
    code = generateGameCode();
    const { data: existing } = await supabaseAdmin
      .from('game_sessions')
      .select('code')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) return sendError(res, 'Failed to generate unique game code', 500);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 20 * 60 * 1000).toISOString();

  // If randomSecretWords, pre-assign secrets for player0 and prepare for player1
  let randomSecretForPlayer0: { word: string; index: number } | null = null;
  if (randomSecretWords) {
    const shuffledForSecret = [...cards].sort(() => Math.random() - 0.5);
    randomSecretForPlayer0 = shuffledForSecret[0];
  }

  const { data: session, error: insertError } = await supabaseAdmin
    .from('game_sessions')
    .insert({
      code,
      config_id: configId,
      phase: 'waiting',
      player0_uid: user.id,
      player0_name: playerName || null,
      player0_connected: false,
      player0_ready: false,
      player1_connected: false,
      player1_ready: false,
      cards_json: cards,
      is_local_mode: isLocalMode,
      show_only_last_question: showOnlyLastQuestion,
      random_secret_words: randomSecretWords,
      shared_computer_mode: sharedComputerMode,
      expires_at: expiresAt,
    })
    .select('id, code, expires_at')
    .single();

  if (insertError) return sendError(res, insertError.message, 500);

  // If random secret words, insert player0's secret now
  if (randomSecretWords && randomSecretForPlayer0) {
    await supabaseAdmin.from('game_secrets').insert({
      game_session_id: session.id,
      player_index: 0,
      player_uid: user.id,
      secret_word: randomSecretForPlayer0.word,
      secret_word_index: randomSecretForPlayer0.index,
    });
  }

  return sendSuccess(res, { code: session.code, expiresAt: session.expires_at }, 201);
}
