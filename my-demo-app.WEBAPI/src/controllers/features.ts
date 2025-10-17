import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import featureService from '../services/featureService';
import requireFeaturePermission from '../middleware/requireFeaturePermission';

const router = Router();

/**
 * @openapi
 * /features:
 *   get:
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: List features
 *     responses:
 *       200:
 *         description: A list of features
 */
router.get('/', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  try {
    const features = await featureService.list();
    res.json(features);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

/**
 * @openapi
 * /features/{id}:
 *   get:
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Get a feature by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Feature
 */
router.get('/:id', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const feature = await featureService.getById(id);
    res.json(feature);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (featureService as any).FeatureError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Feature not found' });
    res.status(500).json({ error: 'Failed to fetch feature' });
  }
});

/**
 * @openapi
 * /features:
 *   post:
 *     tags: [Features]
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
 *     summary: Create a feature
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, name]
 *             properties:
 *               key:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  const { key, name } = req.body as { key?: string; name?: string };
  if (!key || !name) return res.status(400).json({ error: 'key and name required' });
  try {
    const actor = req.user ? { id: (req.user as any).id, name: (req.user as any).name } : undefined;
    const feature = await featureService.create({ key, name }, actor);
    res.status(201).json(feature);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (featureService as any).FeatureError && err.code === 'DUPLICATE_KEY') return res.status(409).json({ error: 'Feature key already exists' });
    res.status(500).json({ error: 'Failed to create feature' });
  }
});

/**
 * @openapi
 * /features/{id}:
 *   put:
 *     tags: [Features]
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
 *     summary: Update a feature
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
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const { key, name } = req.body as { key?: string; name?: string };
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  if (!key && !name) return res.status(400).json({ error: 'key or name required' });
  try {
  const actor = req.user ? { id: (req.user as any).id, name: (req.user as any).name } : undefined;
  const feature = await featureService.update(id, { key, name }, actor);
    res.json(feature);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (featureService as any).FeatureError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Feature not found' });
    if (err instanceof (featureService as any).FeatureError && err.code === 'DUPLICATE_KEY') return res.status(409).json({ error: 'Feature key already exists' });
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

/**
 * @openapi
 * /features/{id}:
 *   delete:
 *     tags: [Features]
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
 *     summary: Delete a feature
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', requireAuth, requireFeaturePermission('manage'), async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const actor = req.user ? { id: (req.user as any).id, name: (req.user as any).name } : undefined;
    const result = await featureService.delete(id, actor);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (featureService as any).FeatureError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Feature not found' });
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

export default router;
