-- Reliable revision counter for /api/sync ETags.
-- Apply this migration to the existing D1 database before deploying the Worker change.
CREATE TABLE IF NOT EXISTS sync_revision (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO sync_revision (id, revision) VALUES (1, 0);

CREATE TRIGGER IF NOT EXISTS sync_revision_students_insert
AFTER INSERT ON students
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_students_update
AFTER UPDATE ON students
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_students_delete
AFTER DELETE ON students
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_drives_insert
AFTER INSERT ON drives
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_drives_update
AFTER UPDATE ON drives
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_drives_delete
AFTER DELETE ON drives
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_rounds_insert
AFTER INSERT ON rounds
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_rounds_update
AFTER UPDATE ON rounds
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_rounds_delete
AFTER DELETE ON rounds
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_applications_insert
AFTER INSERT ON applications
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_applications_update
AFTER UPDATE ON applications
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_applications_delete
AFTER DELETE ON applications
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_round_candidates_insert
AFTER INSERT ON round_candidates
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_round_candidates_update
AFTER UPDATE ON round_candidates
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_round_candidates_delete
AFTER DELETE ON round_candidates
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_batches_insert
AFTER INSERT ON batches
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_batches_update
AFTER UPDATE ON batches
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_batches_delete
AFTER DELETE ON batches
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_batch_students_insert
AFTER INSERT ON batch_students
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_batch_students_update
AFTER UPDATE ON batch_students
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_batch_students_delete
AFTER DELETE ON batch_students
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_evaluations_insert
AFTER INSERT ON evaluations
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_evaluations_update
AFTER UPDATE ON evaluations
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_evaluations_delete
AFTER DELETE ON evaluations
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_round_results_insert
AFTER INSERT ON round_results
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_round_results_update
AFTER UPDATE ON round_results
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_round_results_delete
AFTER DELETE ON round_results
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_placements_insert
AFTER INSERT ON placements
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_placements_update
AFTER UPDATE ON placements
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_placements_delete
AFTER DELETE ON placements
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

