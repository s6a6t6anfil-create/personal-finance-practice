const { Sequelize, DataTypes } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const path = require('node:path');
const fs = require('node:fs');
async function database(storage) {
  if (storage !== ':memory:') fs.mkdirSync(path.dirname(storage), { recursive: true });
  const sequelize = new Sequelize({ dialect: 'sqlite', storage, logging: false });
  const common = { timestamps: false, freezeTableName: true };
  const Category = sequelize.define('categories', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  }, common);
  const Transaction = sequelize.define('transactions', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    kind: { type: DataTypes.STRING, allowNull: false },
    amountCents: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    occurredOn: { type: DataTypes.DATEONLY, allowNull: false },
    note: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
  }, common);
  const Budget = sequelize.define('budgets', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.STRING(7), allowNull: false },
    limitCents: { type: DataTypes.INTEGER, allowNull: false },
  }, common);
  Category.hasMany(Transaction, { foreignKey: 'categoryId', onDelete: 'RESTRICT' });
  Transaction.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'RESTRICT' });
  Category.hasMany(Budget, { foreignKey: 'categoryId', onDelete: 'RESTRICT' });
  Budget.belongsTo(Category, { foreignKey: 'categoryId', onDelete: 'RESTRICT' });
  const migrations = new Umzug({ migrations: { glob: path.join(__dirname, '../migrations/*.js') },
    context: sequelize.getQueryInterface(), storage: new SequelizeStorage({ sequelize }), logger: undefined });
  await sequelize.authenticate();
  await sequelize.query('PRAGMA foreign_keys = ON');
  await migrations.up();
  return { sequelize, models: { categories: Category, transactions: Transaction, budgets: Budget }, migrations };
}
module.exports = { database };
