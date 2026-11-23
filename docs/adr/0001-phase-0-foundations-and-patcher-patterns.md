# 0001: Phase 0 Foundations, Technical Spikes, and System Reliability Patterns

## Status
Accepted

## Context
Kaarjoo is a local-first, zero-monthly-cost AI job application assistant for macOS and Windows.
To ensure high accuracy, responsiveness, and resilience, Phase 0 required verifying five critical technical spikes and establishing the architectural foundation:
1. Driving system browsers (Chrome/Edge) without forcing a 150MB Chromium download.
2. Safe bidirectional communication between Tauri 2 (Rust) and the Node.js 22 LTS engine (Sidecar) via JSON-RPC 2.0 stdio.
3. Perfect Persian (RTL) and English (LTR) document generation via `page.pdf()`.
4. Solid cross-platform system utilities for atomic file operations, process termination, and code signing.

In addition, the user provided `open-antigravity-patcher-main.zip` for reference under Section 5.1. While it is a Python CLI patcher rather than a UI component kit, its underlying low-level system engineering techniques offered battle-tested solutions for cross-platform desktop integration.

## Decisions

### 1. Host Browser Discovery (Adapted from `open-antigravity-patcher`)
Instead of bundling Chromium or guessing paths, we implemented `discoverSystemBrowsers()`:
- **Windows:** Checks `ProgramFiles`, `ProgramFiles(x86)`, and `LOCALAPPDATA` for Chrome, Edge, and Brave.
- **macOS:** Inspects `/Applications` and `~/Applications` for application bundles and their internal `Contents/MacOS` binaries.
- **Linux:** Scans standard `/usr/bin` locations.
*Verification:* Tested in Spike 3 with `playwright-core` driving the detected system Chrome/Edge with an isolated user data directory. Verified clean launch, HTML execution, and teardown.

### 2. Atomic File Replacement (`atomicWriteFile`)
Adapted from `atomic_replace_posix` in `open-antigravity-patcher`:
- Writes to a `.tmp` file in the same directory using exclusive flags.
- Calls `fsync` to flush OS file buffers.
- Atomically replaces the destination file via `fs.rename`.
- Automatically unlinks temporary files on failure.
*Verification:* Tested with SHA-256 integrity checks in `utilities.test.ts`.

### 3. macOS Apple Silicon & Universal Binary Resilience
Adapted from `resign_macos_bundle` and `resign_macos_binary`:
- Automated ad-hoc signing (`codesign --force --deep --sign -`).
- Clearing quarantine flags (`xattr -dr com.apple.quarantine`).
- Clearing immutable file flags (`chflags -R nouchg`).
This mitigates SIGKILL crashes on Apple Silicon when running local Node sidecar bundles and native `node-llama-cpp` addons.

### 4. Sidecar stdio JSON-RPC 2.0 Protocol
- Implemented `StdioRpcServer` in `packages/engine`.
- Strict newline-delimited JSON-RPC 2.0 protocol over `stdin`/`stdout`.
- Internal logging isolated to `stderr` to preserve protocol purity.
*Verification:* Tested in Spike 1 with automated `system.ping`, `system.discoverBrowsers`, and `system.getHardwareSpecs` round trips.

### 5. High-Fidelity Persian RTL PDF Generation
- Tested generating ATS-compliant Persian resumes using Playwright `page.pdf()`.
*Verification:* Tested in Spike 4 with a 54KB Persian PDF with full RTL shaping, clean margins, and proper font rendering.

## Consequences
- No external paid APIs needed.
- No heavy Chromium downloads required for 95%+ of users.
- Reliable foundation in place to proceed to Phase 1 (Ingestion & Profile Extraction).
