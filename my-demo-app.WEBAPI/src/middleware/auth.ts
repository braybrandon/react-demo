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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.userId = userId;
    req.user = user;
    next();
  } catch (err) {
    console.error('Auth error', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
