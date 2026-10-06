# Система управління особистими фінансами

Навчальна практика з програмування, частина 1. Локальний Python CLI для обліку доходів, витрат і бюджету у гривнях.

## Технології
Python 3.11+; стандартні бібліотеки sqlite3, argparse, decimal, logging, csv, unittest; Git. Зовнішніх залежностей немає.

## Встановлення і запуск
Встановіть Python 3.11 або новіший з https://www.python.org/downloads/ та відкрийте термінал у папці проєкту.

```sh
python3 -m finance --help
python3 -m finance add income 25000 Зарплата --date 2026-10-01
python3 -m finance add expense 1500 Продукти --date 2026-10-02
python3 -m finance budget 2026-10 10000
python3 -m finance list --month 2026-10
python3 -m finance report 2026-10
python3 -m finance export export.csv --month 2026-10
python3 -m finance delete 2 --yes
python3 -m unittest discover -s tests -v
```

На Windows використовуйте `py` замість `python3`, якщо так налаштований інтерпретатор.

`--db PATH` перед підкомандою задає окремий SQLite-файл. Типовий шлях — data/finance.sqlite3. Журнал — finance.log поруч із базою. Реальні бази й логи виключені з Git.

## Обмеження
Один користувач, одна валюта UAH, локальна робота. Без банківських інтеграцій, шифрування й автентифікації. База має бути захищена правами ОС. Частка заощаджень — (доходи − витрати) / доходи × 100; за відсутності доходів — null. Негативний залишок бюджету означає перевищення ліміту.

## Структура
- finance/core.py — валідація, SQLite, бізнес-логіка.
- finance/cli.py — команди та повідомлення.
- finance/__main__.py — точка входу.
- tests/test_finance.py — перевірки бізнес-сценаріїв.
- docs/technical.md — структура даних та функції.

## Частина 2 — сервер
Сервер Node.js/Express з ORM, DI, міграціями, трьома CRUD-ресурсами та Swagger у [server/](server/README.md). Колекція Postman: [server/docs/postman.json](server/docs/postman.json). Частина1 збережена у коміті3eb8d50.
