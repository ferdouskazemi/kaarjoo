# Kaarjoo: پرامپت پیاده‌سازی تغییرات (بعد از بررسی کامیت f99a3ed)

**راهنمای استفاده (فارسی):**
- این فایل ۹ پرامپت دارد. **در هر جلسه‌ی جدید عامل کدنویس، اول «Prompt 0» را بفرستید، بعد فقط یکی از پرامپت‌های شماره‌دار را.**
- ترتیب را رعایت کنید. پرامپت ۱ (توقف خونریزی) باید قبل از هر استفاده‌ی واقعی دیگری از برنامه انجام شود.
- تا عامل «شواهد» معیارهای پذیرش را نشان نداده (خروجی دستورها، تست‌ها، اسکرین‌شات)، پرامپت بعدی را ندهید.
- ماکاپ‌ها را هم کنار پرامپت ۷ و ۸ به عامل بدهید: پوشه‌ی `mockups/` (فایل‌های PNG و `reference-design.html`).
- پرامپت‌ها عمداً انگلیسی‌اند چون عامل‌های کدنویس با انگلیسی دقیق‌تر کار می‌کنند. عامل با شما فارسی حرف می‌زند.

جزئیات هر مشکل و شماره‌ی خط‌ها در `code-review.md` کنار همین فایل است. اگر عامل به آن دسترسی دارد، آن را هم در `docs/review/` مخزن کپی کنید.

---

## Prompt 0: Session preamble (paste at the start of EVERY session)

```text
You are continuing work on Kaarjoo (repo root = current folder): a Tauri 2 desktop app
(Rust core + SQLite/sqlx) with a Node 22 sidecar engine (JSON-RPC over stdio), packages
shared / adapters / ats / engine, and a React 19 UI in apps/desktop/src.

Before doing anything:
1. Read AGENTS.md, docs/PROGRESS.md, docs/adr/*, and docs/review/code-review.md if present.
2. Run `git log --oneline -15` and `git status`. Create a branch for this task:
   `git checkout -b <type>/<short-task-name>`.
3. Run the baseline: `pnpm install --frozen-lockfile && pnpm build && pnpm test`
   and `cd apps/desktop/src-tauri && cargo test`. Record the numbers.

Non-negotiable rules for this session (they override anything softer in older docs):
- TRUTH FIRST. A feature is done only if it works in the real app (`pnpm tauri dev`) end to
  end with real data. Never write "COMPLETED" without having run it. Partial = "PARTIAL: <what is missing>".
- Evidence for every claim: paste exact commands + relevant output; screenshots for UI
  (fa + en, dark + light).
- NEVER invent user data. No default names, emails, phones, titles, companies, scores.
  Unknown = null, and the UI shows it as missing.
- NEVER submit an application the user has not explicitly approved after seeing the
  CURRENT state of the real form. Review mode is the only default.
- No silent error swallowing: no `let _ =` on fallible calls in Rust and no empty `catch {}`
  in TS, unless a comment explains why ignoring is correct AND the error is logged.
- Verify library APIs against installed package types / current docs. Never invent APIs.
- No mock data in production code paths. Fixtures live in tests/ or eval/ only; demo mode
  must be OFF by default, clearly labeled, and isolated in one module.
- Every bug fix gets a regression test that fails before the fix and passes after.
- Small Conventional Commits. Update docs/PROGRESS.md honestly at the end.
- Talk to me in Persian; write all code, comments, commits and docs in English.

Reply first with: your understanding of the task, the plan (files you will touch), and the
acceptance checks you will prove at the end. Then do the work.
```

---

## Prompt 1: Stop the bleeding (P0 fixes; do this before anything else)

```text
Task: fix the seven critical defects below. Keep changes minimal and surgical; the larger
refactors come in later prompts. Each item needs a regression test.

1. Hard-coded personal data used as defaults
   - packages/engine/src/ingestion/extractors/contact.ts (end of extractContactInfo):
     remove the fallbacks 'Ferdous Kazemi', 'ferdouskazemi1000@gmail.com', '+93 728 200 021'.
     Missing values must be undefined/null.
   - packages/engine/src/ingestion/pipeline.ts: remove 'unspecified@example.com' fallback.
   - Make the shared UserProfile schema allow contact.email / phone / fullName to be null,
     and update Rust DTOs (models.rs) + DB columns (new migration: make columns NULLable)
     accordingly.
   - Replace the real email/phone in ALL tests, eval scripts and stores with
     jane.doe@example.com / +1 555 0100 style fixtures. Grep the whole repo for
     "ferdouskazemi1000", "728 200 021", "C:\\Work" and remove every hit.
   - Add a test: a résumé without email/phone produces null email/phone.
   - Add a CI guard test that fails if those strings ever reappear in the repo.

2. Fabricated experience data
   - packages/engine/src/ingestion/extractors/experience.ts: do not default title to
     'Software Engineer' or company to 'Company'. Start with company undefined so the
     existing "next non-bullet line is the company" branch can actually run. Handle the
     common "COMPANY, City, Country — dates" + "Title (dates)" two-line layout (see the
     screenshot case: "INOLITIX, CA, United States • 2022 – Present" followed by the title).
   - Add fixtures from eval/resumes that cover one-line and two-line layouts; assert
     company and title are correct or null, never placeholder strings.

3. Always-on "VERIFIED" badge and misleading completeness
   - apps/desktop/src/views/ProfileView.tsx: render the verified badge only when the user
     has confirmed that section (persist `confirmedAt` per section in DB; new migration).
   - Completeness must count only non-null, non-placeholder values; show what is missing.

4. False "applied" / "needs_review" statuses (apps/desktop/src-tauri/src/commands.rs)
   - applications_execute_review: map the engine's returned record.status
     ('needs_review' | 'needs_user' | 'failed' | 'submitted') to the DB status exactly.
     Persist stopReason + stopMessage + missingRequiredFields. Never hard-code "needs_review".
   - applications_submit_reviewed: read the engine result. Only 'submitted' with a detected
     confirmation becomes `submitted_verified`; click done but no confirmation becomes
     `submitted_unverified`; anything else keeps the previous status and returns a typed error.
   - Reject submit unless current DB status is 'needs_review' AND missingRequiredFields is empty.
   - Remove `match_score: job.match_score.unwrap_or(85.0)`: use None/null.
   - Add Rust unit tests for the mapping with a fake engine response.

5. Re-fill-and-submit without review (packages/ats/src/engine.ts, submitReviewedApplication)
   - The rehydrate path must NEVER submit. If the session is gone, re-open + re-fill and
     return status 'needs_review' with a flag `refilled: true`, so the UI asks the user to
     review again.
   - Make submission idempotent: Rust generates a `submitAttemptId` (UUID) stored in DB
     before calling the engine; engine refuses a second submit for the same application
     while one is in flight or after success; Rust refuses if an attempt already succeeded.

6. Fake ISO timestamps
   - commands.rs `chrono_lite_iso()` returns "1764150000.123Z" which is not ISO-8601.
     Replace with RFC 3339 via the `time` crate (`OffsetDateTime::now_utc().format(&Rfc3339)`).
   - Write a migration that converts existing bad timestamps in applications/timeline
     (pattern ^\d+\.\d{3}Z$) to RFC 3339.

7. Broken feedback RPC
   - commands.rs matching_record_feedback sends {jobId, feedback} but the engine schema
     requires profileId and feedback in ('relevant'|'irrelevant'). Send profileId, validate
     the feedback enum in Rust, and surface errors instead of `let _ =`.

Acceptance (prove each):
- `git grep -n "ferdouskazemi1000\|728 200 021\|'Company'\|'Software Engineer'"` returns nothing
  in src (tests may only contain example.com fixtures).
- New regression tests listed above exist and pass; full `pnpm test` and `cargo test` green.
- Manual run in `pnpm tauri dev`: upload a résumé with no phone → the profile shows phone
  as missing; queue an application to a page with a CAPTCHA fixture → status shows
  "Needs you", not "Applied".
```

---

## Prompt 2: Engine supervisor and IPC hardening (Rust)

```text
Task: replace apps/desktop/src-tauri/src/engine.rs with a correct process supervisor.

Current defects (see code-review.md P0-6):
- The CommandChild is never stored (`*self.child.lock().await = None;`), so it is never
  killed; shutdown() does nothing; no exit hook; orphan node/Chrome processes remain.
- Health-check "restart" spawns a second engine without killing the hung one; the old
  reader's Terminated handler then drains the NEW process's pending map.
- spawn() is not atomic (request() and the health loop can both spawn).
- stdout chunks are decoded with from_utf8_lossy per chunk, which corrupts multi-byte
  Persian characters split across chunks; line_buffer reallocation is O(n^2).
- Fixed 60 s timeout for every method.
- Full stdout (résumé text, profile JSON) is appended to engine.log without rotation.

Implement:
1. `EngineSupervisor` as an actor: one tokio task owns the child, the stdin writer, the
   pending map and a `generation: u64`. Public API via an mpsc command channel:
   `request(method, params, RequestOptions{timeout, cancel_token})`, `restart()`, `shutdown()`.
2. Each pending entry is tagged with the generation; Terminated events only fail entries of
   their own generation.
3. Restart = kill (child.kill() and, on Windows, kill the process tree; on macOS/Linux send
   SIGTERM then SIGKILL after 3 s) → wait → spawn → wait for the `engine.ready`
   notification (10 s timeout) before accepting requests. Exponential backoff with jitter,
   max 5 restarts per 5 min, then emit `engine:fatal` to the UI.
4. Register `RunEvent::ExitRequested` / `WindowEvent::CloseRequested` handlers that call
   shutdown() and await child exit (max 5 s). Also tell the engine `system.shutdown` so it
   closes all Playwright contexts first.
5. Byte-level framing: keep a `Vec<u8>` buffer, split on b'\n', decode each complete line
   with `String::from_utf8` (log and drop invalid lines). Cap a single line at 32 MB.
6. Per-method timeouts table (e.g. ping 5 s, profile.parseAndExtract 180 s,
   application.execute 180 s, application.submitReviewed 120 s, models.download none
   (progress-driven, cancellable), default 60 s). On timeout send `$/cancelRequest`
   {id} to the engine; implement cancellation in the engine RPC server with AbortSignal
   passed to handlers.
7. Typed errors: define `enum AppError { EngineUnavailable, EngineTimeout{method},
   Rpc{code,message,data}, Db(String), Validation(String), NotFound(String), ... }` with
   serde + specta so the UI receives `{ kind, message, data }` instead of strings.
   Use it across commands.rs.
8. Logging: initialise `tracing-subscriber` + `tracing-appender` (daily rotation, keep 7)
   in lib.rs. Engine stdout is NOT logged by default; log only method, id, duration and
   error codes. A debug setting may enable payload logging with redaction of email, phone,
   names and file contents.
9. Fix the panic hook (handle String payloads; append, include backtrace) and move the file
   to appDataDir/logs.
10. Version: read from `app.package_info().version` everywhere; make tauri.conf.json,
    Cargo.toml and package.json agree.

Tests:
- Rust integration test using a tiny fake engine script (node or a Rust test binary) that
  (a) answers normally, (b) hangs, (c) crashes mid-request, (d) splits a Persian UTF-8
  character across two writes, (e) prints a 10 MB line. Assert: no duplicate processes,
  correct errors per generation, correct decoding, restart works, shutdown kills the child.

Acceptance:
- Close the app while an application is filling → no node/chrome processes remain
  (show `tasklist`/`ps` output before/after).
- Kill the engine manually → UI shows "Restarting engine…" then recovers; in-flight
  requests fail with EngineUnavailable, new ones succeed.
- Then remove the "kill locked processes" workaround from nsis/hooks.nsh if no longer needed
  (keep only a safe, scoped check) and explain.
```

---

## Prompt 3: One source of truth, task queue and application state machine

```text
Task: move orchestration out of React into Rust, delete the parallel mock state, and
introduce an explicit application state machine.

1. Delete production use of mock data:
   - apps/desktop/src/stores/applicationStore.ts (621 lines incl. Spotify/OpenAI seeds and
     Unsplash images) and profileStore mock paths. If a demo mode is kept, move all demo data
     into apps/desktop/src/demo/ behind a single `isDemo` flag, OFF by default, with a
     persistent "Demo data" banner. The DB is the only source of truth otherwise.
   - QueueView must not switch data sources based on whether the DB is empty.
2. Application state machine in Rust (new module `application_fsm.rs`):
   states: draft → kit_ready → filling → needs_user | needs_review | failed
           needs_user → filling (after user resolves) | cancelled
           needs_review → submitting → submitted_verified | submitted_unverified | failed
           submitted_* → interviewing → offer | rejected | withdrawn
   Every transition goes through `transition(app_id, event) -> Result<State, AppError>`
   which validates, writes the new state + a timeline row in ONE transaction, and emits
   `app:application-updated`. `applications_update_status` only accepts user-allowed
   transitions (e.g. interviewing/offer/rejected/withdrawn).
3. Background task queue in Rust using the existing `tasks` table:
   - task types: discover, rank, tailor, fill, submit.
   - A worker pool (config: max 2 concurrent browser tasks, 1 OCR task) processes tasks,
     persists progress, supports cancel, and survives app restart (re-queue 'running' as
     'queued' with attempt+1, except submit, which goes to needs_review for safety).
   - Emit `task:progress` events {taskId, appId, stage, pct, message} for the UI.
4. Replace pipelineStore's discover→tailor→fill loop with Rust commands:
   `pipeline_start_discovery(prefs)`, `applications_prepare(job_ids[])` (creates drafts +
   tailor tasks), `applications_fill(app_ids[])`. The UI only displays progress and can
   cancel; closing the window does not lose work.
   Remove client-side `matchesCvProfile`; ranking comes only from the engine.
5. DB fixes:
   - All `LEFT JOIN matches` must also join on profile_id (db.rs get_jobs, get_job_by_id,
     search_jobs_fts, get_all_applications).
   - Add indexes: applications(status, updated_at), matches(profile_id, overall_score DESC),
     jobs(status, first_seen DESC).
   - save_source_file: real MIME (from parser) and real SHA-256 computed in Rust.
   - profile_parse_and_extract must NOT overwrite an existing profile: create a new profile
     *version* and show a merge/diff screen (use the existing engine `profile.merge`);
     user-edited fields win unless the user picks otherwise.
   - Screenshots: store as files in appDataDir/screenshots/<appId>/<n>.jpg (viewport-only,
     max 1600 px wide, quality 70) and keep only paths in DB; serve via the asset protocol.
6. Generate TS types for all DTOs/events from Rust with tauri-specta (already present) and
   delete hand-written duplicates in the UI. Add a CI check that `bindings.ts` is up to date.

Tests: Rust unit tests for every allowed and forbidden transition; integration test that
restarts the app mid-task and verifies recovery; UI test that QueueView renders only DB data.
```

---

## Prompt 4: Security hardening

```text
Task: close the security gaps (code-review.md section 4, Security table).

1. Tauri capabilities (apps/desktop/src-tauri/capabilities/default.json): remove
   fs:default, shell:default and process:default from the webview. Keep window controls,
   dialog:allow-open/save, notification, updater. The sidecar is spawned from Rust only.
   Add a test/CI step that diffs the capability file against an allowlist.
2. File access: replace `profile_parse_and_extract(file_path)` with
   `profile_import_resume()` that opens the native dialog in Rust, copies the chosen file
   into appDataDir/sources/<sha256>.<ext> (size limit 25 MB, extension + magic-byte check),
   and passes only that internal path to the engine. Same pattern for any other file input.
3. Engine RPC: remove `outputPath` from documents.exportPdf/exportDocx. Resolve output inside
   appDataDir/exports with `path.resolve` and verify the result starts with the exports dir.
   Validate every path param in the engine the same way (sources/, exports/, screenshots/).
4. HTML injection in document templates (packages/engine/src/documents/templates/*.ts):
   escape every interpolated value with a single `escapeHtml()` helper (text) and
   `escapeAttr()` (attributes); add a lint rule or test that fails on raw `${resume.` in
   templates. In exporters/pdf.ts: launch with `javaScriptEnabled: false`, block all network
   with `page.route('**/*', r => r.abort())` (fonts must be embedded as data: URLs), and use
   a fresh non-persistent context.
5. CSP (tauri.conf.json): bundle Inter + Vazirmatn locally (woff2 in apps/desktop/public/fonts),
   remove Google Fonts origins, set `img-src 'self' asset: data:` (no https:), keep
   `script-src 'self'`, `connect-src ipc: http://ipc.localhost`.
6. Browser sessions: move Playwright user-data dirs from os.tmpdir() to
   appDataDir/browser-sessions/<appId>; on startup delete any dir older than 24 h; delete on
   success/cancel.
7. Real "Delete all my data": stop engine tasks, close browsers, then delete DB rows in all
   tables (incl. settings except UI language, embedding_cache, feedback), and the folders
   sources/, exports/, screenshots/, browser-sessions/, logs/. Models are optional (ask).
   Show a summary of what was deleted.
8. Secret scanning + PII guard in CI (gitleaks or a simple grep test from Prompt 1).
9. Write docs/SECURITY.md: threat model (malicious job page, malicious résumé file,
   compromised webview), what each control prevents.

Tests: path traversal attempts (`../../etc/passwd`, absolute paths, UNC paths on Windows)
are rejected; a résumé containing `<script>` and `<img src=x onerror>` renders as text in
PDF; export makes zero network requests (assert via route counter).
```

---

## Prompt 5: Browser co-pilot: visible, verified, single submit

```text
Task: rebuild the apply flow in packages/ats + engine so Review mode is real.

1. Visible browser: ApplicationEngine must launch the user's Chrome/Edge HEADED for review
   (`headless: false`) in an isolated profile, sized/positioned beside the Kaarjoo window
   (pass window bounds from Rust). Keep one browser instance with one context per
   application; max 2 concurrent contexts (configurable). Headless is allowed only for
   discovery and PDF export.
2. Fill then READ BACK: after filling, read every detected field's actual value from the
   DOM (`inputValue()`, checked state, selected option label, file input file names).
   Build `reviewChecklist` from the read-back values, with per-field status:
   `ok` (matches intended), `mismatch`, `empty_required`, `empty_optional`, `user_edited`,
   `unknown_field` (detected but not mapped). Never report a field as filled if `fill`
   threw; record the error on that field.
3. Live sync: watch for user edits in the browser (expose a binding + `input`/`change`
   listeners) and push `application.fieldChanged` notifications so the inbox table updates.
   Before submit, re-read all fields and re-check required fields.
4. Needs-user states: on CAPTCHA/login wall, bring the Chrome window to front, keep the
   context open, set status needs_user with a clear reason, and expose
   `application.resume(id)` that re-detects and continues filling after the user is done.
5. Submit:
   - Only via `application.submitReviewed(id, submitAttemptId)` after a fresh read-back
     with zero `empty_required` and zero `mismatch` (or mismatches the user accepted).
   - Click the submit button found by filler selectors; if not found, ask the user to click
     it themselves in Chrome and watch for navigation.
   - Confirmation detection: wait for navigation/network idle (max 20 s) instead of the
     fixed 1500 ms; check selectors, then text phrases ONLY in content that appeared after
     the click (compare DOM before/after), then URL patterns (/thank|confirm|success/).
     Result: verified | unverified | failed with evidence (screenshot path + matched text).
6. Mapper improvements: answer bank lookup for screening questions (exact + fuzzy on
   normalized question text, with the source shown), EEO questions default to
   "decline to answer" only when such an option exists, never guess yes/no work
   authorization: it must come from preferences or the user.
7. Persist ApplicationEngine state in Rust (no in-memory-only records); the engine is
   stateless apart from live browser contexts keyed by appId.

Tests (Playwright against packages/ats/fixtures, add more fixtures):
- a fill error on one field shows that field as failed in the checklist;
- a required field left empty blocks submit;
- user edits in the page appear as user_edited;
- a page that shows "Thank you for applying" in the footer BEFORE submit is not a false
  positive;
- double submit call results in exactly one click (idempotency);
- after engine restart, submit returns needs_review (refilled) and never clicks.
```

---

## Prompt 6: Profile extraction quality and evidence

```text
Task: make extraction honest and explainable.

1. Every extracted fact carries provenance: `{ value, confidence: 0..1, evidence: {
   sourceFileId, page, charStart, charEnd, text } | null, method: 'rule'|'ocr'|'llm'|'user' }`.
   Update shared schemas, Rust DTOs (store provenance JSON per field), and the UI.
2. Produce an `issues[]` list from the engine: severity blocker|warning|info, field path,
   message key, suggested action. Blockers: missing full name, email, or phone;
   zero experiences AND zero education. Warnings: experience without company/dates,
   empty summary, skills < 5, dates that overlap impossibly, text with OCR confidence < 0.6.
3. Experience/education extractors: support two-line headers (company line + title line),
   "Title at Company", "Company | Title", Persian layouts (شرکت / سمت), Jalali + Gregorian
   dates, "present/current/اکنون/تاکنون". No placeholders.
4. Run the eval (`pnpm eval`) before and after; report field-level precision/recall for
   name, email, phone, company, title, dates, skills on all 32 golden résumés. Target:
   email/phone ≥ 0.98 precision, company/title ≥ 0.85 F1, zero placeholder values.
   Commit eval-report.json.
5. Long-running parse: stream progress notifications (`profile.progress` with stage:
   reading | ocr page n/N | sections | facts | llm) so the UI can show real progress.
```

---

## Prompt 7: Design system and app shell (UI foundation)

```text
Task: build a token-based design system and new app shell, matching mockups/ (PNG files and
reference-design.html; copy them into docs/design/). Do not redesign individual pages yet
beyond what the shell needs.

1. Tokens (CSS custom properties in apps/desktop/src/styles/tokens.css, mapped into
   Tailwind v4 @theme): colors bg, surface, surface-2, surface-3, border, border-strong,
   text, text-2, muted, accent(+weak,+text), success, warning, danger (+weak each), for dark
   AND light themes (light values: warm off-white bg #F7F7F5, surface #FFFFFF, text #15181C…).
   Radii 6/10/14. Spacing 4-pt scale. Type scale 12/13/14/16/20/26 with Inter (en) and
   Vazirmatn (fa); Persian body is 15 px minimum.
   Remove ALL hard-coded hex colors and text-[10px]/text-[11px] from views/components
   (ProfileView has ~100 hex values, QueueView ~56). Add an ESLint rule / test that fails on
   new raw hex colors or font sizes < 12 px in .tsx.
2. Primitives (shadcn/ui-style, in components/ui/): Button (primary, secondary, ghost,
   danger, success; sizes sm/md/lg; loading + disabled-with-reason tooltip), Chip/Badge
   (ok/warn/bad/info/neutral), Card, Field row, Input, Textarea, Segmented control, Tabs,
   Table, Stepper, ScoreRing, Meter, EmptyState, ErrorState, Skeleton, Toast, Dialog,
   KeyboardHint. Each with focus-visible ring, 40 px minimum hit area, aria labels.
3. Shell: sidebar 232 px with nav Home, Profile, Opportunities, Review inbox, Tracker,
   Settings; counts badges (Review inbox count in red = "needs you"); footer status in plain
   language ("Ready · works offline", "Restarting engine…", "Chrome window open").
   Remove jargon chips from the title bar ("Local Engine Connected", "STANDARD",
   "Zero Data Leak", "100% LOCAL", "ATS v1.0").
   Each page header: title, one-line subtitle, at most ONE primary button.
4. RTL: logical properties only (ms/me/ps/pe/start/end); mirror icons that imply direction;
   Persian digits and Jalali dates via date-fns-jalali when lang=fa; LTR islands (`dir="ltr"`)
   for emails, URLs, file names, phone numbers.
5. Accessibility: WCAG AA contrast for all token pairs (add a unit test computing contrast),
   full keyboard navigation, `prefers-reduced-motion` respected (Motion animations off).
6. Global keyboard shortcuts: Ctrl/⌘K palette (exists), G then P/O/R/T to navigate, J/K list
   navigation, Enter open, Esc close, ⌘/Ctrl+Enter primary action. Show hints in UI.

Acceptance: screenshots of the shell + one page in en-dark, en-light, fa-dark, fa-light;
contrast test passes; lint rule catches a deliberately added `text-[10px]`.
```

---

## Prompt 8: New workflow screens (Profile review → Opportunities → Application kit → Review inbox → Tracker)

```text
Task: implement the new screens exactly as in docs/design (mockups 0–5). Use only the
design-system primitives from Prompt 7 and data from Rust commands (no mock data).

A. Onboarding + Profile review (mockup 1-profile-review.png)
   - Stepper: Résumé → Review profile → Preferences → Ready to search. The user can't move
     past a step while its gate is unmet; the primary button is disabled with the reason.
   - Upload: drag & drop zone, supported formats listed, real progress from
     `profile.progress` (no fake animation timers).
   - "Fix before you can apply" card lists engine issues (blockers first) with inline fixes
     (e.g. phone input right inside the issue). Shows "Ready for applications: N%" computed
     from gates, not field presence.
   - Field rows: label, value, confidence meter (3 bars), Confirm / Confirmed chip, Edit.
     "Confirm all" per section. Clicking a field highlights its evidence in the right pane.
   - Right pane: original page rendering (pdf.js canvas for PDFs, image for scans, text view
     otherwise) with highlight boxes from evidence offsets; unplaced lines underlined.
   - "Replace résumé…" creates a new profile version and opens a merge diff (never silent
     overwrite). "Delete profile" moves to Settings → Data, with confirmation.
B. Preferences (new step): target titles (chips, suggestions from experience), locations
   + remote preference, employment types, salary floor + currency, work authorization per
   country/region, languages, notice period, links (LinkedIn, GitHub, portfolio).
   Answer bank: common screening Q&A, editable, used by the mapper.
C. Opportunities (mockup 2-opportunities.png)
   - Tabs New / Shortlisted / Skipped; filter chips (remote, score ≥, posted within,
     source, form supported); sort.
   - List item: ScoreRing, title, company · location · type, age, matched (green) and missing
     (red) skill chips, "form supported" indicator (known ATS) vs "may need manual steps".
   - Detail: "Why N?" meters (skills covered, title/seniority, location/remote, experience),
     "You have" / "Missing or unclear" lists. Never suggest adding skills the user lacks.
   - Actions: Shortlist (S), Not for me (X) with reason picker (wrong role, seniority,
     location, salary, company, already applied, other); feedback goes to
     matching.recordFeedback. Bulk: "Prepare N shortlisted →".
   - No hidden cap of 5 jobs; the user decides how many to prepare.
D. Application kit (mockup 3-application-kit.png)
   - Tabs: Résumé (Changes / Final / Original views; diff highlights added/removed/moved;
     template picker), Cover letter (rich-text-lite editor, language toggle, regenerate),
     Screening answers (each with source: profile / answer bank / user; unanswered ones
     flagged "needs you"), Files (final PDF/DOCX names).
   - Side panel: Truthfulness check (N/N grounded, list any unsupported claim with a
     one-click remove), What changed summary.
   - Primary: "Fill the form in Chrome →" (disabled until truthfulness is 100% grounded or
     the user removed flagged claims).
E. Review inbox (mockups 4 and 5; replaces QueueView)
   - Left list grouped by lane: Needs you (needs_user or empty required fields),
     Ready to review, Submitted (with ✓ verified / ? unverified). Counts per lane.
   - Detail: header with "Show Chrome window"; table "What the form contains now" built from
     read-back values: field, value, source, status icon; empty required rows highlighted
     with an inline input that writes into the live form via the engine.
   - "Before you submit" checklist; footer: Skip for now, Remove, and the Submit button
     (success color, ⌘/Ctrl+Enter), disabled with an explicit reason until gates pass.
     After click: button shows progress, then the item moves to Submitted with the
     confirmation screenshot and matched text.
   - Never show contradictory labels (no "Applied" + "Ready" together; no "Queued" header
     over submitted items).
F. Tracker: Kanban + table using the FSM states (submitted_verified/unverified,
   interviewing, offer, rejected, withdrawn), follow-up date + reminder notification,
   notes, CSV export. KPIs only from real data.
G. Home: a "What needs you" summary (counts with links), recent activity, and the next
   suggested action; no vanity animations.

States: every screen has designed loading (skeletons), empty (with the next action),
and error (typed AppError → friendly message + retry) states, in fa and en.
i18n: all strings in en.json/fa.json; parity test must pass; no inline ternaries for language.

Acceptance: a recorded run (GIF or screenshots) of the full flow with a real résumé:
upload → fix issues → preferences → shortlist 2 jobs → kit → Chrome fill → one item blocked
by an empty required field → fill it → submit → appears as Submitted (verified or
unverified, honestly). Screenshots in en + fa.
```

---

## Prompt 9: Quality gates, tests, CI and packaging

```text
Task: make regressions hard and the installer lean.

1. Workspace build order: point package `exports` to src for dev/test (or use TS project
   references + `vitest` aliases) so `pnpm test` works on a fresh clone without
   `pnpm build`. Prove with `git clean -xfd && pnpm install && pnpm test`.
2. Lint: add eslint (typescript-eslint, react-hooks, jsx-a11y) + the custom rules from
   Prompt 7; `pnpm lint` must pass. Add `cargo fmt --check` and
   `cargo clippy -- -D warnings`.
3. CI (.github/workflows/ci.yml): run lint, unit tests, `cargo test`, eval with thresholds
   (fail the build if extraction metrics drop), Playwright ATS fixture tests, bindings
   up-to-date check, capability allowlist check, PII/secret guard. Remove `|| true` from
   the Playwright install step.
4. End-to-end test: a Rust integration test (or tauri-driver/WebdriverIO) that starts the
   real sidecar against a local fixture server and walks: import résumé → profile issues →
   create application → fill (headed in CI via xvfb on Linux job, or headless only in CI
   with a flag) → read-back → submit → submitted_verified. This is the test that would
   have caught the false "Applied" bug.
5. Packaging size: the staged engine is ~876 MB (@node-llama-cpp ≈ 735 MB of prebuilt
   binaries for every backend). Stage only the target platform/arch binary (CPU + Metal on
   macOS arm64; CPU + Vulkan optional on Windows x64; no CUDA by default), or download the
   llama binary on first AI use with SHA-256 verification like models. Target installer
   < 250 MB. Exclude src/spikes from the bundle; split directory.json.gz out of bundle.mjs.
6. Hygiene: gitignore *.tsbuildinfo and src-tauri/gen/schemas; delete committed copies;
   merge GEMINI.md into AGENTS.md (single source); rewrite docs/PROGRESS.md to reflect the
   real state with evidence links.

Acceptance: CI green on macOS and Windows; installer sizes listed; a deliberately broken
status mapping makes the E2E test fail (show it), then revert.
```

---

## پیوست: چک‌لیست بازبینی شما بعد از هر پرامپت (فارسی)

| بعد از | خودتان امتحان کنید |
|--------|---------------------|
| پرامپت ۱ | رزومه‌ای بدون شماره تلفن آپلود کنید: باید «پیدا نشد» نشان دهد و نه شماره‌ی شما. در صفحه‌ای با CAPTCHA نباید «Applied» بیاید |
| پرامپت ۲ | برنامه را وسط پر کردن فرم ببندید. در Task Manager نباید node.exe یا chrome.exe اضافه بماند |
| پرامپت ۳ | وسط کار برنامه را ببندید و دوباره باز کنید: کار باید از همان‌جا ادامه پیدا کند |
| پرامپت ۴ | «پاک کردن همه‌ی داده‌ها» را بزنید: پوشه‌ی داده‌ی برنامه باید تقریباً خالی شود |
| پرامپت ۵ | یک فیلد را در پنجره‌ی Chrome دستی عوض کنید: باید در جدول برنامه با برچسب «ویرایش‌شده» دیده شود |
| پرامپت ۶ | رزومه‌ی خودتان: نام شرکت‌ها درست باشد و «Company» هیچ‌جا نباشد |
| پرامپت ۷ و ۸ | زبان را فارسی کنید: همه‌چیز راست‌چین و خوانا باشد، تاریخ‌ها شمسی |
| پرامپت ۹ | حجم فایل نصب ویندوز زیر ۲۵۰ مگابایت باشد |

---

## Add-on: use the flash-rive repo for design and animation (paste after Prompt 0; required with Prompts 7 and 8)

```text
Use my other project "flash-rive" as THE reference for Kaarjoo's visual design, motion and animation
(local path: C:\Work\My Personal Projects\flash-rive; if it is not there, ask me for the path or GitHub URL).
1. Study it first: README/AGENTS docs, package.json, design tokens/theme, components, animation code
   (Rive files/state machines, Motion/CSS keyframes, transitions, loaders, scanners, micro-interactions),
   fonts, icons and assets. Write me a short inventory of what to bring over and where in Kaarjoo it fits
   (upload/résumé scan, profile review, opportunities, application kit, Chrome fill progress, submit success,
   empty/loading states, installer artwork).
2. Use it to the fullest: match flash-rive's look and feel, motion language and polish across Kaarjoo,
   applied on top of the design-system tokens and the new screens (mockups in docs/design).
   Port properly: typed React components, reusable animation primitives, lazy-load heavy Rive assets.
3. Animations must reflect REAL progress/state from the engine (never fake timers), stay smooth (60 fps,
   GPU-friendly transforms/opacity), respect prefers-reduced-motion, and work in RTL (fa) and LTR (en),
   dark and light.
4. Kaarjoo's rules win on conflict: clarity and readability first, no fake data, review before submit.
5. For each reused item, note in docs/PROGRESS.md: flash-rive source → Kaarjoo target, and why.
```

---

## Prompt 10: Simplify the whole experience (calm UI, progressive disclosure, motion). Do this next.

**راهنما (فارسی):** این پرامپت بعد از بازبینی اسکرین‌شات ۲۸ نوامبر نوشته شد. اول دو باگ را درست می‌کند (خطای `fieldProvenance` و کارت‌های تکراری)، بعد برنامه را ساده می‌کند. ماکاپ‌ها در `mockups/v2/` هستند (A تا F)؛ آن‌ها را به `docs/design/v2/` مخزن کپی کنید. همراه با Prompt 0 و add-on مربوط به flash-rive بفرستید.

```text
Context: the latest build (8b802e5) shows the "Automated sequential pipeline" panel pinned on top of
EVERY page (AppShell renders <AutoPipelineBar/> above every view). It shows a raw Zod error and ~10 job
cards stuck at 0%, and it hides the actual page. The UI still shows too many things at once.
Design reference: docs/design/v2/A–F (simple-flow.html + PNGs). Follow it closely.

PART 1: Bugs (fix first, with regression tests)
1. Provenance validation error ("Invalid parameters for method 'application.execute':
   profile.fieldProvenance.*.evidence: Required").
   Root cause: packages/engine/src/rpc.ts `stripNulls()` deletes every key whose value is null
   before Zod validation, but packages/shared/src/profile.ts declares
   `evidence: FactEvidenceSchema.nullable()` (key required, null allowed). A fact with no evidence
   arrives as `evidence: null` from Rust, gets stripped, and fails as "Required".
   Fix: (a) remove the global stripNulls and make Rust and Zod agree: Rust `Option<T>` serializes as
   null, Zod uses `.nullable()` for those fields; or, if you keep stripNulls, use `.nullish()` for
   every nullable field. Add a contract test that round-trips a Rust-serialized profile containing
   nulls through every engine input schema.
   (b) application.execute should not receive or validate the whole profile with provenance
   metadata at all: pass only what the filler needs (contact, links, answers, document paths), or
   let the engine load it by profileId. Metadata problems must never block applying.
2. Duplicate and stuck pipeline items (Lemon.io, Proxify, Stripe and OpenAI appear twice;
   10 cards although discovery slices 5).
   Root cause: pipelineStore.startDiscoveryStage / startApplyStage have no re-entrancy guard. A
   second trigger (double click, two "Start" buttons, StrictMode effects) resets the list and both
   runs append, so cards duplicate and the first run's items never update.
   Fix: single-flight guard (ignore while running, or cancel-then-restart with a run id; only the
   latest run id may write state), dedupe by jobId, and drive item status ONLY from Rust
   task:progress events keyed by taskId. After Prompt 3 this logic belongs in Rust; delete any
   remaining client-side loop.
3. Irrelevant matches (a front-end developer gets "Senior Treasury Specialist" and
   "Account Director"). Add a hard title/role-family filter from preferences.targetTitles plus
   the skill-coverage threshold before anything reaches "For you"; never fill the list with
   low-scoring jobs just to reach 5.
4. Never show raw enum values or developer text in the UI ("kit_ready", "Automated sequential
   pipeline", "Explore & Match Websites", method names). Map every status to a human label via i18n.

PART 2: Information architecture (less on screen)
5. Navigation = 3 destinations in a slim icon rail (76 px, icon + short label):
   Today, Jobs, Applications. Profile, Preferences, Answer bank, Data and Settings, Language and
   Theme move under the avatar menu at the bottom of the rail. Remove the search box from the
   sidebar (keep Ctrl/⌘K palette).
6. Today (mockup A): greeting + one-line status, ONE hero card "Your next step" chosen by state
   (in priority order): no résumé → upload drop zone; profile blockers → "Fix N things";
   applications needing the user → "N applications need you"; new matches → "Look through N jobs";
   nothing to do → calm empty state ("You're all caught up. We'll look again at 6 PM.").
   Below it at most two quiet cards. Remove the 4 KPI tiles, the marketing welcome text and the
   tracker table from Today (they live in Applications).
7. Jobs (mockup C): default view "For you" = one card at a time with 3 plain-language reasons,
   score ring, and two big buttons Skip (←) / Keep & prepare (→). Undo for 5 s. Full description
   and score breakdown open in a side sheet only on "See full job & score details". "Kept" and
   "All jobs" tabs give the list view for power users.
8. Applications: a list grouped "Needs you / Ready to send / Sent". Opening one shows mockup D:
   title "Ready to send to <Company>?", a 3-line summary of what's fine (collapsed, each with
   Show/Preview/Read), and ONLY the items that need the user expanded (questions, empty required
   fields, login/CAPTCHA). One big Send button, disabled with the reason underneath. The full
   field table and the Chrome window are one click away ("Show the form in Chrome"), not on screen
   by default.
9. Profile becomes a quiet page under the avatar; blockers surface on Today and inside the
   flow where they matter (e.g. "Proxify AB is waiting for your phone number" → inline input).

PART 3: Background work (mockup B and F)
10. Delete the page-top AutoPipelineBar. Replace with a floating "activity pill" (bottom-end
    corner, above content, never pushes layout) with 4 states: hidden when idle; working
    (progress ring from real events + "Tailoring 2 of 3"); needs-you (amber, pulses once);
    done (green check, "3 ready to review · Open", auto-hides after 8 s).
    Clicking it opens a 440 px drawer: 3 plain steps (Find matching jobs → Tailor résumé & letter
    → Fill the forms for your review), one row per job with a thin progress bar, Pause/Cancel,
    and fix cards for problems. Esc or click outside closes it. Work continues while closed.
11. Error messages: every error shown to the user = what happened + why in one sentence + one
    primary fix action (+ optional secondary). Raw messages go only to the log and a
    "Copy details" link. Build an error catalogue mapping AppError kinds / engine codes to
    i18n keys and fix actions (missing phone → Add phone; profile not confirmed → Review profile;
    login wall → Open Chrome to sign in; engine down → Restarting…, auto-retry).

PART 4: Motion (with flash-rive as the style reference)
12. Motion tokens: fast 150 ms (hover/press), base 250 ms (pill morph, card in/out, tabs),
    slow 400 ms (drawer, card → detail shared-element). Easing cubic-bezier(.2,.8,.2,1);
    spring for the Keep/Skip card. Stagger 30 ms, max 6 items. prefers-reduced-motion → fades only.
13. Signature moments (all driven by real state, never timers): résumé scan (flash-rive scanner
    sweeps the page; facts fly into fields as parse stages complete); Keep/Skip card swipe with tilt
    and the next card rising; Send button → spinner → check draw → card flies to Applications with a
    count bump; activity pill morphing between states.
14. Never: fake progress, permanent shimmer, animated numbers counting from 0 on every visit,
    motion on every hover, more than one moving thing competing for attention.

PART 5: Content and density rules
15. One primary button per screen. Body text 15 px (Persian 16 px), labels ≥ 13 px. At most 3
    pieces of information per card. Plain words: "Jobs", "Send", "Needs you", not "Pipeline",
    "Execute", "ATS", "Review Mode". Persian copy written natively, not translated word by word.

Acceptance:
- Screenshots in en + fa, dark + light of: Today (with pill working), drawer with a fix card,
  Jobs focus card, an application "Ready to send?" with one open question, empty state.
- The provenance contract test and the single-flight/dedupe test fail before and pass after.
- Starting discovery twice quickly yields exactly one run and no duplicate jobs.
- A short screen recording (GIF) of: upload → Today → keep 2 jobs → pill progress → answer one
  question → Send → check animation. Show it with reduced motion on as well.
```

---

## Prompt 11: Build every screen to the v3 design (complete set)

**راهنما (فارسی):** بعد از Prompt 10 (یا همراهش) بدهید. پوشه‌ی `mockups/v3/` را کامل (PNGها، `all-screens.html`، `_base.css`، `_extra.css`، `screen-map.md`) و `mockups/v2/` را به `docs/design/v3/` و `docs/design/v2/` مخزن کپی کنید. همراه با Prompt 0 و پرامپت flash-rive بفرستید.

```text
Goal: implement ALL screens in docs/design/v3 (01–22) exactly, replacing the current views.
docs/design/v3/screen-map.md maps every existing view/component/section to its new place; nothing
is dropped, only moved. Use the CSS in _base.css/_extra.css as the source of truth for tokens,
spacing and sizes (port to Tailwind @theme tokens; no raw hex in components).

Routing / shell
- Rail (76 px): Today, Jobs, Applications. Avatar menu (screen 18): Profile, What I'm looking for,
  Answers, Settings, Language, Theme, Help & shortcuts. ⌘K palette searches jobs, companies,
  applications and actions. Remove TitleBar chips and the old Sidebar.
- First-run flow is full-screen without the rail: 01 Upload → 02 Reading → 03 Check profile →
  04 Preferences → 05 Today. Gates: 03 needs zero blockers; 04 needs ≥1 job title.

Screens (build in this order, each with loading, empty and error states from screen 19):
01 Welcome/upload · 02 Reading résumé (stages from profile.progress events; flash-rive scanner)
03 Check profile (issues first; contact rows with "Looks right"/Confirm/Edit; experience rows with
   inline fixes; skills/summary/education cards; "Where's this from?" opens the original page in a
   side panel with the evidence highlighted)
04 Preferences (titles with résumé suggestions, where, seniority, work type, minimum pay, common
   form questions) · 15 Answers (list + editor, aliases, "used in", unanswered questions)
05 Today (one next-step hero by state priority, ≤2 quiet cards) · 06 Activity pill + drawer
07 Jobs/For you (one card, Skip/Keep, undo) · 08 Jobs/All (search, 3 filters, list; job opens in a
   560 px side sheet with why/missing/description/requirements; "Not for me" reason picker)
09 Jobs/Sources (followed companies with health, directory search + follow, "Add a company" by URL
   with automatic ATS detection, "Add one job by link")
10 Prepare application (tabs Résumé/Cover letter/Questions; diff view; what changed; truth check
   line; files to be sent; template + downloads in the ⋯ menu)
11 Ready to send (summary collapsed, only blocking items open, one Send button)
12 Applications (List grouped Needs you / Ready to send + Preparing / Sent; Board view; Export CSV;
   closed items folded) · 13 Sent application (status segmented control, interview card with
   calendar export, timeline, what you sent, proof screenshots, notes)
14 Insights (4 stats with one-line meaning, sent per week, missing skills, sources)
16–17 Settings with sub-nav: General, Smart features, Applying, Data & privacy, Updates, About
   ("Ask me before sending" is always on and disabled; technical details hidden under About)
19 Empty/problem states · 20–21 Persian RTL versions of every screen (not just these two)
22 Motion rules and pill states.

Copy: use the exact English copy in the mockups; write Persian natively (see 20–21). Status labels
come only from the FSM via i18n (never raw enums). Delete strings that no longer appear.

Acceptance:
- For each of the 22 mockups, a screenshot of the real app at 1440×900 placed side by side with the
  mockup (en-dark), plus fa-dark and en-light for 05, 08, 11, 12, 16.
- `git grep` shows the old views (HomeView, QueueView, old Sidebar/TitleBar chips, AutoPipelineBar)
  are removed or rewritten; i18n parity test passes; no raw enum text visible.
- Keyboard: J/K, ←/→ on For you, ⌘K, ⌘Enter on Send, Esc closes sheets/drawers.
```
