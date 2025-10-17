import { PrismaClient } from '@prisma/client';

// Business/service layer for role permission aggregation and cache persistence
export async function getPermissionsMapForRoles(prisma: PrismaClient, roleIds: number[]) {
  const map: Record<number, Record<string, number>> = {};
  if (!roleIds || roleIds.length === 0) return map;

  // Fetch cached RoleFeaturePermission rows for the requested roles
  const cached = await prisma.roleFeaturePermission.findMany({
    where: { roleId: { in: roleIds } },
    include: { feature: { select: { id: true, key: true } } },
  });

  for (const c of cached) {
    const rid = c.roleId;
    const key = c.feature?.key;
    if (!key) continue;
    if (!map[rid]) map[rid] = {};
    map[rid][key] = c.bitmask;
  }

  // Find which roleIds are missing cached entries
  const missing = roleIds.filter((id) => !map[id] || Object.keys(map[id]).length === 0);

  // Compute & persist for missing roles
  for (const mid of missing) {
    const computed = await computeAndPersistForRole(prisma, mid);
    map[mid] = computed;
  }

  return map;
}

export async function getPermissionsMapForRole(prisma: PrismaClient, roleId: number) {
  const maps = await getPermissionsMapForRoles(prisma, [roleId]);
  return maps[roleId] || {};
}

async function computeAndPersistForRole(prisma: PrismaClient, roleId: number) {
  const perms: Record<string, number> = {};

  const rp = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permission: { select: { value: true, feature: { select: { id: true, key: true } } } } },
  });

  const toPersist: Array<{ featureId: number; bitmask: number }> = [];
  for (const item of rp) {
    const p = (item as any).permission as any;
    const fk = p?.feature?.key;
    const fid = p?.feature?.id;
    if (!fk || typeof fid === 'undefined') continue;
    const newMask = (perms[fk] || 0) | (p.value ?? 0);
    perms[fk] = newMask;
    toPersist.push({ featureId: fid, bitmask: perms[fk] });
  }

  // Persist computed masks into cache (merge with existing)
  try {
    for (const tp of toPersist) {
      const existing = await prisma.roleFeaturePermission.findUnique({ where: { roleId_featureId: { roleId, featureId: tp.featureId } as any } });
      if (existing) {
        const merged = existing.bitmask | tp.bitmask;
        if (merged !== existing.bitmask) {
          const before = existing;
          const updated = await prisma.roleFeaturePermission.update({ where: { id: existing.id }, data: { bitmask: merged } });
        }
      } else {
        await prisma.roleFeaturePermission.create({ data: { roleId, featureId: tp.featureId, bitmask: tp.bitmask } });
      }
    }
  } catch (err) {
    console.error('Failed to persist computed RoleFeaturePermission cache (service):', err);
  }

  return perms;
}

const _default = { getPermissionsMapForRoles, getPermissionsMapForRole, updateCacheOnAssign, recomputeCacheForRoleFeature };
export default _default;

// Update the role+feature cache when a permission is assigned to a role
export async function updateCacheOnAssign(prisma: PrismaClient, roleId: number, permission: any) {
  try {
    const featureId = permission?.featureId;
    if (typeof featureId === 'undefined') return;
    const existing = await prisma.roleFeaturePermission.findUnique({ where: { roleId_featureId: { roleId, featureId } as any } });
    const newMask = ((existing?.bitmask ?? 0) | (permission.value ?? 0));
    if (existing) {
      const before = existing;
      const updated = await prisma.roleFeaturePermission.update({ where: { id: existing.id }, data: { bitmask: newMask } });
    } else {
      await prisma.roleFeaturePermission.create({ data: { roleId, featureId, bitmask: newMask } });
    }
  } catch (err) {
    console.error('Failed to update RoleFeaturePermission cache on assign (service):', err);
  }
}

// Recompute cached bitmask for a role+feature after a permission removal
export async function recomputeCacheForRoleFeature(prisma: PrismaClient, roleId: number, featureId: number) {
  try {
    const remaining = await prisma.rolePermission.findMany({ where: { roleId, permission: { featureId } }, select: { permission: { select: { value: true } } } });
    const newMask = remaining.reduce((acc: number, rp: any) => acc | (rp.permission?.value ?? 0), 0);
    const existing = await prisma.roleFeaturePermission.findUnique({ where: { roleId_featureId: { roleId, featureId } as any } });
    if (existing) {
      if (newMask === 0) {
        await prisma.roleFeaturePermission.delete({ where: { id: existing.id } });
      } else {
        await prisma.roleFeaturePermission.update({ where: { id: existing.id }, data: { bitmask: newMask } });
      }
    } else if (newMask !== 0) {
      await prisma.roleFeaturePermission.create({ data: { roleId, featureId, bitmask: newMask } });
    }
  } catch (err) {
    console.error('Failed to recompute RoleFeaturePermission cache (service):', err);
  }
}

export type RolePermissionService = typeof import('./rolePermissionService');
