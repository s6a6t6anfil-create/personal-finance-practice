const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swagger = require('swagger-ui-express');
const { database } = require('./database');
const { container } = require('./container');
const { routes } = require('./routes');
const { ApiError } = require('./errors');
const spec = require('../docs/openapi.json');
async function createApp({ storage = ':memory:', origin = 'http://localhost:5173', logger = (event, meta) => console.log(JSON.stringify({ time: new Date().toISOString(), event, ...meta })) } = {}) {
  const db = await database(storage);
  const services = container(db.models, logger);
  const app = express(); app.disable('x-powered-by');
  app.use(morgan(':method :url :status :response-time ms', { stream: { write: text => logger('request', { message: text.trim() }) } }));
  app.use(cors({ origin }));
  app.use(express.json({ limit: '32kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/openapi.json', (req, res) => res.json(spec));
  app.use('/docs', swagger.serve, swagger.setup(spec));
  app.use('/api', routes(services));
  app.use((req, res, next) => next(new ApiError(404, 'NOT_FOUND', 'Маршрут не знайдено')));
  // One error boundary translates database conflicts without disclosing SQL or data.
  app.use((err, req, res, next) => {
    let status = err.status || 500, code = err.code || 'INTERNAL';
    let message = err instanceof ApiError ? err.message : 'Внутрішня помилка';
    if (err.name === 'SequelizeUniqueConstraintError') { status = 409; code = 'CONFLICT'; message = 'Такий запис уже існує'; }
    if (err.name === 'SequelizeForeignKeyConstraintError') { status = 409; code = 'RELATION'; message = 'Категорія відсутня або має пов’язані записи'; }
    if (err.type === 'entity.parse.failed') { status = 400; code = 'BAD_JSON'; message = 'Некоректний JSON'; }
    if (err.type === 'entity.too.large') { status = 413; code = 'TOO_LARGE'; message = 'Запит перевищує 32 КБ'; }
    logger('error', { status, code, method: req.method, path: req.path });
    res.status(status).json({ error: { code, message } });
  });
  return { app, db, services };
}
module.exports = { createApp };
