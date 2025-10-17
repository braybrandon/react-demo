import { PrismaClient } from '@prisma/client';
import rolePermissionService from './rolePermissionService';
import { logAudit } from './audit.service';

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

  async createRole(name: string, actor?: { id?: number; name?: string }) {
    try {
      const role = await prisma.role.create({ data: { name } });
      // audit
      try {
        const summary = `${actor?.name ?? 'Someone'} created role ${role.name}`;
        await logAudit({ entityType: 'ROLE', entityId: String(role.id), entityName: role.name as string | undefined, action: 'CREATE', details: { after: { id: role.id, name: role.name }, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { id: role.id, name: role.name };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new this.RoleError('DUPLICATE', 'Role already exists');
      throw err;
    }
  }

  async updateRole(id: number, name: string, actor?: { id?: number; name?: string }) {
    try {
      const before = await prisma.role.findUnique({ where: { id } });
      const role = await prisma.role.update({ where: { id }, data: { name } });
      try {
        const summary = `${actor?.name ?? 'Someone'} updated role ${role.name}`;
        await logAudit({ entityType: 'ROLE', entityId: String(id), entityName: role.name as string | undefined, action: 'UPDATE', details: { before: { id: before?.id, name: (before as any)?.name }, after: { id: role.id, name: role.name }, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { id: role.id, name: role.name };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.RoleError('NOT_FOUND', 'Role not found');
      throw err;
    }
  }

  async deleteRole(id: number, actor?: { id?: number; name?: string }) {
    try {
      const before = await prisma.role.findUnique({ where: { id } });
      await prisma.role.delete({ where: { id } });
      try {
        const summary = `${actor?.name ?? 'Someone'} deleted role ${before?.name ?? id}`;
        await logAudit({ entityType: 'ROLE', entityId: String(id), entityName: (before as any)?.name as string | undefined, action: 'DELETE', details: { before: { id: before?.id, name: (before as any)?.name }, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { message: 'Deleted' };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.RoleError('NOT_FOUND', 'Role not found');
      throw err;
    }
  }

  // Assign permission to role idempotently and update cache on write side
  async assignPermission(roleId: number, permissionId: number, actor?: { id?: number; name?: string }) {
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
    // audit: log at permission level (permission assigned to a role)
    try {
      const summary = `${actor?.name ?? 'Someone'} assigned permission ${(permission as any).name} to role ${(role as any).name}`;
      await logAudit({ entityType: 'PERMISSION', entityId: String(permissionId), entityName: ((permission as any)?.name) as string | undefined, action: 'ASSIGN', details: { roleId, roleName: (role as any).name, permissionId, permissionName: (permission as any).name, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
    } catch (e) { console.error('audit log failed', e); }

    // Update cache for role+feature
    try {
      await rolePermissionService.updateCacheOnAssign(prisma, roleId, permission as any);
    } catch (cacheErr) {
      console.error('Failed to update RoleFeaturePermission cache:', cacheErr);
    }

    return { status: 'created', message: 'Permission assigned to role' };
  }

  // Remove permission from role and recompute cache
  async removePermission(roleId: number, permissionId: number, actor?: { id?: number; name?: string }) {
    try {
      const permForLog = await prisma.permission.findUnique({ where: { id: permissionId }, select: { name: true } as any });
      // fetch role name for richer summary
      const roleForLog = await prisma.role.findUnique({ where: { id: roleId }, select: { name: true } as any });
      await prisma.rolePermission.delete({ where: { roleId_permissionId: { roleId, permissionId } } });
      // audit: log at permission level (permission removed from a role)
      try {
        const summary = `${actor?.name ?? 'Someone'} removed permission ${(permForLog as any)?.name ?? permissionId} from role ${(roleForLog as any)?.name ?? roleId}`;
        await logAudit({ entityType: 'PERMISSION', entityId: String(permissionId), entityName: (permForLog as any)?.name as string | undefined, action: 'UNASSIGN', details: { roleId, roleName: (roleForLog as any)?.name, permissionId, permissionName: (permForLog as any)?.name, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
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
