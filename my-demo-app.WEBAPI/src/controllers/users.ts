import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import userService from '../services/userService';
import requireFeaturePermission from '../middleware/requireFeaturePermission';

const router = Router();

/**
 * @openapi
 * /users:
 *   get:
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: List users
 *     responses:
 *       200:
 *         description: A list of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
router.get('/', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  try {
    const users = await userService.listUsers();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * @openapi
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Get a user by id including roles and aggregated permissions
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: User
 */
router.get('/:id', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const user = await userService.getUserById(id);
    res.json(user);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (userService as any).UserError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * @openapi
 * /users/{userId}/roles/{roleId}:
 *   put:
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Assign a role to a user (idempotent)
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Assignment already existed or was updated
 *       201:
 *         description: Assignment created
 */
router.put('/:userId/roles/:roleId', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const roleId = Number(req.params.roleId);
  if (Number.isNaN(userId) || Number.isNaN(roleId)) return res.status(400).json({ error: 'userId and roleId required' });

  try {
    const result = await userService.assignRole(userId, roleId);
    if (result.status === 'exists') return res.status(200).json({ message: result.message });
    return res.status(201).json({ message: result.message });
  } catch (err: any) {
    console.error(err);
    if (err instanceof (userService as any).UserError && err.code === 'USER_NOT_FOUND') return res.status(404).json({ error: 'User not found' });
    if (err instanceof (userService as any).UserError && err.code === 'ROLE_NOT_FOUND') return res.status(404).json({ error: 'Role not found' });
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

/**
 * @openapi
 * /users/{userId}/roles/{roleId}:
 *   delete:
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Remove a role from a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Removed
 */
router.delete('/:userId/roles/:roleId', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const userId = Number(req.params.userId);
  const roleId = Number(req.params.roleId);
  if (Number.isNaN(userId) || Number.isNaN(roleId)) return res.status(400).json({ error: 'Invalid id' });

  try {
    const result = await userService.removeRole(userId, roleId);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (userService as any).UserError && err.code === 'ASSIGN_NOT_FOUND') return res.status(404).json({ error: 'Assignment not found' });
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

export default router;
