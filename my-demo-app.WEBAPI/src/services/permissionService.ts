import { PrismaClient } from '@prisma/client';

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

  async create({ key, name, value, featureId }: { key: string; name: string; value?: number; featureId: number }) {
    try {
      const p = await prisma.permission.create({ data: { key, name, value: value ?? 0, featureId } });
      return { id: p.id, key: p.key, name: p.name, value: p.value, featureId: p.featureId };
    } catch (err: any) {
      if (err?.code === 'P2002') throw new this.PermissionError('DUPLICATE', 'Permission already exists for this feature');
      throw err;
    }
  }

  async update(id: number, patch: { key?: string; name?: string; value?: number; featureId?: number }) {
    try {
      const p = await prisma.permission.update({ where: { id }, data: { ...(patch.key ? { key: patch.key } : {}), ...(patch.name ? { name: patch.name } : {}), ...(typeof patch.value !== 'undefined' ? { value: patch.value } : {}), ...(typeof patch.featureId !== 'undefined' ? { featureId: patch.featureId } : {}) } });
      return { id: p.id, key: p.key, name: p.name, value: p.value, featureId: p.featureId };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.PermissionError('NOT_FOUND', 'Permission not found');
      if (err?.code === 'P2002') throw new this.PermissionError('CONFLICT', 'Permission key conflict for this feature');
      throw err;
    }
  }

  async delete(id: number) {
    try {
      await prisma.permission.delete({ where: { id } });
      return { message: 'Deleted' };
    } catch (err: any) {
      if (err?.code === 'P2025') throw new this.PermissionError('NOT_FOUND', 'Permission not found');
      throw err;
    }
  }
}

export default new PermissionService();
