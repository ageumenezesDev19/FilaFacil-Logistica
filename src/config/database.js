import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client.ts';
import { databaseUrl } from './database-url.js';

export function createDatabase(url = databaseUrl) {
  if (!url.startsWith('file:') || !isAbsolute(url.slice(5))) {
    throw new Error('DATABASE_URL must be a file: URL with an absolute local path.');
  }
  mkdirSync(dirname(url.slice(5)), { recursive: true });
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}
