import { PrismaClient } from '@prisma/client';
import rolePermissionService from './rolePermissionService';

const prisma = new PrismaClient();

class RoleService {
  public RoleError = class RoleError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message || code);
      this.code = code;
    }
  };

  async listRoles() {
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    const roleIds = roles.map((r: { id: number; name: string }) => r.id);
    const permsByRole = await rolePermissionService.getPermissionsMapForRoles(prisma, roleIds);
    return roles.map((r: { id: number; name: string }) => ({ id: r.id, name: r.name, permissions: permsByRole[r.id] || {} }));
  }

  async getRoleById(id: number) {
    const role = await prisma.role.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!role) throw new this.RoleError('NOT_FOUND', 'Role not found');
    const perms = await rolePermissionService.getPermissionsMapForRole(prisma, id);
    return { id: role.id, name: role.name, permissions: perms };
  }

  async createRole(name: string) {
    try {
      const role = await prisma.role.create({ data: { name } });
      return { id: role.id, name: role.name };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new this.RoleError('DUPLICATE', 'Role already exists');
      throw err;
    }
  }

  async updateRole(id: number, name: string) {
    try {
      const role = await prisma.role.update({ where: { id }, data: { name } });
      return { id: role.id, name: role.name };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.RoleError('NOT_FOUND', 'Role not found');
      throw err;
    }
  }

  async deleteRole(id: number) {
    try {
      await prisma.role.delete({ where: { id } });
      return { message: 'Deleted' };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.RoleError('NOT_FOUND', 'Role not found');
      throw err;
    }
  }

  // Assign permission to role idempotently and update cache on write side
  async assignPermission(roleId: number, permissionId: number) {
    // validate existence
    const [role, permission] = await Promise.all([
      prisma.role.findUnique({ where: { id: roleId } }),
      prisma.permission.findUnique({ where: { id: permissionId } }),
    ]);
    if (!role) throw new this.RoleError('ROLE_NOT_FOUND', 'Role not found');
    if (!permission) throw new this.RoleError('PERM_NOT_FOUND', 'Permission not found');

    const existing = await prisma.rolePermission.findUnique({ where: { roleId_permissionId: { roleId, permissionId } } });
    if (existing) return { status: 'exists', message: 'Assignment already exists' };

    await prisma.rolePermission.create({ data: { roleId, permissionId } });

    // Update cache for role+feature
    try {
      await rolePermissionService.updateCacheOnAssign(prisma, roleId, permission as any);
    } catch (cacheErr) {
      console.error('Failed to update RoleFeaturePermission cache:', cacheErr);
    }

    return { status: 'created', message: 'Permission assigned to role' };
  }

  // Remove permission from role and recompute cache
  async removePermission(roleId: number, permissionId: number) {
    try {
      await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.RoleError('ASSIGN_NOT_FOUND', 'Assignment not found');
      throw err;
    }

    // recompute cache for the feature
    try {
      const deletedPerm = await prisma.permission.findUnique({ where: { id: permissionId } });
      const featureId = deletedPerm?.featureId;
      if (typeof featureId !== 'undefined') {
        await rolePermissionService.recomputeCacheForRoleFeature(prisma, roleId, featureId);
      }
    } catch (cacheErr) {
      console.error('Failed to recompute RoleFeaturePermission cache:', cacheErr);
    }

    return { message: 'Removed' };
  }
}

export default new RoleService();
