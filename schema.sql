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
    branch TEXT NOT NULL,
    cgpa REAL NOT NULL,
    active_backlogs INTEGER NOT NULL DEFAULT 0,
    history_of_backlogs INTEGER NOT NULL DEFAULT 0,
    gender TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_number);
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
    backlog_rule INTEGER NOT NULL DEFAULT 0,
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
    UNIQUE(drive_id, student_id),
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_apps_drive ON applications(drive_id);
CREATE INDEX IF NOT EXISTS idx_apps_student ON applications(student_id);

-- 7. Round Candidates Pool
CREATE TABLE IF NOT EXISTS round_candidates (
    id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    application_id TEXT,
    entry_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(entry_status IN ('ACTIVE', 'PENDING_EVALUATION', 'DISCONTINUED')),
    source_round_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(round_id, student_id),
    FOREIGN KEY (drive_id) REFERENCES drives(id) ON DELETE CASCADE,
    FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rc_round ON round_candidates(round_id);

-- 8. Batches
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    drive_id TEXT NOT NULL,
    batch_name TEXT NOT NULL,
    capacity_type TEXT NOT NULL CHECK(capacity_type IN ('LIMITED', 'UNLIMITED')),
    capacity INTEGER,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'ACTIVE', 'SUBMITTED')),
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
