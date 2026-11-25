#!/usr/bin/env bash
# Signs all nested binaries (.node addons, .dylib libraries, sidecar binaries)
# inside a macOS .app bundle with Hardened Runtime + Entitlements before notarization.
set -euo pipefail

APP_PATH="${1:?Usage: $0 <path-to-Kaarjoo.app> <signing-identity> [entitlements-plist]}"
IDENTITY="${2:?Usage: $0 <path-to-Kaarjoo.app> <signing-identity> [entitlements-plist]}"
ENTITLEMENTS="${3:-apps/desktop/src-tauri/Entitlements.plist}"

if [[ ! -d "$APP_PATH" ]]; then
  echo "App bundle not found: $APP_PATH" >&2
  exit 1
fi

echo "Signing nested Mach-O binaries in $APP_PATH with identity '$IDENTITY'..."

# Sign dynamic libraries and native Node addons first (inside-out)
find "$APP_PATH/Contents" -type f \( -name "*.dylib" -o -name "*.node" -o -name "*.so" \) -print0 | \
  while IFS= read -r -d '' bin; do
    echo "  Signing native library: $bin"
    codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$bin"
  done

# Sign sidecar binaries and helpers in Contents/MacOS (excluding main executable which is signed last)
APP_EXEC="$APP_PATH/Contents/MacOS/Kaarjoo"
find "$APP_PATH/Contents/MacOS" -type f -perm +111 -print0 | \
  while IFS= read -r -d '' bin; do
    if [[ "$bin" != "$APP_EXEC" ]]; then
      echo "  Signing nested executable/sidecar: $bin"
      codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$bin"
    fi
  done

# Finally sign the outer .app bundle
echo "Signing outer application bundle: $APP_PATH"
codesign --force --timestamp --options runtime --entitlements "$ENTITLEMENTS" --sign "$IDENTITY" "$APP_PATH"

echo "Verifying deep code signature..."
codesign --verify --deep --strict --verbose=2 "$APP_PATH"
echo "Done."
