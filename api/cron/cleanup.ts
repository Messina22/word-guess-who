import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../_lib/supabase';

/**
 * GET /api/cron/cleanup
 *
 * Vercel Cron job — runs every 5 minutes (configured in vercel.json).
 * Deletes game sessions whose expires_at has passed and are not finished.
 *
 * Secured by Vercel's Authorization header (CRON_SECRET env var).
 * Vercel automatically sets the header when invoking cron routes;
 * manual calls without it are rejected.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify Vercel cron secret
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { data, error } = await supabaseAdmin
    .from('game_sessions')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .neq('phase', 'finished')
    .select('code');

  if (error) {
    console.error('Cron cleanup error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }

  const deletedCodes = (data ?? []).map((r: { code: string }) => r.code);
  console.log(`Cron cleanup: deleted ${deletedCodes.length} expired sessions`, deletedCodes);

  return res.status(200).json({
    success: true,
    deleted: deletedCodes.length,
    codes: deletedCodes,
  });
}
