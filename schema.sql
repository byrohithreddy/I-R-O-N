-- IRON (Integrated Recruitment Operations Navigator)
-- Cloudflare D1 (SQLite) Schema

-- 1. Users Table (TPO Admins, Coordinators, HR Evaluators)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('TPO', 'COORDINATOR', 'HR')),
    drive_id TEXT,
    company_name TEXT,
    full_name TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    token_version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index on username for fast login lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Permanent Student Master Database
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    roll_number TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    college TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL,
    department TEXT NOT NULL DEFAULT '',
    academic_year TEXT NOT NULL DEFAULT '2023-2027',
    cgpa REAL NOT NULL,
    active_backlogs INTEGER NOT NULL DEFAULT 0,
    history_of_backlogs INTEGER NOT NULL DEFAULT 0,
    gender TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_roll_upper ON students(UPPER(roll_number));
CREATE INDEX IF NOT EXISTS idx_students_branch ON students(branch);
CREATE INDEX IF NOT EXISTS idx_students_cgpa ON students(cgpa);

-- 3. Recruitment Drives (6-Month Retention Cycle)
CREATE TABLE IF NOT EXISTS drives (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    job_role TEXT NOT NULL,
    package TEXT NOT NULL,
    job_description TEXT,
    eligibility_criteria TEXT,
    minimum_cgpa REAL NOT NULL DEFAULT 7.0,
    backlog_rule TEXT NOT NULL DEFAULT '0',
    eligible_branches TEXT NOT NULL, -- JSON array of strings e.g. ["CSE","IT"]
    drive_date TEXT NOT NULL, -- YYYY-MM-DD
    drive_time TEXT NOT NULL DEFAULT '09:00',
    location TEXT NOT NULL DEFAULT 'Campus Auditorium',
    application_deadline TEXT NOT NULL, -- YYYY-MM-DDT00:00:00Z
    status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK(status IN ('DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED')),
    retention_expires_at TEXT NOT NULL, -- YYYY-MM-DD (drive_date + 6 months)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_drives_date ON drives(drive_date);
CREATE INDEX IF NOT EXISTS idx_drives_status ON drives(status);

-- 4. Drive Recruiter Credentials
CREATE TABLE IF NOT EXISTS drive_credentials (
    id TEXT PRIMARY KEY,
    drive_id TEXT UNIQUE NOT NULL,
    coordinator_username TEXT NOT NULL,
    coordinator_password_hash TEXT NOT NULL,
    coordinator_salt TEXT NOT NULL,
    hr_username TEXT NOT NULL,
    hr_password_hash TEXT NOT NULL,
    hr_salt TEXT NOT NULL,
    plain_coordinator_password TEXT, -- For TPO admin view/sharing
    plain_hr_password TEXT,          -- For TPO admin view/sharing
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE
);

-- 5. Drive Recruitment Rounds
CREATE TABLE IF NOT EXISTS rounds (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    round_name TEXT NOT NULL,
    round_type TEXT NOT NULL CHECK(round_type IN ('Aptitude', 'Coding', 'Technical', 'Group Discussion', 'HR', 'Other')),
    description TEXT,
    status TEXT NOT NULL DEFAULT 'UPCOMING' CHECK(status IN ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED')),
    is_final_round INTEGER NOT NULL DEFAULT 0, -- 1 = TRUE, 0 = FALSE
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rounds_drive ON rounds(drive_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rounds_drive_round_number ON rounds(drive_id, round_number);

-- 6. Applications (Rule 12: UNIQUE(drive_id, student_id))
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    application_email TEXT NOT NULL,
    application_phone TEXT NOT NULL,
    eligibility_status TEXT NOT NULL CHECK(eligibility_status IN ('ELIGIBLE', 'NOT_ELIGIBLE')),
    eligibility_override INTEGER NOT NULL DEFAULT 0,
    override_reason TEXT,
    override_by TEXT,
    override_at TEXT,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'APPLIED' CHECK(status IN ('APPLIED', 'IN_PROGRESS', 'ACTIVE', 'REJECTED', 'FINAL_SELECTED', 'PLACED')),
    UNIQUE(drive_id, student_id),
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_apps_drive ON applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apps_drive_student ON applications(drive_id, student_id);

-- 7. Round Candidates Pool
CREATE TABLE IF NOT EXISTS round_candidates (
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

CREATE INDEX IF NOT EXISTS idx_rc_round ON round_candidates(round_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rc_round_student ON round_candidates(round_id, student_id);

-- 8. Batches
CREATE TABLE IF NOT EXISTS batches (
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

CREATE INDEX IF NOT EXISTS idx_batches_round ON batches(round_id);

-- 9. Batch Students (Rule 15: UNIQUE(round_id, student_id) to prevent multi-batch assignments)
CREATE TABLE IF NOT EXISTS batch_students (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    drive_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(round_id, student_id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bs_batch ON batch_students(batch_id);
CREATE INDEX IF NOT EXISTS idx_bs_round_student ON batch_students(round_id, student_id);

-- 10. HR In-Flight Evaluations
CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('SELECT', 'HOLD', 'REJECT')),
    notes TEXT,
    evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
    evaluated_by TEXT NOT NULL,
    UNIQUE(batch_id, student_id),
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 11. Final Round Results (Rule 17, 18, 22)
CREATE TABLE IF NOT EXISTS round_results (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    drive_id TEXT NOT NULL,
    batch_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    result TEXT NOT NULL CHECK(result IN ('SELECTED', 'HOLD', 'REJECTED')),
    notes TEXT,
    finalized_at TEXT NOT NULL DEFAULT (datetime('now')),
    finalized_by TEXT NOT NULL,
    UNIQUE(round_id, student_id),
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 12. Permanent College Placement Records (Rule 23, 26)
CREATE TABLE IF NOT EXISTS placements (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    student_name TEXT NOT NULL,
    branch TEXT NOT NULL,
    company_name TEXT NOT NULL,
    job_role TEXT NOT NULL,
    package TEXT NOT NULL,
    placed_at TEXT NOT NULL DEFAULT (datetime('now')),
    source_round_id TEXT,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_placements_student ON placements(student_id);
CREATE INDEX IF NOT EXISTS idx_placements_drive ON placements(drive_id);

-- 13. Data Retention & Archival Log
CREATE TABLE IF NOT EXISTS drive_archives (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    drive_date TEXT NOT NULL,
    archive_filename TEXT NOT NULL,
    archived_at TEXT NOT NULL DEFAULT (datetime('now')),
    archived_by TEXT NOT NULL,
    metadata_json TEXT
);

-- 14. Password Change & Security Audit Logs
CREATE TABLE IF NOT EXISTS password_change_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    status TEXT NOT NULL DEFAULT 'SUCCESS',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_pwd_logs_user ON password_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_pwd_logs_created ON password_change_logs(created_at);

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


CREATE TRIGGER IF NOT EXISTS sync_revision_drive_credentials_insert
AFTER INSERT ON drive_credentials
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_drive_credentials_update
AFTER UPDATE ON drive_credentials
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;

CREATE TRIGGER IF NOT EXISTS sync_revision_drive_credentials_delete
AFTER DELETE ON drive_credentials
BEGIN
  UPDATE sync_revision SET revision = revision + 1 WHERE id = 1;
END;
