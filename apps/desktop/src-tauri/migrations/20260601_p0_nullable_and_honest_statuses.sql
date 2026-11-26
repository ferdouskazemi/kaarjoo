-- P0 fixes: verification tracking, honest application stop/submit fields, and RFC 3339 timestamp backfill
ALTER TABLE profiles ADD COLUMN confirmed_sections_json TEXT DEFAULT '{}';

ALTER TABLE applications ADD COLUMN stop_reason TEXT;
ALTER TABLE applications ADD COLUMN stop_message TEXT;
ALTER TABLE applications ADD COLUMN missing_required_fields_json TEXT DEFAULT '[]';
ALTER TABLE applications ADD COLUMN submit_attempt_id TEXT;

-- Convert legacy epoch-like timestamps (e.g. "1795602214.480Z") to RFC 3339
UPDATE applications
SET created_at = strftime('%Y-%m-%dT%H:%M:%SZ', CAST(substr(created_at, 1, instr(created_at, '.') - 1) AS INTEGER), 'unixepoch')
WHERE created_at GLOB '[0-9]*.[0-9][0-9][0-9]Z';

UPDATE applications
SET updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', CAST(substr(updated_at, 1, instr(updated_at, '.') - 1) AS INTEGER), 'unixepoch')
WHERE updated_at GLOB '[0-9]*.[0-9][0-9][0-9]Z';

UPDATE applications
SET submitted_at = strftime('%Y-%m-%dT%H:%M:%SZ', CAST(substr(submitted_at, 1, instr(submitted_at, '.') - 1) AS INTEGER), 'unixepoch')
WHERE submitted_at IS NOT NULL AND submitted_at GLOB '[0-9]*.[0-9][0-9][0-9]Z';
