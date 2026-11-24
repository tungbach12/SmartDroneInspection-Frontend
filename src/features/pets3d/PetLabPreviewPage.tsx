import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Link as RouterLink } from 'react-router-dom';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { GlassMoonIcon, GlassSunIcon } from '@/shared/ui/GradientGlassIcons';
import {
  disposeObject3D,
  PET_MODEL_CATALOG,
  type PetModelId,
} from './petModels';

type CameraView = 'iso' | 'front' | 'side' | 'top';

const CAMERA_POSITIONS: Record<CameraView, [number, number, number]> = {
  iso: [2.5, 1.9, 2.8],
  front: [0, 1.15, 3.4],
  side: [3.4, 1.15, 0],
  top: [0.01, 4.0, 0.25],
};

export default function PetLabPreviewPage() {
  const isDark = useIsDarkMode();
  const { toggle: toggleColorMode } = useColorMode();
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [selectedId, setSelectedId] = useState<PetModelId>('aero-shiba');
  const [wireframe, setWireframe] = useState(false);
  const [showPedestal, setShowPedestal] = useState(true);
  const [cameraView, setCameraView] = useState<CameraView>('iso');
  const [meshStats, setMeshStats] = useState<{ meshes: number; triangles: number }>({
    meshes: 0,
    triangles: 0,
  });

  const activeSpec = useMemo(
    () => PET_MODEL_CATALOG.find((p) => p.id === selectedId) ?? PET_MODEL_CATALOG[0]!,
    [selectedId],
  );

  const sceneRefs = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    pedestal: THREE.Group;
    petGroup: THREE.Group | null;
    renderOnce: () => void;
  } | null>(null);

  // Initialize Three.js static studio viewport (OrbitControls only; zero model animation)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      return;
    }

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 540;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDark ? '#0B0F17' : '#F1F5F9');

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(...CAMERA_POSITIONS.iso);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.target.set(0, 0.85, 0);
    controls.minDistance = 1.5;
    controls.maxDistance = 7;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.update();

    const hemiLight = new THREE.HemisphereLight('#E0F2FE', '#334155', 0.9);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 2.4);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#38BDF8', 1.1);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Studio floor & pedestal
    const pedestal = new THREE.Group();
    const discGeo = new THREE.CylinderGeometry(1.15, 1.24, 0.08, 48);
    const discMat = new THREE.MeshStandardMaterial({
      color: isDark ? '#1E293B' : '#E2E8F0',
      roughness: 0.65,
      metalness: 0.15,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = -0.04;
    disc.receiveShadow = true;
    pedestal.add(disc);

    const grid = new THREE.GridHelper(6, 18, '#64748B', '#CBD5E1');
    grid.position.y = -0.08;
    pedestal.add(grid);
    scene.add(pedestal);

    const renderOnce = () => {
      renderer?.render(scene, camera);
    };

    controls.addEventListener('change', renderOnce);

    const handleResize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer?.setSize(w, h);
      renderOnce();
    };
    window.addEventListener('resize', handleResize);

    sceneRefs.current = {
      scene,
      camera,
      controls,
      pedestal,
      petGroup: null,
      renderOnce,
    };

    renderOnce();

    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('change', renderOnce);
      controls.dispose();
      if (sceneRefs.current?.petGroup) {
        scene.remove(sceneRefs.current.petGroup);
        disposeObject3D(sceneRefs.current.petGroup);
      }
      disposeObject3D(pedestal);
      envRT.dispose();
      pmrem.dispose();
      renderer?.dispose();
      renderer?.domElement.remove();
      sceneRefs.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update studio background when light/dark changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.scene.background = new THREE.Color(isDark ? '#0B0F17' : '#F1F5F9');
    refs.renderOnce();
  }, [isDark]);

  // Swap static 3D pet model
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    if (refs.petGroup) {
      refs.scene.remove(refs.petGroup);
      disposeObject3D(refs.petGroup);
      refs.petGroup = null;
    }

    const model = activeSpec.build();
    let meshCount = 0;
    let triCount = 0;

    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        meshCount += 1;
        const pos = obj.geometry.getAttribute('position');
        const index = obj.geometry.getIndex();
        triCount += index ? index.count / 3 : pos ? pos.count / 3 : 0;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if ('wireframe' in m) {
            m.wireframe = wireframe;
          }
        });
      }
    });

    refs.scene.add(model);
    refs.petGroup = model;
    setMeshStats({ meshes: meshCount, triangles: Math.round(triCount) });
    refs.renderOnce();
  }, [activeSpec, wireframe]);

  // Pedestal visibility
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.pedestal.visible = showPedestal;
    refs.renderOnce();
  }, [showPedestal]);

  const setView = (view: CameraView) => {
    setCameraView(view);
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.camera.position.set(...CAMERA_POSITIONS[view]);
    refs.controls.target.set(0, 0.85, 0);
    refs.controls.update();
    refs.renderOnce();
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        p: { xs: 2, md: 3 },
      }}
    >
      <Box sx={{ maxWidth: 1380, mx: 'auto' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2.5 }}
        >
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                3D Pet Models Lab (Static — No Animation Yet)
              </Typography>
              <Chip size="small" color="primary" label="5 Three.js Models" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
              Kéo chuột để xoay 360°, cuộn để zoom kiểm tra tỷ lệ &amp; khớp model trước khi gắn animation.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              onClick={toggleColorMode}
              startIcon={isDark ? <GlassSunIcon size={16} /> : <GlassMoonIcon size={16} />}
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              {isDark ? 'Light Studio' : 'Dark Studio'}
            </Button>
            <Button
              component={RouterLink}
              to="/"
              variant="outlined"
              size="small"
              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
            >
              Back to App
            </Button>
          </Stack>
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '340px 1fr' },
            gap: 2,
          }}
        >
          {/* Left: 5 Model Selector Cards */}
          <Stack spacing={1.25}>
            {PET_MODEL_CATALOG.map((spec) => {
              const selected = spec.id === selectedId;
              return (
                <Paper
                  key={spec.id}
                  component="button"
                  type="button"
                  variant="outlined"
                  onClick={() => setSelectedId(spec.id)}
                  data-testid={`pet-select-${spec.id}`}
                  sx={{
                    p: 1.75,
                    borderRadius: '10px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    bgcolor: selected ? 'action.selected' : 'background.paper',
                    borderColor: selected ? spec.accentColor : 'divider',
                    transition: 'border-color 140ms ease, background-color 140ms ease',
                    '&:hover': {
                      borderColor: spec.accentColor,
                    },
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          px: 0.875,
                          py: 0.25,
                          borderRadius: '6px',
                          bgcolor: spec.accentColor,
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          fontFamily: 'monospace',
                        }}
                      >
                        {spec.num}
                      </Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {spec.name}
                      </Typography>
                    </Stack>
                    <Chip size="small" label={spec.category} variant="outlined" />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                    {spec.subtitle}
                  </Typography>
                </Paper>
              );
            })}

            <Paper variant="outlined" sx={{ p: 1.75, borderRadius: '10px', bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                {activeSpec.num}. {activeSpec.name} — Chi tiết khớp
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
                {activeSpec.description}
              </Typography>
              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
                {activeSpec.parts.map((part) => (
                  <Chip
                    key={part}
                    size="small"
                    label={part}
                    sx={{ fontSize: '0.7rem', height: 22, fontFamily: 'monospace' }}
                  />
                ))}
              </Stack>
              <Divider sx={{ my: 1 }} />
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                Meshes: {meshStats.meshes} • Triangles: ~{meshStats.triangles} • Static Pose
              </Typography>
            </Paper>
          </Stack>

          {/* Right: 3D Viewport */}
          <Paper
            variant="outlined"
            sx={{
              borderRadius: '10px',
              overflow: 'hidden',
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}
            >
              <ToggleButtonGroup
                size="small"
                exclusive
                value={cameraView}
                onChange={(_e, next: CameraView | null) => {
                  if (next) setView(next);
                }}
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    px: 1.25,
                  },
                }}
              >
                <ToggleButton value="iso">Isometric</ToggleButton>
                <ToggleButton value="front">Front</ToggleButton>
                <ToggleButton value="side">Side</ToggleButton>
                <ToggleButton value="top">Top</ToggleButton>
              </ToggleButtonGroup>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant={wireframe ? 'contained' : 'outlined'}
                  onClick={() => setWireframe((prev) => !prev)}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  Wireframe
                </Button>
                <Button
                  size="small"
                  variant={showPedestal ? 'contained' : 'outlined'}
                  onClick={() => setShowPedestal((prev) => !prev)}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  Grid &amp; Pedestal
                </Button>
              </Stack>
            </Box>

            <Box
              ref={mountRef}
              data-testid="pet-3d-viewport"
              sx={{
                width: '100%',
                height: { xs: 420, md: 580 },
                position: 'relative',
              }}
            />
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
