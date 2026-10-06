# Технічна документація

## Модулі
`core.money(value)` перетворює додатну десяткову суму в копійки. Відхиляє нечислові, нескінченні значення та більше двох десяткових знаків.
`core.month_range(month)` перевіряє YYYY-MM і повертає напіввідкритий інтервал [початок місяця, початок наступного).
`FinanceManager(path)` відкриває SQLite, створює таблиці й індекс.
Методи: add(kind, amount, category, occurred_on, note), list(month=None), delete(identifier), set_budget(month, amount), report(month), close().
`cli.main(argv=None)` розбирає аргументи й повертає 0 у разі успіху або 1 після контрольованої помилки. argparse повертає 2 для помилок синтаксису команди.

## Схема SQLite
transactions: id INTEGER PRIMARY KEY; kind TEXT income/expense; amount_cents INTEGER >0; category TEXT 1–80 символів; occurred_on TEXT YYYY-MM-DD; note TEXT до 500 символів.
budgets: month TEXT PRIMARY KEY YYYY-MM; limit_cents INTEGER >0.
idx_transactions_date — індекс на occurred_on.

## Звіти та експорт
report повертає JSON: month, income_cents, expense_cents, savings_cents, savings_rate, budget_cents, remaining_cents, categories.
Поля budget_cents і remaining_cents дорівнюють null без заданого бюджету. categories містить підсумки витрат за категоріями.
CSV: UTF-8 з BOM; заголовок id,kind,amount_cents,category,occurred_on,note. Суми в копійках, імпорт поки не реалізовано.

## Надійність
INSERT/DELETE/UPSERT виконуються в транзакціях. Параметризовані SQL-запити захищають структуру запиту від введених рядків. У логах записуються типи подій та id, без сум і приміток. SQLite не шифрується. Перед видаленням потрібний прапорець --yes. Резервну копію закритої бази слід зберігати окремо.
