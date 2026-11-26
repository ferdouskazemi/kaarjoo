use crate::db;
use crate::models::*;
use crate::state::AppState;
use crate::SystemStatus;
use serde_json::json;
use std::collections::HashMap;
use tauri::State;

// -----------------------------------------------------------------------------
// System
// -----------------------------------------------------------------------------

#[tauri::command]
#[specta::specta]
pub async fn get_system_status() -> Result<SystemStatus, String> {
    Ok(SystemStatus {
        app_version: "0.1.0".to_string(),
        os: std::env::consts::OS.to_string(),
        is_ready: true,
    })
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

#[tauri::command]
#[specta::specta]
pub async fn profile_parse_and_extract(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<ProfileExtractionResultDto, String> {
    let res = state
        .engine
        .request("profile.parseAndExtract", json!({ "filePath": file_path }))
        .await?;

    let extraction: ProfileExtractionResultDto = serde_json::from_value(res)
        .map_err(|e| format!("Failed to parse profile extraction response: {}", e))?;

    // Save profile to database
    db::save_profile(&state.pool, &extraction.profile)
        .await
        .map_err(|e| format!("Database error saving extracted profile: {}", e))?;

    // Record source file
    let path_obj = std::path::Path::new(&file_path);
    let file_name = path_obj
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "resume.pdf".to_string());
    let file_size = std::fs::metadata(&file_path)
        .map(|m| m.len() as i64)
        .unwrap_or(0);

    let _ = db::save_source_file(
        &state.pool,
        &extraction.source_file_id,
        &extraction.profile.id,
        &file_path,
        &file_name,
        file_size,
        "application/pdf",
        "sha256_placeholder",
        extraction.pages_count,
        false,
    )
    .await;

    Ok(extraction)
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
    db::save_feedback(&state.pool, &job_id, &feedback)
        .await
        .map_err(|e| format!("DB error: {}", e))?;

    let _ = state
        .engine
        .request(
            "matching.recordFeedback",
            json!({ "jobId": job_id, "feedback": feedback }),
        )
        .await;

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
        match_score: job.match_score.unwrap_or(85.0),
        profile_id: profile.id,
        tailored_resume_path: resume_path,
        cover_letter_text: cover_letter,
        notes: None,
        interview_date: None,
        submitted_at: None,
        screenshot_before_submit: None,
        screenshot_confirmation: None,
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
    state: State<'_, AppState>,
    id: String,
    status: String,
) -> Result<(), String> {
    db::update_application_status(&state.pool, &id, &status)
        .await
        .map_err(|e| format!("Database error updating status: {}", e))
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
pub async fn applications_execute_review(
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

    // Call engine sidecar RPC application.execute (which runs Playwright in Review mode)
    let params = json!({
        "id": app.id,
        "job": job,
        "profile": profile,
        "mode": "review",
        "resumePath": app.tailored_resume_path
    });

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

    let screenshot: Option<String> = res
        .get("screenshotBeforeSubmit")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let checklist_val = res.get("reviewChecklist").cloned().unwrap_or(json!([]));
    let checklist_json = serde_json::to_string(&checklist_val).unwrap_or_else(|_| "[]".to_string());

    let step_id = format!("step_{}", uuid::Uuid::new_v4().simple());
    let _ = db::record_application_step(
        &state.pool,
        &step_id,
        &app.id,
        "review_ready",
        "needs_review",
        &checklist_json,
        screenshot.as_deref(),
    )
    .await;

    let _ = db::update_application_status(&state.pool, &app.id, "needs_review").await;

    let updated = db::get_application_by_id(&state.pool, &app.id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "Failed to reload updated application".to_string())?;

    Ok(updated)
}

#[tauri::command]
#[specta::specta]
pub async fn applications_submit_reviewed(
    state: State<'_, AppState>,
    id: String,
) -> Result<ApplicationRecordDto, String> {
    let res = state
        .engine
        .request("application.submitReviewed", json!({ "id": id }))
        .await?;

    let screenshot: Option<String> = res
        .get("screenshotConfirmation")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut app = db::get_application_by_id(&state.pool, &id)
        .await
        .map_err(|e| format!("DB error: {}", e))?
        .ok_or_else(|| "Application not found".to_string())?;

    app.status = "applied".to_string();
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

#[tauri::command]
#[specta::specta]
pub async fn settings_wipe_all_data(state: State<'_, AppState>) -> Result<(), String> {
    db::wipe_all_data(&state.pool)
        .await
        .map_err(|e| format!("Database error wiping data: {}", e))
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
    let now = std::time::SystemTime::now();
    let since = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}.{:03}Z", since.as_secs(), since.subsec_millis())
}
