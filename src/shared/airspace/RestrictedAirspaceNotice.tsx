import { Alert, Chip, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  evaluateFootprintNoFlyOverlap,
  getRestrictedAirspaceSummary,
} from './airspaceZones';

interface RestrictedAirspaceChipProps {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  sx?: SxProps<Theme>;
}

export function RestrictedAirspaceChip({
  latitude,
  longitude,
  sx,
}: RestrictedAirspaceChipProps) {
  const { locale } = useLocale();
  const restricted = getRestrictedAirspaceSummary(latitude, longitude);
  if (!restricted) return null;

  const label = locale === 'vi' ? 'Vùng hạn chế bay' : 'Restricted Zone';

  return (
    <Chip
      size="small"
      color="warning"
      variant="outlined"
      icon={<WarningAmberRoundedIcon fontSize="small" />}
      label={label}
      sx={[
        { height: 22, fontSize: '0.75rem', fontWeight: 700, borderRadius: '6px' },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}

interface NoFlyFootprintAlertProps {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  footprintAreaSquareMeters: number | null | undefined;
  sx?: SxProps<Theme>;
}

export function NoFlyFootprintAlert({
  latitude,
  longitude,
  footprintAreaSquareMeters,
  sx,
}: NoFlyFootprintAlertProps) {
  const { locale } = useLocale();
  const overlap = evaluateFootprintNoFlyOverlap(latitude, longitude, footprintAreaSquareMeters);
  if (!overlap) return null;

  const headline =
    locale === 'vi'
      ? `Cảnh báo phạm vi giáp vùng cấm bay: ${overlap.zoneName}`
      : `Perimeter overlap warning: ${overlap.zoneName}`;
  const message =
    locale === 'vi'
      ? `Cảnh báo giao cắt vùng cấm: Điểm ghim chỉ cách ranh giới "${overlap.zoneName}" ${overlap.edgeDistanceMeters} m, nên rìa công trình (bán kính ~${overlap.footprintRadiusMeters} m) chạm khoảng ~${overlap.overlapMeters} m vào vùng cấm bay. Phần lấn vùng cấm tuyệt đối không được phép bay.`
      : `No-Fly overlap warning: Pinned point is ${overlap.edgeDistanceMeters} m from "${overlap.zoneName}", so the perimeter (est. radius ~${overlap.footprintRadiusMeters} m) overlaps ~${overlap.overlapMeters} m into the No-Fly Zone. Only portions outside the No-Fly boundary can be flown.`;

  return (
    <Alert
      severity="error"
      sx={[{ borderRadius: '10px' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {headline}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.dark' }}>
          {message}
        </Typography>
      </Stack>
    </Alert>
  );
}
