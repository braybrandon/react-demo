import { Router, Request, Response } from 'express';
import roleService from '../services/roleService';
import requireFeaturePermission from '../middleware/requireFeaturePermission';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /roles:
 *   get:
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: List roles
 *     responses:
 *       200:
 *         description: A list of roles
 */
router.get('/', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  try {
    const result = await roleService.listRoles();
    return res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

/**
 * @openapi
 * /roles/{id}:
 *   get:
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Get a role by id
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Role
 */
router.get('/:id', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const role = await roleService.getRoleById(id);
    res.json(role);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (roleService as any).RoleError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Role not found' });
    res.status(500).json({ error: 'Failed to fetch role' });
  }
});

/**
 * @openapi
 * /roles:
 *   post:
 *     tags: [Roles]
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
 *     summary: Create a role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const role = await roleService.createRole(name);
    res.status(201).json(role);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (roleService as any).RoleError && err.code === 'DUPLICATE') return res.status(409).json({ error: 'Role already exists' });
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * @openapi
 * /roles/{id}:
 *   put:
 *     tags: [Roles]
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
 *     summary: Update a role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated
 */
router.put('/:id', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name } = req.body as { name?: string };
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const role = await roleService.updateRole(id, name);
    res.json(role);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (roleService as any).RoleError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Role not found' });
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * @openapi
 * /roles/{roleId}/permissions/{permissionId}:
 *   put:
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Assign a permission to a role (idempotent)
 *     parameters:
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: permissionId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Assignment already existed
 *       201:
 *         description: Assignment created
 */
router.put('/:roleId/permissions/:permissionId', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const roleId = Number(req.params.roleId);
  const permissionId = Number(req.params.permissionId);
  if (Number.isNaN(roleId) || Number.isNaN(permissionId)) return res.status(400).json({ error: 'roleId and permissionId required' });

  try {
    const result = await roleService.assignPermission(roleId, permissionId);
    if (result.status === 'exists') return res.status(200).json({ message: result.message });
    return res.status(201).json({ message: result.message });
  } catch (err: any) {
    console.error(err);
    if (err instanceof (roleService as any).RoleError && err.code === 'ROLE_NOT_FOUND') return res.status(404).json({ error: 'Role not found' });
    if (err instanceof (roleService as any).RoleError && err.code === 'PERM_NOT_FOUND') return res.status(404).json({ error: 'Permission not found' });
    res.status(500).json({ error: 'Failed to assign permission' });
  }
});

/**
 * @openapi
 * /roles/{roleId}/permissions/{permissionId}:
 *   delete:
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     summary: Remove a permission from a role
 *     parameters:
 *       - in: path
 *         name: roleId
 *         schema:
 *           type: integer
 *         required: true
 *       - in: path
 *         name: permissionId
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Removed
 */
router.delete('/:roleId/permissions/:permissionId', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const roleId = Number(req.params.roleId);
  const permissionId = Number(req.params.permissionId);
  if (Number.isNaN(roleId) || Number.isNaN(permissionId)) return res.status(400).json({ error: 'roleId and permissionId required' });

  try {
    const result = await roleService.removePermission(roleId, permissionId);
    return res.json(result);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (roleService as any).RoleError && err.code === 'ASSIGN_NOT_FOUND') return res.status(404).json({ error: 'Assignment not found' });
    res.status(500).json({ error: 'Failed to remove permission from role' });
  }
});

/**
 * @openapi
 * /roles/{id}:
 *   delete:
 *     tags: [Roles]
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
 *     summary: Delete a role
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete('/:id', requireAuth, requireFeaturePermission('manage'), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const result = await roleService.deleteRole(id);
    res.json(result);
  } catch (err: any) {
    console.error(err);
    if (err instanceof (roleService as any).RoleError && err.code === 'NOT_FOUND') return res.status(404).json({ error: 'Role not found' });
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

export default router;
