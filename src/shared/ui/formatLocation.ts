/**
 * Extracts a human-readable address label from either plain text or a serialized JSON
 * `{ label, latitude, longitude }` location string stored on assets.
 */
export function formatLocationLabel(text: string | null | undefined, fallback = '—'): string {
  if (!text) return fallback;
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    const parsed = JSON.parse(trimmed) as {
      label?: unknown;
      latitude?: unknown;
      longitude?: unknown;
    };
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.label === 'string' && parsed.label.trim()) {
        return parsed.label.trim();
      }
      if (parsed.latitude != null && parsed.longitude != null) {
        return `${Number(parsed.latitude).toFixed(4)}, ${Number(parsed.longitude).toFixed(4)}`;
      }
    }
  } catch {
    // Plain-text address; return as-is.
  }
  return trimmed;
}
