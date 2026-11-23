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

---

## Phase 1: Ingestion and Profile Extraction
- **Status:** In Progress (Committed in `60b756c`, `0fab472`, `0e0892a`, and `68e01bf`)

### Completed
- [x] Bilingual text normalizer (`normalizer.ts`): Arabic letter normalization (`ي/ك`), ZWNJ handling, and Persian/Arabic numeral conversion.
- [x] Section heading detector (`sections.ts`): Covers 8 standard resume sections in both Persian and English.
- [x] Deterministic contact extractor (`contact.ts`): Strict email validation, international phone formatting (`+93`, `+98`, etc.) via `libphonenumber-js`, and profile links (LinkedIn, GitHub).
- [x] Deterministic experience extractor (`experience.ts`): Jalali/Gregorian date parsing, achievements extraction, and current employment status.
- [x] Deterministic education extractor (`education.ts`): Degree level detection, institution matching, and date ranges.
- [x] Skills taxonomy extractor (`skills.ts`): Canonical ESCO skill dictionary with comprehensive Persian/English alias mapping.
- [x] Evaluation harness & golden fixtures (`eval/scripts/run-eval.ts` and `eval/resumes/`):
  - 3 synthetic golden resumes (Persian, English, and bilingual AI engineer).
  - Field-level accuracy results: Contact **100.0%** (target $\ge 98\%$), Experience **100.0%** (target $\ge 92\%$).
- [x] 16 unit tests passing across 6 test suites in `vitest`.

### In Progress
- [ ] Multi-file parser integration: PDF position extraction (`pdfjs-dist`), DOCX (`mammoth`), and OCR (`tesseract.js`).
- [ ] Evidence-grounded LLM profile extractor with JSON schema grammars.
- [ ] Split-view profile verification and conflict resolution UI.
