import { describe, expect, it } from 'vitest';
import { resolveUniqueEvidenceFileName } from './evidenceFileName';

describe('resolveUniqueEvidenceFileName', () => {
  it('keeps the filename when no duplicate exists', () => {
    const taken = new Set(['other.mp4']);
    expect(resolveUniqueEvidenceFileName('flight.mp4', taken)).toEqual({
      originalName: 'flight.mp4',
      resolvedName: 'flight.mp4',
      isDuplicate: false,
    });
  });

  it('appends sequential (1), (2) suffixes before the extension case-insensitively', () => {
    const taken = new Set(['nha_van_hoa.mp4']);
    expect(resolveUniqueEvidenceFileName('NHA_VAN_HOA.mp4', taken)).toEqual({
      originalName: 'NHA_VAN_HOA.mp4',
      resolvedName: 'NHA_VAN_HOA (1).mp4',
      isDuplicate: true,
    });
    expect(resolveUniqueEvidenceFileName('nha_van_hoa.mp4', taken)).toEqual({
      originalName: 'nha_van_hoa.mp4',
      resolvedName: 'nha_van_hoa (2).mp4',
      isDuplicate: true,
    });
  });
});
