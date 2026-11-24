use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct BoundingBoxDto {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FactProvenanceDto {
    #[serde(rename = "sourceFileId")]
    pub source_file_id: String,
    pub page: i32,
    #[serde(rename = "textSpan")]
    pub text_span: String,
    pub bbox: Option<BoundingBoxDto>,
    pub confidence: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ContactInfoDto {
    #[serde(rename = "fullName")]
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub location: Option<String>,
    #[serde(rename = "linkedinUrl")]
    pub linkedin_url: Option<String>,
    #[serde(rename = "githubUrl")]
    pub github_url: Option<String>,
    #[serde(rename = "portfolioUrl")]
    pub portfolio_url: Option<String>,
    pub provenance: Option<FactProvenanceDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ExperienceItemDto {
    pub id: String,
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: String,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    #[serde(rename = "isCurrent")]
    pub is_current: bool,
    pub description: Option<String>,
    #[serde(default)]
    pub achievements: Vec<String>,
    #[serde(default, rename = "skillsUsed")]
    pub skills_used: Vec<String>,
    pub provenance: Option<FactProvenanceDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EducationItemDto {
    pub id: String,
    pub institution: String,
    pub degree: String,
    #[serde(rename = "fieldOfStudy")]
    pub field_of_study: Option<String>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "endDate")]
    pub end_date: Option<String>,
    pub grade: Option<String>,
    pub provenance: Option<FactProvenanceDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SkillItemDto {
    pub id: String,
    pub name: String,
    #[serde(rename = "escoId")]
    pub esco_id: Option<String>,
    pub category: Option<String>,
    #[serde(rename = "yearsOfExperience")]
    pub years_of_experience: Option<f64>,
    pub level: Option<String>,
    pub confidence: Option<f64>,
    pub provenance: Option<FactProvenanceDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UserProfileDto {
    pub id: String,
    pub version: i32,
    pub contact: ContactInfoDto,
    pub summary: Option<String>,
    #[serde(default)]
    pub experiences: Vec<ExperienceItemDto>,
    #[serde(default)]
    pub education: Vec<EducationItemDto>,
    #[serde(default)]
    pub skills: Vec<SkillItemDto>,
    #[serde(default, rename = "targetTitles")]
    pub target_titles: Vec<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ProfileExtractionResultDto {
    pub profile: UserProfileDto,
    #[serde(rename = "sourceFileId")]
    pub source_file_id: String,
    #[serde(rename = "sourceFileName")]
    pub source_file_name: String,
    #[serde(rename = "pagesCount")]
    pub pages_count: i32,
    #[serde(rename = "rawText")]
    pub raw_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SalaryRangeDto {
    pub min: Option<f64>,
    pub max: Option<f64>,
    pub currency: String,
    pub period: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct JobPostingDto {
    pub id: String,
    #[serde(rename = "sourceId")]
    pub source_id: String,
    #[serde(rename = "sourceName")]
    pub source_name: String,
    #[serde(rename = "canonicalUrl")]
    pub canonical_url: String,
    #[serde(rename = "applyUrl")]
    pub apply_url: String,
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    #[serde(rename = "remoteType")]
    pub remote_type: String,
    #[serde(rename = "employmentType")]
    pub employment_type: Option<String>,
    pub salary: Option<SalaryRangeDto>,
    #[serde(rename = "descriptionMarkdown")]
    pub description_markdown: String,
    #[serde(default)]
    pub requirements: Vec<String>,
    #[serde(rename = "postedAt")]
    pub posted_at: Option<String>,
    #[serde(rename = "expiresAt")]
    pub expires_at: Option<String>,
    #[serde(rename = "atsType")]
    pub ats_type: String,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
    #[serde(rename = "simHash")]
    pub sim_hash: Option<String>,
    #[serde(rename = "matchScore")]
    pub match_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct JobsSearchQueryDto {
    pub keywords: Option<Vec<String>>,
    pub locations: Option<Vec<String>>,
    #[serde(rename = "remoteOnly")]
    pub remote_only: Option<bool>,
    pub company: Option<String>,
    #[serde(rename = "atsType")]
    pub ats_type: Option<String>,
    pub limit: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MatchBreakdownDto {
    #[serde(rename = "hardFilter")]
    pub hard_filter: f64,
    pub semantic: f64,
    #[serde(rename = "skillCoverage")]
    pub skill_coverage: f64,
    pub rerank: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MatchResultDto {
    #[serde(rename = "jobId")]
    pub job_id: String,
    #[serde(rename = "profileId")]
    pub profile_id: String,
    pub score: f64,
    pub breakdown: MatchBreakdownDto,
    #[serde(rename = "topReasons")]
    pub top_reasons: Vec<String>,
    #[serde(rename = "matchedSkills")]
    pub matched_skills: Vec<String>,
    #[serde(rename = "missingSkills")]
    pub missing_skills: Vec<String>,
    #[serde(rename = "whyNotHigher")]
    pub why_not_higher: Option<String>,
    #[serde(rename = "userFeedback")]
    pub user_feedback: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TailoredDocumentResultDto {
    #[serde(rename = "jobId")]
    pub job_id: String,
    #[serde(rename = "templateId")]
    pub template_id: String,
    pub language: String,
    #[serde(rename = "resumeHtml")]
    pub resume_html: String,
    #[serde(rename = "coverLetterText")]
    pub cover_letter_text: String,
    #[serde(rename = "truthfulnessScore")]
    pub truthfulness_score: f64,
    #[serde(rename = "truthfulnessPassed")]
    pub truthfulness_passed: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct FilledFieldDto {
    #[serde(rename = "fieldId")]
    pub field_id: String,
    pub label: String,
    pub value: String,
    #[serde(rename = "displayValue")]
    pub display_value: String,
    pub confidence: f64,
    #[serde(rename = "isRequired")]
    pub is_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ReviewChecklistItemDto {
    pub id: String,
    pub label: String,
    pub value: String,
    pub status: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TimelineEventDto {
    pub id: String,
    pub status: String,
    pub timestamp: String,
    pub title: String,
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct ApplicationRecordDto {
    pub id: String,
    #[serde(rename = "jobId")]
    pub job_id: String,
    #[serde(rename = "jobTitle")]
    pub job_title: String,
    pub company: String,
    pub location: Option<String>,
    #[serde(rename = "applyUrl")]
    pub apply_url: String,
    #[serde(rename = "atsType")]
    pub ats_type: String,
    pub mode: String,
    pub status: String,
    #[serde(rename = "matchScore")]
    pub match_score: f64,
    #[serde(rename = "profileId")]
    pub profile_id: String,
    #[serde(rename = "tailoredResumePath")]
    pub tailored_resume_path: Option<String>,
    #[serde(rename = "coverLetterText")]
    pub cover_letter_text: Option<String>,
    pub notes: Option<String>,
    #[serde(rename = "interviewDate")]
    pub interview_date: Option<String>,
    #[serde(rename = "submittedAt")]
    pub submitted_at: Option<String>,
    #[serde(rename = "screenshotBeforeSubmit")]
    pub screenshot_before_submit: Option<String>,
    #[serde(rename = "screenshotConfirmation")]
    pub screenshot_confirmation: Option<String>,
    #[serde(default, rename = "filledFields")]
    pub filled_fields: Vec<FilledFieldDto>,
    #[serde(default, rename = "reviewChecklist")]
    pub review_checklist: Vec<ReviewChecklistItemDto>,
    #[serde(default)]
    pub timeline: Vec<TimelineEventDto>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct TaskDto {
    pub id: String,
    #[serde(rename = "taskType")]
    pub task_type: String,
    pub status: String,
    #[serde(rename = "payloadJson")]
    pub payload_json: String,
    #[serde(rename = "resultJson")]
    pub result_json: Option<String>,
    #[serde(rename = "errorText")]
    pub error_text: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}
