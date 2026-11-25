# Cross-Platform Release & Smoke Test Checklist

---

## 1. Automated End-to-End Smoke Test (`pnpm smoke:test`)

Implemented in [`eval/scripts/smoke-test.ts`](../eval/scripts/smoke-test.ts). Uses the staged standalone engine bundle (`apps/desktop/src-tauri/resources/engine/bundle.mjs`) and bundled sidecar executable (`node-<target-triple>`), isolated inside a freshly created temporary directory containing **spaces and non-Latin Persian characters** (`Kaarjoo Smoke Test فردوس کاظمی ...`).

| Check | Windows (`win32 / x64`) Status | macOS CI (`macos-14`) Status |
| --- | --- | --- |
| Sidecar spawn & JSON-RPC `system.ping` | **PASSED** (`ok`, `uptimeSeconds`) | Configured in `.github/workflows/ci.yml` (runs on PR/push) |
| Offline directory load (`5,650+` companies) | **PASSED** (`5,650` loaded) | Configured in CI |
| SQLite DB create & reopen persistence across quit | **PASSED** (job/profile/app persisted across restart) | Configured in CI |
| Paths with spaces + non-Latin Persian characters (`فردوس کاظمی`) | **PASSED** (SQLite + DOCX + Playwright artifacts) | Configured in CI |
| Résumé ingestion & contact/skill/experience extraction | **PASSED** | Configured in CI |
| Local SQLite FTS5 job search | **PASSED** (`< 15 ms`) | Configured in CI |
| Tailored résumé generation & `.docx` binary export | **PASSED** (`Truthy Score: 100`) | Configured in CI |
| Playwright ATS **Review Mode** pause (never submits: `0` submits) | **PASSED** (`eval/smoke-artifacts/smoke-review-form.jpg`) | Configured in CI |
| Quit & reopen sidecar with SQLite data intact | **PASSED** | Configured in CI |

> **Honest Platform Scope Note:** Local development host is Windows 11 (`win32/x64`) with no Apple Silicon/Intel Mac locally. The `.dmg` bundle (`universal-apple-darwin`) and `macos-14` smoke tests are validated structurally in `.github/workflows/ci.yml` and `.github/workflows/release.yml` and execute on GitHub Actions `macos-14` runners on push/PR.

---

## 2. Design & Accessibility Audit Screenshots (Light/Dark x EN/FA)

Captured automatically with Playwright against the built desktop production bundle via [`eval/scripts/capture-ui-audit.ts`](../eval/scripts/capture-ui-audit.ts) (`0` page errors, `nav[aria-label]` verified, `0` unlabeled icon buttons, `.light`/`.dark` + `ltr`/`rtl` DOM assertions verified):

- English Dark Home: [`eval/smoke-artifacts/ui-en-dark-home.png`](../eval/smoke-artifacts/ui-en-dark-home.png)
- English Light Home: [`eval/smoke-artifacts/ui-en-light-home.png`](../eval/smoke-artifacts/ui-en-light-home.png)
- Persian Dark Home (`dir="rtl"`): [`eval/smoke-artifacts/ui-fa-dark-home.png`](../eval/smoke-artifacts/ui-fa-dark-home.png)
- Persian Light Home (`dir="rtl"`): [`eval/smoke-artifacts/ui-fa-light-home.png`](../eval/smoke-artifacts/ui-fa-light-home.png)
- English Dark Settings: [`eval/smoke-artifacts/ui-en-dark-settings.png`](../eval/smoke-artifacts/ui-en-dark-settings.png)
- English Light Settings: [`eval/smoke-artifacts/ui-en-light-settings.png`](../eval/smoke-artifacts/ui-en-light-settings.png)
- Persian Dark Settings (`dir="rtl"`): [`eval/smoke-artifacts/ui-fa-dark-settings.png`](../eval/smoke-artifacts/ui-fa-dark-settings.png)
- Persian Light Settings (`dir="rtl"`): [`eval/smoke-artifacts/ui-fa-light-settings.png`](../eval/smoke-artifacts/ui-fa-light-settings.png)
- Playwright Review Mode Paused Form: [`eval/smoke-artifacts/smoke-review-form.jpg`](../eval/smoke-artifacts/smoke-review-form.jpg)

---

## 3. Manual Installer Checklist (Before Tag Release)

1. Run `Kaarjoo_*_x64-setup.exe` (Windows) or mount `Kaarjoo_*_universal.dmg` (macOS; right-click -> **Open** if unsigned).
2. Confirm first-run home dashboard opens with `0` console errors and Local Engine indicator shows ready.
3. Upload a PDF/DOCX/image résumé in Profile -> Résumé -> verify extracted fields and save.
4. Search Open Opportunities (filterable across 5,650+ synced companies) -> Tailor Resume -> export `.docx`.
5. Trigger Review Mode on a mock/live ATS form -> verify browser pauses with Review screenshot before submit.
6. Quit Kaarjoo completely -> reopen -> verify profile, saved jobs, applications, and downloaded AI models remain intact.
