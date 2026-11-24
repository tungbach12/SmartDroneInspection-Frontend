export type ThemePresetId =
  | 'default'
  | 'aero-teal'
  | 'emerald-field'
  | 'cobalt-sky'
  | 'slate-steel'
  | 'amber-horizon';

export type BackgroundSource = 'default' | 'preset' | 'custom';
export type BackgroundTarget = 'both' | 'sidebar' | 'workspace';

export interface ThemePresetDefinition {
  id: ThemePresetId;
  labelEn: string;
  labelVi: string;
  primary: string;
  primaryDark: string;
  primaryLight: string;
  primarySoft: string;
  lightCanvas: string;
  lightSurface: string;
  darkCanvas: string;
  darkSurface: string;
  darkInset: string;
}

export interface BackgroundPresetDefinition {
  id: string;
  labelEn: string;
  labelVi: string;
  imageUrl: string;
  category: 'abstract' | 'aerial';
}

export interface UserThemePreferences {
  presetId: ThemePresetId;
  backgroundSource: BackgroundSource;
  backgroundPresetId: string | null;
  customBackgroundDataUrl: string | null;
  customBackgroundName: string | null;
  backgroundTarget: BackgroundTarget;
  surfaceOpacity: number;
}

export const THEME_PRESETS: readonly ThemePresetDefinition[] = [
  {
    id: 'default',
    labelEn: 'Default Indigo',
    labelVi: 'Mặc định (Indigo)',
    primary: '#3758F9',
    primaryDark: '#2237EE',
    primaryLight: '#06B6D4',
    primarySoft: '#EFF3FF',
    lightCanvas: '#F4F4F5',
    lightSurface: '#FFFFFF',
    darkCanvas: '#09090B',
    darkSurface: '#18181B',
    darkInset: '#111827',
  },
  {
    id: 'aero-teal',
    labelEn: 'Aero Teal',
    labelVi: 'Xanh Aero Teal',
    primary: '#087E8B',
    primaryDark: '#06626C',
    primaryLight: '#22D3EE',
    primarySoft: '#ECFEFF',
    lightCanvas: '#EDF5F6',
    lightSurface: '#FFFFFF',
    darkCanvas: '#071216',
    darkSurface: '#102026',
    darkInset: '#0B191F',
  },
  {
    id: 'emerald-field',
    labelEn: 'Emerald Ops',
    labelVi: 'Xanh Emerald',
    primary: '#15803D',
    primaryDark: '#166534',
    primaryLight: '#34D399',
    primarySoft: '#ECFDF5',
    lightCanvas: '#EEF5F0',
    lightSurface: '#FFFFFF',
    darkCanvas: '#07140D',
    darkSurface: '#102118',
    darkInset: '#0B1A12',
  },
  {
    id: 'cobalt-sky',
    labelEn: 'Cobalt Sky',
    labelVi: 'Xanh Cobalt',
    primary: '#0284C7',
    primaryDark: '#0369A1',
    primaryLight: '#38BDF8',
    primarySoft: '#F0F9FF',
    lightCanvas: '#EEF5FA',
    lightSurface: '#FFFFFF',
    darkCanvas: '#08111D',
    darkSurface: '#111E2F',
    darkInset: '#0C1625',
  },
  {
    id: 'slate-steel',
    labelEn: 'Industrial Slate',
    labelVi: 'Xám Thép (Slate)',
    primary: '#334155',
    primaryDark: '#1E293B',
    primaryLight: '#94A3B8',
    primarySoft: '#F1F5F9',
    lightCanvas: '#F1F5F9',
    lightSurface: '#FFFFFF',
    darkCanvas: '#0B0F17',
    darkSurface: '#161D2B',
    darkInset: '#111722',
  },
  {
    id: 'amber-horizon',
    labelEn: 'Safety Amber',
    labelVi: 'Vàng Hổ Phách',
    primary: '#B45309',
    primaryDark: '#92400E',
    primaryLight: '#F59E0B',
    primarySoft: '#FFFBEB',
    lightCanvas: '#F6F3EE',
    lightSurface: '#FFFFFF',
    darkCanvas: '#14100A',
    darkSurface: '#211B12',
    darkInset: '#19140D',
  },
] as const;

export const BACKGROUND_PRESETS: readonly BackgroundPresetDefinition[] = [
  {
    id: 'teal-mesh',
    labelEn: 'Aero Teal Mesh',
    labelVi: 'Nền Aero Teal',
    imageUrl: '/images/landing/teal-soft-dark-v1.png',
    category: 'abstract',
  },
  {
    id: 'blueprint-pattern',
    labelEn: 'Technical Grid',
    labelVi: 'Họa tiết kỹ thuật',
    imageUrl: '/images/auth/auth-bg-pattern.jpg',
    category: 'abstract',
  },
  {
    id: 'carbon-surface',
    labelEn: 'Carbon Texture',
    labelVi: 'Bề mặt Carbon',
    imageUrl: '/images/landing/panel-texture.jpg',
    category: 'abstract',
  },
  {
    id: 'flight-mission',
    labelEn: 'Flight Mission',
    labelVi: 'Nhiệm vụ bay',
    imageUrl: '/images/landing/flight-mission-plan.jpg',
    category: 'aerial',
  },
  {
    id: 'hero-asset',
    labelEn: 'Aerial Infrastructure',
    labelVi: 'Hạ tầng trên cao',
    imageUrl: '/images/landing/hero-asset.jpg',
    category: 'aerial',
  },
  {
    id: 'drone-sunset',
    labelEn: 'Golden Hour Flight',
    labelVi: 'Hoàng hôn bay',
    imageUrl: '/images/auth/real-drone-sunset.jpg',
    category: 'aerial',
  },
] as const;

export const DEFAULT_USER_THEME_PREFERENCES: UserThemePreferences = {
  presetId: 'default',
  backgroundSource: 'default',
  backgroundPresetId: null,
  customBackgroundDataUrl: null,
  customBackgroundName: null,
  backgroundTarget: 'both',
  surfaceOpacity: 0.88,
};

export const THEME_STORAGE_KEY_PREFIX = 'sdi_custom_theme_v1';
export const MAX_BACKGROUND_FILE_BYTES = 5 * 1024 * 1024;
const COMPRESS_THRESHOLD_BYTES = 350 * 1024;
const MAX_UPLOAD_DIMENSION = 1920;

export function getUserThemeStorageKey(userId: string | null | undefined): string {
  const scope = userId && userId.trim().length > 0 ? userId.trim() : 'guest';
  return `${THEME_STORAGE_KEY_PREFIX}:${scope}`;
}

export function getThemePreset(presetId: ThemePresetId): ThemePresetDefinition {
  return THEME_PRESETS.find((preset) => preset.id === presetId) ?? THEME_PRESETS[0]!;
}

export function getBackgroundPreset(
  backgroundPresetId: string | null,
): BackgroundPresetDefinition | null {
  if (!backgroundPresetId) return null;
  return BACKGROUND_PRESETS.find((preset) => preset.id === backgroundPresetId) ?? null;
}

export function resolveActiveBackgroundUrl(prefs: UserThemePreferences): string | null {
  if (prefs.backgroundSource === 'default') return null;
  if (prefs.backgroundSource === 'preset') {
    return getBackgroundPreset(prefs.backgroundPresetId)?.imageUrl ?? null;
  }
  if (prefs.backgroundSource === 'custom') {
    return prefs.customBackgroundDataUrl || null;
  }
  return null;
}

export function clampSurfaceOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_USER_THEME_PREFERENCES.surfaceOpacity;
  return Math.min(0.96, Math.max(0.72, Math.round(value * 100) / 100));
}

function isValidThemePresetId(value: unknown): value is ThemePresetId {
  return typeof value === 'string' && THEME_PRESETS.some((preset) => preset.id === value);
}

function isValidBackgroundSource(value: unknown): value is BackgroundSource {
  return value === 'default' || value === 'preset' || value === 'custom';
}

function isValidBackgroundTarget(value: unknown): value is BackgroundTarget {
  return value === 'both' || value === 'sidebar' || value === 'workspace';
}

export function sanitizeThemePreferences(raw: unknown): UserThemePreferences {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_USER_THEME_PREFERENCES };
  }
  const obj = raw as Record<string, unknown>;
  const presetId = isValidThemePresetId(obj.presetId)
    ? obj.presetId
    : DEFAULT_USER_THEME_PREFERENCES.presetId;
  const backgroundSource = isValidBackgroundSource(obj.backgroundSource)
    ? obj.backgroundSource
    : DEFAULT_USER_THEME_PREFERENCES.backgroundSource;
  const backgroundPresetId =
    typeof obj.backgroundPresetId === 'string' && getBackgroundPreset(obj.backgroundPresetId)
      ? obj.backgroundPresetId
      : null;
  const customBackgroundDataUrl =
    typeof obj.customBackgroundDataUrl === 'string' &&
    obj.customBackgroundDataUrl.startsWith('data:image/')
      ? obj.customBackgroundDataUrl
      : null;
  const customBackgroundName =
    typeof obj.customBackgroundName === 'string' && obj.customBackgroundName.trim().length > 0
      ? obj.customBackgroundName.trim().slice(0, 120)
      : null;
  const backgroundTarget = isValidBackgroundTarget(obj.backgroundTarget)
    ? obj.backgroundTarget
    : DEFAULT_USER_THEME_PREFERENCES.backgroundTarget;
  const surfaceOpacity =
    typeof obj.surfaceOpacity === 'number'
      ? clampSurfaceOpacity(obj.surfaceOpacity)
      : DEFAULT_USER_THEME_PREFERENCES.surfaceOpacity;

  const normalizedSource: BackgroundSource =
    backgroundSource === 'preset' && !backgroundPresetId
      ? 'default'
      : backgroundSource === 'custom' && !customBackgroundDataUrl
        ? 'default'
        : backgroundSource;

  return {
    presetId,
    backgroundSource: normalizedSource,
    backgroundPresetId,
    customBackgroundDataUrl,
    customBackgroundName,
    backgroundTarget,
    surfaceOpacity,
  };
}

export function readUserThemePreferences(
  userId: string | null | undefined,
): UserThemePreferences {
  try {
    const raw = window.localStorage.getItem(getUserThemeStorageKey(userId));
    if (!raw) return { ...DEFAULT_USER_THEME_PREFERENCES };
    return sanitizeThemePreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_USER_THEME_PREFERENCES };
  }
}

export function writeUserThemePreferences(
  userId: string | null | undefined,
  prefs: UserThemePreferences,
): { ok: boolean; error?: 'quota_exceeded' | 'storage_unavailable' } {
  try {
    window.localStorage.setItem(
      getUserThemeStorageKey(userId),
      JSON.stringify(sanitizeThemePreferences(prefs)),
    );
    return { ok: true };
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === 'QuotaExceededError' || error.code === 22)
    ) {
      return { ok: false, error: 'quota_exceeded' };
    }
    return { ok: false, error: 'storage_unavailable' };
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Could not read image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function compressDataUrlIfPossible(dataUrl: string, mimeType: string): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(
          1,
          MAX_UPLOAD_DIMENSION / Math.max(img.width || 1, img.height || 1),
        );
        const targetWidth = Math.max(1, Math.round((img.width || 1) * scale));
        const targetHeight = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const outputType = mimeType === 'image/png' ? 'image/webp' : 'image/jpeg';
        const compressed = canvas.toDataURL(outputType, 0.82);
        resolve(compressed.startsWith('data:image/') && compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function processBackgroundImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }
  if (file.size > MAX_BACKGROUND_FILE_BYTES) {
    throw new Error('IMAGE_TOO_LARGE');
  }
  const dataUrl = await readFileAsDataUrl(file);
  if (file.size <= COMPRESS_THRESHOLD_BYTES) {
    return dataUrl;
  }
  return compressDataUrlIfPossible(dataUrl, file.type);
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
