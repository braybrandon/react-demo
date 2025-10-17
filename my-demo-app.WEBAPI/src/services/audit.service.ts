import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type EntityType = 'USER' | 'ROLE' | 'FEATURE' | 'PERMISSION' | 'OTHER';
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'ASSIGN' | 'UNASSIGN';

export async function logAudit(opts: {
  actorId?: number | null;
  actorName?: string | null;
  entityType: EntityType;
  entityId?: string | null;
  entityName?: string | null;
  action: ActionType;
  details?: any;
}) {
  const { actorId, actorName, entityType, entityId, entityName, action, details } = opts;
  // sanitize details to remove sensitive fields before persisting
  const sanitizedDetails = sanitize(details);

  // If entityName not provided, try to resolve it for common entity types
  let resolvedEntityName: string | null | undefined = entityName ?? undefined;
  try {
    if (!resolvedEntityName && entityId) {
      if (entityType === 'USER') {
        const u = await prisma.user.findUnique({ where: { id: Number(entityId) }, select: { name: true, email: true } as any });
        if (u) resolvedEntityName = (u as any).name || (u as any).email;
      } else if (entityType === 'ROLE') {
        const r = await prisma.role.findUnique({ where: { id: Number(entityId) }, select: { name: true } as any });
        if (r) resolvedEntityName = (r as any).name;
      } else if (entityType === 'FEATURE') {
        const f = await prisma.feature.findUnique({ where: { id: Number(entityId) }, select: { name: true } as any });
        if (f) resolvedEntityName = (f as any).name;
      } else if (entityType === 'PERMISSION') {
        const p = await prisma.permission.findUnique({ where: { id: Number(entityId) }, select: { name: true } as any });
        if (p) resolvedEntityName = (p as any).name;
      }
    }
  } catch (e) {
    // Non-fatal; don't block primary action if lookup fails
    console.error('Failed to resolve entityName for audit', e);
  }

  return (prisma as any).auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      actorName: actorName ?? undefined,
      entityType: entityType as any,
      entityId: entityId ?? undefined,
      entityName: resolvedEntityName ?? undefined,
      action: action as any,
      details: sanitizedDetails ?? undefined,
    },
  });
}

// Remove common sensitive fields (password hashes, tokens, secrets) from objects recursively.
function sanitize(obj: any): any {
  if (obj == null) return obj;
  // primitive
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);

  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    const lower = k.toLowerCase();
    // keys that likely contain secrets
    if (lower.includes('password') || lower.includes('hashedpassword') || lower.includes('token') || lower.includes('secret') || lower.includes('refresh')) {
      // skip
      continue;
    }
    // otherwise recurse
    out[k] = sanitize(v);
  }
  return out;
}

export async function queryAudit(params: {
  entityType?: EntityType;
  entityId?: string;
  actorId?: number;
  limit?: number;
  offset?: number;
  since?: Date;
  until?: Date;
}) {
  const { entityType, entityId, actorId, limit = 50, offset = 0, since, until } = params;
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (actorId) where.actorId = actorId;
  if (since || until) where.createdAt = {};
  if (since) where.createdAt.gte = since;
  if (until) where.createdAt.lte = until;

  return (prisma as any).auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

// Returns aggregated counts grouped by entityType and action. Example shape:
// [ { entityType: 'USER', action: 'CREATE', count: 12 }, ... ]
export async function queryAuditSummary(params: { since?: Date; until?: Date }) {
  const { since, until } = params;
  const where: any = {};
  if (since || until) where.createdAt = {};
  if (since) where.createdAt.gte = since;
  if (until) where.createdAt.lte = until;

  // Use raw query if groupBy not available. Prisma groupBy is available but to be safe we use findMany + aggregation
  // We'll perform grouping in JS after fetching a limited window (should be small for admin queries); if your dataset is large
  // consider using prisma.$queryRaw with a proper GROUP BY SQL for performance.
  const rows = await (prisma as any).auditLog.findMany({ where, select: { entityType: true, action: true } });
  const map: Record<string, number> = {};
  for (const r of rows) {
    const key = `${r.entityType}::${r.action}`;
    map[key] = (map[key] || 0) + 1;
  }
  const out: Array<{ entityType: EntityType; action: ActionType; count: number }> = [];
  for (const [k, v] of Object.entries(map)) {
    const [et, act] = k.split('::');
    out.push({ entityType: et as EntityType, action: act as ActionType, count: v });
  }
  return out;
}

// Count audit rows matching filters. Returns integer count.
export async function countAudit(params: { entityType?: EntityType; actorId?: number; since?: Date; until?: Date }) {
  const { entityType, actorId, since, until } = params;
  const where: any = {};
  if (entityType) where.entityType = entityType;
  if (actorId) where.actorId = actorId;
  if (since || until) where.createdAt = {};
  if (since) where.createdAt.gte = since;
  if (until) where.createdAt.lte = until;

  return (prisma as any).auditLog.count({ where });
}
