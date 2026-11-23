# Kaarjoo Progress Log

## Phase 0: Foundation, Architecture, & Spikes
- **Status:** COMPLETED (Committed in `add7296` and `5817ec8`)

### Completed
- [x] Initialized Git repository with strict `.gitignore` and monorepo structure via `pnpm` workspaces (`apps/desktop`, `packages/engine`, `packages/shared`, `packages/adapters`, `packages/ats`, `eval/`, `docs/`).
- [x] Evaluated `open-antigravity-patcher-main.zip` and integrated reusable low-level system reliability patterns:
  - System browser discovery across Windows Registry and macOS/Linux filesystem (`discovery.ts`).
  - Atomic file writing and directory fsync (`atomic.ts`).
  - macOS code signing and quarantine removal (`codesign.ts`).
  - Safe process termination (`process.ts`).
- [x] Built and verified the desktop UI shell (`apps/desktop`):
  - React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui tokens.
  - Vazirmatn (fa, RTL default) and Inter (en, LTR) typography.
  - Runtime language & theme switching (Dark/Light/System).
  - Custom TitleBar with drag regions and controls.
  - Command palette (`cmdk`) responsive to `Ctrl+K`.
  - Views: Home/Dashboard, Profile & Résumé, Job Matches, Review Queue, Application Tracker, Settings.
- [x] Built the Node 22 Engine sidecar with esbuild bundle and JSON-RPC 2.0 stdio server.
- [x] Executed and verified all Phase 0 technical spikes:
  - **Spike 1 (JSON-RPC stdio):** Automated round-trip verifying `engine.ready`, `system.ping`, `system.discoverBrowsers`, and `system.getHardwareSpecs`.
  - **Spike 2 (SQLite Migrations):** Embedded schema with WAL mode and foreign keys (`20260101_init.sql`).
  - **Spike 3 (Playwright with Host Browser):** Successfully drove system Google Chrome with an isolated user data directory and rendered RTL test pages.
  - **Spike 4 (Persian RTL PDF Generation):** Generated a 54KB high-resolution Persian PDF with clean typography, borders, and margins via `page.pdf()`.
- [x] Configured native toolchain on Windows via `stable-x86_64-pc-windows-gnullvm` and `llvm-mingw` in user scope.
- [x] Tauri 2 desktop application builds and checks cleanly in 2.5s.

---

## Phase 1: Ingestion and Profile Extraction
- **Status:** COMPLETED (Committed in `60b756c`, `0fab472`, `0e0892a`, `68e01bf`, and `89d0f60`)

### Completed
- [x] Bilingual text normalizer (`normalizer.ts`): Arabic letter normalization (`ي/ك`), ZWNJ handling, and Persian/Arabic numeral conversion.
- [x] Section heading detector (`sections.ts`): Covers 8 standard resume sections in both Persian and English.
- [x] Deterministic contact extractor (`contact.ts`): Strict email validation, international phone formatting (`+93`, `+98`, etc.) via `libphonenumber-js`, and profile links (LinkedIn, GitHub).
- [x] Deterministic experience extractor (`experience.ts`): Jalali/Gregorian date parsing, achievements extraction, and current employment status.
- [x] Deterministic education extractor (`education.ts`): Degree level detection, institution matching, and date ranges.
- [x] Skills taxonomy extractor (`skills.ts`): Canonical ESCO skill dictionary with comprehensive Persian/English alias mapping.
- [x] Multi-format document parsers (`parsers/`):
  - PDF parser (`pdfjs-dist`) retaining exact page numbers and bounding box positions.
  - DOCX parser (`mammoth`) extracting raw structured text blocks.
  - Plain text & Markdown parser with line bounding boxes.
  - Scanned PDF detection heuristic (< 50 chars/page triggers OCR).
- [x] Multi-file profile merger & conflict resolver (`merger.ts`):
  - Deduplication of overlapping experiences (same company + start date combines achievements and keeps richer title).
  - Union of canonical ESCO skills across files.
  - Non-destructive conflict detection (flags conflicting phone numbers or overlapping dates for user resolution).
- [x] Split-View Profile Review UI (`apps/desktop/src/views/ProfileView.tsx`):
  - Left pane: Editable structured profile cards (Contact, Summary, Experience, Education, Skills) with confidence badges.
  - Right pane: Source document viewer with active field highlighting and provenance indicator.
  - Interactive multi-file conflict resolution banner with radio selection.
  - "Accept All High-Confidence" action button.
- [x] Evaluation harness & golden fixtures (`eval/scripts/run-eval.ts` and `eval/resumes/`):
  - 3 synthetic golden resumes (Persian, English, and bilingual AI engineer).
  - Field-level accuracy results: Contact **100.0%** (target $\ge 98\%$), Experience **100.0%** (target $\ge 92\%$).
- [x] 19 unit tests passing across 8 test suites in `vitest`.

---

## Phase 2: Sources and Discovery
- **Status:** Next Up
- **Focus:**
  - Source adapter framework (`SourceAdapter` interface, rate limiting with `p-queue`, `robots-parser`).
  - Initial adapters: ACBAR.org, Jobs.af, Greenhouse, Lever.
  - Schema.org `JobPosting` JSON-LD first extraction.
  - Job deduplication (canonical URL, normalized hash, SimHash).
  - Background scheduler & desktop job feed UI.
