-- Horizon migration 005: add nullable icon and color columns to accounts.
-- These store the user-chosen Account Icon and Account Color (issue #79).

ALTER TABLE accounts ADD COLUMN icon TEXT;
ALTER TABLE accounts ADD COLUMN color TEXT;
