use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStatus {
    pub app_version: String,
    pub os: String,
    pub is_ready: bool,
}

mod commands {
    use super::*;

    #[tauri::command]
    pub fn get_system_status() -> Result<SystemStatus, String> {
        Ok(SystemStatus {
            app_version: "0.1.0".to_string(),
            os: std::env::consts::OS.to_string(),
            is_ready: true,
        })
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![commands::get_system_status])
        .run(tauri::generate_context!())
        .expect("error while running kaarjoo desktop application");
}
