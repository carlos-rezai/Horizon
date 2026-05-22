-- Horizon migration 006: credit-card auto-settlement configuration (issue #104).
-- Adds linked_account_id, settlement_day, linked_since to accounts;
-- adds is_auto_settlement to transactions.

ALTER TABLE accounts ADD COLUMN linked_account_id TEXT;
ALTER TABLE accounts ADD COLUMN settlement_day INTEGER;
ALTER TABLE accounts ADD COLUMN linked_since TEXT;
ALTER TABLE transactions ADD COLUMN is_auto_settlement INTEGER NOT NULL DEFAULT 0;
