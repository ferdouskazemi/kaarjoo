# Kaarjoo Security Architecture & Threat Model

Kaarjoo is a local-first desktop application that parses untrusted user documents, crawls external job boards, renders tailored PDF/DOCX artifacts, and drives a real browser on third-party ATS sites. This document describes our threat model and the enforced controls.

## 1. Threat Model

### Threat A: Compromised Webview / XSS in Desktop UI
- **Risk:** Untrusted job descriptions, company names, or résumé text rendered in the Tauri webview could attempt to execute arbitrary JavaScript or abuse Tauri IPC to read local files (`~/.ssh`, credentials), spawn shells, or exfiltrate data.
- **Controls:**
  1. **Strict Capabilities (`apps/desktop/src-tauri/capabilities/default.json`):** `fs:default`, `shell:default`, `process:default`, and `dialog:default` are removed from the webview. Only window controls, `dialog:allow-open`/`save`, `notification:default`, and `updater:default` are permitted. Sidecar processes are spawned exclusively from Rust.
  2. **Content Security Policy (`apps/desktop/src-tauri/tauri.conf.json`):** `script-src 'self'`, `connect-src ipc: http://ipc.localhost`, `img-src 'self' asset: data:` (no `https:` remote image tracking), and locally bundled `Inter`, `Vazirmatn`, and `JetBrains Mono` `.woff2` fonts under `apps/desktop/public/fonts/` (no Google Fonts origins).
  3. **No Arbitrary File Paths from Webview:** `profile_import_resume()` opens the native file picker in Rust, validates size (≤ 25 MB), extension, and magic bytes, copies the file to `appDataDir/sources/<sha256>.<ext>`, and passes only that internal path to the engine.

### Threat B: Malicious Résumé File / Path Traversal / HTML Injection
- **Risk:** A crafted résumé containing `<script>`, `<img src=x onerror=...>`, or external tracking URLs could execute in the headless Chromium PDF exporter or leak local data; or crafted filenames could traverse directories (`../../etc/passwd`, UNC `\\host\share`).
- **Controls:**
  1. **Magic-Byte & Size Verification (`commands.rs`):** All imported files are checked against expected magic bytes (`%PDF-`, `PK\x03\x04`, OLE2, `{\rtf`, PNG/JPEG/WEBP, valid UTF-8) and capped at 25 MB.
  2. **Engine Path Guard (`packages/engine/src/utils/pathGuard.ts`):** `documents.exportPdf` and `documents.exportDocx` no longer accept arbitrary `outputPath`. All export outputs resolve strictly inside `appDataDir/exports`, and input paths must reside in `appDataDir/sources`, `exports`, or `screenshots`. Traversal (`..`), absolute paths, UNC paths, and NUL bytes are rejected.
  3. **HTML Escaping & Isolated PDF Rendering:** All document templates escape interpolated values via `escapeHtml()` / `escapeAttr()`. `exportToPdf()` launches a fresh non-persistent browser context with `javaScriptEnabled: false` and aborts every network request via `page.route('**/*', ...)`.

### Threat C: Malicious Job Page / Persistent Browser Session Leakage
- **Risk:** A third-party ATS page could leave cookies, tokens, or malware-tainted browser profiles in `os.tmpdir()`, or attempt to auto-submit applications without user consent.
- **Controls:**
  1. **Isolated Browser Sessions:** Playwright `userDataDir` directories live under `appDataDir/browser-sessions/<appId>` instead of `os.tmpdir()`. Stale directories older than 24 hours are purged on startup, and completed/cancelled sessions are deleted immediately.
  2. **Review-First Enforcement:** Auto-submit on session rehydration is disabled; explicit user confirmation and `submitAttemptId` idempotency are required.
  3. **Ethical Guard:** CAPTCHA and anti-bot challenges trigger an immediate `needs_user` pause; Kaarjoo never bypasses CAPTCHAs.

### Threat D: Residual Data After Wipe
- **Risk:** "Delete all my data" leaving behind cached embeddings, source files, logs, or open browser sessions.
- **Controls:** `settings_wipe_all_data` closes active browser sessions, deletes rows across all user tables (`applications`, `application_steps`, `matches`, `jobs`, `experiences`, `skills`, `source_files`, `profiles`, `tasks`, `embedding_vectors`, and non-language `settings`), removes `sources/`, `exports/`, `screenshots/`, `browser-sessions/`, and `logs/` (with optional `models/` removal), and returns a deletion summary.
