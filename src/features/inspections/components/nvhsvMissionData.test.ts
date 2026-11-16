import { describe, expect, it } from 'vitest';
import {
  buildFlightTrajectoryPoints,
  NVHSV_DEFECT_HOTSPOTS,
  NVHSV_MISSION_DURATION_SECONDS,
  sampleNvhsvMission,
} from './nvhsvMissionData';

describe('nvhsvMissionData', () => {
  it('samples smooth continuous telemetry & cumulative distance across the 24s mission', () => {
    const start = sampleNvhsvMission(0, NVHSV_MISSION_DURATION_SECONDS);
    const mid = sampleNvhsvMission(12, NVHSV_MISSION_DURATION_SECONDS);
    const end = sampleNvhsvMission(24, NVHSV_MISSION_DURATION_SECONDS);

    expect(start.waypointId).toBe('WP-00-TAKEOFF');
    expect(mid.distanceFlownMeters).toBeGreaterThan(20);
    expect(end.distanceFlownMeters).toBeGreaterThan(mid.distanceFlownMeters);
    expect(mid.latitude).toBeGreaterThan(10.87);
    expect(mid.longitude).toBeGreaterThan(106.79);
  });

  it('activates nearbyDefect markers at each defect hotspot timestamp and generates trajectory points', () => {
    for (const defect of NVHSV_DEFECT_HOTSPOTS) {
      const sampled = sampleNvhsvMission(defect.timeSeconds, NVHSV_MISSION_DURATION_SECONDS);
      expect(sampled.nearbyDefect?.code).toBe(defect.code);
    }
    const pts = buildFlightTrajectoryPoints(50);
    expect(pts.length).toBe(51);
  });
});
