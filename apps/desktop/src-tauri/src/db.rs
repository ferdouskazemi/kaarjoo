use crate::models::*;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteRow},
    Pool, Row, Sqlite,
};
use std::collections::HashMap;
use std::path::Path;
use tracing::info;

pub type DbPool = Pool<Sqlite>;

pub async fn init_db(app_data_dir: &Path) -> Result<DbPool, Box<dyn std::error::Error + Send + Sync>> {
    std::fs::create_dir_all(app_data_dir)?;
    let db_path = app_data_dir.join("kaarjoo.db");

    let connect_opts = SqliteConnectOptions::new()
        .filename(&db_path)
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_opts)
        .await?;

    info!("Running embedded SQLite migrations...");
    sqlx::migrate!("./migrations").run(&pool).await?;

    // Reset any interrupted running tasks to failed on restart
    sqlx::query(
        "UPDATE tasks SET status = 'failed', error_text = 'Interrupted by application restart' WHERE status = 'running'"
    )
    .execute(&pool)
    .await?;

    info!("SQLite database initialized and migrations applied successfully at {:?}", db_path);
    Ok(pool)
}

// -----------------------------------------------------------------------------
// Profiles
// -----------------------------------------------------------------------------

pub async fn get_profile(pool: &DbPool) -> Result<Option<UserProfileDto>, sqlx::Error> {
    let row_opt = sqlx::query("SELECT id, version, full_name, email, phone, location, summary, field_provenance_json, issues_json, created_at, updated_at FROM profiles ORDER BY updated_at DESC LIMIT 1")
        .fetch_optional(pool)
        .await?;

    let Some(row) = row_opt else {
        return Ok(None);
    };

    let profile_id: String = row.get("id");
    let version: i32 = row.get("version");
    let full_name_raw: Option<String> = row.try_get("full_name").ok();
    let email_raw: Option<String> = row.try_get("email").ok();
    let full_name = full_name_raw.filter(|s| !s.trim().is_empty());
    let email = email_raw.filter(|s| !s.trim().is_empty());
    let phone: Option<String> = row.get("phone");
    let location: Option<String> = row.get("location");
    let summary: Option<String> = row.get("summary");
    let created_at: String = row.get("created_at");
    let updated_at: String = row.get("updated_at");

    let exp_rows = sqlx::query(
        "SELECT id, title, company, location, start_date, end_date, is_current, description, achievements_json FROM experiences WHERE profile_id = ?"
    )
    .bind(&profile_id)
    .fetch_all(pool)
    .await?;

    let experiences: Vec<ExperienceItemDto> = exp_rows
        .into_iter()
        .map(|r| {
            let ach_json: String = r.get("achievements_json");
            let achievements: Vec<String> = serde_json::from_str(&ach_json).unwrap_or_default();
            let title_raw: Option<String> = r.try_get("title").ok();
            let company_raw: Option<String> = r.try_get("company").ok();
            let start_raw: Option<String> = r.try_get("start_date").ok();
            ExperienceItemDto {
                id: r.get("id"),
                title: title_raw.filter(|s| !s.trim().is_empty()),
                company: company_raw.filter(|s| !s.trim().is_empty()),
                location: r.get("location"),
                start_date: start_raw.filter(|s| !s.trim().is_empty()),
                end_date: r.get("end_date"),
                is_current: r.get::<i64, _>("is_current") == 1,
                description: r.get("description"),
                achievements,
                skills_used: Vec::new(),
                provenance: None,
            }
        })
        .collect();

    let skill_rows = sqlx::query(
        "SELECT id, name, esco_id, category, years_of_experience, level, confidence FROM skills WHERE profile_id = ?"
    )
    .bind(&profile_id)
    .fetch_all(pool)
    .await?;

    let skills: Vec<SkillItemDto> = skill_rows
        .into_iter()
        .map(|r| SkillItemDto {
            id: r.get("id"),
            name: r.get("name"),
            esco_id: r.get("esco_id"),
            category: r.get("category"),
            years_of_experience: r.get("years_of_experience"),
            level: r.get("level"),
            confidence: r.get("confidence"),
            provenance: None,
        })
        .collect();

    let field_prov_json: String = row.try_get("field_provenance_json").unwrap_or_else(|_| "{}".to_string());
    let field_provenance: std::collections::HashMap<String, ExtractedFactProvenanceDto> =
        serde_json::from_str(&field_prov_json).unwrap_or_default();
    let issues_json: String = row.try_get("issues_json").unwrap_or_else(|_| "[]".to_string());
    let issues: Vec<ProfileIssueDto> = serde_json::from_str(&issues_json).unwrap_or_default();

    Ok(Some(UserProfileDto {
        id: profile_id,
        version,
        contact: ContactInfoDto {
            full_name,
            email,
            phone,
            location,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            provenance: None,
        },
        summary,
        experiences,
        education: Vec::new(),
        skills,
        target_titles: Vec::new(),
        field_provenance,
        issues,
        created_at,
        updated_at,
    }))
}

pub async fn save_profile(pool: &DbPool, p: &UserProfileDto) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;
    let field_prov_json = serde_json::to_string(&p.field_provenance).unwrap_or_else(|_| "{}".to_string());
    let issues_json = serde_json::to_string(&p.issues).unwrap_or_else(|_| "[]".to_string());

    sqlx::query(
        r#"
        INSERT INTO profiles (id, version, full_name, email, phone, location, summary, field_provenance_json, issues_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            version = excluded.version,
            full_name = excluded.full_name,
            email = excluded.email,
            phone = excluded.phone,
            location = excluded.location,
            summary = excluded.summary,
            field_provenance_json = excluded.field_provenance_json,
            issues_json = excluded.issues_json,
            updated_at = excluded.updated_at
        "#
    )
    .bind(&p.id)
    .bind(p.version)
    .bind(p.contact.full_name.as_deref().unwrap_or(""))
    .bind(p.contact.email.as_deref().unwrap_or(""))
    .bind(&p.contact.phone)
    .bind(&p.contact.location)
    .bind(&p.summary)
    .bind(&field_prov_json)
    .bind(&issues_json)
    .bind(&p.created_at)
    .bind(&p.updated_at)
    .execute(&mut *tx)
    .await?;

    // Clear existing experiences and skills for this profile to re-insert
    sqlx::query("DELETE FROM experiences WHERE profile_id = ?")
        .bind(&p.id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM skills WHERE profile_id = ?")
        .bind(&p.id)
        .execute(&mut *tx)
        .await?;

    for exp in &p.experiences {
        let ach_json = serde_json::to_string(&exp.achievements).unwrap_or_else(|_| "[]".to_string());
        sqlx::query(
            r#"
            INSERT INTO experiences (id, profile_id, title, company, location, start_date, end_date, is_current, description, achievements_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                profile_id = excluded.profile_id,
                title = excluded.title,
                company = excluded.company,
                location = excluded.location,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                is_current = excluded.is_current,
                description = excluded.description,
                achievements_json = excluded.achievements_json
            "#
        )
        .bind(&exp.id)
        .bind(&p.id)
        .bind(exp.title.as_deref().unwrap_or(""))
        .bind(exp.company.as_deref().unwrap_or(""))
        .bind(&exp.location)
        .bind(exp.start_date.as_deref().unwrap_or(""))
        .bind(&exp.end_date)
        .bind(if exp.is_current { 1 } else { 0 })
        .bind(&exp.description)
        .bind(ach_json)
        .bind(&p.created_at)
        .execute(&mut *tx)
        .await?;
    }

    for sk in &p.skills {
        sqlx::query(
            r#"
            INSERT INTO skills (id, profile_id, name, esco_id, category, years_of_experience, level, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                profile_id = excluded.profile_id,
                name = excluded.name,
                esco_id = excluded.esco_id,
                category = excluded.category,
                years_of_experience = excluded.years_of_experience,
                level = excluded.level,
                confidence = excluded.confidence
            "#
        )
        .bind(&sk.id)
        .bind(&p.id)
        .bind(&sk.name)
        .bind(&sk.esco_id)
        .bind(&sk.category)
        .bind(sk.years_of_experience)
        .bind(&sk.level)
        .bind(sk.confidence.unwrap_or(1.0))
        .bind(&p.created_at)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;
    Ok(())
}

pub async fn clear_profile(pool: &DbPool) -> Result<(), sqlx::Error> {
    sqlx::query("DELETE FROM profiles").execute(pool).await?;
    Ok(())
}

// -----------------------------------------------------------------------------
// Source Files
// -----------------------------------------------------------------------------

pub async fn save_source_file(
    pool: &DbPool,
    id: &str,
    profile_id: &str,
    file_path: &str,
    file_name: &str,
    file_size: i64,
    mime_type: &str,
    sha256: &str,
    pages_count: i32,
    ocr_used: bool,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO source_files (id, profile_id, file_path, file_name, file_size, mime_type, sha256, pages_count, ocr_used, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        "#
    )
    .bind(id)
    .bind(profile_id)
    .bind(file_path)
    .bind(file_name)
    .bind(file_size)
    .bind(mime_type)
    .bind(sha256)
    .bind(pages_count)
    .bind(if ocr_used { 1 } else { 0 })
    .execute(pool)
    .await?;

    Ok(())
}

// -----------------------------------------------------------------------------
// Jobs
// -----------------------------------------------------------------------------

pub async fn save_jobs_batch(pool: &DbPool, jobs: &[JobPostingDto]) -> Result<usize, sqlx::Error> {
    let mut count = 0;
    let mut tx = pool.begin().await?;

    for job in jobs {
        let req_json = serde_json::to_string(&job.requirements).unwrap_or_else(|_| "[]".to_string());
        let salary_json = job
            .salary
            .as_ref()
            .map(|s| serde_json::to_string(s).unwrap_or_default());

        let res = sqlx::query(
            r#"
            INSERT INTO jobs (
                id, source_id, canonical_url, apply_url, title, company, location,
                remote_type, employment_type, salary_json, description_markdown,
                requirements_json, ats_type, content_hash, sim_hash, first_seen, last_seen, status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'active')
            ON CONFLICT(canonical_url) DO UPDATE SET
                last_seen = datetime('now'),
                apply_url = excluded.apply_url,
                title = excluded.title,
                location = excluded.location,
                remote_type = excluded.remote_type,
                description_markdown = excluded.description_markdown
            "#
        )
        .bind(&job.id)
        .bind(&job.source_id)
        .bind(&job.canonical_url)
        .bind(&job.apply_url)
        .bind(&job.title)
        .bind(&job.company)
        .bind(&job.location)
        .bind(&job.remote_type)
        .bind(&job.employment_type)
        .bind(salary_json)
        .bind(&job.description_markdown)
        .bind(req_json)
        .bind(&job.ats_type)
        .bind(&job.content_hash)
        .bind(&job.sim_hash)
        .execute(&mut *tx)
        .await?;

        if res.rows_affected() > 0 {
            count += 1;
        }
    }

    tx.commit().await?;
    Ok(count)
}

fn map_job_row(r: &SqliteRow) -> JobPostingDto {
    let req_json: String = r.get("requirements_json");
    let requirements: Vec<String> = serde_json::from_str(&req_json).unwrap_or_default();
    let salary_json: Option<String> = r.get("salary_json");
    let salary: Option<SalaryRangeDto> = salary_json.and_then(|s| serde_json::from_str(&s).ok());
    let match_score: Option<f64> = r.try_get("match_score").ok();

    JobPostingDto {
        id: r.get("id"),
        source_id: r.get("source_id"),
        source_name: r.get::<String, _>("company"),
        canonical_url: r.get("canonical_url"),
        apply_url: r.get("apply_url"),
        title: r.get("title"),
        company: r.get("company"),
        location: r.get("location"),
        remote_type: r.get("remote_type"),
        employment_type: r.get("employment_type"),
        salary,
        description_markdown: r.get("description_markdown"),
        requirements,
        posted_at: r.get("first_seen"),
        expires_at: None,
        ats_type: r.get("ats_type"),
        content_hash: r.get("content_hash"),
        sim_hash: r.get("sim_hash"),
        match_score,
    }
}

pub async fn get_jobs(
    pool: &DbPool,
    ats_type: Option<&str>,
    remote_type: Option<&str>,
    search: Option<&str>,
    limit: i64,
) -> Result<Vec<JobPostingDto>, sqlx::Error> {
    let mut qb = sqlx::QueryBuilder::<Sqlite>::new(
        r#"
        SELECT j.id, j.source_id, j.canonical_url, j.apply_url, j.title, j.company, j.location,
               j.remote_type, j.employment_type, j.salary_json, j.description_markdown,
               j.requirements_json, j.ats_type, j.content_hash, j.sim_hash, j.first_seen,
               m.overall_score as match_score
        FROM jobs j
        LEFT JOIN matches m ON j.id = m.job_id AND m.profile_id = (SELECT id FROM profiles ORDER BY updated_at DESC LIMIT 1)
        WHERE j.status = 'active'
        "#
    );

    if let Some(ats) = ats_type {
        if !ats.is_empty() && ats != "all" {
            qb.push(" AND j.ats_type = ");
            qb.push_bind(ats);
        }
    }

    if let Some(rt) = remote_type {
        if !rt.is_empty() && rt != "all" {
            qb.push(" AND j.remote_type = ");
            qb.push_bind(rt);
        }
    }

    if let Some(s) = search {
        if !s.is_empty() {
            let pattern = format!("%{}%", s);
            qb.push(" AND (j.title LIKE ");
            qb.push_bind(pattern.clone());
            qb.push(" OR j.company LIKE ");
            qb.push_bind(pattern.clone());
            qb.push(" OR j.location LIKE ");
            qb.push_bind(pattern);
            qb.push(")");
        }
    }

    qb.push(" ORDER BY coalesce(m.overall_score, 0) DESC, j.first_seen DESC LIMIT ");
    qb.push_bind(limit);

    let rows = qb.build().fetch_all(pool).await?;

    Ok(rows.iter().map(map_job_row).collect())
}

pub async fn get_job_by_id(pool: &DbPool, id: &str) -> Result<Option<JobPostingDto>, sqlx::Error> {
    let row_opt = sqlx::query(
        r#"
        SELECT j.id, j.source_id, j.canonical_url, j.apply_url, j.title, j.company, j.location,
               j.remote_type, j.employment_type, j.salary_json, j.description_markdown,
               j.requirements_json, j.ats_type, j.content_hash, j.sim_hash, j.first_seen,
               m.overall_score as match_score
        FROM jobs j
        LEFT JOIN matches m ON j.id = m.job_id AND m.profile_id = (SELECT id FROM profiles ORDER BY updated_at DESC LIMIT 1)
        WHERE j.id = ?
        "#
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row_opt.as_ref().map(map_job_row))
}

pub async fn search_jobs_fts(
    pool: &DbPool,
    query: &str,
    limit: i64,
) -> Result<Vec<JobPostingDto>, sqlx::Error> {
    let clean_query = query.trim().replace('"', "").replace('\'', "");
    if clean_query.is_empty() {
        return get_jobs(pool, None, None, None, limit).await;
    }

    let formatted_query = clean_query
        .split_whitespace()
        .map(|w| format!("\"{}\"*", w))
        .collect::<Vec<_>>()
        .join(" ");

    let rows = sqlx::query(
        r#"
        SELECT j.id, j.source_id, j.canonical_url, j.apply_url, j.title, j.company, j.location,
               j.remote_type, j.employment_type, j.salary_json, j.description_markdown,
               j.requirements_json, j.ats_type, j.content_hash, j.sim_hash, j.first_seen,
               CAST(coalesce(m.overall_score, 0.0) AS REAL) as match_score
        FROM jobs_fts
        JOIN jobs j ON j.rowid = jobs_fts.rowid
        LEFT JOIN matches m ON j.id = m.job_id AND m.profile_id = (SELECT id FROM profiles ORDER BY updated_at DESC LIMIT 1)
        WHERE jobs_fts MATCH ?
          AND j.status = 'active'
        ORDER BY rank, coalesce(m.overall_score, 0) DESC
        LIMIT ?
        "#
    )
    .bind(&formatted_query)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows.iter().map(map_job_row).collect())
}

// -----------------------------------------------------------------------------
// Company Directory
// -----------------------------------------------------------------------------

fn map_company_board_row(r: &SqliteRow) -> CompanyBoardDto {
    let tags_json: String = r.try_get("tags_json").unwrap_or_else(|_| "[]".to_string());
    let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

    CompanyBoardDto {
        id: r.get("id"),
        name: r.get("name"),
        domain: r.get("domain"),
        ats_type: r.get("ats_type"),
        board_slug: r.get("board_slug"),
        board_url: r.get("board_url"),
        country: r.get("country"),
        headquarters: r.get("headquarters"),
        industry: r.get("industry"),
        active: r.get::<i64, _>("active") == 1,
        last_synced_at: r.get("last_synced_at"),
        job_count: r.get::<i64, _>("job_count"),
        logo_url: r.get("logo_url"),
        size_bucket: r.get("size_bucket"),
        tags,
        remote_policy: r.get("remote_policy"),
        is_followed: r.get::<i64, _>("is_followed") == 1,
    }
}

pub async fn get_company_directory(
    pool: &DbPool,
    ats_type: Option<&str>,
    country: Option<&str>,
    remote_policy: Option<&str>,
    search: Option<&str>,
    is_followed: Option<bool>,
    limit: i64,
) -> Result<Vec<CompanyBoardDto>, sqlx::Error> {
    let mut qb = sqlx::QueryBuilder::<Sqlite>::new(
        "SELECT id, name, domain, ats_type, board_slug, board_url, country, headquarters, industry, active, last_synced_at, job_count, logo_url, size_bucket, tags_json, remote_policy, is_followed FROM company_boards WHERE active = 1"
    );

    if let Some(ats) = ats_type {
        if !ats.is_empty() && ats != "all" {
            qb.push(" AND ats_type = ");
            qb.push_bind(ats);
        }
    }

    if let Some(c) = country {
        if !c.is_empty() && c != "all" {
            qb.push(" AND country = ");
            qb.push_bind(c);
        }
    }

    if let Some(rp) = remote_policy {
        if !rp.is_empty() && rp != "all" {
            qb.push(" AND remote_policy = ");
            qb.push_bind(rp);
        }
    }

    if let Some(f) = is_followed {
        if f {
            qb.push(" AND is_followed = 1");
        }
    }

    if let Some(s) = search {
        if !s.is_empty() {
            let pat = format!("%{}%", s);
            qb.push(" AND (name LIKE ");
            qb.push_bind(pat.clone());
            qb.push(" OR domain LIKE ");
            qb.push_bind(pat.clone());
            qb.push(" OR industry LIKE ");
            qb.push_bind(pat);
            qb.push(")");
        }
    }

    qb.push(" ORDER BY is_followed DESC, job_count DESC, name ASC LIMIT ");
    qb.push_bind(limit);

    let rows = qb.build().fetch_all(pool).await?;
    Ok(rows.iter().map(map_company_board_row).collect())
}

pub async fn toggle_company_follow(
    pool: &DbPool,
    board_id: &str,
    is_followed: bool,
) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE company_boards SET is_followed = ? WHERE id = ?")
        .bind(if is_followed { 1 } else { 0 })
        .bind(board_id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn upsert_company_board(
    pool: &DbPool,
    c: &CompanyBoardDto,
) -> Result<(), sqlx::Error> {
    let tags_json = serde_json::to_string(&c.tags).unwrap_or_else(|_| "[]".to_string());
    sqlx::query(
        r#"
        INSERT INTO company_boards (
            id, name, domain, ats_type, board_slug, board_url, country, headquarters,
            industry, active, last_synced_at, job_count, logo_url, size_bucket,
            tags_json, remote_policy, is_followed, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            domain = excluded.domain,
            ats_type = excluded.ats_type,
            board_slug = excluded.board_slug,
            board_url = excluded.board_url,
            country = excluded.country,
            headquarters = excluded.headquarters,
            industry = excluded.industry,
            job_count = excluded.job_count,
            logo_url = excluded.logo_url,
            size_bucket = excluded.size_bucket,
            tags_json = excluded.tags_json,
            remote_policy = excluded.remote_policy
        "#
    )
    .bind(&c.id)
    .bind(&c.name)
    .bind(&c.domain)
    .bind(&c.ats_type)
    .bind(&c.board_slug)
    .bind(&c.board_url)
    .bind(&c.country)
    .bind(&c.headquarters)
    .bind(&c.industry)
    .bind(if c.active { 1 } else { 0 })
    .bind(&c.last_synced_at)
    .bind(c.job_count)
    .bind(&c.logo_url)
    .bind(&c.size_bucket)
    .bind(&tags_json)
    .bind(&c.remote_policy)
    .bind(if c.is_followed { 1 } else { 0 })
    .execute(pool)
    .await?;

    Ok(())
}

// -----------------------------------------------------------------------------
// Matches
// -----------------------------------------------------------------------------

pub async fn save_match(pool: &DbPool, m: &MatchResultDto) -> Result<(), sqlx::Error> {
    let breakdown_json = serde_json::to_string(&m.breakdown).unwrap_or_else(|_| "{}".to_string());
    let top_reasons = serde_json::to_string(&m.top_reasons).unwrap_or_else(|_| "[]".to_string());
    let matched_skills = serde_json::to_string(&m.matched_skills).unwrap_or_else(|_| "[]".to_string());
    let missing_skills = serde_json::to_string(&m.missing_skills).unwrap_or_else(|_| "[]".to_string());

    let match_id = format!("match_{}_{}", m.job_id, m.profile_id);

    sqlx::query(
        r#"
        INSERT INTO matches (
            id, job_id, profile_id, overall_score, breakdown_json, top_reasons_json,
            matched_skills_json, missing_skills_json, user_feedback, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            overall_score = excluded.overall_score,
            breakdown_json = excluded.breakdown_json,
            top_reasons_json = excluded.top_reasons_json,
            matched_skills_json = excluded.matched_skills_json,
            missing_skills_json = excluded.missing_skills_json,
            user_feedback = excluded.user_feedback
        "#
    )
    .bind(match_id)
    .bind(&m.job_id)
    .bind(&m.profile_id)
    .bind(m.score)
    .bind(breakdown_json)
    .bind(top_reasons)
    .bind(matched_skills)
    .bind(missing_skills)
    .bind(&m.user_feedback)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn get_match(pool: &DbPool, job_id: &str, profile_id: &str) -> Result<Option<MatchResultDto>, sqlx::Error> {
    let row_opt = sqlx::query(
        r#"
        SELECT overall_score, breakdown_json, top_reasons_json, matched_skills_json, missing_skills_json, user_feedback
        FROM matches
        WHERE job_id = ? AND profile_id = ?
        LIMIT 1
        "#
    )
    .bind(job_id)
    .bind(profile_id)
    .fetch_optional(pool)
    .await?;

    let Some(r) = row_opt else {
        return Ok(None);
    };

    let score: f64 = r.get("overall_score");
    let bd_json: String = r.get("breakdown_json");
    let breakdown: MatchBreakdownDto = serde_json::from_str(&bd_json).unwrap_or(MatchBreakdownDto {
        hard_filter: 100.0,
        semantic: score,
        skill_coverage: score,
        rerank: score,
    });
    let tr_json: String = r.get("top_reasons_json");
    let top_reasons: Vec<String> = serde_json::from_str(&tr_json).unwrap_or_default();
    let ms_json: String = r.get("matched_skills_json");
    let matched_skills: Vec<String> = serde_json::from_str(&ms_json).unwrap_or_default();
    let mis_json: String = r.get("missing_skills_json");
    let missing_skills: Vec<String> = serde_json::from_str(&mis_json).unwrap_or_default();
    let user_feedback: Option<String> = r.get("user_feedback");

    Ok(Some(MatchResultDto {
        job_id: job_id.to_string(),
        profile_id: profile_id.to_string(),
        score,
        breakdown,
        top_reasons,
        matched_skills,
        missing_skills,
        why_not_higher: None,
        user_feedback,
    }))
}

pub async fn save_feedback(pool: &DbPool, job_id: &str, feedback: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE matches SET user_feedback = ? WHERE job_id = ?")
        .bind(feedback)
        .bind(job_id)
        .execute(pool)
        .await?;
    Ok(())
}

// -----------------------------------------------------------------------------
// Applications
// -----------------------------------------------------------------------------

pub async fn get_all_applications(pool: &DbPool) -> Result<Vec<ApplicationRecordDto>, sqlx::Error> {
    let rows = sqlx::query(
        r#"
        SELECT a.id, a.job_id, a.profile_id, a.status, a.mode, a.submitted_at,
               a.confirmation_text, a.screenshot_path, a.created_at, a.updated_at,
               a.stop_reason, a.stop_message, a.missing_required_fields_json, a.submit_attempt_id,
               j.title as job_title, j.company, j.location, j.apply_url, j.ats_type,
               CAST(m.overall_score AS REAL) as match_score
        FROM applications a
        JOIN jobs j ON a.job_id = j.id
        LEFT JOIN matches m ON a.job_id = m.job_id AND m.profile_id = a.profile_id
        ORDER BY a.created_at DESC
        "#
    )
    .fetch_all(pool)
    .await?;

    let mut result = Vec::new();
    for r in rows {
        let app_id: String = r.get("id");

        // Fetch application steps
        let step_rows = sqlx::query(
            "SELECT step_name, status, checklist_json, screenshot_path, created_at FROM application_steps WHERE application_id = ? ORDER BY created_at ASC"
        )
        .bind(&app_id)
        .fetch_all(pool)
        .await?;

        let mut review_checklist = Vec::new();
        let mut screenshot_before_submit: Option<String> = None;

        for sr in &step_rows {
            let sc_path: Option<String> = sr.get("screenshot_path");
            if sc_path.is_some() {
                screenshot_before_submit = sc_path;
            }
            let cl_json: String = sr.try_get("checklist_json").unwrap_or_default();
            if let Ok(items) = serde_json::from_str::<Vec<ReviewChecklistItemDto>>(&cl_json) {
                review_checklist = items;
            }
        }

        let status: String = r.get("status");
        let submitted_at: Option<String> = r.get("submitted_at");

        let mut timeline = vec![TimelineEventDto {
            id: format!("tl_{}", app_id),
            status: "saved".to_string(),
            timestamp: r.get("created_at"),
            title: "Application Created".to_string(),
            note: None,
        }];

        if status == "applied" || submitted_at.is_some() {
            timeline.push(TimelineEventDto {
                id: format!("tl_sub_{}", app_id),
                status: "applied".to_string(),
                timestamp: submitted_at.clone().unwrap_or_else(|| r.get("updated_at")),
                title: "Application Submitted Successfully".to_string(),
                note: r.get("confirmation_text"),
            });
        }

        let missing_json: String = r.try_get("missing_required_fields_json").unwrap_or_else(|_| "[]".to_string());
        let missing_required_fields: Vec<String> = serde_json::from_str(&missing_json).unwrap_or_default();

        result.push(ApplicationRecordDto {
            id: app_id,
            job_id: r.get("job_id"),
            job_title: r.get("job_title"),
            company: r.get("company"),
            location: r.get("location"),
            apply_url: r.get("apply_url"),
            ats_type: r.get("ats_type"),
            mode: r.get("mode"),
            status,
            match_score: r.try_get::<Option<f64>, _>("match_score").ok().flatten(),
            profile_id: r.get("profile_id"),
            tailored_resume_path: None,
            cover_letter_text: None,
            notes: r.get("confirmation_text"),
            interview_date: None,
            submitted_at,
            screenshot_before_submit,
            screenshot_confirmation: r.get("screenshot_path"),
            stop_reason: r.try_get("stop_reason").ok().flatten(),
            stop_message: r.try_get("stop_message").ok().flatten(),
            missing_required_fields,
            submit_attempt_id: r.try_get("submit_attempt_id").ok().flatten(),
            filled_fields: Vec::new(),
            review_checklist,
            timeline,
            created_at: r.get("created_at"),
            updated_at: r.get("updated_at"),
        });
    }

    Ok(result)
}

pub async fn get_application_by_id(pool: &DbPool, id: &str) -> Result<Option<ApplicationRecordDto>, sqlx::Error> {
    let apps = get_all_applications(pool).await?;
    Ok(apps.into_iter().find(|a| a.id == id))
}

pub async fn create_or_update_application(pool: &DbPool, app: &ApplicationRecordDto) -> Result<(), sqlx::Error> {
    let missing_json = serde_json::to_string(&app.missing_required_fields).unwrap_or_else(|_| "[]".to_string());
    sqlx::query(
        r#"
        INSERT INTO applications (id, job_id, profile_id, status, mode, submitted_at, confirmation_text, screenshot_path, stop_reason, stop_message, missing_required_fields_json, submit_attempt_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            mode = excluded.mode,
            submitted_at = excluded.submitted_at,
            confirmation_text = excluded.confirmation_text,
            screenshot_path = excluded.screenshot_path,
            stop_reason = excluded.stop_reason,
            stop_message = excluded.stop_message,
            missing_required_fields_json = excluded.missing_required_fields_json,
            submit_attempt_id = excluded.submit_attempt_id,
            updated_at = excluded.updated_at
        "#
    )
    .bind(&app.id)
    .bind(&app.job_id)
    .bind(&app.profile_id)
    .bind(&app.status)
    .bind(&app.mode)
    .bind(&app.submitted_at)
    .bind(&app.notes)
    .bind(&app.screenshot_confirmation)
    .bind(&app.stop_reason)
    .bind(&app.stop_message)
    .bind(missing_json)
    .bind(&app.submit_attempt_id)
    .bind(&app.created_at)
    .bind(&app.updated_at)
    .execute(pool)
    .await?;

    Ok(())
}

pub async fn update_application_review_outcome(
    pool: &DbPool,
    id: &str,
    status: &str,
    stop_reason: Option<&str>,
    stop_message: Option<&str>,
    missing_required_fields_json: &str,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE applications SET status = ?, stop_reason = ?, stop_message = ?, missing_required_fields_json = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(status)
    .bind(stop_reason)
    .bind(stop_message)
    .bind(missing_required_fields_json)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn set_submit_attempt_id(pool: &DbPool, id: &str, attempt_id: &str) -> Result<(), sqlx::Error> {
    sqlx::query("UPDATE applications SET submit_attempt_id = ? WHERE id = ?")
        .bind(attempt_id)
        .bind(id)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn update_application_status(pool: &DbPool, id: &str, status: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(status)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_application_notes(pool: &DbPool, id: &str, notes: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        "UPDATE applications SET confirmation_text = ?, updated_at = datetime('now') WHERE id = ?"
    )
    .bind(notes)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn record_application_step(
    pool: &DbPool,
    id: &str,
    app_id: &str,
    step_name: &str,
    status: &str,
    checklist_json: &str,
    screenshot_path: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO application_steps (id, application_id, step_name, status, checklist_json, screenshot_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        "#
    )
    .bind(id)
    .bind(app_id)
    .bind(step_name)
    .bind(status)
    .bind(checklist_json)
    .bind(screenshot_path)
    .execute(pool)
    .await?;

    Ok(())
}

// -----------------------------------------------------------------------------
// Tasks (Persistent Job Queue)
// -----------------------------------------------------------------------------

pub async fn create_task(pool: &DbPool, id: &str, task_type: &str, payload_json: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO tasks (id, task_type, status, payload_json, created_at, updated_at)
        VALUES (?, ?, 'queued', ?, datetime('now'), datetime('now'))
        "#
    )
    .bind(id)
    .bind(task_type)
    .bind(payload_json)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn update_task_status(
    pool: &DbPool,
    id: &str,
    status: &str,
    result_json: Option<&str>,
    error_text: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        UPDATE tasks
        SET status = ?, result_json = ?, error_text = ?, updated_at = datetime('now')
        WHERE id = ?
        "#
    )
    .bind(status)
    .bind(result_json)
    .bind(error_text)
    .bind(id)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn get_task(pool: &DbPool, id: &str) -> Result<Option<TaskDto>, sqlx::Error> {
    let row_opt = sqlx::query(
        "SELECT id, task_type, status, payload_json, result_json, error_text, created_at, updated_at FROM tasks WHERE id = ?"
    )
    .bind(id)
    .fetch_optional(pool)
    .await?;

    Ok(row_opt.map(|r| TaskDto {
        id: r.get("id"),
        task_type: r.get("task_type"),
        status: r.get("status"),
        payload_json: r.get("payload_json"),
        result_json: r.get("result_json"),
        error_text: r.get("error_text"),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }))
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

pub async fn get_all_settings(pool: &DbPool) -> Result<HashMap<String, String>, sqlx::Error> {
    let rows = sqlx::query("SELECT key, value_json FROM settings").fetch_all(pool).await?;
    let mut map = HashMap::new();
    for r in rows {
        let k: String = r.get("key");
        let v: String = r.get("value_json");
        map.insert(k, v);
    }
    Ok(map)
}

pub async fn set_setting(pool: &DbPool, key: &str, value: &str) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO settings (key, value_json, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
        "#
    )
    .bind(key)
    .bind(value)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn wipe_all_data(pool: &DbPool) -> Result<i64, sqlx::Error> {
    let mut tx = pool.begin().await?;
    let mut total_deleted: i64 = 0;

    for sql in [
        "DELETE FROM applications",
        "DELETE FROM application_steps",
        "DELETE FROM matches",
        "DELETE FROM jobs",
        "DELETE FROM experiences",
        "DELETE FROM skills",
        "DELETE FROM source_files",
        "DELETE FROM profiles",
        "DELETE FROM tasks",
        "DELETE FROM embedding_vectors",
    ] {
        let res = sqlx::query(sql).execute(&mut *tx).await?;
        total_deleted += res.rows_affected() as i64;
    }

    let settings_res = sqlx::query(
        "DELETE FROM settings WHERE key NOT IN ('language', 'ui_language', 'ui.language')",
    )
    .execute(&mut *tx)
    .await?;
    total_deleted += settings_res.rows_affected() as i64;

    tx.commit().await?;
    Ok(total_deleted)
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    #[tokio::test]
    async fn test_get_all_applications_without_match_row_does_not_panic() {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();

        sqlx::query(
            "INSERT INTO profiles (id, version, full_name, email, phone, location, summary, created_at, updated_at) VALUES ('p1', 1, 'Test User', 'test@example.com', '', '', '', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO jobs (id, source_id, canonical_url, apply_url, title, company, remote_type, employment_type, description_markdown, requirements_json, ats_type, content_hash, sim_hash, first_seen, last_seen, status) VALUES ('j1', 'src1', 'https://example.com', 'https://example.com', 'Engineer', 'Acme', 'remote', 'full-time', 'desc', '[]', 'greenhouse', 'h1', 's1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z', 'active')"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO applications (id, job_id, profile_id, status, mode, created_at, updated_at) VALUES ('a1', 'j1', 'p1', 'saved', 'review', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')"
        )
        .execute(&pool)
        .await
        .unwrap();

        let apps = get_all_applications(&pool).await.unwrap();
        assert_eq!(apps.len(), 1);
        assert_eq!(apps[0].id, "a1");
        assert_eq!(apps[0].match_score, None);
    }
}
