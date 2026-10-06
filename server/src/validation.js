const { z } = require('zod');
const { ApiError } = require('./errors');
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).refine(x => +x.slice(0, 4) >= 1900 && +x.slice(0, 4) <= 9998);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(x => {
  const d = new Date(x + 'T00:00:00Z'); return !isNaN(d) && d.toISOString().slice(0, 10) === x && +x.slice(0, 4) >= 1900;
});
const positive = z.number().int().min(1).max(1_000_000_000);
const categoryId = z.number().int().positive().max(2147483647);
const schemas = {
  categories: z.object({ name: z.string().trim().min(1).max(80) }).strict(),
  transactions: z.object({ kind: z.enum(['income', 'expense']), amountCents: positive, categoryId,
    occurredOn: day, note: z.string().max(500).default('') }).strict(),
  budgets: z.object({ categoryId, month, limitCents: positive }).strict(),
};
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, 'VALIDATION', 'Некоректні дані: ' + result.error.issues.map(i => i.path.join('.') || 'body').join(', '));
  return result.data;
}
function id(raw) { return parse(z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger).refine(x => x <= 2147483647), raw); }
module.exports = { schemas, parse, id, month };
