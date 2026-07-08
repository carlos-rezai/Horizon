-- Horizon migration 015: add a `hidden` flag to categories (issue #157).
-- Category Management lets the user hide a seeded Default Category from the
-- pickers without deleting its data. `hidden` is picker-only — it never
-- filters transactions out of the breakdown donut or year-comparison.
-- NOT NULL DEFAULT 0 forward-fills every pre-existing row (including the
-- categories seeded in migration 001) to hidden = 0, so an untouched install
-- reads exactly as it did before Category Management.

ALTER TABLE categories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
