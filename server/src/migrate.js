require('dotenv').config({ quiet: true });
const { database } = require('./database');
(async () => { const db = await database(process.env.DB_PATH || './data/server.sqlite3');
  console.log((await db.migrations.executed()).map(m => m.name)); await db.sequelize.close();
})().catch(err => { console.error(err.message); process.exitCode = 1; });
