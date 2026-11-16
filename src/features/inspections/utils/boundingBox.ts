export interface BoundingBoxCoords {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

/** Parses normalized `{ xMin, yMin, xMax, yMax }` JSON within `[0, 1]`; returns null when empty or invalid. */
export function parseBoundingBox(raw?: string | null): BoundingBoxCoords | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.xMin === 'number' &&
      typeof parsed?.yMin === 'number' &&
      typeof parsed?.xMax === 'number' &&
      typeof parsed?.yMax === 'number' &&
      Number.isFinite(parsed.xMin) &&
      Number.isFinite(parsed.yMin) &&
      Number.isFinite(parsed.xMax) &&
      Number.isFinite(parsed.yMax) &&
      parsed.xMin >= 0 &&
      parsed.yMin >= 0 &&
      parsed.xMax <= 1 &&
      parsed.yMax <= 1 &&
      parsed.xMin < parsed.xMax &&
      parsed.yMin < parsed.yMax
    ) {
      return {
        xMin: parsed.xMin,
        yMin: parsed.yMin,
        xMax: parsed.xMax,
        yMax: parsed.yMax,
      };
    }
  } catch {
    return null;
  }
  return null;
}

/** Serializes normalized `[0, 1]` bounding box coordinates to canonical JSON rounded to 4 decimals. */
export function serializeBoundingBox(box: BoundingBoxCoords): string {
  const clamp01 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
  return JSON.stringify({
    xMin: clamp01(box.xMin),
    yMin: clamp01(box.yMin),
    xMax: clamp01(box.xMax),
    yMax: clamp01(box.yMax),
  });
}
