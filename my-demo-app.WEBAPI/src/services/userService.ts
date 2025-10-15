import { PrismaClient } from '@prisma/client';
import rolePermissionService from './rolePermissionService';

const prisma = new PrismaClient();

export class UserError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message || code);
    this.code = code;
  }
}

const userService = {
  async listUsers() {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true } });
    return users;
  },

  async getUserById(id: number) {
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true } });
    if (!user) throw new UserError('NOT_FOUND', 'User not found');

    const userRoles = await prisma.userRole.findMany({ where: { userId: id }, include: { role: { select: { id: true, name: true } } } });
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

    return { ...user, roles, permissions };
  },

  async assignRole(userId: number, roleId: number) {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);
    if (!user) throw new UserError('USER_NOT_FOUND', 'User not found');
    if (!role) throw new UserError('ROLE_NOT_FOUND', 'Role not found');

    const existing = await prisma.userRole.findUnique({ where: { userId_roleId: { userId, roleId } } });
    if (existing) return { status: 'exists', message: 'Assignment already exists' };

    await prisma.userRole.create({ data: { userId, roleId } });
    return { status: 'created', message: 'Role assigned to user' };
  },

  async removeRole(userId: number, roleId: number) {
    try {
      await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
      return { message: 'Removed' };
    } catch (err: any) {
      if (err.code === 'P2025') throw new UserError('ASSIGN_NOT_FOUND', 'Assignment not found');
      throw err;
    }
  },
};

// Attach the error class so callers can check it via service reference
(userService as any).UserError = UserError;

export default userService;
