import { createDatabase } from './config/database.js';
import { createCollectionRepository } from './repositories/collection-repository.js';
import { createCollectionService } from './services/collection-service.js';
import { createTerminal } from './controllers/terminal.js';
import { runMenu } from './controllers/collection-controller.js';

let database;
let terminal;
const stop = () => terminal?.close();
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  database = createDatabase();
  const repository = createCollectionRepository(database);
  await repository.list();
  terminal = createTerminal();
  await runMenu(createCollectionService(repository), terminal);
} catch {
  console.error('Não foi possível iniciar o FilaFácil. Confira o banco local e execute npm run db:setup.');
  process.exitCode = 1;
} finally {
  terminal?.close();
  await database?.$disconnect();
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
}
