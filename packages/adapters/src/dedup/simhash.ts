import { createHash } from 'node:crypto';

/**
 * 64-bit SimHash (Charikar algorithm) for near-duplicate detection of job descriptions.
 */
export class SimHash {
  /**
   * Tokenizes text into word tokens with length >= 2.
   */
  public static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length >= 2);
  }

  /**
   * Computes a 64-bit hash for a token using SHA-256 first 8 bytes.
   */
  private static hashToken64(token: string): bigint {
    const hashBuffer = createHash('sha256').update(token).digest();
    return hashBuffer.readBigUInt64BE(0);
  }

  /**
   * Computes 64-bit SimHash fingerprint as a 16-character hexadecimal string.
   */
  public static compute(text: string): string {
    const tokens = this.tokenize(text);
    if (tokens.length === 0) {
      return '0000000000000000';
    }

    // Term frequency mapping
    const frequencies = new Map<string, number>();
    for (const token of tokens) {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    }

    const v = new Int32Array(64);

    for (const [token, weight] of frequencies.entries()) {
      const h = this.hashToken64(token);
      for (let i = 0; i < 64; i++) {
        // Check if i-th bit from MSB is 1
        const mask = 1n << BigInt(63 - i);
        if ((h & mask) !== 0n) {
          v[i] += weight;
        } else {
          v[i] -= weight;
        }
      }
    }

    let fingerprint = 0n;
    for (let i = 0; i < 64; i++) {
      if (v[i] > 0) {
        fingerprint |= 1n << BigInt(63 - i);
      }
    }

    return fingerprint.toString(16).padStart(16, '0');
  }

  /**
   * Calculates Hamming distance (number of differing bits) between two 64-bit hex fingerprints.
   */
  public static hammingDistance(simHashA: string, simHashB: string): number {
    try {
      const a = BigInt(`0x${simHashA}`);
      const b = BigInt(`0x${simHashB}`);
      let xor = a ^ b;

      // Count set bits (population count)
      let count = 0;
      while (xor > 0n) {
        xor &= xor - 1n;
        count++;
      }
      return count;
    } catch {
      return 64;
    }
  }

  /**
   * Checks if two texts or fingerprints are near-duplicates.
   * Default threshold is 3 differing bits out of 64.
   */
  public static isNearDuplicate(simHashA: string, simHashB: string, maxDistance: number = 3): boolean {
    return this.hammingDistance(simHashA, simHashB) <= maxDistance;
  }
}
