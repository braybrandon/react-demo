import { PrismaClient } from '@prisma/client';
import { logAudit } from './audit.service';

const prisma = new PrismaClient();

class PermissionService {
  public PermissionError = class PermissionError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message || code);
      this.code = code;
    }
  };

  async list() {
    return prisma.permission.findMany({ select: { id: true, key: true, name: true, value: true, featureId: true } });
  }

  async getById(id: number) {
    const p = await prisma.permission.findUnique({ where: { id }, select: { id: true, key: true, name: true, value: true, featureId: true } });
    if (!p) throw new this.PermissionError('NOT_FOUND', 'Permission not found');
    return p;
  }

  async create({ key, name, value, featureId }: { key: string; name: string; value?: number; featureId: number }, actor?: { id?: number; name?: string }) {
    try {
      const p = await prisma.permission.create({ data: { key, name, value: value ?? 0, featureId } });
  // lookup feature name for friendlier audit summary
  const featureForLog = await prisma.feature.findUnique({ where: { id: featureId }, select: { name: true } as any });
  try {
    const summary = `${actor?.name ?? 'Someone'} created permission ${p.name} for feature ${(featureForLog as any)?.name ?? p.featureId}`;
    await logAudit({ actorId: actor?.id, actorName: (actor?.name) as string | undefined, entityType: 'PERMISSION', entityId: String(p.id), entityName: p.name as string | undefined, action: 'CREATE', details: { after: { id: p.id, name: p.name, key: p.key, featureId: p.featureId, featureName: (featureForLog as any)?.name }, summary } });
  } catch (e) { console.error('audit log failed', e); }
      return { id: p.id, key: p.key, name: p.name, value: p.value, featureId: p.featureId };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new this.PermissionError('DUPLICATE', 'Permission already exists for this feature');
      throw err;
    }
  }

  async update(id: number, patch: { key?: string; name?: string; value?: number; featureId?: number }, actor?: { id?: number; name?: string }) {
    try {
      const before = await prisma.permission.findUnique({ where: { id } });
      const p = await prisma.permission.update({ where: { id }, data: { ...(patch.key ? { key: patch.key } : {}), ...(patch.name ? { name: patch.name } : {}), ...(typeof patch.value !== 'undefined' ? { value: patch.value } : {}), ...(typeof patch.featureId !== 'undefined' ? { featureId: patch.featureId } : {}) } });
  // lookup feature name for the updated permission
  const featureForLog = await prisma.feature.findUnique({ where: { id: p.featureId }, select: { name: true } as any });
  try {
    const summary = `${actor?.name ?? 'Someone'} updated permission ${p.name} for feature ${(featureForLog as any)?.name ?? p.featureId}`;
    await logAudit({ actorId: actor?.id, actorName: (actor?.name) as string | undefined, entityType: 'PERMISSION', entityId: String(id), entityName: p.name as string | undefined, action: 'UPDATE', details: { before: { id: before?.id, name: (before as any)?.name }, after: { id: p.id, name: p.name, key: p.key, featureId: p.featureId, featureName: (featureForLog as any)?.name }, summary } });
  } catch (e) { console.error('audit log failed', e); }
      return { id: p.id, key: p.key, name: p.name, value: p.value, featureId: p.featureId };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.PermissionError('NOT_FOUND', 'Permission not found');
      if (err?.code === 'P2002') throw new this.PermissionError('CONFLICT', 'Permission key conflict for this feature');
      throw err;
    }
  }

  async delete(id: number, actor?: { id?: number; name?: string }) {
    try {
      // Read permission to obtain featureId before deleting
      const perm = await prisma.permission.findUnique({ where: { id } });
      if (!perm) throw new this.PermissionError('NOT_FOUND', 'Permission not found');
      const featureId = perm.featureId;

  const featureForLog = await prisma.feature.findUnique({ where: { id: featureId }, select: { name: true } as any });

  const before = perm;
  await prisma.permission.delete({ where: { id } });
  try {
    const summary = `${actor?.name ?? 'Someone'} deleted permission ${(before as any)?.name ?? id} for feature ${(featureForLog as any)?.name ?? featureId}`;
    await logAudit({ actorId: actor?.id, actorName: (actor?.name) as string | undefined, entityType: 'PERMISSION', entityId: String(id), entityName: before?.name as string | undefined, action: 'DELETE', details: { before: { id: before?.id, name: (before as any)?.name, featureName: (featureForLog as any)?.name }, summary } });
  } catch (e) { console.error('audit log failed', e); }

      // Recompute cache for all roles that referenced this permission (write-side invalidation)
      try {
        const rolePerms = await prisma.rolePermission.findMany({ where: { permissionId: id }, select: { roleId: true } });
        const roleIds = Array.from(new Set(rolePerms.map((rp: any) => rp.roleId)));
        for (const rid of roleIds) {
          await require('../services/rolePermissionService').recomputeCacheForRoleFeature(prisma, rid, featureId);
        }
      } catch (cacheErr) {
        console.error('Failed to recompute RoleFeaturePermission cache after permission delete:', cacheErr);
      }

      return { message: 'Deleted' };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.PermissionError('NOT_FOUND', 'Permission not found');
      throw err;
    }
  }
}

export default new PermissionService();
