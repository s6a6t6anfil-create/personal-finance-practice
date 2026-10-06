"""Консольний інтерфейс системи управління особистими фінансами."""
import argparse
import csv
import json
import logging
import sqlite3
from pathlib import Path
from .core import FinanceManager


def main(argv=None):
    parser = argparse.ArgumentParser(description='Особисті фінанси — облік у гривнях')
    parser.add_argument('--db', default='data/finance.sqlite3', help='Шлях до SQLite')
    commands = parser.add_subparsers(dest='command', required=True)
    add = commands.add_parser('add', help='Додати дохід або витрату')
    add.add_argument('kind', choices=['income', 'expense'])
    add.add_argument('amount')
    add.add_argument('category')
    add.add_argument('--date', required=True)
    add.add_argument('--note', default='')
    listing = commands.add_parser('list', help='Перелік операцій')
    listing.add_argument('--month')
    budget = commands.add_parser('budget', help='Місячний бюджет')
    budget.add_argument('month'); budget.add_argument('amount')
    report = commands.add_parser('report', help='Місячна статистика')
    report.add_argument('month')
    delete = commands.add_parser('delete', help='Видалити операцію')
    delete.add_argument('id', type=int); delete.add_argument('--yes', action='store_true')
    export = commands.add_parser('export', help='Експорт CSV')
    export.add_argument('path'); export.add_argument('--month')
    args = parser.parse_args(argv)
    log_path = Path(args.db).parent / 'finance.log'
    log_path.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(filename=log_path, level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s', encoding='utf-8')
    manager = None
    try:
        manager = FinanceManager(args.db)
        if args.command == 'add':
            print('Додано операцію №', manager.add(args.kind, args.amount, args.category, args.date, args.note))
        elif args.command == 'list':
            rows = manager.list(args.month)
            if not rows: print('Операцій немає')
            for row in rows:
                print(f"{row['id']:>3} | {row['occurred_on']} | {row['kind']:7} | {row['amount_cents']/100:>10.2f} грн | {row['category']} | {row['note']}")
        elif args.command == 'budget':
            manager.set_budget(args.month, args.amount); print('Бюджет збережено')
        elif args.command == 'report':
            print(json.dumps(manager.report(args.month), ensure_ascii=False, indent=2))
        elif args.command == 'delete':
            if not args.yes: raise ValueError('Для видалення додайте --yes')
            manager.delete(args.id); print('Операцію видалено')
        elif args.command == 'export':
            rows = manager.list(args.month)
            with open(args.path, 'w', encoding='utf-8-sig', newline='') as file:
                writer = csv.DictWriter(file, fieldnames=['id','kind','amount_cents','category','occurred_on','note'])
                writer.writeheader(); writer.writerows(rows)
            logging.info('csv_export rows=%s', len(rows)); print('CSV збережено')
        return 0
    except (ValueError, OSError, sqlite3.Error) as exc:
        logging.warning('command_failed type=%s', type(exc).__name__)
        print('Помилка:', exc)
        return 1
    finally:
        if manager: manager.close()
