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
- **Status:** COMPLETED (Committed in `cf20e21`)

### Completed
- [x] **Zero Paid/Keyed APIs Policy:** 100% local polite crawlers and public syndication endpoints.
- [x] **Polite Network Architecture (`packages/adapters/src/network/`):**
  - Domain-isolated concurrency and rate limiting via `p-queue`.
  - Random jittered delays (150-350ms) to avoid server lockstep hammering.
  - Honest User-Agent: `Kaarjoo/1.0 (+https://github.com/ferdouskazemi/kaarjoo; Desktop Job Search Tool)`.
  - Native `robots.txt` compliance parser and 24-hour cache.
  - Conditional HTTP requests via `ETag` and `If-Modified-Since` (304 Not Modified caching).
  - Exponential backoff on 429 status codes; graceful stop on 403.
- [x] **3-Tier Deduplication Pipeline (`packages/adapters/src/dedup/`):**
  - Canonical URL normalization (stripping tracking query params: `utm_*`, `gh_src`, `ref`) + SHA-256 hash.
  - Normalized `company|title|location` tuple hash with legal suffix stripping.
  - 64-bit SimHash (Charikar algorithm) with term-frequency weighting for near-duplicate detection (Hamming distance $\le 3$).
- [x] **Extraction Pipeline (`packages/adapters/src/extractors/`):**
  - Schema.org `JobPosting` JSON-LD parser extracting title, company, location, remote status (`TELECOMMUTE`), salary range, employment type, and validThrough.
  - Sanitized HTML to clean Markdown converter via `turndown`.
- [x] **US & European Job Adapters (`packages/adapters/src/adapters/`):**
  - `GreenhouseAdapter`, `LeverAdapter`, `AshbyAdapter`, `WorkableAdapter`, `WeWorkRemotelyAdapter`, `AssistJobAdapter`.
- [x] **Company Directory & Auto-Detection (`packages/adapters/src/companies/`):**
  - Seeded directory of 18 premier US & European tech companies (Stripe, Figma, OpenAI, Spotify, Datadog, Klarna, DeepL, Revolut, Vercel, GitLab, etc.).
  - Automated ATS detector identifying Greenhouse, Lever, Ashby, and Workable from careers page URLs or embedded iframes.
- [x] **Desktop Job Discovery UI (`apps/desktop/src/views/JobsView.tsx`):**
  - Filter bar: Region (US, Europe, Remote Worldwide), Workplace (Remote, Hybrid, On-site), ATS Provider.
  - `JobCard`, `JobDetailDrawer`, and `CompanyBoardsModal`.
- [x] 42 unit tests passing across 13 test suites in `vitest`.

---

## Phase 3: Matching and Ranking (Local AI)
- **Status:** COMPLETED (Committed in `c86332e`)

### Completed
- [x] **Hard Filters & Candidate Gating Engine (`packages/engine/src/matching/hardFilters.ts`):**
  - Excluded companies filter (instant reject/0 score).
  - Workplace & Remote type mismatch detection (penalizes mandatory on-site roles when user requests remote).
  - Government security clearance and visa sponsorship restriction detector.
  - Seniority bounds estimator (calculates profile experience duration vs job requirements).
  - Salary floor validator (compares job salary ceiling against user minimum salary).
  - Expired posting detection.
- [x] **Local Semantic Similarity & Embedding Engine (`packages/engine/src/matching/embeddings.ts`):**
  - 100% local sparse TF-IDF and N-gram vectorizer with cosine similarity.
  - Title alignment score (candidate target titles + experience titles vs job title).
  - Full content alignment score (achievements and summary vs job requirements).
  - Zero external network calls and zero paid API keys.
- [x] **ESCO Skill Coverage & Transferable Skills (`packages/engine/src/matching/skillCoverage.ts`):**
  - Expanded ESCO taxonomy covering modern tech stacks (React, Vue, TypeScript, Go, Python, PyTorch, Docker, Kubernetes, Kafka, Terraform, Design Systems, etc.).
  - Distinguishes exact skill matches, transferable skills within the same category (50% credit), and missing skills.
- [x] **Local LLM Re-ranker & Explanation Schema (`packages/engine/src/matching/rerank.ts`):**
  - Strict schema output: 0-100 score, top 3 factual reasons, gaps, red flags, and "Why not higher?" explanation.
  - Calibrated weighted blend:
    $\text{Score} = w_1 \times \text{HardFilter} + w_2 \times \text{Semantic} + w_3 \times \text{SkillCoverage} + w_4 \times \text{Rerank}$
- [x] **Adaptive User Feedback Service (`packages/engine/src/matching/handler.ts`):**
  - Thumbs up (relevant) / Thumbs down (irrelevant) feedback loop.
  - Dynamically tunes user matching weights.
  - JSON-RPC methods: `matching.scoreJob`, `matching.rankAllJobs`, `matching.recordFeedback`, `matching.getWeights`.
- [x] **Matching Benchmark Evaluation (`eval/scripts/run-matching-eval.ts` & `eval/matching/labeled_pairs.json`):**
  - Gold labeled pairs across senior backend, frontend, and AI profiles against US/EU jobs.
  - Verified **Precision@10 = 100.0%** (exceeding the $\ge 80.0\%$ target metric).
- [x] **Desktop Matching UI Integration:**
  - `JobCard`: Dynamic animated Match Ring SVG with color transitions (green/sky/amber) and Thumbs Up/Down feedback buttons.
  - `JobDetailDrawer`: Multi-bar score breakdown (Hard Filters, Semantic Similarity, Skill Coverage, LLM Re-rank), Top 3 Reasons with sparkle bullets, "Why not higher?" advice card, and Matched/Missing skill chips.
- [x] 50 unit tests passing across 14 test suites in `vitest`.

---

## Phase 4: Tailored Documents & Truthfulness Guard
- **Status:** COMPLETED
- **Focus & Achievements:**
  - **ATS-Safe Résumé Templates (`packages/engine/src/documents/templates/`):**
    - `ats-clean`: Pure single-column linear hierarchy, zero complex floats or tables, standard heading hierarchy (Contact, Summary, Experience, Skills, Education). Fully compatible with Workday, Greenhouse, Lever, Taleo, and Ashby ATS parsers.
    - `modern-minimal`: High-taste engineering design with subtle left-border accents and skill pills.
    - `compact-technical`: High-density layout tailored for senior engineers.
    - Complete bilingual support: English (LTR, Inter) and Persian (RTL, Vazirmatn).
  - **Document Tailoring Engine (`packages/engine/src/documents/tailor.ts`):**
    - `tailorResume`: Reorders relevant skills and experience bullets to emphasize job requirements. Rewrites bullets for job terminology while keeping every factual claim true.
    - `generateCoverLetter`: Short, specific, in target company's language, referencing 2 real verified achievements from candidate profile.
  - **Mandatory Truthfulness Guard (`packages/engine/src/documents/truthfulness.ts`):**
    - Ground truth fact extraction from profile (verified employers, degrees, institutions, duration, metrics).
    - Cross-verification pipeline checking for:
      - Hallucinated employers (e.g. inventing Google/Apple).
      - Invented degrees or institutions (e.g. fake PhDs or unverified universities).
      - Duration inflation (claiming 15+ years when profile has ~3.5 years).
      - Quantitative metric inflation (inventing unverified dollar figures or team sizes).
    - Automated flagging with severity levels (`high`, `medium`, `low`) and confidence score.
  - **Screening Answer Bank (`packages/engine/src/documents/answerBank.ts`):**
    - Approved answer repository for common screening questions:
      - `notice_period` (2 weeks default).
      - `salary` (formatted from user preferences).
      - `work_auth` (visa sponsorship/remote authorization status).
      - `relocation` (remote preference).
      - `experience_years` (computed dynamically from profile experience dates for requested tech).
      - `eeo_demographic` (strict default: "Decline to self-identify").
  - **Multi-Format Document Exporters (`packages/engine/src/documents/exporters/`):**
    - High-resolution PDF export via host system Chrome/Edge (`page.pdf()`).
    - Microsoft Word (`.docx`) export via `docx` library with clean typography and ATS bullet lists.
  - **Desktop Tailored Documents Studio (`TailoredDocumentsModal.tsx`):**
    - Side-by-side Diff View: Original profile reference on Left, Tailored editable resume on Right.
    - Real-time Truthfulness Guard banner with 🟢/⚠️ live verification.
    - Language switcher (English / فارسی).
    - Template switcher (ATS-Safe, Modern Minimal, Compact Technical).
    - One-click PDF and DOCX export.
    - Dedicated tabs for Cover Letter (with Copy to clipboard) and Screening Answer Bank.
  - **Verification:**
    - 61 out of 61 unit tests passing across 15 test suites in `vitest`.
    - Unit tests covering 4 adversarial hallucination/inflation attacks.
    - Profile extraction evaluation: **100.0%** accuracy.
    - Matching evaluation: **100.0%** Precision@10.
    - Rust core compiling cleanly with `cargo check` in 0.89s.
    - Desktop React application building cleanly in 4.4s.

---

## Phase 5: Application Engine (Form Filling & ATS Drivers)
- **Status:** COMPLETED
- **Focus & Achievements:**
  - **ATS Form Fillers Architecture (`packages/ats/src/fillers/`):**
    - `GreenhouseFiller`: Form filling for Greenhouse boards (`#first_name`, `#last_name`, `#email`, `#phone`, `#resume`, custom questions, EEO dropdowns).
    - `LeverFiller`: Form filling for Lever postings (`input[name="name"]`, `email`, `phone`, `org`, URLs, comments, resume upload).
    - `AshbyFiller`: Dynamic field handling for Ashby boards.
    - `WorkableFiller`: Form handling for Workable widget applications.
    - `GenericFormFiller`: Fallback heuristic form filler for arbitrary HTML career pages.
  - **Field Mapping & Heuristics Pipeline (`packages/ats/src/`):**
    - `detector.ts`: High-speed DOM field scanner extracting label, name, id, placeholder, aria-label, required status, and select options.
    - `matcher.ts`: Exact, substring, boolean, and Jaccard word-overlap matching for dropdown options. Strict EEO / demographic default policy (always selects "I decline to self-identify" / "Prefer not to say").
    - `mapper.ts`: Canonical mapping from profile, tailored resume, cover letter, and screening answers with per-field confidence scoring and categorized review checklists.
    - `discovery.ts`: Zero-dependency system browser discovery across Windows Registry, macOS, and Linux.
  - **Review Mode by Default & Ethical Automation:**
    - Fills all form fields, attaches verified tailored PDF/DOCX documents, and pauses on final step.
    - Generates full-page browser screenshot (`screenshotBeforeSubmit`) and detailed verification checklist.
    - Requires explicit user approval before clicking final submit button.
    - **Stop-and-Ask Triggers:** Instant halt and user alert on CAPTCHA challenge (reCAPTCHA, hCaptcha, Turnstile, Arkose), login walls, or unanswerable required fields. Zero bypass attempts.
  - **Local Mock ATS Fixtures & End-to-End Tests (`packages/ats/fixtures/` & `__tests__/`):**
    - Local mock forms for Greenhouse, Lever, Ashby, Workable, CAPTCHA challenge, and Login wall.
    - 17 unit and Playwright integration tests verifying 100% field mapping accuracy, attachment handling, review mode halts, and submission confirmation.
  - **JSON-RPC Engine Integration (`packages/engine/src/index.ts`):**
    - Endpoints: `application.queue`, `application.getAll`, `application.get`, `application.execute`, `application.submitReviewed`, `application.cancel`.
  - **Desktop Application Queue & Review View (`apps/desktop/src/views/QueueView.tsx`):**
    - Multi-card queue management with real-time status badges.
    - Step-by-step Playwright execution progress bar.
    - Live browser screenshot thumbnail with expand/fullscreen zoom modal.
    - Categorized verification checklist (Contact, Documents, Screening, EEO).
    - One-click "Approve & Submit" with real-time feedback.
    - Seamless transition from Tailored Documents Studio into the Review Queue.
  - **Verification:**
    - 78 out of 78 unit tests passing across 20 test files in `vitest`.
    - Profile extraction evaluation: **100.0%** accuracy.
    - Matching evaluation: **100.0%** Precision@10.
    - Rust core compiling cleanly with `cargo check` in `apps/desktop/src-tauri`.
    - Desktop React application building cleanly in 4.01s.

---

## Phase 6: Application Tracker, Kanban Dashboard & Settings
- **Status:** COMPLETED
- **Focus & Achievements:**
  - **Interactive Kanban Pipeline (`apps/desktop/src/components/tracker/KanbanBoard.tsx`):**
    - 6 columns: `ذخیره‌شده` (Saved), `آماده ارسال / صف` (Ready / Queued), `ارسال‌شده` (Applied), `مصاحبه` (Interview), `پیشنهاد کاری` (Offer), `رد شده / بایگانی` (Rejected).
    - Quick-mover navigation buttons between adjacent pipeline stages.
    - Card metadata: Company, ATS badge, Job title, Location, Salary, Local Match Score badge, and Interview Date indicator.
  - **Comprehensive Applications Table View (`ApplicationsTableView.tsx`):**
    - Instant full-text search across company name, role title, and location.
    - Status-based filtering dropdown.
    - Sortable columns: Company & Role, ATS provider, Match score, Salary, Status, Date.
    - Row actions: Inspect application details, open original URL, and delete/archive.
  - **Application Detail & Audit Drawer (`ApplicationDetailDrawer.tsx`):**
    - **Documents & Snapshot Tab:** Offline copy of job description, tailored resume version used, and cover letter text.
    - **Timeline Tab:** Event log (Saved → Tailored → Queued → Applied → Interview → Offer) with timestamps and custom notes.
    - **Evidence & Screenshots Tab:** High-resolution screenshots of the pre-submit Review step and confirmation screen.
    - **Notes & Interview Scheduling Tab:** Editable interview date picker, notes textarea, and follow-up reminders.
  - **Dashboard KPIs & Actionable Learning Roadmap (`DashboardKpisWidget.tsx`):**
    - 4 real-time KPI metrics: Total applications tracked, weekly submissions against goals, interview conversion rate (%), and average local match score.
    - **Learning Roadmap Widget:** Top missing skills across good matches (e.g. WebGL Shaders, Triton Kernels, Raft Consensus) surfacing learning suggestions.
    - ATS distribution breakdown.
  - **Data Export & Settings Polish (`SettingsView.tsx`):**
    - One-click CSV export generating formatted records with headers.
    - Browser preferences: Google Chrome, Microsoft Edge, or automatic system detection, with Headless Mode toggle.
    - Local SQLite database backup and safe local data wipe controls.
  - **Verification:**
    - 78 out of 78 unit tests passing across 20 test files in `vitest`.
    - Profile extraction evaluation: **100.0%** accuracy.
    - Matching evaluation: **100.0%** Precision@10.
    - Rust core compiling cleanly with `cargo check` in 0.83s.
    - Desktop React application building cleanly in 4.49s.

---

## Phase 7: Polish, Packaging & Release
- **Status:** Next Up
- **Focus:**
  - Full design audit against Taste Skill, Emil Kowalski motion guidelines, and Impeccable typography tokens.
  - Desktop installer packaging (`.msi` / `.exe` on Windows, `.dmg` on macOS) via Tauri bundler.
  - Bilingual user guide (`docs/user-guide-fa.md`).
  - Production readiness checklist and release verification.
