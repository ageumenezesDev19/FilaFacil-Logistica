import { fileURLToPath } from 'node:url';

const defaultPath = fileURLToPath(new URL('../../data/filafacil.db', import.meta.url));
export const databaseUrl = process.env.DATABASE_URL ?? `file:${defaultPath}`;
