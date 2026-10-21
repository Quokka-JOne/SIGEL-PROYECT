import { prisma } from './src/config/prisma';
import { memoryCategories, memoryProducts, memorySuppliers } from './src/data/memoryStore';

async function seed() {
  console.log('Seeding categories...');
  for (const cat of memoryCategories) {
    await prisma.categoria.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat },
    });
  }
  
  console.log('Seeding suppliers...');
  for (const sup of memorySuppliers) {
    await prisma.proveedor.upsert({
      where: { id: sup.id },
      update: {},
      create: { ...sup },
    });
  }

  console.log('Seeding products...');
  for (const prod of memoryProducts) {
    const { categoriaNombre, ...data } = prod;
    await prisma.producto.upsert({
      where: { id: prod.id },
      update: {},
      create: { ...data },
    });
  }
  
  console.log('Seeded successfully!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
