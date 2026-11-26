ALTER TABLE profiles ADD COLUMN field_provenance_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN issues_json TEXT NOT NULL DEFAULT '[]';
