import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import RestartAltRounded from '@mui/icons-material/RestartAltRounded';
import { useColorMode, useIsDarkMode } from '@/app/layouts/ColorModeContext';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { NextAdminMoonIcon, NextAdminSunIcon } from '@/shared/ui/NextAdminIcons';
import {
  BACKGROUND_PRESETS,
  CURSOR_EFFECT_OPTIONS,
  CURSOR_STYLE_OPTIONS,
  DEFAULT_USER_THEME_PREFERENCES,
  THEME_PRESETS,
  type BackgroundSource,
  type BackgroundTarget,
  type CursorEffectId,
  type CursorStyleId,
} from './customTheme';
import { useCustomTheme } from './CustomThemeContext';

interface ThemeCustomizationPanelProps {
  showColorModeToggle?: boolean;
  compact?: boolean;
}

export function ThemeCustomizationPanel({
  showColorModeToggle = false,
  compact = false,
}: ThemeCustomizationPanelProps) {
  const { locale } = useLocale();
  const isVi = locale === 'vi';
  const { toggle: toggleColorMode } = useColorMode();
  const isDark = useIsDarkMode();
  const {
    preferences,
    activeBackgroundUrl,
    storageError,
    clearStorageError,
    setPresetId,
    selectDefaultBackground,
    selectBackgroundPreset,
    selectCustomBackground,
    uploadCustomBackground,
    removeCustomBackground,
    setBackgroundTarget,
    setSurfaceOpacity,
    setCursorStyle,
    setCursorEffect,
    resetToDefault,
  } = useCustomTheme();

  const [uploadPending, setUploadPending] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isCustomized =
    preferences.presetId !== DEFAULT_USER_THEME_PREFERENCES.presetId ||
    preferences.backgroundSource !== DEFAULT_USER_THEME_PREFERENCES.backgroundSource ||
    preferences.backgroundTarget !== DEFAULT_USER_THEME_PREFERENCES.backgroundTarget ||
    preferences.surfaceOpacity !== DEFAULT_USER_THEME_PREFERENCES.surfaceOpacity ||
    preferences.cursorStyle !== DEFAULT_USER_THEME_PREFERENCES.cursorStyle ||
    preferences.cursorEffect !== DEFAULT_USER_THEME_PREFERENCES.cursorEffect;

  const handleSourceChange = (
    _event: React.MouseEvent<HTMLElement>,
    nextSource: BackgroundSource | null,
  ) => {
    if (!nextSource) return;
    setUploadError(null);
    clearStorageError();
    if (nextSource === 'default') {
      selectDefaultBackground();
      return;
    }
    if (nextSource === 'preset') {
      const targetPresetId =
        preferences.backgroundPresetId ?? BACKGROUND_PRESETS[0]?.id ?? null;
      if (targetPresetId) {
        selectBackgroundPreset(targetPresetId);
      }
      return;
    }
    if (nextSource === 'custom' && preferences.customBackgroundDataUrl) {
      selectCustomBackground();
      return;
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    clearStorageError();
    setUploadPending(true);
    try {
      await uploadCustomBackground(file);
    } catch (error) {
      const code = error instanceof Error ? error.message : '';
      if (code === 'INVALID_IMAGE_TYPE') {
        setUploadError(
          isVi
            ? 'Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPEG, WEBP, GIF).'
            : 'Please select a valid image file (PNG, JPEG, WEBP, GIF).',
        );
      } else if (code === 'IMAGE_TOO_LARGE') {
        setUploadError(
          isVi
            ? 'Dung lượng ảnh nền tối đa 5 MB.'
            : 'Background image must be 5 MB or smaller.',
        );
      } else {
        setUploadError(
          isVi
            ? 'Không thể đọc tệp ảnh nền. Vui lòng thử ảnh khác.'
            : 'Could not process the selected background image.',
        );
      }
    } finally {
      setUploadPending(false);
    }
  };

  const storageMessage =
    storageError === 'IMAGE_STORAGE_QUOTA_EXCEEDED'
      ? isVi
        ? 'Ảnh quá lớn so với bộ nhớ trình duyệt. Vui lòng chọn ảnh nhẹ hơn.'
        : 'Image exceeds browser storage quota. Please try a smaller image.'
      : storageError
        ? isVi
          ? 'Không thể lưu tùy chọn giao diện vào trình duyệt.'
          : 'Could not save theme preferences to browser storage.'
        : null;

  return (
    <Stack spacing={compact ? 2 : 2.5} data-testid="theme-customization-panel">
      {showColorModeToggle && (
        <>
          <Stack
            direction="row"
            spacing={1.5}
            sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
          >
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: 'text.primary' }}>
                {isVi ? 'Chế độ sáng / tối' : 'Color mode'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isDark
                  ? isVi
                    ? 'Đang dùng giao diện tối'
                    : 'Dark mode active'
                  : isVi
                    ? 'Đang dùng giao diện sáng'
                    : 'Light mode active'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button
                variant={!isDark ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  if (isDark) toggleColorMode();
                }}
                startIcon={<NextAdminSunIcon />}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {isVi ? 'Sáng' : 'Light'}
              </Button>
              <Button
                variant={isDark ? 'contained' : 'outlined'}
                size="small"
                onClick={() => {
                  if (!isDark) toggleColorMode();
                }}
                startIcon={<NextAdminMoonIcon />}
                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
              >
                {isVi ? 'Tối' : 'Dark'}
              </Button>
            </Stack>
          </Stack>
          <Divider />
        </>
      )}

      {/* Color Theme Presets */}
      <Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'text.primary' }}>
              {isVi ? 'Bảng màu chủ đề' : 'Accent & surface theme'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isVi
                ? 'Áp dụng cho nút hành động, điểm nhấn và nền khung điều hướng.'
                : 'Applies to primary actions, active links, and shell tinting.'}
            </Typography>
          </Box>
          {isCustomized && (
            <Button
              type="button"
              size="small"
              variant="outlined"
              onClick={resetToDefault}
              startIcon={<RestartAltRounded fontSize="small" />}
              data-testid="theme-reset-default-button"
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                borderColor: 'divider',
                color: 'text.secondary',
              }}
            >
              {isVi ? 'Mặc định' : 'Reset'}
            </Button>
          )}
        </Stack>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: compact
              ? 'repeat(2, minmax(0, 1fr))'
              : { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 1,
          }}
        >
          {THEME_PRESETS.map((preset) => {
            const selected = preferences.presetId === preset.id;
            return (
              <Box
                key={preset.id}
                component="button"
                type="button"
                onClick={() => setPresetId(preset.id)}
                aria-pressed={selected}
                data-testid={`theme-preset-${preset.id}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.125,
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selected ? preset.primary : 'divider',
                  bgcolor: selected
                    ? isDark
                      ? 'rgba(255,255,255,0.06)'
                      : preset.primarySoft
                    : 'background.paper',
                  color: 'text.primary',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 140ms ease, background-color 140ms ease',
                  '&:hover': {
                    borderColor: preset.primary,
                  },
                  '&:focus-visible': {
                    outline: '2px solid',
                    outlineColor: 'primary.main',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '6px',
                    bgcolor: preset.primary,
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#FFFFFF',
                  }}
                >
                  {selected && <CheckRounded sx={{ fontSize: 14 }} />}
                </Box>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{ fontWeight: selected ? 700 : 600, color: 'text.primary', fontSize: '0.8125rem' }}
                >
                  {isVi ? preset.labelVi : preset.labelEn}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      <Divider />

      {/* Background / Wallpaper Customization */}
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: compact ? 'column' : 'row' }}
          spacing={1.25}
          sx={{
            alignItems: { sm: compact ? 'stretch' : 'center' },
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'text.primary' }}>
              {isVi ? 'Ảnh nền không gian làm việc' : 'Workspace & sidebar background'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isVi
                ? 'Dùng nền mặc định, chọn ảnh có sẵn hoặc tải ảnh của riêng bạn.'
                : 'Keep the default solid canvas, choose a built-in wallpaper, or upload your own.'}
            </Typography>
          </Box>

          <ToggleButtonGroup
            size="small"
            exclusive
            value={preferences.backgroundSource}
            onChange={handleSourceChange}
            aria-label={isVi ? 'Chế độ ảnh nền' : 'Background mode'}
            sx={{
              alignSelf: 'flex-start',
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                px: 1.25,
                py: 0.625,
                borderRadius: '8px',
              },
            }}
          >
            <ToggleButton value="default" data-testid="bg-mode-default">
              {isVi ? 'Mặc định' : 'Default'}
            </ToggleButton>
            <ToggleButton value="preset" data-testid="bg-mode-preset">
              {isVi ? 'Có sẵn' : 'Presets'}
            </ToggleButton>
            <ToggleButton
              value="custom"
              data-testid="bg-mode-custom"
              disabled={!preferences.customBackgroundDataUrl && preferences.backgroundSource !== 'custom'}
            >
              {isVi ? 'Ảnh của tôi' : 'Uploaded'}
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {(uploadError || storageMessage) && (
          <Alert severity="error" sx={{ borderRadius: '8px' }}>
            {uploadError ?? storageMessage}
          </Alert>
        )}

        {/* Built-in Preset Gallery */}
        <Box>
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 1 }}
          >
            {isVi ? 'Bộ sưu tập ảnh nền có sẵn' : 'Built-in wallpapers'}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: compact
                ? 'repeat(2, minmax(0, 1fr))'
                : { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))' },
              gap: 1.25,
            }}
          >
            {BACKGROUND_PRESETS.map((bg) => {
              const isSelected =
                preferences.backgroundSource === 'preset' &&
                preferences.backgroundPresetId === bg.id;
              return (
                <Box
                  key={bg.id}
                  component="button"
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    clearStorageError();
                    selectBackgroundPreset(bg.id);
                  }}
                  aria-pressed={isSelected}
                  data-testid={`bg-preset-${bg.id}`}
                  sx={{
                    p: 0,
                    border: '2px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    bgcolor: 'background.paper',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 140ms ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                    },
                    '&:focus-visible': {
                      outline: '2px solid',
                      outlineColor: 'primary.main',
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: 'relative',
                      height: 64,
                      backgroundImage: `url("${bg.imageUrl}")`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          width: 22,
                          height: 22,
                          borderRadius: '6px',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        <CheckRounded sx={{ fontSize: 15 }} />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ px: 1, py: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" noWrap sx={{ fontWeight: 600, display: 'block' }}>
                      {isVi ? bg.labelVi : bg.labelEn}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Custom Image Upload */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: '8px',
            border: '1px solid',
            borderColor:
              preferences.backgroundSource === 'custom' ? 'primary.main' : 'divider',
            bgcolor: 'background.default',
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: compact ? 'column' : 'row' }}
            spacing={1.5}
            sx={{ alignItems: { sm: compact ? 'stretch' : 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
              {preferences.customBackgroundDataUrl ? (
                <Box
                  component="img"
                  src={preferences.customBackgroundDataUrl}
                  alt={preferences.customBackgroundName ?? 'Uploaded background'}
                  sx={{
                    width: 56,
                    height: 40,
                    objectFit: 'cover',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: 'divider',
                    flexShrink: 0,
                  }}
                />
              ) : null}
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {isVi ? 'Tải ảnh nền từ thiết bị' : 'Upload custom wallpaper'}
                  </Typography>
                  {preferences.backgroundSource === 'custom' && (
                    <Chip
                      size="small"
                      color="primary"
                      label={isVi ? 'Đang dùng' : 'Active'}
                      sx={{ height: 20, fontSize: '0.6875rem' }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {preferences.customBackgroundName
                    ? preferences.customBackgroundName
                    : isVi
                      ? 'Hỗ trợ PNG, JPEG, WEBP; tối đa 5 MB.'
                      : 'Supports PNG, JPEG, WEBP up to 5 MB.'}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
              <Button
                type="button"
                variant="outlined"
                component="label"
                size="small"
                disabled={uploadPending}
                startIcon={<CloudUploadOutlined />}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: 'background.paper',
                }}
              >
                {uploadPending
                  ? isVi
                    ? 'Đang xử lý…'
                    : 'Processing…'
                  : preferences.customBackgroundDataUrl
                    ? isVi
                      ? 'Đổi ảnh'
                      : 'Replace'
                    : isVi
                      ? 'Tải ảnh lên'
                      : 'Upload image'}
                <input
                  type="file"
                  hidden
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  data-testid="custom-background-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    void handleFileChange(file);
                    e.target.value = '';
                  }}
                />
              </Button>
              {preferences.customBackgroundDataUrl && (
                <Button
                  type="button"
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={removeCustomBackground}
                  data-testid="remove-custom-background-button"
                  startIcon={<DeleteOutlineRounded />}
                  sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                >
                  {isVi ? 'Xóa ảnh nền' : 'Remove wallpaper'}
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        {/* Background Target & Surface Readability Controls */}
        {activeBackgroundUrl && (
          <Box
            sx={{
              p: 1.5,
              borderRadius: '8px',
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', display: 'block', mb: 0.75 }}>
                  {isVi ? 'Vùng hiển thị ảnh nền' : 'Apply background to'}
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  fullWidth
                  value={preferences.backgroundTarget}
                  onChange={(_e, nextTarget: BackgroundTarget | null) => {
                    if (nextTarget) setBackgroundTarget(nextTarget);
                  }}
                  aria-label={isVi ? 'Vùng hiển thị ảnh nền' : 'Background target area'}
                  sx={{
                    '& .MuiToggleButton-root': {
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      py: 0.5,
                    },
                  }}
                >
                  <ToggleButton value="both" data-testid="bg-target-both">
                    {isVi ? 'Cả hai' : 'Sidebar + Shell'}
                  </ToggleButton>
                  <ToggleButton value="sidebar" data-testid="bg-target-sidebar">
                    {isVi ? 'Thanh bên' : 'Sidebar only'}
                  </ToggleButton>
                  <ToggleButton value="workspace" data-testid="bg-target-workspace">
                    {isVi ? 'Khung chính' : 'Workspace only'}
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <Box>
                <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {isVi ? 'Độ phủ mờ bảo vệ chữ' : 'Surface overlay opacity'}
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(preferences.surfaceOpacity * 100)}%
                  </Typography>
                </Stack>
                <Slider
                  size="small"
                  min={0.72}
                  max={0.96}
                  step={0.02}
                  value={preferences.surfaceOpacity}
                  onChange={(_e, val) => {
                    if (typeof val === 'number') setSurfaceOpacity(val);
                  }}
                  aria-label={isVi ? 'Độ phủ mờ bảo vệ chữ' : 'Surface overlay opacity'}
                />
              </Box>
            </Stack>
          </Box>
        )}
      </Stack>

      <Divider />

      {/* Cursor Style & Effect Selectors */}
      <Stack spacing={1.75}>
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'text.primary' }}>
            {isVi ? 'Thiết kế con trỏ chuột' : 'Mouse cursor design'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {isVi
              ? 'Thay con trỏ hệ thống bằng Waypoint Diamond hoặc dùng con trỏ mặc định.'
              : 'Use the Waypoint Diamond pointer across the app or keep the OS cursor.'}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={preferences.cursorStyle}
            onChange={(_e, nextStyle: CursorStyleId | null) => {
              if (nextStyle) setCursorStyle(nextStyle);
            }}
            aria-label={isVi ? 'Thiết kế con trỏ chuột' : 'Mouse cursor design'}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '8px !important',
                border: '1px solid var(--mui-palette-divider) !important',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                px: 1.25,
                py: 0.625,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                borderColor: 'var(--mui-palette-primary-main) !important',
              },
            }}
          >
            {CURSOR_STYLE_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt.id}
                value={opt.id}
                data-testid={`cursor-style-${opt.id}`}
              >
                {isVi ? opt.labelVi : opt.labelEn}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.9375rem', color: 'text.primary' }}>
            {isVi ? 'Hiệu ứng vệt chuột' : 'Cursor trail effect'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
            {isVi
              ? 'Tự động tắt khi bật chế độ giảm chuyển động của hệ thống.'
              : 'Automatically respects system reduced-motion preferences.'}
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={preferences.cursorEffect}
            onChange={(_e, nextEffect: CursorEffectId | null) => {
              if (nextEffect) setCursorEffect(nextEffect);
            }}
            aria-label={isVi ? 'Hiệu ứng vệt chuột' : 'Cursor trail effect'}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: '8px !important',
                border: '1px solid var(--mui-palette-divider) !important',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.75rem',
                px: 1.25,
                py: 0.625,
              },
              '& .MuiToggleButton-root.Mui-selected': {
                borderColor: 'var(--mui-palette-primary-main) !important',
              },
            }}
          >
            {CURSOR_EFFECT_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt.id}
                value={opt.id}
                data-testid={`cursor-effect-${opt.id}`}
              >
                {isVi ? opt.labelVi : opt.labelEn}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </Stack>
  );
}
