import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import DirectionsRunRounded from '@mui/icons-material/DirectionsRunRounded';
import PauseCircleOutlineRounded from '@mui/icons-material/PauseCircleOutlineRounded';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useCustomTheme } from '@/app/theme/CustomThemeContext';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  PetAnimationController,
  type PetAnimationMode,
  type PointerNDC,
} from './petAnimations';
import {
  disposeObject3D,
  PET_MODEL_CATALOG,
  type PetModelId,
} from './petModels';

interface PetCompanionWidgetProps {
  petId: PetModelId;
}

const STAGE_WIDTH = 156;
const STAGE_HEIGHT = 164;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function PetCompanionWidget({ petId }: PetCompanionWidgetProps) {
  const { locale } = useLocale();
  const isVi = locale === 'vi';
  const isDark = useIsDarkMode();
  const { setPetCompanionId } = useCustomTheme();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PetAnimationController | null>(null);

  const [mode, setMode] = useState<PetAnimationMode>(() =>
    prefersReducedMotion() ? 'paused' : 'idle',
  );
  const [hovered, setHovered] = useState(false);

  const modeRef = useRef<PetAnimationMode>(mode);
  const pointerRef = useRef<PointerNDC | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const activeSpec = useMemo(
    () => PET_MODEL_CATALOG.find((item) => item.id === petId) ?? PET_MODEL_CATALOG[0]!,
    [petId],
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(STAGE_WIDTH, STAGE_HEIGHT);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = `${STAGE_WIDTH}px`;
    renderer.domElement.style.height = `${STAGE_HEIGHT}px`;

    container.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = isDark ? 0.55 : 0.72;

    const camera = new THREE.PerspectiveCamera(
      34,
      STAGE_WIDTH / STAGE_HEIGHT,
      0.1,
      40,
    );
    camera.position.set(1.38, 1.32, 2.38);
    camera.lookAt(0, 0.72, 0);

    const hemiLight = new THREE.HemisphereLight('#F0F9FF', '#1E293B', isDark ? 0.72 : 0.96);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', isDark ? 1.5 : 1.75);
    keyLight.position.set(3.2, 5.4, 3.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(512, 512);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 14;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(activeSpec.accentColor, isDark ? 0.95 : 0.58);
    rimLight.position.set(-2.6, 2.2, -2.6);
    scene.add(rimLight);

    // Subtle soft shadow catcher underneath floating pet
    const shadowDisc = new THREE.Mesh(
      new THREE.CircleGeometry(0.68, 28),
      new THREE.ShadowMaterial({ opacity: isDark ? 0.34 : 0.16 }),
    );
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.01;
    shadowDisc.receiveShadow = true;
    scene.add(shadowDisc);

    const modelGroup = activeSpec.build();
    scene.add(modelGroup);

    const controller = new PetAnimationController(petId, modelGroup);
    controllerRef.current = controller;

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const nx = Math.max(-1, Math.min(1, (event.clientX - centerX) / 420));
      const ny = Math.max(-1, Math.min(1, -(event.clientY - centerY) / 360));
      pointerRef.current = { x: nx, y: ny };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let rafId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      controller.update(dt, modeRef.current, pointerRef.current);
      renderer.render(scene, camera);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      controllerRef.current = null;
      disposeObject3D(modelGroup);
      shadowDisc.geometry.dispose();
      (shadowDisc.material as THREE.Material).dispose();
      envTarget.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [activeSpec, isDark, petId]);

  const toggleActionMode = () => {
    setMode((prev) => (prev === 'action' ? 'idle' : 'action'));
  };

  return (
    <Box
      data-testid="pet-companion-widget"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      sx={{
        position: 'fixed',
        right: { xs: 10, sm: 18 },
        bottom: { xs: 10, sm: 16 },
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {/* Interactive 3D Stage */}
      <Tooltip
        title={
          isVi
            ? `${activeSpec.name} • Nhấn để tương tác`
            : `${activeSpec.name} • Click to play`
        }
        placement="left"
      >
        <Box
          ref={mountRef}
          role="button"
          tabIndex={0}
          aria-label={
            isVi
              ? `Thú cưng 3D ${activeSpec.name}, nhấn để nhảy vui`
              : `3D companion ${activeSpec.name}, click to react`
          }
          onClick={() => controllerRef.current?.triggerHappy(2.4)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              controllerRef.current?.triggerHappy(2.4);
            }
          }}
          sx={{
            width: STAGE_WIDTH,
            height: STAGE_HEIGHT,
            pointerEvents: 'auto',
            cursor: 'pointer',
            borderRadius: '16px',
            transition: 'transform 180ms ease',
            '&:hover': {
              transform: 'translateY(-2px) scale(1.03)',
            },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
            },
          }}
        />
      </Tooltip>

      {/* Subtle Floating Quick Controls */}
      <Paper
        elevation={0}
        sx={{
          mt: -1,
          px: 0.75,
          py: 0.375,
          borderRadius: '999px',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.84)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.14)',
          pointerEvents: 'auto',
          opacity: hovered ? 1 : 0.76,
          transition: 'opacity 160ms ease',
        }}
      >
        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              fontSize: '0.6875rem',
              px: 0.75,
              color: 'text.primary',
              maxWidth: 82,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {activeSpec.name}
          </Typography>

          <Tooltip title={mode === 'action' ? (isVi ? 'Thư giãn (Idle)' : 'Idle mode') : (isVi ? 'Chế độ hoạt động' : 'Action mode')}>
            <IconButton
              size="small"
              onClick={toggleActionMode}
              color={mode === 'action' ? 'primary' : 'default'}
              aria-label={mode === 'action' ? 'Switch pet to idle' : 'Switch pet to action'}
              data-testid="pet-companion-mode-toggle"
              sx={{ width: 24, height: 24 }}
            >
              {mode === 'paused' ? (
                <PauseCircleOutlineRounded sx={{ fontSize: 15 }} />
              ) : (
                <DirectionsRunRounded sx={{ fontSize: 15 }} />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title={isVi ? 'Nhảy vui' : 'Happy bounce'}>
            <IconButton
              size="small"
              onClick={() => controllerRef.current?.triggerHappy(2.4)}
              aria-label="Trigger pet happy animation"
              data-testid="pet-companion-happy-button"
              sx={{ width: 24, height: 24 }}
            >
              <AutoAwesomeRounded sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title={isVi ? 'Tắt thú cưng 3D' : 'Turn off 3D pet'}>
            <IconButton
              size="small"
              onClick={() => setPetCompanionId('none')}
              aria-label="Turn off 3D pet companion"
              data-testid="pet-companion-close"
              sx={{ width: 24, height: 24 }}
            >
              <CloseRounded sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    </Box>
  );
}
