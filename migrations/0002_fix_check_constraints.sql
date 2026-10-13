-- Migration to fix CHECK constraints on batches and round_candidates
PRAGMA foreign_keys=OFF;

CREATE TABLE batches_new (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    drive_id TEXT NOT NULL,
    batch_name TEXT NOT NULL,
    capacity_type TEXT NOT NULL CHECK(capacity_type IN ('LIMITED', 'UNLIMITED')),
    capacity INTEGER,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'DRAFT', 'ACTIVE', 'SUBMITTED')),
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    submitted_at TEXT,
    submitted_by TEXT,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE
);

INSERT INTO batches_new (id, round_id, drive_id, batch_name, capacity_type, capacity, status, created_by, created_at, submitted_at, submitted_by)
    SELECT id, round_id, drive_id, batch_name, capacity_type, capacity, status, created_by, created_at, submitted_at, submitted_by FROM batches;

DROP TABLE batches;

ALTER TABLE batches_new RENAME TO batches;

CREATE INDEX IF NOT EXISTS idx_batches_round ON batches(round_id);

CREATE TABLE round_candidates_new (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    application_id TEXT,
    entry_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(entry_status IN ('ACTIVE', 'HOLD', 'PENDING_EVALUATION', 'DISCONTINUED', 'REJECTED')),
    source_round_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(round_id, student_id),
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

INSERT INTO round_candidates_new (id, drive_id, round_id, student_id, application_id, entry_status, source_round_id, created_at)
    SELECT id, drive_id, round_id, student_id, application_id, entry_status, source_round_id, created_at FROM round_candidates;

DROP TABLE round_candidates;

ALTER TABLE round_candidates_new RENAME TO round_candidates;

CREATE INDEX IF NOT EXISTS idx_round_candidates_round ON round_candidates(round_id);
CREATE INDEX IF NOT EXISTS idx_round_candidates_student ON round_candidates(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_round_candidates_round_student ON round_candidates(round_id, student_id);

PRAGMA foreign_keys=ON;
