import { useEffect, useRef } from 'react';
import { hexToRgba } from './customTheme';
import { useCustomTheme } from './CustomThemeContext';

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isCoarsePointerOnly(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest('a, button, [role="button"], input, select, textarea, [tabindex]'),
  );
}

export function CursorEffectOverlay() {
  const { preferences, activePreset } = useCustomTheme();
  const effect = preferences.cursorEffect;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const disabled = effect === 'none' || prefersReducedMotion() || isCoarsePointerOnly();

  useEffect(() => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      ctx = null;
    }
    if (!ctx) return;

    const primaryHex = activePreset.primary;
    const accentHex = activePreset.primaryLight;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    let pointerX = -999;
    let pointerY = -999;
    let smoothX = -999;
    let smoothY = -999;
    let hasPointer = false;
    let hoveringInteractive = false;
    let clickPulse = 0;
    let rafId: number | null = null;

    const trail: TrailPoint[] = [];
    const ripples: ClickRipple[] = [];

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      if (hasPointer) {
        if (smoothX < -500) {
          smoothX = pointerX;
          smoothY = pointerY;
        } else {
          smoothX += (pointerX - smoothX) * 0.24;
          smoothY += (pointerY - smoothY) * 0.24;
        }
      }

      if (effect === 'spotlight' && hasPointer) {
        const radius = hoveringInteractive ? 125 : 105;
        const grad = ctx.createRadialGradient(smoothX, smoothY, 0, smoothX, smoothY, radius);
        grad.addColorStop(0, hexToRgba(primaryHex, 0.16));
        grad.addColorStop(0.5, hexToRgba(accentHex, 0.07));
        grad.addColorStop(1, hexToRgba(primaryHex, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smoothX, smoothY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (effect === 'trail') {
        for (let i = trail.length - 1; i >= 0; i -= 1) {
          const point = trail[i];
          if (!point) continue;
          point.age += 1;
          if (point.age > 22) {
            trail.splice(i, 1);
          }
        }

        if (trail.length > 1) {
          for (let i = 1; i < trail.length; i += 1) {
            const prev = trail[i - 1];
            const curr = trail[i];
            if (!prev || !curr) continue;
            const life = Math.max(0, 1 - curr.age / 22);
            ctx.strokeStyle = hexToRgba(primaryHex, life * 0.55);
            ctx.lineWidth = Math.max(0.75, life * 3);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(curr.x, curr.y);
            ctx.stroke();
          }
        }

        if (hasPointer) {
          const dotGrad = ctx.createRadialGradient(smoothX, smoothY, 0, smoothX, smoothY, 26);
          dotGrad.addColorStop(0, hexToRgba(accentHex, 0.28));
          dotGrad.addColorStop(1, hexToRgba(primaryHex, 0));
          ctx.fillStyle = dotGrad;
          ctx.beginPath();
          ctx.arc(smoothX, smoothY, 26, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (effect === 'reticle' && hasPointer) {
        const baseRadius = hoveringInteractive ? 17 : 13;
        const radius = baseRadius + clickPulse * 6;
        ctx.strokeStyle = hexToRgba(primaryHex, hoveringInteractive ? 0.8 : 0.55);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(smoothX, smoothY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 4 precision HUD tick marks
        const tickInner = radius + 2;
        const tickOuter = radius + 6;
        ctx.strokeStyle = hexToRgba(accentHex, 0.75);
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(smoothX - tickOuter, smoothY);
        ctx.lineTo(smoothX - tickInner, smoothY);
        ctx.moveTo(smoothX + tickInner, smoothY);
        ctx.lineTo(smoothX + tickOuter, smoothY);
        ctx.moveTo(smoothX, smoothY - tickOuter);
        ctx.lineTo(smoothX, smoothY - tickInner);
        ctx.moveTo(smoothX, smoothY + tickInner);
        ctx.lineTo(smoothX, smoothY + tickOuter);
        ctx.stroke();

        ctx.fillStyle = hexToRgba(primaryHex, 0.85);
        ctx.beginPath();
        ctx.arc(pointerX, pointerY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (clickPulse > 0) {
        clickPulse = Math.max(0, clickPulse - 0.08);
      }

      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const r = ripples[i];
        if (!r) continue;
        r.radius += (r.maxRadius - r.radius) * 0.16 + 0.8;
        r.alpha *= 0.89;

        ctx.strokeStyle = hexToRgba(primaryHex, r.alpha);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        if (r.alpha < 0.03 || r.radius >= r.maxRadius) {
          ripples.splice(i, 1);
        }
      }

      const settled =
        Math.abs(pointerX - smoothX) < 0.4 &&
        Math.abs(pointerY - smoothY) < 0.4 &&
        trail.length === 0 &&
        ripples.length === 0 &&
        clickPulse === 0;

      if (!settled || (hasPointer && (effect === 'spotlight' || effect === 'reticle'))) {
        if (!settled || effect === 'spotlight' || effect === 'reticle') {
          if (settled) {
            rafId = null;
          } else {
            rafId = window.requestAnimationFrame(drawFrame);
          }
        }
      } else {
        rafId = null;
      }
    };

    const ensureLoop = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(drawFrame);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      hasPointer = true;
      hoveringInteractive = isInteractiveTarget(event.target);

      if (effect === 'trail') {
        const last = trail[trail.length - 1];
        if (
          !last ||
          Math.hypot(pointerX - last.x, pointerY - last.y) >= 3
        ) {
          trail.push({ x: pointerX, y: pointerY, age: 0 });
          if (trail.length > 26) {
            trail.shift();
          }
        }
      }
      if (effect !== 'ripple') {
        ensureLoop();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      hasPointer = true;
      clickPulse = 1;
      ripples.push({
        x: event.clientX,
        y: event.clientY,
        radius: 4,
        maxRadius: effect === 'ripple' ? 44 : 30,
        alpha: 0.65,
      });
      ensureLoop();
    };

    const handlePointerLeave = () => {
      hasPointer = false;
      hoveringInteractive = false;
      ensureLoop();
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [disabled, effect, activePreset.primary, activePreset.primaryLight]);

  if (disabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="cursor-effect-overlay"
      data-effect={effect}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
