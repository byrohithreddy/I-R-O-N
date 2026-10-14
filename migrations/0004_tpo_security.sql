-- Support TPO password changes and session invalidation.
ALTER TABLE users
ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;

-- Store successful password-change audit records.
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

CREATE INDEX IF NOT EXISTS idx_pwd_logs_user
ON password_change_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_pwd_logs_created
ON password_change_logs(created_at);