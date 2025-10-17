import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import rolePermissionService from '../services/rolePermissionService';
import authService from '../services/authService';
import userService from '../services/userService';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreate'
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });

  try {
    // If an authenticated user created this (e.g., admin console), include actor info
    const actor = (req as any).user ? { id: (req as any).user.id, name: (req as any).user.name } : undefined;
    const user = await authService.registerUser(name, email, password, actor);
    res.status(201).json({ id: user.id, name: user.name, email: user.email });
  } catch (err: any) {
    console.error(err);
    if (err.code === 'P2002') return res.status(409).json({ error: 'Email already in use' });
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const { user, accessToken, refreshToken } = await authService.authenticateAndCreateTokens(email, password);

    // Update last login timestamp
    try {
      await userService.updateLastLogin(user.id);
    } catch (err) {
      console.error('Failed to update lastLogin', err);
    }

    // Set cookies
    res.cookie('access', accessToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    if (process.env.NODE_ENV === 'development') return res.json({ accessToken, refreshToken });
    res.json({ message: 'Logged in' });
  } catch (err) {
    console.error(err);
    if (err instanceof (authService as any).AuthError) {
      const code = (err as any).code as string;
      if (code === 'INVALID_CREDENTIALS') return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     summary: Refresh access token using refresh cookie
 *     responses:
 *       200:
 *         description: New access token issued
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refresh = (req as any).cookies?.refresh;
    const result = await authService.verifyAndRotateRefresh(refresh);
    res.cookie('access', result.newAccess, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh', result.newRefreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });

    // Update last login for the user associated with the refresh token
    try {
      if (result && result.user && result.user.id) await userService.updateLastLogin(result.user.id);
    } catch (err) {
      console.error('Failed to update lastLogin on refresh', err);
    }

    return res.json({ message: 'Access token refreshed' });
  } catch (err) {
    console.error(err);
    if (err instanceof (authService as any).AuthError) {
      const code = (err as any).code as string;
      if (['MISSING_REFRESH', 'INVALID_REFRESH', 'EXPIRED_REFRESH', 'REUSE_DETECTED', 'INVALID_REFRESH_USER', 'INVALID_REFRESH_USER'].includes(code)) {
        return res.status(401).json({ error: (err as any).message });
      }
    }
    res.status(401).json({ error: 'Refresh failed' });
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     summary: Logout and clear cookies
 *     responses:
 *       200:
 *         description: Logged out
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refresh = (req as any).cookies?.refresh;
    await authService.revokeRefreshCookie(refresh);
  } catch (err) {
    console.error('Logout revoke error', err);
  }
  res.clearCookie('access');
  res.clearCookie('refresh');
  res.json({ message: 'Logged out' });
});

/**
 * @openapi
 * /auth/csrf-token:
 *   get:
 *     tags: [Auth]
 *     summary: Get CSRF token for cookie-based requests
 *     description: |
 *       Returns a CSRF token which must be included on mutating requests as the
 *       `X-CSRF-Token` header when using cookie-based authentication. If you
 *       authenticate using a Bearer token (Authorization header), CSRF is
 *       bypassed.
 *     responses:
 *       200:
 *         description: CSRF token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 csrfToken:
 *                   type: string
 */
router.get('/csrf-token', (req: Request, res: Response) => {
  // If csurf middleware is active it will attach req.csrfToken(). If not (e.g.
  // in local development where CSRF is disabled), return a development token
  // to keep client flows simple.
  const tokenFn = (req as any).csrfToken as (() => string) | undefined;
  if (typeof tokenFn === 'function') {
    return res.json({ csrfToken: tokenFn() });
  }
  // Development fallback token — not cryptographically meaningful and only
  // for local/dev convenience.
  return res.json({ csrfToken: process.env.DEV_CSRF_TOKEN || 'dev-csrf-token' });
});

/**
 * @openapi
 * /auth/change-password:
 *   post:
 *     tags: [Auth]
 *     summary: Change or set a user's password
 *     description: |
 *       If the user has no password (e.g. created via external provider), this
 *       endpoint allows setting an initial password by providing `email` and
 *       `newPassword`. If the user already has a password, the `currentPassword`
 *       must be provided and verified before updating to `newPassword`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Bad request / missing fields
 *       401:
 *         description: Invalid credentials
 *       404:
 *         description: User not found
 */
router.post('/change-password', async (req: Request, res: Response) => {
  const { email, currentPassword, newPassword } = req.body as {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword required' });

  try {
    const actor = (req as any).user ? { id: (req as any).user.id, name: (req as any).user.name } : undefined;
    const result = await authService.changePassword(email, currentPassword, newPassword, actor);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Get current authenticated user
 *     responses:
 *       200:
 *         description: The current user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId as number;
    const payload = await authService.getUserWithPermissions(userId);
    res.json({ ...payload.user, roles: payload.roles, permissions: payload.permissions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * @openapi
 * /auth/status:
 *   get:
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Check authentication status (debug)
 *     responses:
 *       200:
 *         description: Authentication status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const user = await authService.getAuthStatusFromRequest(req);
    if (!user) return res.json({ authenticated: false });
    return res.json({ authenticated: true, user });
  } catch (err) {
    return res.json({ authenticated: false });
  }
});

export default router;
