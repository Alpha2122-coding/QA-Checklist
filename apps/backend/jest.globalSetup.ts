import { execSync } from 'child_process';
import path from 'path';

export default async function globalSetup() {
  const cwd = path.resolve(__dirname);
  const schemaPath = path.join(cwd, 'prisma', 'test.schema.prisma');

  // Generate Prisma client for test schema
  execSync(`npx prisma generate --schema=${schemaPath}`, { cwd, stdio: 'inherit' });

  // Run migrations for test DB
  execSync(`npx prisma migrate dev --name init --schema=${schemaPath}`, { cwd, stdio: 'inherit' });
}