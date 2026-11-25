# Kaarjoo Release, Packaging & Code-Signing Guide

Kaarjoo targets native desktop installation on **macOS 11+ (Universal Apple Silicon `aarch64` + Intel `x86_64`)** and **Windows 10/11 (`x86_64`)**.

---

## 1. Bundled Runtime & Resource Architecture

- **Engine Sidecar (`node-v22.14.0`):** Fetched and SHA-256 verified per target triple by [`scripts/prepare-sidecar.mjs`](../scripts/prepare-sidecar.mjs) into `apps/desktop/src-tauri/binaries/node-<target-triple>(.exe)`.
- **Staged Engine Bundle:** [`scripts/stage-engine-resources.mjs`](../scripts/stage-engine-resources.mjs) copies into `apps/desktop/src-tauri/resources/engine/`:
  - `bundle.mjs` (esbuild ESM bundle of `@kaarjoo/engine`)
  - `pdf.worker.mjs` (`pdfjs-dist` worker)
  - `directory.json.gz` & `manifest.json` (offline 5,650+ company ATS directory)
  - `traineddata/eng.traineddata.gz` & `traineddata/fas.traineddata.gz` (offline `tesseract.js` OCR languages)
  - Dereferenced native/external packages (`playwright-core`, `tesseract.js`, `tesseract.js-core`, `node-llama-cpp`, `@node-llama-cpp`)
- **AI Weights Never Bundled:** Local `.gguf` LLMs (`Qwen3-4B/8B/14B`, `Qwen2.5-1.5B`) and `BGE-M3` embeddings are downloaded on demand on first run into `<appDataDir>/models` via resumable HTTPS Range requests verified against exact SHA-256 digests in [`modelManifest.json`](../packages/engine/src/ai/modelManifest.json).

---

## 2. GitHub Actions CI & Release Workflows

- **CI Matrix ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)):** Runs on every push/PR across `macos-14` (`--target universal-apple-darwin`) and `windows-latest` (`--bundles nsis`):
  1. `pnpm test` (Vitest unit tests + i18n guard + ATS adapter suite)
  2. `pnpm benchmark:fts` (SQLite FTS5 search latency benchmark)
  3. `pnpm eval:ci` (32 multi-format résumés, 312 matching pairs, 56 truthfulness adversarial cases)
  4. `pnpm build` (builds packages & stages standalone engine resources)
  5. `node scripts/prepare-sidecar.mjs`
  6. `cargo check` (Rust core + embedded migrations check)
  7. `pnpm smoke:test` (Unicode & space-containing user path E2E smoke test)
  8. `pnpm --filter desktop tauri build` (uploads `.dmg` / `.exe` and smoke screenshots as workflow artifacts)
- **Release Workflow ([`.github/workflows/release.yml`](../.github/workflows/release.yml)):** Triggered by git tags `v*.*.*`. Builds signed release installers + updater manifests (`latest.json`) via `tauri-apps/tauri-action@v0` and publishes to GitHub Releases.

---

## 3. macOS Signing, Hardened Runtime & Notarization

### Hardened Runtime Entitlements
[`apps/desktop/src-tauri/Entitlements.plist`](../apps/desktop/src-tauri/Entitlements.plist) grants the permissions required by the V8 JavaScript JIT inside the Node.js sidecar and native llama.cpp addons while keeping Hardened Runtime active:
- `com.apple.security.cs.allow-jit`
- `com.apple.security.cs.allow-unsigned-executable-memory`
- `com.apple.security.cs.disable-library-validation`
- `com.apple.security.network.client`
- `com.apple.security.files.user-selected.read-write`

### Nested Binary Deep-Signing & Notarization (When Apple Developer Account Is Connected)
1. **Configure GitHub Secrets:**
   - `APPLE_CERTIFICATE` (base64-encoded Developer ID Application `.p12`)
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY` (e.g. `Developer ID Application: Your Name (TEAMID)`)
   - `APPLE_ID` / `APPLE_PASSWORD` (app-specific password) / `APPLE_TEAM_ID`
   - `APPLE_API_ISSUER` / `APPLE_API_KEY` (if using App Store Connect API keys)
2. **Sign all nested sidecar binaries, `.node` native addons, and `.dylib` files inside-out** before creating the `.dmg` using [`scripts/macos-sign-nested.sh`](../scripts/macos-sign-nested.sh):
   ```bash
   ./scripts/macos-sign-nested.sh "apps/desktop/src-tauri/target/universal-apple-darwin/release/bundle/macos/Kaarjoo.app" "$APPLE_SIGNING_IDENTITY"
   ```
3. **Notarize & Staple:**
   ```bash
   xcrun notarytool submit Kaarjoo.dmg --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait
   xcrun stapler staple Kaarjoo.dmg
   ```

### Interim Installation (Unsigned / Pre-Notarization Builds)
Until an Apple Developer ID certificate is attached, macOS Gatekeeper will warn on first launch. Documented user flow:
1. Open the `.dmg` and drag **Kaarjoo** to **Applications**.
2. **Right-click (or Control-click)** **Kaarjoo.app** in Finder -> choose **Open** -> click **Open** in the confirmation dialog (or remove quarantine via System Settings -> Privacy & Security -> *Open Anyway*).

---

## 4. Windows Installer & Code-Signing Options

[`apps/desktop/src-tauri/tauri.conf.json`](../apps/desktop/src-tauri/tauri.conf.json) configures NSIS:
- **`installMode: "currentUser"`:** Per-user installation under `%LOCALAPPDATA%\Kaarjoo` without requiring UAC elevation.
- **`webviewInstallMode: { type: "embedBootstrapper" }`:** Automatically ensures WebView2 Runtime is installed on clean Windows 10/11 machines.

### Code-Signing Options for Production Windows Builds
1. **Azure Trusted Signing (Recommended for OSS / Cloud CI):**
   - Create a Trusted Signing Account + Certificate Profile in Azure Portal.
   - Set `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and configure `tauri.conf.json > bundle.windows.signCommand` to invoke `TrustedSigningCli` or `signtool` with `Azure.CodeSigning.Dlib.dll`. Eliminates SmartScreen warnings almost immediately.
2. **Standard OV Code-Signing Certificate (USB Token / Cloud HSM):**
   - Set `WINDOWS_CERTIFICATE` (base64 `.pfx`) & `WINDOWS_CERTIFICATE_PASSWORD` in GitHub Secrets for `signtool.exe` in `release.yml`, OR invoke cloud HSM signing (DigiCert KeyLocker / Sectigo).

---

## 5. Tauri Auto-Updater & Company Directory Signing

- **Manifest & Signatures:** Configured via `@tauri-apps/plugin-updater` (`2.x`) pointing at `https://github.com/ferdouskazemi/kaarjoo/releases/latest/download/latest.json` with embedded Minisign public key in `tauri.conf.json`.
- **GitHub Secrets Needed for Releases:**
  - `TAURI_SIGNING_PRIVATE_KEY` (contents of the Minisign `.key` generated offline — keep private key out of git!)
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- **Company Directory Updates:** Users can also check/refresh `directory.json.gz` from the **Settings** tab or **Company Boards** modal via `directory_check_updates`.
