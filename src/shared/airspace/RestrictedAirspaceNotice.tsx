import { Alert, Chip, Stack, Typography, type SxProps, type Theme } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  estimateFootprintRadiusMeters,
  evaluateFootprintNoFlyOverlap,
  getRestrictedAirspaceSummary,
} from './airspaceZones';

interface RestrictedAirspaceChipProps {
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  showAltitude?: boolean;
  sx?: SxProps<Theme>;
}

export function RestrictedAirspaceChip({
  latitude,
  longitude,
  showAltitude = true,
  sx,
}: RestrictedAirspaceChipProps) {
  const { locale } = useLocale();
  const restricted = getRestrictedAirspaceSummary(latitude, longitude);
  if (!restricted) return null;

  const label =
    showAltitude && restricted.maxAltitudeMetersAgl > 0
      ? locale === 'vi'
        ? `Vùng hạn chế · Trần ${restricted.maxAltitudeMetersAgl} m`
        : `Restricted Zone · Max ${restricted.maxAltitudeMetersAgl} m`
      : locale === 'vi'
        ? 'Vùng hạn chế bay'
        : 'Restricted Zone';

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

interface RestrictedAirspaceAlertProps {
  role: 'CUSTOMER' | 'MANAGER' | 'INSPECTOR';
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
  structureHeightMeters?: number | null | undefined;
  footprintAreaSquareMeters?: number | null | undefined;
  sx?: SxProps<Theme>;
}

export function RestrictedAirspaceAlert({
  role,
  latitude,
  longitude,
  structureHeightMeters,
  footprintAreaSquareMeters,
  sx,
}: RestrictedAirspaceAlertProps) {
  const { locale } = useLocale();
  const restricted = getRestrictedAirspaceSummary(latitude, longitude);
  const footprintOverlap = evaluateFootprintNoFlyOverlap(
    latitude,
    longitude,
    footprintAreaSquareMeters,
  );
  if (!restricted && !footprintOverlap) return null;

  const footprintRadiusMeters = Math.round(
    estimateFootprintRadiusMeters(footprintAreaSquareMeters),
  );
  const exceedsCeiling =
    restricted != null &&
    typeof structureHeightMeters === 'number' &&
    !Number.isNaN(structureHeightMeters) &&
    restricted.maxAltitudeMetersAgl > 0 &&
    structureHeightMeters > restricted.maxAltitudeMetersAgl;

  const headline = restricted
    ? locale === 'vi'
      ? `Vùng hạn chế bay: ${restricted.zoneName} (Trần bay ${restricted.maxAltitudeMetersAgl} m AGL)`
      : `Restricted airspace: ${restricted.zoneName} (Max ceiling ${restricted.maxAltitudeMetersAgl} m AGL)`
    : locale === 'vi'
      ? `Cảnh báo phạm vi giáp vùng cấm bay: ${footprintOverlap!.zoneName}`
      : `Perimeter overlap warning: ${footprintOverlap!.zoneName}`;

  const roleGuidance = !restricted
    ? null
    : (() => {
        if (locale === 'vi') {
          if (role === 'CUSTOMER') {
            return `Tài sản vẫn được tạo, nhưng mọi chuyến bay cần giấy phép bay từ ${restricted.authority}. Khi bạn gửi yêu cầu kiểm định, Manager sẽ điều phối Inspector đi xin giấy phép; nếu không xin được phép, Manager có thể hủy lịch.`;
          }
          if (role === 'MANAGER') {
            return `Công trình nằm trong vùng hạn chế do ${restricted.authority} quản lý. Khi điều phối, Inspector sẽ chịu trách nhiệm xin giấy phép bay vùng hạn chế; nếu không xin được giấy phép, bạn có thể phân công lại hoặc hủy yêu cầu/chuyến bay.`;
          }
          return `Công trình nằm trong vùng hạn chế do ${restricted.authority} quản lý. Vui lòng kiểm tra khả năng xin giấy phép bay (trần tối đa ${restricted.maxAltitudeMetersAgl} m): nếu xin được thì nhận nhiệm vụ và tải giấy phép, nếu không xin được hãy từ chối để Manager hủy hoặc phân công lại.`;
        }
        if (role === 'CUSTOMER') {
          return `This asset is allowed, but flights require aviation authorization from ${restricted.authority}. When you request an inspection, the Manager will assign an Inspector to obtain the restricted-zone permit; if a permit cannot be granted, the Manager may cancel the dispatch.`;
        }
        if (role === 'MANAGER') {
          return `This asset sits in restricted airspace overseen by ${restricted.authority}. When dispatched, the assigned Inspector must request the flight permit; if it cannot be obtained, you may reassign or cancel the request/flight.`;
        }
        return `This asset sits in restricted airspace overseen by ${restricted.authority} (max ceiling ${restricted.maxAltitudeMetersAgl} m). Confirm you can obtain the permit before accepting; if not, decline the assignment so the Manager can reassign or cancel.`;
      })();

  const heightWarning =
    exceedsCeiling && restricted
      ? locale === 'vi'
        ? `Lưu ý: Chiều cao công trình (${structureHeightMeters} m) đang cao hơn trần bay vùng hạn chế (${restricted.maxAltitudeMetersAgl} m) — cần xin phép giới hạn độ cao đặc biệt.`
        : `Note: Structure height (${structureHeightMeters} m) exceeds the restricted ceiling (${restricted.maxAltitudeMetersAgl} m) — special altitude clearance is required.`
      : null;

  const partialCoverageNote =
    restricted && footprintRadiusMeters > 0
      ? locale === 'vi'
        ? `Phạm vi mặt bằng ${footprintAreaSquareMeters} m² (bán kính ước tính ~${footprintRadiusMeters} m): giấy phép vùng hạn chế không đảm bảo bay phủ 100% toàn bộ khu vực — cơ quan cấp phép có thể thu hẹp tọa độ, hướng tiếp cận hoặc khung giờ.`
        : `Footprint ${footprintAreaSquareMeters} m² (est. radius ~${footprintRadiusMeters} m): restricted-zone permits do not guarantee 100% area coverage — authorities may limit coordinates, approach angles, or time windows.`
      : null;

  const overlapWarning = footprintOverlap
    ? locale === 'vi'
      ? `Cảnh báo giao cắt vùng cấm: Điểm ghim chỉ cách ranh giới "${footprintOverlap.zoneName}" ${footprintOverlap.edgeDistanceMeters} m, nên rìa công trình (bán kính ~${footprintOverlap.footprintRadiusMeters} m) chạm khoảng ~${footprintOverlap.overlapMeters} m vào vùng cấm bay. Phần lấn vùng cấm tuyệt đối không được phép bay.`
      : `No-Fly overlap warning: Pinned point is ${footprintOverlap.edgeDistanceMeters} m from "${footprintOverlap.zoneName}", so the perimeter (est. radius ~${footprintOverlap.footprintRadiusMeters} m) overlaps ~${footprintOverlap.overlapMeters} m into the No-Fly Zone. Only portions outside the No-Fly boundary can be flown.`
    : null;

  return (
    <Alert
      severity={footprintOverlap ? 'error' : 'warning'}
      sx={[{ borderRadius: '10px' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]}
    >
      <Stack spacing={0.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {headline}
        </Typography>
        {roleGuidance && <Typography variant="body2">{roleGuidance}</Typography>}
        {partialCoverageNote && (
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {partialCoverageNote}
          </Typography>
        )}
        {heightWarning && (
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'warning.dark' }}>
            {heightWarning}
          </Typography>
        )}
        {overlapWarning && (
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'error.dark' }}>
            {overlapWarning}
          </Typography>
        )}
      </Stack>
    </Alert>
  );
}
