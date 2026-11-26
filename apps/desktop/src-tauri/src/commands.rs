use crate::application_fsm;
use crate::db;
use crate::models::*;
use crate::state::AppState;
use crate::SystemStatus;
use base64::Engine as _;
use serde_json::json;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

const MAX_RESUME_BYTES: u64 = 25 * 1024 * 1024; // 25 MB

// -----------------------------------------------------------------------------
// System
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn get_system_status(app: tauri::AppHandle) -> Result<SystemStatus, String> {
    Ok(SystemStatus {
        app_version: app.package_info().version.to_string(),
        os: std::env::consts::OS.to_string(),
        is_ready: true,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn app_restart(app: tauri::AppHandle) -> Result<(), String> {
    app.restart();
}

// -----------------------------------------------------------------------------
// Profiles
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn profile_get(state: State<'_, AppState>) -> Result<Option<UserProfileDto>, String> {
    db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("Database error fetching profile: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn profile_save(state: State<'_, AppState>, profile: UserProfileDto) -> Result<(), String> {
    db::save_profile(&state.pool, &profile)
        .await
        .map_err(|e| format!("Database error saving profile: {}", e))
}

fn verify_magic_bytes(ext: &str, bytes: &[u8]) -> Result<(), String> {
    match ext {
        "pdf" => {
            if !bytes.starts_with(b"%PDF-") {
                return Err("File extension is .pdf but magic bytes do not match %PDF-".to_string());
            }
        }
        "docx" | "odt" => {
            if !bytes.starts_with(&[0x50, 0x4B, 0x03, 0x04]) {
                return Err(format!("File extension is .{} but magic bytes do not match ZIP (PK)", ext));
            }
        }
        "doc" => {
            let is_ole = bytes.starts_with(&[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
            let is_text = std::str::from_utf8(bytes).is_ok();
            if !is_ole && !is_text {
                return Err("File extension is .doc but content is neither OLE2 nor valid text".to_string());
            }
        }
        "rtf" => {
            if !bytes.starts_with(b"{\\rtf") {
                return Err("File extension is .rtf but magic bytes do not match {\\rtf".to_string());
            }
        }
        "png" => {
            if !bytes.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
                return Err("File extension is .png but magic bytes do not match PNG".to_string());
            }
        }
        "jpg" | "jpeg" => {
            if !bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
                return Err("File extension is .jpg/.jpeg but magic bytes do not match JPEG".to_string());
            }
        }
        "webp" => {
            if bytes.len() < 12 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
                return Err("File extension is .webp but magic bytes do not match RIFF/WEBP".to_string());
            }
        }
        "txt" | "md" => {
            if bytes.contains(&0) || std::str::from_utf8(bytes).is_err() {
                return Err(format!("File extension is .{} but content is not valid UTF-8 text", ext));
            }
        }
        _ => {
            return Err(format!("Unsupported file extension: .{}", ext));
        }
    }
    Ok(())
}

pub fn stage_resume_source_file(
    app_data_dir: &std::path::Path,
    source_path: &std::path::Path,
) -> Result<(std::path::PathBuf, String, i64, &'static str), String> {
    let ext = source_path
        .extension()
        .and_then(|e| e.to_str())
        .map(|s| s.to_ascii_lowercase())
        .ok_or_else(|| "Selected file must have a valid extension".to_string())?;

    let metadata = std::fs::metadata(source_path)
        .map_err(|e| format!("Failed to inspect selected file: {}", e))?;
    if !metadata.is_file() {
        return Err("Selected path is not a regular file".to_string());
    }
    if metadata.len() == 0 {
        return Err("Selected file is empty".to_string());
    }
    if metadata.len() > MAX_RESUME_BYTES {
        return Err(format!(
            "File exceeds 25 MB limit ({} bytes)",
            metadata.len()
        ));
    }

    let bytes = std::fs::read(source_path)
        .map_err(|e| format!("Failed to read selected file: {}", e))?;
    verify_magic_bytes(&ext, &bytes)?;

    let sha_hex = hex::encode(Sha256::digest(&bytes));
    let sources_dir = app_data_dir.join("sources");
    std::fs::create_dir_all(&sources_dir)
        .map_err(|e| format!("Failed to create sources directory: {}", e))?;

    let staged_path = sources_dir.join(format!("{}.{}", sha_hex, ext));
    std::fs::write(&staged_path, &bytes)
        .map_err(|e| format!("Failed to stage resume into sources/: {}", e))?;

    let mime_type = detect_mime_from_ext(&staged_path);
    Ok((staged_path, sha_hex, bytes.len() as i64, mime_type))
}

#[tauri::command]
#[specta::specta]
pub async fn profile_import_resume(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<ProfileExtractionResultDto>, String> {
    let app_clone = app.clone();
    let picked = tokio::task::spawn_blocking(move || {
        app_clone
            .dialog()
            .file()
            .add_filter(
                "Resume & Scanned Documents",
                &["pdf", "docx", "doc", "odt", "rtf", "txt", "md", "png", "jpg", "jpeg", "webp"],
            )
            .blocking_pick_file()
    })
    .await
    .map_err(|e| format!("Dialog task failed: {}", e))?;

    let Some(file_path) = picked else {
        return Ok(None);
    };
    let source_path = file_path
        .into_path()
        .map_err(|e| format!("Selected file path is not a local filesystem path: {}", e))?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve appDataDir: {}", e))?;
    let original_name = source_path
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "resume.pdf".to_string());

    let (staged_path, sha_hex, file_size, mime_type) =
        stage_resume_source_file(&app_data_dir, &source_path)?;
    let staged_str = staged_path.to_string_lossy().to_string();

    let res = state
        .engine
        .request("profile.parseAndExtract", json!({ "filePath": staged_str }))
        .await?;

    let mut extraction: ProfileExtractionResultDto = serde_json::from_value(res)
        .map_err(|e| format!("Failed to parse profile extraction response: {}", e))?;

    // Preserve existing user profile by merging & bumping version rather than silent overwrite
    if let Ok(Some(existing)) = db::get_profile(&state.pool).await {
        if let Ok(merged_val) = state
            .engine
            .request(
                "profile.merge",
                json!({ "profiles": [existing.clone(), extraction.profile.clone()] }),
            )
            .await
        {
            if let Ok(mut merged) = serde_json::from_value::<UserProfileDto>(merged_val) {
                merged.id = existing.id.clone();
                merged.version = existing.version + 1;
                merged.updated_at = chrono_lite_iso();
                extraction.profile = merged;
            }
        }
    }

    db::save_profile(&state.pool, &extraction.profile)
        .await
        .map_err(|e| format!("Database error saving extracted profile: {}", e))?;

    db::save_source_file(
        &state.pool,
        &extraction.source_file_id,
        &extraction.profile.id,
        &staged_str,
        &original_name,
        file_size,
        mime_type,
        &sha_hex,
        extraction.pages_count,
        false,
    )
    .await
    .map_err(|e| format!("Database error saving source file: {}", e))?;

    Ok(Some(extraction))
}

fn detect_mime_from_ext(path: &std::path::Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).map(|s| s.to_ascii_lowercase()).as_deref() {
        Some("pdf") => "application/pdf",
        Some("docx") => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        Some("doc") => "application/msword",
        Some("odt") => "application/vnd.oasis.opendocument.text",
        Some("rtf") => "application/rtf",
        Some("txt") => "text/plain",
        Some("md") => "text/markdown",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        _ => "application/octet-stream",
    }
}

fn save_screenshot_to_disk(
    app_handle: &tauri::AppHandle,
    app_id: &str,
    label: &str,
    raw_or_path: Option<String>,
) -> Option<String> {
    let val = raw_or_path?;
    if !val.starts_with("data:image/") {
        return Some(val);
    }
    let Some((_, b64)) = val.split_once(";base64,") else {
        return Some(val);
    };
    let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64) else {
        return Some(val);
    };
    let Ok(app_data) = app_handle.path().app_data_dir() else {
        return Some(val);
    };
    let dir = app_data.join("screenshots").join(app_id);
    if std::fs::create_dir_all(&dir).is_err() {
        return Some(val);
    }
    let file_path = dir.join(format!("{}.jpg", label));
    if std::fs::write(&file_path, &bytes).is_ok() {
        Some(file_path.to_string_lossy().to_string())
    } else {
        Some(val)
    }
}

#[tauri::command]
#[specta::specta]
pub async fn profile_clear(state: State<'_, AppState>) -> Result<(), String> {
    db::clear_profile(&state.pool)
        .await
        .map_err(|e| format!("Database error clearing profile: {}", e))
}

// -----------------------------------------------------------------------------
// Jobs
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn jobs_search(
    state: State<'_, AppState>,
    query: JobsSearchQueryDto,
) -> Result<Vec<JobPostingDto>, String> {
    let params = serde_json::to_value(&query).unwrap_or(json!({}));
    let res = state.engine.request("jobs.search", params).await?;

    let jobs: Vec<JobPostingDto> = serde_json::from_value(res)
        .map_err(|e| format!("Failed to parse jobs search response: {}", e))?;

    // Persist discovered jobs into SQLite
    let _ = db::save_jobs_batch(&state.pool, &jobs).await;

    // Return current stored jobs
    let mut stored = db::get_jobs(
        &state.pool,
        query.ats_type.as_deref(),
        query.remote_only.map(|r| if r { "remote" } else { "all" }),
        query.company.as_deref(),
        query.limit.unwrap_or(50) as i64,
    )
    .await
    .map_err(|e| format!("Database error querying jobs: {}", e))?;

    // Score and rank against candidate profile so only CV-relevant jobs surface
    if let Ok(Some(profile)) = db::get_profile(&state.pool).await {
        if !stored.is_empty() {
            if let Ok(rank_res) = state
                .engine
                .request(
                    "matching.rankAllJobs",
                    json!({ "profile": profile, "jobs": stored }),
                )
                .await
            {
                if let Ok(matches) = serde_json::from_value::<Vec<MatchResultDto>>(rank_res) {
                    for m in &matches {
                        let _ = db::save_match(&state.pool, m).await;
                    }
                    if let Ok(ranked_jobs) = db::get_jobs(
                        &state.pool,
                        query.ats_type.as_deref(),
                        query.remote_only.map(|r| if r { "remote" } else { "all" }),
                        query.company.as_deref(),
                        query.limit.unwrap_or(50) as i64,
                    )
                    .await
                    {
                        stored = ranked_jobs;
                    }
                }
            }
        }

        // Filter to CV-matched jobs when keywords or skills are present
        let kw_terms: Vec<String> = profile
            .skills
            .iter()
            .map(|s| s.name.to_lowercase())
            .chain(profile.target_titles.iter().map(|t| t.to_lowercase()))
            .collect();

        if !kw_terms.is_empty() {
            let filtered: Vec<JobPostingDto> = stored
                .iter()
                .filter(|j| {
                    let score_ok = j.match_score.unwrap_or(0.0) >= 35.0;
                    let hay = format!(
                        "{} {} {}",
                        j.title.to_lowercase(),
                        j.description_markdown.to_lowercase(),
                        j.requirements.join(" ").to_lowercase()
                    );
                    let kw_ok = kw_terms.iter().any(|k| !k.is_empty() && hay.contains(k));
                    score_ok || kw_ok
                })
                .cloned()
                .collect();
            if !filtered.is_empty() {
                stored = filtered;
            }
        }
    }

    Ok(stored)
}

#[tauri::command]
#[specta::specta]
pub async fn jobs_get_all(
    state: State<'_, AppState>,
    ats_type: Option<String>,
    remote_type: Option<String>,
    search: Option<String>,
    limit: Option<u32>,
) -> Result<Vec<JobPostingDto>, String> {
    db::get_jobs(
        &state.pool,
        ats_type.as_deref(),
        remote_type.as_deref(),
        search.as_deref(),
        limit.unwrap_or(50) as i64,
    )
    .await
    .map_err(|e| format!("Database error fetching jobs: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn jobs_get(state: State<'_, AppState>, id: String) -> Result<Option<JobPostingDto>, String> {
    db::get_job_by_id(&state.pool, &id)
        .await
        .map_err(|e| format!("Database error fetching job: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn jobs_search_fts(
    state: State<'_, AppState>,
    query: String,
    limit: Option<u32>,
) -> Result<Vec<JobPostingDto>, String> {
    db::search_jobs_fts(&state.pool, &query, limit.unwrap_or(50) as i64)
        .await
        .map_err(|e| format!("FTS search error: {}", e))
}

// -----------------------------------------------------------------------------
// Company Directory
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn directory_list(
    state: State<'_, AppState>,
    ats_type: Option<String>,
    country: Option<String>,
    remote_policy: Option<String>,
    search: Option<String>,
    is_followed: Option<bool>,
    limit: Option<u32>,
) -> Result<Vec<CompanyBoardDto>, String> {
    db::get_company_directory(
        &state.pool,
        ats_type.as_deref(),
        country.as_deref(),
        remote_policy.as_deref(),
        search.as_deref(),
        is_followed,
        limit.unwrap_or(100) as i64,
    )
    .await
    .map_err(|e| format!("Directory listing error: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn directory_toggle_follow(
    state: State<'_, AppState>,
    board_id: String,
    is_followed: bool,
) -> Result<(), String> {
    db::toggle_company_follow(&state.pool, &board_id, is_followed)
        .await
        .map_err(|e| format!("Error toggling company follow: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn directory_upsert(
    state: State<'_, AppState>,
    company: CompanyBoardDto,
) -> Result<(), String> {
    db::upsert_company_board(&state.pool, &company)
        .await
        .map_err(|e| format!("Error upserting company board: {}", e))
}

// -----------------------------------------------------------------------------
// Matching
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn matching_score_job(
    state: State<'_, AppState>,
    job_id: String,
) -> Result<MatchResultDto, String> {
    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "No candidate profile found. Please upload a résumé first.".to_string())?;

    let job = db::get_job_by_id(&state.pool, &job_id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| format!("Job '{}' not found", job_id))?;

    let params = json!({
        "profile": profile,
        "job": job
    });

    let res = state.engine.request("matching.scoreJob", params).await?;

    let match_result: MatchResultDto = serde_json::from_value(res)
        .map_err(|e| format!("Failed to parse match result: {}", e))?;

    // Persist match in database
    db::save_match(&state.pool, &match_result)
        .await
        .map_err(|e| format!("Database error saving match: {}", e))?;

    Ok(match_result)
}

#[tauri::command]
#[specta::specta]
pub async fn matching_rank_all(state: State<'_, AppState>) -> Result<Vec<MatchResultDto>, String> {
    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "No candidate profile found. Please upload a résumé first.".to_string())?;

    let jobs = db::get_jobs(&state.pool, None, None, None, 100)
        .await
        .map_err(|e| format!("DB error: {}", e))?;

    let params = json!({
        "profile": profile,
        "jobs": jobs
    });

    let res = state.engine.request("matching.rankAllJobs", params).await?;

    let ranked: Vec<MatchResultDto> = serde_json::from_value(res)
        .map_err(|e| format!("Failed to parse ranked matches: {}", e))?;

    for m in &ranked {
        let _ = db::save_match(&state.pool, m).await;
    }

    Ok(ranked)
}

#[tauri::command]
#[specta::specta]
pub async fn matching_record_feedback(
    state: State<'_, AppState>,
    job_id: String,
    feedback: String,
) -> Result<(), String> {
    if feedback != "relevant" && feedback != "irrelevant" {
        return Err(format!("Invalid feedback '{}': must be 'relevant' or 'irrelevant'", feedback));
    }

    db::save_feedback(&state.pool, &job_id, &feedback)
        .await
        .map_err(|e| format!("DB error: {}", e))?;

    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error fetching profile: {}", e))?
        .ok_or_else(|| "No candidate profile found for feedback.".to_string())?;

    state
        .engine
        .request(
            "matching.recordFeedback",
            json!({ "profileId": profile.id, "jobId": job_id, "feedback": feedback }),
        )
        .await?;

    Ok(())
}

// -----------------------------------------------------------------------------
// Documents
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn documents_tailor(
    state: State<'_, AppState>,
    job_id: String,
    template_id: String,
    lang: String,
) -> Result<TailoredDocumentResultDto, String> {
    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "No candidate profile found. Please upload a résumé first.".to_string())?;

    let job = db::get_job_by_id(&state.pool, &job_id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| format!("Job '{}' not found", job_id))?;

    let params = json!({
        "profile": profile,
        "job": job,
        "templateId": template_id,
        "language": lang
    });

    let res = state.engine.request("documents.tailor", params).await?;

    let result: TailoredDocumentResultDto = serde_json::from_value(res)
        .map_err(|e| format!("Failed to parse tailored document response: {}", e))?;

    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn documents_export_pdf(
    state: State<'_, AppState>,
    html: String,
    filename: String,
) -> Result<String, String> {
    let res = state
        .engine
        .request("documents.exportPdf", json!({ "html": html, "filename": filename }))
        .await?;

    let path = res
        .get("filePath")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing filePath in exportPdf response".to_string())?;

    Ok(path.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn documents_export_docx(
    state: State<'_, AppState>,
    content_json: String,
    filename: String,
) -> Result<String, String> {
    let res = state
        .engine
        .request(
            "documents.exportDocx",
            json!({ "contentJson": content_json, "filename": filename }),
        )
        .await?;

    let path = res
        .get("filePath")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing filePath in exportDocx response".to_string())?;

    Ok(path.to_string())
}

// -----------------------------------------------------------------------------
// Applications
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn applications_get_all(state: State<'_, AppState>) -> Result<Vec<ApplicationRecordDto>, String> {
    db::get_all_applications(&state.pool)
        .await
        .map_err(|e| format!("Database error fetching applications: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn applications_get(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<ApplicationRecordDto>, String> {
    db::get_application_by_id(&state.pool, &id)
        .await
        .map_err(|e| format!("Database error fetching application: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn applications_create(
    state: State<'_, AppState>,
    job_id: String,
    mode: String,
    resume_path: Option<String>,
    cover_letter: Option<String>,
) -> Result<ApplicationRecordDto, String> {
    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "No candidate profile found. Please upload a résumé first.".to_string())?;

    let job = db::get_job_by_id(&state.pool, &job_id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| format!("Job '{}' not found", job_id))?;

    let app_id = format!("app_{}_{}", job.id, uuid::Uuid::new_v4().simple());
    let now = chrono_lite_iso();

    let app_record = ApplicationRecordDto {
        id: app_id,
        job_id: job.id,
        job_title: job.title,
        company: job.company,
        location: job.location,
        apply_url: job.apply_url,
        ats_type: job.ats_type,
        mode,
        status: "saved".to_string(),
        match_score: job.match_score,
        profile_id: profile.id,
        tailored_resume_path: resume_path,
        cover_letter_text: cover_letter,
        notes: None,
        interview_date: None,
        submitted_at: None,
        screenshot_before_submit: None,
        screenshot_confirmation: None,
        stop_reason: None,
        stop_message: None,
        missing_required_fields: Vec::new(),
        submit_attempt_id: None,
        filled_fields: Vec::new(),
        review_checklist: Vec::new(),
        timeline: vec![TimelineEventDto {
            id: format!("tl_init_{}", uuid::Uuid::new_v4().simple()),
            status: "saved".to_string(),
            timestamp: now.clone(),
            title: "Application Created".to_string(),
            note: None,
        }],
        created_at: now.clone(),
        updated_at: now,
    };

    db::create_or_update_application(&state.pool, &app_record)
        .await
        .map_err(|e| format!("Database error creating application: {}", e))?;

    Ok(app_record)
}

#[tauri::command]
#[specta::specta]
pub async fn applications_update_status(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<(), String> {
    let event = application_fsm::user_event_from_status(&status)?;
    application_fsm::transition_application(&state.pool, &id, event, Some(&app_handle)).await?;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn applications_update_notes(
    state: State<'_, AppState>,
    id: String,
    notes: String,
) -> Result<(), String> {
    db::update_application_notes(&state.pool, &id, &notes)
        .await
        .map_err(|e| format!("Database error updating notes: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn pipeline_start_discovery(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<JobPostingDto>, String> {
    let task_id = format!("task_disc_{}", uuid::Uuid::new_v4().simple());
    let _ = db::create_task(&state.pool, &task_id, "discover", "{}").await;
    let _ = app_handle.emit(
        "task:progress",
        json!({ "taskId": task_id, "stage": "discover", "pct": 10, "message": "Searching boards..." }),
    );

    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "No candidate profile found.".to_string())?;

    let keywords: Vec<String> = profile.skills.iter().map(|s| s.name.clone()).take(6).collect();
    let jobs = jobs_search(
        state.clone(),
        JobsSearchQueryDto {
            keywords: if keywords.is_empty() { None } else { Some(keywords) },
            locations: None,
            remote_only: None,
            company: None,
            ats_type: None,
            limit: Some(30),
        },
    )
    .await?;

    let _ = db::update_task_status(&state.pool, &task_id, "done", None, None).await;
    let _ = app_handle.emit(
        "task:progress",
        json!({ "taskId": task_id, "stage": "discover", "pct": 100, "message": "Discovery complete" }),
    );
    Ok(jobs)
}

#[tauri::command]
#[specta::specta]
pub async fn applications_prepare(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    job_ids: Vec<String>,
) -> Result<Vec<ApplicationRecordDto>, String> {
    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "No candidate profile found.".to_string())?;

    let mut prepared = Vec::new();
    let total = job_ids.len().max(1);

    for (idx, job_id) in job_ids.iter().enumerate() {
        let task_id = format!("task_prep_{}", uuid::Uuid::new_v4().simple());
        let _ = db::create_task(&state.pool, &task_id, "tailor", &json!({ "jobId": job_id }).to_string()).await;
        let pct = ((idx + 1) * 100) / total;
        let _ = app_handle.emit(
            "task:progress",
            json!({ "taskId": task_id, "appId": job_id, "stage": "tailor", "pct": pct, "message": "Tailoring documents..." }),
        );

        let mut cover_letter: Option<String> = None;
        let mut resume_path: Option<String> = None;
        if let Ok(job_opt) = db::get_job_by_id(&state.pool, job_id).await {
            if let Some(job) = job_opt {
                if let Ok(tailor_res) = state
                    .engine
                    .request(
                        "documents.tailor",
                        json!({ "profile": profile, "job": job, "templateId": "ats-clean", "language": "en" }),
                    )
                    .await
                {
                    cover_letter = tailor_res
                        .get("coverLetterText")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    if let Some(html) = tailor_res.get("resumeHtml").and_then(|v| v.as_str()) {
                        if let Ok(pdf_val) = state
                            .engine
                            .request(
                                "documents.exportPdf",
                                json!({ "html": html, "filename": format!("tailored_{}.pdf", job_id) }),
                            )
                            .await
                        {
                            resume_path = pdf_val.as_str().map(|s| s.to_string());
                        }
                    }
                }
            }
        }

        let created = applications_create(
            state.clone(),
            job_id.clone(),
            "review".to_string(),
            resume_path,
            cover_letter,
        )
        .await?;
        let _ = application_fsm::transition_application(
            &state.pool,
            &created.id,
            application_fsm::AppTransitionEvent::PrepareKit,
            Some(&app_handle),
        )
        .await;
        let _ = db::update_task_status(&state.pool, &task_id, "done", None, None).await;
        prepared.push(created);
    }

    Ok(prepared)
}

#[tauri::command]
#[specta::specta]
pub async fn applications_fill(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    app_ids: Vec<String>,
) -> Result<Vec<ApplicationRecordDto>, String> {
    let mut results = Vec::new();
    let total = app_ids.len().max(1);
    for (idx, app_id) in app_ids.iter().enumerate() {
        let pct = ((idx + 1) * 100) / total;
        let _ = app_handle.emit(
            "task:progress",
            json!({ "taskId": app_id, "appId": app_id, "stage": "fill", "pct": pct, "message": "Filling form in Review Mode..." }),
        );
        let updated = applications_execute_review(app_handle.clone(), state.clone(), app_id.clone()).await?;
        results.push(updated);
    }
    Ok(results)
}

#[tauri::command]
#[specta::specta]
pub async fn applications_execute_review(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<ApplicationRecordDto, String> {
    let app = db::get_application_by_id(&state.pool, &id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| format!("Application '{}' not found", id))?;

    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "Profile not found".to_string())?;

    let job = db::get_job_by_id(&state.pool, &app.job_id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "Job not found".to_string())?;

    // Create a task record in SQLite
    let task_id = format!("task_review_{}", uuid::Uuid::new_v4().simple());
    let _ = db::create_task(
        &state.pool,
        &task_id,
        "application_review",
        &serde_json::to_string(&app).unwrap_or_default(),
    )
    .await;

    let window_bounds = app_handle.get_webview_window("main").and_then(|win| {
        let pos = win.outer_position().ok()?;
        let size = win.outer_size().ok()?;
        Some(json!({
            "x": pos.x + size.width as i32 + 12,
            "y": pos.y,
            "width": 820,
            "height": size.height.max(700)
        }))
    });

    // Call engine sidecar RPC application.execute (which runs Playwright in Review mode)
    let mut params = json!({
        "id": app.id,
        "job": job,
        "profile": profile,
        "mode": "review",
        "resumePath": app.tailored_resume_path
    });
    if let Some(bounds) = window_bounds {
        params["windowBounds"] = bounds;
    }

    let res = match state.engine.request("application.execute", params).await {
        Ok(v) => v,
        Err(e) => {
            let _ = db::update_task_status(&state.pool, &task_id, "failed", None, Some(&e)).await;
            return Err(e);
        }
    };

    let _ = db::update_task_status(
        &state.pool,
        &task_id,
        "done",
        Some(&serde_json::to_string(&res).unwrap_or_default()),
        None,
    )
    .await;

    let raw_screenshot: Option<String> = res
        .get("screenshotBeforeSubmit")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let screenshot = save_screenshot_to_disk(&app_handle, &app.id, "before_submit", raw_screenshot);

    let checklist_val = res.get("reviewChecklist").cloned().unwrap_or(json!([]));
    let checklist_json = serde_json::to_string(&checklist_val).unwrap_or_else(|_| "[]".to_string());

    let mapped_status = map_execute_status(&res);
    let stop_reason = res
        .get("stopReason")
        .and_then(|v| v.as_str())
        .filter(|s| *s != "none");
    let stop_message = res.get("stopMessage").and_then(|v| v.as_str());
    let missing_fields_val = res.get("missingRequiredFields").cloned().unwrap_or(json!([]));
    let missing_fields_json =
        serde_json::to_string(&missing_fields_val).unwrap_or_else(|_| "[]".to_string());

    let step_id = format!("step_{}", uuid::Uuid::new_v4().simple());
    db::record_application_step(
        &state.pool,
        &step_id,
        &app.id,
        "review_ready",
        mapped_status,
        &checklist_json,
        screenshot.as_deref(),
    )
    .await
    .map_err(|e| format!("DB error recording step: {}", e))?;

    db::update_application_review_outcome(
        &state.pool,
        &app.id,
        mapped_status,
        stop_reason,
        stop_message,
        &missing_fields_json,
    )
    .await
    .map_err(|e| format!("DB error updating application review outcome: {}", e))?;

    let updated = db::get_application_by_id(&state.pool, &app.id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "Failed to reload updated application".to_string())?;

    Ok(updated)
}

pub(crate) fn map_execute_status(res: &serde_json::Value) -> &'static str {
    match res.get("status").and_then(|v| v.as_str()) {
        Some("needs_review") => "needs_review",
        Some("needs_user") => "needs_user",
        Some("submitted") => "submitted_unverified",
        _ => "failed",
    }
}

pub(crate) fn map_submit_outcome(res: &serde_json::Value) -> Result<(&'static str, Option<String>), String> {
    if res.get("refilled").and_then(|v| v.as_bool()) == Some(true)
        || res.get("status").and_then(|v| v.as_str()) == Some("needs_review")
    {
        return Err("Form session expired and was refilled; please review the updated form before submitting.".to_string());
    }

    match res.get("status").and_then(|v| v.as_str()) {
        Some("submitted") | Some("applied") => {
            let screenshot = res
                .get("screenshotConfirmation")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            let has_confirmation = screenshot.as_deref().is_some_and(|s| !s.is_empty())
                || res
                    .get("confirmationText")
                    .and_then(|v| v.as_str())
                    .is_some_and(|s| !s.is_empty());
            if has_confirmation {
                Ok(("submitted_verified", screenshot))
            } else {
                Ok(("submitted_unverified", screenshot))
            }
        }
        other => {
            let msg = res
                .get("stopMessage")
                .and_then(|v| v.as_str())
                .unwrap_or("Submission did not succeed");
            Err(format!("Submission failed (engine status: {}): {}", other.unwrap_or("unknown"), msg))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn applications_resume(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<ApplicationRecordDto, String> {
    let profile = db::get_profile(&state.pool)
        .await
        .map_err(|e| format!("DB error: {}", e))?;

    let res = state
        .engine
        .request(
            "application.resume",
            json!({
                "id": id,
                "profile": profile,
            }),
        )
        .await?;

    let status = map_execute_status(&res);
    let stop_reason = res
        .get("stopReason")
        .and_then(|v| v.as_str())
        .unwrap_or("none");
    let stop_message = res.get("stopMessage").and_then(|v| v.as_str());
    let checklist_val = res.get("reviewChecklist").cloned().unwrap_or(json!([]));
    let checklist_json = serde_json::to_string(&checklist_val).unwrap_or_else(|_| "[]".to_string());
    let missing_fields_val = res.get("missingRequiredFields").cloned().unwrap_or(json!([]));
    let missing_fields_json =
        serde_json::to_string(&missing_fields_val).unwrap_or_else(|_| "[]".to_string());

    let screenshot_before = save_screenshot_to_disk(
        &app_handle,
        &id,
        "before",
        res.get("screenshotBeforeSubmit")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    );
    let step_id = format!("step_{}", uuid::Uuid::new_v4().simple());
    db::record_application_step(
        &state.pool,
        &step_id,
        &id,
        "resume_review",
        status,
        &checklist_json,
        screenshot_before.as_deref(),
    )
    .await
    .map_err(|e| format!("DB error recording step: {}", e))?;

    db::update_application_review_outcome(
        &state.pool,
        &id,
        status,
        if stop_reason == "none" { None } else { Some(stop_reason) },
        stop_message,
        &missing_fields_json,
    )
    .await
    .map_err(|e| format!("DB update error: {}", e))?;

    let updated = db::get_application_by_id(&state.pool, &id)
        .await
        .map_err(|e| format!("DB fetch error: {}", e))?
        .ok_or_else(|| format!("Application '{}' disappeared", id))?;
    let _ = app_handle.emit("app:application-updated", &updated);
    Ok(updated)
}

#[tauri::command]
#[specta::specta]
pub async fn applications_submit_reviewed(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<ApplicationRecordDto, String> {
    let mut app = db::get_application_by_id(&state.pool, &id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "Application not found".to_string())?;

    if app.status == "submitted_verified" || app.status == "submitted_unverified" || app.status == "applied" {
        return Err(format!("Application '{}' was already submitted ({}).", id, app.status));
    }
    if app.status != "needs_review" {
        return Err(format!("Cannot submit application '{}': status is '{}', expected 'needs_review'.", id, app.status));
    }
    if !app.missing_required_fields.is_empty() {
        return Err(format!(
            "Cannot submit application '{}': missing required fields: {}",
            id,
            app.missing_required_fields.join(", ")
        ));
    }

    let attempt_id = uuid::Uuid::new_v4().to_string();
    db::set_submit_attempt_id(&state.pool, &id, &attempt_id)
        .await
        .map_err(|e| format!("DB error persisting submit attempt id: {}", e))?;
    app.submit_attempt_id = Some(attempt_id.clone());

    let profile = db::get_profile(&state.pool).await.ok().flatten();
    let job = db::get_job_by_id(&state.pool, &app.job_id).await.ok().flatten();

    let res = state
        .engine
        .request(
            "application.submitReviewed",
            json!({
                "id": id,
                "submitAttemptId": attempt_id,
                "profile": profile,
                "job": job,
                "tailoredResumePath": app.tailored_resume_path,
                "coverLetterText": app.cover_letter_text,
            }),
        )
        .await?;

    let (new_status, raw_screenshot) = map_submit_outcome(&res)?;
    let screenshot = save_screenshot_to_disk(&app_handle, &app.id, "confirmation", raw_screenshot);

    app.status = new_status.to_string();
    app.submitted_at = Some(chrono_lite_iso());
    app.screenshot_confirmation = screenshot;
    app.updated_at = chrono_lite_iso();

    db::create_or_update_application(&state.pool, &app)
        .await
        .map_err(|e| format!("Database error updating application: {}", e))?;

    Ok(app)
}

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn settings_get_all(state: State<'_, AppState>) -> Result<HashMap<String, String>, String> {
    db::get_all_settings(&state.pool)
        .await
        .map_err(|e| format!("Database error fetching settings: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn settings_set(
    state: State<'_, AppState>,
    key: String,
    value: String,
) -> Result<(), String> {
    db::set_setting(&state.pool, &key, &value)
        .await
        .map_err(|e| format!("Database error saving setting: {}", e))
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type)]
#[serde(rename_all = "camelCase")]
pub struct WipeSummaryDto {
    pub db_rows_deleted: i64,
    pub browsers_closed: i64,
    pub folders_removed: Vec<String>,
    pub models_removed: bool,
}

#[tauri::command]
#[specta::specta]
pub async fn settings_wipe_all_data(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    include_models: Option<bool>,
) -> Result<WipeSummaryDto, String> {
    let browsers_closed = match state.engine.request("application.closeAll", json!({})).await {
        Ok(val) => val.get("closedCount").and_then(|v| v.as_i64()).unwrap_or(0),
        Err(_) => 0,
    };

    let db_rows_deleted = db::wipe_all_data(&state.pool)
        .await
        .map_err(|e| format!("Database error wiping data: {}", e))?;

    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve appDataDir: {}", e))?;

    let mut folders_removed = Vec::new();
    for folder in ["sources", "exports", "screenshots", "browser-sessions", "logs"] {
        let dir = app_data_dir.join(folder);
        if dir.exists() && std::fs::remove_dir_all(&dir).is_ok() {
            folders_removed.push(folder.to_string());
        }
    }

    let remove_models = include_models.unwrap_or(false);
    let mut models_removed = false;
    if remove_models {
        let models_dir = app_data_dir.join("models");
        if models_dir.exists() && std::fs::remove_dir_all(&models_dir).is_ok() {
            folders_removed.push("models".to_string());
            models_removed = true;
        }
    }

    Ok(WipeSummaryDto {
        db_rows_deleted,
        browsers_closed,
        folders_removed,
        models_removed,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn directory_check_update(
    state: State<'_, AppState>,
    current_version: String,
) -> Result<DirectoryUpdateCheckDto, String> {
    let res = state
        .engine
        .request("directory.checkUpdate", json!({ "currentVersion": current_version }))
        .await?;

    let has_update = res.get("hasUpdate").and_then(|v| v.as_bool()).unwrap_or(false);
    let new_manifest = res.get("newManifest");
    let latest_version = new_manifest
        .and_then(|m| m.get("version"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let sha256 = new_manifest
        .and_then(|m| m.get("sha256"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(DirectoryUpdateCheckDto {
        has_update,
        current_version,
        latest_version,
        sha256,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn models_get_status(state: State<'_, AppState>) -> Result<Vec<ModelStatusDto>, String> {
    let res = state
        .engine
        .request("models.getStatus", json!({}))
        .await?;

    serde_json::from_value(res).map_err(|e| format!("Failed to parse model status: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn models_detect_hardware(state: State<'_, AppState>) -> Result<AiHardwareReportDto, String> {
    let res = state
        .engine
        .request("models.detectHardware", json!({}))
        .await?;

    serde_json::from_value(res).map_err(|e| format!("Failed to parse hardware report: {}", e))
}

#[tauri::command]
#[specta::specta]
pub async fn models_download(
    state: State<'_, AppState>,
    model_id: String,
) -> Result<ModelStatusDto, String> {
    let res = state
        .engine
        .request("models.download", json!({ "modelId": model_id }))
        .await?;

    serde_json::from_value(res).map_err(|e| format!("Failed to parse model download response: {}", e))
}

fn chrono_lite_iso() -> String {
    time::OffsetDateTime::now_utc()
        .format(&time::format_description::well_known::Rfc3339)
        .unwrap_or_else(|_| "1970-01-01T00:00:00Z".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_execute_status_never_fabricates_needs_review() {
        assert_eq!(map_execute_status(&json!({ "status": "needs_review" })), "needs_review");
        assert_eq!(map_execute_status(&json!({ "status": "needs_user" })), "needs_user");
        assert_eq!(map_execute_status(&json!({ "status": "failed" })), "failed");
        assert_eq!(map_execute_status(&json!({})), "failed");
    }

    #[test]
    fn test_map_submit_outcome_separates_verified_unverified_and_refilled() {
        let verified = map_submit_outcome(&json!({
            "status": "submitted",
            "screenshotConfirmation": "data:image/jpeg;base64,abc"
        }));
        assert_eq!(verified.unwrap().0, "submitted_verified");

        let unverified = map_submit_outcome(&json!({
            "status": "submitted"
        }));
        assert_eq!(unverified.unwrap().0, "submitted_unverified");

        let refilled = map_submit_outcome(&json!({
            "status": "needs_review",
            "refilled": true
        }));
        assert!(refilled.is_err());

        let failed = map_submit_outcome(&json!({
            "status": "failed",
            "stopMessage": "Submit failed"
        }));
        assert!(failed.is_err());
    }

    #[test]
    fn test_chrono_lite_iso_is_rfc3339() {
        let ts = chrono_lite_iso();
        assert!(ts.contains('T') && ts.ends_with('Z'));
        assert!(ts.starts_with("20"));
    }

    #[test]
    fn test_stage_resume_source_file_validates_magic_bytes_and_stages() {
        let base = std::env::temp_dir().join(format!("kaarjoo_stage_test_{}", std::process::id()));
        let app_data = base.join("app_data");
        std::fs::create_dir_all(&base).unwrap();

        let fake_pdf = base.join("fake.pdf");
        std::fs::write(&fake_pdf, b"<html>not a pdf</html>").unwrap();
        assert!(stage_resume_source_file(&app_data, &fake_pdf).is_err());

        let valid_pdf = base.join("valid.pdf");
        std::fs::write(&valid_pdf, b"%PDF-1.7\n1 0 obj\n<<>>\nendobj\n").unwrap();
        let (staged, sha, size, mime) = stage_resume_source_file(&app_data, &valid_pdf).unwrap();
        assert!(staged.starts_with(app_data.join("sources")));
        assert!(staged.to_string_lossy().ends_with(&format!("{}.pdf", sha)));
        assert_eq!(mime, "application/pdf");
        assert!(size > 0);

        let _ = std::fs::remove_dir_all(&base);
    }
}
