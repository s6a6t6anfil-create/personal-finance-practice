const { ApiError } = require('./errors');
class ResourceService {
  constructor(repository, logger, resource) { Object.assign(this, { repository, logger, resource }); }
  list() { return this.repository.list(); }
  async get(id) {
    const row = await this.repository.get(id);
    if (!row) throw new ApiError(404, 'NOT_FOUND', 'Запис не знайдено');
    return row;
  }
  async create(data) {
    const row = await this.repository.create(data);
    this.logger('create', { resource: this.resource, id: row.id }); return row;
  }
  async update(id, data) {
    const row = await this.repository.update(await this.get(id), data);
    this.logger('update', { resource: this.resource, id }); return row;
  }
  async delete(id) {
    await this.repository.delete(await this.get(id));
    this.logger('delete', { resource: this.resource, id });
  }
}
class ReportService {
  constructor(transactionRepository, budgetRepository) { Object.assign(this, { transactionRepository, budgetRepository }); }
  async monthly(month) {
    const rows = (await this.transactionRepository.list()).filter(r => r.occurredOn.startsWith(month));
    const budgets = (await this.budgetRepository.list()).filter(r => r.month === month);
    const sum = kind => rows.filter(r => r.kind === kind).reduce((s, r) => s + r.amountCents, 0);
    const incomeCents = sum('income'), expenseCents = sum('expense');
    const limitCents = budgets.reduce((s, r) => s + r.limitCents, 0);
    const categoryExpenses = {};
    for (const r of rows.filter(r => r.kind === 'expense')) categoryExpenses[r.categoryId] = (categoryExpenses[r.categoryId] || 0) + r.amountCents;
    return { month, incomeCents, expenseCents, savingsCents: incomeCents - expenseCents,
      savingsRate: incomeCents ? Math.round((incomeCents - expenseCents) * 10000 / incomeCents) / 100 : null,
      budgetCents: budgets.length ? limitCents : null,
      remainingCents: budgets.length ? limitCents - expenseCents : null, categoryExpenses };
  }
}
module.exports = { ResourceService, ReportService };
