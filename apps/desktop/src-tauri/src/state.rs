use crate::db::DbPool;
use crate::engine::EngineClient;
use std::sync::{atomic::AtomicBool, Arc};

pub struct AppState {
    pub pool: DbPool,
    pub engine: Arc<EngineClient>,
    pub pipeline_cancelled: Arc<AtomicBool>,
}
