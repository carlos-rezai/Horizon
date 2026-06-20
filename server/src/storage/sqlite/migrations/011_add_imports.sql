-- Horizon migration 011: bank-statement-import persistence (issue #140).
--
-- The persistence slice behind the Import UI. A committed import becomes one
-- `imports` history record plus N import_id-tagged transactions, written in a
-- single transaction by the repo (cascade delete is a repo use-case, not SQL
-- ON DELETE CASCADE — mirroring how transfers own their atomicity). Remembered
-- per-bank column mappings live in `import_presets` so they survive restart,
-- reinstall, and backup/restore.

CREATE TABLE imports (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  bank TEXT NOT NULL,
  filename TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

CREATE INDEX idx_imports_account_id ON imports(account_id);

CREATE TABLE import_presets (
  bank TEXT PRIMARY KEY,
  mapping TEXT NOT NULL
);

-- Nullable FK to imports: hand-entered Variable Spending keeps import_id NULL,
-- imported rows carry their import's id. NO ACTION (the repo cascades).
ALTER TABLE transactions ADD COLUMN import_id TEXT REFERENCES imports(id);

CREATE INDEX idx_transactions_import_id ON transactions(import_id);
