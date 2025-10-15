import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import authService from '../services/authService';

/**
 * requireFeaturePermission ensures the authenticated user has the specified permission bit for the featureKey.
 * It expects the auth middleware has already populated req.user (or will resolve via authService if missing).
 */
export default function requireFeaturePermission(featureKey: string, requiredMask?: number) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const areq = req as AuthRequest;
    try {
      // Determine required mask from HTTP method when not explicitly provided
      let mask = requiredMask;
      if (typeof mask === 'undefined') {
        switch ((req.method || 'GET').toUpperCase()) {
          case 'GET':
            mask = 1; // read
            break;
          case 'POST':
            mask = 2; // create
            break;
          case 'PUT':
          case 'PATCH':
            mask = 4; // update
            break;
          case 'DELETE':
            mask = 8; // delete
            break;
          default:
            mask = 1;
        }
      }
      
      const payload: any = await authService.getUserWithPermissions(areq.userId as number);
      const permissions = (payload as any)?.permissions || {};
      const value = permissions[featureKey] || 0;

      // Check bitmask
      if ((value & mask) === mask) return next();

      return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
    } catch (err) {
      console.error('requireFeaturePermission error', err);
      return res.status(403).json({ error: 'Forbidden - insufficient permissions' });
    }
  };
}
