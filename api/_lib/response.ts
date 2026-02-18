import type { VercelRequest, VercelResponse } from '@vercel/node';

export function sendSuccess<T>(res: VercelResponse, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendError(res: VercelResponse, error: string, status = 400): void {
  res.status(status).json({ success: false, error });
}

export function sendValidationErrors(res: VercelResponse, errors: Record<string, string[]>): void {
  res.status(400).json({ success: false, errors });
}

export function handleOptions(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
