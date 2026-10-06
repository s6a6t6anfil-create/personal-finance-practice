const { schemas, parse, id, month } = require('./validation');
function controller(service, resource) {
  return {
    list: async (req, res) => res.json(await service.list()),
    get: async (req, res) => res.json(await service.get(id(req.params.id))),
    create: async (req, res) => res.status(201).json(await service.create(parse(schemas[resource], req.body))),
    replace: async (req, res) => res.json(await service.update(id(req.params.id), parse(schemas[resource], req.body))),
    remove: async (req, res) => { await service.delete(id(req.params.id)); res.status(204).end(); },
  };
}
const reportController = service => async (req, res) => res.json(await service.monthly(parse(month, req.query.month)));
module.exports = { controller, reportController };
