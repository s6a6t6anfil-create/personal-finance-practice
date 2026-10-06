const { DataTypes } = require('sequelize');
module.exports = {
  async up({ context: q }) {
    // Transactional migration keeps partially created schemas out of the database.
    await q.sequelize.transaction(async transaction => {
      const options = { transaction };
      const id = { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false };
      const categoryId = { type: DataTypes.INTEGER, allowNull: false,
        references: { model: 'categories', key: 'id' }, onDelete: 'RESTRICT', onUpdate: 'CASCADE' };
      await q.createTable('categories', { id, name: { type: DataTypes.STRING(80), allowNull: false, unique: true } }, options);
      await q.createTable('transactions', { id, kind: { type: DataTypes.STRING, allowNull: false },
        amountCents: { type: DataTypes.INTEGER, allowNull: false }, categoryId,
        occurredOn: { type: DataTypes.DATEONLY, allowNull: false },
        note: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' } }, options);
      await q.createTable('budgets', { id, categoryId,
        month: { type: DataTypes.STRING(7), allowNull: false },
        limitCents: { type: DataTypes.INTEGER, allowNull: false } }, options);
      await q.addIndex('budgets', ['categoryId', 'month'], { unique: true, ...options });
      await q.addIndex('transactions', ['occurredOn'], options);
    });
  },
  async down({ context: q }) {
    await q.sequelize.transaction(async transaction => {
      for (const name of ['budgets', 'transactions', 'categories']) await q.dropTable(name, { transaction });
    });
  },
};
