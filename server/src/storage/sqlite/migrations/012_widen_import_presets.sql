-- Horizon migration 012: restore the full import-preset format (issue #143).
--
-- Migration 011 collapsed import_presets to (bank, mapping), dropping the
-- delimiter / decimal / date_fmt the parse engine needs to re-apply a
-- remembered format. A "remembered" preset therefore restored only column
-- names; the format quirks were silently re-derived from the freshly detected
-- bank. This widens the table so the full format round-trips and survives
-- restart, reinstall, and backup/restore — the same survive-a-reinstall
-- reasoning as showInTrajectory, sortOrder, and mortgage origination.
--
-- Forward-only: NOT-NULL columns with the German-bank defaults backfill every
-- existing row cleanly. No down-migration — restore-from-backup is the
-- rollback path.

ALTER TABLE import_presets ADD COLUMN delimiter TEXT NOT NULL DEFAULT ';';
ALTER TABLE import_presets ADD COLUMN decimal TEXT NOT NULL DEFAULT ',';
ALTER TABLE import_presets ADD COLUMN date_fmt TEXT NOT NULL DEFAULT 'DD.MM.YYYY';
