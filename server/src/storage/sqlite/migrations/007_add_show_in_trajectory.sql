-- Horizon migration 007: add show_in_trajectory flag to accounts (issue #128).
-- Controls whether an account's balance line is rendered in the Trajectory
-- Horizon chart by default. Defaults to 1 (visible) for existing accounts.

ALTER TABLE accounts ADD COLUMN show_in_trajectory INTEGER NOT NULL DEFAULT 1;
