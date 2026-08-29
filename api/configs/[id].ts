import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createUserClient, supabaseAdmin } from '../_lib/supabase';
import { sendSuccess, sendError, handleOptions } from '../_lib/response';
import { validateGameConfigInput } from '../../src/shared/validation';
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
 * GET    /api/configs/:id  — get a single config (public)
 * PUT    /api/configs/:id  — update a config (instructor + owner)
 * DELETE /api/configs/:id  — delete a config (instructor + owner)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  const configId = req.query.id as string;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('game_configs')
      .select('*')
      .eq('id', configId)
      .maybeSingle();
    if (error) return sendError(res, error.message, 500);
    if (!data) return sendError(res, `Config '${configId}' not found`, 404);
    return sendSuccess(res, rowToConfig(data));
  }

  if (req.method === 'PUT') {
    const authHeader = req.headers.authorization ?? null;
    if (!authHeader) return sendError(res, 'Authentication required', 401);

    const client = createUserClient(authHeader);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return sendError(res, 'Authentication required', 401);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('game_configs')
      .select('*')
      .eq('id', configId)
      .maybeSingle();
    if (fetchError) return sendError(res, fetchError.message, 500);
    if (!existing) return sendError(res, `Config '${configId}' not found`, 404);
    if (existing.instructor_id === null) return sendError(res, 'System templates cannot be modified', 403);
    if (existing.instructor_id !== user.id) return sendError(res, 'You do not have permission to edit this configuration', 403);

    const validation = validateGameConfigInput(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, errors: validation.errors });
    }

    const input = validation.data;
    const isPublic = typeof req.body?.isPublic === 'boolean' ? req.body.isPublic : existing.is_public;
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
      .update({
        name: input.name,
        config_json: configJson,
        is_public: isPublic,
        updated_at: now,
      })
      .eq('id', configId)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, rowToConfig(data));
  }

  if (req.method === 'DELETE') {
    const authHeader = req.headers.authorization ?? null;
    if (!authHeader) return sendError(res, 'Authentication required', 401);

    const client = createUserClient(authHeader);
    const { data: { user } } = await client.auth.getUser();
    if (!user) return sendError(res, 'Authentication required', 401);

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('game_configs')
      .select('id, instructor_id')
      .eq('id', configId)
      .maybeSingle();
    if (fetchError) return sendError(res, fetchError.message, 500);
    if (!existing) return sendError(res, `Config '${configId}' not found`, 404);
    if (existing.instructor_id === null) return sendError(res, 'System templates cannot be deleted', 403);
    if (existing.instructor_id !== user.id) return sendError(res, 'You do not have permission to delete this configuration', 403);

    const { error } = await supabaseAdmin
      .from('game_configs')
      .delete()
      .eq('id', configId);
    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, null);
  }

  return sendError(res, 'Method not allowed', 405);
}
