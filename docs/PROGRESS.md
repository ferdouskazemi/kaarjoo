# Kaarjoo Progress Log

## Phase 0: Foundation, Architecture, & Spikes
- **Status:** In Progress
- **Current Task:** Monorepo setup, technical spikes, and cross-platform utilities integration

### Completed
- [x] Master prompt analysis and user alignment.
- [x] Evaluation of `open-antigravity-patcher-main.zip` for Section 5.1 and extraction of reusable system engineering patterns (cross-platform discovery, atomic writes, macOS signing & quarantine removal, process management).
- [x] Git repository initialization with strict `.gitignore`.
- [x] Core documentation setup: `AGENTS.md`, `GEMINI.md`, `docs/MASTER_PROMPT.md`, `docs/design-references.md`.
- [x] Rust toolchain setup initiated via `rustup`.

### In Progress
- [ ] Monorepo workspace configuration (`pnpm-workspace.yaml`, root `package.json`, TypeScript config).
- [ ] Cross-platform system utility package (`packages/shared` / `packages/engine` system modules).
- [ ] Desktop shell setup (Tauri 2 + React 19 + Vite + Tailwind CSS v4 + shadcn/ui + Lucide).
- [ ] Bilingual typography and RTL support (Vazirmatn & Inter).
- [ ] Technical Spikes:
  - Spike 1: Node 22 sidecar stdio JSON-RPC 2.0 communication.
  - Spike 2: SQLite database initialization & migrations with `sqlx`.
  - Spike 3: Playwright driving system Chrome/Edge with isolated profile.
  - Spike 4: `node-llama-cpp` GGUF model loading & JSON grammar validation.
  - Spike 5: Persian RTL PDF generation via Playwright.

### Known Issues & Notes
- On Windows, `pnpm.cmd` must be used due to PowerShell script execution policy.
- Host Chrome/Edge discovery leverages Windows Registry (`winreg`) and standard Program Files heuristics adapted from `open-antigravity-patcher`.
