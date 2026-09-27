import test from 'node:test';
import assert from 'node:assert/strict';
import { ValidationError, NotFoundError } from '../src/domain/collection.js';
import { fixture, migrate, validCollection } from './helpers.js';

test('collection rules and real SQLite operations', async (t) => {
  const { service, database, url } = await fixture(t);
  let first;
  await t.test('create trims text and generates ID, time, and pending status', async () => {
    first = await service.create({ ...validCollection, customerName: '  Ana Souza  ', address: '  Rua Um, 10  ' });
    assert.ok(first.id > 0);
    assert.equal(first.customerName, 'Ana Souza');
    assert.equal(first.address, 'Rua Um, 10');
    assert.equal(first.customerNameSearch, 'ana souza');
    assert.equal(first.status, 'PENDING');
    assert.ok(first.createdAt instanceof Date);
    assert.ok(Math.abs(Date.now() - first.createdAt.getTime()) < 10000);
  });
  await t.test('reject invalid required fields and package counts without inserting', async () => {
    for (const customerName of ['', '  ', undefined, 5]) {
      assert.throws(() => service.create({ ...validCollection, customerName }), ValidationError);
    }
    for (const address of ['', '\t ', undefined, null]) {
      assert.throws(() => service.create({ ...validCollection, address }), ValidationError);
    }
    for (const packageCount of [0, -1, 1.5, NaN, Infinity, '2', 2147483648]) {
      assert.throws(() => service.create({ ...validCollection, packageCount }), ValidationError);
    }
    for (const priority of ['', 'UNKNOWN', 'toString', undefined]) {
      assert.throws(() => service.create({ ...validCollection, priority }), ValidationError);
    }
    assert.equal((await service.list()).length, 1);
  });
  await t.test('ordering and independent database filters', async () => {
    const mariana = await service.create({ ...validCollection, customerName: 'Mariana', priority: 'HIGH' });
    await service.create({ ...validCollection, customerName: 'Álvaro', priority: 'LOW' });
    await service.create({ ...validCollection, customerName: 'Alvaro', priority: 'LOW' });
    await service.updateStatus(mariana.id, 'IN_PROGRESS');
    const all = await service.list();
    assert.deepEqual(all.map((c) => c.id), [...all.map((c) => c.id)].sort((a, b) => a - b));
    assert.deepEqual((await service.filterByName(' ANA ')).map((c) => c.customerName), ['Ana Souza', 'Mariana']);
    assert.deepEqual((await service.filterByName('ÁLVARO')).map((c) => c.customerName), ['Álvaro']);
    assert.deepEqual((await service.filterByName('A\u0301LVARO')).map((c) => c.customerName), ['Álvaro']);
    assert.deepEqual((await service.filterByName('alvaro')).map((c) => c.customerName), ['Alvaro']);
    assert.equal((await service.filterByPriority('LOW')).length, 2);
    assert.equal((await service.filterByStatus('IN_PROGRESS'))[0].id, mariana.id);
    assert.deepEqual(await service.filterByName('missing'), []);
    assert.throws(() => service.filterByName('  '), ValidationError);
    assert.throws(() => service.filterByStatus('UNKNOWN'), ValidationError);
    assert.throws(() => service.filterByPriority('UNKNOWN'), ValidationError);
  });
  await t.test('name searches treat SQL wildcard characters as literal text', async () => {
    const collection = await service.create({ ...validCollection, customerName: 'Cliente 100%_local' });
    for (const term of ['%', '_', '%_']) {
      assert.deepEqual((await service.filterByName(term)).map((c) => c.id), [collection.id]);
    }
  });
  await t.test('free status transitions and invalid IDs leave data unchanged', async () => {
    for (const status of ['COMPLETED', 'CANCELED', 'PENDING', 'IN_PROGRESS']) {
      assert.equal((await service.updateStatus(first.id, status)).status, status);
    }
    await assert.rejects(service.updateStatus(first.id, 'UNKNOWN'), ValidationError);
    for (const id of [0, -1, 1.5, NaN, '1', 2147483648]) {
      await assert.rejects(service.get(id), ValidationError);
      await assert.rejects(service.updateStatus(id, 'PENDING'), ValidationError);
      await assert.rejects(service.delete(id), ValidationError);
    }
    await assert.rejects(service.updateStatus(99999, 'PENDING'), NotFoundError);
    await assert.rejects(service.delete(99999), NotFoundError);
    assert.equal((await service.get(first.id)).status, 'IN_PROGRESS');
  });
  await t.test('database constraints reinforce service validation', async () => {
    const input = { ...validCollection, customerNameSearch: 'ana souza', status: 'PENDING' };
    for (const change of [{ packageCount: 0 }, { customerName: '' }, { address: '' }, { status: 'BAD' }, { priority: 'BAD' }]) {
      await assert.rejects(database.collection.create({ data: { ...input, ...change } }));
    }
  });
  await t.test('repeat migrations preserve records', async () => {
    const before = await service.list();
    migrate(url);
    assert.deepEqual(await service.list(), before);
  });
  await t.test('delete removes only the selected record', async () => {
    const before = await service.list();
    await service.delete(first.id);
    await assert.rejects(service.get(first.id), NotFoundError);
    assert.equal((await service.list()).length, before.length - 1);
  });
});
