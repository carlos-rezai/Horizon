-- Horizon migration 002: foreign-key constraints on referencing tables.
--
-- SQLite cannot ALTER TABLE ADD CONSTRAINT FOREIGN KEY, so the standard
-- "rename, recreate with FKs, copy, drop" pattern is used for transactions,
-- recurring_transactions, and milestones. FKs default to NO ACTION so the
-- application-level guards fire first and produce 409 responses (no CASCADE).

-- transactions ---------------------------------------------------------------

CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  date TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  transfer_id TEXT,
  recurring_transaction_id TEXT
);

INSERT INTO transactions_new
  (id, account_id, date, amount, description, category,
   transfer_id, recurring_transaction_id)
SELECT
  id, account_id, date, amount, description, category,
  transfer_id, recurring_transaction_id
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_transfer_id ON transactions(transfer_id);
CREATE INDEX idx_transactions_date ON transactions(date);

-- recurring_transactions -----------------------------------------------------

CREATE TABLE recurring_transactions_new (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency TEXT NOT NULL,
  day_of_month INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  linked_account_id TEXT REFERENCES accounts(id),
  month_of_year INTEGER
);

INSERT INTO recurring_transactions_new
  (id, account_id, amount, description, category, frequency,
   day_of_month, is_active, linked_account_id, month_of_year)
SELECT
  id, account_id, amount, description, category, frequency,
  day_of_month, is_active, linked_account_id, month_of_year
FROM recurring_transactions;

DROP TABLE recurring_transactions;
ALTER TABLE recurring_transactions_new RENAME TO recurring_transactions;

CREATE INDEX idx_recurring_transactions_account_id ON recurring_transactions(account_id);
CREATE INDEX idx_recurring_transactions_is_active ON recurring_transactions(is_active);

-- milestones -----------------------------------------------------------------

CREATE TABLE milestones_new (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  target_balance INTEGER NOT NULL
);

INSERT INTO milestones_new (id, name, account_id, target_balance)
SELECT id, name, account_id, target_balance FROM milestones;

DROP TABLE milestones;
ALTER TABLE milestones_new RENAME TO milestones;
