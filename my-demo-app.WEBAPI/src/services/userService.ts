import { PrismaClient } from '@prisma/client';
import rolePermissionService from './rolePermissionService';
import { logAudit } from './audit.service';

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
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true, lastLogin: true, status: true } as any });
    const userIds = users.map((u: any) => u.id);
    if (userIds.length === 0) return users.map((u: any) => ({ ...u, roles: [] }));

    const userRoles = await prisma.userRole.findMany({ where: { userId: { in: userIds } }, include: { role: { select: { id: true, name: true } } } });
    const rolesByUser: Record<number, any[]> = {};
    for (const ur of userRoles) {
      if (!rolesByUser[ur.userId]) rolesByUser[ur.userId] = [];
      if (ur.role) rolesByUser[ur.userId].push(ur.role);
    }

    return users.map((u: any) => {
      const uu = u as any;
      return {
        ...uu,
        roles: rolesByUser[uu.id] || [],
        // derive a friendly status string for clients: archived, inactive (lastLogin > 7 days), or active
        derivedStatus: uu.status === 'ARCHIVED' ? 'archived' : (uu.lastLogin && new Date(uu.lastLogin) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'inactive' : 'active'),
      };
    });
  },

  async getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, createdAt: true, lastLogin: true, status: true } as any });
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

    const uu = user as any;
    const derivedStatus = uu.status === 'ARCHIVED' ? 'archived' : (uu.lastLogin && new Date(uu.lastLogin) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 'inactive' : 'active');

    return { ...uu, roles, permissions, derivedStatus };
  },

  async assignRole(userId: number, roleId: number, actor?: { id?: number; name?: string }) {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);
    if (!user) throw new UserError('USER_NOT_FOUND', 'User not found');
    if (!role) throw new UserError('ROLE_NOT_FOUND', 'Role not found');

    const existing = await prisma.userRole.findUnique({ where: { userId_roleId: { userId, roleId } } });
    if (existing) return { status: 'exists', message: 'Assignment already exists' };

    await prisma.userRole.create({ data: { userId, roleId } });
    try {
      // Log at role level: role was assigned to a user
      const details = { userId, userName: (user as any).name, roleId, roleName: (role as any).name };
      const summary = `${actor?.name ?? 'Someone'} assigned role ${(role as any).name} to ${(user as any).name}`;
      await logAudit({ entityType: 'ROLE', entityId: String(roleId), entityName: ((role as any).name) as string | undefined, action: 'ASSIGN', details: { ...details, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
    } catch (e) {
      console.error('audit log failed', e);
    }
    return { status: 'created', message: 'Role assigned to user' };
  },

  async removeRole(userId: number, roleId: number, actor?: { id?: number; name?: string }) {
    try {
      // fetch names for richer audit details
      const [user, role] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } as any }),
        prisma.role.findUnique({ where: { id: roleId }, select: { name: true } as any }),
      ]);
      await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
      try {
        const details = { userId, userName: user?.name, roleId, roleName: role?.name };
        const summary = `${actor?.name ?? 'Someone'} removed role ${role?.name ?? roleId} from ${user?.name ?? userId}`;
        await logAudit({ entityType: 'ROLE', entityId: String(roleId), entityName: (role?.name ?? undefined) as string | undefined, action: 'UNASSIGN', details: { ...details, summary }, actorId: actor?.id, actorName: (actor?.name) as string | undefined });
      } catch (e) { console.error('audit log failed', e); }
      return { message: 'Removed' };
    } catch (err: any) {
      if (err.code === 'P2025') throw new UserError('ASSIGN_NOT_FOUND', 'Assignment not found');
      throw err;
    }
  },

  // Update a user's last login timestamp
  async updateLastLogin(userId: number) {
    await prisma.user.update({ where: { id: userId }, data: { lastLogin: new Date() } as any });
  },

  // Update user's basic profile fields (name, email, status)
  async updateUser(id: number, data: { name?: string; email?: string; status?: string }, actor?: { id?: number; name?: string }) {
    const updateData: any = {};
    if (typeof data.name === 'string') updateData.name = data.name;
    if (typeof data.email === 'string') updateData.email = data.email;
    // Only persist explicit 'archived' state; other values are ignored (inactive is derived)
    if (typeof data.status === 'string') {
      if (data.status.toLowerCase() === 'archived') updateData.status = 'ARCHIVED';
      else if (data.status.toLowerCase() === 'active') updateData.status = 'ACTIVE';
    }

    try {
      const before = await prisma.user.findUnique({ where: { id } });
      const user = await prisma.user.update({ where: { id }, data: updateData });
      try {
        const summary = `${actor?.name ?? 'Someone'} updated user ${user?.name ?? id}`;
        await logAudit({ entityType: 'USER', entityId: String(id), entityName: (user as any)?.name as string | undefined, action: 'UPDATE', details: { before, after: user, summary }, actorId: actor?.id, actorName: actor?.name });
      } catch (e) { console.error('audit log failed', e); }
      return user;
    } catch (err: any) {
      if (err.code === 'P2002') throw new UserError('DUPLICATE_EMAIL', 'Email already in use');
      if (err.code === 'P2025') throw new UserError('NOT_FOUND', 'User not found');
      throw err;
    }
  },

  // Delete a user and related records (roles, refresh tokens)
  async deleteUser(id: number, actor?: { id?: number; name?: string }) {
    try {
      // remove dependent records first
      await prisma.userRole.deleteMany({ where: { userId: id } });
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
      const before = await prisma.user.findUnique({ where: { id } });
      const res = await prisma.user.delete({ where: { id } });
      try {
        const summary = `${actor?.name ?? 'Someone'} deleted user ${before?.name ?? id}`;
        await logAudit({ entityType: 'USER', entityId: String(id), entityName: before?.name as string | undefined, action: 'DELETE', details: { before, summary }, actorId: actor?.id, actorName: actor?.name });
      } catch (e) { console.error('audit log failed', e); }
      return { message: 'Deleted', user: res };
    } catch (err: any) {
      if (err.code === 'P2025') throw new UserError('NOT_FOUND', 'User not found');
      throw err;
    }
  },

  // Reset a user's password (admin-only): generate a random 6-char password,
  // hash it and store, and revoke existing refresh tokens. Returns the new
  // plaintext password so admin can communicate it to the user.
  async resetPassword(id: number) {
    // simple 6 char password using URL-safe characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let pw = '';
    for (let i = 0; i < 6; i++) pw += chars[Math.floor(Math.random() * chars.length)];

    // hash using argon2 to match authService
    const argon2 = require('argon2');
    const hash = await argon2.hash(pw);

    try {
      // update password, require change on next login, and bump tokenVersion to immediately invalidate existing access tokens
      await prisma.user.update({ where: { id }, data: { hashedPassword: hash, mustChangePassword: true, tokenVersion: { increment: 1 } } as any });
      // revoke refresh tokens so previous refreshes will fail
      await prisma.refreshToken.updateMany({ where: { userId: id }, data: { revoked: true } as any });
      return pw;
    } catch (err: any) {
      if (err.code === 'P2025') throw new UserError('NOT_FOUND', 'User not found');
      throw err;
    }
  },
};

// Attach the error class so callers can check it via service reference
(userService as any).UserError = UserError;

export default userService;
