-- Horizon migration 004: recreate recurring_transactions without is_active.
-- isActive was removed in the UI redesign (issue #79). All recurring
-- transactions are always active; delete to stop one.
-- SQLite cannot DROP COLUMN on older versions, so the standard
-- rename/recreate/copy/drop pattern is used.

BEGIN;

CREATE TABLE recurring_transactions_new (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  day_of_month INTEGER NOT NULL,
  linked_account_id TEXT REFERENCES accounts(id),
  month_of_year INTEGER
);

INSERT INTO recurring_transactions_new
  (id, account_id, amount, description, category, frequency,
   day_of_month, linked_account_id, month_of_year)
SELECT
  id, account_id, amount, description, category, frequency,
  day_of_month, linked_account_id, month_of_year
FROM recurring_transactions;

DROP TABLE recurring_transactions;
ALTER TABLE recurring_transactions_new RENAME TO recurring_transactions;

CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions(account_id);

COMMIT;
