-- Migration for Phase 3: FTS5 Full-Text Search, Synchronized Triggers, and Company Directory

-- 1. Create FTS5 virtual table for jobs with content rowid
CREATE VIRTUAL TABLE IF NOT EXISTS jobs_fts USING fts5(
    title,
    company,
    location,
    description_markdown,
    requirements_json,
    content='jobs',
    content_rowid='rowid',
    tokenize = 'unicode61 remove_diacritics 2'
);

-- 2. Populate FTS5 table with existing jobs
INSERT INTO jobs_fts(rowid, title, company, location, description_markdown, requirements_json)
SELECT rowid, title, company, coalesce(location, ''), description_markdown, requirements_json
FROM jobs;

-- 3. Automatic synchronization triggers for external content table
CREATE TRIGGER IF NOT EXISTS jobs_fts_ai AFTER INSERT ON jobs BEGIN
    INSERT INTO jobs_fts(rowid, title, company, location, description_markdown, requirements_json)
    VALUES (new.rowid, new.title, new.company, coalesce(new.location, ''), new.description_markdown, new.requirements_json);
END;

CREATE TRIGGER IF NOT EXISTS jobs_fts_ad AFTER DELETE ON jobs BEGIN
    INSERT INTO jobs_fts(jobs_fts, rowid, title, company, location, description_markdown, requirements_json)
    VALUES ('delete', old.rowid, old.title, old.company, coalesce(old.location, ''), old.description_markdown, old.requirements_json);
END;

CREATE TRIGGER IF NOT EXISTS jobs_fts_au AFTER UPDATE ON jobs BEGIN
    INSERT INTO jobs_fts(jobs_fts, rowid, title, company, location, description_markdown, requirements_json)
    VALUES ('delete', old.rowid, old.title, old.company, coalesce(old.location, ''), old.description_markdown, old.requirements_json);
    INSERT INTO jobs_fts(rowid, title, company, location, description_markdown, requirements_json)
    VALUES (new.rowid, new.title, new.company, coalesce(new.location, ''), new.description_markdown, new.requirements_json);
END;

-- 4. Extend company_boards table with rich metadata & directory fields
ALTER TABLE company_boards ADD COLUMN logo_url TEXT;
ALTER TABLE company_boards ADD COLUMN size_bucket TEXT;
ALTER TABLE company_boards ADD COLUMN tags_json TEXT DEFAULT '[]';
ALTER TABLE company_boards ADD COLUMN remote_policy TEXT;
ALTER TABLE company_boards ADD COLUMN is_followed INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_company_boards_followed ON company_boards(is_followed);
CREATE INDEX IF NOT EXISTS idx_company_boards_country ON company_boards(country);
CREATE INDEX IF NOT EXISTS idx_company_boards_remote_policy ON company_boards(remote_policy);
