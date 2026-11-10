import { useEffect, useMemo, useRef } from 'react';
import { Box, IconButton, Stack, Tooltip } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import RemoveRounded from '@mui/icons-material/RemoveRounded';
import RotateRightRounded from '@mui/icons-material/RotateRightRounded';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { EvidenceItem } from '@/features/inspections/api/inspectionApi';
import type { SmartDroneHubFlightTracePoint } from '@/features/inspections/api/smartDroneHubApi';
import { useLocale } from '@/shared/i18n/LocaleProvider';

maplibregl.setWorkerUrl(workerUrl);

const WEBGL_SUPPORTED =
  typeof window !== 'undefined' &&
  typeof window.WebGLRenderingContext !== 'undefined' &&
  !import.meta.env.VITEST;

export interface TrajectoryEnrichedSample extends SmartDroneHubFlightTracePoint {
  idx: number;
  elapsedSec: number | null;
  altitude: number | null;
  speed: number | null;
  battery: number | null;
  mode: string;
}

export interface MapLibreFlightTrajectoryCanvasProps {
  samples: TrajectoryEnrichedSample[];
  geoEvidence: EvidenceItem[];
  height: number;
  isDialog?: boolean;
  viewDimension: '2d' | '3d';
  mapStyle: 'street' | 'satellite';
  activeIdx: number | null;
  onSelectIdx: (idx: number | null) => void;
  onHoverIdx: (idx: number | null) => void;
}

const GOOGLE_STREET_TILES = [
  'https://mt0.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
  'https://mt1.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
  'https://mt2.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
  'https://mt3.google.com/vt/lyrs=m&hl=vi&x={x}&y={y}&z={z}',
];
const GOOGLE_HYBRID_SATELLITE_TILES = [
  'https://mt0.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
  'https://mt1.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
  'https://mt2.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
  'https://mt3.google.com/vt/lyrs=y&hl=vi&x={x}&y={y}&z={z}',
];
const OPENFREEMAP_VECTOR_SOURCE = 'https://tiles.openfreemap.org/planet';

// Convert meters offset to [lon, lat] degrees at a given latitude
function offsetMeters(
  lon: number,
  lat: number,
  eastMeters: number,
  northMeters: number,
): [number, number] {
  const dLat = northMeters / 111320;
  const dLon =
    eastMeters / (111320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return [lon + dLon, lat + dLat];
}

// Create a small regular polygon around [lon, lat] with radius in meters
function circlePolygon(
  lon: number,
  lat: number,
  radiusMeters: number,
  sides = 12,
): Array<[number, number]> {
  const ring: Array<[number, number]> = [];
  for (let i = 0; i <= sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    ring.push(
      offsetMeters(
        lon,
        lat,
        Math.cos(angle) * radiusMeters,
        Math.sin(angle) * radiusMeters,
      ),
    );
  }
  return ring;
}

// Create a sleek 3D ribbon polygon segment between two points with given half-width in meters
function segmentPolygon(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
  halfWidthMeters: number,
): Array<[number, number]> | null {
  const cosLat = Math.max(0.2, Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180));
  const dx = (lon2 - lon1) * 111320 * cosLat;
  const dy = (lat2 - lat1) * 111320;
  const len = Math.hypot(dx, dy);
  if (len < 0.08) return null;
  const nx = (-dy / len) * halfWidthMeters;
  const ny = (dx / len) * halfWidthMeters;
  const p1L = offsetMeters(lon1, lat1, nx, ny);
  const p1R = offsetMeters(lon1, lat1, -nx, -ny);
  const p2R = offsetMeters(lon2, lat2, -nx, -ny);
  const p2L = offsetMeters(lon2, lat2, nx, ny);
  return [p1L, p1R, p2R, p2L, p1L];
}

function buildTrajectoryGeoJson(
  samples: TrajectoryEnrichedSample[],
  activeIdx: number | null,
) {
  const gpsSamples = samples.filter(
    (s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude),
  );
  const altValues = gpsSamples
    .map((s) => s.altitude)
    .filter((alt): alt is number => alt != null && Number.isFinite(alt));
  const hasAllAltitudes = gpsSamples.length > 0 && altValues.length === gpsSamples.length;
  const maxAlt = altValues.length > 0 ? Math.max(...altValues) : 0;
  const zScale = maxAlt > 0 && maxAlt < 10 ? 12 / maxAlt : 1.0;

  // 1. 2D Ground LineString (only when >= 2 GPS points)
  const lineFeature = {
    type: 'FeatureCollection' as const,
    features:
      gpsSamples.length > 1
        ? [
            {
              type: 'Feature' as const,
              properties: {
                idx: gpsSamples[Math.floor(gpsSamples.length / 2)]?.idx ?? 0,
              },
              geometry: {
                type: 'LineString' as const,
                coordinates: gpsSamples.map((s) => [s.longitude, s.latitude]),
              },
            },
          ]
        : [],
  };

  // 2. 2D Ground Points (only Start, End, and currently hovered/selected point)
  const key2DPoints = gpsSamples
    .map((s, idx) => ({ s, idx }))
    .filter(
      ({ s, idx }) =>
        idx === 0 || idx === gpsSamples.length - 1 || activeIdx === s.idx,
    );

  const pointsFeature = {
    type: 'FeatureCollection' as const,
    features: key2DPoints.map(({ s, idx }) => ({
      type: 'Feature' as const,
      properties: {
        idx: s.idx,
        color:
          activeIdx === s.idx
            ? '#f59e0b'
            : idx === 0
              ? '#10b981'
              : '#f97316',
        radius: activeIdx === s.idx ? 8 : 6.5,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.longitude, s.latitude],
      },
    })),
  };

  // 3. Clean 3D Flight Path (only when altitudes are recorded across segments)
  const extrusions: Array<{
    type: 'Feature';
    properties: Record<string, string | number>;
    geometry: { type: 'Polygon'; coordinates: Array<Array<[number, number]>> };
  }> = [];

  for (let i = 0; i < gpsSamples.length - 1; i++) {
    const a = gpsSamples[i]!;
    const b = gpsSamples[i + 1]!;
    if (a.altitude == null || b.altitude == null) {
      continue;
    }
    const cosLat = Math.max(0.2, Math.cos((((a.latitude + b.latitude) / 2) * Math.PI) / 180));
    const dx = (b.longitude - a.longitude) * 111320 * cosLat;
    const dy = (b.latitude - a.latitude) * 111320;
    const horizDist = Math.hypot(dx, dy);
    const dAlt = Math.abs(b.altitude - a.altitude) * zScale;

    if (horizDist < 0.35 && dAlt > 0.25) {
      // Pure vertical climb / descent: draw one sleek vertical line segment
      const lowZ = Math.min(a.altitude, b.altitude) * zScale;
      const highZ = Math.max(a.altitude, b.altitude) * zScale;
      const isDescending = b.altitude < a.altitude;
      extrusions.push({
        type: 'Feature',
        properties: {
          kind: 'beam',
          idx: b.idx,
          base: Math.max(0, lowZ),
          height: Math.max(lowZ + 0.3, highZ),
          color: isDescending ? '#f97316' : '#10b981',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon(a.longitude, a.latitude, 0.32, 10)],
        },
      });
      continue;
    }

    if (horizDist < 0.15) {
      continue;
    }

    const steps = Math.max(2, Math.min(6, Math.ceil(horizDist / 3)));
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps;
      const t1 = (k + 1) / steps;
      const lon0 = a.longitude + (b.longitude - a.longitude) * t0;
      const lat0 = a.latitude + (b.latitude - a.latitude) * t0;
      const lon1 = a.longitude + (b.longitude - a.longitude) * t1;
      const lat1 = a.latitude + (b.latitude - a.latitude) * t1;
      const altMid =
        (a.altitude + (b.altitude - a.altitude) * ((t0 + t1) / 2)) * zScale;

      const poly = segmentPolygon(lon0, lat0, lon1, lat1, 0.48);
      if (poly) {
        // Color-code by altitude tier so lower vs upper passes are immediately distinct
        const altRatio = maxAlt > 0 ? altMid / (maxAlt * zScale) : 1;
        const beamColor =
          altRatio < 0.65 ? '#06b6d4' : '#2563eb';
        extrusions.push({
          type: 'Feature',
          properties: {
            kind: 'beam',
            idx: b.idx,
            base: Math.max(0.1, altMid - 0.38),
            height: Math.max(0.8, altMid + 0.38),
            color: beamColor,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [poly],
          },
        });
      }
    }
  }

  // 3b. Only render Start, End, and currently hovered/selected node in 3D when altitude exists
  gpsSamples.forEach((s, idx) => {
    const isStart = idx === 0;
    const isEnd = idx === gpsSamples.length - 1;
    const isSelected = activeIdx === s.idx;

    if ((!isStart && !isEnd && !isSelected) || s.altitude == null || !hasAllAltitudes) {
      return;
    }

    const topZ = Math.max(0.6, s.altitude * zScale);

    // Subtle vertical height-reference thread for Start, End, or Selected point
    if (topZ > 1.5) {
      extrusions.push({
        type: 'Feature',
        properties: {
          kind: 'pillar',
          idx: s.idx,
          base: 0,
          height: Math.max(0.2, topZ - 0.5),
          color: isSelected ? '#f59e0b' : '#94a3b8',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [circlePolygon(s.longitude, s.latitude, 0.16, 8)],
        },
      });
    }

    // 3D Node for Start, End, or Active hovered point
    extrusions.push({
      type: 'Feature',
      properties: {
        kind: 'cap',
        idx: s.idx,
        base: Math.max(0.15, topZ - (isSelected ? 0.85 : 0.65)),
        height: topZ + (isSelected ? 0.85 : 0.65),
        color: isSelected
          ? '#f59e0b'
          : isStart
            ? '#10b981'
            : '#f97316',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          circlePolygon(
            s.longitude,
            s.latitude,
            isSelected ? 1.4 : 1.25,
            12,
          ),
        ],
      },
    });
  });

  const extrusionFeatureCollection = {
    type: 'FeatureCollection' as const,
    features: extrusions,
  };

  return { lineFeature, pointsFeature, extrusionFeatureCollection, maxAlt };
}

export function MapLibreFlightTrajectoryCanvas({
  samples,
  geoEvidence,
  height,
  isDialog = false,
  viewDimension,
  mapStyle,
  activeIdx,
  onSelectIdx,
  onHoverIdx,
}: MapLibreFlightTrajectoryCanvasProps) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const styleReadyRef = useRef(false);

  const boundsInfo = useMemo(() => {
    const allLats = [
      ...samples.map((p) => p.latitude).filter(Number.isFinite),
      ...geoEvidence.map((e) => Number(e.latitude)).filter(Number.isFinite),
    ];
    const allLons = [
      ...samples.map((p) => p.longitude).filter(Number.isFinite),
      ...geoEvidence.map((e) => Number(e.longitude)).filter(Number.isFinite),
    ];
    const minLat = allLats.length ? Math.min(...allLats) : 21.0918;
    const maxLat = allLats.length ? Math.max(...allLats) : 21.0925;
    const minLon = allLons.length ? Math.min(...allLons) : 105.819;
    const maxLon = allLons.length ? Math.max(...allLons) : 105.8198;
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;
    return { minLat, maxLat, minLon, maxLon, centerLat, centerLon };
  }, [samples, geoEvidence]);

  const geoData = useMemo(
    () => buildTrajectoryGeoJson(samples, activeIdx),
    [samples, activeIdx],
  );

  const fitTrajectoryCamera = (
    map: maplibregl.Map,
    dim: '2d' | '3d',
    duration = 0,
  ) => {
    const is3D = dim === '3d';
    const altPadDeg = is3D ? Math.max(0.00025, (geoData.maxAlt || 30) / 95000) : 0.00008;
    map.fitBounds(
      [
        [boundsInfo.minLon - altPadDeg, boundsInfo.minLat - altPadDeg * 0.6],
        [boundsInfo.maxLon + altPadDeg, boundsInfo.maxLat + altPadDeg * 1.15],
      ],
      {
        padding: is3D
          ? {
              top: isDialog ? 140 : 88,
              bottom: isDialog ? 54 : 32,
              left: isDialog ? 80 : 40,
              right: isDialog ? 80 : 40,
            }
          : isDialog
            ? 80
            : 44,
        maxZoom: is3D ? 18.1 : 18.6,
        pitch: is3D ? 58 : 0,
        bearing: is3D ? -28 : 0,
        duration,
      },
    );
  };

  // Initialize single MapLibre GL instance once
  useEffect(() => {
    if (!containerRef.current || !WEBGL_SUPPORTED) return;

    const isSat = mapStyle === 'satellite';
    const is3D = viewDimension === '3d';

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'google-street': {
            type: 'raster',
            tiles: GOOGLE_STREET_TILES,
            tileSize: 256,
            maxzoom: 20,
          },
          'google-satellite': {
            type: 'raster',
            tiles: GOOGLE_HYBRID_SATELLITE_TILES,
            tileSize: 256,
            maxzoom: 20,
          },
          'openfreemap-buildings': {
            type: 'vector',
            url: OPENFREEMAP_VECTOR_SOURCE,
          },
          'trajectory-line': {
            type: 'geojson',
            data: geoData.lineFeature,
          },
          'trajectory-points': {
            type: 'geojson',
            data: geoData.pointsFeature,
          },
          'trajectory-3d': {
            type: 'geojson',
            data: geoData.extrusionFeatureCollection,
          },
        },
        layers: [
          {
            id: 'street-layer',
            type: 'raster',
            source: 'google-street',
            layout: { visibility: isSat ? 'none' : 'visible' },
          },
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'google-satellite',
            layout: { visibility: isSat ? 'visible' : 'none' },
          },
          // 3D Real Buildings from OpenFreeMap / OSM overlaid on Google Maps
          {
            id: 'osm-3d-buildings',
            type: 'fill-extrusion',
            source: 'openfreemap-buildings',
            'source-layer': 'building',
            minzoom: 14,
            layout: { visibility: is3D ? 'visible' : 'none' },
            paint: {
              'fill-extrusion-color': isSat ? '#cbd5e1' : '#94a3b8',
              'fill-extrusion-height': [
                'coalesce',
                ['get', 'render_height'],
                12,
              ],
              'fill-extrusion-base': [
                'coalesce',
                ['get', 'render_min_height'],
                0,
              ],
              'fill-extrusion-opacity': 0.5,
            },
          },
          // Ground Track Shadow/Casing
          {
            id: 'ground-track-casing',
            type: 'line',
            source: 'trajectory-line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': is3D ? '#0f172a' : '#ffffff',
              'line-width': is3D ? 2 : 6,
              'line-opacity': is3D ? 0.22 : 0.95,
            },
          },
          // Ground Track Core Line (subtle shadow on ground in 3D, primary blue in 2D)
          {
            id: 'ground-track-core',
            type: 'line',
            source: 'trajectory-line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': is3D ? '#475569' : '#2a78d6',
              'line-width': is3D ? 1.5 : 3.5,
              'line-opacity': is3D ? 0.45 : 1,
            },
          },
          // 3D Thin Vertical Reference Pillars
          {
            id: 'flight-3d-curtain',
            type: 'fill-extrusion',
            source: 'trajectory-3d',
            filter: ['==', ['get', 'kind'], 'pillar'],
            layout: { visibility: is3D ? 'visible' : 'none' },
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.35,
            },
          },
          // 3D Sleek Flight Path & Spaced Waypoint Nodes at True Altitude
          {
            id: 'flight-3d-solid',
            type: 'fill-extrusion',
            source: 'trajectory-3d',
            filter: ['!=', ['get', 'kind'], 'pillar'],
            layout: { visibility: is3D ? 'visible' : 'none' },
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.95,
            },
          },
          // 2D Ground Waypoint Circles (only in 2D mode)
          {
            id: 'ground-waypoints',
            type: 'circle',
            source: 'trajectory-points',
            layout: { visibility: is3D ? 'none' : 'visible' },
            paint: {
              'circle-radius': ['get', 'radius'],
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': 1,
            },
          },
        ],
      },
      center: [boundsInfo.centerLon, boundsInfo.centerLat],
      zoom: 16,
      pitch: is3D ? 58 : 0,
      bearing: is3D ? -28 : 0,
      maxPitch: 80,
      attributionControl: false,
    });

    map.on('load', () => {
      styleReadyRef.current = true;
      fitTrajectoryCamera(map, viewDimension, 0);
    });

    // Interactive waypoint hover & click on both 2D line/points and 3D flight path
    const interactiveLayers = [
      'ground-waypoints',
      'ground-track-core',
      'flight-3d-solid',
    ];
    map.on('mousemove', (e) => {
      if (!styleReadyRef.current) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: interactiveLayers,
      });
      const hit = features.find((f) => f.properties?.idx != null);
      if (hit) {
        map.getCanvas().style.cursor = 'pointer';
        onHoverIdx(Number(hit.properties.idx));
      } else {
        map.getCanvas().style.cursor = '';
        onHoverIdx(null);
      }
    });

    map.on('click', (e) => {
      if (!styleReadyRef.current) return;
      const features = map.queryRenderedFeatures(e.point, {
        layers: interactiveLayers,
      });
      const hit = features.find((f) => f.properties?.idx != null);
      if (hit) {
        const idx = Number(hit.properties.idx);
        onSelectIdx(idx);
        onHoverIdx(idx);
      }
    });

    mapRef.current = map;

    return () => {
      styleReadyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsInfo.centerLat, boundsInfo.centerLon, isDialog]);

  // Update GeoJSON data when activeIdx or samples change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    (map.getSource('trajectory-line') as maplibregl.GeoJSONSource | undefined)?.setData(
      geoData.lineFeature,
    );
    (map.getSource('trajectory-points') as maplibregl.GeoJSONSource | undefined)?.setData(
      geoData.pointsFeature,
    );
    (map.getSource('trajectory-3d') as maplibregl.GeoJSONSource | undefined)?.setData(
      geoData.extrusionFeatureCollection,
    );
  }, [geoData]);

  // Toggle 2D <-> 3D smoothly on the same single MapLibre instance
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const is3D = viewDimension === '3d';

    if (map.getLayer('osm-3d-buildings')) {
      map.setLayoutProperty(
        'osm-3d-buildings',
        'visibility',
        is3D ? 'visible' : 'none',
      );
    }
    if (map.getLayer('flight-3d-curtain')) {
      map.setLayoutProperty(
        'flight-3d-curtain',
        'visibility',
        is3D ? 'visible' : 'none',
      );
    }
    if (map.getLayer('flight-3d-solid')) {
      map.setLayoutProperty(
        'flight-3d-solid',
        'visibility',
        is3D ? 'visible' : 'none',
      );
    }
    if (map.getLayer('ground-waypoints')) {
      map.setLayoutProperty(
        'ground-waypoints',
        'visibility',
        is3D ? 'none' : 'visible',
      );
    }
    if (map.getLayer('ground-track-casing')) {
      map.setPaintProperty(
        'ground-track-casing',
        'line-color',
        is3D ? '#0f172a' : '#ffffff',
      );
      map.setPaintProperty('ground-track-casing', 'line-width', is3D ? 2 : 6);
      map.setPaintProperty(
        'ground-track-casing',
        'line-opacity',
        is3D ? 0.22 : 0.95,
      );
    }
    if (map.getLayer('ground-track-core')) {
      map.setPaintProperty(
        'ground-track-core',
        'line-color',
        is3D ? '#475569' : '#2a78d6',
      );
      map.setPaintProperty('ground-track-core', 'line-width', is3D ? 1.5 : 3.5);
      map.setPaintProperty('ground-track-core', 'line-opacity', is3D ? 0.45 : 1);
    }

    fitTrajectoryCamera(map, viewDimension, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewDimension]);

  // Toggle Map <-> Satellite smoothly on the same single MapLibre instance
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !styleReadyRef.current) return;
    const isSat = mapStyle === 'satellite';
    if (map.getLayer('street-layer')) {
      map.setLayoutProperty(
        'street-layer',
        'visibility',
        isSat ? 'none' : 'visible',
      );
    }
    if (map.getLayer('satellite-layer')) {
      map.setLayoutProperty(
        'satellite-layer',
        'visibility',
        isSat ? 'visible' : 'none',
      );
    }
  }, [mapStyle]);

  if (!WEBGL_SUPPORTED) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height,
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <Box component="svg" viewBox="0 0 400 180" sx={{ width: '100%', height: '100%' }}>
          <text x="20" y="30" fontSize="12">
            {`${samples.length} GPS samples`}
          </text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height,
        borderRadius: '10px',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: '#e2e8f0',
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          '& .maplibregl-canvas': {
            outline: 'none',
          },
        }}
      />

      {/* Minimal bottom-right map controls */}
      <Stack
        direction="row"
        spacing={0.25}
        sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          zIndex: 2,
          bgcolor: 'rgba(255, 255, 255, 0.92)',
          borderRadius: '8px',
          p: 0.35,
          boxShadow: '0 2px 6px rgba(0,0,0,0.16)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Tooltip title={t('Zoom in')}>
          <IconButton
            size="small"
            onClick={() => mapRef.current?.zoomIn({ duration: 220 })}
            sx={{ p: 0.4, color: '#1e293b' }}
          >
            <AddRounded sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Zoom out')}>
          <IconButton
            size="small"
            onClick={() => mapRef.current?.zoomOut({ duration: 220 })}
            sx={{ p: 0.4, color: '#1e293b' }}
          >
            <RemoveRounded sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
        {viewDimension === '3d' && (
          <Tooltip title={t('Rotate 45°')}>
            <IconButton
              size="small"
              onClick={() => {
                const map = mapRef.current;
                if (!map) return;
                map.easeTo({
                  bearing: map.getBearing() + 45,
                  duration: 380,
                });
              }}
              sx={{ p: 0.4, color: '#1e293b' }}
            >
              <RotateRightRounded sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title={t('Center flight path')}>
          <IconButton
            size="small"
            onClick={() => {
              onSelectIdx(null);
              const map = mapRef.current;
              if (!map) return;
              fitTrajectoryCamera(map, viewDimension, 450);
            }}
            sx={{ p: 0.4, color: '#1e293b' }}
          >
            <MyLocationRounded sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
