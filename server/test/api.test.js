const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { database } = require('../src/database');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
let runtime, api, category, transaction, budget;
const events = [];
before(async () => { runtime = await createApp({ logger: (event, meta) => events.push({ event, ...meta }) }); api = request(runtime.app); });
after(async () => { await runtime.db.sequelize.close(); });
test('health, Swagger and complete OpenAPI', async () => {
  await api.get('/health').expect(200); await api.get('/docs/').expect(200);
  const r = await api.get('/openapi.json').expect(200);
  assert.equal(r.body.openapi, '3.0.3');
  for (const resource of ['categories', 'transactions', 'budgets']) {
    for (const method of ['get', 'post']) assert.ok(r.body.paths['/api/' + resource][method]);
    for (const method of ['get', 'put', 'delete']) assert.ok(r.body.paths['/api/' + resource + '/{id}'][method]);
  }
});
test('category CREATE', async () => { category = (await api.post('/api/categories').send({ name: 'Продукти' }).expect(201)).body; });
test('category LIST and READ', async () => { assert.equal((await api.get('/api/categories').expect(200)).body.length, 1); assert.equal((await api.get('/api/categories/' + category.id).expect(200)).body.name, 'Продукти'); });
test('category UPDATE', async () => { await api.put('/api/categories/' + category.id).send({ name: 'Їжа' }).expect(200); });
test('duplicate category -> 409', async () => { await api.post('/api/categories').send({ name: 'Їжа' }).expect(409); });
test('invalid categories and extra properties -> 400', async () => { for (const data of [{ name: ' ' }, { name: 'x'.repeat(81) }, { name: 'Ок', id: 99 }]) await api.post('/api/categories').send(data).expect(400); });
test('transaction CREATE', async () => { transaction = (await api.post('/api/transactions').send({ kind: 'expense', amountCents: 200000, categoryId: category.id, occurredOn: '2026-10-06' }).expect(201)).body; });
test('transaction LIST and READ', async () => { await api.get('/api/transactions').expect(200); assert.equal((await api.get('/api/transactions/' + transaction.id).expect(200)).body.amountCents, 200000); });
test('transaction UPDATE', async () => { await api.put('/api/transactions/' + transaction.id).send({ kind: 'expense', amountCents: 150000, categoryId: category.id, occurredOn: '2026-10-06', note: 'Тест' }).expect(200); });
test('invalid amount, date and type -> 400', async () => { for (const patch of [{ amountCents: 0 }, { amountCents: -1 }, { amountCents: 1.1 }, { amountCents: 1000000001 }, { occurredOn: '2026-02-30' }, { kind: 'transfer' }]) await api.post('/api/transactions').send({ kind: 'expense', amountCents: 1, categoryId: category.id, occurredOn: '2026-10-06', ...patch }).expect(400); });
test('missing category relation -> 409', async () => { await api.post('/api/transactions').send({ kind: 'expense', amountCents: 1, categoryId: 999, occurredOn: '2026-10-06' }).expect(409); });
test('budget CREATE', async () => { budget = (await api.post('/api/budgets').send({ categoryId: category.id, month: '2026-10', limitCents: 100000 }).expect(201)).body; });
test('budget LIST and READ', async () => { await api.get('/api/budgets').expect(200); await api.get('/api/budgets/' + budget.id).expect(200); });
test('budget UPDATE', async () => { await api.put('/api/budgets/' + budget.id).send({ categoryId: category.id, month: '2026-10', limitCents: 140000 }).expect(200); });
test('duplicate category-month and invalid month', async () => { await api.post('/api/budgets').send({ categoryId: category.id, month: '2026-10', limitCents: 1 }).expect(409); await api.post('/api/budgets').send({ categoryId: category.id, month: '2026-13', limitCents: 1 }).expect(400); });
test('report: no income, category totals and budget overrun', async () => { const r = (await api.get('/api/reports?month=2026-10').expect(200)).body; assert.equal(r.savingsRate, null); assert.equal(r.remainingCents, -10000); assert.equal(r.categoryExpenses[category.id], 150000); });
test('positive boundary of one cent and maximum amount', async () => { for (const cents of [1, 1000000000]) { const r = await api.post('/api/transactions').send({ kind: 'income', amountCents: cents, categoryId: category.id, occurredOn: '2026-11-01' }).expect(201); await api.delete('/api/transactions/' + r.body.id).expect(204); } });
test('report savings and month separation', async () => { const r = await api.post('/api/transactions').send({ kind: 'income', amountCents: 2500000, categoryId: category.id, occurredOn: '2026-10-01' }).expect(201); const totals = (await api.get('/api/reports?month=2026-10').expect(200)).body; assert.equal(totals.savingsCents, 2350000); assert.equal(totals.savingsRate, 94); await api.delete('/api/transactions/' + r.body.id).expect(204); assert.equal((await api.get('/api/reports?month=2026-11').expect(200)).body.expenseCents, 0); });
test('category deletion restricted by related records', async () => { await api.delete('/api/categories/' + category.id).expect(409); });
test('invalid id and missing row', async () => { await api.get('/api/categories/1abc').expect(400); await api.get('/api/categories/999').expect(404); await api.put('/api/budgets/999').send({ categoryId: category.id, month: '2026-10', limitCents: 1 }).expect(404); });
test('JSON errors, limit, CORS and unknown route', async () => { const r = await api.get('/health').set('Origin', 'http://localhost:5173').expect(200); assert.equal(r.headers['access-control-allow-origin'], 'http://localhost:5173'); await api.post('/api/categories').set('Content-Type', 'application/json').send('{').expect(400); await api.post('/api/categories').send({ name: 'x'.repeat(40000) }).expect(413); await api.get('/unknown').expect(404); await api.get('/api/reports').expect(400); });
test('SQL-like text is ordinary data', async () => { const name = "x'; DROP TABLE categories; --"; const r = await api.post('/api/categories').send({ name }).expect(201); assert.equal(r.body.name, name); await api.delete('/api/categories/' + r.body.id).expect(204); await api.get('/api/categories').expect(200); });
test('DELETE all three resources and missing delete', async () => { await api.delete('/api/transactions/' + transaction.id).expect(204); await api.delete('/api/budgets/' + budget.id).expect(204); await api.delete('/api/categories/' + category.id).expect(204); await api.delete('/api/categories/' + category.id).expect(404); });
test('DI instances and logs for operations, requests and errors', () => { assert.equal(runtime.services.resolve('categoriesService'), runtime.services.resolve('categoriesService')); for (const event of ['create', 'update', 'delete', 'request', 'error']) assert.ok(events.some(x => x.event === event)); assert.ok(!JSON.stringify(events).includes('Тест')); });
test('migration idempotence, persistence and rollback on isolated database', async () => { const dir = await mkdtemp(path.join(os.tmpdir(), 'finance-api-')); const file = path.join(dir, 'test.sqlite3'); let db;
 try { db = await database(file); await db.models.categories.create({ name: 'Збережена' }); assert.equal((await db.migrations.executed()).length, 1); await db.sequelize.close(); db = await database(file); assert.equal(await db.models.categories.count(), 1); assert.equal((await db.migrations.executed()).length, 1); await db.migrations.down(); assert.equal((await db.migrations.executed()).length, 0); await db.migrations.up(); assert.equal(await db.models.categories.count(), 0); } finally { if (db) await db.sequelize.close(); await rm(dir, { recursive: true, force: true }); }
});
