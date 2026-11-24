# Comprehensive & Honest Codebase Audit: Kaarjoo (کارجو)

**Date:** 2026-11-24  
**Audit Target:** Repository Root (`C:\Work\kaarjoo`), Master Prompt Specification (`docs/MASTER_PROMPT.md` Sections 3.1–3.8 and 10), and Current Working Implementation.  
**Auditor Policy:** Strict Truth-First. Zero assumptions. A feature is marked "WORKS end-to-end" **only** if it functions in the actual desktop app with real production data, live APIs, active SQLite persistence, and real engine communication.

---

## 1. Executive Summary

A comprehensive architectural and code-level audit of the Kaarjoo repository reveals a fundamental architectural disconnect:

1. **Independent Disconnected Layers:** The project currently exists in three isolated compartments that do not communicate at runtime:
   - **Desktop Shell (`apps/desktop/src-tauri`):** A minimal Tauri 2 Rust application that registers only a single mock command (`commands::get_system_status`). It **never** spawns the Node.js engine sidecar, does not open or query SQLite (despite migration files existing on disk), and possesses no persistent job queue.
   - **Desktop UI (`apps/desktop/src`):** A React 19 SPA running in WebView2. It **never** invokes Tauri IPC commands (except window minimize/maximize in `TitleBar.tsx`), **never** imports or calls `@kaarjoo/engine`, and populates all views (Applications, Queue, Kanban, Tracker, KPIs, Profile) with hardcoded in-memory Zustand mock data (`mockInitialApplications`, mock `setTimeout` delays, and static Unsplash stock images).
   - **Engine & Adapters (`packages/engine`, `packages/adapters`, `packages/ats`):** A collection of unit-tested TypeScript algorithms and Playwright scripts. While these packages contain genuine logic for PDF parsing, text normalization, TF-IDF vectorization, truthfulness checks, and mock ATS fillers, they remain **100% disconnected** from the desktop frontend.
2. **Production Build Failure Risk:** Live job fetching in the UI (`liveJobService.ts`) relies on a development-only Vite proxy (`/api/greenhouse`) to bypass browser CORS. In a production build, the Content Security Policy (`tauri.conf.json:28`) lacks a `connect-src` directive, which will completely block outbound network requests from the WebView.
3. **Overstated Capabilities & Metric Illusion:**
   - Previous progress logs claimed **"All 7 Phases Fully Completed & Verified"** and **"100.0% accuracy"**.
   - In reality, the extraction evaluation evaluated only 3 synthetic plain-text files (not 30+ golden resumes across DOCX/PDF/scans), the matching benchmark evaluated 1 candidate against 6 jobs, the "local LLM re-ranker" is a heuristic template (`node-llama-cpp` is not installed), embeddings are unigram/bigram TF-IDF word counts, and OCR (`tesseract.js`) is completely missing.

---

## 2. In-Depth Investigation of the 10 Code Review Findings

### Point 1: Rust Core (`src-tauri/src/lib.rs`), Sidecar Spawning, SQLite, and Job Queue
- **Status:** MISSING / UNWIRED
- **Evidence:**
  - `apps/desktop/src-tauri/src/lib.rs:13-32`:
    ```rust
    mod commands {
        #[tauri::command]
        pub fn get_system_status() -> Result<SystemStatus, String> {
            Ok(SystemStatus { app_version: "0.1.0".to_string(), os: std::env::consts::OS.to_string(), is_ready: true })
        }
    }
    // Only commands::get_system_status is registered in generate_handler![]
    ```
  - `apps/desktop/src-tauri/Cargo.toml:15-27`: Dependencies list `tauri`, `tokio`, `serde`, `tracing`, and standard plugins. `sqlx`, `tauri-specta`, `keyring`, `sysinfo`, and `reqwest` are **not** present in `Cargo.toml`.
  - Migrations exist on disk (`apps/desktop/src-tauri/migrations/20260101_init.sql` and `20260201_sources_and_simhash.sql`), but **zero lines of Rust code** open, read, or execute them.
  - The Node engine sidecar (`packages/engine/dist/bundle.mjs`) is **never spawned** by Tauri's `tauri-plugin-shell`.
  - There is no background task queue, queue manager, or SQLite job table in Rust.

### Point 2: Frontend UI Isolation and Catalog of Mock/Hardcoded Data
- **Status:** UI-ONLY (Mock Simulation)
- **Evidence:**
  - Searching all TypeScript files in `apps/desktop/src` for `invoke(` yields **0 occurrences**. The UI does not call Tauri backend commands.
  - `apps/desktop/src/stores/applicationStore.ts:63-240`: Hardcodes `mockInitialApplications` with 7 pre-populated application records (`app_seed_001` to `app_seed_007` for Spotify, Figma, GitLab, Klarna, Stripe, Linear, Vercel).
  - `apps/desktop/src/stores/applicationStore.ts:111, 138, 374, 407`: Hardcodes external Unsplash photo URLs for review and confirmation screenshots:
    - `https://images.unsplash.com/photo-1517694712202-14dd9538aa97`
    - `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c`
    - `https://images.unsplash.com/photo-1551288049-bebda4e38f71`
  - `apps/desktop/src/stores/applicationStore.ts:312-339, 392`: Form execution is simulated entirely using JavaScript timer delays:
    ```ts
    await new Promise((r) => setTimeout(r, 600)); // navigating
    await new Promise((r) => setTimeout(r, 700)); // detecting
    await new Promise((r) => setTimeout(r, 700)); // filling
    await new Promise((r) => setTimeout(r, 600)); // uploading
    ```
    No Playwright browser automation or engine RPC is ever triggered when clicking "Start Automated Filling" or "Approve & Submit".
  - `apps/desktop/src/stores/profileStore.ts:13-75`: Hardcodes an initial full profile `INITIAL_CANDIDATE_PROFILE` with pre-extracted contact details, experiences, and skills.
  - `apps/desktop/src/views/JobsView.tsx:19-24`: Hardcodes `LIVE_COMPANY_BOARDS_DEFAULT` (6 boards: Linear, Ramp, OpenAI, GitLab, Cloudflare, Canonical).

### Point 3: Live Job Crawling, Vite Dev Proxy & Production CSP/CORS Blocking
- **Status:** PARTIAL / BROKEN IN PRODUCTION
- **Evidence:**
  - `apps/desktop/src/services/liveJobService.ts:124`:
    ```ts
    const url = `/api/greenhouse/v1/boards/${encodeURIComponent(company.slug)}/jobs?content=true`;
    ```
  - `apps/desktop/vite.config.ts:24-34`:
    ```ts
    proxy: {
      '/api/greenhouse': {
        target: 'https://boards-api.greenhouse.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/greenhouse/, ''),
      },
    }
    ```
  - `apps/desktop/src-tauri/tauri.conf.json:28`:
    ```json
    "csp": "default-src 'self' ipc: http://ipc.localhost; img-src 'self' asset: https: data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    ```
  - **Audit Finding:** In development mode (`pnpm dev` on port 1420), Vite proxies `/api/greenhouse` to `boards-api.greenhouse.io`. In a production build (`pnpm tauri build`), Vite is absent; requests to `/api/greenhouse` hit `http://localhost:1420` or `tauri://localhost`, resulting in 404/network errors. Furthermore, because `connect-src` is absent in `csp`, the default `default-src 'self' ipc:` forbids any outbound `fetch()` calls to external hosts like `api.ashbyhq.com`. Production jobs search is completely blocked by CSP and CORS.

### Point 4: Live Job Scoring Clamp [70, 98] and Fallback Skills
- **Status:** CONFIRMED HEURISTIC CLAMP
- **Evidence:**
  - `apps/desktop/src/services/liveJobService.ts:28-56`:
    ```ts
    const defaultSkills = userSkills.length > 0 ? userSkills : [
      'TypeScript', 'JavaScript', 'React', 'Next.js', 'Tailwind CSS', 'WordPress', 'Git', 'HTML', 'CSS', 'Redux', 'UI/UX Design', 'Figma'
    ];
    ...
    // Base score on match ratio
    const baseMatch = matched.length > 0 ? Math.min(96, 75 + matched.length * 4) : 72;
    const score = Math.max(70, Math.min(98, baseMatch));
    ```
  - `apps/desktop/src/services/liveJobService.ts:105`:
    ```ts
    matchedSkills: matched.length > 0 ? matched : ['React', 'TypeScript', 'Frontend'],
    ```
  - **Audit Finding:** If a candidate has no extracted skills, the service injects a hardcoded web development tech stack. The calculated score is strictly clamped to a minimum of 70 and a maximum of 98, artificially presenting all jobs as strong matches (72% default even with 0 matches). If matched skills are empty, it fabricates `['React', 'TypeScript', 'Frontend']`.

### Point 5: Local LLM Re-ranker, Missing `node-llama-cpp`, TF-IDF, and Missing OCR
- **Status:** MISSING LOCAL AI (Heuristic Only)
- **Evidence:**
  - `packages/engine/src/matching/rerank.ts:30-80`:
    ```ts
    /**
     * Calibrated rule & heuristic LLM-equivalent re-ranker for instant, zero-latency local scoring.
     */
    ```
    The "LLM re-ranker" is an array of hardcoded string formatting rules that check `if (semantic.titleSimilarity >= 60)` and push pre-written English sentences. Zero machine learning or LLM inference takes place.
  - Monorepo `package.json` and `packages/engine/package.json`:
    `pnpm ls node-llama-cpp tesseract.js` returns empty. `node-llama-cpp` and `tesseract.js` are **not installed dependencies**.
  - `packages/engine/src/matching/embeddings.ts:24-60`:
    `LocalSemanticEmbedder` is a sparse in-memory unigram and bigram TF-IDF counter with cosine similarity. It does not use neural embedding models (`bge-m3` or `multilingual-e5`).
  - Scanned PDF detection heuristic in `parsers/pdf.ts` detects `< 50` characters, but since `tesseract.js` is not installed, no OCR can be performed.

### Point 6: Evaluation Datasets and Synthetic "100%" Accuracy
- **Status:** UNREPRESENTATIVE BENCHMARKS
- **Evidence:**
  - `eval/resumes/` contains exactly 3 synthetic plain-text files:
    - `resume_01_fa_standard.txt`
    - `resume_02_en_standard.txt`
    - `resume_03_fa_en_mixed.txt`
  - `eval/scripts/run-eval.ts` evaluates only these 3 text files against manually authored JSON files, yielding an artificial 100.0%. Master Prompt Section 3.1 explicitly mandates: *"build `eval/resumes/` with at least 30 varied résumés (English, Persian, mixed; one-column, two-column, tables, scanned, LinkedIn export, Europass)"*.
  - `eval/matching/labeled_pairs.json` contains only 1 candidate (`Farhad Rostami`) and 6 jobs. `eval/scripts/run-matching-eval.ts` ranks these 6 pairs, yielding an artificial Precision@10 of 100.0%.

### Point 7: i18n Audit: Missing Translation Keys & Inline RTL Ternaries
- **Status:** PARTIAL & INCONSISTENT
- **Evidence:**
  - Automated analysis of translation dictionaries:
    - `apps/desktop/src/i18n/en.json`: **109 keys**
    - `apps/desktop/src/i18n/fa.json`: **53 keys**
    - **56 keys missing** in `fa.json` (e.g. `home.welcome`, `home.badge`, `home.weeklyGoal`, `home.avgScore`, `jobs.companyCount`, `jobs.syncingDesc`, `settings.backupRestore`, etc.).
  - Code analysis for inline `isRtl ? '...' : '...'` ternaries and hardcoded Persian string literals:
    - **Total inline `isRtl` ternary expressions: 125**
    - Per-file breakdown:
      - `apps/desktop/src/views/QueueView.tsx`: 28 `isRtl` ternaries, 34 inline Persian lines
      - `apps/desktop/src/components/tracker/ApplicationsTableView.tsx`: 21 `isRtl` ternaries, 34 inline Persian lines
      - `apps/desktop/src/components/tracker/ApplicationDetailDrawer.tsx`: 18 `isRtl` ternaries, 31 inline Persian lines
      - `apps/desktop/src/views/JobsView.tsx`: 16 `isRtl` ternaries, 20 inline Persian lines
      - `apps/desktop/src/components/tracker/DashboardKpisWidget.tsx`: 11 `isRtl` ternaries, 12 inline Persian lines
      - `apps/desktop/src/components/tracker/KanbanBoard.tsx`: 8 `isRtl` ternaries, 10 inline Persian lines
      - `apps/desktop/src/views/ProfileView.tsx`: 7 `isRtl` ternaries, 10 inline Persian lines
      - `apps/desktop/src/components/jobs/JobCard.tsx`: 5 `isRtl` ternaries, 5 inline Persian lines
      - `apps/desktop/src/views/ApplicationsView.tsx`: 4 `isRtl` ternaries, 5 inline Persian lines
      - `apps/desktop/src/components/jobs/CompanyBoardsModal.tsx`: 4 `isRtl` ternaries, 4 inline Persian lines
      - `apps/desktop/src/views/HomeView.tsx`: 3 `isRtl` ternaries, 3 inline Persian lines
      - `apps/desktop/src/components/documents/TailoredDocumentsModal.tsx`: 0 `isRtl` ternaries, 42 hardcoded Persian lines
      - `apps/desktop/src/views/SettingsView.tsx`: 0 `isRtl` ternaries, 28 hardcoded Persian lines

### Point 8: Company Directory Disconnect (18 Seeded in Engine vs 6 in UI)
- **Status:** DISCONNECTED DATA SOURCES
- **Evidence:**
  - `packages/adapters/src/companies/seed.ts:6-244` defines **18 premier tech companies** (Stripe, Figma, OpenAI, Datadog, Spotify, Klarna, DeepL, Revolut, Vercel, GitLab, Cloudflare, Linear, Ramp, HashiCorp, Elastic, Personio, Bolt, Deliveroo) with ATS types and metadata.
  - `apps/desktop/src/views/JobsView.tsx:19-24` defines an independent hardcoded list `LIVE_COMPANY_BOARDS_DEFAULT` with only **6 companies** (Linear, Ramp, OpenAI, GitLab, Cloudflare, Canonical).
  - The UI does not import or use `SEEDED_COMPANY_BOARDS` from `@kaarjoo/adapters`.

### Point 9: Packaging, Sidecar (`externalBin`), and Resource Bundling
- **Status:** INCOMPLETE PACKAGING CONFIGURATION
- **Evidence:**
  - `apps/desktop/src-tauri/tauri.conf.json:31-47`:
    - `"externalBin"` is **missing**. Tauri is not configured to bundle the Node 22 binary or sidecar executable.
    - `"resources"` is **missing**. Native dependencies, models, and esbuild bundles are not copied into the desktop installer bundle.
    - No updater configuration (`tauri-plugin-updater`) is configured.
  - A production installer produced by `pnpm tauri build` will contain only the static frontend assets and the Rust binary. It will not contain a runtime Node.js engine, making any engine-dependent features impossible to execute post-installation.

### Point 10: Real Benchmark Numbers & Command Outputs
- **Status:** VERIFIED RUNTIME DATA
- **Evidence:**
  1. **Vitest Test Suite:**
     - Command: `pnpm test`
     - Output: **23 test files passed, 82 tests passed, 0 failed** (Duration: 12.50s).
  2. **Typecheck & Monorepo Build:**
     - Command: `pnpm build` (`pnpm --filter shared build && pnpm --filter engine build && pnpm --filter desktop build`)
     - Output: Shared TS build clean; Engine esbuild bundle 5.5MB clean; Desktop Vite build clean in **8.33s**.
  3. **Linting Check:**
     - Command: `pnpm lint` (`eslint . && prettier --check .`)
     - Output: **FAILED (Exit code 1)**: `'eslint' is not recognized as an internal or external command` (`eslint` is missing from `devDependencies`). `prettier --check .` flagged style issues across **160 files**.
  4. **Rust Core Compilation:**
     - Command: `cargo check` in `apps/desktop/src-tauri`: Finished `dev` profile in **5.73s** (Clean, 0 warnings).
     - Command: `cargo check --release` in `apps/desktop/src-tauri`: Finished `release` profile in **4m 47s** (Clean, 0 warnings).
  5. **Resume Extraction Eval:**
     - Command: `pnpm eval` (`tsx eval/scripts/run-eval.ts`)
     - Output: 3 golden resumes evaluated. Contact: 100.0%, Experience: 100.0%.
  6. **Matching & Ranking Eval:**
     - Command: `pnpm eval:matching` (`tsx eval/scripts/run-matching-eval.ts`)
     - Output: 1 candidate, 6 jobs evaluated. Precision: 100.0%.

---

## 3. Comprehensive Master Prompt Feature Audit Table

Mapping every requirement from `docs/MASTER_PROMPT.md` Sections 3.1–3.8 and 10 to its true state:

| Feature Specification | Status | Evidence (file:line, command output) | What is Missing |
|---|---|---|---|
| **3.1 Ingestion & Profile Extraction** | | | |
| Drop zone for multiple files (PDF, DOCX, TXT, etc.) | **PARTIAL** | `apps/desktop/src/views/ProfileView.tsx:120-160`, `utils/documentParser.ts` | No OCR for scans; files are parsed in-browser only; results are not persisted to SQLite. |
| Text extraction with bounding boxes / positions | **ENGINE-ONLY** | `packages/engine/src/ingestion/parsers/pdf.ts:40-75` | Engine parser extracts page/bbox, but UI uses `documentParser.ts` which extracts only line numbers (`line: idx + 1`), not bounding boxes. |
| Scanned PDF detection & OCR (`tesseract.js` eng+fas) | **MISSING** | `packages/engine/src/ingestion/parsers/pdf.ts:80`, `package.json` | `tesseract.js` is not installed; no OCR traineddata bundled. Scanned documents cannot be parsed. |
| Bilingual text normalizer (ZWNJ, ی/ک, Arabic/Persian digits) | **PARTIAL** | `packages/engine/src/ingestion/normalizer.ts`, `apps/desktop/src/utils/resumeExtractor.ts` | Two disjoint implementations exist; not unified across the architecture. |
| Section heading segmentation (fa/en dictionaries + layout cues) | **PARTIAL** | `packages/engine/src/ingestion/sections.ts`, `utils/resumeExtractor.ts` | Regex dictionaries exist, but layout cue heuristics and LLM fallbacks are missing. |
| Versioned structured profile schema (Zod) | **WORKS** | `packages/shared/src/profile.ts:1-120` | Full Zod schema defined and shared across packages. |
| Multi-file profile merger & conflict resolution | **ENGINE-ONLY** | `packages/engine/src/ingestion/merger.ts:1-120` | Logic exists and passes unit tests, but UI does not call engine merger; UI edits local state only. |
| Split-view profile review screen with provenance highlighting | **UI-ONLY (mock)** | `apps/desktop/src/views/ProfileView.tsx:180-320` | Highlight is a simple substring match on raw text lines; no coordinate-based PDF overlay. |
| Computed facts (total years, years per skill, seniority, gaps) | **PARTIAL** | `packages/engine/src/ingestion/extractors/experience.ts:80` | Experience duration calculation exists in engine, but is not displayed in the UI profile view. |
| Accuracy evaluation harness (30+ varied golden resumes) | **PARTIAL** | `eval/resumes/` (3 text files), `eval/scripts/run-eval.ts` | Uses 3 synthetic plain-text files instead of 30+ varied real-world resumes across formats. |
| **3.2 Preferences** | | | |
| Candidate preferences (titles, seniority, remote, salary floor) | **UI-ONLY (mock)** | `apps/desktop/src/views/SettingsView.tsx`, `views/JobsView.tsx` | UI input fields update React/Zustand state; values are not persisted to SQLite or passed to matching engine. |
| **3.3 Job Sources (Zero Keyed APIs)** | | | |
| Source adapter interface (`SourceAdapter`) | **ENGINE-ONLY** | `packages/adapters/src/types.ts:15-35` | Interface declared, but adapters are not invoked by the desktop UI. |
| Polite crawling (robots.txt, p-queue, jitter, ETag/304, backoff) | **ENGINE-ONLY** | `packages/adapters/src/network/client.ts`, `robots.ts` | Verified in unit tests, but UI bypasses network client and calls browser `fetch()` directly. |
| 3-Tier deduplication (canonical URL hash, tuple hash, SimHash) | **ENGINE-ONLY** | `packages/adapters/src/dedup/` | Fully implemented and tested in unit tests, but UI does not deduplicate fetched jobs. |
| Extraction pipeline (JSON-LD -> selectors -> Readability) | **ENGINE-ONLY** | `packages/adapters/src/extractors/jsonld.ts`, `markdown.ts` | JSON-LD parser and Turndown markdown converter exist in adapters package, not used by UI. |
| Seeded company directory (18 tech companies) & ATS detector | **PARTIAL** | `packages/adapters/src/companies/seed.ts`, `detector.ts` | 18 companies seeded in engine, but UI hardcodes a separate 6-company list in `JobsView.tsx`. |
| LinkedIn / Indeed Assist mode (browser tab reader) | **UI-ONLY (mock)** | `packages/adapters/src/adapters/assist.ts`, `JobsView.tsx` | Assist mode button in UI is a placeholder; no active Chrome/Edge CDP connection to inspect open tabs. |
| Background refresh scheduler (Rust scheduler -> engine) | **MISSING** | `apps/desktop/src-tauri/src/lib.rs` | No scheduler, cron, or desktop notification mechanism in Rust core. |
| **3.4 Matching and Ranking** | | | |
| Hard filters (workplace, clearance, visa, seniority, exclusions) | **ENGINE-ONLY** | `packages/engine/src/matching/hardFilters.ts:1-90` | Logic implemented in engine, but UI uses simple client-side string filtering. |
| Semantic similarity & embeddings | **PARTIAL** | `packages/engine/src/matching/embeddings.ts:24-60` | TF-IDF sparse vectorizer in engine; no neural multilingual embeddings (`bge-m3`/`multilingual-e5`). Not called by UI. |
| ESCO skill taxonomy & transferable skills | **ENGINE-ONLY** | `packages/engine/src/matching/skillCoverage.ts:1-120` | Detailed ESCO taxonomy and transferable skill matching exist in engine, but UI uses a hardcoded fallback list. |
| Local LLM re-ranker with strict schema | **PARTIAL** | `packages/engine/src/matching/rerank.ts:30-80` | Rule-based heuristic strings only; `node-llama-cpp` is not installed; no GGUF models. |
| Match score blend, match ring, feedback loop (thumbs up/down) | **UI-ONLY (mock)** | `apps/desktop/src/components/jobs/JobCard.tsx:45-90`, `liveJobService.ts:54` | Match ring displays clamped score (70–98); feedback buttons update local state but do not tune weights or persist. |
| Matching evaluation harness | **PARTIAL** | `eval/matching/labeled_pairs.json`, `run-matching-eval.ts` | Evaluates only 1 candidate profile against 6 jobs; benchmark is too small to be meaningful. |
| **3.5 Tailored Documents** | | | |
| ATS-safe résumé templates (clean, modern, compact; fa/en) | **WORKS** | `packages/engine/src/documents/templates/` (3 templates) | HTML/CSS templates exist and render clean single-column semantic ATS structures. |
| Document tailoring engine (`tailorResume`, `generateCoverLetter`) | **ENGINE-ONLY** | `packages/engine/src/documents/tailor.ts:1-110` | Implemented in engine, but UI cannot call engine over stdio. |
| Mandatory truthfulness guard (hallucination & inflation check) | **ENGINE-ONLY** | `packages/engine/src/documents/truthfulness.ts:1-140` | Verified by 11 unit tests in `truthfulness.test.ts`, but not executed during UI tailoring. |
| Screening answer bank | **ENGINE-ONLY** | `packages/engine/src/documents/answerBank.ts:1-85` | Implemented in engine; UI modal displays static hardcoded questions. |
| Document export (PDF via Playwright `page.pdf()`, DOCX via `docx`) | **ENGINE-ONLY** | `packages/engine/src/documents/exporters/` (`pdf.ts`, `docx.ts`) | Logic exists in engine, but UI export buttons do not invoke engine exporters. |
| Side-by-side diff studio | **UI-ONLY (mock)** | `apps/desktop/src/components/documents/TailoredDocumentsModal.tsx` | Visual UI renders, but edits do not trigger real truthfulness re-checks or exports. |
| **3.6 Application Engine (Form Filling)** | | | |
| ATS Form Fillers (Greenhouse, Lever, Ashby, Workable, Generic) | **ENGINE-ONLY** | `packages/ats/src/fillers/` (5 filler classes) | Playwright fillers exist and pass tests against mock HTML fixtures, but are not invoked by UI. |
| Field mapping & heuristics pipeline | **ENGINE-ONLY** | `packages/ats/src/detector.ts`, `matcher.ts`, `mapper.ts` | Fully implemented and unit tested in `@kaarjoo/ats`, not connected to desktop UI. |
| Review Mode (default) with final screenshot & checklist | **UI-ONLY (mock)** | `apps/desktop/src/stores/applicationStore.ts:312-379` | UI simulates review mode with `setTimeout` and static Unsplash photos; no Playwright execution occurs. |
| Auto Mode with daily caps and safety fallbacks | **MISSING** | `apps/desktop/src/views/QueueView.tsx:35` | Header displays a non-functional badge; no autonomous execution pipeline. |
| Playwright driving host Chrome/Edge with persistent profile | **ENGINE-ONLY** | `packages/ats/src/discovery.ts`, `packages/engine/src/spikes/` | Discovery logic works, but desktop app does not launch or control Chrome/Edge. |
| **3.7 Tracker and Dashboard** | | | |
| Interactive Kanban pipeline (6 columns, drag-and-drop) | **UI-ONLY (mock)** | `apps/desktop/src/components/tracker/KanbanBoard.tsx` | Renders columns and allows moving cards in memory; initialized from `mockInitialApplications`. |
| Applications table view (search, filter, sort) | **UI-ONLY (mock)** | `apps/desktop/src/components/tracker/ApplicationsTableView.tsx` | Full-featured table view operating exclusively on in-memory mock records. |
| Application detail drawer (snapshot, timeline, screenshots, notes) | **UI-ONLY (mock)** | `apps/desktop/src/components/tracker/ApplicationDetailDrawer.tsx` | Renders timeline and Unsplash screenshots; notes are saved to Zustand, not SQLite. |
| Dashboard KPIs & Learning Roadmap widget | **UI-ONLY (mock)** | `apps/desktop/src/components/tracker/DashboardKpisWidget.tsx` | Calculates metrics in-memory from mock application records. |
| CSV export | **WORKS** | `apps/desktop/src/stores/applicationStore.ts:470-510` | Exports current in-memory application records to standard RFC-compliant CSV string. |
| **3.8 Settings** | | | |
| Language switcher (fa/en) | **PARTIAL** | `apps/desktop/src/i18n/index.ts`, `stores/appStore.ts` | Switcher functions, but 56 keys are missing in `fa.json` and 125 inline `isRtl` ternaries exist. |
| Theme switcher (Dark / Light / System) | **WORKS** | `apps/desktop/src/stores/appStore.ts:35`, `App.tsx` | Theme class toggles cleanly on root element. |
| AI tier and model management | **UI-ONLY (mock)** | `apps/desktop/src/views/SettingsView.tsx:140-190` | Visual tier selection cards; no GGUF models downloaded, stored, or managed. |
| Browser choice & headless toggle | **UI-ONLY (mock)** | `apps/desktop/src/views/SettingsView.tsx:210-245` | Toggles Zustand state; does not configure or pass settings to Playwright backend. |
| SQLite database backup and safe wipe | **UI-ONLY (mock)** | `apps/desktop/src/views/SettingsView.tsx:260-295` | Shows browser `alert()`; does not interact with SQLite on disk. |
| **10. Packaging, Signing, Updates** | | | |
| Tauri NSIS Windows installer / macOS bundle configuration | **PARTIAL** | `apps/desktop/src-tauri/tauri.conf.json:31-47` | NSIS target configured, but sidecar and native dependencies are not included. |
| Sidecar binary packaging (`externalBin`) | **MISSING** | `apps/desktop/src-tauri/tauri.conf.json` | `externalBin` is completely absent; Node engine binary is not bundled into the app. |
| Native dependencies & OCR traineddata as resources | **MISSING** | `apps/desktop/src-tauri/tauri.conf.json` | No `resources` entry for native addons, Node scripts, or OCR data. |
| Auto-update with Tauri updater | **MISSING** | `apps/desktop/src-tauri/Cargo.toml`, `tauri.conf.json` | `tauri-plugin-updater` is not declared or configured. |
| GitHub Actions CI/CD matrix | **MISSING** | `.github/workflows/` | Directory does not exist; no CI build or test automation is set up. |

---

## 4. Prioritized Architectural Fix List

To transition Kaarjoo from a disconnected prototype with mock simulations into a working, production-grade, local-first desktop application, the following prioritized fixes must be executed in order:

### Priority 0 (P0): Core Process Architecture & True End-to-End Wiring
1. **Spawn Node Sidecar from Tauri Rust Core:**
   - Configure `"externalBin": ["binaries/node"]` or bundled Node 22 executable in `tauri.conf.json`.
   - Update `apps/desktop/src-tauri/src/lib.rs` to spawn the sidecar process on startup and manage its lifecycle via stdio.
   - Implement typed Tauri commands that relay JSON-RPC 2.0 messages between the React UI and the Node engine.
2. **Open & Connect SQLite Database in Rust Core:**
   - Add `sqlx` (with SQLite, WAL mode, migrations) to `src-tauri/Cargo.toml`.
   - Run embedded migrations (`20260101_init.sql`, `20260201_sources_and_simhash.sql`) on app launch.
   - Expose CRUD commands for profiles, jobs, applications, and settings to the UI via Tauri IPC.
3. **Remove All Mock Simulation Paths from Desktop UI:**
   - Replace `mockInitialApplications` in `applicationStore.ts` with real database queries.
   - Replace simulated `setTimeout` delays in `executeApplication` and `submitReviewed` with real calls to the Node Playwright engine.
   - Replace Unsplash stock photo URLs with genuine screenshots captured by Playwright and stored locally in app data.
4. **Fix Production Network Architecture & CSP:**
   - Move all external job fetching (Greenhouse, Ashby, Lever) out of the frontend WebView into the Node engine / adapters layer.
   - Add proper `connect-src` to CSP in `tauri.conf.json` so legitimate local IPC and image asset loading are never blocked.

### Priority 1 (P1): Real Engine Algorithms & Local AI
1. **Replace Clamped Scoring with Real Matching Engine:**
   - Remove the `Math.max(70, Math.min(98, baseMatch))` clamp and fallback skill list from `liveJobService.ts`.
   - Route job scoring through `packages/engine/src/matching/handler.ts` (combining hard filters, ESCO skill coverage, and semantic scoring).
2. **Real Multilingual Embeddings & Local LLM Integration:**
   - Install and configure `node-llama-cpp` or provide a validated local runtime path.
   - Implement local GGUF model download and management with Hugging Face manifest.
   - Replace TF-IDF sparse vectors with local multilingual embeddings (`bge-m3` or `multilingual-e5`).
3. **Install and Configure OCR (`tesseract.js`):**
   - Install `tesseract.js` in `@kaarjoo/engine` with offline `eng` and `fas` traineddata.
   - Wire OCR into scanned PDF detection.

### Priority 2 (P2): Quality, i18n, and Packaging
1. **Complete Bilingual i18n:**
   - Add the 56 missing keys to `apps/desktop/src/i18n/fa.json`.
   - Refactor the 125 inline `isRtl ? '...' : '...'` ternaries and hardcoded Persian lines across all 11 UI components to use `t('key')`.
2. **Fix Linting & Formatting Tooling:**
   - Add `eslint` and appropriate plugins to root `devDependencies`.
   - Run Prettier to format the 160 files with style warnings.
3. **Expand Evaluation Suites to Meet Master Prompt Targets:**
   - Populate `eval/resumes/` with 30+ golden resumes across varied formats (scanned, two-column, tables, Persian/English).
   - Expand `eval/matching/labeled_pairs.json` to 20+ candidate-job pairs.
4. **Desktop Packaging & Auto-Updater:**
   - Configure sidecar bundling and resource paths in `tauri.conf.json`.
   - Verify `pnpm tauri build` produces an installer that runs without external dependencies.
   - Add GitHub Actions CI matrix in `.github/workflows/ci.yml`.
