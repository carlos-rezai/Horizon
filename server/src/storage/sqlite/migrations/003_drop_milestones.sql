-- Horizon migration 003: drop the milestones table.
-- Milestones were removed in the UI redesign (issue #79).

DROP TABLE IF EXISTS milestones;
