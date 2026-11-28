import { convertFileSrc } from '@tauri-apps/api/core';

/**
 * Converts local filesystem paths returned by Rust (e.g. screenshots) into
 * Tauri asset URLs while leaving data:/http:/https:/asset: URLs untouched.
 */
export function resolveSnapshotSrc(src?: string | null): string | undefined {
  if (!src) return undefined;
  if (/^(data:|https?:|asset:|blob:)/i.test(src)) {
    return src;
  }
  try {
    return convertFileSrc(src);
  } catch {
    return src;
  }
}
