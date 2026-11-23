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

## Phase 2: Sources and Discovery (US & Europe Priority)
- **Status:** COMPLETED
- **Focus & Achievements:**
  - **Zero Paid/Keyed APIs Policy Enforced:** 100% local polite crawlers and public syndicate APIs.
  - **Polite Network Architecture (`packages/adapters/src/network/`):**
    - Domain-isolated concurrency and rate limiting via `p-queue`.
    - Random jittered delays (150-350ms) to prevent lockstep server hammering.
    - Honest User-Agent: `Kaarjoo/1.0 (+https://github.com/ferdouskazemi/kaarjoo; Desktop Job Search Tool)`.
    - Native `robots.txt` compliance parser and 24-hour cache.
    - Conditional HTTP requests via `ETag` and `If-Modified-Since` (304 Not Modified caching).
    - Exponential backoff and Retry-After handling on 429 status codes; polite cessation on 403 (no fingerprint spoofing, no stealth plugins, no captcha breaking).
  - **3-Tier Deduplication Pipeline (`packages/adapters/src/dedup/`):**
    - 1) Canonical URL normalization (strips `utm_*`, `gh_src`, `ref`, `lever-source`, `ashby_jid`) + SHA-256 hash.
    - 2) Normalized `company|title|location` tuple hash with legal suffix stripping (`Inc`, `LLC`, `GmbH`, `Corp`).
    - 3) 64-bit SimHash (Charikar algorithm) with term-frequency weighting for near-duplicate detection (Hamming distance $\le 3$).
  - **Extraction Pipeline (`packages/adapters/src/extractors/`):**
    - Schema.org `JobPosting` JSON-LD parser extracting title, company, location, remote status (`TELECOMMUTE`), salary range, employment type, and validThrough.
    - Sanitized HTML to clean Markdown converter via `turndown`.
  - **US & European Job Adapters (`packages/adapters/src/adapters/`):**
    - `GreenhouseAdapter`: Public syndication API (`boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true`).
    - `LeverAdapter`: Public postings API (`api.lever.co/v0/postings/{company}?mode=json`).
    - `AshbyAdapter`: Public job-board API (`api.ashbyhq.com/posting-api/job-board/{company}`).
    - `WorkableAdapter`: Public widget API (`apply.workable.com/api/v1/widget/accounts/{company}`).
    - `WeWorkRemotelyAdapter`: Public RSS feed syndication for remote tech engineering jobs.
    - `AssistJobAdapter`: Assist-mode parser for manual LinkedIn/Indeed imports without forbidden crawling or logins.
  - **Company Directory & Auto-Detection (`packages/adapters/src/companies/`):**
    - Seeded directory of 18 premier US & European tech companies (Stripe, Figma, OpenAI, Spotify, Datadog, Klarna, DeepL, Revolut, Vercel, GitLab, etc.).
    - Automated ATS detector identifying Greenhouse, Lever, Ashby, and Workable from careers page URLs or embedded iframes.
  - **Database & RPC Integration:**
    - SQLite migration `20260201_sources_and_simhash.sql` adding `sim_hash`, `tuple_hash`, `company_boards` table, and performance indexes.
    - Node Engine JSON-RPC handlers registered: `jobs.search`, `jobs.fetchDetail`, `jobs.getCompanyBoards`, `jobs.addCompanyBoard`, `jobs.detectAts`, `jobs.checkHealth`, `jobs.importFromHtml`.
  - **Desktop Job Discovery UI (`apps/desktop/src/views/JobsView.tsx`):**
    - Bilingual (English / Persian RTL) responsive interface.
    - Live Polite Crawler health badge ("Sources Online (Polite Crawler)").
    - Filter bar: Keyword search, Region tabs (🇺🇸 US, 🇪🇺 Europe, 🌍 Remote Worldwide), Workplace pills (Remote, Hybrid, On-site), ATS Provider pills (Greenhouse, Lever, Ashby, Workable).
    - `JobCard`: Company gradient avatar, title, location, remote badge, ATS provider tag, and interactive circular Match Score ring.
    - `JobDetailDrawer`: Match breakdown (matched vs missing skills), salary banner, full Markdown description, and "Apply with Review" CTA.
    - `CompanyBoardsModal`: Monitored company manager with toggle switches and URL ATS auto-detection.
  - **Verification:**
    - 42 out of 42 tests passing across 13 test suites in `vitest`.
    - Profile extraction evaluation harness passing with **100.0%** accuracy.
    - Rust core compiling cleanly with `cargo check` in 0.87s.
    - Desktop React application building cleanly in 3.9s.

---

## Phase 3: Matching and Ranking (Local AI)
- **Status:** Next Up
- **Focus:**
  - Hard filters engine (location, remote preference, seniority, salary floor).
  - Local AI semantic embeddings (GGUF embedding model via `node-llama-cpp` or lightweight transformer).
  - Canonical ESCO skill coverage calculation (matched / missing / transferable).
  - LLM re-ranking of top N candidates with structured scoring.
  - Calibrated weighted blend score with interactive user feedback.
