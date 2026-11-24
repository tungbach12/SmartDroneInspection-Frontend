import { useId } from 'react';
import type { ThemePresetDefinition } from './customTheme';

export type CursorStyleId =
  | 'waypoint-diamond'
  | 'aero-glass-arrow'
  | 'stealth-delta'
  | 'micro-drone'
  | 'hud-reticle'
  | 'obsidian-neon'
  | 'frosted-dot'
  | 'cyber-blade'
  | 'laser-needle'
  | 'pilot-badge'
  | 'system';

export interface CursorStyleOption {
  id: CursorStyleId;
  labelEn: string;
  labelVi: string;
  hotspot: 'tip' | 'center';
  showTag?: boolean;
}

export const CURSOR_STYLE_OPTIONS: readonly CursorStyleOption[] = [
  { id: 'waypoint-diamond', labelEn: 'Waypoint', labelVi: 'Waypoint', hotspot: 'center' },
  { id: 'aero-glass-arrow', labelEn: 'Aero Glass', labelVi: 'Kính nổi', hotspot: 'tip' },
  { id: 'stealth-delta', labelEn: 'Delta Wing', labelVi: 'Cánh bay', hotspot: 'tip' },
  { id: 'micro-drone', labelEn: 'Micro Drone', labelVi: 'Drone mini', hotspot: 'center' },
  { id: 'hud-reticle', labelEn: 'HUD Reticle', labelVi: 'Tâm HUD', hotspot: 'center' },
  { id: 'obsidian-neon', labelEn: 'Obsidian Neon', labelVi: 'Viền Neon', hotspot: 'tip' },
  { id: 'frosted-dot', labelEn: 'Glass Dot', labelVi: 'Chấm kính', hotspot: 'center' },
  { id: 'cyber-blade', labelEn: 'Cyber Blade', labelVi: 'Mũi nhọn', hotspot: 'tip' },
  { id: 'laser-needle', labelEn: 'Laser Tip', labelVi: 'Tia Laser', hotspot: 'tip' },
  { id: 'pilot-badge', labelEn: 'Aero + Tag', labelVi: 'Kèm nhãn', hotspot: 'tip', showTag: true },
  { id: 'system', labelEn: 'System OS', labelVi: 'Mặc định OS', hotspot: 'tip' },
] as const;

export interface CursorColorSwatch {
  id: string;
  labelEn: string;
  labelVi: string;
  primary: string;
  secondary: string;
}

export const CURSOR_COLOR_SWATCHES: readonly CursorColorSwatch[] = [
  { id: '#3758F9', labelEn: 'Indigo', labelVi: 'Xanh Indigo', primary: '#3758F9', secondary: '#38BDF8' },
  { id: '#087E8B', labelEn: 'Aero Teal', labelVi: 'Xanh Teal', primary: '#087E8B', secondary: '#2DD4BF' },
  { id: '#059669', labelEn: 'Emerald', labelVi: 'Xanh Ngọc', primary: '#059669', secondary: '#34D399' },
  { id: '#4F46E5', labelEn: 'Violet', labelVi: 'Tím Indigo', primary: '#4F46E5', secondary: '#A78BFA' },
  { id: '#D97706', labelEn: 'Amber', labelVi: 'Vàng Cam', primary: '#D97706', secondary: '#FBBF24' },
  { id: '#E11D48', labelEn: 'Crimson', labelVi: 'Đỏ Hồng', primary: '#E11D48', secondary: '#FB7185' },
] as const;

function tintHexLighter(hex: string): string {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return '#38BDF8';
  const r = Math.min(255, Math.round(Number.parseInt(clean.slice(0, 2), 16) + 65));
  const g = Math.min(255, Math.round(Number.parseInt(clean.slice(2, 4), 16) + 85));
  const b = Math.min(255, Math.round(Number.parseInt(clean.slice(4, 6), 16) + 85));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function resolveCursorColors(
  cursorColor: string,
  activePreset: ThemePresetDefinition,
): { primary: string; secondary: string } {
  if (!cursorColor || cursorColor === 'theme') {
    return {
      primary: activePreset.primary,
      secondary: activePreset.primaryLight,
    };
  }
  const matched = CURSOR_COLOR_SWATCHES.find(
    (s) => s.primary.toLowerCase() === cursorColor.toLowerCase(),
  );
  if (matched) {
    return { primary: matched.primary, secondary: matched.secondary };
  }
  if (/^#[0-9a-fA-F]{6}$/.test(cursorColor)) {
    return { primary: cursorColor, secondary: tintHexLighter(cursorColor) };
  }
  return {
    primary: activePreset.primary,
    secondary: activePreset.primaryLight,
  };
}

export function getCursorStyleMeta(styleId: CursorStyleId): CursorStyleOption {
  return (
    CURSOR_STYLE_OPTIONS.find((opt) => opt.id === styleId) ?? CURSOR_STYLE_OPTIONS[0]!
  );
}

interface CursorDesignSvgProps {
  styleId: CursorStyleId;
  primary: string;
  secondary: string;
  interactive?: boolean;
  down?: boolean;
  isDark?: boolean;
  size?: number;
}

export function CursorDesignSvg({
  styleId,
  primary,
  secondary,
  interactive = false,
  down = false,
  isDark = false,
  size = 26,
}: CursorDesignSvgProps) {
  const gradId = `sdi-cur-${styleId}-${useId().replace(/:/g, '')}`;
  const gradUrl = `url(#${gradId})`;

  if (styleId === 'system') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" data-glass-icon="true">
        <path
          d="M5.5 3.5L18.5 12.2L12.1 13.6L14.9 19.6L12.7 20.6L9.9 14.6L5.5 18.2V3.5Z"
          fill={isDark ? '#F4F4F5' : '#FFFFFF'}
          stroke="#18181B"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (styleId === 'waypoint-diamond') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 26 26"
        fill="none"
        data-glass-icon="true"
        style={{ filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.22))' }}
      >
        <defs>
          <linearGradient id={gradId} x1="3" y1="3" x2="23" y2="23" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <polygon
          points="13,3 23,13 13,23 3,13"
          fill={gradUrl}
          fillOpacity={interactive ? 0.28 : 0.16}
          stroke={gradUrl}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <polygon
          points="13,9 17,13 13,17 9,13"
          fill={gradUrl}
          stroke="#FFFFFF"
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (styleId === 'aero-glass-arrow' || styleId === 'pilot-badge') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 26 26"
        fill="none"
        data-glass-icon="true"
        style={{ filter: `drop-shadow(0 3px 6px rgba(0,0,0,${isDark ? '0.55' : '0.24'}))` }}
      >
        <defs>
          <linearGradient id={gradId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <path
          d="M4.2 3.2L20.5 11.8L13.1 14L10.3 21.4L4.2 3.2Z"
          fill={gradUrl}
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        {interactive && styleId === 'aero-glass-arrow' && (
          <circle cx="14.5" cy="14.5" r="2.2" fill="#FFFFFF" fillOpacity="0.9" />
        )}
      </svg>
    );
  }

  if (styleId === 'stealth-delta') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 26 26"
        fill="none"
        data-glass-icon="true"
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.28))' }}
      >
        <defs>
          <linearGradient id={gradId} x1="3" y1="3" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <path
          d="M3.5 3L21 12.2L12.6 13.5L3.5 3Z"
          fill={secondary}
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M3.5 3L12.6 13.5L10.2 21.8L3.5 3Z"
          fill={gradUrl}
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {interactive && (
          <circle cx="3.5" cy="3" r="2.4" fill="#FFFFFF" stroke={primary} strokeWidth="1.2" />
        )}
      </svg>
    );
  }

  if (styleId === 'micro-drone') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        data-glass-icon="true"
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
      >
        <defs>
          <linearGradient id={gradId} x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <circle cx="5.5" cy="5.5" r="3" fill={gradUrl} fillOpacity={interactive ? 0.45 : 0.26} stroke={gradUrl} strokeWidth="1.5" />
        <circle cx="18.5" cy="5.5" r="3" fill={gradUrl} fillOpacity={interactive ? 0.45 : 0.26} stroke={gradUrl} strokeWidth="1.5" />
        <circle cx="5.5" cy="18.5" r="3" fill={gradUrl} fillOpacity={interactive ? 0.45 : 0.26} stroke={gradUrl} strokeWidth="1.5" />
        <circle cx="18.5" cy="18.5" r="3" fill={gradUrl} fillOpacity={interactive ? 0.45 : 0.26} stroke={gradUrl} strokeWidth="1.5" />
        <path d="M7.5 7.5L10 10M16.5 7.5L14 10M7.5 16.5L10 14M16.5 16.5L14 14" stroke={gradUrl} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.7" fill={gradUrl} stroke="#FFFFFF" strokeWidth="1" />
      </svg>
    );
  }

  if (styleId === 'hud-reticle') {
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none" data-glass-icon="true">
        <defs>
          <linearGradient id={gradId} x1="2" y1="2" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <circle
          cx="13"
          cy="13"
          r={interactive ? 9.5 : 7.5}
          stroke={gradUrl}
          strokeWidth="1.6"
          fill={gradUrl}
          fillOpacity={interactive ? 0.16 : 0.06}
        />
        <path
          d="M13 1.5v4M13 20.5v4M1.5 13h4M20.5 13h4"
          stroke={gradUrl}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="13" cy="13" r="2.2" fill={primary} stroke="#FFFFFF" strokeWidth="1" />
      </svg>
    );
  }

  if (styleId === 'obsidian-neon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 26 26"
        fill="none"
        data-glass-icon="true"
        style={{ filter: `drop-shadow(0 0 6px ${primary}66)` }}
      >
        <defs>
          <linearGradient id={gradId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <path
          d="M4.2 3.2L20.5 11.8L13.1 14L10.3 21.4L4.2 3.2Z"
          fill="#09090B"
          stroke={gradUrl}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="9.6" cy="10.4" r="1.5" fill={gradUrl} />
      </svg>
    );
  }

  if (styleId === 'frosted-dot') {
    return (
      <svg width={size} height={size} viewBox="0 0 26 26" fill="none" data-glass-icon="true">
        <defs>
          <linearGradient id={gradId} x1="4" y1="4" x2="22" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <circle
          cx="13"
          cy="13"
          r={interactive ? 10.5 : 8.5}
          fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.65)'}
          stroke={gradUrl}
          strokeWidth="1.5"
        />
        <circle cx="13" cy="13" r={down ? 4.5 : 3.2} fill={gradUrl} />
      </svg>
    );
  }

  if (styleId === 'cyber-blade') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        data-glass-icon="true"
        style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.22))' }}
      >
        <defs>
          <linearGradient id={gradId} x1="3" y1="3" x2="20" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primary} />
            <stop offset="100%" stopColor={secondary} />
          </linearGradient>
        </defs>
        <path
          d="M3.5 3L19.5 10.5L13 13L10.5 19.5L3.5 3Z"
          fill={isDark ? '#F4F4F5' : '#18181B'}
          stroke={gradUrl}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M3.5 3L12.8 12.8" stroke={secondary} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }

  // laser-needle
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      data-glass-icon="true"
      style={{ filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.22))' }}
    >
      <defs>
        <linearGradient id={gradId} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={primary} />
          <stop offset="100%" stopColor={secondary} />
        </linearGradient>
      </defs>
      <path
        d="M5 5L19.5 12.2L13.4 14.3L11.4 20.4L5 5Z"
        fill={isDark ? '#27272A' : '#FFFFFF'}
        stroke={gradUrl}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="5" r={interactive ? 3 : 2.2} fill={secondary} stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}
