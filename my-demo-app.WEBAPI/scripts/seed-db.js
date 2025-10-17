const { PrismaClient } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Roles
  const roleNames = ['admin', 'paid user', 'user'];
  const roles = {};
  for (const name of roleNames) {
    const upserted = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    roles[name] = upserted;
  }

  // Feature
  const feature = await prisma.feature.upsert({
    where: { key: 'manage' },
    update: {},
    create: { key: 'manage', name: 'Manage' },
  });

  // Canonical permissions
  const canonical = [
    { key: 'read', name: 'Read', value: 1 },
    { key: 'create', name: 'Create', value: 2 },
    { key: 'update', name: 'Update', value: 4 },
    { key: 'delete', name: 'Delete', value: 8 },
  ];

  const permissions = {};
  for (const a of canonical) {
    const upserted = await prisma.permission.upsert({
      where: { featureId_key: { featureId: feature.id, key: a.key } },
      update: { name: a.name, value: a.value },
      create: { featureId: feature.id, key: a.key, name: a.name, value: a.value },
    });
    permissions[a.key] = upserted;
  }

  // Create admin user
  const adminEmail = 'admin@admin.com';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    const hashed = await argon2.hash('password');
    admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: adminEmail,
        hashedPassword: hashed,
        // set lastLogin and status will default via Prisma schema if present
      },
    });
    console.log('Created admin user:', adminEmail);
  } else {
    console.log('Admin user already exists:', adminEmail);
  }

  // Assign roles to admin
  for (const rname of roleNames) {
    const r = roles[rname];
    const exists = await prisma.userRole.findUnique({ where: { userId_roleId: { userId: admin.id, roleId: r.id } } });
    if (!exists) {
      await prisma.userRole.create({ data: { userId: admin.id, roleId: r.id } });
      console.log(`Assigned role '${rname}' to admin`);
    }
  }

  // Grant admin role all permissions for the manage feature
  for (const p of Object.values(permissions)) {
    const rpWhere = { roleId_permissionId: { roleId: roles['admin'].id, permissionId: p.id } };
    const existing = await prisma.rolePermission.findUnique({ where: rpWhere });
    if (!existing) {
      await prisma.rolePermission.create({ data: { roleId: roles['admin'].id, permissionId: p.id } });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
