import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createDatabase } from '../src/config/database.js';
import { createCollectionRepository } from '../src/repositories/collection-repository.js';
import { createCollectionService } from '../src/services/collection-service.js';

export function migrate(url) {
  execFileSync(process.execPath, ['scripts/prepare-database.js'], {
    env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe', timeout: 10000,
  });
  execFileSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe', timeout: 30000,
  });
}

export async function fixture(t, withMigration = true) {
  const directory = mkdtempSync(join(tmpdir(), 'filafacil-'));
  const url = `file:${join(directory, 'test.db')}`;
  const database = createDatabase(url);
  t.after(async () => {
    await database.$disconnect();
    rmSync(directory, { recursive: true, force: true });
  });
  if (withMigration) migrate(url);
  const repository = createCollectionRepository(database);
  return { directory, url, database, repository, service: createCollectionService(repository) };
}

export function runCli(url, lines) {
  return spawnSync(process.execPath, ['--import', 'tsx', 'src/index.js'], {
    env: { ...process.env, DATABASE_URL: url },
    input: `${lines.join('\n')}\n`, encoding: 'utf8', timeout: 15000,
  });
}

export const validCollection = {
  customerName: 'Ana Souza', address: 'Rua Um, 10', packageCount: 2, priority: 'NORMAL',
};
