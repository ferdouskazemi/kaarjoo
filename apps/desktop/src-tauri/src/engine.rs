use serde_json::json;
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::{mpsc, oneshot, Mutex};
use tracing::{error, info, warn};

pub struct EngineClient {
    app_handle: AppHandle,
    next_id: AtomicU64,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Result<serde_json::Value, String>>>>>,
    tx_outgoing: Arc<Mutex<Option<mpsc::UnboundedSender<String>>>>,
    child: Arc<Mutex<Option<CommandChild>>>,
    is_running: Arc<AtomicBool>,
    is_shutting_down: Arc<AtomicBool>,
    app_data_dir: PathBuf,
    log_path: PathBuf,
}

impl EngineClient {
    pub fn new(app_handle: AppHandle, app_data_dir: &Path) -> Arc<Self> {
        let logs_dir = app_data_dir.join("logs");
        let _ = fs::create_dir_all(&logs_dir);
        let log_path = logs_dir.join("engine.log");

        Arc::new(Self {
            app_handle,
            next_id: AtomicU64::new(1),
            pending: Arc::new(Mutex::new(HashMap::new())),
            tx_outgoing: Arc::new(Mutex::new(None)),
            child: Arc::new(Mutex::new(None)),
            is_running: Arc::new(AtomicBool::new(false)),
            is_shutting_down: Arc::new(AtomicBool::new(false)),
            app_data_dir: app_data_dir.to_path_buf(),
            log_path,
        })
    }



    fn find_bundle_path(&self) -> Result<PathBuf, String> {
        // 1. Try resource directory (production macOS .app/Contents/Resources & Windows NSIS)
        if let Ok(res_dir) = self.app_handle.path().resource_dir() {
            let candidates = [
                res_dir.join("engine").join("bundle.mjs"),
                res_dir.join("resources").join("engine").join("bundle.mjs"),
                res_dir.join("bundle.mjs"),
                res_dir.join("_up_/_up_/_up_/packages/engine/dist/bundle.mjs"),
                res_dir.join("_up_/_up_/packages/engine/dist/bundle.mjs"),
                res_dir.join("packages/engine/dist/bundle.mjs"),
            ];
            for candidate in &candidates {
                if candidate.exists() {
                    return Ok(candidate.clone());
                }
            }
        }

        // 2. Try relative workspace paths (development)
        let candidates = [
            PathBuf::from("apps/desktop/src-tauri/resources/engine/bundle.mjs"),
            PathBuf::from("resources/engine/bundle.mjs"),
            PathBuf::from("packages/engine/dist/bundle.mjs"),
            PathBuf::from("../../packages/engine/dist/bundle.mjs"),
            PathBuf::from("../../../packages/engine/dist/bundle.mjs"),
        ];

        for c in &candidates {
            if c.exists() {
                return Ok(c.canonicalize().unwrap_or_else(|_| c.clone()));
            }
        }

        // Default fallback
        Ok(PathBuf::from("packages/engine/dist/bundle.mjs"))
    }

    pub async fn spawn(&self) -> Result<(), String> {
        if self.is_running.load(Ordering::SeqCst) {
            return Ok(());
        }

        let bundle_path = self.find_bundle_path()?;
        info!("Spawning Node engine sidecar with bundle: {:?}", bundle_path);

        let bundle_dir = bundle_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| PathBuf::from("."));
        let node_modules_dir = bundle_dir.join("node_modules");
        let models_dir = self.app_data_dir.join("models");

        let mut env_vars = HashMap::new();
        env_vars.insert(
            "KAARJOO_APP_DATA_DIR".to_string(),
            self.app_data_dir.to_string_lossy().to_string(),
        );
        env_vars.insert(
            "KAARJOO_MODELS_DIR".to_string(),
            models_dir.to_string_lossy().to_string(),
        );
        if let Ok(res_dir) = self.app_handle.path().resource_dir() {
            env_vars.insert(
                "KAARJOO_RESOURCES_DIR".to_string(),
                res_dir.to_string_lossy().to_string(),
            );
        }
        if node_modules_dir.exists() {
            env_vars.insert(
                "NODE_PATH".to_string(),
                node_modules_dir.to_string_lossy().to_string(),
            );
        }

        let sidecar_cmd = self
            .app_handle
            .shell()
            .sidecar("node")
            .map_err(|e| format!("Failed to configure node sidecar: {}", e))?
            .envs(env_vars)
            .args([bundle_path.to_string_lossy().to_string()]);

        let (mut rx, child) = sidecar_cmd
            .spawn()
            .map_err(|e| format!("Failed to spawn node sidecar: {}", e))?;

        let child_arc = Arc::new(Mutex::new(child));
        *self.child.lock().await = None;

        let (tx, mut rx_outgoing) = mpsc::unbounded_channel::<String>();
        *self.tx_outgoing.lock().await = Some(tx);
        self.is_running.store(true, Ordering::SeqCst);

        // Task: Write outgoing stdin messages
        let child_writer = child_arc.clone();
        tokio::spawn(async move {
            while let Some(msg) = rx_outgoing.recv().await {
                let mut guard = child_writer.lock().await;
                if let Err(e) = guard.write(msg.as_bytes()) {
                    error!("Failed to write to engine stdin: {}", e);
                    break;
                }
            }
        });

        // Task: Read incoming stdout and stderr events
        let pending_clone = self.pending.clone();
        let is_running_clone = self.is_running.clone();
        let _is_shutting_down_clone = self.is_shutting_down.clone();
        let app_handle_clone = self.app_handle.clone();
        let log_path_clone = self.log_path.clone();

        tokio::spawn(async move {
            let mut line_buffer = String::new();

            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(bytes) => {
                        Self::write_log_static(&log_path_clone, "STDOUT", &bytes);
                        let text = String::from_utf8_lossy(&bytes);
                        line_buffer.push_str(&text);

                        while let Some(pos) = line_buffer.find('\n') {
                            let line = line_buffer[..pos].trim().to_string();
                            line_buffer = line_buffer[pos + 1..].to_string();

                            if !line.is_empty() {
                                Self::dispatch_incoming_line(&line, &pending_clone, &app_handle_clone).await;
                            }
                        }
                    }
                    CommandEvent::Stderr(bytes) => {
                        Self::write_log_static(&log_path_clone, "STDERR", &bytes);
                        let text = String::from_utf8_lossy(&bytes);
                        warn!("[Engine Stderr]: {}", text.trim());
                    }
                    CommandEvent::Error(err) => {
                        error!("[Engine Process Error]: {}", err);
                        Self::write_log_static(&log_path_clone, "ERROR", err.as_bytes());
                    }
                    CommandEvent::Terminated(payload) => {
                        warn!("[Engine Process Terminated]: code {:?}", payload.code);
                        is_running_clone.store(false, Ordering::SeqCst);

                        // Reject any pending requests
                        let mut pending = pending_clone.lock().await;
                        for (_, tx) in pending.drain() {
                            let _ = tx.send(Err("Engine process terminated".to_string()));
                        }
                        break;
                    }
                    _ => {}
                }
            }
        });

        info!("Engine sidecar process spawned successfully");
        Ok(())
    }

    fn write_log_static(log_path: &Path, prefix: &str, data: &[u8]) {
        if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_path) {
            let timestamp = chrono_lite_timestamp();
            let _ = write!(f, "[{}] [{}] ", timestamp, prefix);
            let _ = f.write_all(data);
            if !data.ends_with(b"\n") {
                let _ = writeln!(f);
            }
        }
    }

    async fn dispatch_incoming_line(
        line: &str,
        pending_map: &Arc<Mutex<HashMap<u64, oneshot::Sender<Result<serde_json::Value, String>>>>>,
        app_handle: &AppHandle,
    ) {
        let Ok(val) = serde_json::from_str::<serde_json::Value>(line) else {
            return;
        };

        if let Some(id_val) = val.get("id").and_then(|v| v.as_u64()) {
            let mut pending = pending_map.lock().await;
            if let Some(tx) = pending.remove(&id_val) {
                if let Some(err) = val.get("error") {
                    let msg = err
                        .get("message")
                        .and_then(|m| m.as_str())
                        .unwrap_or("Unknown JSON-RPC error");
                    let _ = tx.send(Err(msg.to_string()));
                } else if let Some(res) = val.get("result") {
                    let _ = tx.send(Ok(res.clone()));
                } else {
                    let _ = tx.send(Ok(serde_json::Value::Null));
                }
            }
            return;
        }

        if let Some(method) = val.get("method").and_then(|m| m.as_str()) {
            let event_name = format!("engine:{}", method.replace('.', ":"));
            let params = val.get("params").cloned().unwrap_or(serde_json::Value::Null);
            let _ = app_handle.emit(&event_name, params);
        }
    }

    pub async fn request(&self, method: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
        if !self.is_running.load(Ordering::SeqCst) {
            let _ = self.spawn().await;
        }

        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();

        {
            let mut pending = self.pending.lock().await;
            pending.insert(id, tx);
        }

        let req = json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params
        });

        let line = format!("{}\n", serde_json::to_string(&req).unwrap());

        {
            let guard = self.tx_outgoing.lock().await;
            if let Some(tx_out) = guard.as_ref() {
                tx_out
                    .send(line)
                    .map_err(|e| format!("Failed to send request to engine: {}", e))?;
            } else {
                return Err("Engine process is not running".to_string());
            }
        }

        // 60-second timeout on requests
        match tokio::time::timeout(Duration::from_secs(60), rx).await {
            Ok(res) => res.map_err(|_| "Response channel closed".to_string())?,
            Err(_) => {
                let mut pending = self.pending.lock().await;
                pending.remove(&id);
                Err(format!("JSON-RPC request '{}' timed out after 60s", method))
            }
        }
    }

    pub async fn ping(&self) -> Result<bool, String> {
        let res = self.request("system.ping", json!({})).await?;
        Ok(res.get("status").and_then(|s| s.as_str()) == Some("ok"))
    }

    pub fn start_health_check_loop(self: &Arc<Self>) {
        let client = self.clone();
        tokio::spawn(async move {
            let mut consecutive_failures = 0;
            let mut backoff_secs = 2;

            loop {
                tokio::time::sleep(Duration::from_secs(15)).await;

                if client.is_shutting_down.load(Ordering::SeqCst) {
                    break;
                }

                match client.ping().await {
                    Ok(true) => {
                        consecutive_failures = 0;
                        backoff_secs = 2;
                    }
                    _ => {
                        consecutive_failures += 1;
                        warn!(
                            "Engine health check failed ({}/2 consecutive failures)",
                            consecutive_failures
                        );

                        if consecutive_failures >= 2 {
                            warn!("Engine unresponsive; restarting sidecar with backoff {}s...", backoff_secs);
                            client.is_running.store(false, Ordering::SeqCst);
                            tokio::time::sleep(Duration::from_secs(backoff_secs)).await;
                            let _ = client.spawn().await;
                            backoff_secs = (backoff_secs * 2).min(30);
                            consecutive_failures = 0;
                        }
                    }
                }
            }
        });
    }

    pub fn shutdown(&self) {
        self.is_shutting_down.store(true, Ordering::SeqCst);
        self.is_running.store(false, Ordering::SeqCst);
    }
}

fn chrono_lite_timestamp() -> String {
    let now = std::time::SystemTime::now();
    let since = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    format!("{}.{:03}", since.as_secs(), since.subsec_millis())
}
