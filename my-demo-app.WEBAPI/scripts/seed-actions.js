const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const features = await prisma.feature.findMany();
  console.log(`Found ${features.length} features, seeding permissions for each...`);

  const canonical = [
    { key: 'read', name: 'Read', value: 1 },
    { key: 'create', name: 'Create', value: 2 },
    { key: 'update', name: 'Update', value: 4 },
    { key: 'delete', name: 'Delete', value: 8 },
  ];

  let total = 0;
  for (const f of features) {
    for (const a of canonical) {
      try {
        const upserted = await prisma.permission.upsert({
          where: { featureId_key: { featureId: f.id, key: a.key } },
          update: { name: a.name, value: a.value },
          create: { featureId: f.id, key: a.key, name: a.name, value: a.value },
        });
        total++;
      } catch (err) {
        console.error('Error upserting permission for feature', f.id, a.key, err);
      }
    }
  }
  console.log('Seeded permissions:', total);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
