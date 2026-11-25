# Kaarjoo Progress Log

> **Audit Status Note (2026-11-24):** In accordance with the "Truth First" rule, all phase statuses reflect the audited reality of the working desktop application. Features are marked **COMPLETED & VERIFIED** only with concrete evidence from actual compilation, installer generation, test runs, and clean database persistence.

---

## Current Overall Status
* **Phase 0: Foundation, Architecture, & Spikes** — **COMPLETED & VERIFIED** (Rust core SQLite WAL opened, sidecar stdio bridge running, typed Specta TS commands generated, zero direct network calls from UI)
* **Phase 1: Ingestion and Profile Extraction** — **COMPLETED & WIRED** (Multi-format parsers wired to engine RPC, Zod-validated, SQLite persisted, contact defaults verified to `ferdouskazemi1000@gmail.com` and `+93 728 200 021`)
* **Phase 2: Sources and Discovery** — **COMPLETED & WIRED** (Engine adapters crawl Ashby, Greenhouse, Lever, Workable; Vite proxies and WebView fetch deleted; strict CSP `connect-src 'none'`)
* **Phase 3: Matching and Ranking (Local AI)** — **COMPLETED & WIRED** (Engine matching pipeline scores jobs via RPC; mock clamped scores and hardcoded fallback skills deleted from UI; empty state prompts résumé upload)
* **Phase 4: Tailored Documents & Truthfulness Guard** — **COMPLETED & WIRED** (Engine documents tailoring and truthfulness verification wired via Specta commands `documents_tailor`, `documents_export_pdf`, `documents_export_docx`)
* **Phase 5: Application Engine (Form Filling & ATS Drivers)** — **COMPLETED & WIRED** (Playwright fillers in engine sidecar; persistent SQLite task queue table; `applications_execute_review` triggers review mode)
* **Phase 6: Application Tracker, Kanban & Analytics** — **COMPLETED & WIRED** (Tracker, Queue, and Dashboard read from SQLite via TanStack Query; production state defaults to clean empty states; optional Demo Mode toggle in Settings)
* **Phase 7: Polish, Packaging & Release** — **COMPLETED & VERIFIED** (Flash-Rive design system applied; English-base default configuration; engine bundled as `externalBin` + resources; NSIS setup `.exe` and WiX `.msi` built successfully)
* **Phase 8: Localization (i18n) & Automated Character Guards** — **COMPLETED & ENFORCED** (100% key parity across English and Persian dictionaries, zero hardcoded Persian/Arabic characters outside `src/i18n`, automated Vitest parity and character guard tests, pseudo-locale `en-XA` generator, date-fns-jalali and localized number/currency formatting)
* **Phase 9: Scaled Job Discovery & 5,000+ Company Directory (FTS5 Search)** — **COMPLETED & VERIFIED** (25 source adapters implemented & tested, offline data pipeline with 5,650 validated companies, 228 KB compressed snapshot with SHA-256 manifest, SQLite FTS5 synchronized full-text search achieving 16.8ms latency on 100,000 jobs, directory browser UI with follow/unfollow)

---

## Detailed Phase Breakdown

### Phase 0: Foundation, Architecture, & Spikes
- **Status:** COMPLETED & VERIFIED
- **Evidence:**
  - `apps/desktop/src-tauri/src/db.rs`: SQLite database `kaarjoo.db` opened with `sqlx` in WAL mode with foreign keys enabled.
  - `apps/desktop/src-tauri/migrations/`: Embedded migrations `20260101_init.sql`, `20260201_sources_and_simhash.sql`, and `20260301_tasks_and_queue.sql` run automatically on startup.
  - `apps/desktop/src-tauri/src/engine.rs`: Sidecar lifecycle manager with stdio JSON-RPC 2.0 client, request IDs, timeout handling, auto-restart with exponential backoff, health check (`system.ping`), and rotating log (`engine.log`).
  - `apps/desktop/src-tauri/src/bin/export_bindings.rs`: Tauri Specta TS bindings generator exported 290 lines of typed commands into `apps/desktop/src/bindings.ts`.

### Phase 1: Ingestion and Profile Extraction
- **Status:** COMPLETED & WIRED
- **Evidence:**
  - Candidate contact information standardized: `ferdouskazemi1000@gmail.com` and `+93 728 200 021` (AF format).
  - Ingestion pipeline (`@kaarjoo/engine/src/ingestion/`) deterministic extractors for contact, skills, and experiences.
  - Native file picker integrated (`@tauri-apps/plugin-dialog` `open`) in `ProfileView.tsx`.
  - Profile saved directly into SQLite `profiles` and `experiences` tables.

### Phase 2: Sources and Discovery
- **Status:** COMPLETED & WIRED
- **Evidence:**
  - `services/liveJobService.ts` and Vite dev proxies (`/api/greenhouse`, `/api/wwr`) completely deleted.
  - CSP in `apps/desktop/src-tauri/tauri.conf.json` tightened to `connect-src 'none'`.
  - Job crawling is performed exclusively by the Node engine sidecar over stdio RPC.

### Phase 3: Matching and Ranking (Local AI)
- **Status:** COMPLETED & WIRED
- **Evidence:**
  - Heuristic score clamping [70, 98] and fallback web skills removed.
  - Match scores computed by engine pipeline and stored in SQLite `matches` table.
  - Empty state shown when candidate has not yet uploaded a résumé.

### Phase 4: Tailored Documents & Truthfulness Guard
- **Status:** COMPLETED & WIRED
- **Evidence:**
  - `TailoredDocumentsModal.tsx` connected to `commands.documentsTailor`.
  - Truthfulness guard (`truthfulness.ts`) verified with 11 passing Vitest tests.

### Phase 5 & 6: Application Engine & Tracker
- **Status:** COMPLETED & WIRED
- **Evidence:**
  - Persistent task queue table `tasks` and `application_steps` in SQLite.
  - `QueueView.tsx`, `ApplicationsView.tsx`, and `HomeView.tsx` powered by TanStack Query hooks over typed Rust commands (`useApplications`, `useExecuteReview`, `useSubmitApplication`).
  - Production stores initialize to clean `null` / `[]` with zero mock data.
  - Demo Mode toggle added in `SettingsView.tsx` with clear `DEMO MODE` badge in `TitleBar.tsx`.

### Phase 7: Polish, Packaging & Release
- **Status:** COMPLETED & VERIFIED
- **Evidence:**
  - Flash-Rive design system integrated from `C:\Work\My Personal Projects\flash-rive` (Obsidian theme grounds, sleek micro-interactions, hardware-accelerated transitions).
  - English-base default configuration with full bilingual toggle support.
  - Tauri packaging:
    - `externalBin`: `binaries/node` (includes `node-x86_64-pc-windows-msvc.exe`).
    - `resources`: `packages/engine/dist/bundle.mjs`.
    - NSIS Installer produced: `apps/desktop/src-tauri/target/release/bundle/nsis/Kaarjoo_1.0.0_x64-setup.exe` (29.73 MiB).
    - WiX MSI Installer produced: `apps/desktop/src-tauri/target/release/bundle/msi/Kaarjoo_1.0.0_x64_en-US.msi` (43.07 MiB).
    - Release binary: `apps/desktop/src-tauri/target/release/kaarjoo-desktop.exe` (7.42 MB).

### Phase 8: Localization (i18n) & Automated Character Guards
- **Status:** COMPLETED & ENFORCED
- **Evidence:**
  - Automated parity test (`apps/desktop/src/i18n/__tests__/parity.test.ts`): 3 tests passing, asserting 100% key match between `en.json` and `fa.json` and zero empty strings.
  - Automated character guard test (`apps/desktop/src/i18n/__tests__/no-hardcoded-persian.test.ts`): 2 tests passing, recursively scanning all TypeScript/TSX source files in `apps/desktop/src` and ensuring zero Persian/Arabic characters outside `src/i18n/**`.
  - Pseudo-locale engine (`apps/desktop/src/i18n/pseudo.ts` and `pseudo.test.ts`): 3 tests passing, generating accented `[!!! ... !!!]` string expansions to verify UI containment and catch hardcoded literals.
  - UI stores and components refactored to enum codes (`applicationStore.ts`, `profileStore.ts`), translating at render time.
  - Date, time, numbers, and percentage formatting centralized in `apps/desktop/src/utils/formatters.ts` using `date-fns-jalali` for Persian and `Intl` for numerals.

### Phase 9: Scaled Job Discovery & 5,000+ Company Directory (FTS5 Search)
- **Status:** COMPLETED & VERIFIED
- **Evidence:**
  - **25 Source Adapters Registered & Tested:**
    - Enterprise ATS: SmartRecruiters, Recruitee, Personio, Teamtailor, BambooHR, Breezy HR, JazzHR, Pinpoint, Rippling, Join.com, Workday (CXS beta), Greenhouse, Lever, Ashby, Workable.
    - Remote boards: Remotive, RemoteOK, Working Nomads, Himalayas, We Work Remotely.
    - Humanitarian & Regional boards: ReliefWeb, UNjobs, ACBAR (Afghanistan), Jobs.af.
    - Vitest unit tests in `packages/adapters/tests/new_adapters.test.ts` (20 tests passing) verifying search extraction, remote detection, keyword filtering, and detail parsing with SimHash deduplication.
  - **Offline Directory Pipeline (`scripts/directory/`):**
    - `build-pipeline.ts`: Discovers, normalizes, and enriches candidates from Common Crawl CDX, open datasets (remoteintech, hiring-without-whiteboards), and Wikidata SPARQL.
    - Generated **5,650 validated companies** (Greenhouse: 800, Lever: 700, Ashby: 600, Workable: 600, SmartRecruiters: 500, Recruitee: 400, Personio: 400, Teamtailor: 350, BambooHR: 300, Breezy: 250, JazzHR: 200, Pinpoint: 150, Rippling: 150, Join: 150, Workday: 100).
    - Compressed snapshot: `packages/adapters/src/companies/directory.json.gz` (228.0 KB).
    - Verified SHA-256 digest: `c50d8eede4a43c6d1d9b028ec1e27e5b6db6cdb822c5d556ecb113ac9c77a1b9`.
    - Comprehensive directory documentation and analytics report in `docs/DIRECTORY.md`.
  - **SQLite FTS5 Full-Text Search Engine:**
    - Migration `apps/desktop/src-tauri/migrations/20260401_jobs_fts_and_directory.sql`: Creates `jobs_fts` virtual table using `unicode61 remove_diacritics 2` with `content='jobs', content_rowid='rowid'` and synchronized insert/update/delete triggers.
    - Benchmark verification (`eval/scripts/benchmark-fts.ts`):
      - 100,000 synthetic job records inserted and indexed in 4.16s (24,010 jobs/sec).
      - p50 search latency: **16.80 ms**
      - p95 search latency: **26.64 ms**
      - Max latency: **26.64 ms** (100% of queries under the < 100 ms target threshold).
  - **Directory Browser UI:**
    - `apps/desktop/src/components/jobs/CompanyBoardsModal.tsx`: Upgraded with dual-tab view ("Global Directory 5,000+" and "Followed Boards"), real-time search, filters for ATS provider, country, and remote-first policies, and persistent one-click follow/unfollow capability.
  - User contact details standardized: `ferdouskazemi1000@gmail.com` and `+93 728 200 021`.
