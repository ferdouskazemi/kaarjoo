use serde::{Deserialize, Serialize};
use specta::Type;
use tauri_specta::{collect_commands, Builder};
use tauri::Manager;

pub mod commands;
pub mod db;
pub mod engine;
pub mod models;
pub mod state;

use engine::EngineClient;
use state::AppState;

#[derive(Debug, Serialize, Deserialize, Type)]
pub struct SystemStatus {
    pub app_version: String,
    pub os: String,
    pub is_ready: bool,
}

pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let log_msg = format!("PANIC: {:?}\nLocation: {:?}\n", info.payload().downcast_ref::<&str>(), info.location());
        let panic_path = std::env::temp_dir().join("kaarjoo-panic.log");
        let _ = std::fs::write(panic_path, log_msg);
    }));

    let specta_builder = Builder::<tauri::Wry>::new().commands(collect_commands![
        commands::get_system_status,
        commands::profile_get,
        commands::profile_save,
        commands::profile_parse_and_extract,
        commands::profile_clear,
        commands::jobs_search,
        commands::jobs_get_all,
        commands::jobs_get,
        commands::jobs_search_fts,
        commands::directory_list,
        commands::directory_toggle_follow,
        commands::directory_upsert,
        commands::matching_score_job,
        commands::matching_rank_all,
        commands::matching_record_feedback,
        commands::documents_tailor,
        commands::documents_export_pdf,
        commands::documents_export_docx,
        commands::applications_get_all,
        commands::applications_get,
        commands::applications_create,
        commands::applications_update_status,
        commands::applications_update_notes,
        commands::applications_execute_review,
        commands::applications_submit_reviewed,
        commands::settings_get_all,
        commands::settings_set,
        commands::settings_wipe_all_data,
        commands::directory_check_update,
        commands::models_get_status,
        commands::models_detect_hardware,
        commands::models_download,
    ]);

    #[cfg(debug_assertions)]
    specta_builder
        .export(specta_typescript::Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(specta_builder.invoke_handler())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;

            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::temp_dir().join("com.kaarjoo.desktop"));

            std::fs::create_dir_all(&app_data_dir)?;

            // Initialize SQLite DB with WAL mode & embedded migrations
            let pool = tauri::async_runtime::block_on(async {
                db::init_db(&app_data_dir).await.expect("Failed to initialize SQLite database")
            });

            // Initialize Node Engine sidecar client
            let engine = EngineClient::new(app.handle().clone(), &app_data_dir);

            // Spawn sidecar asynchronously
            let engine_spawn = engine.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = engine_spawn.spawn().await {
                    tracing::error!("Failed to spawn engine sidecar on startup: {}", e);
                } else {
                    engine_spawn.start_health_check_loop();
                }
            });

            // Manage app state
            app.manage(AppState { pool, engine });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running kaarjoo desktop application");
}


