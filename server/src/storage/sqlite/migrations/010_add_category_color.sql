-- Horizon migration 010: add a colour column to categories (issue #134).
-- Each category carries a hex colour for the Month Overview breakdown donut and
-- other category-coloured surfaces. The column is nullable: SQL-seeded defaults
-- leave it NULL and the repo derives a deterministic per-name fallback at read
-- time, while user-created categories store their derived colour on insert.

ALTER TABLE categories ADD COLUMN color TEXT;
