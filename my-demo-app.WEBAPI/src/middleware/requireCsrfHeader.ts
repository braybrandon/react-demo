import { Request, Response, NextFunction } from 'express';

export default function requireCsrfHeader(req: Request, res: Response, next: NextFunction) {
  // Only enforce for mutating HTTP methods
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!mutating.includes(req.method)) return next();

  // Whitelist common public endpoints (mirror logic in src/index.ts)
  const whitelist = ['/docs', '/auth/login', '/auth/register'];
  if (whitelist.includes(req.path)) return next();

  // If Authorization: Bearer is present assume API client and bypass CSRF header requirement
  const auth = req.headers.authorization as string | undefined;
  if (auth && auth.startsWith('Bearer ')) return next();

  // Dev convenience: if not in production and an access cookie contains a valid jwt
  // we'll allow requests through (index.ts has similar logic). This middleware won't
  // verify the jwt; it only ensures header presence for cookie-based flows.
  if (process.env.NODE_ENV !== 'production') {
    const access = (req as any).cookies?.access as string | undefined;
    if (access) return next();
  }

  // For cookie-based flows require X-CSRF-Token header be present
  const header = req.headers['x-csrf-token'] || req.headers['x-xsrf-token'];
  if (!header) return res.status(400).json({ error: 'Missing X-CSRF-Token header' });

  return next();
}
