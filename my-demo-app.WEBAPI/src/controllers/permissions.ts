import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import permissionService from '../services/permissionService';
import requireFeaturePermission from '../middleware/requireFeaturePermission';

const router = Router();

/**
 * @openapi
 * /permissions:
 *   get:
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: List permissions
 *     responses:
 *       200:
 *         description: A list of permissions
 */
router.get('/', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  try {
    const permissions = await permissionService.list();
    res.json(permissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

/**
 * @openapi
 * /permissions/{id}:
 *   get:
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Get a permission by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Permission
 */
router.get('/:id', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const permission = await permissionService.getById(id);
    res.json(permission);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (permissionService as any).PermissionError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Permission not found' });
    res.status(500).json({ error: 'Failed to fetch permission' });
  }
});

/**
 * @openapi
 * /permissions:
 *   post:
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         schema:
 *           type: string
 *         required: false
 *         description: CSRF token obtained from GET /auth/csrf-token (when using cookie auth)
 *     summary: Create a permission
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, name, featureId]
 *             properties:
 *               key:
 *                 type: string
 *               name:
 *                 type: string
 *               value:
 *                 type: integer
 *               featureId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  const { key, name, value, featureId } = req.body as { key?: string; name?: string; value?: number; featureId?: number };
  if (!key || !name || typeof featureId !== 'number') return res.status(400).json({ error: 'key, name and featureId required' });
  try {
    const actor = req.user ? { id: (req.user as any).id, name: (req.user as any).name } : undefined;
    const permission = await permissionService.create({ key, name, value, featureId }, actor);
    res.status(201).json(permission);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (permissionService as any).PermissionError && err.code === 'DUPLICATE') return res.status(409).json({ error: 'Permission already exists for this feature' });
    res.status(500).json({ error: 'Failed to create permission' });
  }
});

/**
 * @openapi
 * /permissions/{id}:
 *   put:
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         schema:
 *           type: string
 *         required: false
 *         description: CSRF token obtained from GET /auth/csrf-token (when using cookie auth)
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     summary: Update a permission
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               name:
 *                 type: string
 *               value:
 *                 type: integer
 *               featureId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { key, name, value, featureId } = req.body as { key?: string; name?: string; value?: number; featureId?: number };
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  if (!key && !name && typeof value === 'undefined' && typeof featureId === 'undefined') return res.status(400).json({ error: 'At least one field required' });
  try {
  const actor = req.user ? { id: (req.user as any).id, name: (req.user as any).name } : undefined;
  const permission = await permissionService.update(id, { key, name, value, featureId }, actor);
    res.json(permission);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (permissionService as any).PermissionError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Permission not found' });
    if (err instanceof (permissionService as any).PermissionError && err.code === 'CONFLICT') return res.status(409).json({ error: 'Permission key conflict for this feature' });
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

/**
 * @openapi
 * /permissions/{id}:
 *   delete:
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: X-CSRF-Token
 *         schema:
 *           type: string
 *         required: false
 *         description: CSRF token obtained from GET /auth/csrf-token (when using cookie auth)
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     summary: Delete a permission
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
  const actor = req.user ? { id: (req.user as any).id, name: (req.user as any).name } : undefined;
  const result = await permissionService.delete(id, actor);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (permissionService as any).PermissionError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Permission not found' });
    res.status(500).json({ error: 'Failed to delete permission' });
  }
});

export default router;
