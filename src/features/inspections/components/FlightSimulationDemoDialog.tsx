import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import PauseRounded from '@mui/icons-material/PauseRounded';
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded';
import ReplayRounded from '@mui/icons-material/ReplayRounded';
import VideocamRounded from '@mui/icons-material/VideocamRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import {
  buildFlightTrajectoryPoints,
  NVHSV_BASE_GPS,
  NVHSV_DEFECT_HOTSPOTS,
  NVHSV_MISSION_DURATION_SECONDS,
  NVHSV_WAYPOINTS,
  sampleNvhsvMission,
  type SampledMissionState,
} from './nvhsvMissionData';

interface FlightSimulationDemoDialogProps {
  open: boolean;
  onClose: () => void;
  assetName?: string | null | undefined;
}

type CameraViewMode = 'orbit' | 'follow' | 'pov';

/** Convert Gazebo ENU (x=East, y=North, z=Up) to Three.js (x=East, y=Up, z=South). */
function enuToThree(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, z, -y);
}

function createSignboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0B5D7E');
    grad.addColorStop(0.5, '#0F7499');
    grad.addColorStop(1, '#094E6B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#2292B8';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    ctx.font = '700 76px "Segoe UI", "Roboto", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#062635';
    ctx.fillText('NHÀ VĂN HÓA SINH VIÊN', canvas.width / 2 + 3, canvas.height / 2 + 4);
    ctx.fillStyle = '#F0C95A';
    ctx.fillText('NHÀ VĂN HÓA SINH VIÊN', canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRibbonFacadeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#EAECEF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const floors = 5;
    const bandH = canvas.height / floors;
    for (let f = 0; f < floors; f++) {
      const y0 = f * bandH;
      const spH = bandH * 0.36;
      ctx.fillStyle = '#E4E8ED';
      ctx.fillRect(0, y0, canvas.width, spH);
      ctx.fillStyle = '#B8C0CA';
      ctx.fillRect(0, y0 + spH - 3, canvas.width, 3);

      const gy0 = y0 + spH;
      const gh = bandH - spH;
      ctx.fillStyle = '#1D2D3B';
      ctx.fillRect(0, gy0, canvas.width, gh);
      ctx.fillStyle = '#2E475C';
      ctx.fillRect(0, gy0 + 4, canvas.width, gh * 0.42);
      ctx.fillStyle = '#4B5E70';
      for (let mx = 0; mx < canvas.width; mx += 48) {
        ctx.fillRect(mx, gy0, 4, gh);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createHelipadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(88, 72, 18, 112);
    ctx.fillRect(150, 72, 18, 112);
    ctx.fillRect(88, 119, 80, 18);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildNvhsvBuildingScene(scene: THREE.Scene): {
  disposables: Array<{ dispose: () => void }>;
  defectRings: THREE.Mesh[];
} {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  scene.add(root);

  const plazaMat = track(new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 }));
  const roadMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 }));
  const grassMat = track(new THREE.MeshStandardMaterial({ color: 0x3d7d34, roughness: 0.88 }));
  const concreteWhiteMat = track(new THREE.MeshStandardMaterial({ color: 0xe6eaee, roughness: 0.55 }));
  const slabLightMat = track(new THREE.MeshStandardMaterial({ color: 0xd9dee4, roughness: 0.6 }));
  const lobbyGlassMat = track(
    new THREE.MeshStandardMaterial({ color: 0x1c2e3d, roughness: 0.18, metalness: 0.35 }),
  );
  const canopyGlassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x89c4e1,
      transparent: true,
      opacity: 0.55,
      roughness: 0.12,
      metalness: 0.25,
    }),
  );
  const steelMat = track(new THREE.MeshStandardMaterial({ color: 0x8c96a2, roughness: 0.35, metalness: 0.6 }));
  const louverMat = track(new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.42 }));

  const addBox = (
    gx: number,
    gy: number,
    gz: number,
    sx: number,
    sy: number,
    sz: number,
    mat: THREE.Material,
    ry = 0,
    rx = 0,
  ) => {
    const geo = track(new THREE.BoxGeometry(sx, sz, sy));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(enuToThree(gx, gy, gz));
    mesh.rotation.set(rx, ry, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  const addCyl = (
    gx: number,
    gy: number,
    gz: number,
    radius: number,
    height: number,
    mat: THREE.Material,
    segments = 24,
  ) => {
    const geo = track(new THREE.CylinderGeometry(radius, radius, height, segments));
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(enuToThree(gx, gy, gz));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  // Campus ground & courtyard
  const groundGeo = track(new THREE.PlaneGeometry(240, 240));
  const groundMesh = new THREE.Mesh(
    groundGeo,
    track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 })),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.05;
  groundMesh.receiveShadow = true;
  root.add(groundMesh);

  addBox(0, 0, 0.05, 118, 86, 0.1, roadMat);
  addBox(0, 0, 0.2, 86, 56, 0.4, plazaMat);

  // Takeoff Helipad H pad at (-1.5, 34.5)
  const heliTex = track(createHelipadTexture());
  const heliMat = track(new THREE.MeshStandardMaterial({ map: heliTex, roughness: 0.6 }));
  const heliGeo = track(new THREE.BoxGeometry(4.4, 0.12, 4.4));
  const heliMesh = new THREE.Mesh(heliGeo, heliMat);
  heliMesh.position.copy(enuToThree(-1.5, 34.5, 0.14));
  heliMesh.receiveShadow = true;
  root.add(heliMesh);

  // Landscaped green grass berms & front ceremonial granite steps
  addBox(-19.5, 18.8, 1.35, 22, 6.2, 2.7, grassMat);
  addBox(19.5, 18.8, 1.35, 22, 6.2, 2.7, grassMat);
  addBox(-17.5, -18.6, 1.25, 24, 5.8, 2.5, grassMat);
  addBox(17.5, -18.6, 1.25, 24, 5.8, 2.5, grassMat);
  addBox(-34.2, 0, 1.25, 4.6, 28, 2.5, grassMat);
  addBox(34.2, 0, 1.25, 4.6, 28, 2.5, grassMat);
  addBox(0, 19.8, 1.35, 16, 7.6, 2.7, track(new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.85 })));

  // Ground-floor podium + front glass foyer recess & columns
  addBox(0, -1, 4.5, 48, 25, 5, lobbyGlassMat);
  addBox(0, 0, 4.5, 55, 19, 5, lobbyGlassMat);
  const lobbyColumns: ReadonlyArray<readonly [number, number]> = [
    [-6.2, 16.8],
    [6.2, 16.8],
    [-14.5, 14.5],
    [14.5, 14.5],
    [-22.5, 13.5],
    [22.5, 13.5],
  ];
  for (const [cx, cy] of lobbyColumns) {
    addCyl(cx, cy, 5.1, 0.48, 6.2, slabLightMat, 18);
  }
  addBox(0, 16.2, 5.9, 17, 6.2, 0.22, canopyGlassMat);
  addBox(0, 16.2, 5.78, 17.2, 6.4, 0.1, steelMat);
  addBox(0, 19.2, 5.82, 17.2, 0.18, 0.2, steelMat);

  // South basement ramp portal + guardhouse
  addBox(-4, -18.8, 1.3, 8.8, 7.6, 2.6, concreteWhiteMat);
  addBox(-4, -19.2, 1.25, 6.2, 7.2, 1.9, track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })));
  addBox(-24.5, -22, 1.55, 4.2, 3.2, 3.1, concreteWhiteMat);
  addBox(-24.5, -22, 3.22, 4.8, 3.8, 0.24, slabLightMat);

  // Main upper 5-story volume (z = 7 .. 25.6m)
  const ribbonTex = track(createRibbonFacadeTexture());
  const ribbonMat = track(new THREE.MeshStandardMaterial({ map: ribbonTex, roughness: 0.35 }));
  addBox(0, 0, 16.3, 49.5, 30, 18.6, ribbonMat);
  addBox(0, 0, 16.3, 59, 21.6, 18.6, ribbonMat);
  const wingCorners: ReadonlyArray<readonly [number, number]> = [
    [24.5, 10.6],
    [-24.5, 10.6],
    [-24.5, -10.6],
    [24.5, -10.6],
  ];
  for (const [cx, cy] of wingCorners) {
    addCyl(cx, cy, 16.3, 4.6, 18.6, ribbonMat, 28);
    addCyl(cx, cy, 7.35, 5.1, 0.55, concreteWhiteMat, 28);
    addCyl(cx, cy, 25.55, 5.15, 0.46, concreteWhiteMat, 28);
  }
  addBox(0, 0, 7.35, 49.8, 31.2, 0.55, concreteWhiteMat);
  addBox(0, 0, 7.35, 60.4, 22.8, 0.55, concreteWhiteMat);
  addBox(0, 0, 25.55, 49.8, 31.2, 0.46, concreteWhiteMat);
  addBox(0, 0, 25.55, 60.4, 22.8, 0.46, concreteWhiteMat);

  // Iconic 3D wavy diagonal facade louvers (InstancedMesh for crisp 60fps performance)
  const louverTransforms: Array<{ pos: THREE.Vector3; yaw: number; phase: number; zSeg: number; shiftY: number }> = [];
  const pushSegmentedFin = (x: number, y: number, yaw: number, phase: number) => {
    const heights = [10.35, 16.5, 22.55] as const;
    const shifts = [-0.55, 0.0, 0.55] as const;
    const tx = -Math.sin(yaw);
    const ty = Math.cos(yaw);
    for (let s = 0; s < 3; s++) {
      const h = heights[s] ?? 16.5;
      const sh = shifts[s] ?? 0;
      const wave = 0.5 * Math.sin(phase + s * 0.72);
      const sx = x + tx * (sh + wave);
      const sy = y + ty * (sh + wave);
      louverTransforms.push({
        pos: enuToThree(sx, sy, h),
        yaw,
        phase,
        zSeg: s,
        shiftY: 0,
      });
    }
  };

  for (let i = 0; i < 31; i++) {
    const x = -23.5 + i * (47.0 / 30);
    if (Math.abs(x) >= 9.0) {
      pushSegmentedFin(x, 15.58, Math.PI / 2, i * 0.28);
    }
    if (!(x >= 2.1 && x <= 6.9)) {
      pushSegmentedFin(x, -15.58, -Math.PI / 2, i * 0.28 + 1.2);
    }
  }
  for (let i = 0; i < 15; i++) {
    const y = -9.5 + i * (19.0 / 14);
    if (Math.abs(y) >= 2.6) {
      pushSegmentedFin(29.7, y, 0.0, i * 0.35);
    }
    if (Math.abs(y + 2.0) >= 2.6) {
      pushSegmentedFin(-29.7, y, Math.PI, i * 0.35 + 0.9);
    }
  }
  const corners: Array<[number, number, number, number]> = [
    [24.5, 10.6, 0.14, Math.PI / 2 - 0.14],
    [-24.5, 10.6, Math.PI / 2 + 0.14, Math.PI - 0.14],
    [-24.5, -10.6, Math.PI + 0.14, 1.5 * Math.PI - 0.14],
    [24.5, -10.6, 1.5 * Math.PI + 0.14, 2 * Math.PI - 0.14],
  ];
  corners.forEach(([cx, cy, a0, a1], ci) => {
    for (let j = 0; j < 6; j++) {
      const a = a0 + ((a1 - a0) * j) / 5;
      pushSegmentedFin(cx + 5.1 * Math.cos(a), cy + 5.1 * Math.sin(a), a, j * 0.4 + ci);
    }
  });

  const finGeo = track(new THREE.BoxGeometry(0.46, 6.15, 0.14));
  const finInstanced = new THREE.InstancedMesh(finGeo, louverMat, louverTransforms.length);
  finInstanced.castShadow = true;
  finInstanced.receiveShadow = true;
  const dummy = new THREE.Object3D();
  louverTransforms.forEach((ft, idx) => {
    dummy.position.copy(ft.pos);
    // Rotate blade perpendicular to facade normal + subtle diagonal tilt
    dummy.rotation.set(0, ft.yaw, 0.14 * Math.cos(ft.phase));
    dummy.updateMatrix();
    finInstanced.setMatrixAt(idx, dummy.matrix);
  });
  finInstanced.instanceMatrix.needsUpdate = true;
  root.add(finInstanced);

  // Crown penthouse + silver wrap-around ribs + Front/Rear NVHSV signage
  addBox(0, 0, 26.4, 47, 27.6, 1.4, lobbyGlassMat);
  addBox(0, 0, 26.4, 54.6, 20, 1.4, lobbyGlassMat);
  for (const rz of [27.3, 27.9, 28.5, 29.1, 29.7]) {
    addBox(0, 0, rz, 47, 28.4, 0.24, concreteWhiteMat);
    addBox(0, 0, rz, 55.4, 20, 0.24, concreteWhiteMat);
  }
  const crownCorners: ReadonlyArray<readonly [number, number]> = [
    [23.5, 10.0],
    [-23.5, 10.0],
    [-23.5, -10.0],
    [23.5, -10.0],
  ];
  for (const [cx, cy] of crownCorners) {
    addCyl(cx, cy, 27.8, 3.7, 4.4, concreteWhiteMat, 22);
    for (const rz of [27.3, 27.9, 28.5, 29.1, 29.7]) {
      addCyl(cx, cy, rz, 4.2, 0.24, slabLightMat, 24);
    }
  }

  const signTex = track(createSignboardTexture());
  const signMat = track(new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.3 }));
  const signGeo = track(new THREE.PlaneGeometry(27, 2.55));
  const frontSign = new THREE.Mesh(signGeo, signMat);
  frontSign.position.copy(enuToThree(0, 14.3, 28.5));
  frontSign.rotation.y = Math.PI;
  root.add(frontSign);

  const rearSign = new THREE.Mesh(signGeo, signMat);
  rearSign.position.copy(enuToThree(0, -14.3, 28.5));
  rearSign.rotation.y = 0;
  root.add(rearSign);

  // Rooftop slab, glass skylight & HVAC chillers
  addBox(0, 0, 30.0, 47, 28.2, 0.35, track(new THREE.MeshStandardMaterial({ color: 0xb5bcc4, roughness: 0.78 })));
  addBox(0, 0, 30.0, 55.2, 20, 0.35, track(new THREE.MeshStandardMaterial({ color: 0xb5bcc4, roughness: 0.78 })));
  addBox(0, 0, 30.6, 16, 8, 0.8, concreteWhiteMat);
  addBox(0, 0, 31.05, 15.2, 7.2, 0.14, canopyGlassMat);
  const hvacPads: ReadonlyArray<readonly [number, number]> = [
    [15, 4],
    [15, -4],
    [-15, 4],
    [-15, -4],
  ];
  for (const [hx, hy] of hvacPads) {
    addBox(hx, hy, 31.1, 3.4, 2.2, 1.8, steelMat);
  }

  // Stylized campus perimeter trees
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.9 }));
  const leafMat = track(new THREE.MeshStandardMaterial({ color: 0x2f7a31, roughness: 0.85 }));
  const treeCoords: Array<[number, number]> = [
    [-25, 26.5],
    [-16.5, 26.5],
    [-11.2, 26.5],
    [11.2, 26.5],
    [16.5, 26.5],
    [25, 26.5],
    [37.5, -12],
    [38, 6],
    [-37.5, -14],
    [-38, 8],
    [20, -25.5],
    [-18, -25.5],
  ];
  treeCoords.forEach(([tx, ty], i) => {
    const h = 4.2 + (i % 3) * 0.6;
    addCyl(tx, ty, h * 0.42, 0.15, h * 0.84, trunkMat, 8);
    const crown = new THREE.Mesh(track(new THREE.SphereGeometry(1.4 + (i % 2) * 0.25, 12, 10)), leafMat);
    crown.position.copy(enuToThree(tx, ty, h * 0.94));
    crown.castShadow = true;
    root.add(crown);
  });

  // Glowing pulsing Defect Pins on DEF-01..DEF-04
  const defectRings: THREE.Mesh[] = [];
  const pinMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    }),
  );
  const coreMat = track(new THREE.MeshBasicMaterial({ color: 0xfef08a }));
  NVHSV_DEFECT_HOTSPOTS.forEach((d) => {
    const pos = enuToThree(d.position[0], d.position[1], d.position[2]);
    const core = new THREE.Mesh(track(new THREE.SphereGeometry(0.45, 16, 12)), coreMat);
    core.position.copy(pos);
    root.add(core);

    const ring = new THREE.Mesh(track(new THREE.RingGeometry(0.9, 1.35, 32)), pinMat);
    ring.position.copy(pos);
    // Offset slightly outward from facade face
    if (d.position[1] > 10) ring.position.z -= 0.4;
    else if (d.position[1] < -10) ring.position.z += 0.4;
    else if (d.position[0] > 20) {
      ring.position.x += 0.4;
      ring.rotation.y = Math.PI / 2;
    } else if (d.position[0] < -20) {
      ring.position.x -= 0.4;
      ring.rotation.y = Math.PI / 2;
    }
    root.add(ring);
    defectRings.push(ring);
  });

  return { disposables, defectRings };
}

function createDroneMesh(track: <T extends { dispose: () => void }>(item: T) => T): {
  group: THREE.Group;
  rotors: THREE.Mesh[];
  laserLine: THREE.Line;
} {
  const group = new THREE.Group();
  const bodyMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.6 }));
  const accentMat = track(new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.4 }));
  const rotorMat = track(
    new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  const greenLed = track(new THREE.MeshBasicMaterial({ color: 0x22c55e }));
  const redLed = track(new THREE.MeshBasicMaterial({ color: 0xef4444 }));

  // Fuselage + camera gimbal
  const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.38, 1.4)), bodyMat);
  body.castShadow = true;
  group.add(body);

  const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(1.14, 0.1, 0.8)), accentMat);
  stripe.position.y = 0.2;
  group.add(stripe);

  const gimbal = new THREE.Mesh(track(new THREE.SphereGeometry(0.24, 14, 12)), bodyMat);
  gimbal.position.set(0, -0.32, 0.35);
  group.add(gimbal);

  const lens = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.11, 0.14, 12)), accentMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.32, 0.52);
  group.add(lens);

  const rotors: THREE.Mesh[] = [];
  const armOffsets: Array<[number, number, boolean]> = [
    [0.85, 0.85, true],
    [-0.85, 0.85, true],
    [0.85, -0.85, false],
    [-0.85, -0.85, false],
  ];
  armOffsets.forEach(([ax, az, isFront]) => {
    const arm = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.08, 1.3)), bodyMat);
    arm.position.set(ax * 0.5, 0.04, az * 0.5);
    arm.rotation.y = Math.atan2(ax, az);
    group.add(arm);

    const motor = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12)), bodyMat);
    motor.position.set(ax, 0.12, az);
    group.add(motor);

    const disc = new THREE.Mesh(track(new THREE.CircleGeometry(0.62, 20)), rotorMat);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(ax, 0.24, az);
    group.add(disc);
    rotors.push(disc);

    const led = new THREE.Mesh(track(new THREE.SphereGeometry(0.08, 8, 8)), isFront ? greenLed : redLed);
    led.position.set(ax, -0.02, az);
    group.add(led);
  });

  // Gimbal laser sight line toward look target (updated in animation loop)
  const laserGeo = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 5)]));
  const laserMat = track(
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 }),
  );
  const laserLine = new THREE.Line(laserGeo, laserMat);

  return { group, rotors, laserLine };
}

export function FlightSimulationDemoDialog({
  open,
  onClose,
  assetName,
}: FlightSimulationDemoDialogProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [viewMode, setViewMode] = useState<CameraViewMode>('orbit');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const playingRef = useRef(playing);
  playingRef.current = playing;
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const timeRef = useRef(0);

  const telemetry: SampledMissionState = useMemo(
    () => sampleNvhsvMission(elapsedSeconds, NVHSV_MISSION_DURATION_SECONDS),
    [elapsedSeconds],
  );

  const jumpToTime = useCallback((seconds: number) => {
    const clamped = Math.max(0, Math.min(NVHSV_MISSION_DURATION_SECONDS, seconds));
    timeRef.current = clamped;
    setElapsedSeconds(clamped);
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  }, []);

  // Reset timeline smoothly whenever dialog opens
  useEffect(() => {
    if (!open) return;
    timeRef.current = 0;
    setElapsedSeconds(0);
    setPlaying(true);
    setViewMode('orbit');
  }, [open]);

  // Synchronize HTML5 <video> Gazebo feed with Three.js timeline
  useEffect(() => {
    const video = videoRef.current;
    if (!open || !video) return;
    video.playbackRate = speed;
    if (playing) {
      if (Math.abs(video.currentTime - timeRef.current) > 0.35) {
        video.currentTime = timeRef.current;
      }
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [open, playing, speed]);

  useEffect(() => {
    if (!open) return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    const disposables: Array<{ dispose: () => void }> = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1220);
    scene.fog = new THREE.FogExp2(0x0b1220, 0.0042);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.25, 450);
    camera.position.copy(enuToThree(38, 48, 34));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.485;
    controls.minDistance = 8;
    controls.maxDistance = 140;
    controls.target.copy(enuToThree(0, 0, 14));
    controls.update();

    // Lighting
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x334155, 1.15);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfffbeb, 1.85);
    sun.position.set(55, 78, -42);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 220;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x93c5fd, 0.55);
    fill.position.set(-55, 32, 48);
    scene.add(fill);

    // Subtle spatial engineering grid
    const grid = new THREE.GridHelper(180, 36, 0x334155, 0x1e293b);
    grid.position.y = -0.02;
    scene.add(grid);

    const { disposables: bldDisposables, defectRings } = buildNvhsvBuildingScene(scene);
    disposables.push(...bldDisposables);

    // Trajectory ribbon & waypoint nodes
    const pathPts = buildFlightTrajectoryPoints(180).map(([x, y, z]) => enuToThree(x, y, z));
    const pathGeo = track(new THREE.BufferGeometry().setFromPoints(pathPts));
    const pathMat = track(new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.72 }));
    scene.add(new THREE.Line(pathGeo, pathMat));

    const wpGeo = track(new THREE.SphereGeometry(0.35, 10, 10));
    const wpMat = track(new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
    NVHSV_WAYPOINTS.forEach((wp) => {
      const m = new THREE.Mesh(wpGeo, wpMat);
      m.position.copy(enuToThree(wp.cam[0], wp.cam[1], wp.cam[2]));
      scene.add(m);
    });

    // Autonomous quadcopter + gimbal laser sight
    const { group: droneGroup, rotors, laserLine } = createDroneMesh(track);
    scene.add(droneGroup);
    scene.add(laserLine);

    const timer = new THREE.Timer();
    let rafId = 0;
    let lastUiSync = 0;

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(240, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    const animate = () => {
      timer.update();
      const dt = Math.min(0.05, timer.getDelta());

      if (playingRef.current) {
        const vid = videoRef.current;
        if (vid && !vid.paused && !vid.ended && Number.isFinite(vid.duration) && vid.duration > 1) {
          timeRef.current = vid.currentTime % NVHSV_MISSION_DURATION_SECONDS;
        } else {
          timeRef.current = (timeRef.current + dt * speedRef.current) % NVHSV_MISSION_DURATION_SECONDS;
        }
      }

      const now = performance.now();
      if (now - lastUiSync >= 90) {
        lastUiSync = now;
        setElapsedSeconds(timeRef.current);
      }

      const sampled = sampleNvhsvMission(timeRef.current, NVHSV_MISSION_DURATION_SECONDS);
      const dronePos = enuToThree(sampled.cam[0], sampled.cam[1], sampled.cam[2]);
      const targetPos = enuToThree(sampled.target[0], sampled.target[1], sampled.target[2]);

      droneGroup.position.copy(dronePos);
      droneGroup.lookAt(targetPos);

      // Spin propellers continuously while mission is active
      rotors.forEach((r, idx) => {
        r.rotation.z += dt * (idx % 2 === 0 ? 34 : -34);
      });

      // Update laser sight line
      const laserAttr = laserLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      laserAttr.setXYZ(0, dronePos.x, dronePos.y - 0.3, dronePos.z);
      laserAttr.setXYZ(1, targetPos.x, targetPos.y, targetPos.z);
      laserAttr.needsUpdate = true;

      // Pulse defect rings
      const pulse = 1 + 0.18 * Math.sin(now * 0.005);
      defectRings.forEach((ring) => ring.scale.set(pulse, pulse, 1));

      if (viewModeRef.current === 'follow') {
        controls.enabled = false;
        const dir = new THREE.Vector3().subVectors(targetPos, dronePos).normalize();
        const chasePos = dronePos.clone().addScaledVector(dir, -11).add(new THREE.Vector3(0, 4.5, 0));
        camera.position.lerp(chasePos, 0.12);
        camera.lookAt(targetPos);
      } else if (viewModeRef.current === 'pov') {
        controls.enabled = false;
        camera.position.copy(dronePos).add(new THREE.Vector3(0, -0.35, 0));
        camera.lookAt(targetPos);
      } else {
        controls.enabled = true;
        controls.update();
      }

      renderer?.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObs.disconnect();
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer?.dispose();
    };
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            bgcolor: '#0B1220',
            color: '#F8FAFC',
            borderRadius: '14px',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Top command header */}
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          px: 2.5,
          py: 1.5,
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
          bgcolor: '#0F172A',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              bgcolor: 'rgba(14, 165, 233, 0.16)',
              color: '#38BDF8',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <FlightTakeoffRounded fontSize="small" />
          </Box>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#F8FAFC' }}>
                {assetName || 'BLD-NVHSV-01 · Nhà Văn Hóa Sinh Viên TP.HCM (ĐHQG TP.HCM)'}
              </Typography>
              <Chip
                size="small"
                label="3D WAYPOINT SIMULATION"
                sx={{
                  height: 20,
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(34, 197, 94, 0.18)',
                  color: '#4ADE80',
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
              {NVHSV_BASE_GPS.address}
            </Typography>
          </Box>
        </Stack>

        <IconButton onClick={onClose} size="small" sx={{ color: '#94A3B8', '&:hover': { color: '#F8FAFC' } }}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </Stack>

      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' },
            minHeight: { xs: 540, md: 610 },
          }}
        >
          {/* Left: Interactive 3D Three.js NVHSV Scene */}
          <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 460 }}>
            <Box ref={mountRef} sx={{ flex: 1, width: '100%', minHeight: 420 }} />

            {/* Floating camera mode switcher */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: 'absolute',
                top: 12,
                left: 12,
                alignItems: 'center',
                bgcolor: 'rgba(15, 23, 42, 0.84)',
                backdropFilter: 'blur(6px)',
                p: 0.5,
                borderRadius: '10px',
                border: '1px solid rgba(148, 163, 184, 0.2)',
              }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={viewMode}
                onChange={(_e, next: CameraViewMode | null) => {
                  if (next) setViewMode(next);
                }}
              >
                <ToggleButton value="orbit" sx={{ color: '#CBD5E1', textTransform: 'none', px: 1.25, py: 0.35, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: '#0284C7', color: '#FFF' } }}>
                  Free Orbit
                </ToggleButton>
                <ToggleButton value="follow" sx={{ color: '#CBD5E1', textTransform: 'none', px: 1.25, py: 0.35, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: '#0284C7', color: '#FFF' } }}>
                  Follow Drone
                </ToggleButton>
                <ToggleButton value="pov" sx={{ color: '#CBD5E1', textTransform: 'none', px: 1.25, py: 0.35, fontSize: '0.75rem', '&.Mui-selected': { bgcolor: '#0284C7', color: '#FFF' } }}>
                  Drone POV
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {/* Active defect alert pill */}
            {telemetry.nearbyDefect && (
              <Chip
                icon={<WarningAmberRounded sx={{ color: '#FCA5A5 !important' }} />}
                label={`${telemetry.nearbyDefect.code}: ${telemetry.nearbyDefect.label} (${telemetry.nearbyDefect.aiClass})`}
                size="small"
                sx={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  bgcolor: 'rgba(153, 27, 27, 0.9)',
                  color: '#FEE2E2',
                  border: '1px solid rgba(248, 113, 113, 0.5)',
                  fontWeight: 600,
                }}
              />
            )}

            {/* Playback & timeline bar */}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                px: 2,
                py: 1.25,
                alignItems: 'center',
                bgcolor: '#0F172A',
                borderTop: '1px solid rgba(148, 163, 184, 0.16)',
              }}
            >
              <IconButton
                size="small"
                onClick={() => setPlaying((p) => !p)}
                sx={{ bgcolor: '#0284C7', color: '#FFF', '&:hover': { bgcolor: '#0369A1' } }}
              >
                {playing ? <PauseRounded fontSize="small" /> : <PlayArrowRounded fontSize="small" />}
              </IconButton>
              <Tooltip title="Restart circuit">
                <IconButton size="small" onClick={() => jumpToTime(0)} sx={{ color: '#CBD5E1' }}>
                  <ReplayRounded fontSize="small" />
                </IconButton>
              </Tooltip>

              <Slider
                size="small"
                min={0}
                max={NVHSV_MISSION_DURATION_SECONDS}
                step={0.1}
                value={elapsedSeconds}
                onChange={(_e, val) => jumpToTime(Array.isArray(val) ? val[0] : val)}
                sx={{
                  flex: 1,
                  color: '#38BDF8',
                  '& .MuiSlider-thumb': { width: 12, height: 12 },
                }}
              />

              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#CBD5E1', minWidth: 82, textAlign: 'right' }}>
                {elapsedSeconds.toFixed(1)}s / {NVHSV_MISSION_DURATION_SECONDS.toFixed(0)}s
              </Typography>

              <Button
                size="small"
                variant="outlined"
                onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))}
                sx={{
                  minWidth: 48,
                  color: '#7DD3FC',
                  borderColor: 'rgba(125, 211, 252, 0.35)',
                  textTransform: 'none',
                  fontFamily: 'monospace',
                }}
              >
                {speed}x
              </Button>
            </Stack>
          </Box>

          {/* Right: Synchronized Gazebo Camera Feed + Telemetry HUD */}
          <Stack
            spacing={2}
            sx={{
              p: 2,
              bgcolor: '#111827',
              borderLeft: { lg: '1px solid rgba(148, 163, 184, 0.16)' },
              justifyContent: 'space-between',
            }}
          >
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <VideocamRounded fontSize="small" sx={{ color: '#38BDF8' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.82rem', color: '#E2E8F0' }}>
                    Gazebo Gimbal Feed (Synced)
                  </Typography>
                </Stack>
                <Chip
                  size="small"
                  label={telemetry.waypointId}
                  sx={{ height: 20, fontSize: '0.68rem', fontFamily: 'monospace', bgcolor: '#1E293B', color: '#7DD3FC' }}
                />
              </Stack>

              <Box
                sx={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid rgba(148, 163, 184, 0.22)',
                  bgcolor: '#000',
                  aspectRatio: '4 / 3',
                }}
              >
                <video
                  ref={videoRef}
                  src="/demo/nvhsv-waypoint-mission.mp4"
                  muted
                  loop
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    left: 8,
                    bottom: 8,
                    px: 1,
                    py: 0.35,
                    borderRadius: '6px',
                    bgcolor: 'rgba(2, 6, 23, 0.78)',
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#E2E8F0' }}>
                    {telemetry.waypointNote}
                  </Typography>
                </Box>
              </Box>

              {/* Simulated MAVLink Telemetry Readout */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '10px',
                  bgcolor: '#0B1220',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                }}
              >
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block', mb: 1 }}>
                  SIMULATED MAVLINK TELEMETRY (NO MISSION PLANNER REQUIRED)
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      Altitude (AGL)
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                      {telemetry.altitudeMeters.toFixed(1)} m
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      Ground Speed
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                      {telemetry.speedMps.toFixed(1)} m/s
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      Heading
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#F8FAFC' }}>
                      {Math.round(telemetry.headingDeg)}°
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                      Distance / Battery
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4ADE80' }}>
                      {telemetry.distanceFlownMeters.toFixed(0)} m · {telemetry.batteryPct}%
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#7DD3FC', display: 'block', mt: 1 }}>
                  GPS: {telemetry.latitude.toFixed(6)}, {telemetry.longitude.toFixed(6)}
                </Typography>
              </Box>
            </Stack>

            {/* Quick Defect Jump Buttons */}
            <Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700, display: 'block', mb: 0.75 }}>
                JUMP TO DEFECT WAYPOINTS (4 DETECTABLE DEFECTS)
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
                {NVHSV_DEFECT_HOTSPOTS.map((d) => {
                  const active = telemetry.nearbyDefect?.code === d.code;
                  return (
                    <Button
                      key={d.code}
                      size="small"
                      variant={active ? 'contained' : 'outlined'}
                      onClick={() => {
                        jumpToTime(d.timeSeconds);
                        setPlaying(true);
                      }}
                      sx={{
                        justifyContent: 'flex-start',
                        textTransform: 'none',
                        fontSize: '0.73rem',
                        borderRadius: '8px',
                        borderColor: active ? '#F43F5E' : 'rgba(244, 63, 94, 0.35)',
                        bgcolor: active ? '#E11D48' : 'rgba(244, 63, 94, 0.08)',
                        color: active ? '#FFF' : '#FECDD3',
                        '&:hover': { bgcolor: 'rgba(244, 63, 94, 0.22)' },
                      }}
                    >
                      {d.code} ({d.timeSeconds.toFixed(1)}s)
                    </Button>
                  );
                })}
              </Box>
            </Box>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
