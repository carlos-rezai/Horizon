-- Horizon migration 016: add the single-row savings_goal config table (issue #182).
--
-- The Savings Streak feature stores one per-database goal: the mode
-- (milestone | manual), the milestone target (total cents + target month), the
-- month the goal was first set, and the manual per-account monthly targets.
-- Milestone mode *derives* its per-account split at read time from history — it
-- is never stored per account — so this table holds only the one global config
-- row. The CHECK (id = 1) enforces the single-row invariant; the repo upserts
-- onto id = 1 so a second save overwrites rather than inserting a second row.

CREATE TABLE savings_goal (
  id             INTEGER PRIMARY KEY CHECK (id = 1),
  mode           TEXT NOT NULL,
  target_total   INTEGER NOT NULL,   -- cents
  target_date    TEXT NOT NULL,      -- "YYYY-MM"
  started_at     TEXT NOT NULL,      -- "YYYY-MM"
  manual_monthly TEXT NOT NULL       -- JSON: { accountId: cents }
);
