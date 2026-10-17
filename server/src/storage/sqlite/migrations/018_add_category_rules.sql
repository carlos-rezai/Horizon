-- Horizon migration 018: add the category_rules table (issue #258).
--
-- A Category Rule maps one Counterparty Key (the normalised payee of an
-- imported row) to one category by name, like transactions and recurring
-- transactions reference categories. Rules are learned when an import is
-- committed and applied by the next import preview. Deleting an import never
-- removes a rule: knowledge outlives the statement it came from.

CREATE TABLE category_rules (
  counterparty_key TEXT PRIMARY KEY,
  category         TEXT NOT NULL,
  updated_at       TEXT NOT NULL      -- ISO timestamp of the last learn
);
