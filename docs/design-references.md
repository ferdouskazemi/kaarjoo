# Design References & Technical Influences

## Reference 1: `open-antigravity-patcher-main.zip`
- **Source:** Local archive `C:\Work\Tools\open-antigravity-patcher-main.zip` (Open AG Patcher).
- **License:** GNU General Public License v3.0 (GPL-3.0) & MIT-attributed components.
- **Nature:** Python-based multi-platform CLI utility.

### What to Adopt (System Engineering & Reliability Patterns)
Even though this repository is a CLI utility and not a web UI component kit, its underlying system engineering patterns are directly valuable for Kaarjoo's cross-platform desktop shell (Windows and macOS):
1. **Cross-Platform Application & Browser Discovery (`discovery.py`):**
   - Windows Registry scanning (`winreg` across `HKEY_CURRENT_USER` and `HKEY_LOCAL_MACHINE` for `InstallLocation` and display versions).
   - Heuristic folder resolution across `LOCALAPPDATA`, `PROGRAMFILES`, and `PROGRAMFILES(X86)`.
   - macOS `.app` bundle inspection via `Contents/Resources` and `Contents/Info.plist`.
   - **Application in Kaarjoo:** Used in `packages/engine` to automatically discover the user's installed Google Chrome or Microsoft Edge browser for Playwright automation, eliminating unnecessary Chromium downloads.
2. **Atomic File Replacement & Directory Synchronization (`atomic.py`):**
   - Writing files to a safe temporary file (`.tmp`) with `O_EXCL`, flushing buffers, syncing to disk (`fsync`), applying original file metadata (`fchown`, `fchmod`), atomic rename (`os.replace`), and directory syncing (`fsync_dir`).
   - Refusal to overwrite symlinks for security.
   - **Application in Kaarjoo:** Guarantees zero data corruption during SQLite backups, JSON configuration updates, and temporary PDF generation.
3. **macOS Apple Silicon & Universal Binary Code Signing (`file.py`):**
   - Handling ad-hoc re-signing via `codesign --force --deep --sign -`.
   - Removing Gatekeeper quarantine flags via `xattr -dr com.apple.quarantine`.
   - Clearing immutable file system flags (`chflags -R nouchg`).
   - **Application in Kaarjoo:** Directly mitigates the macOS Hardened Runtime risk for the bundled Node.js sidecar and native llama.cpp addons.
4. **Reliable Process Management (`admin.py`):**
   - Terminating orphaned browser instances or sidecar child processes cleanly (`taskkill /F /IM` on Windows and `pkill -f` on POSIX).
   - **Application in Kaarjoo:** Ensures background Playwright instances and sidecars shut down cleanly without leaving zombie processes.

### What to Skip & Why
1. **UI Components & Visual Styling:** The repository contains zero frontend code (no React, HTML, CSS, or design tokens).
2. **Patching / Restriction Circumvention:** Kaarjoo is an ethical, local-first job search assistant. It does not tamper with host software or bypass access restrictions. All automation is polite and respects site terms.

---

## Design System & UI References (Master Prompt Section 5 & 6)
- **Design Philosophy:** Calm, fast, precise, and beautiful (Linear / Raycast / Arc tier).
- **Design Skills Adopted:**
  - **Taste Skill:** Restrained color palette, strong hierarchy, generous whitespace, deliberate rhythm.
  - **Emil Kowalski Motion Principles:** Fast, purposeful animations (150–250ms), ease-out, `prefers-reduced-motion` strictly honored.
  - **Impeccable Typography & Contrast:** Strict WCAG AA contrast, clear type scales.
- **Typography:**
  - Persian: **Vazirmatn** (bundled offline, full variable font support for weights 100–900).
  - English: **Inter** / **Geist** with tabular figures for numbers, dates, and currency.
- **Component Primitives:** Radix UI primitives via **shadcn/ui**, styled with **Tailwind CSS v4** tokens.
