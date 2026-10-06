class Repository {
  constructor(model) { this.model = model; }
  list() { return this.model.findAll({ order: [['id', 'ASC']] }); }
  get(id) { return this.model.findByPk(id); }
  create(data) { return this.model.create(data); }
  async update(row, data) { return row.update(data); }
  async delete(row) { return row.destroy(); }
}
module.exports = { Repository };
