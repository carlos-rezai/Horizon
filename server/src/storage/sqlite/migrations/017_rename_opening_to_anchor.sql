-- Horizon migration 017: Balance Anchor rename (issue #230).
--
-- An account's known balance is an anchor that history is derived backwards
-- from, not an opening balance that history is added onto. The columns are
-- renamed only: every stored value is kept as it is.

ALTER TABLE accounts RENAME COLUMN opening_balance TO anchor_balance;
ALTER TABLE accounts RENAME COLUMN opening_date TO anchor_date;
