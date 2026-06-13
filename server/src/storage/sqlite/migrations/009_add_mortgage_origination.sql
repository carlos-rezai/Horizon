-- Horizon migration 009: add mortgage origination fields to accounts (issue #130).
-- Records the original loan terms so the UI can show how much of the original
-- principal has been repaid. All three are nullable: only Mortgage accounts
-- ever carry them, and only once the user fills in the origination details.

ALTER TABLE accounts ADD COLUMN original_principal INTEGER;
ALTER TABLE accounts ADD COLUMN start_date TEXT;
ALTER TABLE accounts ADD COLUMN term_years INTEGER;
