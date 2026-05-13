import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@qa.com' },
    update: { name: 'Admin Manager', password },
    create: {
      name: 'Admin Manager',
      email: 'admin@qa.com',
      password,
      role: 'MANAGER'
    }
  });

  await prisma.checklist.upsert({
    where: { id: 'demo-checklist-1' },
    update: {},
    create: {
      id: 'demo-checklist-1',
      title: 'Define regression scope',
      description: 'Document the key acceptance criteria and execution steps for the next release.',
      status: 'IN_PROGRESS',
      ownerId: admin.id
    }
  });

  console.log('Seed complete');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
