export interface DuplicateFilenameResolution {
  originalName: string;
  resolvedName: string;
  isDuplicate: boolean;
}

export function buildSuffixedFileName(fileName: string, suffix: number): string {
  const dot = fileName.lastIndexOf('.');
  const stem = dot > 0 ? fileName.substring(0, dot) : fileName;
  const ext = dot > 0 ? fileName.substring(dot) : '';
  const marker = ` (${suffix})`;
  const maxStemLength = Math.max(1, 500 - marker.length - ext.length);
  const boundedStem = stem.length > maxStemLength ? stem.substring(0, maxStemLength) : stem;
  return `${boundedStem}${marker}${ext}`;
}

export function resolveUniqueEvidenceFileName(
  fileName: string,
  takenLowerNames: Set<string>,
): DuplicateFilenameResolution {
  const normalized = fileName.toLowerCase();
  if (!takenLowerNames.has(normalized)) {
    takenLowerNames.add(normalized);
    return { originalName: fileName, resolvedName: fileName, isDuplicate: false };
  }
  for (let index = 1; index < 10_000; index += 1) {
    const candidate = buildSuffixedFileName(fileName, index);
    const candidateKey = candidate.toLowerCase();
    if (!takenLowerNames.has(candidateKey)) {
      takenLowerNames.add(candidateKey);
      return { originalName: fileName, resolvedName: candidate, isDuplicate: true };
    }
  }
  return { originalName: fileName, resolvedName: fileName, isDuplicate: true };
}
