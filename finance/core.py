"""Облік особистих фінансів у гривнях, суми зберігаються в копійках."""
import logging
import sqlite3
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path


def money(value):
    """Перевіряє додатну суму з точністю не більше двох знаків."""
    try:
        amount = Decimal(str(value))
        if not amount.is_finite() or amount <= 0 or amount * 100 != (amount * 100).to_integral_value():
            raise ValueError('Сума має бути додатною, не більше 2 знаків після крапки')
        cents = int(amount * 100)
        if cents > 10**12:
            raise ValueError('Сума перевищує допустиму межу')
        return cents
    except InvalidOperation as exc:
        raise ValueError('Некоректна сума') from exc


def month_range(month):
    """Повертає межі місяця для запитів і перевіряє YYYY-MM."""
    if len(month) != 7:
        raise ValueError('Формат місяця: YYYY-MM')
    first = date.fromisoformat(month + '-01')
    next_month = date(first.year + (first.month == 12), first.month % 12 + 1, 1)
    return first.isoformat(), next_month.isoformat()


class FinanceManager:
    """Бізнес-логіка та сховище однокористувацького CLI-прототипу."""
    def __init__(self, path):
        target = Path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(target)
        self.db.row_factory = sqlite3.Row
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY, kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
          amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
          category TEXT NOT NULL, occurred_on TEXT NOT NULL, note TEXT NOT NULL DEFAULT '');
        CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(occurred_on);
        CREATE TABLE IF NOT EXISTS budgets (
          month TEXT PRIMARY KEY, limit_cents INTEGER NOT NULL CHECK(limit_cents>0));
        ''')
        self.db.commit()

    def close(self):
        self.db.close()

    def add(self, kind, amount, category, occurred_on, note=''):
        """Перевіряє введення та атомарно додає фінансову операцію."""
        if kind not in ('income', 'expense'):
            raise ValueError('Тип: income або expense')
        cents = money(amount)
        parsed = date.fromisoformat(occurred_on)
        if parsed.isoformat() != occurred_on:
            raise ValueError('Формат дати: YYYY-MM-DD')
        category = category.strip()
        if not category or len(category) > 80 or len(note) > 500:
            raise ValueError('Категорія: 1–80 символів, примітка: до 500')
        with self.db:
            cur = self.db.execute('INSERT INTO transactions(kind,amount_cents,category,occurred_on,note) VALUES(?,?,?,?,?)',
                                  (kind, cents, category, occurred_on, note))
        logging.info('transaction_added id=%s kind=%s', cur.lastrowid, kind)
        return cur.lastrowid

    def list(self, month=None):
        """Повертає операції у хронологічному порядку."""
        if month:
            start, end = month_range(month)
            rows = self.db.execute('SELECT * FROM transactions WHERE occurred_on>=? AND occurred_on<? ORDER BY occurred_on,id', (start, end))
        else:
            rows = self.db.execute('SELECT * FROM transactions ORDER BY occurred_on,id')
        return [dict(row) for row in rows]

    def delete(self, identifier):
        """Видаляє лише операцію з явно вказаним ідентифікатором."""
        with self.db:
            cur = self.db.execute('DELETE FROM transactions WHERE id=?', (identifier,))
        if not cur.rowcount:
            raise ValueError('Операцію не знайдено')
        logging.info('transaction_deleted id=%s', identifier)

    def set_budget(self, month, amount):
        """Зберігає або оновлює загальний ліміт витрат на місяць."""
        month_range(month)
        with self.db:
            self.db.execute('INSERT INTO budgets VALUES(?,?) ON CONFLICT(month) DO UPDATE SET limit_cents=excluded.limit_cents', (month, money(amount)))
        logging.info('budget_updated month=%s', month)

    def report(self, month):
        """Обчислює доходи, витрати, залишок бюджету та частку заощаджень."""
        rows = self.list(month)
        income = sum(r['amount_cents'] for r in rows if r['kind'] == 'income')
        expense = sum(r['amount_cents'] for r in rows if r['kind'] == 'expense')
        budget = self.db.execute('SELECT limit_cents FROM budgets WHERE month=?', (month,)).fetchone()
        categories = {}
        for row in rows:
            if row['kind'] == 'expense':
                categories[row['category']] = categories.get(row['category'], 0) + row['amount_cents']
        return {'month': month, 'income_cents': income, 'expense_cents': expense,
                'savings_cents': income - expense,
                'savings_rate': round((income - expense) * 100 / income, 2) if income else None,
                'budget_cents': budget[0] if budget else None,
                'remaining_cents': budget[0] - expense if budget else None,
                'categories': categories}
