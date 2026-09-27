import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import { fixture, runCli, validCollection } from './helpers.js';
import { createTerminal } from '../src/controllers/terminal.js';
import { runMenu } from '../src/controllers/collection-controller.js';

test('terminal CRUD, filters, confirmation, and invalid options', async (t) => {
  const { url, service } = await fixture(t);
  const created = runCli(url, ['1', 'Álvaro', 'Rua Dois, 20', '3', '3', '0']);
  assert.equal(created.status, 0, created.stderr);
  assert.match(created.stdout, /Coleta cadastrada/);
  const [collection] = await service.list();
  const id = String(collection.id);
  const result = runCli(url, [
    '2', '3', '3', 'ÁL', '3', '1', '1', '3', '2', '3',
    '4', id, '3', '4', id, '1', '5', id, 'n', '5', id, 'talvez',
    '5', '99999', '99', '4', id, '99', '5', id, 's', '2', '0',
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Cliente: Álvaro/);
  assert.match(result.stdout, /Prioridade: Alta/);
  assert.match(result.stdout, /Pacotes: 3/);
  assert.match(result.stdout, /Criada em:/);
  assert.equal((result.stdout.match(/Status atualizado\./g) ?? []).length, 2);
  assert.match(result.stdout, /Exclusão cancelada/);
  assert.match(result.stdout, /Confirmação inválida/);
  assert.match(result.stdout, /Coleta não encontrada/);
  assert.match(result.stdout, /Opção inválida/);
  assert.match(result.stdout, /Coleta excluída/);
  assert.match(result.stdout, /Nenhuma coleta encontrada/);
  assert.match(result.stdout, /Até logo/);
  assert.deepEqual(await service.list(), []);
});

test('canceled deletion preserves data across separate processes', async (t) => {
  const { service, url } = await fixture(t);
  const collection = await service.create(validCollection);
  const canceled = runCli(url, ['5', String(collection.id), 'n', '0']);
  assert.equal(canceled.status, 0, canceled.stderr);
  const anotherProcess = runCli(url, ['2', '0']);
  assert.equal(anotherProcess.status, 0, anotherProcess.stderr);
  assert.match(anotherProcess.stdout, /Cliente: Ana Souza/);
  assert.equal((await service.list()).length, 1);
});

test('invalid registration inputs do not persist and EOF exits safely', async (t) => {
  const { url, service } = await fixture(t);
  for (const lines of [
    ['1', '  ', 'Rua', '2', '2', '0'],
    ['1', 'Ana', '  ', '2', '2', '0'],
    ['1', 'Ana', 'Rua', '2.5', '2', '0'],
    ['1', 'Ana', 'Rua', '0', '2', '0'],
    ['1', 'Ana', 'Rua', '1e2', '2', '0'],
    ['1', 'Ana', 'Rua', '2', '99', '0'],
  ]) {
    const result = runCli(url, lines);
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout, /Coleta cadastrada/);
  }
  const incomplete = runCli(url, ['1', 'Ana']);
  assert.equal(incomplete.status, 0, incomplete.stderr);
  assert.match(incomplete.stdout, /Até logo/);
  assert.deepEqual(await service.list(), []);
});

test('missing schema fails initialization with setup instructions', async (t) => {
  const { url } = await fixture(t, false);
  const result = runCli(url, ['0']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /npm run db:setup/);
  assert.doesNotMatch(result.stdout, /Coleta cadastrada/);
});

test('database operation failure returns to menu without false success', async () => {
  let output = '';
  const terminal = createTerminal(Readable.from(['2\n0\n']), new Writable({
    write(chunk, encoding, callback) { output += chunk.toString(); callback(); },
  }));
  try {
    await runMenu({ async list() { throw new Error('database unavailable'); } }, terminal);
    assert.match(output, /Não foi possível concluir a operação no banco/);
    assert.equal((output.match(/0\. Sair/g) ?? []).length, 2);
    assert.match(output, /Até logo/);
  } finally { terminal.close(); }
});
