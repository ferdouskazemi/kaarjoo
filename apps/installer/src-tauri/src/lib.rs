use serde::Serialize;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

static EMBEDDED_NSIS_SETUP: &[u8] = include_bytes!(
    "../../../desktop/src-tauri/target/release/bundle/nsis/Kaarjoo_1.0.0_x64-setup.exe"
);

#[derive(Clone, Serialize)]
struct InstallProgressEvent {
    progress: u8,
    stage: &'static str,
}

fn emit_progress(app: &AppHandle, progress: u8, stage: &'static str) {
    let _ = app.emit("install-progress", InstallProgressEvent { progress, stage });
}

#[tauri::command]
fn get_default_install_dir() -> String {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        return PathBuf::from(local_app_data)
            .join("Kaarjoo")
            .to_string_lossy()
            .to_string();
    }
    String::from("C:\\Program Files\\Kaarjoo")
}

#[tauri::command]
fn pick_install_dir(current_dir: String) -> Option<String> {
    let mut dialog = rfd::FileDialog::new();
    let current = PathBuf::from(&current_dir);
    if current.exists() {
        dialog = dialog.set_directory(current);
    }
    dialog
        .pick_folder()
        .map(|folder| folder.join("Kaarjoo").to_string_lossy().to_string())
}

#[tauri::command]
async fn run_silent_install(
    app: AppHandle,
    install_dir: String,
    desktop_shortcut: bool,
) -> Result<String, String> {
    let target_dir = if install_dir.trim().is_empty() {
        get_default_install_dir()
    } else {
        install_dir.trim().to_string()
    };

    emit_progress(&app, 14, "extract");

    let temp_setup = std::env::temp_dir().join("kaarjoo-setup-1.0.0-silent.exe");
    std::fs::write(&temp_setup, EMBEDDED_NSIS_SETUP)
        .map_err(|e| format!("Failed to stage installer payload: {e}"))?;

    emit_progress(&app, 32, "engine");

    let mut cmd = Command::new(&temp_setup);
    cmd.arg("/S");
    // NSIS requires /D=PATH as the final unquoted argument
    cmd.arg(format!("/D={}", target_dir));
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to launch silent setup: {e}"))?;

    let mut pct: u8 = 36;
    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let _ = std::fs::remove_file(&temp_setup);
                if !status.success() {
                    return Err(format!(
                        "Installer exited with non-zero code: {:?}",
                        status.code()
                    ));
                }
                break;
            }
            Ok(None) => {
                std::thread::sleep(Duration::from_millis(350));
                if pct < 88 {
                    pct = (pct + 4).min(88);
                }
                let stage = if pct < 65 { "engine" } else { "shortcuts" };
                emit_progress(&app, pct, stage);
            }
            Err(e) => {
                let _ = std::fs::remove_file(&temp_setup);
                return Err(format!("Failed while waiting for installer: {e}"));
            }
        }
    }

    emit_progress(&app, 92, "shortcuts");

    if !desktop_shortcut {
        if let Ok(user_profile) = std::env::var("USERPROFILE") {
            let desktop_lnk = PathBuf::from(user_profile)
                .join("Desktop")
                .join("Kaarjoo.lnk");
            let _ = std::fs::remove_file(desktop_lnk);
        }
    }

    emit_progress(&app, 97, "verify");

    let installed_exe = PathBuf::from(&target_dir).join("kaarjoo-desktop.exe");
    if !installed_exe.exists() {
        return Err(format!(
            "Verification failed: expected executable not found at {}",
            installed_exe.display()
        ));
    }

    emit_progress(&app, 100, "verify");
    Ok(target_dir)
}

#[tauri::command]
fn launch_installed_app(app: AppHandle, install_dir: String) -> Result<(), String> {
    let exe = PathBuf::from(&install_dir).join("kaarjoo-desktop.exe");
    if !exe.exists() {
        return Err(format!("Application not found at {}", exe.display()));
    }
    Command::new(&exe)
        .spawn()
        .map_err(|e| format!("Failed to launch Kaarjoo: {e}"))?;
    app.exit(0);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_default_install_dir,
            pick_install_dir,
            run_silent_install,
            launch_installed_app,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Kaarjoo installer");
}
