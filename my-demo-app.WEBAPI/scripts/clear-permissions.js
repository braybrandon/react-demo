const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const countBefore = await prisma.permission.count();
    console.log('Permission rows before:', countBefore);
    const deleted = await prisma.permission.deleteMany({});
    console.log('Deleted count:', deleted.count);
    const countAfter = await prisma.permission.count();
      // Also clear the roleFeaturePermission cache so we don't leave stale masks
      try {
        const cacheBefore = await prisma.roleFeaturePermission.count();
        console.log('RoleFeaturePermission rows before clearing:', cacheBefore);
        const cacheDeleted = await prisma.roleFeaturePermission.deleteMany({});
        console.log('RoleFeaturePermission deleted count:', cacheDeleted.count);
        const cacheAfter = await prisma.roleFeaturePermission.count();
        console.log('RoleFeaturePermission rows after clearing:', cacheAfter);
      } catch (err) {
        console.error('Failed to clear roleFeaturePermission cache:', err);
      }
    console.log('Permission rows after:', countAfter);
  } catch (err) {
    console.error('Error clearing permissions:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
