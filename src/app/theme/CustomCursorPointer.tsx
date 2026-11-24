import { useEffect, useId, useRef, useState } from 'react';
import { hexToRgba } from './customTheme';
import { useCustomTheme } from './CustomThemeContext';

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
  return (
    window.matchMedia('(pointer: coarse)').matches &&
    !window.matchMedia('(pointer: fine)').matches
  );
}

const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'range',
  'file',
  'button',
  'submit',
  'reset',
  'color',
  'hidden',
  'image',
]);

function isTextEditableTarget(target: Element | null): boolean {
  if (!target) return false;
  const textarea = target.closest('textarea, [contenteditable="true"]');
  if (textarea) return true;
  const input = target.closest('input');
  if (!(input instanceof HTMLInputElement)) return false;
  return !NON_TEXT_INPUT_TYPES.has((input.type || 'text').toLowerCase());
}

/**
 * Global #08 Waypoint Diamond custom mouse cursor replacing the OS arrow across the app.
 */
export function CustomCursorPointer() {
  const { preferences, activePreset } = useCustomTheme();
  const gradId = `sdi-waypoint-${useId().replace(/:/g, '')}`;
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const followerRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isDown, setIsDown] = useState(false);

  const disabled =
    preferences.cursorStyle !== 'waypoint-diamond' ||
    prefersReducedMotion() ||
    isCoarsePointerOnly();

  useEffect(() => {
    if (disabled) {
      document.documentElement.classList.remove('sdi-custom-cursor');
      return;
    }
    document.documentElement.classList.add('sdi-custom-cursor');
    return () => {
      document.documentElement.classList.remove('sdi-custom-cursor');
    };
  }, [disabled]);

  const coordsRef = useRef({ px: -999, py: -999, fx: -999, fy: -999 });
  const stateRef = useRef({ isInteractive: false, isTextInput: false, isDown: false });

  useEffect(() => {
    stateRef.current = { isInteractive, isTextInput, isDown };
  }, [isInteractive, isTextInput, isDown]);

  useEffect(() => {
    if (disabled) return;

    let rafId: number | null = null;

    const applyPointerTransform = () => {
      const el = pointerRef.current;
      if (!el) return;
      const { px, py } = coordsRef.current;
      const { isInteractive: hov, isTextInput: txt, isDown: down } = stateRef.current;
      if (txt) {
        el.style.transform = `translate3d(${px - 9}px, ${py - 12}px, 0) scale(${down ? 0.9 : 1})`;
      } else {
        const scale = down ? 0.84 : hov ? 1.1 : 1;
        el.style.transform = `translate3d(${px - 13}px, ${py - 13}px, 0) scale(${scale})`;
      }
    };

    const tickFollower = () => {
      const follower = followerRef.current;
      if (!follower) {
        rafId = null;
        return;
      }
      const c = coordsRef.current;
      const { isInteractive: hov, isTextInput: txt, isDown: down } = stateRef.current;

      if (txt || c.px < -500) {
        follower.style.opacity = '0';
        rafId = null;
        return;
      }

      if (c.fx < -500) {
        c.fx = c.px;
        c.fy = c.py;
      } else {
        c.fx += (c.px - c.fx) * 0.24;
        c.fy += (c.py - c.fy) * 0.24;
      }

      const size = hov ? 34 : 24;
      const half = size / 2;
      follower.style.opacity = '1';
      follower.style.width = `${size}px`;
      follower.style.height = `${size}px`;
      follower.style.borderColor = hexToRgba(activePreset.primary, hov ? 0.58 : 0.24);
      follower.style.backgroundColor = hov ? hexToRgba(activePreset.primaryLight, 0.1) : 'transparent';
      follower.style.transform = `translate3d(${c.fx - half}px, ${c.fy - half}px, 0) scale(${down ? 0.82 : 1})`;

      if (Math.abs(c.px - c.fx) < 0.35 && Math.abs(c.py - c.fy) < 0.35) {
        c.fx = c.px;
        c.fy = c.py;
        rafId = null;
      } else {
        rafId = window.requestAnimationFrame(tickFollower);
      }
    };

    const ensureFollowerLoop = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(tickFollower);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      coordsRef.current.px = event.clientX;
      coordsRef.current.py = event.clientY;
      setVisible(true);

      const target = event.target instanceof Element ? event.target : null;
      const interactiveEl = target ? target.closest('button, a, [role="button"], select') : null;
      const textEl = isTextEditableTarget(target);
      const disabledEl = Boolean(
        interactiveEl &&
          (interactiveEl.hasAttribute('disabled') ||
            interactiveEl.getAttribute('aria-disabled') === 'true'),
      );

      stateRef.current.isTextInput = textEl;
      stateRef.current.isInteractive = Boolean((interactiveEl && !disabledEl) || textEl);

      setIsTextInput(textEl);
      setIsDisabled(disabledEl);
      setIsInteractive(stateRef.current.isInteractive);

      applyPointerTransform();
      ensureFollowerLoop();
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      coordsRef.current.px = event.clientX;
      coordsRef.current.py = event.clientY;
      stateRef.current.isDown = true;
      setIsDown(true);
      applyPointerTransform();
      ensureFollowerLoop();
    };

    const handlePointerUp = () => {
      stateRef.current.isDown = false;
      setIsDown(false);
      applyPointerTransform();
      ensureFollowerLoop();
    };

    const hidePointer = () => {
      setVisible(false);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('blur', hidePointer);
    document.addEventListener('mouseleave', hidePointer);

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('blur', hidePointer);
      document.removeEventListener('mouseleave', hidePointer);
    };
  }, [disabled, activePreset.primary, activePreset.primaryLight]);

  if (disabled) {
    return null;
  }

  return (
    <>
      <div
        ref={followerRef}
        aria-hidden="true"
        data-testid="custom-cursor-follower"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          border: `1px solid ${hexToRgba(activePreset.primary, 0.24)}`,
          pointerEvents: 'none',
          zIndex: 10001,
          opacity: visible && !isTextInput ? 1 : 0,
          transition: 'width 140ms ease, height 140ms ease, border-color 140ms ease, background-color 140ms ease, opacity 120ms ease',
          transform: 'translate3d(-999px, -999px, 0)',
          willChange: 'transform',
        }}
      />
      <div
        ref={pointerRef}
        aria-hidden="true"
        data-testid="custom-cursor-pointer"
        data-cursor-style="waypoint-diamond"
        data-cursor-mode={isTextInput ? 'ibeam' : isInteractive ? 'interactive' : 'default'}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 10002,
          opacity: visible ? (isDisabled ? 0.45 : 1) : 0,
          transform: 'translate3d(-999px, -999px, 0)',
          willChange: 'transform',
        }}
      >
        {isTextInput ? (
          <svg width="18" height="24" viewBox="0 0 18 24" fill="none" data-glass-icon="true">
            <path
              d="M5 3h8M5 21h8M9 3v18"
              stroke={activePreset.primary}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            data-glass-icon="true"
            style={{ filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.22))' }}
          >
            <defs>
              <linearGradient id={gradId} x1="3" y1="3" x2="23" y2="23" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={activePreset.primary} />
                <stop offset="100%" stopColor={activePreset.primaryLight} />
              </linearGradient>
            </defs>
            <polygon
              points="13,3 23,13 13,23 3,13"
              fill={`url(#${gradId})`}
              fillOpacity={isInteractive ? 0.28 : 0.16}
              stroke={`url(#${gradId})`}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <polygon
              points="13,9 17,13 13,17 9,13"
              fill={`url(#${gradId})`}
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </svg>
        )}
      </div>
    </>
  );
}
