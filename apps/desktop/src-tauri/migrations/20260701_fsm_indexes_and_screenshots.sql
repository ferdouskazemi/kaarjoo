-- P3: Performance indexes for applications, matches, and jobs
CREATE INDEX IF NOT EXISTS idx_applications_status_updated ON applications(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_matches_profile_score ON matches(profile_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_first_seen ON jobs(status, first_seen DESC);
