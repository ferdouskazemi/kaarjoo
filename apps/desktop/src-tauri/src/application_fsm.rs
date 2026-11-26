use serde_json::json;
use sqlx::Row;
use tauri::{AppHandle, Emitter};
use crate::db::DbPool;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AppTransitionEvent {
    PrepareKit,
    StartFilling,
    NeedsUser,
    ResumeFilling,
    ReachReview,
    FillFailed,
    StartSubmit,
    SubmitVerified,
    SubmitUnverified,
    SubmitFailed,
    MarkInterview,
    MarkOffer,
    MarkRejected,
    Withdraw,
    Cancel,
}

pub fn next_state(current: &str, event: AppTransitionEvent) -> Result<&'static str, String> {
    use AppTransitionEvent::*;
    match (current, event) {
        ("draft" | "saved", PrepareKit) => Ok("kit_ready"),
        ("draft" | "saved" | "kit_ready" | "queued", StartFilling) => Ok("filling"),
        ("filling", NeedsUser) => Ok("needs_user"),
        ("needs_user", ResumeFilling) => Ok("filling"),
        ("needs_user", Cancel) => Ok("cancelled"),
        ("filling" | "needs_user", ReachReview) => Ok("needs_review"),
        ("filling" | "needs_user", FillFailed) => Ok("failed"),
        ("needs_review", StartSubmit) => Ok("submitting"),
        ("submitting", SubmitVerified) => Ok("submitted_verified"),
        ("submitting", SubmitUnverified) => Ok("submitted_unverified"),
        ("submitting", SubmitFailed) => Ok("failed"),
        ("submitted_verified" | "submitted_unverified" | "applied", MarkInterview) => Ok("interview"),
        ("interview" | "submitted_verified" | "submitted_unverified" | "applied", MarkOffer) => Ok("offer"),
        ("submitted_verified" | "submitted_unverified" | "applied" | "interview", MarkRejected) => Ok("rejected"),
        ("draft" | "saved" | "kit_ready" | "queued" | "needs_user" | "needs_review" | "submitted_verified" | "submitted_unverified" | "applied" | "interview", Withdraw) => Ok("withdrawn"),
        ("draft" | "saved" | "kit_ready" | "queued" | "needs_review" | "failed", Cancel) => Ok("cancelled"),
        _ => Err(format!("Forbidden application state transition from '{}' via {:?}", current, event)),
    }
}

pub fn user_event_from_status(target_status: &str) -> Result<AppTransitionEvent, String> {
    match target_status {
        "interview" | "interviewing" => Ok(AppTransitionEvent::MarkInterview),
        "offer" => Ok(AppTransitionEvent::MarkOffer),
        "rejected" => Ok(AppTransitionEvent::MarkRejected),
        "withdrawn" => Ok(AppTransitionEvent::Withdraw),
        "cancelled" => Ok(AppTransitionEvent::Cancel),
        other => Err(format!("Status '{}' cannot be set directly by user", other)),
    }
}

pub async fn transition_application(
    pool: &DbPool,
    app_id: &str,
    event: AppTransitionEvent,
    app_handle: Option<&AppHandle>,
) -> Result<String, String> {
    let mut tx = pool.begin().await.map_err(|e| format!("DB tx error: {}", e))?;

    let row = sqlx::query("SELECT status FROM applications WHERE id = ?")
        .bind(app_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| format!("DB query error: {}", e))?
        .ok_or_else(|| format!("Application '{}' not found", app_id))?;

    let current: String = row.get("status");
    let next = next_state(&current, event)?;

    sqlx::query("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?")
        .bind(next)
        .bind(app_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("DB update error: {}", e))?;

    tx.commit().await.map_err(|e| format!("DB commit error: {}", e))?;

    if let Some(app) = app_handle {
        let _ = app.emit(
            "app:application-updated",
            json!({ "id": app_id, "previousStatus": current, "status": next }),
        );
    }

    Ok(next.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use AppTransitionEvent::*;

    #[test]
    fn test_allowed_fsm_transitions() {
        assert_eq!(next_state("draft", PrepareKit).unwrap(), "kit_ready");
        assert_eq!(next_state("kit_ready", StartFilling).unwrap(), "filling");
        assert_eq!(next_state("filling", NeedsUser).unwrap(), "needs_user");
        assert_eq!(next_state("needs_user", ResumeFilling).unwrap(), "filling");
        assert_eq!(next_state("filling", ReachReview).unwrap(), "needs_review");
        assert_eq!(next_state("needs_review", StartSubmit).unwrap(), "submitting");
        assert_eq!(next_state("submitting", SubmitVerified).unwrap(), "submitted_verified");
        assert_eq!(next_state("submitting", SubmitUnverified).unwrap(), "submitted_unverified");
        assert_eq!(next_state("submitted_verified", MarkInterview).unwrap(), "interview");
        assert_eq!(next_state("interview", MarkOffer).unwrap(), "offer");
    }

    #[test]
    fn test_forbidden_fsm_transitions() {
        assert!(next_state("draft", StartSubmit).is_err());
        assert!(next_state("saved", SubmitVerified).is_err());
        assert!(next_state("needs_user", SubmitVerified).is_err());
        assert!(next_state("submitted_verified", StartFilling).is_err());
        assert!(next_state("rejected", MarkOffer).is_err());
        assert!(user_event_from_status("submitted_verified").is_err());
    }
}
