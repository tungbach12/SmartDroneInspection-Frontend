import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

interface DroneScene3DProps {
  backLabel?: string;
  backTo?: string;
  heroTagline?: { line1: string; line2: string };
}

function createModernBlueGlassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Sleek modern blue curtain-wall glass gradient
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#1D4ED8');
    bg.addColorStop(0.45, '#0F3566');
    bg.addColorStop(1, '#091E3E');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = 8;
    const rows = 22;
    const padX = 5;
    const padY = 5;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW + padX;
        const y = r * cellH + padY;
        const w = cellW - padX * 2;
        const h = cellH - padY * 2;

        const seed = Math.sin((r + 1) * 14.123 + (c + 1) * 91.531) * 43758.5453;
        const rand = seed - Math.floor(seed);

        if (rand > 0.78) {
          ctx.fillStyle = 'rgba(186, 230, 253, 0.42)'; // bright sky-blue reflection
        } else if (rand > 0.58) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)'; // cyan glass sheen
        } else {
          ctx.fillStyle = 'rgba(15, 38, 82, 0.65)';
        }
        ctx.fillRect(x, y, w, h);

        // Crisp vertical glass highlight
        ctx.fillStyle = 'rgba(224, 242, 254, 0.1)';
        ctx.fillRect(x, y, w * 0.35, h);
      }

      // Slim aluminum floor mullion
      ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.fillRect(0, r * cellH, canvas.width, 2.5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createHelipadTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, 472, 472);

    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(256, 256, 145, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#E0F2FE';
    ctx.fillRect(194, 174, 24, 164);
    ctx.fillRect(294, 174, 24, 164);
    ctx.fillRect(194, 244, 124, 24);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function DroneScene3D({
  backLabel = 'Back to website',
  backTo = '/',
  heroTagline = {
    line1: 'Smart Drone Infrastructure Inspection',
    line2: 'AI-assisted defect detection, inspection reports, and maintenance tracking in one unified platform.',
  },
}: DroneScene3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 900;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Modern Deep-Blue Sky & Smooth Horizon Fog
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#091529');
    scene.fog = new THREE.FogExp2('#091529', 0.045);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(6.4, 4.1, 8.0);
    camera.lookAt(0, 0.55, 0);

    // Cool Daylight / Modern Blue Architectural Lighting
    const hemiLight = new THREE.HemisphereLight('#BAE6FD', '#0F172A', 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#F0F9FF', 2.8);
    keyLight.position.set(7, 11, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const blueRimLight = new THREE.DirectionalLight('#38BDF8', 1.4);
    blueRimLight.position.set(-7, 5, -6);
    scene.add(blueRimLight);

    const scanSpotLight = new THREE.SpotLight('#38BDF8', 22, 12, Math.PI / 4, 0.55, 1.1);
    scene.add(scanSpotLight);
    scene.add(scanSpotLight.target);

    // Seamless Infinite-Look Ground & Urban Road Network
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#081222',
      roughness: 0.88,
      metalness: 0.12,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.75;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(70, 70, '#38BDF8', '#152A4A');
    grid.position.y = -1.74;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    gridMaterials.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.18;
    });
    scene.add(grid);

    const glassTex = createModernBlueGlassTexture();
    const helipadTex = createHelipadTexture();

    const cityGroup = new THREE.Group();
    cityGroup.position.y = -1.75;
    scene.add(cityGroup);

    const glassFacadeMat = new THREE.MeshPhysicalMaterial({
      map: glassTex,
      roughness: 0.1,
      metalness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      reflectivity: 0.95,
    });

    const slateTrimMat = new THREE.MeshStandardMaterial({
      color: '#64748B',
      roughness: 0.3,
      metalness: 0.85,
    });

    const darkPodiumMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.55,
      metalness: 0.3,
    });

    const addSkyscraper = (
      x: number,
      z: number,
      w: number,
      h: number,
      d: number,
      hasHelipad = false,
    ) => {
      const tower = new THREE.Group();
      tower.position.set(x, 0, z);

      const podium = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.14, 0.22, d + 0.14),
        darkPodiumMat,
      );
      podium.position.y = 0.11;
      podium.receiveShadow = true;
      tower.add(podium);

      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), glassFacadeMat);
      body.position.y = h / 2 + 0.22;
      body.castShadow = true;
      body.receiveShadow = true;
      tower.add(body);

      const crown = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06), slateTrimMat);
      crown.position.y = h + 0.26;
      tower.add(crown);

      if (hasHelipad) {
        const padMat = new THREE.MeshStandardMaterial({
          map: helipadTex,
          roughness: 0.45,
          metalness: 0.2,
        });
        const pad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 0.03, d * 0.8), padMat);
        pad.position.y = h + 0.31;
        tower.add(pad);
      }

      cityGroup.add(tower);
    };

    // Compact Cluster of Modern Blue Glass Towers inside radius <= 2.5
    addSkyscraper(0, 0, 1.45, 2.75, 1.45, true);
    addSkyscraper(-1.85, -0.7, 1.1, 2.1, 1.1, false);
    addSkyscraper(1.9, -0.75, 1.15, 2.35, 1.15, false);
    addSkyscraper(-1.55, 1.45, 0.95, 1.45, 0.95, false);
    addSkyscraper(1.65, 1.35, 1.05, 1.75, 1.05, false);
    addSkyscraper(0.05, -1.85, 1.4, 3.15, 1.15, false);

    // Distant Outer City Skyline Silhouette (fills empty background without obstructing orbit)
    const distantBlockMat = new THREE.MeshStandardMaterial({
      color: '#0F2242',
      roughness: 0.75,
      metalness: 0.25,
    });
    const distantEdgeMat = new THREE.LineBasicMaterial({
      color: '#1E40AF',
      transparent: true,
      opacity: 0.3,
    });
    const outerBlocks: Array<[number, number, number, number, number]> = [
      [-6.5, -5.8, 1.8, 3.4, 1.8],
      [-3.8, -7.2, 2.2, 4.2, 1.6],
      [0.4, -7.8, 2.4, 3.8, 1.8],
      [4.5, -6.5, 1.9, 4.5, 1.9],
      [7.4, -4.2, 2.1, 3.1, 1.7],
      [-7.8, -1.5, 1.7, 2.6, 2.0],
      [-7.2, 2.8, 2.0, 2.9, 1.8],
      [-5.5, 6.2, 1.6, 2.2, 1.6],
      [6.8, 1.5, 1.9, 2.8, 1.9],
      [6.2, 5.4, 1.7, 2.3, 1.7],
      [-1.8, 7.2, 2.0, 1.9, 1.5],
      [2.6, 6.8, 1.8, 2.1, 1.6],
      [-10.5, -8.5, 2.6, 5.2, 2.2],
      [9.8, -8.0, 2.5, 4.8, 2.2],
      [-11.0, 0.5, 2.2, 3.6, 2.2],
      [10.8, -1.2, 2.4, 3.9, 2.2],
    ];
    outerBlocks.forEach(([bx, bz, bw, bh, bd]) => {
      const geo = new THREE.BoxGeometry(bw, bh, bd);
      const mesh = new THREE.Mesh(geo, distantBlockMat);
      mesh.position.set(bx, bh / 2, bz);
      cityGroup.add(mesh);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), distantEdgeMat);
      edges.position.copy(mesh.position);
      cityGroup.add(edges);
    });

    // =========================================================================
    // COMPACT AERODYNAMIC INSPECTION DRONE (Scaled down to realistic ~0.45x)
    // =========================================================================
    const droneGroup = new THREE.Group();
    droneGroup.scale.setScalar(0.45);
    scene.add(droneGroup);

    const pearlBodyMat = new THREE.MeshPhysicalMaterial({
      color: '#F1F5F9',
      roughness: 0.18,
      metalness: 0.2,
      clearcoat: 1.0,
    });
    const carbonMat = new THREE.MeshStandardMaterial({
      color: '#1E293B',
      roughness: 0.38,
      metalness: 0.65,
    });
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: '#94A3B8',
      roughness: 0.22,
      metalness: 0.9,
    });
    const glassLensMat = new THREE.MeshPhysicalMaterial({
      color: '#0284C7',
      roughness: 0.05,
      metalness: 0.1,
      clearcoat: 1.0,
      reflectivity: 1.0,
    });
    const cyanLedMat = new THREE.MeshBasicMaterial({ color: '#38BDF8' });
    const greenLedMat = new THREE.MeshBasicMaterial({ color: '#10B981' });

    // Compact Fuselage
    const fuselageGeo = new THREE.SphereGeometry(0.55, 28, 20);
    fuselageGeo.scale(0.82, 0.34, 1.25);
    const fuselage = new THREE.Mesh(fuselageGeo, pearlBodyMat);
    fuselage.castShadow = true;
    droneGroup.add(fuselage);

    const batteryGeo = new THREE.SphereGeometry(0.42, 24, 16);
    batteryGeo.scale(0.72, 0.28, 1.05);
    const battery = new THREE.Mesh(batteryGeo, pearlBodyMat);
    battery.position.set(0, 0.12, -0.05);
    droneGroup.add(battery);

    // Landing Skids
    [-0.4, 0.4].forEach((side) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.7, -0.08, 0.24),
        new THREE.Vector3(side * 1.0, -0.26, 0.26),
        new THREE.Vector3(side * 1.02, -0.44, 0.46),
        new THREE.Vector3(side * 1.02, -0.44, -0.46),
        new THREE.Vector3(side * 1.0, -0.26, -0.26),
        new THREE.Vector3(side * 0.7, -0.08, -0.24),
      ]);
      const skid = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.024, 8, false), carbonMat);
      droneGroup.add(skid);
    });

    // Gimbal Camera + Sideways/Downward Scan Cone aimed at Buildings
    const gimbalGroup = new THREE.Group();
    gimbalGroup.position.set(0, -0.2, 0.22);
    droneGroup.add(gimbalGroup);

    const camHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 20), carbonMat);
    camHousing.rotation.x = Math.PI / 2;
    gimbalGroup.add(camHousing);

    const mainLens = new THREE.Mesh(new THREE.SphereGeometry(0.08, 18, 18), glassLensMat);
    mainLens.scale.set(1, 1, 0.45);
    mainLens.position.z = 0.11;
    gimbalGroup.add(mainLens);

    // World-space Volumetric Scan Cone: tip at (0,0,0), expanding along -Y (length 1)
    const coneGeo = new THREE.ConeGeometry(0.45, 1.0, 32, 1, true);
    coneGeo.translate(0, -0.5, 0);
    const coneMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const scanCone = new THREE.Mesh(coneGeo, coneMat);
    scene.add(scanCone);

    // 4 Arms & Spinning Propellers
    const rotors: THREE.Group[] = [];
    const arms: Array<{ x: number; z: number; front: boolean }> = [
      { x: -0.96, z: 0.84, front: true },
      { x: 0.96, z: 0.84, front: true },
      { x: -0.96, z: -0.84, front: false },
      { x: 0.96, z: -0.84, front: false },
    ];

    const bladeGeo = new THREE.BoxGeometry(1.08, 0.016, 0.075);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: '#E2E8F0',
      roughness: 0.28,
      metalness: 0.45,
    });
    const blurDiscGeo = new THREE.RingGeometry(0.12, 0.56, 36);
    blurDiscGeo.rotateX(-Math.PI / 2);
    const blurDiscMat = new THREE.MeshBasicMaterial({
      color: '#7DD3FC',
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
    });

    arms.forEach((cfg) => {
      const armCurve = new THREE.LineCurve3(
        new THREE.Vector3(cfg.x * 0.24, 0.01, cfg.z * 0.24),
        new THREE.Vector3(cfg.x, 0.08, cfg.z),
      );
      const armMesh = new THREE.Mesh(
        new THREE.TubeGeometry(armCurve, 4, 0.036, 10, false),
        carbonMat,
      );
      droneGroup.add(armMesh);

      const motor = new THREE.Mesh(
        new THREE.CylinderGeometry(0.095, 0.085, 0.14, 16),
        titaniumMat,
      );
      motor.position.set(cfg.x, 0.09, cfg.z);
      droneGroup.add(motor);

      const navLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 10, 10),
        cfg.front ? greenLedMat : cyanLedMat,
      );
      navLed.position.set(cfg.x, 0.01, cfg.z);
      droneGroup.add(navLed);

      const rotorGroup = new THREE.Group();
      rotorGroup.position.set(cfg.x, 0.18, cfg.z);

      const b1 = new THREE.Mesh(bladeGeo, bladeMat);
      const b2 = new THREE.Mesh(bladeGeo, bladeMat);
      b2.rotation.y = Math.PI / 2;
      const blur = new THREE.Mesh(blurDiscGeo, blurDiscMat);

      rotorGroup.add(b1, b2, blur);
      droneGroup.add(rotorGroup);
      rotors.push(rotorGroup);
    });

    // Floating Blue Telemetry Particles
    const particleCount = 110;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = Math.random() * 5.8 - 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: '#7DD3FC',
      size: 0.05,
      transparent: true,
      opacity: 0.5,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    container.addEventListener('pointermove', handlePointerMove);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0 && renderer) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      rotors.forEach((rotor, idx) => {
        rotor.rotation.y += idx % 2 === 0 ? 0.65 : -0.65;
      });

      // Wide safe-clearance orbit completely outside all skyscrapers (passes behind tall rear tower)
      const orbitAngle = t * 0.42;
      const radiusX = 3.65;
      const radiusZ = 3.65;
      const nextAngle = orbitAngle + 0.02;

      const x = Math.cos(orbitAngle) * radiusX;
      const z = Math.sin(orbitAngle) * radiusZ;
      const y = 1.25 + Math.sin(t * 0.85) * 0.25;

      const nx = Math.cos(nextAngle) * radiusX;
      const nz = Math.sin(nextAngle) * radiusZ;

      droneGroup.position.set(x, y, z);

      // Compute flight direction & blend slightly inward toward inspected towers
      const flightYaw = Math.atan2(nx - x, nz - z);
      const inwardYaw = Math.atan2(-x, -z);
      const diff = Math.atan2(Math.sin(inwardYaw - flightYaw), Math.cos(inwardYaw - flightYaw));
      droneGroup.rotation.y = flightYaw + diff * 0.45;
      droneGroup.rotation.z = -0.12;
      droneGroup.rotation.x = 0.06;

      // Update world matrices before reading lens world position & aiming gimbal
      droneGroup.updateMatrixWorld(true);

      const scanTarget = new THREE.Vector3(
        Math.sin(t * 0.5) * 0.35,
        0.25 + Math.sin(t * 1.1) * 0.55,
        Math.cos(t * 0.5) * 0.35,
      );
      gimbalGroup.lookAt(scanTarget);

      const lensWorldPos = new THREE.Vector3();
      mainLens.getWorldPosition(lensWorldPos);

      const scanDir = new THREE.Vector3().subVectors(scanTarget, lensWorldPos);
      const rawDist = scanDir.length();
      if (rawDist > 0.001) {
        scanDir.divideScalar(rawDist);
        scanCone.position.copy(lensWorldPos);
        scanCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), scanDir);
        const beamLength = Math.max(0.5, rawDist - 0.55);
        scanCone.scale.set(1, beamLength, 1);
      }

      scanSpotLight.position.copy(lensWorldPos);
      scanSpotLight.target.position.copy(scanTarget);

      particles.rotation.y = t * 0.03;

      camera.position.x += (6.4 + pointer.x * 1.1 - camera.position.x) * 0.04;
      camera.position.y += (4.05 + pointer.y * 0.7 - camera.position.y) * 0.04;
      camera.lookAt(0, 0.55, 0);

      renderer?.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      container.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      glassTex.dispose();
      helipadTex.dispose();
      envRT.dispose();
      pmremGenerator.dispose();
      if (renderer) {
        renderer.dispose();
        if (renderer.domElement.parentNode === container) {
          container.removeChild(renderer.domElement);
        }
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.LineSegments || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => m.dispose());
        }
      });
    };
  }, []);

  return (
    <Box
      component="aside"
      sx={{
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        height: '100vh',
        overflow: 'hidden',
        background: '#0B1930',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <Box
        ref={mountRef}
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          cursor: 'grab',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          p: 3.5,
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <Link
          component={RouterLink}
          to={backTo}
          underline="none"
          sx={{
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            fontSize: '12.5px',
            fontWeight: 600,
            color: '#F0F9FF',
            bgcolor: 'rgba(11, 25, 48, 0.55)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(186, 230, 253, 0.25)',
            borderRadius: '9999px',
            px: 2,
            py: 0.75,
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(11, 25, 48, 0.8)',
            },
          }}
        >
          &larr; {backLabel}
        </Link>
      </Box>

      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          p: 4,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(11, 25, 48, 0) 0%, rgba(9, 19, 36, 0.86) 100%)',
        }}
      >
        <Typography
          component="h2"
          sx={{
            fontSize: { md: '22px', lg: '25px' },
            fontWeight: 700,
            lineHeight: 1.3,
            letterSpacing: '-0.02em',
            color: '#FFFFFF',
          }}
        >
          {heroTagline.line1}
        </Typography>
        <Typography
          sx={{
            mt: 0.75,
            fontSize: '14px',
            color: '#BAE6FD',
            fontWeight: 400,
          }}
        >
          {heroTagline.line2}
        </Typography>
      </Box>
    </Box>
  );
}
