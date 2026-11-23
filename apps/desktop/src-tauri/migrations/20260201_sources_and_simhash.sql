-- Migration for Phase 2: Company Boards, Deduplication Hashes, and Source Indexes

ALTER TABLE jobs ADD COLUMN sim_hash TEXT;
ALTER TABLE jobs ADD COLUMN tuple_hash TEXT;
ALTER TABLE jobs ADD COLUMN employment_type TEXT;

CREATE TABLE IF NOT EXISTS company_boards (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    ats_type TEXT NOT NULL,
    board_slug TEXT NOT NULL,
    board_url TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'US',
    headquarters TEXT,
    industry TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    last_synced_at TEXT,
    job_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company);
CREATE INDEX IF NOT EXISTS idx_jobs_ats_type ON jobs(ats_type);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_type ON jobs(remote_type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_tuple_hash ON jobs(tuple_hash);
CREATE INDEX IF NOT EXISTS idx_company_boards_ats_type ON company_boards(ats_type);
CREATE INDEX IF NOT EXISTS idx_company_boards_active ON company_boards(active);
