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
  elapsedSec: number;
  altitude: number;
  speed: number;
  battery: number;
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

// Create a small regular polygon around [lon, lat] with radius in meters (for 3D extrusion pillars/nodes)
function circlePolygon(
  lon: number,
  lat: number,
  radiusMeters: number,
  sides = 10,
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

// Create a 3D ribbon polygon segment between two points with given half-width in meters
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
  if (len < 0.05) return null;
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
  const zScale = 5.5; // Visual altitude multiplier so 5m-30m heights are unmistakable in 3D

  // 1. 2D Ground LineString
  const lineFeature = {
    type: 'FeatureCollection' as const,
    features:
      samples.length > 1
        ? [
            {
              type: 'Feature' as const,
              properties: {},
              geometry: {
                type: 'LineString' as const,
                coordinates: samples.map((s) => [s.longitude, s.latitude]),
              },
            },
          ]
        : [],
  };

  // 2. 2D Ground Points
  const pointsFeature = {
    type: 'FeatureCollection' as const,
    features: samples.map((s, idx) => ({
      type: 'Feature' as const,
      properties: {
        idx: s.idx,
        color:
          idx === 0
            ? '#1baf7a'
            : idx === samples.length - 1
              ? '#eb6834'
              : activeIdx === s.idx
                ? '#eda100'
                : '#2a78d6',
        radius:
          activeIdx === s.idx
            ? 8
            : idx === 0 || idx === samples.length - 1
              ? 6.5
              : 4.5,
      },
      geometry: {
        type: 'Point' as const,
        coordinates: [s.longitude, s.latitude],
      },
    })),
  };

  // 3. 3D Extruded Flight Ribbon, Vertical Pillars & 3D Floating Nodes
  const extrusions: Array<{
    type: 'Feature';
    properties: Record<string, string | number>;
    geometry: { type: 'Polygon'; coordinates: Array<Array<[number, number]>> };
  }> = [];

  // 3a. Sub-divide each segment into smooth 3D stepped ribbon pieces
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]!;
    const b = samples[i + 1]!;
    const steps = 6;
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps;
      const t1 = (k + 1) / steps;
      const lon0 = a.longitude + (b.longitude - a.longitude) * t0;
      const lat0 = a.latitude + (b.latitude - a.latitude) * t0;
      const lon1 = a.longitude + (b.longitude - a.longitude) * t1;
      const lat1 = a.latitude + (b.latitude - a.latitude) * t1;
      const altMid =
        (a.altitude + (b.altitude - a.altitude) * ((t0 + t1) / 2)) * zScale;

      const poly = segmentPolygon(lon0, lat0, lon1, lat1, 1.35);
      if (poly) {
        // Semi-transparent vertical curtain under the flight path
        extrusions.push({
          type: 'Feature',
          properties: {
            kind: 'curtain',
            base: 0,
            height: Math.max(0.5, altMid - 0.8),
            color: '#93c5fd',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [poly],
          },
        });
        // Solid 3D elevated flight path beam in the air
        extrusions.push({
          type: 'Feature',
          properties: {
            kind: 'beam',
            base: Math.max(0.2, altMid - 1.1),
            height: Math.max(1.8, altMid + 1.1),
            color: '#2a78d6',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [poly],
          },
        });
      }
    }
  }

  // 3b. Vertical 3D Pillars + 3D Floating Waypoint Caps at each sample
  samples.forEach((s, idx) => {
    const topZ = Math.max(2, s.altitude * zScale);
    const isStart = idx === 0;
    const isEnd = idx === samples.length - 1;
    const isSelected = activeIdx === s.idx;

    // Thin vertical pillar from ground (0m) to waypoint altitude
    extrusions.push({
      type: 'Feature',
      properties: {
        kind: 'pillar',
        idx: s.idx,
        base: 0,
        height: Math.max(0.5, topZ - 1.4),
        color: isSelected ? '#eda100' : '#64748b',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [circlePolygon(s.longitude, s.latitude, 0.75, 8)],
      },
    });

    // 3D Floating Waypoint Cap at exact altitude
    extrusions.push({
      type: 'Feature',
      properties: {
        kind: 'cap',
        idx: s.idx,
        base: Math.max(0.4, topZ - 1.6),
        height: topZ + 1.6,
        color: isStart
          ? '#1baf7a'
          : isEnd
            ? '#eb6834'
            : isSelected
              ? '#eda100'
              : '#1d4ed8',
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          circlePolygon(
            s.longitude,
            s.latitude,
            isSelected ? 3.2 : isStart || isEnd ? 2.8 : 2.1,
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

  return { lineFeature, pointsFeature, extrusionFeatureCollection };
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
      ...samples.map((p) => p.latitude),
      ...geoEvidence.map((e) => Number(e.latitude)),
    ];
    const allLons = [
      ...samples.map((p) => p.longitude),
      ...geoEvidence.map((e) => Number(e.longitude)),
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
              'fill-extrusion-opacity': 0.65,
            },
          },
          // Ground Track White Casing
          {
            id: 'ground-track-casing',
            type: 'line',
            source: 'trajectory-line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': '#ffffff',
              'line-width': is3D ? 3 : 6,
              'line-opacity': is3D ? 0.55 : 0.95,
            },
          },
          // Ground Track Core Line
          {
            id: 'ground-track-core',
            type: 'line',
            source: 'trajectory-line',
            layout: { 'line-cap': 'round', 'line-join': 'round' },
            paint: {
              'line-color': is3D ? '#475569' : '#2a78d6',
              'line-width': is3D ? 1.8 : 3.5,
              'line-opacity': is3D ? 0.65 : 1,
            },
          },
          // 3D Curtain (translucent altitude wall under flight path)
          {
            id: 'flight-3d-curtain',
            type: 'fill-extrusion',
            source: 'trajectory-3d',
            filter: ['==', ['get', 'kind'], 'curtain'],
            layout: { visibility: is3D ? 'visible' : 'none' },
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.22,
            },
          },
          // 3D Solid Flight Beam & Vertical Pillars & Waypoint Caps
          {
            id: 'flight-3d-solid',
            type: 'fill-extrusion',
            source: 'trajectory-3d',
            filter: ['!=', ['get', 'kind'], 'curtain'],
            layout: { visibility: is3D ? 'visible' : 'none' },
            paint: {
              'fill-extrusion-color': ['get', 'color'],
              'fill-extrusion-base': ['get', 'base'],
              'fill-extrusion-height': ['get', 'height'],
              'fill-extrusion-opacity': 0.92,
            },
          },
          // 2D Ground Waypoint Circles
          {
            id: 'ground-waypoints',
            type: 'circle',
            source: 'trajectory-points',
            paint: {
              'circle-radius': ['get', 'radius'],
              'circle-color': ['get', 'color'],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
              'circle-opacity': is3D ? 0.5 : 1,
            },
          },
        ],
      },
      center: [boundsInfo.centerLon, boundsInfo.centerLat],
      zoom: 16,
      pitch: is3D ? 60 : 0,
      bearing: is3D ? -25 : 0,
      maxPitch: 80,
      attributionControl: false,
    });

    map.on('load', () => {
      styleReadyRef.current = true;
      if (
        Math.abs(boundsInfo.maxLon - boundsInfo.minLon) > 0.00005 ||
        Math.abs(boundsInfo.maxLat - boundsInfo.minLat) > 0.00005
      ) {
        map.fitBounds(
          [
            [boundsInfo.minLon, boundsInfo.minLat],
            [boundsInfo.maxLon, boundsInfo.maxLat],
          ],
          {
            padding: isDialog ? 90 : 48,
            maxZoom: 17.2,
            pitch: viewDimension === '3d' ? 60 : 0,
            bearing: viewDimension === '3d' ? -25 : 0,
            duration: 0,
          },
        );
      }
    });

    // Interactive waypoint hover & click on both 2D points and 3D caps
    const interactiveLayers = ['ground-waypoints', 'flight-3d-solid'];
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
    if (map.getLayer('ground-track-casing')) {
      map.setPaintProperty('ground-track-casing', 'line-width', is3D ? 3 : 6);
      map.setPaintProperty(
        'ground-track-casing',
        'line-opacity',
        is3D ? 0.55 : 0.95,
      );
    }
    if (map.getLayer('ground-track-core')) {
      map.setPaintProperty(
        'ground-track-core',
        'line-color',
        is3D ? '#475569' : '#2a78d6',
      );
      map.setPaintProperty('ground-track-core', 'line-width', is3D ? 1.8 : 3.5);
    }
    if (map.getLayer('ground-waypoints')) {
      map.setPaintProperty('ground-waypoints', 'circle-opacity', is3D ? 0.5 : 1);
    }

    map.easeTo({
      pitch: is3D ? 60 : 0,
      bearing: is3D ? -25 : 0,
      duration: 500,
    });
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
            {`TAKEOFF → LAND (${samples.length} waypoints)`}
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
              map.fitBounds(
                [
                  [boundsInfo.minLon, boundsInfo.minLat],
                  [boundsInfo.maxLon, boundsInfo.maxLat],
                ],
                {
                  padding: isDialog ? 90 : 48,
                  maxZoom: 17.2,
                  pitch: viewDimension === '3d' ? 60 : 0,
                  bearing: viewDimension === '3d' ? -25 : 0,
                  duration: 450,
                },
              );
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
