const { Router } = require('express');
const { controller, reportController } = require('./controllers');
function routes(container) {
  const router = Router();
  for (const resource of ['categories', 'transactions', 'budgets']) {
    const c = controller(container.resolve(resource + 'Service'), resource);
    router.get('/' + resource, c.list);
    router.post('/' + resource, c.create);
    router.get('/' + resource + '/:id', c.get);
    router.put('/' + resource + '/:id', c.replace);
    router.delete('/' + resource + '/:id', c.remove);
  }
  router.get('/reports', reportController(container.resolve('reportService')));
  return router;
}
module.exports = { routes };
