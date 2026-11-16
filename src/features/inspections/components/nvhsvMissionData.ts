export interface WaypointSpec {
  id: string;
  cam: readonly [number, number, number];
  target: readonly [number, number, number];
  dwellWeight: number;
  note: string;
}

export interface DefectHotspotSpec {
  code: 'DEF-01' | 'DEF-02' | 'DEF-03' | 'DEF-04';
  label: string;
  aiClass: string;
  severity: 'HIGH' | 'MEDIUM';
  position: readonly [number, number, number];
  timeSeconds: number;
}

export const NVHSV_BASE_GPS = {
  latitude: 10.875167,
  longitude: 106.800719,
  address:
    'Số 6 Đường Lưu Hữu Phước, Khu đô thị Đại học Quốc gia TP.HCM, Khu phố Tân Lập, Phường Đông Hòa, TP. Dĩ An, Bình Dương',
} as const;

export const NVHSV_MISSION_DURATION_SECONDS = 24.0;

/** Exact 14 pre-planned Gazebo waypoints from sim-gazebo/nvhsv_waypoints.py (ENU Z-up meters). */
export const NVHSV_WAYPOINTS: readonly WaypointSpec[] = [
  { id: 'WP-00-TAKEOFF', cam: [-1.5, 34.5, 2.2], target: [0.0, 15.0, 14.0], dwellWeight: 0.7, note: 'Takeoff from Plaza Helipad' },
  { id: 'WP-01-FRONT-SIGN', cam: [8.0, 38.0, 22.0], target: [0.0, 14.26, 20.5], dwellWeight: 1.4, note: 'Front Hero Approach & Signage Scan' },
  { id: 'WP-02-DEF01-NORTH', cam: [-21.2, 18.5, 28.4], target: [-21.2, 14.26, 28.4], dwellWeight: 2.2, note: 'DEF-01 North Crown Parapet Inspection' },
  { id: 'WP-03-NW-CORNER', cam: [-33.0, 19.5, 21.5], target: [-23.0, 10.5, 18.0], dwellWeight: 1.0, note: 'North-West Curved Louver Sweep' },
  { id: 'WP-04-WEST-CLEAR', cam: [-35.5, 7.0, 16.5], target: [-29.0, 7.0, 16.5], dwellWeight: 0.9, note: 'West Wing Intact Louvers' },
  { id: 'WP-05-DEF04-WEST', cam: [-34.0, -2.0, 14.5], target: [-29.68, -2.0, 14.5], dwellWeight: 2.2, note: 'DEF-04 West Cill Spalling Inspection' },
  { id: 'WP-06-SW-GUARD', cam: [-32.5, -21.0, 13.5], target: [-21.0, -10.0, 13.0], dwellWeight: 1.0, note: 'South-West Corner & Plaza Ramp View' },
  { id: 'WP-07-SOUTH-RAMP', cam: [-8.5, -26.5, 12.0], target: [-4.0, -14.5, 12.5], dwellWeight: 1.0, note: 'South Basement Portal & Rear Fascia' },
  { id: 'WP-08-DEF03-SOUTH', cam: [4.5, -19.8, 15.0], target: [4.5, -15.68, 15.0], dwellWeight: 2.2, note: 'DEF-03 South Wall Leakage Inspection' },
  { id: 'WP-09-SE-CORNER', cam: [32.5, -19.0, 16.0], target: [23.0, -10.0, 16.0], dwellWeight: 1.0, note: 'South-East Curved Louver Sweep' },
  { id: 'WP-10-DEF02-EAST', cam: [33.8, 0.0, 16.5], target: [29.68, 0.0, 16.5], dwellWeight: 2.2, note: 'DEF-02 East Structural Spalling Inspection' },
  { id: 'WP-11-NE-CORNER', cam: [32.5, 19.0, 21.0], target: [23.0, 10.0, 18.5], dwellWeight: 1.0, note: 'North-East Curved Louver Corner' },
  { id: 'WP-12-ROOF-ORBIT', cam: [16.0, 29.0, 36.0], target: [0.0, 6.0, 23.0], dwellWeight: 1.3, note: 'Rooftop Crown & Skylight Overview' },
  { id: 'WP-13-RETURN-CANOPY', cam: [-1.5, 34.5, 10.5], target: [0.0, 16.0, 13.0], dwellWeight: 1.0, note: 'Return Descent to Plaza Station' },
];

function getItem<T>(arr: readonly T[], index: number): T {
  const clamped = Math.max(0, Math.min(arr.length - 1, index));
  const item = arr[clamped];
  if (item === undefined) {
    throw new Error('Unexpected empty array access');
  }
  return item;
}

function buildCumWeights(): number[] {
  const segWeights: number[] = [];
  for (let i = 0; i < NVHSV_WAYPOINTS.length - 1; i++) {
    const a = getItem(NVHSV_WAYPOINTS, i);
    const b = getItem(NVHSV_WAYPOINTS, i + 1);
    segWeights.push(0.5 * (a.dwellWeight + b.dwellWeight));
  }
  const total = segWeights.reduce((acc, w) => acc + w, 0);
  const cum = [0];
  for (const w of segWeights) {
    const prev = getItem(cum, cum.length - 1);
    cum.push(prev + w / total);
  }
  return cum;
}

const CUM_WEIGHTS = buildCumWeights();

export function waypointTimestampSeconds(index: number, duration = NVHSV_MISSION_DURATION_SECONDS): number {
  return getItem(CUM_WEIGHTS, index) * duration;
}

export const NVHSV_DEFECT_HOTSPOTS: readonly DefectHotspotSpec[] = [
  {
    code: 'DEF-01',
    label: 'North Crown Crack & Spalling',
    aiClass: 'crack / abscission',
    severity: 'HIGH',
    position: [-21.2, 14.26, 28.4],
    timeSeconds: waypointTimestampSeconds(2),
  },
  {
    code: 'DEF-04',
    label: 'West Wing Cill Spall & Rebar',
    aiClass: 'crack',
    severity: 'HIGH',
    position: [-29.68, -2.0, 14.5],
    timeSeconds: waypointTimestampSeconds(5),
  },
  {
    code: 'DEF-03',
    label: 'South Wall Water Leakage',
    aiClass: 'leakage / crack',
    severity: 'MEDIUM',
    position: [4.5, -15.68, 15.0],
    timeSeconds: waypointTimestampSeconds(8),
  },
  {
    code: 'DEF-02',
    label: 'East Bay Coat Delamination',
    aiClass: 'abscission',
    severity: 'HIGH',
    position: [29.68, 0.0, 16.5],
    timeSeconds: waypointTimestampSeconds(10),
  },
];

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

export interface SampledMissionState {
  cam: readonly [number, number, number];
  target: readonly [number, number, number];
  headingDeg: number;
  altitudeMeters: number;
  speedMps: number;
  distanceFlownMeters: number;
  latitude: number;
  longitude: number;
  waypointId: string;
  waypointNote: string;
  batteryPct: number;
  nearbyDefect: DefectHotspotSpec | null;
}

function samplePoseAtU(u: number): {
  cam: [number, number, number];
  target: [number, number, number];
  waypointIdx: number;
} {
  const clamped = Math.max(0, Math.min(0.999999, u));
  const segCount = NVHSV_WAYPOINTS.length - 1;
  let segIdx = 0;
  for (let s = 0; s < segCount; s++) {
    if (clamped >= getItem(CUM_WEIGHTS, s) && clamped <= getItem(CUM_WEIGHTS, s + 1)) {
      segIdx = s;
      break;
    }
  }
  const u0 = getItem(CUM_WEIGHTS, segIdx);
  const u1 = getItem(CUM_WEIGHTS, segIdx + 1);
  const localT = (clamped - u0) / Math.max(1e-6, u1 - u0);

  const wp0 = getItem(NVHSV_WAYPOINTS, segIdx - 1);
  const wp1 = getItem(NVHSV_WAYPOINTS, segIdx);
  const wp2 = getItem(NVHSV_WAYPOINTS, segIdx + 1);
  const wp3 = getItem(NVHSV_WAYPOINTS, segIdx + 2);

  const cam: [number, number, number] = [
    catmullRom(wp0.cam[0], wp1.cam[0], wp2.cam[0], wp3.cam[0], localT),
    catmullRom(wp0.cam[1], wp1.cam[1], wp2.cam[1], wp3.cam[1], localT),
    catmullRom(wp0.cam[2], wp1.cam[2], wp2.cam[2], wp3.cam[2], localT),
  ];
  const target: [number, number, number] = [
    catmullRom(wp0.target[0], wp1.target[0], wp2.target[0], wp3.target[0], localT),
    catmullRom(wp0.target[1], wp1.target[1], wp2.target[1], wp3.target[1], localT),
    catmullRom(wp0.target[2], wp1.target[2], wp2.target[2], wp3.target[2], localT),
  ];
  const nearestWp = localT < 0.5 ? segIdx : Math.min(segCount, segIdx + 1);
  return { cam, target, waypointIdx: nearestWp };
}

export function buildFlightTrajectoryPoints(samples = 180): Array<readonly [number, number, number]> {
  const pts: Array<readonly [number, number, number]> = [];
  for (let i = 0; i <= samples; i++) {
    pts.push(samplePoseAtU(i / samples).cam);
  }
  return pts;
}

const PRECOMPUTED_PATH = buildFlightTrajectoryPoints(240);
const CUM_DISTANCE = (() => {
  const arr = [0];
  for (let i = 1; i < PRECOMPUTED_PATH.length; i++) {
    const a = getItem(PRECOMPUTED_PATH, i - 1);
    const b = getItem(PRECOMPUTED_PATH, i);
    const prevDist = getItem(arr, arr.length - 1);
    arr.push(prevDist + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
  }
  return arr;
})();

export function sampleNvhsvMission(
  elapsedSeconds: number,
  duration = NVHSV_MISSION_DURATION_SECONDS,
): SampledMissionState {
  const t = Math.max(0, Math.min(duration, elapsedSeconds));
  const u = t / Math.max(0.1, duration);
  const { cam, target, waypointIdx } = samplePoseAtU(u);
  const prev = samplePoseAtU(Math.max(0, u - 0.005));
  const dt = 0.005 * duration;
  const speedMps =
    u <= 0.001
      ? 0
      : Math.hypot(cam[0] - prev.cam[0], cam[1] - prev.cam[1], cam[2] - prev.cam[2]) / Math.max(1e-4, dt);

  const dx = target[0] - cam[0];
  const dy = target[1] - cam[1];
  // ENU compass heading: +Y = North (0 deg), +X = East (90 deg)
  const headingRad = Math.atan2(dx, dy);
  const headingDeg = ((headingRad * 180) / Math.PI + 360) % 360;

  const distFloatIdx = u * (CUM_DISTANCE.length - 1);
  const d0 = Math.floor(distFloatIdx);
  const d1 = Math.min(CUM_DISTANCE.length - 1, d0 + 1);
  const frac = distFloatIdx - d0;
  const distanceFlownMeters = getItem(CUM_DISTANCE, d0) * (1 - frac) + getItem(CUM_DISTANCE, d1) * frac;

  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((NVHSV_BASE_GPS.latitude * Math.PI) / 180);
  const latitude = NVHSV_BASE_GPS.latitude + cam[1] / metersPerDegLat;
  const longitude = NVHSV_BASE_GPS.longitude + cam[0] / metersPerDegLon;

  let nearbyDefect: DefectHotspotSpec | null = null;
  for (const defect of NVHSV_DEFECT_HOTSPOTS) {
    if (Math.abs(t - defect.timeSeconds) <= 1.2) {
      nearbyDefect = defect;
      break;
    }
  }

  const wp = getItem(NVHSV_WAYPOINTS, waypointIdx);
  return {
    cam,
    target,
    headingDeg,
    altitudeMeters: cam[2],
    speedMps,
    distanceFlownMeters,
    latitude,
    longitude,
    waypointId: wp.id,
    waypointNote: wp.note,
    batteryPct: Math.max(72, Math.round(94 - u * 8)),
    nearbyDefect,
  };
}
