import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import requireFeaturePermission from '../middleware/requireFeaturePermission';
import { queryAudit, queryAuditSummary } from '../services/audit.service';
import { countAudit } from '../services/audit.service';

const VALID_ENTITY_TYPES = ['USER', 'ROLE', 'FEATURE', 'PERMISSION', 'OTHER'] as const;

type EntityType = typeof VALID_ENTITY_TYPES[number];

const router = Router();

/**
 * @openapi
 * /audit:
 *   get:
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Query audit logs
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to return (max 500)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *         description: Offset for pagination
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [USER, ROLE, FEATURE, PERMISSION, OTHER]
 *         description: Filter by entity type
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by entity id
 *       - in: query
 *         name: actorId
 *         schema:
 *           type: integer
 *         description: Filter by actor id
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (inclusive)
 *       - in: query
 *         name: until
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (inclusive)
 *     responses:
 *       200:
 *         description: List of audit records
 */
router.get('/', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(500, Math.max(1, Number(req.query.limit || 50)));
    const offset = Math.max(0, Number(req.query.offset || 0));
    const entityTypeRaw = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
    let entityType: EntityType | undefined;
    if (entityTypeRaw) {
      if (!VALID_ENTITY_TYPES.includes(entityTypeRaw as any)) return res.status(400).json({ error: 'Invalid entityType' });
      entityType = entityTypeRaw as EntityType;
    }
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
    const actorId = req.query.actorId ? Number(req.query.actorId) : undefined;
    const since = req.query.since ? new Date(String(req.query.since)) : undefined;
    const until = req.query.until ? new Date(String(req.query.until)) : undefined;

    const rows = await queryAudit({ entityType, entityId, actorId, limit, offset, since, until });
    res.json(rows);
  } catch (err) {
    console.error('Failed to query audit logs', err);
    res.status(500).json({ error: 'Failed to query audit logs' });
  }
});


/**
 * @openapi
 * /audit/summary:
 *   get:
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Get audit summary (counts grouped by entityType and action)
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: until
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Summary counts
 */
router.get('/summary', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  try {
    const since = req.query.since ? new Date(String(req.query.since)) : undefined;
    const until = req.query.until ? new Date(String(req.query.until)) : undefined;
    const rows = await queryAuditSummary({ since, until });
    res.json(rows);
  } catch (err) {
    console.error('Failed to query audit summary', err);
    res.status(500).json({ error: 'Failed to query audit summary' });
  }
});

/**
 * GET /audit/changes
 * returns { count: number } - number of audit rows in the past N hours (default 24)
 */
router.get('/changes', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  try {
    const hours = req.query.hours ? Number(req.query.hours) : 24;
    const since = new Date(Date.now() - Math.max(1, hours) * 60 * 60 * 1000);
    const entityTypeRaw = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
    let entityType: EntityType | undefined;
    if (entityTypeRaw) {
      if (!VALID_ENTITY_TYPES.includes(entityTypeRaw as any)) return res.status(400).json({ error: 'Invalid entityType' });
      entityType = entityTypeRaw as EntityType;
    }
    const count = await countAudit({ since, entityType });
    res.json({ count });
  } catch (err) {
    console.error('Failed to query audit changes', err);
    res.status(500).json({ error: 'Failed to query audit changes' });
  }
});

export default router;
