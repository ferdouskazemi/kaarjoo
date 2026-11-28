-- Deduplicate any existing (job_id, profile_id) rows, keeping the most advanced status / latest update
DELETE FROM applications
WHERE id IN (
  SELECT a1.id
  FROM applications a1
  WHERE EXISTS (
    SELECT 1
    FROM applications a2
    WHERE a2.job_id = a1.job_id
      AND a2.profile_id = a1.profile_id
      AND a2.id != a1.id
      AND (
        CASE a2.status
          WHEN 'submitted_verified' THEN 100
          WHEN 'submitted_unverified' THEN 90
          WHEN 'applied' THEN 85
          WHEN 'offer' THEN 80
          WHEN 'interview' THEN 75
          WHEN 'needs_review' THEN 60
          WHEN 'needs_user' THEN 50
          WHEN 'filling' THEN 40
          WHEN 'queued' THEN 30
          WHEN 'saved' THEN 20
          WHEN 'failed' THEN 10
          ELSE 0
        END > CASE a1.status
          WHEN 'submitted_verified' THEN 100
          WHEN 'submitted_unverified' THEN 90
          WHEN 'applied' THEN 85
          WHEN 'offer' THEN 80
          WHEN 'interview' THEN 75
          WHEN 'needs_review' THEN 60
          WHEN 'needs_user' THEN 50
          WHEN 'filling' THEN 40
          WHEN 'queued' THEN 30
          WHEN 'saved' THEN 20
          WHEN 'failed' THEN 10
          ELSE 0
        END
        OR (
          a2.status = a1.status
          AND (a2.updated_at > a1.updated_at OR (a2.updated_at = a1.updated_at AND a2.id > a1.id))
        )
      )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_job_profile_unique
  ON applications(job_id, profile_id);
