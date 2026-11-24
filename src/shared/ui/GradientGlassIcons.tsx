import { useId, type ReactNode, type SVGProps } from 'react';
import { Box, type SxProps, type Theme } from '@mui/material';
import { useIsDarkMode } from '@/app/layouts/ColorModeContext';

export type GlassTone = 'blue' | 'cyan' | 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate';

export const GLASS_TONES: Record<
  GlassTone,
  { g1: string; g2: string; lightColor: string; darkColor: string }
> = {
  blue: { g1: '#3758F9', g2: '#38BDF8', lightColor: '#3758F9', darkColor: '#5B7BFF' },
  cyan: { g1: '#0284C7', g2: '#2DD4BF', lightColor: '#0891B2', darkColor: '#22D3EE' },
  emerald: { g1: '#059669', g2: '#34D399', lightColor: '#15803D', darkColor: '#4ADE80' },
  amber: { g1: '#D97706', g2: '#FBBF24', lightColor: '#B45309', darkColor: '#FBBF24' },
  indigo: { g1: '#4F46E5', g2: '#A78BFA', lightColor: '#4F46E5', darkColor: '#818CF8' },
  rose: { g1: '#E11D48', g2: '#FB7185', lightColor: '#DC2626', darkColor: '#F87171' },
  slate: { g1: '#475569', g2: '#94A3B8', lightColor: '#52525B', darkColor: '#A1A1AA' },
};

export interface GlassIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function useGlassGrad(tone: GlassTone): { id: string; url: string; t: (typeof GLASS_TONES)[GlassTone] } {
  const uid = useId().replace(/:/g, '');
  const id = `sdi-glass-${tone}-${uid}`;
  return { id, url: `url(#${id})`, t: GLASS_TONES[tone] };
}

function GlassSvg({
  size = 18,
  tone,
  children,
  ...rest
}: Omit<GlassIconProps, 'children'> & {
  tone: GlassTone;
  children: (gradUrl: string, gradId: string) => ReactNode;
}) {
  const { id, url, t } = useGlassGrad(tone);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-glass-icon="true"
      {...rest}
    >
      <defs>
        <linearGradient id={id} x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={t.g1} />
          <stop offset="100%" stopColor={t.g2} />
        </linearGradient>
      </defs>
      {children(url, id)}
    </svg>
  );
}

/**
 * Global hidden SVG gradient definitions used by CSS overrides on MUI material icons
 * so all secondary/utility MUI icons inherit Style 5 Gradient Glass tones consistently.
 */
export function GlassIconGradientDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="sdi-glass-blue" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3758F9" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
        <linearGradient id="sdi-glass-cyan" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
        <linearGradient id="sdi-glass-emerald" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <linearGradient id="sdi-glass-amber" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <linearGradient id="sdi-glass-indigo" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <linearGradient id="sdi-glass-rose" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#FB7185" />
        </linearGradient>
        <linearGradient id="sdi-glass-neutral-light" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#27272A" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="sdi-glass-neutral-dark" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F4F4F5" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export interface GlassIconBadgeProps {
  children: ReactNode;
  size?: number;
  borderRadius?: string | number;
  muted?: boolean;
  tone?: GlassTone;
  sx?: SxProps<Theme>;
}

/**
 * Style 5 Gradient Glass container tile (squircle glass highlight + subtle depth shadow).
 */
export function GlassIconBadge({
  children,
  size = 40,
  borderRadius = '12px',
  muted = false,
  tone = 'blue',
  sx,
}: GlassIconBadgeProps) {
  const isDark = useIsDarkMode();
  const toneInfo = GLASS_TONES[tone];

  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size,
        height: size,
        borderRadius,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        position: 'relative',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(24, 24, 27, 0.08)',
        color: muted
          ? 'text.secondary'
          : isDark
            ? toneInfo.darkColor
            : toneInfo.lightColor,
        background: muted
          ? isDark
            ? 'rgba(255, 255, 255, 0.03)'
            : '#F9FAFB'
          : isDark
            ? 'linear-gradient(145deg, #22232A, #17171C)'
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.94), #F3F4F6)',
        boxShadow: muted
          ? 'none'
          : isDark
            ? 'inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 6px 16px rgba(0, 0, 0, 0.45)'
            : 'inset 0 1px 0 rgba(255, 255, 255, 0.72), 0 4px 12px rgba(24, 24, 27, 0.08)',
        opacity: muted ? 0.78 : 1,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/* ============================================================================
 * 14 Core Domain Icons — Style 5: Gradient Glass (from icon-styles-preview.html)
 * ========================================================================== */

export function GlassDashboardIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <rect x="3.5" y="3.5" width="7.8" height="9.5" rx="2.4" fill={g} />
          <rect x="12.7" y="3.5" width="7.8" height="5.5" rx="2.2" fill={g} fillOpacity="0.32" stroke={g} strokeWidth="1.2" />
          <rect x="12.7" y="10.8" width="7.8" height="9.7" rx="2.4" fill={g} />
          <rect x="3.5" y="14.8" width="7.8" height="5.7" rx="2.2" fill={g} fillOpacity="0.32" stroke={g} strokeWidth="1.2" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassDroneIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="cyan" {...props}>
      {(g) => (
        <>
          <circle cx="6" cy="6" r="2.9" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.3" />
          <circle cx="18" cy="6" r="2.9" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.3" />
          <circle cx="6" cy="18" r="2.9" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.3" />
          <circle cx="18" cy="18" r="2.9" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.3" />
          <path d="M8 8l2 2M16 8l-2 2M8 16l2-2M16 16l-2-2" stroke={g} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="9.2" y="9.2" width="5.6" height="5.6" rx="1.8" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassPermitIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <path d="M12 3L19.2 5.9v5.7c0 4.5-3 8.1-7.2 9.5C7.8 19.7 4.8 16.1 4.8 11.6V5.9L12 3Z" fill={g} fillOpacity="0.24" stroke={g} strokeWidth="1.5" />
          <path d="M9 12.2l2 2 4.2-4.2" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassInspectionIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="indigo" {...props}>
      {(g) => (
        <>
          <circle cx="12" cy="12" r="7.8" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3.4" fill={g} />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke={g} strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassAiFindingsIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="indigo" {...props}>
      {(g) => (
        <>
          <path d="M4.5 8.5V6a1.5 1.5 0 0 1 1.5-1.5h2.5M15.5 4.5H18A1.5 1.5 0 0 1 19.5 6v2.5M19.5 15.5V18a1.5 1.5 0 0 1-1.5 1.5h-2.5M8.5 19.5H6A1.5 1.5 0 0 1 4.5 18v-2.5" stroke={g} strokeWidth="1.8" strokeLinecap="round" />
          <rect x="7.5" y="8" width="9" height="8" rx="2" fill={g} />
          <path d="M7.5 12h9" stroke="#fff" strokeOpacity="0.85" strokeWidth="1.5" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassReportIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <path d="M6.5 3.5h7.3L18.5 8.2v11.3a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19.5V5a1.5 1.5 0 0 1 1.5-1.5Z" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" />
          <path d="M14 3.5V8h4.5" stroke={g} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8.8 13.5l1.9 1.9 4.3-4.4" stroke={g} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassPaymentIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="emerald" {...props}>
      {(g) => (
        <>
          <rect x="3" y="5.5" width="18" height="13" rx="2.8" fill={g} fillOpacity="0.24" stroke={g} strokeWidth="1.5" />
          <path d="M3 10h18" stroke={g} strokeWidth="1.6" />
          <rect x="6.5" y="13.2" width="5" height="2" rx="1" fill={g} />
          <rect x="14.5" y="12.5" width="3.5" height="3.5" rx="0.8" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassWarningIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="amber" {...props}>
      {(g) => (
        <>
          <path d="M10.4 4.3L3.5 16.5A1.9 1.9 0 0 0 5.1 19.3h13.8a1.9 1.9 0 0 0 1.6-2.8L13.6 4.3a1.9 1.9 0 0 0-3.2 0Z" fill={g} fillOpacity="0.25" stroke={g} strokeWidth="1.5" />
          <path d="M12 9.2v4.1" stroke={g} strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassAirspaceIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="rose" {...props}>
      {(g) => (
        <>
          <circle cx="12" cy="12" r="8.5" fill={g} fillOpacity="0.20" stroke={g} strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4.5" fill={g} fillOpacity="0.30" stroke={g} strokeWidth="1.3" />
          <path d="M12 12l5.5-5.5" stroke={g} strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1.5" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassAssetIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <path d="M4.5 20V5.5A1.5 1.5 0 0 1 6 4h8a1.5 1.5 0 0 1 1.5 1.5V20" fill={g} fillOpacity="0.24" stroke={g} strokeWidth="1.5" />
          <path d="M15.5 9.5H18A1.5 1.5 0 0 1 19.5 11v9" fill={g} fillOpacity="0.14" stroke={g} strokeWidth="1.5" />
          <path d="M2.5 20h19M8 8.5h4M8 12h4M8 15.5h4" stroke={g} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassContractIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="cyan" {...props}>
      {(g) => (
        <>
          <path d="M6 4h9l4 4v11.5a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19.5v-14A1.5 1.5 0 0 1 6 4Z" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" />
          <path d="M15 4v4h4M8 11.5h7.5M8 15h4.5" stroke={g} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="15.8" cy="16.5" r="1.6" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassScheduleIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.6" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" />
          <path d="M3.5 9.8h17M8 3v3.2M16 3v3.2" stroke={g} strokeWidth="1.7" strokeLinecap="round" />
          <rect x="7.5" y="12.8" width="3.8" height="3.2" rx="0.9" fill={g} />
          <rect x="13" y="12.8" width="3.8" height="3.2" rx="0.9" fill={g} fillOpacity="0.45" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassChatIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="cyan" {...props}>
      {(g) => (
        <>
          <path d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v7.5A2.5 2.5 0 0 1 17 16.5H10l-4.2 3.2a.6.6 0 0 1-.9-.5V16.4A2.5 2.5 0 0 1 4.5 14V6.5Z" fill={g} fillOpacity="0.24" stroke={g} strokeWidth="1.5" />
          <path d="M8.5 9.3h7M8.5 12.3h4.5" stroke={g} strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassBellIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="amber" {...props}>
      {(g) => (
        <>
          <path d="M17.5 10a5.5 5.5 0 0 0-11 0c0 3.2-1.3 5-2.2 6h15.4c-.9-1-2.2-2.8-2.2-6Z" fill={g} fillOpacity="0.25" stroke={g} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9.8 18.5a2.4 2.4 0 0 0 4.4 0M12 3.2V4.5" stroke={g} strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

/* ============================================================================
 * Shell, Settings & Utility Icons — Style 5: Gradient Glass
 * ========================================================================== */

export function GlassSidebarToggleIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" fill={g} fillOpacity="0.16" stroke={g} strokeWidth="1.5" />
          <rect x="3" y="4" width="6.5" height="16" rx="2.5" fill={g} fillOpacity="0.32" stroke={g} strokeWidth="1.4" />
          <path d="M13 9.5h4.5M13 13.5h3.2" stroke={g} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassSearchIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <circle cx="10.8" cy="10.8" r="6.8" fill={g} fillOpacity="0.20" stroke={g} strokeWidth="1.6" />
          <path d="M16 16l4.2 4.2" stroke={g} strokeWidth="1.9" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassSunIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="amber" {...props}>
      {(g) => (
        <>
          <circle cx="12" cy="12" r="4.6" fill={g} fillOpacity="0.32" stroke={g} strokeWidth="1.6" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" stroke={g} strokeWidth="1.7" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassMoonIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="indigo" {...props}>
      {(g) => (
        <path d="M19.4 13.8A7.6 7.6 0 0 1 10.2 4.6a7.8 7.8 0 1 0 9.2 9.2Z" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.6" strokeLinejoin="round" />
      )}
    </GlassSvg>
  );
}

export function GlassPaletteIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="indigo" {...props}>
      {(g) => (
        <>
          <path d="M12 3.2a8.8 8.8 0 0 0 0 17.6c1.2 0 1.9-.8 1.9-1.8 0-.5-.2-.9-.5-1.3-.3-.4-.4-.7-.4-1.2 0-1 .8-1.8 1.8-1.8h2c2.2 0 4-1.8 4-4 0-4.2-4-7.5-8.8-7.5Z" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" />
          <circle cx="8" cy="10.2" r="1.3" fill={g} />
          <circle cx="11.5" cy="7.5" r="1.3" fill={g} />
          <circle cx="15.5" cy="9.5" r="1.3" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassUserIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <circle cx="12" cy="7.5" r="3.6" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.5" />
          <path d="M5 19.2c0-3 3.1-5.2 7-5.2s7 2.2 7 5.2" fill={g} fillOpacity="0.20" stroke={g} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassUsersIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="cyan" {...props}>
      {(g) => (
        <>
          <circle cx="9.2" cy="7.8" r="3.2" fill={g} fillOpacity="0.28" stroke={g} strokeWidth="1.5" />
          <path d="M3.5 18.8c0-2.6 2.5-4.6 5.7-4.6s5.7 2 5.7 4.6" fill={g} fillOpacity="0.20" stroke={g} strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15.4 5.4a2.7 2.7 0 0 1 0 5.2M17.2 14.5c2 .6 3.3 2 3.3 3.8" stroke={g} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassSecurityIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="emerald" {...props}>
      {(g) => (
        <>
          <rect x="4.5" y="10.2" width="15" height="10.3" rx="2.6" fill={g} fillOpacity="0.24" stroke={g} strokeWidth="1.5" />
          <path d="M8 10.2V7.6a4 4 0 0 1 8 0v2.6" stroke={g} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="12" cy="15.3" r="1.5" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassSettingsIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="indigo" {...props}>
      {(g) => (
        <>
          <path d="M4.5 7.5h15M4.5 16.5h15" stroke={g} strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="9" cy="7.5" r="2.6" fill={g} fillOpacity="0.32" stroke={g} strokeWidth="1.5" />
          <circle cx="15" cy="16.5" r="2.6" fill={g} fillOpacity="0.32" stroke={g} strokeWidth="1.5" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassChartsIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="indigo" {...props}>
      {(g) => (
        <>
          <circle cx="12" cy="12" r="8.5" fill={g} fillOpacity="0.20" stroke={g} strokeWidth="1.5" />
          <path d="M12 3.5V12l6 6" stroke={g} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 12h8.5" stroke={g} strokeWidth="1.5" strokeLinecap="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassChecklistIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="emerald" {...props}>
      {(g) => (
        <>
          <rect x="4" y="3.5" width="16" height="17" rx="2.8" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" />
          <path d="M8 9.2l1.6 1.6 3.2-3.2M8 14.8h8" stroke={g} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassCatalogIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="cyan" {...props}>
      {(g) => (
        <>
          <path d="M12 3.5L20 7.8v8.4L12 20.5 4 16.2V7.8L12 3.5Z" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M4 7.8l8 4.4 8-4.4M12 12.2v8.3" stroke={g} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassChevronDownIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="slate" {...props}>
      {(g) => (
        <path d="M6.5 9.5L12 15l5.5-5.5" stroke={g} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </GlassSvg>
  );
}

export function GlassTrendUpIcon({ size = 16, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="emerald" {...props}>
      {(g) => (
        <path d="M6 17L17 6M17 6H8.5M17 6v8.5" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </GlassSvg>
  );
}

export function GlassTrendDownIcon({ size = 16, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="rose" {...props}>
      {(g) => (
        <path d="M6 7l11 11M17 18H8.5M17 18V9.5" stroke={g} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </GlassSvg>
  );
}

export function GlassDotsIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="slate" {...props}>
      {(g) => (
        <>
          <circle cx="5.5" cy="12" r="1.9" fill={g} />
          <circle cx="12" cy="12" r="1.9" fill={g} />
          <circle cx="18.5" cy="12" r="1.9" fill={g} />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassInboxIcon({ size = 20, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="blue" {...props}>
      {(g) => (
        <>
          <path d="M4.5 13l2.2-6.8A1.8 1.8 0 0 1 8.4 5h7.2a1.8 1.8 0 0 1 1.7 1.2L19.5 13v5a1.8 1.8 0 0 1-1.8 1.8H6.3A1.8 1.8 0 0 1 4.5 18v-5Z" fill={g} fillOpacity="0.22" stroke={g} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M4.5 13h4.2l1.3 2.1h4l1.3-2.1h4.2" stroke={g} strokeWidth="1.5" strokeLinejoin="round" />
        </>
      )}
    </GlassSvg>
  );
}

export function GlassSwapIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="cyan" {...props}>
      {(g) => (
        <path d="M7 8h11m0 0-3-3m3 3-3 3M17 16H6m0 0 3-3m-3 3 3 3" stroke={g} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </GlassSvg>
  );
}

export function GlassLogoutIcon({ size = 18, ...props }: GlassIconProps) {
  return (
    <GlassSvg size={size} tone="rose" {...props}>
      {(g) => (
        <>
          <path d="M10 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H10" stroke={g} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M10 12h9.5m0 0-3.2-3.2M19.5 12l-3.2 3.2" stroke={g} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </GlassSvg>
  );
}
