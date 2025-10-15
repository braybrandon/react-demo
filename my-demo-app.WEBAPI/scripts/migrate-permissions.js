#!/usr/bin/env node
// (Deprecated) Migration script kept for reference: it used to populate
// PermissionAction rows from legacy Permission.bitmask values. Since the
// Permission table has been removed in this project, this script is now
// informational and should only be used if you still have a backup DB with
// legacy Permission rows to migrate from.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BITS = {
  1: 'read',
  2: 'create',
  4: 'update',
  8: 'delete',
};

function bitmaskToActions(mask) {
  const actions = [];
  for (const [bitStr, name] of Object.entries(BITS)) {
    const bit = Number(bitStr);
    if ((mask & bit) !== 0) actions.push(name);
  }
  return actions;
}

async function main() {
  console.log('Starting permission migration...');
  const perms = await prisma.permission.findMany();
  let inserted = 0;
  for (const p of perms) {
    const actions = bitmaskToActions(p.bitmask || 0);
    for (const action of actions) {
      try {
        await prisma.permissionAction.upsert({
          where: {
            roleId_featureId_action: {
              roleId: p.roleId,
              featureId: p.featureId,
              action,
            },
          },
          update: {},
          create: {
            roleId: p.roleId,
            featureId: p.featureId,
            action,
          },
        });
        inserted++;
      } catch (err) {
        console.error('Upsert error for', p, action, err.message || err);
      }
    }
  }
  console.log('Migration complete. Inserted actions:', inserted);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
