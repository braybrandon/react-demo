import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rolePermissionService from './rolePermissionService';

const prisma = new PrismaClient();

class AuthService {
  // Simple typed errors to keep controller logic minimal
  public AuthError = class AuthError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message || code);
      this.code = code;
    }
  };

  createAccessToken(user: { id: number; email: string }) {
    return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET as string, { expiresIn: '15m' });
  }

  async createRefreshTokenForUser(userId: number) {
    const refreshSecret = crypto.randomBytes(64).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshSecret).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const dbToken = await prisma.refreshToken.create({ data: { tokenHash: refreshHash, userId, expiresAt } });
    return `${dbToken.id}.${refreshSecret}`;
  }

  async authenticateAndCreateTokens(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.hashedPassword) throw new this.AuthError('INVALID_CREDENTIALS', 'Invalid credentials');
    const ok = await argon2.verify(user.hashedPassword, password);
    if (!ok) throw new this.AuthError('INVALID_CREDENTIALS', 'Invalid credentials');

    const accessToken = this.createAccessToken({ id: user.id, email: user.email });
    const refreshToken = await this.createRefreshTokenForUser(user.id);
    return { user, accessToken, refreshToken };
  }

  // Register a user and return created user
  async registerUser(name: string, email: string, password: string) {
    const hash = await argon2.hash(password);
    const user = await prisma.user.create({ data: { name, email, hashedPassword: hash } });
    return user;
  }

  // Change a user's password (handles initial set and revoke tokens)
  async changePassword(email: string, currentPassword: string | undefined, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    if (!user.hashedPassword) {
      const hash = await argon2.hash(newPassword);
      await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: hash } });
      await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
      return { message: 'Password set' };
    }

    if (!currentPassword) throw new Error('currentPassword required');
    const ok = await argon2.verify(user.hashedPassword, currentPassword);
    if (!ok) throw new Error('Invalid current password');

    const newHash = await argon2.hash(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { hashedPassword: newHash } });
    await prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revoked: true } });
    return { message: 'Password changed' };
  }

  // Return user info + roles + aggregated permissions (used by /auth/me)
  async getUserWithPermissions(userId: number) {
    const safeUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } });
    if (!safeUser) throw new Error('User not found');

    const userRoles = await prisma.userRole.findMany({ where: { userId }, include: { role: { select: { id: true, name: true } } } });
    const roles = userRoles.map((ur: any) => ur.role).filter(Boolean);
    const roleIds = roles.map((r: any) => r.id);
    const permissions: Record<string, number> = {};
    if (roleIds.length > 0) {
      const permsByRole = await rolePermissionService.getPermissionsMapForRoles(prisma, roleIds);
      for (const rid of roleIds) {
        const perRole = permsByRole[rid] || {};
        for (const [k, v] of Object.entries(perRole)) {
          permissions[k] = (permissions[k] || 0) | (v as number);
        }
      }
    }
    return { user: safeUser, roles, permissions };
  }

  // Check authentication status for token (used by /auth/status)
  checkAuthToken(token: string) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      if (!payload || !payload.sub) return null;
      return Number(payload.sub);
    } catch (_) {
      return null;
    }
  }

  // Extract token from request (Authorization header or cookies) and return
  // the user record if authenticated, otherwise null. Centralizes cookie/header
  // parsing and JWT validation so controllers remain thin.
  async getAuthStatusFromRequest(req: any) {
    try {
      let token: string | undefined;
      const auth = req.headers?.authorization;
      if (auth && auth.startsWith('Bearer ')) token = auth.slice('Bearer '.length);
      if (!token && req.cookies) {
        if (req.cookies.access) token = req.cookies.access;
        else if (req.cookies.jid) token = req.cookies.jid;
      }
      if (!token) return null;
      const userId = this.checkAuthToken(token);
      if (!userId) return null;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, createdAt: true } });
      return user || null;
    } catch (err) {
      return null;
    }
  }

  // Verify refresh cookie (id.secret or legacy) and rotate on success.
  // Throws on invalid/expired/revoked tokens.
  async verifyAndRotateRefresh(refresh: string) {
  if (!refresh) throw new this.AuthError('MISSING_REFRESH', 'Missing refresh token');

    // New format: id.secret
    if (typeof refresh === 'string' && refresh.includes('.')) {
      const [idPart, secret] = refresh.split('.', 2);
      const tokenId = Number(idPart);
      if (!Number.isNaN(tokenId)) {
        const dbToken = await prisma.refreshToken.findUnique({ where: { id: tokenId } });
        if (!dbToken) throw new this.AuthError('INVALID_REFRESH', 'Invalid refresh token');
        if (dbToken.revoked) {
          // Reuse detected: revoke all tokens for this user
          await prisma.refreshToken.updateMany({ where: { userId: dbToken.userId }, data: { revoked: true } });
          throw new this.AuthError('REUSE_DETECTED', 'Refresh token reuse detected');
        }
        const hash = crypto.createHash('sha256').update(secret).digest('hex');
  if (hash !== dbToken.tokenHash) throw new this.AuthError('INVALID_REFRESH', 'Invalid refresh token');
  if (dbToken.expiresAt < new Date()) throw new this.AuthError('EXPIRED_REFRESH', 'Expired refresh token');

        const tokenUser = await prisma.user.findUnique({ where: { id: dbToken.userId } });
  if (!tokenUser) throw new this.AuthError('INVALID_REFRESH_USER', 'Invalid refresh token user');

        // Rotate
        await prisma.refreshToken.update({ where: { id: dbToken.id }, data: { revoked: true } });
        const newSecret = crypto.randomBytes(64).toString('hex');
        const newHash = crypto.createHash('sha256').update(newSecret).digest('hex');
        const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const newDb = await prisma.refreshToken.create({ data: { tokenHash: newHash, userId: dbToken.userId, expiresAt: newExpires } });
        const newRefreshToken = `${newDb.id}.${newSecret}`;
        const newAccess = this.createAccessToken({ id: tokenUser.id, email: tokenUser.email });
        return { newAccess, newRefreshToken, user: tokenUser };
      }
    }

    // Legacy fallback: raw secret
    const legacyHash = crypto.createHash('sha256').update(String(refresh)).digest('hex');
    const dbToken = await prisma.refreshToken.findUnique({ where: { tokenHash: legacyHash } });
  if (!dbToken || dbToken.revoked || dbToken.expiresAt < new Date()) throw new this.AuthError('INVALID_REFRESH', 'Invalid refresh token');
  const tokenUser = await prisma.user.findUnique({ where: { id: dbToken.userId } });
  if (!tokenUser) throw new this.AuthError('INVALID_REFRESH_USER', 'Invalid refresh token user');

    // Rotate to new prefixed format
    await prisma.refreshToken.update({ where: { id: dbToken.id }, data: { revoked: true } });
    const newSecret = crypto.randomBytes(64).toString('hex');
    const newHash = crypto.createHash('sha256').update(newSecret).digest('hex');
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const newDb = await prisma.refreshToken.create({ data: { tokenHash: newHash, userId: dbToken.userId, expiresAt: newExpires } });
    const newRefreshToken = `${newDb.id}.${newSecret}`;
    const newAccess = this.createAccessToken({ id: tokenUser.id, email: tokenUser.email });
    return { newAccess, newRefreshToken, user: tokenUser };
  }

  // Revoke token by cookie value (used for logout)
  async revokeRefreshCookie(refresh: string | undefined) {
    if (!refresh) return;
    if (typeof refresh === 'string' && refresh.includes('.')) {
      const [idPart] = refresh.split('.', 1);
      const tokenId = Number(idPart);
      if (!Number.isNaN(tokenId)) {
        await prisma.refreshToken.updateMany({ where: { id: tokenId }, data: { revoked: true } as any });
        return;
      }
    }
    const hash = crypto.createHash('sha256').update(String(refresh)).digest('hex');
    await prisma.refreshToken.updateMany({ where: { tokenHash: hash }, data: { revoked: true } });
  }

  async revokeAllForUser(userId: number) {
    await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
  }
}

export default new AuthService();
