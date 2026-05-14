import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const cwd = path.resolve(__dirname);
const envFile = path.join(cwd, '.env');
const exampleFile = path.join(cwd, '.env.example');

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
} else if (fs.existsSync(exampleFile)) {
  dotenv.config({ path: exampleFile });
}

// Override DATABASE_URL for tests to use SQLite
process.env.DATABASE_URL = 'file:./test.db';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Missing DATABASE_URL for backend tests. Copy apps/backend/.env.example to apps/backend/.env or set DATABASE_URL in your environment.'
  );
}
