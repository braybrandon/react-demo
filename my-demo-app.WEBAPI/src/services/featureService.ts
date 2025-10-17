import { PrismaClient } from '@prisma/client';
import { logAudit } from './audit.service';

const prisma = new PrismaClient();

class FeatureService {
  public FeatureError = class FeatureError extends Error {
    code: string;
    constructor(code: string, message?: string) {
      super(message || code);
      this.code = code;
    }
  };

  async list() {
    return prisma.feature.findMany({ select: { id: true, key: true, name: true } });
  }

  async getById(id: number) {
    const f = await prisma.feature.findUnique({ where: { id }, select: { id: true, key: true, name: true } });
    if (!f) throw new this.FeatureError('NOT_FOUND', 'Feature not found');
    return f;
  }

  async create({ key, name }: { key: string; name: string }, actor?: { id?: number; name?: string }) {
    try {
      const f = await prisma.feature.create({ data: { key, name } });
      try {
        const summary = `${actor?.name ?? 'Someone'} created feature ${f.name}`;
        await logAudit({ entityType: 'FEATURE', entityId: String(f.id), entityName: f.name as string | undefined, action: 'CREATE', details: { after: { id: f.id, key: f.key, name: f.name }, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { id: f.id, key: f.key, name: f.name };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new this.FeatureError('DUPLICATE_KEY', 'Feature key already exists');
      throw err;
    }
  }

  async update(id: number, patch: { key?: string; name?: string }, actor?: { id?: number; name?: string }) {
    try {
      const f = await prisma.feature.update({ where: { id }, data: { ...(patch.key ? { key: patch.key } : {}), ...(patch.name ? { name: patch.name } : {}) } });
      try {
        const before = await prisma.feature.findUnique({ where: { id } });
        const summary = `${actor?.name ?? 'Someone'} updated feature ${f.name}`;
        await logAudit({ entityType: 'FEATURE', entityId: String(id), entityName: f.name as string | undefined, action: 'UPDATE', details: { before: { id: before?.id, key: (before as any)?.key, name: (before as any)?.name }, after: { id: f.id, key: f.key, name: f.name }, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { id: f.id, key: f.key, name: f.name };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.FeatureError('NOT_FOUND', 'Feature not found');
      if (err?.code === 'P2002') throw new this.FeatureError('DUPLICATE_KEY', 'Feature key already exists');
      throw err;
    }
  }

  async delete(id: number, actor?: { id?: number; name?: string }) {
    try {
      const before = await prisma.feature.findUnique({ where: { id } });
      await prisma.feature.delete({ where: { id } });
      try {
        const summary = `${actor?.name ?? 'Someone'} deleted feature ${(before as any)?.name ?? id}`;
        await logAudit({ entityType: 'FEATURE', entityId: String(id), entityName: before?.name as string | undefined, action: 'DELETE', details: { before: { id: before?.id, key: (before as any)?.key, name: (before as any)?.name }, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { message: 'Deleted' };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.FeatureError('NOT_FOUND', 'Feature not found');
      throw err;
    }
  }
}

export default new FeatureService();
