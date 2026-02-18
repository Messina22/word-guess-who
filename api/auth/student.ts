import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';
import { sendSuccess, sendError, handleOptions } from '../_lib/response';

/**
 * POST /api/auth/student
 *
 * Creates or restores a Supabase anonymous session for a student.
 * Students have no email — they join via class code + username.
 *
 * Body: { classId: string, username: string }
 * Response: { session: SupabaseSession }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 'Method not allowed', 405);
  }

  const { classId, username } = req.body ?? {};

  if (!classId || typeof classId !== 'string' || !classId.trim()) {
    return sendError(res, 'classId is required');
  }
  if (!username || typeof username !== 'string' || !username.trim()) {
    return sendError(res, 'username is required');
  }

  const normalizedUsername = username.trim();
  const normalizedClassId = classId.trim();

  // Check if this student already exists (case-insensitive username match)
  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('class_id', normalizedClassId)
    .ilike('username', normalizedUsername)
    .maybeSingle();

  if (existing) {
    // Student exists — return a new session for their existing Supabase user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: `${existing.id}@student.wordguesswho.internal`,
    });
    if (sessionError || !sessionData) {
      return sendError(res, 'Failed to restore student session', 500);
    }

    // Instead of magic links, we sign in as the user directly via admin
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.createSession({
      user_id: existing.id,
    } as Parameters<typeof supabaseAdmin.auth.admin.createSession>[0]);

    if (signInError || !signInData) {
      return sendError(res, 'Failed to create student session', 500);
    }

    return sendSuccess(res, { session: signInData.session });
  }

  // New student — create an anonymous Supabase user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: undefined,
    user_metadata: { username: normalizedUsername, class_id: normalizedClassId, role: 'student' },
  } as Parameters<typeof supabaseAdmin.auth.admin.createUser>[0]);

  if (createError || !userData.user) {
    return sendError(res, createError?.message ?? 'Failed to create student account', 500);
  }

  // Create the student profile row
  const { error: profileError } = await supabaseAdmin.from('students').insert({
    id: userData.user.id,
    username: normalizedUsername,
    class_id: normalizedClassId,
  });

  if (profileError) {
    // Clean up the created user if profile insert fails
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
    if (profileError.code === '23505') {
      return sendError(res, 'That username is already taken in this class. Please choose a different name.');
    }
    return sendError(res, profileError.message, 500);
  }

  // Create a session for the new student
  const { data: signInData, error: signInError } = await supabaseAdmin.auth.admin.createSession({
    user_id: userData.user.id,
  } as Parameters<typeof supabaseAdmin.auth.admin.createSession>[0]);

  if (signInError || !signInData) {
    return sendError(res, 'Failed to create student session', 500);
  }

  return sendSuccess(res, { session: signInData.session }, 201);
}
