import { PrismaClient } from '@prisma/client';

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

  async create({ key, name }: { key: string; name: string }) {
    try {
      const f = await prisma.feature.create({ data: { key, name } });
      return { id: f.id, key: f.key, name: f.name };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new this.FeatureError('DUPLICATE_KEY', 'Feature key already exists');
      throw err;
    }
  }

  async update(id: number, patch: { key?: string; name?: string }) {
    try {
      const f = await prisma.feature.update({ where: { id }, data: { ...(patch.key ? { key: patch.key } : {}), ...(patch.name ? { name: patch.name } : {}) } });
      return { id: f.id, key: f.key, name: f.name };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.FeatureError('NOT_FOUND', 'Feature not found');
      if (err?.code === 'P2002') throw new this.FeatureError('DUPLICATE_KEY', 'Feature key already exists');
      throw err;
    }
  }

  async delete(id: number) {
    try {
      await prisma.feature.delete({ where: { id } });
      return { message: 'Deleted' };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.FeatureError('NOT_FOUND', 'Feature not found');
      throw err;
    }
  }
}

export default new FeatureService();
