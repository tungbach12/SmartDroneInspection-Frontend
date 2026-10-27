export type AirspaceZoneType = 'NO_FLY_ZONE' | 'RESTRICTED_ZONE';
export type AirspaceClassification = 'NO_FLY_ZONE' | 'RESTRICTED_ZONE' | 'CLEAR_ZONE';

export interface AirspaceZone {
  code: string;
  name: string;
  region: 'TP. Hồ Chí Minh' | 'Hà Nội' | 'Đà Nẵng';
  zoneType: AirspaceZoneType;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  maxAltitudeMetersAgl: number;
  authority: string;
  legalBasis: string;
  description: string;
  distanceMeters?: number;
}

export interface AirspaceEvaluation {
  latitude: number;
  longitude: number;
  classification: AirspaceClassification;
  messageCode: 'MSG28' | 'AIRSPACE_CLEAR';
  advisoryMessage: string;
  portalUrl: string;
  matchingZones: AirspaceZone[];
  nearbyZones: AirspaceZone[];
}

export const CAMBAY_PORTAL_URL = 'https://cambay.mod.gov.vn';

export const MSG28_ADVISORY_MESSAGE =
  'A possible restriction is indicated. Verify current applicable authority permission; this lookup is not a flight permit.';

export const CLEAR_ADVISORY_MESSAGE =
  'Coordinates are outside published static no-fly and restricted zones. Verify current NOTAM and authority permission before flight; this lookup is not a flight permit.';

export const VIETNAM_AIRSPACE_ZONES: readonly AirspaceZone[] = [
  {
    code: 'VN-NFZ-SGN-TSN-CORE',
    name: 'Cảng HKQT Tân Sơn Nhất — Vùng Cấm Bay Tuyệt Đối',
    region: 'TP. Hồ Chí Minh',
    zoneType: 'NO_FLY_ZONE',
    latitude: 10.8188,
    longitude: 106.6519,
    radiusMeters: 3500,
    maxAltitudeMetersAgl: 0,
    authority: 'Cục Tác chiến - Bộ Tổng Tham mưu (Bộ Quốc phòng)',
    legalBasis: 'Quyết định 18/2020/QĐ-TTg & Nghị định 288/2025/NĐ-CP',
    description: 'Khu vực đường băng và vùng phụ cận trực tiếp sân bay quốc tế Tân Sơn Nhất.',
  },
  {
    code: 'VN-RES-SGN-TSN-CTR',
    name: 'Vùng Kiểm Soát Tiếp Cận Tân Sơn Nhất (CTR)',
    region: 'TP. Hồ Chí Minh',
    zoneType: 'RESTRICTED_ZONE',
    latitude: 10.8188,
    longitude: 106.6519,
    radiusMeters: 8000,
    maxAltitudeMetersAgl: 50,
    authority: 'Cục Tác chiến & Sư đoàn Không quân 370',
    legalBasis: 'Quyết định 18/2020/QĐ-TTg & Luật Phòng không nhân dân 2024',
    description:
      'Hành lang tiếp cận hạ cánh sân bay Tân Sơn Nhất; bắt buộc có giấy phép hiệp đồng tác chiến.',
  },
  {
    code: 'VN-NFZ-SGN-GOV-CORE',
    name: 'Khu Trung Tâm Hành Chính - Dinh Độc Lập & Quân Khu 7',
    region: 'TP. Hồ Chí Minh',
    zoneType: 'NO_FLY_ZONE',
    latitude: 10.7769,
    longitude: 106.6953,
    radiusMeters: 1100,
    maxAltitudeMetersAgl: 0,
    authority: 'Bộ Tư lệnh TP. Hồ Chí Minh',
    legalBasis: 'Quyết định 18/2020/QĐ-TTg & Nghị định 288/2025/NĐ-CP',
    description:
      'Khu vực cơ quan trọng yếu, Dinh Độc Lập và trụ sở quốc phòng trung tâm Quận 1.',
  },
  {
    code: 'VN-RES-SGN-SAIGON-RIVER',
    name: 'Hành Lang An Toàn Hàng Không & Cầu Trọng Điểm Sông Sài Gòn',
    region: 'TP. Hồ Chí Minh',
    zoneType: 'RESTRICTED_ZONE',
    latitude: 10.7789,
    longitude: 106.7082,
    radiusMeters: 2200,
    maxAltitudeMetersAgl: 120,
    authority: 'Bộ Tư lệnh TP. Hồ Chí Minh',
    legalBasis: 'Nghị định 288/2025/NĐ-CP (Khu vực hạn chế bay đô thị)',
    description:
      'Khu vực cầu Thủ Thiêm, cầu Ba Son và luồng tàu thủy sông Sài Gòn; giới hạn độ cao <= 120m AGL theo giấy phép.',
  },
  {
    code: 'VN-RES-SGN-CATLAI-500KV',
    name: 'Hành Lang Bảo Vệ Lưới Điện Cao Thế 500kV & Cảng Cát Lái',
    region: 'TP. Hồ Chí Minh',
    zoneType: 'RESTRICTED_ZONE',
    latitude: 10.7615,
    longitude: 106.7754,
    radiusMeters: 1800,
    maxAltitudeMetersAgl: 100,
    authority: 'Bộ Tư lệnh TP.HCM & Đơn vị Quản lý Lưới điện',
    legalBasis: 'Nghị định 288/2025/NĐ-CP & Quy định an toàn hành lang lưới điện cao áp',
    description:
      'Hành lang trạm và trụ vượt sông 500kV Cát Lái; yêu cầu giấy phép bay và phương án chống nhiễu từ trường.',
  },
  {
    code: 'VN-NFZ-HAN-BADINH',
    name: 'Khu Vực Cấm Bay Đặc Biệt Ba Đình - Trung Tâm Chính Trị Quốc Gia',
    region: 'Hà Nội',
    zoneType: 'NO_FLY_ZONE',
    latitude: 21.0369,
    longitude: 105.8342,
    radiusMeters: 2500,
    maxAltitudeMetersAgl: 0,
    authority: 'Cục Tác chiến - Bộ Tổng Tham mưu (Bộ Quốc phòng)',
    legalBasis: 'Quyết định 18/2020/QĐ-TTg & Luật Phòng không nhân dân 2024',
    description:
      'Khu vực Lăng Chủ tịch Hồ Chí Minh, Tòa nhà Quốc hội, Phủ Chủ tịch và trụ sở Bộ Quốc phòng.',
  },
  {
    code: 'VN-NFZ-HAN-NOIBAI-CORE',
    name: 'Cảng HKQT Nội Bài — Vùng Cấm Bay Tuyệt Đối',
    region: 'Hà Nội',
    zoneType: 'NO_FLY_ZONE',
    latitude: 21.2187,
    longitude: 105.8042,
    radiusMeters: 4000,
    maxAltitudeMetersAgl: 0,
    authority: 'Cục Tác chiến & Sư đoàn Không quân 371',
    legalBasis: 'Quyết định 18/2020/QĐ-TTg',
    description: 'Khu vực đường cất hạ cánh và đài chỉ huy Cảng hàng không quốc tế Nội Bài.',
  },
  {
    code: 'VN-NFZ-DAD-AIRPORT-CORE',
    name: 'Cảng HKQT Đà Nẵng & Khu Quân Sự Sư Đoàn 372',
    region: 'Đà Nẵng',
    zoneType: 'NO_FLY_ZONE',
    latitude: 16.0539,
    longitude: 108.1994,
    radiusMeters: 3500,
    maxAltitudeMetersAgl: 0,
    authority: 'Cục Tác chiến & Sư đoàn Không quân 372',
    legalBasis: 'Quyết định 18/2020/QĐ-TTg & Nghị định 288/2025/NĐ-CP',
    description: 'Khu vực sân bay hỗn hợp dân sự - quân sự Đà Nẵng.',
  },
] as const;

const EARTH_RADIUS_METERS = 6_371_000;
const NEARBY_BUFFER_METERS = 5_000;

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function evaluateAirspace(latitude: number, longitude: number): AirspaceEvaluation {
  const withDistances: AirspaceZone[] = VIETNAM_AIRSPACE_ZONES.map((zone) => ({
    ...zone,
    distanceMeters: Math.round(
      haversineDistanceMeters(latitude, longitude, zone.latitude, zone.longitude),
    ),
  })).sort((a, b) => {
    const rankA = a.zoneType === 'NO_FLY_ZONE' ? 0 : 1;
    const rankB = b.zoneType === 'NO_FLY_ZONE' ? 0 : 1;
    if (rankA !== rankB) return rankA - rankB;
    return (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0);
  });

  const matchingZones = withDistances.filter(
    (z) => (z.distanceMeters ?? Infinity) <= z.radiusMeters,
  );
  const nearbyZones = withDistances.filter(
    (z) =>
      (z.distanceMeters ?? Infinity) > z.radiusMeters &&
      (z.distanceMeters ?? Infinity) <= z.radiusMeters + NEARBY_BUFFER_METERS,
  );

  const inNoFly = matchingZones.some((z) => z.zoneType === 'NO_FLY_ZONE');
  const inRestricted = !inNoFly && matchingZones.length > 0;

  const classification: AirspaceClassification = inNoFly
    ? 'NO_FLY_ZONE'
    : inRestricted
      ? 'RESTRICTED_ZONE'
      : 'CLEAR_ZONE';

  const isRestrictedOrProhibited = inNoFly || inRestricted;

  return {
    latitude,
    longitude,
    classification,
    messageCode: isRestrictedOrProhibited ? 'MSG28' : 'AIRSPACE_CLEAR',
    advisoryMessage: isRestrictedOrProhibited ? MSG28_ADVISORY_MESSAGE : CLEAR_ADVISORY_MESSAGE,
    portalUrl: CAMBAY_PORTAL_URL,
    matchingZones,
    nearbyZones,
  };
}

export function extractCoordinates(
  locationText?: string | null,
  explicitLatitude?: number | null,
  explicitLongitude?: number | null,
): { latitude: number | null; longitude: number | null; label: string } {
  let parsedLat: number | null =
    typeof explicitLatitude === 'number' && !Number.isNaN(explicitLatitude)
      ? explicitLatitude
      : null;
  let parsedLon: number | null =
    typeof explicitLongitude === 'number' && !Number.isNaN(explicitLongitude)
      ? explicitLongitude
      : null;
  let label = locationText ?? '';

  if (locationText) {
    try {
      const parsed = JSON.parse(locationText);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.label === 'string') {
          label = parsed.label;
        }
        if (parsedLat == null && parsed.latitude != null && !Number.isNaN(Number(parsed.latitude))) {
          parsedLat = Number(parsed.latitude);
        }
        if (
          parsedLon == null &&
          parsed.longitude != null &&
          !Number.isNaN(Number(parsed.longitude))
        ) {
          parsedLon = Number(parsed.longitude);
        }
      }
    } catch {
      // plain text location
    }
  }

  return {
    latitude: parsedLat,
    longitude: parsedLon,
    label: label || 'Chưa cập nhật địa chỉ',
  };
}

/**
 * Formats a location string which might be a JSON object like:
 * {"label": "Hẻm 40 Đường Hàng Tre", "latitude": 10.847804, "longitude": 106.812573}
 * or a plain text string into a clean, human-readable address.
 */
export function formatLocation(locationText?: string | null | undefined): string {
  if (!locationText || !locationText.trim()) return '—';
  const trimmed = locationText.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.label === 'string' && parsed.label.trim()) {
          return parsed.label.trim();
        }
        if (typeof parsed.address === 'string' && parsed.address.trim()) {
          return parsed.address.trim();
        }
        const lat = parsed.latitude ?? parsed.lat;
        const lon = parsed.longitude ?? parsed.lon ?? parsed.lng;
        if (lat != null && lon != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon))) {
          return `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
        }
      }
    } catch {
      // not valid JSON, treat as plain string
    }
  }
  return trimmed;
}

/**
 * Automatically finds an optimal take-off point around the target asset that is OUTSIDE all
 * prohibited NO_FLY_ZONE circles (with a safety margin), preferring close VLOS distances.
 */
export function findSafeTakeoffPoint(
  targetLat: number,
  targetLon: number,
): { lat: number; lon: number; distanceMeters: number } {
  const candidateDistancesMeters = [260, 380, 550, 800, 1200, 1800, 2500];
  // Prioritize East / Southeast / Northeast bearings (e.g. Thủ Thiêm riverbank) before West
  const bearingsDeg = [115, 90, 135, 65, 155, 40, 180, 15, 205, 345, 230, 315, 255, 285];
  const cosLat = Math.max(0.2, Math.cos((targetLat * Math.PI) / 180));

  for (const dist of candidateDistancesMeters) {
    for (const deg of bearingsDeg) {
      const rad = (deg * Math.PI) / 180;
      const dNorthMeters = Math.cos(rad) * dist;
      const dEastMeters = Math.sin(rad) * dist;
      const candLat = Number((targetLat + dNorthMeters / 111_320).toFixed(6));
      const candLon = Number((targetLon + dEastMeters / (111_320 * cosLat)).toFixed(6));

      // Check that the candidate is outside all NO_FLY_ZONE radii plus an 80m safety buffer
      const insideAnyNoFlyWithBuffer = VIETNAM_AIRSPACE_ZONES.some((zone) => {
        if (zone.zoneType !== 'NO_FLY_ZONE') return false;
        const d = haversineDistanceMeters(candLat, candLon, zone.latitude, zone.longitude);
        return d <= zone.radiusMeters + 80;
      });

      if (!insideAnyNoFlyWithBuffer) {
        return {
          lat: candLat,
          lon: candLon,
          distanceMeters: Math.round(
            haversineDistanceMeters(candLat, candLon, targetLat, targetLon),
          ),
        };
      }
    }
  }

  // Fallback if target is deep inside a gigantic no-fly zone: push outside the nearest NO_FLY_ZONE boundary
  const activeNoFly = VIETNAM_AIRSPACE_ZONES.find((zone) => {
    if (zone.zoneType !== 'NO_FLY_ZONE') return false;
    return (
      haversineDistanceMeters(targetLat, targetLon, zone.latitude, zone.longitude) <=
      zone.radiusMeters
    );
  });

  if (activeNoFly) {
    const safeOffsetMeters = activeNoFly.radiusMeters + 150;
    const candLat = Number(activeNoFly.latitude.toFixed(6));
    const candLon = Number(
      (activeNoFly.longitude + safeOffsetMeters / (111_320 * cosLat)).toFixed(6),
    );
    return {
      lat: candLat,
      lon: candLon,
      distanceMeters: Math.round(haversineDistanceMeters(candLat, candLon, targetLat, targetLon)),
    };
  }

  return {
    lat: Number((targetLat - 0.0012).toFixed(6)),
    lon: Number((targetLon + 0.0022).toFixed(6)),
    distanceMeters: 280,
  };
}

export interface LatLonPoint {
  lat: number;
  lon: number;
}

export interface PolygonMetrics {
  pointCount: number;
  perimeterMeters: number;
  areaSquareMeters: number;
  areaHectares: number;
}

/**
 * Calculates geodesic perimeter and enclosed surface area for a set of perimeter boundary points.
 */
export function calculatePolygonPerimeterAndArea(points: LatLonPoint[]): PolygonMetrics {
  if (points.length < 3) {
    return {
      pointCount: points.length,
      perimeterMeters: 0,
      areaSquareMeters: 0,
      areaHectares: 0,
    };
  }

  // 1. Calculate Perimeter using Haversine
  let perimeterMeters = 0;
  for (let i = 0; i < points.length; i++) {
    const nextIdx = (i + 1) % points.length;
    const p1 = points[i];
    const p2 = points[nextIdx];
    if (p1 && p2) {
      perimeterMeters += haversineDistanceMeters(p1.lat, p1.lon, p2.lat, p2.lon);
    }
  }

  // 2. Calculate Area using Planar projection relative to centroid (Shoelace)
  const centroidLat = points.reduce((acc, p) => acc + p.lat, 0) / points.length;
  const centroidLon = points.reduce((acc, p) => acc + p.lon, 0) / points.length;
  const cosLat = Math.cos((centroidLat * Math.PI) / 180);
  const R = 6371000; // Earth mean radius in meters

  const xyMeters = points.map((p) => ({
    x: (((p.lon - centroidLon) * Math.PI) / 180) * R * cosLat,
    y: (((p.lat - centroidLat) * Math.PI) / 180) * R,
  }));

  let shoelaceSum = 0;
  for (let i = 0; i < xyMeters.length; i++) {
    const j = (i + 1) % xyMeters.length;
    const p1 = xyMeters[i];
    const p2 = xyMeters[j];
    if (p1 && p2) {
      shoelaceSum += p1.x * p2.y - p2.x * p1.y;
    }
  }
  const areaSquareMeters = Math.abs(shoelaceSum) / 2;
  const areaHectares = areaSquareMeters / 10000;

  return {
    pointCount: points.length,
    perimeterMeters: Math.round(perimeterMeters),
    areaSquareMeters: Math.round(areaSquareMeters),
    areaHectares: Number(areaHectares.toFixed(2)),
  };
}

export interface LandmarkLocation {
  name: string;
  category: 'CẦU' | 'CÔNG TRÌNH' | 'NĂNG LƯỢNG' | 'CẢNG' | 'ĐỊA DANH';
  latitude: number;
  longitude: number;
  region: string;
}

export const POPULAR_VIETNAM_LANDMARKS: LandmarkLocation[] = [
  { name: 'Cầu Ba Son (Cầu Thủ Thiêm 2)', category: 'CẦU', latitude: 10.7805, longitude: 106.7108, region: 'Quận 1 / TP. Thủ Đức, TP.HCM' },
  { name: 'Cầu Phú Mỹ', category: 'CẦU', latitude: 10.7492, longitude: 106.7456, region: 'Quận 7 / TP. Thủ Đức, TP.HCM' },
  { name: 'Cầu Sài Gòn', category: 'CẦU', latitude: 10.7997, longitude: 106.7214, region: 'Bình Thạnh / TP. Thủ Đức, TP.HCM' },
  { name: 'Cầu Thủ Thiêm 1', category: 'CẦU', latitude: 10.7876, longitude: 106.7175, region: 'Bình Thạnh / TP. Thủ Đức, TP.HCM' },
  { name: 'Cầu Đồng Nai', category: 'CẦU', latitude: 10.8920, longitude: 106.8402, region: 'TP. Biên Hòa, Đồng Nai' },
  { name: 'Cầu Cần Thơ', category: 'CẦU', latitude: 10.0333, longitude: 105.8167, region: 'TP. Cần Thơ / Vĩnh Long' },
  { name: 'Cầu Rồng Đà Nẵng', category: 'CẦU', latitude: 16.0610, longitude: 108.2270, region: 'Hải Châu / Sơn Trà, TP. Đà Nẵng' },
  { name: 'Cầu Thuận Phước', category: 'CẦU', latitude: 16.0964, longitude: 108.2231, region: 'Hải Châu / Sơn Trà, TP. Đà Nẵng' },
  { name: 'Cầu Nhật Tân (Hà Nội)', category: 'CẦU', latitude: 21.0945, longitude: 105.8189, region: 'Tây Hồ / Đông Anh, Hà Nội' },
  { name: 'Cầu Long Biên (Hà Nội)', category: 'CẦU', latitude: 21.0425, longitude: 105.8569, region: 'Hoàn Kiếm / Long Biên, Hà Nội' },
  { name: 'Nhà máy Điện Hiệp Phước', category: 'NĂNG LƯỢNG', latitude: 10.6350, longitude: 106.7450, region: 'Huyện Nhà Bè, TP.HCM' },
  { name: 'Trụ điện 500kV Cát Lái', category: 'NĂNG LƯỢNG', latitude: 10.7615, longitude: 106.7754, region: 'TP. Thủ Đức, TP.HCM' },
  { name: 'Nhà máy Nhiệt điện Duyên Hải', category: 'NĂNG LƯỢNG', latitude: 9.6050, longitude: 106.5200, region: 'Trà Vinh' },
  { name: 'Cảng Cát Lái', category: 'CẢNG', latitude: 10.7620, longitude: 106.7890, region: 'TP. Thủ Đức, TP.HCM' },
  { name: 'Cảng Hiệp Phước', category: 'CẢNG', latitude: 10.6450, longitude: 106.7580, region: 'Nhà Bè, TP.HCM' },
  { name: 'Tòa nhà Landmark 81', category: 'CÔNG TRÌNH', latitude: 10.7950, longitude: 106.7218, region: 'Bình Thạnh, TP.HCM' },
  { name: 'Tòa nhà Bitexco Financial Tower', category: 'CÔNG TRÌNH', latitude: 10.7715, longitude: 106.7044, region: 'Quận 1, TP.HCM' },
  { name: 'Dinh Độc Lập / Trung tâm Quận 1', category: 'ĐỊA DANH', latitude: 10.7769, longitude: 106.6953, region: 'Quận 1, TP.HCM' },
  { name: 'Hồ Hoàn Kiếm / Trung tâm Hà Nội', category: 'ĐỊA DANH', latitude: 21.0285, longitude: 105.8542, region: 'Hoàn Kiếm, Hà Nội' },
  { name: 'Khu Công Nghệ Cao TP.HCM (SHTP)', category: 'CÔNG TRÌNH', latitude: 10.8544, longitude: 106.7925, region: 'TP. Thủ Đức, TP.HCM' },
];

export function searchVietnamLandmarks(query: string): LandmarkLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return POPULAR_VIETNAM_LANDMARKS.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.region.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q),
  );
}

