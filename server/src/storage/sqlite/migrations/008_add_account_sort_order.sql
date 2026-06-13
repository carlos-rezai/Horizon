-- Horizon migration 008: add sort_order to accounts (issue #129).
-- Drives the user-configurable account ordering used by drag-reorder across
-- every UI surface. Existing accounts are seeded from rowid so they keep a
-- stable, distinct initial order; new accounts append to the end.

ALTER TABLE accounts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE accounts SET sort_order = rowid;
