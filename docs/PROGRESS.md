# Kaarjoo Progress Log

> **Audit Status Note (2026-11-24):** In accordance with the "Truth First" rule, all phase statuses have been audited and reset to reflect the reality of the working desktop application. Features that exist only as unit tests, engine scripts, or mock UI state are marked **PARTIAL** or **ENGINE-ONLY (not wired)**. See [`docs/AUDIT.md`](./AUDIT.md) for full evidence and file:line proofs.

---

## Current Overall Status
* **Phase 0: Foundation, Architecture, & Spikes** — **PARTIAL** (Rust shell runs, Vite UI renders; sidecar not spawned, SQLite not opened)
* **Phase 1: Ingestion and Profile Extraction** — **PARTIAL** (Parsers work in Node/Vite; no OCR, no coordinate bounding box overlays, profile not in DB, eval is 3 resumes)
* **Phase 2: Sources and Discovery** — **PARTIAL** (Adapters & dedup exist in engine; UI uses Vite dev proxy to 6 boards; fails in production build due to CSP/CORS)
* **Phase 3: Matching and Ranking (Local AI)** — **PARTIAL** (TF-IDF vectorizer & heuristics exist; no `node-llama-cpp`, score clamped 70–98 in UI, eval is 6 pairs)
* **Phase 4: Tailored Documents & Truthfulness Guard** — **PARTIAL** (ATS templates & truthfulness guard exist in engine; UI diff studio cannot invoke Playwright `page.pdf()`)
* **Phase 5: Application Engine (Form Filling & ATS Drivers)** — **ENGINE-ONLY / MOCK IN UI** (Playwright fillers pass unit tests against mock HTML; UI queue uses `setTimeout` delays and Unsplash photos)
* **Phase 6: Application Tracker, Kanban & Analytics** — **UI-ONLY (mock)** (Kanban, table, and KPIs operate on in-memory `mockInitialApplications`; no SQLite persistence)
* **Phase 7: Polish, Packaging & Release** — **PARTIAL / INCOMPLETE** (NSIS target configured, but no `externalBin` or native resources; 56 missing keys in `fa.json`, 125 inline `isRtl` ternaries; `pnpm lint` fails)

---

## Phase 0: Foundation, Architecture, & Spikes
- **Status:** PARTIAL

### Completed & Working
- [x] Initialized Git repository with monorepo structure via `pnpm` workspaces (`apps/desktop`, `packages/engine`, `packages/shared`, `packages/adapters`, `packages/ats`, `eval/`, `docs/`).
- [x] Evaluated `open-antigravity-patcher-main.zip` and integrated reusable low-level patterns (`discovery.ts`, `atomic.ts`, `codesign.ts`, `process.ts`).
- [x] Built desktop UI shell in React 19 + TypeScript + Vite + Tailwind CSS v4 with custom TitleBar and Command Palette (`cmdk`).
- [x] Node 22 Engine esbuild bundle (`packages/engine/dist/bundle.mjs`) builds cleanly.
- [x] Tauri 2 desktop app compiles cleanly with MSVC toolchain (`cargo check` passes in 5.7s).
- [x] Standalone technical spikes tested in isolation via Node scripts (JSON-RPC stdio round-trip, Playwright launching system Chrome, Persian PDF generation via `page.pdf()`).

### What is Missing
- [ ] **Sidecar Lifecycle:** Rust core (`apps/desktop/src-tauri/src/lib.rs`) does **not** spawn the Node engine sidecar.
- [ ] **SQLite Database:** `sqlx` is not added to `src-tauri/Cargo.toml`; embedded migrations (`20260101_init.sql`) are never executed; no database connection is opened.
- [ ] **Tauri IPC Bridge:** Only `get_system_status` is exposed in Rust; no typed commands relay UI actions to the Node engine.

---

## Phase 1: Ingestion and Profile Extraction
- **Status:** PARTIAL

### Completed & Working
- [x] Bilingual text normalizer (`normalizer.ts`): Arabic letter normalization (`ی/ک`), ZWNJ handling, and numeral conversion.
- [x] Section heading detector (`sections.ts`): Covers standard resume sections in Persian and English.
- [x] Deterministic contact, experience, and education extractors in `@kaarjoo/engine`.
- [x] Skills taxonomy extractor (`skills.ts`): Canonical ESCO dictionary with Persian/English alias mapping.
- [x] Multi-format document parsers in `@kaarjoo/engine` (`pdfjs-dist`, `mammoth`, plain text).
- [x] Multi-file profile merger & conflict resolver in `@kaarjoo/engine/src/ingestion/merger.ts`.
- [x] Split-view Profile review UI (`apps/desktop/src/views/ProfileView.tsx`).

### What is Missing
- [ ] **OCR Engine:** `tesseract.js` is not installed; scanned PDFs cannot be OCRed.
- [ ] **Bounding Box Overlays:** UI parser (`documentParser.ts`) outputs line numbers rather than exact coordinate bounding boxes.
- [ ] **Database Persistence:** Candidate profiles are stored in local React/Zustand state; not saved to SQLite.
- [ ] **Realistic Evaluation Dataset:** `eval/resumes/` contains only 3 synthetic text files instead of the mandated 30+ golden resumes across varied formats.

---

## Phase 2: Sources and Discovery
- **Status:** PARTIAL

### Completed & Working
- [x] Zero Paid/Keyed APIs Architecture in `@kaarjoo/adapters`.
- [x] Polite crawler engine (`client.ts`, `robots.ts`): `p-queue` rate-limiting, jittered delays, robots.txt parser, and ETag conditional caching.
- [x] 3-Tier deduplication pipeline in `@kaarjoo/adapters/src/dedup/` (canonical URL, normalized tuple, 64-bit SimHash).
- [x] Extraction pipeline for schema.org `JobPosting` JSON-LD and HTML-to-Markdown conversion via `turndown`.
- [x] 18 seeded technology companies with ATS types in `packages/adapters/src/companies/seed.ts`.
- [x] Desktop Job Discovery UI (`apps/desktop/src/views/JobsView.tsx`) with filter bar and job cards.

### What is Missing
- [ ] **Production Network Architecture:** UI fetches jobs in WebView using a Vite dev proxy (`/api/greenhouse`); fails in production build due to CSP (`tauri.conf.json:28` lacks `connect-src`) and CORS.
- [ ] **Engine Wiring:** Adapters and deduplication pipeline in `packages/adapters` are not invoked by the desktop UI.
- [ ] **Company Directory Integration:** UI hardcodes a separate 6-company list instead of importing the 18 seeded companies.
- [ ] **Background Crawler:** No scheduler or background crawl task exists in Rust core.

---

## Phase 3: Matching and Ranking (Local AI)
- **Status:** PARTIAL

### Completed & Working
- [x] Hard filters engine (`hardFilters.ts`): company exclusions, workplace/remote mismatch, clearance/visa restrictions.
- [x] Sparse TF-IDF and N-gram vectorizer with cosine similarity (`embeddings.ts`).
- [x] ESCO skill coverage engine (`skillCoverage.ts`) with transferable skill scoring.
- [x] Match Ring SVG component and score breakdown drawer in UI.

### What is Missing
- [ ] **Local LLM Integration:** `node-llama-cpp` is not installed; `rerank.ts` is a rule-based template rather than local AI inference.
- [ ] **Neural Multilingual Embeddings:** No local embedding model (`bge-m3` or `multilingual-e5`) is bundled or executed.
- [ ] **Unclamped Real Scoring:** UI `liveJobService.ts` clamps all scores to 70–98 and injects fallback web development skills.
- [ ] **Matching Benchmark:** Evaluates only 1 candidate against 6 jobs; benchmark needs expansion.

---

## Phase 4: Tailored Documents & Truthfulness Guard
- **Status:** PARTIAL

### Completed & Working
- [x] 3 clean ATS-safe résumé templates (`ats-clean`, `modern-minimal`, `compact-technical`) in HTML/CSS supporting fa (RTL) and en (LTR).
- [x] Rule-based bullet reordering and cover letter generator in `packages/engine/src/documents/tailor.ts`.
- [x] Truthfulness guard (`truthfulness.ts`) verifying facts against candidate profile with 11 unit tests.
- [x] Screening answer bank (`answerBank.ts`).
- [x] Side-by-side Diff modal UI (`TailoredDocumentsModal.tsx`).

### What is Missing
- [ ] **Export Wiring:** UI export buttons cannot trigger engine Playwright `page.pdf()` or DOCX generator because no IPC bridge exists.
- [ ] **Live Truthfulness Re-check:** UI edits do not dynamically re-run the engine truthfulness guard.

---

## Phase 5: Application Engine (Form Filling & ATS Drivers)
- **Status:** ENGINE-ONLY / MOCK IN UI

### Completed & Working
- [x] ATS form fillers in `@kaarjoo/ats/src/fillers/` for Greenhouse, Lever, Ashby, Workable, and generic HTML forms using Playwright.
- [x] DOM field detector, matcher, and mapper with strict EEO decline defaults.
- [x] Stop-and-Ask trigger on CAPTCHA challenge or login walls with zero bypass attempts.
- [x] 17 unit and Playwright integration tests passing against local mock HTML fixtures.

### What is Missing
- [ ] **Real Desktop Execution:** Desktop UI (`applicationStore.ts:312-408`) simulates form filling using `setTimeout` delays and Unsplash photos. Real Playwright browser automation is not triggered from the app.
- [ ] **Job Queue in Rust Core:** No persistent queue table or task executor exists in Tauri backend.

---

## Phase 6: Application Tracker, Kanban & Analytics
- **Status:** UI-ONLY (Mock Data)

### Completed & Working
- [x] Interactive Kanban Board (`KanbanBoard.tsx`) with 6 pipeline stages and drag-and-drop.
- [x] Full-text search, filtering, and sorting in Applications Table View (`ApplicationsTableView.tsx`).
- [x] Application Detail Drawer (`ApplicationDetailDrawer.tsx`) with snapshot, timeline, and notes tabs.
- [x] Dashboard KPI widgets and RFC-compliant CSV export.

### What is Missing
- [ ] **Real Data Persistence:** Tracker runs entirely on `mockInitialApplications` (Spotify, Figma, GitLab, etc.) in local Zustand state; records are not loaded from or saved to SQLite.
- [ ] **Real Execution Artifacts:** Screenshots and confirmation evidence are hardcoded external Unsplash URLs.

---

## Phase 7: Polish, Packaging & Release
- **Status:** PARTIAL / INCOMPLETE

### Completed & Working
- [x] Custom TitleBar, Obsidian dark theme, and typography system (Vazirmatn & Inter).
- [x] Windows NSIS installer profile configured in `apps/desktop/src-tauri/tauri.conf.json`.
- [x] Persian User Guide authored in `docs/user-guide-fa.md`.
- [x] Monorepo build passes: TypeScript builds clean, Engine bundles to 5.5MB, Desktop builds in 8.3s.

### What is Missing
- [ ] **Sidecar & Resource Bundling:** `tauri.conf.json` does not include `"externalBin"` or native `"resources"`. Production installer does not include Node engine.
- [ ] **i18n Completion:** 56 translation keys are missing in `fa.json`; 125 inline `isRtl ?` ternaries and hardcoded strings must be replaced with i18n keys.
- [ ] **Lint Tooling:** `pnpm lint` fails because `eslint` is missing from `devDependencies`; Prettier style issues on 160 files.
- [ ] **CI Matrix:** `.github/workflows/` does not exist.

---

## Prioritized Fix Roadmap

1. **P0: Core Process Architecture & Sidecar Spawning**
   - Add `sqlx` and SQLite migrations to Rust core; open local database on launch.
   - Configure `"externalBin"` in `tauri.conf.json` and spawn the Node engine sidecar from Rust.
   - Implement Tauri IPC commands to bridge UI to Node engine stdio.
   - Move job crawling out of WebView into Node adapters; fix CSP `connect-src`.
   - Remove `mockInitialApplications`, `setTimeout` loops, and Unsplash photos from `applicationStore.ts`.
2. **P1: Real Local AI & Matching Engine**
   - Remove clamped scoring [70, 98] and fallback skills from `liveJobService.ts`; route scoring through engine.
   - Install `node-llama-cpp` and configure local GGUF model management.
   - Replace TF-IDF word counts with local multilingual embeddings (`bge-m3`).
   - Install `tesseract.js` for scanned document OCR.
3. **P2: i18n, Tooling, & Real Evaluations**
   - Add 56 missing keys to `fa.json`; refactor 125 inline `isRtl` ternaries to `t()`.
   - Install `eslint` in root `devDependencies` and format codebase with Prettier.
   - Populate `eval/resumes/` with 30+ golden resumes across varied formats.
