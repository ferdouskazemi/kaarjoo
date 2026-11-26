use serde::{Deserialize, Serialize};
use specta::Type;
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(tag = "kind", content = "data")]
pub enum AppError {
    EngineUnavailable(String),
    EngineTimeout {
        method: String,
    },
    Rpc {
        code: i32,
        message: String,
    },
    Db(String),
    Validation(String),
    NotFound(String),
    Internal(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::EngineUnavailable(msg) => write!(f, "EngineUnavailable: {}", msg),
            AppError::EngineTimeout { method } => write!(f, "EngineTimeout: {} timed out", method),
            AppError::Rpc { code, message } => write!(f, "Rpc({}): {}", code, message),
            AppError::Db(msg) => write!(f, "Database error: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::NotFound(msg) => write!(f, "NotFound: {}", msg),
            AppError::Internal(msg) => write!(f, "Internal error: {}", msg),
        }
    }
}

impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        err.to_string()
    }
}
