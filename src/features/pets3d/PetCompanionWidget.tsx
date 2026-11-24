import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Box } from '@mui/material';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useAuthStore } from '@/features/auth/store/authStore';
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

interface WidgetOffset {
  x: number;
  y: number;
}

const STAGE_WIDTH = 192;
const STAGE_HEIGHT = 204;
const DEFAULT_ANCHOR_RIGHT = 24;
const DEFAULT_ANCHOR_BOTTOM = 20;
const DRAG_THRESHOLD_PX = 6;
const POSITION_STORAGE_PREFIX = 'sdi_pet_widget_pos_v1';

const IDLE_PHASE_SECONDS = 6.2;
const ACTION_PHASE_SECONDS = 3.8;
const AUTO_CYCLE_SECONDS = IDLE_PHASE_SECONDS + ACTION_PHASE_SECONDS;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clampOffsetToViewport(offset: WidgetOffset): WidgetOffset {
  if (typeof window === 'undefined') return offset;
  const maxLeftShift = -(window.innerWidth - STAGE_WIDTH - DEFAULT_ANCHOR_RIGHT - 12);
  const maxUpShift = -(window.innerHeight - STAGE_HEIGHT - DEFAULT_ANCHOR_BOTTOM - 12);
  return {
    x: Math.round(Math.max(Math.min(0, maxLeftShift), Math.min(12, offset.x))),
    y: Math.round(Math.max(Math.min(0, maxUpShift), Math.min(12, offset.y))),
  };
}

function getPositionStorageKey(userId: string | null | undefined): string {
  const scope = userId && userId.trim().length > 0 ? userId.trim() : 'guest';
  return `${POSITION_STORAGE_PREFIX}:${scope}`;
}

function readStoredOffset(userId: string | null | undefined): WidgetOffset {
  try {
    const raw = window.localStorage.getItem(getPositionStorageKey(userId));
    if (!raw) return { x: 0, y: 0 };
    const parsed = JSON.parse(raw) as Partial<WidgetOffset>;
    if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
      return clampOffsetToViewport({ x: parsed.x, y: parsed.y });
    }
  } catch {
    // Ignore malformed storage entries
  }
  return { x: 0, y: 0 };
}

function persistOffset(userId: string | null | undefined, offset: WidgetOffset): void {
  try {
    window.localStorage.setItem(getPositionStorageKey(userId), JSON.stringify(offset));
  } catch {
    // Ignore storage quota errors
  }
}

export default function PetCompanionWidget({ petId }: PetCompanionWidgetProps) {
  const { locale } = useLocale();
  const isVi = locale === 'vi';
  const isDark = useIsDarkMode();
  const userId = useAuthStore((state) => state.userId);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<PetAnimationController | null>(null);
  const pointerRef = useRef<PointerNDC | null>(null);

  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState<WidgetOffset>(() => readStoredOffset(userId));

  const dragSessionRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originOffsetX: number;
    originOffsetY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setOffset(readStoredOffset(userId));
  }, [userId]);

  useEffect(() => {
    const handleResize = () => {
      setOffset((prev) => clampOffsetToViewport(prev));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    // Near-front heroic camera framing so leftward & rightward cursor tracking feel symmetrical
    // and tall rotors/ears/wings + Happy arcs stay completely inside the canvas bounds
    const camera = new THREE.PerspectiveCamera(
      34,
      STAGE_WIDTH / STAGE_HEIGHT,
      0.1,
      40,
    );
    camera.position.set(0.42, 1.44, 3.68);
    camera.lookAt(0, 0.86, 0);

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
      const dx = event.clientX - centerX;
      const dy = event.clientY - centerY;
      // Asymmetric viewport normalization so moving right/below a corner-docked pet still reaches full range
      const leftSpan = Math.max(180, Math.min(420, centerX));
      const rightSpan = Math.max(80, Math.min(200, window.innerWidth - centerX));
      const upSpan = Math.max(160, Math.min(360, centerY));
      const downSpan = Math.max(70, Math.min(180, window.innerHeight - centerY));

      const nx = Math.max(-1, Math.min(1, dx / (dx >= 0 ? rightSpan : leftSpan)));
      const ny = Math.max(-1, Math.min(1, -dy / (dy >= 0 ? downSpan : upSpan)));
      pointerRef.current = { x: nx, y: ny };
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    let rafId = 0;
    let lastTime = performance.now();
    let autonomousClock = 0;
    const reducedMotion = prefersReducedMotion();

    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      autonomousClock += dt;

      let autoMode: PetAnimationMode = 'paused';
      if (!reducedMotion) {
        const phase = autonomousClock % AUTO_CYCLE_SECONDS;
        autoMode = phase < IDLE_PHASE_SECONDS ? 'idle' : 'action';
      }

      controller.update(dt, autoMode, reducedMotion ? null : pointerRef.current);
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

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originOffsetX: offset.x,
      originOffsetY: offset.y,
      moved: false,
    };
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;

    const dx = event.clientX - session.startClientX;
    const dy = event.clientY - session.startClientY;
    if (!session.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      session.moved = true;
      setDragging(true);
    }

    if (session.moved) {
      const next = clampOffsetToViewport({
        x: session.originOffsetX + dx,
        y: session.originOffsetY + dy,
      });
      setOffset(next);
    }
  };

  const handleStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    dragSessionRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);

    if (session.moved) {
      setDragging(false);
      const dx = event.clientX - session.startClientX;
      const dy = event.clientY - session.startClientY;
      const finalOffset = clampOffsetToViewport({
        x: session.originOffsetX + dx,
        y: session.originOffsetY + dy,
      });
      setOffset(finalOffset);
      persistOffset(userId, finalOffset);
      return;
    }

    // Only clicking (without dragging) manually triggers the Happy celebration
    controllerRef.current?.triggerHappy(2.4);
  };

  const handleStagePointerCancel = () => {
    dragSessionRef.current = null;
    setDragging(false);
  };

  return (
    <Box
      data-testid="pet-companion-widget"
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
      sx={{
        position: 'fixed',
        right: DEFAULT_ANCHOR_RIGHT,
        bottom: DEFAULT_ANCHOR_BOTTOM,
        transition: dragging ? 'none' : 'transform 120ms ease-out',
        zIndex: 1200,
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        pointerEvents: 'none',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      {/* Pure, unobstructed interactive & draggable 3D Pet Stage */}
      <Box
        ref={mountRef}
        role="button"
        tabIndex={0}
        aria-label={
          isVi
            ? `Thú cưng 3D ${activeSpec.name}, nhấn để nhảy vui hoặc kéo để di chuyển`
            : `3D companion ${activeSpec.name}, click to react or drag to move`
        }
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerCancel}
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
          cursor: dragging ? 'grabbing' : 'grab',
          borderRadius: '18px',
          transition: 'transform 180ms ease',
          '&:hover': {
            transform: dragging ? 'none' : 'scale(1.03)',
          },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
          },
        }}
      />
    </Box>
  );
}
