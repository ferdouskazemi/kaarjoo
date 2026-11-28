# Kaarjoo Progress Log

> **Audit Status Note (2026-11-24):** In accordance with the "Truth First" rule, all phase statuses reflect the audited reality of the working desktop application. Features are marked **COMPLETED & VERIFIED** only with concrete evidence from actual compilation, installer generation, test runs, and clean database persistence.

---

## Current Overall Status
* **Phase 0: Foundation, Architecture, & Spikes** — **COMPLETED & VERIFIED** (Rust core SQLite WAL opened, sidecar stdio bridge running, typed Specta TS commands generated, zero direct network calls from UI)
* **Phase 1: Ingestion and Profile Extraction** — **COMPLETED & WIRED** (Multi-format parsers wired to engine RPC, Zod-validated, SQLite persisted, missing fields preserved as `null` without PII defaults)
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
  - Candidate contact fields return `null`/`undefined` when absent from a document; zero personal PII defaults in source.
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
  - Synthetic fixture contacts (`jane.doe@example.com`) used exclusively in tests/eval.

### P0 Remediation & Flash-Rive Reference Reuse (`fix/p0-stop-the-bleeding`)
- **Status:** COMPLETED & VERIFIED (Prompt 1)
- **P0 Fixes Applied & Tested:**
  1. Removed personal PII defaults (`contact.ts`, `pipeline.ts`, `applicationStore.ts`, `profileStore.ts`) + added `pii_guard.test.ts` and `contact.test.ts` regression test.
  2. Removed placeholder `'Company'` / `'Software Engineer'` in `experience.ts`; added two-line company-first header support + `experience.test.ts` regression test.
  3. Gated `VERIFIED` badge in `ProfileView.tsx` on explicit user confirmation and excluded placeholders from completeness.
  4. Mapped honest engine statuses in `commands.rs` (`needs_review`, `needs_user`, `failed`, `submitted_verified`, `submitted_unverified`) + Rust unit tests (`map_execute_status`, `map_submit_outcome`).
  5. Blocked auto-submit on session rehydrate in `packages/ats/src/engine.ts` (`refilled: true` returns `needs_review`) + `submitAttemptId` idempotency guard.
  6. Replaced `chrono_lite_iso()` with RFC 3339 (`time` crate) + SQLite migration `20260601_p0_nullable_and_honest_statuses.sql` backfilling legacy timestamps.
  7. Fixed `matching_record_feedback` in `commands.rs` to validate feedback enum, pass `profileId`, and surface errors.
- **Flash-Rive Reference Reuse Mapping (`C:\Work\My Personal Projects\flash-rive`):**
  - `scripts/seed-chromium-profile.mjs` → `packages/ats/src/utils/chromiumProfile.ts` (Windows Chromium `Local State` seeding to prevent account lockouts on fresh `--user-data-dir` profiles).
  - `src/style.css` / `src/ui/theme.css` → `apps/desktop/src/styles/index.css` (`fr-card`, `fr-studio-panel`, `fr-eyebrow`, `fr-scan-line` studio aesthetics and motion tokens).
  - `apps/desktop/src-tauri/nsis/sidebar.bmp` & `header.bmp` (Flash-Rive studio gradient & orbital ring installer artwork).

### Phase 10: Cross-Platform Packaging, CI Matrix, Auto-Updater & Accessibility Audit
- **Status:** PARTIAL (Windows NSIS built & Unicode smoke-tested locally; macOS universal `.dmg` + Apple notarization configured in CI / documented, not run locally due to Windows host)
- **Evidence:**
  - **Icons & Bundle:** Generated multi-platform icons (`32x32.png`, `64x64.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`, `icon.png`) in `apps/desktop/src-tauri/icons/`.
  - **GitHub Actions CI & Releases:** `.github/workflows/ci.yml` (`macos-14` universal `.dmg` + `windows-latest` NSIS `.exe` + PR eval gate) and `.github/workflows/release.yml` (`tauri-action@v0` tag release + signed `latest.json`).
  - **Sidecar & Resource Staging:** `scripts/prepare-sidecar.mjs` (Node v22.14.0 SHA-256 verified sidecar per triple), `scripts/stage-engine-resources.mjs`, `scripts/macos-sign-nested.sh`, `apps/desktop/src-tauri/Entitlements.plist` (Hardened Runtime entitlements).
  - **Auto-Updater & Directory Refresh:** `@tauri-apps/plugin-updater` (`2.x`) + `directory_check_updates` command wired in `SettingsView.tsx`.
  - **Windows Release Bundle Verified:** `pnpm --filter desktop tauri build --bundles nsis` succeeded (`317.23 MiB` NSIS setup at `apps/desktop/src-tauri/target/release/bundle/nsis/Kaarjoo_1.0.0_x64-setup.exe`).
  - **Unicode & Space Path Smoke Test (`pnpm smoke:test`):** Verified end-to-end under `Kaarjoo Smoke Test فردوس کاظمی ...` on `win32/x64` (`eval/smoke-artifacts/smoke-review-form.jpg`).
  - **Design & Accessibility Pass:** Light + Dark CSS token system, `:focus-visible`, `prefers-reduced-motion`, ARIA dialog/nav attributes, verified across 8 screenshots (`ui-{en,fa}-{dark,light}-{home,settings}.png`) in `eval/smoke-artifacts/` with 0 errors and 0 unlabeled buttons.
  - **Docs:** [`docs/RELEASE_AND_SIGNING.md`](RELEASE_AND_SIGNING.md) & [`docs/SMOKE_TEST_CHECKLIST.md`](SMOKE_TEST_CHECKLIST.md).

### Phase 11: Real Local AI (`node-llama-cpp`), Neural Embeddings Cache, OCR (`tesseract.js`) & Eval Suite
- **Status:** COMPLETED & VERIFIED (All deterministic, OCR, SQLite cache, grammar/evidence verification, matching, and adversarial eval gates passed; live multi-GB GGUF tokens/sec not measured locally because GGUF weights are on-demand runtime downloads not bundled on host)
- **Evidence:**
  - **Local AI Runtime (`packages/engine/src/ai/`):** `node-llama-cpp` (`^3.22.3`) hardware tier & Vulkan/CUDA/Metal/CPU detection, Apache-2.0/MIT open-weight model manifest (`Qwen3-4B`, `Qwen2.5-1.5B`, `Qwen3-8B`, `Qwen3-14B`, `BGE-M3`), resumable SHA-256 HTTPS downloader (`models_download` + `SettingsView.tsx` UI), JSON-schema grammar constrained prompts + verbatim `verifyEvidenceSpan` guard, 5-min idle auto-unload.
  - **Neural Embedding SQLite Cache:** Migration `20260501_embedding_cache.sql` + `SqliteEmbeddingCache` storing float32 vectors in SQLite (`node:sqlite`), with TF-IDF fallback explicitly tagged when no embedding GGUF is downloaded.
  - **OCR & Legacy Formats:** Bundled `eng.traineddata.gz` + `fas.traineddata.gz` with offline `tesseract.js` (`^7.0.0`), Chromium scanned-PDF fallback, plus `.doc` (UTF-16LE/ASCII), `.odt` (`content.xml` ZIP), and `.rtf` (Unicode `\uN`) parsers.
  - **Comprehensive Eval Suite (`pnpm eval:ci` -> `docs/EVAL.md`):**
    - 32 multi-format résumés (`.pdf`, `.docx`, `.odt`, `.rtf`, `.png` OCR, `.txt`; 5 OCR-scanned): Email F1 `0.938`, Phone F1 `0.875`, Skills F1 `0.901`, Experience F1 `0.865`, Education F1 `0.600`, Evidence Guard `5/5` blocked.
    - 312 labeled profile–job pairs across 12 profiles: Precision@10 **`0.8819`**, NDCG@10 **`0.9336`**, `0` hard-filter violations.
    - 56 adversarial truthfulness cases (48 EN+FA attacks + 8 valid controls): **`48/48` (100.0%) caught**, **`0/8` (0.0%) false positives**.

### Prompt 2: Engine Supervisor & Process Lifecycle (`fix/p2-engine-supervisor`)
- **Status:** COMPLETED & VERIFIED (`cargo test` 8/8, `pnpm build` exit 0, `pnpm test` 27 files / 119 tests)
- **Changes:**
  - `apps/desktop/src-tauri/src/error.rs`: Added typed `AppError` enum (`serde` + `specta::Type`) across Tauri commands.
  - `apps/desktop/src-tauri/src/engine.rs`: Replaced mutex-held client with actor-based `EngineSupervisor` (`EngineClient` alias), generation isolation, `ByteLineFramer` (splits `b'\n'` before UTF-8 decode, 32 MB cap), per-method timeouts + `$/cancelRequest`, max 5 restarts/5 min (`engine:fatal`), and `kill_child_process_tree` cleanup.
  - `packages/engine/src/rpc.ts` & `packages/engine/src/index.ts`: Added `$/cancelRequest` + `AbortController` and `system.shutdown`.
  - `apps/desktop/src-tauri/src/lib.rs`, `commands.rs`, `Cargo.toml`, `nsis/hooks.nsh`: Initialized `tracing-subscriber` + daily `tracing-appender` rotation (keep 7), fixed panic hook (`&str` + `String` + backtrace), wired `RunEvent::ExitRequested`/`Exit` to `engine.shutdown()`, aligned `Cargo.toml` version to `1.0.0`, read version from `app.package_info().version`, and removed `taskkill` workaround from `nsis/hooks.nsh`.

### Prompt 3: Single Source of Truth, Rust FSM & Task Orchestration (`feat/p3-fsm-and-tasks`)
- **Status:** COMPLETED & VERIFIED (`cargo test` 10/10, `pnpm build` exit 0, `pnpm test` 27 files / 119 tests)
- **Changes:**
  - `apps/desktop/src-tauri/src/application_fsm.rs`: Added Rust application state machine (`next_state`, `user_event_from_status`, `transition_application`) executing atomic DB transitions + emitting `app:application-updated`, with unit tests for allowed & forbidden transitions.
  - `apps/desktop/src-tauri/migrations/20260701_fsm_indexes_and_screenshots.sql`: Added indexes on `applications(status, updated_at)`, `matches(profile_id, overall_score DESC)`, and `jobs(status, first_seen DESC)`.
  - `apps/desktop/src-tauri/src/db.rs`: Scoped all 4 `LEFT JOIN matches` queries (`get_jobs`, `get_job_by_id`, `search_jobs_fts`, `get_all_applications`) by `profile_id`.
  - `apps/desktop/src-tauri/src/commands.rs`: Merged extracted résumé profiles via `profile.merge` with version increment and real SHA-256 + MIME type (`sha2`, `hex`), saved screenshots to `appDataDir/screenshots/<appId>/*.jpg` (`base64`), routed `applications_update_status` through `application_fsm`, and added `pipeline_start_discovery`, `applications_prepare`, and `applications_fill` emitting `task:progress`.
  - `apps/desktop/src-tauri/src/lib.rs` & `bin/export_bindings.rs`: Extracted shared `kaarjoo_lib::specta_builder()` so `bindings.ts` exports stay in sync with Tauri command registration; regenerated `apps/desktop/src/bindings.ts`.
  - `apps/desktop/src/stores/pipelineStore.ts` & `views/QueueView.tsx`: Wired `!demoMode` discovery/prepare/fill to Rust commands and made SQLite DB the single source of truth in `QueueView` when `!demoMode`.

### Prompt 4: Security Hardening (`fix/p4-security-hardening`)
- **Status:** COMPLETED & VERIFIED
- **Changes:**
  - `apps/desktop/src-tauri/capabilities/default.json`: Removed `fs:default`, `shell:default`, `process:default`, `dialog:default`; kept window controls, `dialog:allow-open`/`save`, `notification:default`, `updater:default`.
  - `apps/desktop/src-tauri/tauri.conf.json`, `index.html`, `src/styles/index.css`, `public/fonts/*.woff2`: Bundled `Inter`, `Vazirmatn`, and `JetBrains Mono` locally, removed Google Fonts origins, set `img-src 'self' asset: data:`, `script-src 'self'`, `connect-src ipc: http://ipc.localhost`.
  - `apps/desktop/src-tauri/src/commands.rs`, `lib.rs`, `queries/index.ts`, `ProfileView.tsx`, `SettingsView.tsx`: Replaced `profile_parse_and_extract(file_path)` with `profile_import_resume()` (native dialog in Rust + 25 MB limit + magic-byte check + copy into `appDataDir/sources/<sha256>.<ext>`), and replaced `@tauri-apps/plugin-process` relaunch with Rust `app_restart`.
  - `packages/engine/src/utils/pathGuard.ts` & `packages/engine/src/index.ts`: Removed `outputPath` from `documents.exportPdf`/`exportDocx`, enforced `appDataDir/exports` resolution and `sources/`/`exports/`/`screenshots/` path guards.
  - `packages/engine/src/documents/templates/{escapeHtml,atsClean,modernMinimal}.ts` & `exporters/pdf.ts`: Escaped all interpolated resume/cover-letter fields with `escapeHtml()`/`escapeAttr()`, switched `exportToPdf` to a fresh non-persistent context with `javaScriptEnabled: false` and `page.route('**/*', r => r.abort())`.
  - `packages/ats/src/engine.ts`: Moved Playwright `userDataDir` to `appDataDir/browser-sessions/<appId>`, purged stale sessions (> 24h) on startup, and added `closeAllSessions()`.
  - `apps/desktop/src-tauri/src/db.rs` & `commands.rs`: Implemented full `settings_wipe_all_data` closing browsers, wiping all user tables (preserving UI language), removing `sources/`, `exports/`, `screenshots/`, `browser-sessions/`, `logs/` (and optional `models/`), and returning `WipeSummaryDto`.
  - `packages/engine/src/__tests__/security.test.ts` & `docs/SECURITY.md`: Added capability allowlist, path traversal, XSS escaping, and zero-network PDF export tests plus threat model documentation.

### Prompt 5: Browser Co-Pilot (Visible, Verified, Single Submit) (`feat/p5-browser-copilot`)
- **Status:** COMPLETED & VERIFIED
- **Changes:**
  - `packages/shared/src/application.ts`: Extended `ReviewChecklistItemSchema` with real read-back statuses (`ok`, `mismatch`, `empty_required`, `empty_optional`, `user_edited`, `unknown_field`, `failed`) plus `selector`, `intendedValue`, `source`, `error`, `required`, and `acceptedMismatch`.
  - `packages/ats/src/mapper.ts`: Added normalized exact + fuzzy answer bank lookup with `source`, removed guessed `work_authorization`/`visa_sponsorship`/`resume.pdf` defaults, and restricted EEO decline default to fields where a decline option actually exists.
  - `packages/ats/src/fillers/base.ts`: Added `readBackChecklist` reading actual DOM values (`inputValue`, `isChecked`, selected option label/value, `input.files`), fill-error isolation (never marking failed fields as filled), and DOM-diff confirmation detection (`networkidle` up to 20s + text diff after click + URL change check).
  - `packages/ats/src/engine.ts` & `packages/engine/src/index.ts`: Defaulted Review mode to headed browser (`headless: false`) with Rust-provided `windowBounds`, enforced `maxConcurrentContexts: 2`, wired live `input`/`change` watchers (`application.fieldChanged`), added `bringToFront()` on `needs_user`, added `application.resume`, and enforced fresh DOM read-back + `submitButtonNotFound` handling in `submitReviewedApplication`.
  - `apps/desktop/src-tauri/src/commands.rs` & `lib.rs`: Passed `main` window bounds to `application.execute` and added `applications_resume` command.
  - `packages/ats/src/__tests__/copilot_review.test.ts`: Added 7 Playwright + mapper tests covering fill errors, empty required blocking, live `user_edited` sync, footer confirmation trap, `submitAttemptId` idempotency, restart refill guard, and mapper honesty rules.

### Prompt 6: Profile Extraction Quality & Provenance (`feat/p6-extraction-provenance`)
- **Status:** COMPLETED & VERIFIED
- **Changes:**
  - `packages/shared/src/profile.ts`, `apps/desktop/src-tauri/src/models.rs`, `db.rs`, & `migrations/20260801_profile_provenance_and_issues.sql`: Added `ExtractedFactProvenance` (`value`, `confidence`, `evidence: { sourceFileId, page, charStart, charEnd, text } | null`, `method`), `ProfileIssue` (`severity`, `fieldPath`, `messageKey`, `suggestedAction`), and SQLite persistence for `field_provenance_json` and `issues_json`.
  - `packages/engine/src/ingestion/provenance.ts` & `pipeline.ts`: Built per-field provenance spans and `issues[]` blockers/warnings; streamed `profile.progress` notifications (`reading`, `ocr`, `sections`, `facts`, `llm`) in `packages/engine/src/index.ts`.
  - `packages/engine/src/ingestion/extractors/{contact,experience,education}.ts`: Added international fallback phone parsing, ` - ` hyphenated title/company splitting, Persian `شرکت:`/`سمت:` labels, `"تاکنون"` Jalali end dates, two-line header preservation across multi-job sections, and removed `'University'`/`'Degree'`/`'2020'` placeholders.
  - `packages/engine/src/ingestion/__tests__/provenance_issues.test.ts`: Added provenance span, `profile.progress`, and `issues[]` tests.

### Prompt 7: Design System & App Shell (`feat/p7-design-system-shell`)
- **Status:** COMPLETED & VERIFIED
- **Changes:**
  - `docs/design/`: Saved reference mockups (`0-flow.png`, `1-profile-review.jpg`, `3-application-kit.jpg`, `5-review-inbox.jpg`).
  - `apps/desktop/src/styles/tokens.css` & `index.css`: Created token-based dark/light CSS variables mapped to Tailwind v4 `@theme` (radii `6/10/14px`, WCAG AA contrast pairs, `15px` minimum Persian body, `prefers-reduced-motion`).
  - `apps/desktop/src/components/ui/`: Added shadcn-style primitives (`Button`, `Badge`/`Chip`, `Card`, `Input`, `Textarea`, `SegmentedControl`, `Tabs`, `Table`, `Stepper`, `ScoreRing`, `Meter`, `EmptyState`, `ErrorState`, `Skeleton`, `Dialog`, `KeyboardHint`, `FieldRow`) with `focus-visible` rings and `40px` min hit area.
  - `apps/desktop/src/components/layout/{TitleBar,Sidebar,AppShell,CommandPalette}.tsx`: Rebuilt `232px` sidebar with red "needs you" badge, plain-language footer status, jargon-free title bar, `<MotionConfig reducedMotion="user">`, and global `G` + `H/P/O/R/T/S` + `⌘K`/`Esc` shortcuts.
  - `apps/desktop/src/styles/__tests__/design_system.test.ts`: Added WCAG AA contrast verification across all dark/light token pairs and raw-hex / `<12px` lint tests for `components/ui/` and `components/layout/`.

### Prompt 8: Workflow Screens (`feat/p8-workflow-screens`)
- **Status:** COMPLETED & VERIFIED
- **Changes:**
  - `apps/desktop/src/views/HomeView.tsx`: Rebuilt with Prompt 7 primitives (`Card`, `Button`, `Badge`, `EmptyState`, `ErrorState`, `Skeleton`), "What needs you" summary, real DB activity, and next suggested action.
  - `apps/desktop/src/views/ProfileView.tsx` & `components/profile/{IssuesFixCard,PreferencesPanel}.tsx`: Added 4-step `Stepper` with blocker gates, real `engine:profile.progress` stage indicator, `"Fix before you can apply"` inline issue fixer + gate-based readiness %, and full `PreferencesPanel` + Answer Bank persisted in SQLite settings/profile.
  - `apps/desktop/src/views/JobsView.tsx`: Added `New` / `Shortlisted` / `Skipped` tabs, `Shortlist (S)` / `Not for me (X)` feedback wiring (`matchingRecordFeedback`), and `"Prepare N shortlisted →"` bulk action without hidden caps.
  - `apps/desktop/src/views/QueueView.tsx`: Grouped Review Inbox into `Needs you`, `Ready to review`, and `Submitted` (`✓ verified` / `? unverified`) lanes, added live `engine:application.fieldChanged` listener and `applicationsResume` action, and removed contradictory `Ready` labels on submitted items.
  - `apps/desktop/src/views/ApplicationsView.tsx`: Enforced SQLite DB single source of truth when `!demoMode`.
