require('dotenv').config({ quiet: true });
const { createApp } = require('./app');
(async () => {
  const host = process.env.HOST || '127.0.0.1';
  const port = Number(process.env.PORT || 3072);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Некоректний PORT');
  const { app, db } = await createApp({ storage: process.env.DB_PATH || './data/server.sqlite3', origin: process.env.CORS_ORIGIN || 'http://localhost:5173' });
  const server = app.listen(port, host, () => console.log(`Finance API: http://${host}:${port}/docs`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(async () => { await db.sequelize.close(); process.exit(0); }));
})().catch(err => { console.error('Не вдалося запустити сервер:', err.message); process.exitCode = 1; });
