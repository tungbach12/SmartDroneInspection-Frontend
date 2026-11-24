import { useEffect, useRef, useState } from 'react';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';
import {
  CursorDesignSvg,
  getCursorStyleMeta,
  resolveCursorColors,
} from './cursorDesigns';
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

function resolveActionTag(target: Element | null): string {
  if (!target) return '';
  const tagged = target.closest('[data-cursor-tag]');
  if (tagged) {
    return tagged.getAttribute('data-cursor-tag') ?? '';
  }
  if (isTextEditableTarget(target)) return 'EDIT';
  if (target.closest('a')) return 'OPEN';
  if (target.closest('button, [role="button"]')) return 'CLICK';
  return '';
}

/**
 * Global custom mouse pointer supporting all 10 user-selectable cursor designs and custom color.
 */
export function CustomCursorPointer() {
  const { preferences, activePreset } = useCustomTheme();
  const isDark = useIsDarkMode();
  const pointerRef = useRef<HTMLDivElement | null>(null);
  const followerRef = useRef<HTMLDivElement | null>(null);
  const tagRef = useRef<HTMLDivElement | null>(null);

  const [visible, setVisible] = useState(false);
  const [isInteractive, setIsInteractive] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isDown, setIsDown] = useState(false);
  const [hoverTag, setHoverTag] = useState('');

  const styleMeta = getCursorStyleMeta(preferences.cursorStyle);
  const { primary, secondary } = resolveCursorColors(preferences.cursorColor, activePreset);

  const disabled =
    preferences.cursorStyle === 'system' ||
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

  const coordsRef = useRef({ px: -999, py: -999, fx: -999, fy: -999, vx: 0 });
  const stateRef = useRef({ isInteractive: false, isTextInput: false, isDown: false });

  useEffect(() => {
    stateRef.current = { isInteractive, isTextInput, isDown };
  }, [isInteractive, isTextInput, isDown]);

  useEffect(() => {
    if (disabled) return;

    let rafId: number | null = null;

    const applyPointerTransform = () => {
      const el = pointerRef.current;
      if (el) {
        const { px, py, vx } = coordsRef.current;
        const { isInteractive: hov, isTextInput: txt, isDown: down } = stateRef.current;
        if (txt) {
          el.style.transform = `translate3d(${px - 9}px, ${py - 12}px, 0) scale(${down ? 0.9 : 1})`;
        } else {
          const tilt =
            preferences.cursorStyle === 'micro-drone'
              ? Math.max(-18, Math.min(18, vx * 0.85))
              : 0;
          const scale = down ? 0.84 : hov ? 1.08 : 1;
          if (styleMeta.hotspot === 'center') {
            el.style.transform = `translate3d(${px - 13}px, ${py - 13}px, 0) rotate(${tilt}deg) scale(${scale})`;
          } else {
            el.style.transform = `translate3d(${px - 3}px, ${py - 3}px, 0) scale(${scale})`;
          }
        }
      }

      const tagEl = tagRef.current;
      if (tagEl) {
        const { px, py } = coordsRef.current;
        tagEl.style.transform = `translate3d(${px + 18}px, ${py + 18}px, 0)`;
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
      c.vx *= 0.8;

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
      const offset = styleMeta.hotspot === 'center' ? size / 2 : size / 2 - 4;
      follower.style.opacity = '1';
      follower.style.width = `${size}px`;
      follower.style.height = `${size}px`;
      follower.style.borderColor = hexToRgba(primary, hov ? 0.58 : 0.24);
      follower.style.backgroundColor = hov ? hexToRgba(secondary, 0.1) : 'transparent';
      follower.style.transform = `translate3d(${c.fx - offset}px, ${c.fy - offset}px, 0) scale(${down ? 0.82 : 1})`;

      if (Math.abs(c.px - c.fx) < 0.35 && Math.abs(c.py - c.fy) < 0.35 && Math.abs(c.vx) < 0.2) {
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
      if (coordsRef.current.px > -500) {
        coordsRef.current.vx = event.clientX - coordsRef.current.px;
      }
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
      setHoverTag(
        styleMeta.showTag && !disabledEl ? resolveActionTag(target) : '',
      );

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
      setHoverTag('');
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
  }, [disabled, primary, secondary, preferences.cursorStyle, styleMeta.hotspot, styleMeta.showTag]);

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
          border: `1px solid ${hexToRgba(primary, 0.24)}`,
          pointerEvents: 'none',
          zIndex: 10001,
          opacity: visible && !isTextInput ? 1 : 0,
          transition:
            'width 140ms ease, height 140ms ease, border-color 140ms ease, background-color 140ms ease, opacity 120ms ease',
          transform: 'translate3d(-999px, -999px, 0)',
          willChange: 'transform',
        }}
      />
      <div
        ref={pointerRef}
        aria-hidden="true"
        data-testid="custom-cursor-pointer"
        data-cursor-style={preferences.cursorStyle}
        data-cursor-color={primary}
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
              stroke={primary}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <CursorDesignSvg
            styleId={preferences.cursorStyle}
            primary={primary}
            secondary={secondary}
            interactive={isInteractive}
            down={isDown}
            isDark={isDark}
            size={26}
          />
        )}
      </div>
      {styleMeta.showTag && (
        <div
          ref={tagRef}
          aria-hidden="true"
          data-testid="custom-cursor-tag"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            pointerEvents: 'none',
            zIndex: 10003,
            padding: '2px 7px',
            borderRadius: 6,
            fontFamily: 'monospace',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            backgroundColor: primary,
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.24)',
            opacity: visible && hoverTag ? 1 : 0,
            transform: 'translate3d(-999px, -999px, 0)',
            transition: 'opacity 110ms ease',
          }}
        >
          {hoverTag}
        </div>
      )}
    </>
  );
}
