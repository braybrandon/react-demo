const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const countBefore = await prisma.permission.count();
    console.log('Permission rows before:', countBefore);
    const deleted = await prisma.permission.deleteMany({});
    console.log('Deleted count:', deleted.count);
    const countAfter = await prisma.permission.count();
    console.log('Permission rows after:', countAfter);
  } catch (err) {
    console.error('Error clearing permissions:', err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
