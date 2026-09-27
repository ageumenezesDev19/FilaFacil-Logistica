import { mkdirSync, openSync, closeSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';
import { databaseUrl } from '../src/config/database-url.js';

if (!databaseUrl.startsWith('file:') || !isAbsolute(databaseUrl.slice(5))) {
  throw new Error('DATABASE_URL must be a file: URL with an absolute local path.');
}
mkdirSync(dirname(databaseUrl.slice(5)), { recursive: true });

// Prisma's migration engine needs the local file to exist before its first connection.
closeSync(openSync(databaseUrl.slice(5), 'a'));
