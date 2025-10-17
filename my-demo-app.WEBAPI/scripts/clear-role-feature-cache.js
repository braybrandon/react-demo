const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const before = await prisma.roleFeaturePermission.count();
    console.log('RoleFeaturePermission rows before:', before);
    const deleted = await prisma.roleFeaturePermission.deleteMany({});
    console.log('Deleted count:', deleted.count);
    const after = await prisma.roleFeaturePermission.count();
    console.log('RoleFeaturePermission rows after:', after);
  } catch (err) {
    console.error('Error clearing roleFeaturePermission cache:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
