# Kaarjoo (کارجو) - Agent Guidelines & Architecture

## Project Summary
Kaarjoo is a production-grade, local-first AI job application desktop app for macOS (Apple Silicon + Intel) and Windows 10/11.
It extracts structured profiles from multi-format resumes, searches reputable job boards via polite public adapters, matches & re-ranks jobs with local AI, generates tailored resumes/cover letters with strict truthfulness guarantees, and assists with form filling in a real browser.

**Hard Constraint:** ZERO paid or keyed external APIs. 100% of AI runs locally on the user's hardware.

## Stack Overview
- **Desktop Shell:** Tauri 2 (Rust core, SQLite with `sqlx`, WAL mode, embedded migrations, `tauri-specta`).
- **UI:** React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui primitives, Motion, TanStack Router & Query, Lucide icons.
- **i18n & Typography:** Persian (fa, RTL, default) with `Vazirmatn` & English (en, LTR) with `Inter`. `date-fns` & `date-fns-jalali`.
- **Engine (Sidecar):** Node.js 22 LTS bundled with esbuild, JSON-RPC 2.0 over stdio.
- **Browser Automation:** Playwright driving system Google Chrome / Microsoft Edge with an isolated profile.
- **Local AI:** `node-llama-cpp` with GGUF models, JSON-schema grammars for guaranteed valid outputs, and local multilingual embeddings (`bge-m3` / `multilingual-e5`).
- **System Utilities (Inspired by open-antigravity-patcher):**
  - Cross-platform browser and application path discovery (Registry on Windows, Bundle structure on macOS, POSIX paths).
  - Atomic file writing and sync (`atomic_replace_posix`, `fsync_dir`, safe temp files).
  - macOS code-signing and Gatekeeper quarantine clearing (`codesign --force --sign -`, `xattr -dr com.apple.quarantine`).
  - Safe process termination and UAC elevation handling.

## Monorepo Folder Map
```
kaarjoo/
├── apps/
│   └── desktop/        # Tauri 2 app (src-tauri Rust core + src React 19 UI)
├── packages/
│   ├── engine/         # Node 22 sidecar (RPC, parsing, AI, Playwright automation)
│   ├── shared/         # Zod schemas, types, constants shared across UI & Engine
│   ├── adapters/       # Job board source adapters (ACBAR, Jobs.af, Greenhouse, Lever, etc.)
│   └── ats/            # ATS form fillers (Greenhouse, Lever, Ashby, Workable, Generic) & mock forms
├── eval/               # Evaluation suites (30+ golden resumes, matching benchmarks)
├── docs/               # Architecture Decision Records (adr/), PROGRESS.md, MASTER_PROMPT.md
└── AGENTS.md           # Persistent agent instruction memory (this file)
```

## Primary Commands
- `pnpm dev`: Start Tauri development mode (Vite UI + Rust core + Node sidecar)
- `pnpm build`: Build production bundles (macOS universal `.dmg`, Windows NSIS `.exe`)
- `pnpm test`: Run test suites across workspace (`vitest` + `cargo test`)
- `pnpm lint`: Run TypeScript typecheck, ESLint, Prettier, `cargo clippy`, and `cargo fmt`
- `pnpm eval`: Run resume extraction and matching accuracy evaluation scripts

## Non-Negotiable Rules
1. **Zero External Paid/Keyed APIs:** Never call or require an OpenAI, Anthropic, Gemini, Adzuna, or RapidAPI key.
2. **Local AI Grounding & Truthfulness:** Never allow free-form ungrounded LLM output. Always use JSON schema grammars. Verify all resume claims against extracted facts before showing or exporting.
3. **Responsible Automation:** Respect site terms and robots.txt. Never bypass CAPTCHAs, bot detections, or paywalls. In default Review mode, pause for user confirmation.
4. **Bilingual & RTL-First:** All UI must render cleanly in Persian (RTL) and English (LTR). Use CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`).
5. **Quality over Speed:** Every feature must be typed end-to-end, tested against real fixtures, with designed loading/empty/error states.
6. **Communicate with User in Persian:** Explain decisions simply and clearly in Persian; keep code, commits, and technical docs in English.
