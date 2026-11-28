/**
 * Extracts a human-readable address label from either plain text or a serialized JSON
 * location string (e.g. `{ label, address, district, city, latitude, longitude }`) stored on assets.
 */
export function formatLocationLabel(text: string | null | undefined, fallback = '—'): string {
  if (!text) return fallback;
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof parsed.label === 'string' && parsed.label.trim()) {
          return parsed.label.trim();
        }
        if (typeof parsed.address === 'string' && parsed.address.trim()) {
          return parsed.address.trim();
        }
        const parts = [
          parsed.name,
          parsed.street,
          parsed.ward,
          parsed.district,
          parsed.city,
          parsed.province,
          parsed.country,
        ]
          .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
          .map((part) => part.trim());
        if (parts.length > 0) {
          return Array.from(new Set(parts)).join(', ');
        }
        const lat = parsed.latitude ?? parsed.lat;
        const lon = parsed.longitude ?? parsed.lon ?? parsed.lng;
        if (
          lat != null &&
          lon != null &&
          !Number.isNaN(Number(lat)) &&
          !Number.isNaN(Number(lon))
        ) {
          return `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
        }
        const firstStringValue = Object.values(parsed).find(
          (val): val is string => typeof val === 'string' && val.trim().length > 0,
        );
        return firstStringValue ? firstStringValue.trim() : fallback;
      }
    } catch {
      // Plain-text address; return as-is.
    }
  }
  return trimmed;
}
