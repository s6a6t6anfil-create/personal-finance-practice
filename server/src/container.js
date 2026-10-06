const { createContainer, asValue, asFunction, InjectionMode } = require('awilix');
const { Repository } = require('./repositories');
const { ResourceService, ReportService } = require('./services');
function container(models, logger) {
  const c = createContainer({ injectionMode: InjectionMode.PROXY, strict: true });
  c.register({ logger: asValue(logger) });
  for (const name of ['categories', 'transactions', 'budgets']) {
    c.register({ [name + 'Repository']: asValue(new Repository(models[name])),
      [name + 'Service']: asFunction(cradle => new ResourceService(cradle[name + 'Repository'], cradle.logger, name)).singleton() });
  }
  c.register({ reportService: asFunction(({ transactionsRepository, budgetsRepository }) => new ReportService(transactionsRepository, budgetsRepository)).singleton() });
  return c;
}
module.exports = { container };
