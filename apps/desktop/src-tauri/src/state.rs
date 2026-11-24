use crate::db::DbPool;
use crate::engine::EngineClient;
use std::sync::Arc;

pub struct AppState {
    pub pool: DbPool,
    pub engine: Arc<EngineClient>,
}
