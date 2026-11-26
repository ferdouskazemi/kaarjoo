use serde_json::json;
use std::collections::{HashMap, VecDeque};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use tokio::sync::{mpsc, oneshot};
use tracing::{error, info, warn};

const MAX_LINE_BYTES: usize = 32 * 1024 * 1024; // 32 MB cap per JSON-RPC line
const MAX_RESTARTS_WINDOW: Duration = Duration::from_secs(300); // 5 minutes
const MAX_RESTARTS_IN_WINDOW: usize = 5;

#[derive(Debug, Clone, Default)]
pub struct RequestOptions {
    pub timeout: Option<Duration>,
}

pub fn timeout_for_method(method: &str) -> Duration {
    match method {
        "system.ping" => Duration::from_secs(5),
        "profile.parseAndExtract" => Duration::from_secs(180),
        "application.execute" => Duration::from_secs(180),
        "application.submitReviewed" => Duration::from_secs(120),
        "models.download" => Duration::from_secs(3600),
        _ => Duration::from_secs(60),
    }
}

/// Byte-level line framer that splits on `b'\n'` BEFORE UTF-8 decoding so
/// multi-byte Persian/Arabic characters split across stdout chunks never corrupt.
pub struct ByteLineFramer {
    buf: Vec<u8>,
}

impl ByteLineFramer {
    pub fn new() -> Self {
        Self { buf: Vec::with_capacity(4096) }
    }

    pub fn push_bytes(&mut self, chunk: &[u8]) -> Vec<String> {
        let mut lines = Vec::new();
        self.buf.extend_from_slice(chunk);

        if self.buf.len() > MAX_LINE_BYTES {
            warn!("Engine stdout line exceeded 32 MB cap; dropping oversized buffer");
            self.buf.clear();
            return lines;
        }

        let mut start = 0;
        while let Some(rel_pos) = self.buf[start..].iter().position(|&b| b == b'\n') {
            let end = start + rel_pos;
            let slice = &self.buf[start..end];
            let trimmed = slice.strip_suffix(b"\r").unwrap_or(slice);
            match std::str::from_utf8(trimmed) {
                Ok(s) => {
                    if !s.trim().is_empty() {
                        lines.push(s.to_string());
                    }
                }
                Err(e) => {
                    warn!("Dropping invalid UTF-8 line from engine stdout: {}", e);
                }
            }
            start = end + 1;
        }

        if start > 0 {
            self.buf.drain(0..start);
        }

        lines
    }
}

struct PendingEntry {
    generation: u64,
    method: String,
    started_at: Instant,
    tx: oneshot::Sender<Result<serde_json::Value, String>>,
}

enum SupervisorCmd {
    Spawn {
        reply: oneshot::Sender<Result<(), String>>,
    },
    Request {
        id: u64,
        method: String,
        params: serde_json::Value,
        timeout: Duration,
        reply: oneshot::Sender<Result<serde_json::Value, String>>,
    },
    Restart {
        reply: oneshot::Sender<Result<(), String>>,
    },
    Shutdown {
        reply: oneshot::Sender<()>,
    },
    // Internal events from stdout/stderr/terminated tasks
    StdoutChunk {
        generation: u64,
        bytes: Vec<u8>,
    },
    Terminated {
        generation: u64,
        code: Option<i32>,
    },
    TimeoutCheck {
        id: u64,
        generation: u64,
    },
}

pub struct EngineClient {
    app_handle: AppHandle,
    next_id: AtomicU64,
    is_running: Arc<AtomicBool>,
    is_shutting_down: Arc<AtomicBool>,
    app_data_dir: PathBuf,
    cmd_tx: mpsc::UnboundedSender<SupervisorCmd>,
}

pub type EngineSupervisor = EngineClient;

impl EngineClient {
    pub fn new(app_handle: AppHandle, app_data_dir: &Path) -> Arc<Self> {
        let logs_dir = app_data_dir.join("logs");
        let _ = std::fs::create_dir_all(&logs_dir);

        let is_running = Arc::new(AtomicBool::new(false));
        let is_shutting_down = Arc::new(AtomicBool::new(false));
        let (cmd_tx, cmd_rx) = mpsc::unbounded_channel();

        let client = Arc::new(Self {
            app_handle: app_handle.clone(),
            next_id: AtomicU64::new(1),
            is_running: is_running.clone(),
            is_shutting_down: is_shutting_down.clone(),
            app_data_dir: app_data_dir.to_path_buf(),
            cmd_tx: cmd_tx.clone(),
        });

        let actor_handle = app_handle;
        let actor_data_dir = app_data_dir.to_path_buf();
        tauri::async_runtime::spawn(async move {
            run_supervisor_actor(
                actor_handle,
                actor_data_dir,
                is_running,
                is_shutting_down,
                cmd_tx,
                cmd_rx,
            )
            .await;
        });

        client
    }

    pub async fn spawn(&self) -> Result<(), String> {
        let (tx, rx) = oneshot::channel();
        self.cmd_tx
            .send(SupervisorCmd::Spawn { reply: tx })
            .map_err(|_| "Engine supervisor actor is closed".to_string())?;
        rx.await.map_err(|_| "Engine supervisor spawn channel closed".to_string())?
    }

    pub async fn request(&self, method: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
        self.request_with_options(method, params, RequestOptions::default()).await
    }

    pub async fn request_with_options(
        &self,
        method: &str,
        params: serde_json::Value,
        options: RequestOptions,
    ) -> Result<serde_json::Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let timeout = options.timeout.unwrap_or_else(|| timeout_for_method(method));
        let (tx, rx) = oneshot::channel();

        self.cmd_tx
            .send(SupervisorCmd::Request {
                id,
                method: method.to_string(),
                params,
                timeout,
                reply: tx,
            })
            .map_err(|_| "EngineUnavailable: supervisor closed".to_string())?;

        rx.await.map_err(|_| "EngineUnavailable: response channel dropped".to_string())?
    }

    pub async fn restart(&self) -> Result<(), String> {
        let (tx, rx) = oneshot::channel();
        self.cmd_tx
            .send(SupervisorCmd::Restart { reply: tx })
            .map_err(|_| "Engine supervisor closed".to_string())?;
        rx.await.map_err(|_| "Engine restart channel closed".to_string())?
    }

    pub async fn ping(&self) -> Result<bool, String> {
        let res = self.request("system.ping", json!({})).await?;
        Ok(res.get("status").and_then(|s| s.as_str()) == Some("ok"))
    }

    pub fn start_health_check_loop(self: &Arc<Self>) {
        let client = self.clone();
        tauri::async_runtime::spawn(async move {
            let mut consecutive_failures = 0u32;
            let mut backoff_secs = 2u64;

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
                        warn!("Engine health check failed ({}/2)", consecutive_failures);
                        if consecutive_failures >= 2 {
                            let jitter_ms = (std::time::SystemTime::now()
                                .duration_since(std::time::UNIX_EPOCH)
                                .unwrap_or_default()
                                .subsec_millis()
                                % 500) as u64;
                            tokio::time::sleep(Duration::from_secs(backoff_secs) + Duration::from_millis(jitter_ms)).await;
                            let _ = client.restart().await;
                            backoff_secs = (backoff_secs * 2).min(30);
                            consecutive_failures = 0;
                        }
                    }
                }
            }
        });
    }

    pub async fn shutdown(&self) {
        self.is_shutting_down.store(true, Ordering::SeqCst);
        let (tx, rx) = oneshot::channel();
        if self.cmd_tx.send(SupervisorCmd::Shutdown { reply: tx }).is_ok() {
            let _ = tokio::time::timeout(Duration::from_secs(5), rx).await;
        }
    }
}

fn find_bundle_path(app_handle: &AppHandle) -> PathBuf {
    if let Ok(res_dir) = app_handle.path().resource_dir() {
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
                return candidate.clone();
            }
        }
    }

    let dev_candidates = [
        PathBuf::from("apps/desktop/src-tauri/resources/engine/bundle.mjs"),
        PathBuf::from("resources/engine/bundle.mjs"),
        PathBuf::from("packages/engine/dist/bundle.mjs"),
        PathBuf::from("../../packages/engine/dist/bundle.mjs"),
        PathBuf::from("../../../packages/engine/dist/bundle.mjs"),
    ];
    for c in &dev_candidates {
        if c.exists() {
            return c.canonicalize().unwrap_or_else(|_| c.clone());
        }
    }

    PathBuf::from("packages/engine/dist/bundle.mjs")
}

fn kill_child_process_tree(child: CommandChild) {
    let pid = child.pid();
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("taskkill")
            .args(["/F", "/PID", &pid.to_string(), "/T"])
            .output();
    }
    let _ = child.kill();
}

async fn run_supervisor_actor(
    app_handle: AppHandle,
    app_data_dir: PathBuf,
    is_running: Arc<AtomicBool>,
    is_shutting_down: Arc<AtomicBool>,
    cmd_tx: mpsc::UnboundedSender<SupervisorCmd>,
    mut cmd_rx: mpsc::UnboundedReceiver<SupervisorCmd>,
) {
    let mut generation: u64 = 0;
    let mut child: Option<CommandChild> = None;
    let mut pending: HashMap<u64, PendingEntry> = HashMap::new();
    let mut framer = ByteLineFramer::new();
    let mut ready_waiters: Vec<oneshot::Sender<Result<(), String>>> = Vec::new();
    let mut restart_times: VecDeque<Instant> = VecDeque::new();

    while let Some(cmd) = cmd_rx.recv().await {
        match cmd {
            SupervisorCmd::Spawn { reply } => {
                if is_running.load(Ordering::SeqCst) && child.is_some() {
                    let _ = reply.send(Ok(()));
                    continue;
                }
                match spawn_sidecar(&app_handle, &app_data_dir, &cmd_tx, generation + 1) {
                    Ok((new_gen, new_child)) => {
                        generation = new_gen;
                        child = Some(new_child);
                        framer = ByteLineFramer::new();
                        is_running.store(true, Ordering::SeqCst);
                        ready_waiters.push(reply);
                    }
                    Err(e) => {
                        let _ = reply.send(Err(e));
                    }
                }
            }

            SupervisorCmd::Restart { reply } => {
                let now = Instant::now();
                while let Some(&front) = restart_times.front() {
                    if now.duration_since(front) > MAX_RESTARTS_WINDOW {
                        restart_times.pop_front();
                    } else {
                        break;
                    }
                }
                if restart_times.len() >= MAX_RESTARTS_IN_WINDOW {
                    error!("Engine exceeded {} restarts in 5 minutes; emitting engine:fatal", MAX_RESTARTS_IN_WINDOW);
                    let _ = app_handle.emit("engine:fatal", json!({ "reason": "max_restarts_exceeded" }));
                    let _ = reply.send(Err("EngineFatal: maximum restart limit exceeded".to_string()));
                    continue;
                }
                restart_times.push_back(now);

                if let Some(old_child) = child.take() {
                    kill_child_process_tree(old_child);
                }
                is_running.store(false, Ordering::SeqCst);

                match spawn_sidecar(&app_handle, &app_data_dir, &cmd_tx, generation + 1) {
                    Ok((new_gen, new_child)) => {
                        generation = new_gen;
                        child = Some(new_child);
                        framer = ByteLineFramer::new();
                        is_running.store(true, Ordering::SeqCst);
                        ready_waiters.push(reply);
                    }
                    Err(e) => {
                        let _ = reply.send(Err(e));
                    }
                }
            }

            SupervisorCmd::Request {
                id,
                method,
                params,
                timeout,
                reply,
            } => {
                if is_shutting_down.load(Ordering::SeqCst) {
                    let _ = reply.send(Err("EngineUnavailable: shutting down".to_string()));
                    continue;
                }

                if child.is_none() || !is_running.load(Ordering::SeqCst) {
                    match spawn_sidecar(&app_handle, &app_data_dir, &cmd_tx, generation + 1) {
                        Ok((new_gen, new_child)) => {
                            generation = new_gen;
                            child = Some(new_child);
                            framer = ByteLineFramer::new();
                            is_running.store(true, Ordering::SeqCst);
                        }
                        Err(e) => {
                            let _ = reply.send(Err(format!("EngineUnavailable: {}", e)));
                            continue;
                        }
                    }
                }

                let payload = json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "method": method,
                    "params": params
                });
                let line = format!("{}\n", serde_json::to_string(&payload).unwrap_or_default());

                if let Some(ref mut c) = child {
                    if let Err(e) = c.write(line.as_bytes()) {
                        let _ = reply.send(Err(format!("EngineUnavailable: write failed: {}", e)));
                        continue;
                    }
                }

                let cur_gen = generation;
                pending.insert(
                    id,
                    PendingEntry {
                        generation: cur_gen,
                        method: method.clone(),
                        started_at: Instant::now(),
                        tx: reply,
                    },
                );

                let tx_timeout = cmd_tx.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(timeout).await;
                    let _ = tx_timeout.send(SupervisorCmd::TimeoutCheck {
                        id,
                        generation: cur_gen,
                    });
                });
            }

            SupervisorCmd::TimeoutCheck { id, generation: req_gen } => {
                if let Some(entry) = pending.get(&id) {
                    if entry.generation == req_gen {
                        if let Some(removed) = pending.remove(&id) {
                            warn!("JSON-RPC '{}' (id={}) timed out; sending $/cancelRequest", removed.method, id);
                            if let Some(ref mut c) = child {
                                let cancel = format!(
                                    "{}\n",
                                    json!({ "jsonrpc": "2.0", "method": "$/cancelRequest", "params": { "id": id } })
                                );
                                let _ = c.write(cancel.as_bytes());
                            }
                            let _ = removed
                                .tx
                                .send(Err(format!("EngineTimeout: '{}' timed out", removed.method)));
                        }
                    }
                }
            }

            SupervisorCmd::StdoutChunk {
                generation: chunk_gen,
                bytes,
            } => {
                if chunk_gen != generation {
                    continue;
                }
                for line in framer.push_bytes(&bytes) {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&line) {
                        if let Some(id_val) = val.get("id").and_then(|v| v.as_u64()) {
                            if let Some(entry) = pending.remove(&id_val) {
                                let elapsed = entry.started_at.elapsed().as_millis();
                                if let Some(err) = val.get("error") {
                                    let code = err.get("code").and_then(|c| c.as_i64()).unwrap_or(-32000);
                                    let msg = err
                                        .get("message")
                                        .and_then(|m| m.as_str())
                                        .unwrap_or("Unknown JSON-RPC error");
                                    warn!(method = %entry.method, id = id_val, duration_ms = elapsed, code = code, "RPC error");
                                    let _ = entry.tx.send(Err(msg.to_string()));
                                } else {
                                    info!(method = %entry.method, id = id_val, duration_ms = elapsed, "RPC ok");
                                    let res = val.get("result").cloned().unwrap_or(serde_json::Value::Null);
                                    let _ = entry.tx.send(Ok(res));
                                }
                            }
                        } else if let Some(method) = val.get("method").and_then(|m| m.as_str()) {
                            if method == "engine.ready" {
                                for waiter in ready_waiters.drain(..) {
                                    let _ = waiter.send(Ok(()));
                                }
                            }
                            let event_name = format!("engine:{}", method.replace('.', ":"));
                            let params = val.get("params").cloned().unwrap_or(serde_json::Value::Null);
                            let _ = app_handle.emit(&event_name, params);
                        }
                    }
                }
            }

            SupervisorCmd::Terminated {
                generation: term_gen,
                code,
            } => {
                // Only fail pending requests belonging to this exact generation!
                let stale_ids: Vec<u64> = pending
                    .iter()
                    .filter(|(_, e)| e.generation == term_gen)
                    .map(|(&id, _)| id)
                    .collect();

                for id in stale_ids {
                    if let Some(entry) = pending.remove(&id) {
                        let _ = entry.tx.send(Err(format!(
                            "EngineUnavailable: process terminated (code: {:?})",
                            code
                        )));
                    }
                }

                if term_gen == generation {
                    is_running.store(false, Ordering::SeqCst);
                    child = None;
                    for waiter in ready_waiters.drain(..) {
                        let _ = waiter.send(Err("Engine terminated before ready".to_string()));
                    }
                }
            }

            SupervisorCmd::Shutdown { reply } => {
                is_shutting_down.store(true, Ordering::SeqCst);
                if let Some(mut c) = child.take() {
                    let msg = format!(
                        "{}\n",
                        json!({ "jsonrpc": "2.0", "id": 0, "method": "system.shutdown", "params": {} })
                    );
                    let _ = c.write(msg.as_bytes());
                    tokio::time::sleep(Duration::from_millis(250)).await;
                    kill_child_process_tree(c);
                }
                is_running.store(false, Ordering::SeqCst);
                for (_, entry) in pending.drain() {
                    let _ = entry.tx.send(Err("EngineUnavailable: shutting down".to_string()));
                }
                let _ = reply.send(());
                break;
            }
        }
    }
}

fn spawn_sidecar(
    app_handle: &AppHandle,
    app_data_dir: &Path,
    cmd_tx: &mpsc::UnboundedSender<SupervisorCmd>,
    new_generation: u64,
) -> Result<(u64, CommandChild), String> {
    let bundle_path = find_bundle_path(app_handle);
    info!(generation = new_generation, bundle = ?bundle_path, "Spawning Node engine sidecar");

    let bundle_dir = bundle_path.parent().map(|p| p.to_path_buf()).unwrap_or_else(|| PathBuf::from("."));
    let node_modules_dir = bundle_dir.join("node_modules");
    let models_dir = app_data_dir.join("models");

    let mut env_vars = HashMap::new();
    env_vars.insert("KAARJOO_APP_DATA_DIR".to_string(), app_data_dir.to_string_lossy().to_string());
    env_vars.insert("KAARJOO_MODELS_DIR".to_string(), models_dir.to_string_lossy().to_string());
    if let Ok(res_dir) = app_handle.path().resource_dir() {
        env_vars.insert("KAARJOO_RESOURCES_DIR".to_string(), res_dir.to_string_lossy().to_string());
    }
    if node_modules_dir.exists() {
        env_vars.insert("NODE_PATH".to_string(), node_modules_dir.to_string_lossy().to_string());
    }

    let sidecar_cmd = app_handle
        .shell()
        .sidecar("binaries/node")
        .map_err(|e| format!("Failed to locate bundled node sidecar: {}", e))?
        .args([bundle_path.to_string_lossy().to_string()])
        .envs(env_vars);

    let (mut rx, child) = sidecar_cmd
        .spawn()
        .map_err(|e| format!("Failed to spawn node sidecar: {}", e))?;

    let tx_events = cmd_tx.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    let _ = tx_events.send(SupervisorCmd::StdoutChunk {
                        generation: new_generation,
                        bytes,
                    });
                }
                CommandEvent::Stderr(bytes) => {
                    let text = String::from_utf8_lossy(&bytes);
                    for line in text.lines() {
                        if !line.trim().is_empty() {
                            warn!(generation = new_generation, "[engine stderr] {}", line);
                        }
                    }
                }
                CommandEvent::Terminated(payload) => {
                    let _ = tx_events.send(SupervisorCmd::Terminated {
                        generation: new_generation,
                        code: payload.code,
                    });
                    break;
                }
                CommandEvent::Error(err) => {
                    error!(generation = new_generation, "Engine process error: {}", err);
                }
                _ => {}
            }
        }
    });

    Ok((new_generation, child))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_byte_line_framer_handles_split_persian_utf8_across_chunks() {
        let mut framer = ByteLineFramer::new();
        let line = "{\"msg\":\"سلام دنیا\"}\n";
        let bytes = line.as_bytes();
        // Split right in the middle of the multi-byte UTF-8 sequence for 'س'
        let split_at = 9;
        assert!(framer.push_bytes(&bytes[..split_at]).is_empty());
        let out = framer.push_bytes(&bytes[split_at..]);
        assert_eq!(out, vec!["{\"msg\":\"سلام دنیا\"}"]);
    }

    #[test]
    fn test_byte_line_framer_caps_oversized_lines() {
        let mut framer = ByteLineFramer::new();
        let big = vec![b'a'; MAX_LINE_BYTES + 10];
        assert!(framer.push_bytes(&big).is_empty());
        assert!(framer.buf.is_empty());
    }

    #[test]
    fn test_per_method_timeouts_are_configured() {
        assert_eq!(timeout_for_method("system.ping"), Duration::from_secs(5));
        assert_eq!(timeout_for_method("profile.parseAndExtract"), Duration::from_secs(180));
        assert_eq!(timeout_for_method("application.execute"), Duration::from_secs(180));
        assert_eq!(timeout_for_method("application.submitReviewed"), Duration::from_secs(120));
        assert_eq!(timeout_for_method("other.method"), Duration::from_secs(60));
    }

    #[tokio::test]
    async fn test_fake_node_script_cancel_and_split_utf8() {
        use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
        use tokio::process::Command;

        let script = r#"
            const readline = require('readline');
            const rl = readline.createInterface({ input: process.stdin });
            rl.on('line', (line) => {
                const req = JSON.parse(line);
                if (req.method === 'echo.persian') {
                    const out = JSON.stringify({ jsonrpc: '2.0', id: req.id, result: { text: 'سلام' } }) + '\n';
                    const b = Buffer.from(out, 'utf8');
                    process.stdout.write(b.subarray(0, 38));
                    setTimeout(() => process.stdout.write(b.subarray(38)), 10);
                } else if (req.method === '$/cancelRequest') {
                    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id: req.params.id, error: { code: -32800, message: 'cancelled' } }) + '\n');
                }
            });
        "#;

        let mut child = Command::new("node")
            .args(["-e", script])
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .spawn()
            .expect("node must be available for test");

        let mut stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();
        let mut reader = BufReader::new(stdout);

        stdin.write_all(b"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"echo.persian\"}\n").await.unwrap();
        let mut buf = Vec::new();
        reader.read_until(b'\n', &mut buf).await.unwrap();
        let s = String::from_utf8(buf).unwrap();
        assert!(s.contains("سلام"));

        stdin.write_all(b"{\"jsonrpc\":\"2.0\",\"method\":\"$/cancelRequest\",\"params\":{\"id\":2}}\n").await.unwrap();
        let mut buf2 = Vec::new();
        reader.read_until(b'\n', &mut buf2).await.unwrap();
        let s2 = String::from_utf8(buf2).unwrap();
        assert!(s2.contains("cancelled"));

        let _ = child.kill().await;
    }
}
