import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  userId?: number;
  user?: any;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  // Check Authorization header first, fallback to cookie named 'jid'
  let token: string | undefined;
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) token = auth.slice('Bearer '.length);
  // Support cookie-based access token set by /auth/login (cookie name: 'access')
  if (!token && (req as any).cookies) {
    if ((req as any).cookies.access) token = (req as any).cookies.access;
    else if ((req as any).cookies.jid) token = (req as any).cookies.jid; // legacy
  }
  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
    if (!payload || !payload.sub) return res.status(401).json({ error: 'Invalid token' });

    const userId = Number(payload.sub);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true, tokenVersion: true } as any });
    if (!user) return res.status(401).json({ error: 'User not found' });

    // If token contains a tokenVersion (tv) claim, require it to match the DB version
    if (typeof payload.tv !== 'undefined') {
      const tv = Number(payload.tv || 0);
      const currentTv = Number((user as any).tokenVersion || 0);
      if (tv !== currentTv) return res.status(401).json({ error: 'Token revoked' });
    }

    req.userId = userId;
    req.user = user;
    next();
  } catch (err) {
    // Detailed error for development debugging — includes jwt verify message (e.g. expired, malformed)
    console.error('Auth error', err);
    const msg = (err && (err as any).message) || 'Invalid or expired token';
    res.status(401).json({ error: msg });
  }
}
