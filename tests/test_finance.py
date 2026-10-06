import io
import json
import sqlite3
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from finance.core import FinanceManager, money, month_range
from finance.cli import main


class FinanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'finance.sqlite3'
        self.manager = FinanceManager(self.path)
    def tearDown(self):
        self.manager.close(); self.tmp.cleanup()
    def test_money_precision(self):
        self.assertEqual(money('0.10'), 10)
        self.assertEqual(money('105.25'), 10525)
    def test_reject_invalid_amounts(self):
        for value in ['0','-1','1.001','NaN','Infinity','abc','10000000001']:
            with self.subTest(value=value), self.assertRaises(ValueError): money(value)
    def test_income_expense_and_savings(self):
        self.manager.add('income','25000','Зарплата','2026-10-01')
        self.manager.add('expense','1500','Продукти','2026-10-02')
        self.manager.add('expense','500','Транспорт','2026-10-03')
        r=self.manager.report('2026-10')
        self.assertEqual((r['income_cents'],r['expense_cents'],r['savings_cents']), (2500000,200000,2300000))
        self.assertEqual(r['savings_rate'],92)
    def test_month_filter(self):
        self.manager.add('income','1','Тест','2026-09-30')
        self.manager.add('income','2','Тест','2026-10-31')
        self.manager.add('income','3','Тест','2026-11-01')
        self.assertEqual(len(self.manager.list('2026-10')),1)
    def test_december_boundary(self):
        self.assertEqual(month_range('2026-12'),('2026-12-01','2027-01-01'))
    def test_invalid_date_category_kind(self):
        for kind,category,day in [('income','','2026-10-01'),('other','Тест','2026-10-01'),('income','Тест','2026-02-30')]:
            with self.assertRaises(ValueError): self.manager.add(kind,'1',category,day)
        self.assertEqual(self.manager.list(),[])
    def test_budget_overrun(self):
        self.manager.set_budget('2026-10','100')
        self.manager.add('expense','150','Тест','2026-10-01')
        self.assertEqual(self.manager.report('2026-10')['remaining_cents'],-5000)
    def test_budget_update(self):
        self.manager.set_budget('2026-10','100'); self.manager.set_budget('2026-10','200')
        self.assertEqual(self.manager.report('2026-10')['budget_cents'],20000)
    def test_no_income(self):
        self.manager.add('expense','10','Тест','2026-10-01')
        self.assertIsNone(self.manager.report('2026-10')['savings_rate'])
    def test_persistence(self):
        self.manager.add('income','12.34','Тест','2026-10-01'); self.manager.close()
        self.manager=FinanceManager(self.path)
        self.assertEqual(self.manager.list()[0]['amount_cents'],1234)
    def test_delete(self):
        identifier=self.manager.add('income','1','Тест','2026-10-01')
        self.manager.delete(identifier); self.assertEqual(self.manager.list(),[])
        with self.assertRaises(ValueError): self.manager.delete(identifier)
    def test_sql_injection_as_data(self):
        self.manager.add('income','1',"'); DROP TABLE transactions; --",'2026-10-01')
        self.assertEqual(len(self.manager.list()),1)
    def test_cli_export_and_errors(self):
        self.manager.add('income','5','Тест','2026-10-01')
        output=Path(self.tmp.name)/'export.csv'
        with redirect_stdout(io.StringIO()):
            self.assertEqual(main(['--db',str(self.path),'export',str(output)]),0)
            self.assertEqual(main(['--db',str(self.path),'delete','1']),1)
            self.assertEqual(main(['--db',str(self.path),'add','income','-1','Тест','--date','2026-10-01']),1)
        self.assertIn('amount_cents',output.read_text(encoding='utf-8-sig'))
        self.assertEqual(len(self.manager.list()),1)

if __name__ == '__main__': unittest.main()
