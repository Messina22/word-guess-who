import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUserClient, supabaseAdmin } from '../_lib/supabase';
import { sendSuccess, sendError, handleOptions } from '../_lib/response';
import { validateGameConfigInput, generateIdFromName } from '../../src/shared/validation';
import type { GameConfig } from '../../src/shared/types';

function rowToConfig(row: Record<string, unknown>): GameConfig {
  const json = typeof row.config_json === 'string'
    ? JSON.parse(row.config_json)
    : row.config_json;
  return {
    ...json,
    id: row.id as string,
    ownerId: (row.instructor_id as string | null) ?? null,
    isSystemTemplate: row.instructor_id === null && (row.is_public as boolean) === true,
    isPublic: row.is_public as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * GET  /api/configs  — list configs visible to the caller
 * POST /api/configs  — create a new config (instructors only)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const authHeader = req.headers.authorization ?? null;

  if (req.method === 'GET') {
    const ownedOnly = req.query.ownedOnly === 'true';

    if (authHeader) {
      const client = createUserClient(authHeader);
      const { data: { user } } = await client.auth.getUser();

      if (user) {
        // Authenticated instructor — show public/system + their own
        const query = ownedOnly
          ? supabaseAdmin.from('game_configs').select('*').eq('instructor_id', user.id)
          : supabaseAdmin.from('game_configs').select('*').or(`is_public.eq.true,instructor_id.eq.${user.id}`);

        const { data, error } = await query.order('updated_at', { ascending: false });
        if (error) return sendError(res, error.message, 500);
        return sendSuccess(res, (data ?? []).map(rowToConfig));
      }
    }

    // Unauthenticated — public configs only
    const { data, error } = await supabaseAdmin
      .from('game_configs')
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false });
    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, (data ?? []).map(rowToConfig));
  }

  if (req.method === 'POST') {
    if (!authHeader) return sendError(res, 'Authentication required', 401);

    const client = createUserClient(authHeader);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return sendError(res, 'Authentication required', 401);

    const validation = validateGameConfigInput(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const input = validation.data;
    const id = input.id || generateIdFromName(input.name);

    // Check for duplicate ID
    const { data: existing } = await supabaseAdmin
      .from('game_configs')
      .select('id')
      .eq('id', id)
      .maybeSingle();
    if (existing) return sendError(res, `Config with ID '${id}' already exists`);

    const now = new Date().toISOString();
    const configJson = {
      name: input.name,
      description: input.description,
      author: input.author,
      wordBank: input.wordBank,
      suggestedQuestions: input.suggestedQuestions,
      settings: input.settings,
    };

    const { data, error } = await supabaseAdmin
      .from('game_configs')
      .insert({
        id,
        name: input.name,
        instructor_id: user.id,
        config_json: configJson,
        is_public: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, rowToConfig(data), 201);
  }

  return sendError(res, 'Method not allowed', 405);
}
