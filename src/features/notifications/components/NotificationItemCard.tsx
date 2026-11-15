import {
  Box,
  IconButton,
  ListItem,
  ListItemButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CreditCardOutlined from '@mui/icons-material/CreditCardOutlined';
import FlightTakeoffRounded from '@mui/icons-material/FlightTakeoffRounded';
import MailOutlineRounded from '@mui/icons-material/MailOutlineRounded';
import NotificationsNoneRounded from '@mui/icons-material/NotificationsNoneRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import type { PortalId } from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import type { NotificationItem } from '../api/notificationApi';
import {
  formatRelativeNotificationTime,
  resolveNotificationCategory,
  type NotificationCategory,
  type UnifiedNotificationEntry,
} from '../utils/notificationFeed';
import { resolveSafeNotificationRoute } from '../utils/targetPath';

interface NotificationItemCardProps {
  entry?: UnifiedNotificationEntry;
  notification?: NotificationItem;
  portal: PortalId;
  onSelect: (entry: UnifiedNotificationEntry) => void;
  onMarkAsRead?: (entry: UnifiedNotificationEntry) => void;
  isMarkingRead?: boolean;
  compact?: boolean;
}

function CategoryIcon({ category }: { category: NotificationCategory }) {
  switch (category) {
    case 'message':
      return <MailOutlineRounded sx={{ fontSize: 19 }} />;
    case 'payment':
      return <CreditCardOutlined sx={{ fontSize: 19 }} />;
    case 'warning':
      return <WarningAmberRounded sx={{ fontSize: 19 }} />;
    case 'mission':
      return <FlightTakeoffRounded sx={{ fontSize: 19 }} />;
    default:
      return <NotificationsNoneRounded sx={{ fontSize: 19 }} />;
  }
}

export function NotificationItemCard({
  entry,
  notification,
  portal,
  onSelect,
  onMarkAsRead,
  isMarkingRead = false,
  compact = false,
}: NotificationItemCardProps) {
  const { locale, t, formatDateTime } = useLocale();
  const roles = useAuthStore((state) => state.roles);

  const resolved: UnifiedNotificationEntry =
    entry ??
    (() => {
      const n = notification!;
      return {
        id: n.id,
        kind: 'notification' as const,
        eventType: n.eventType,
        category: resolveNotificationCategory(n.eventType),
        title: n.title,
        body: n.body,
        createdAt: n.createdAt,
        isUnread: !n.read && n.status !== 'READ',
        safeRoute: resolveSafeNotificationRoute(n.targetPath, portal, roles),
        rawNotification: n,
      };
    })();

  const isUnread = resolved.isUnread;
  const isWarning = resolved.category === 'warning';
  const timeLabel = formatRelativeNotificationTime(
    resolved.createdAt,
    locale,
    (value) => formatDateTime(value),
  );

  const showQuickReadButton =
    isUnread && Boolean(onMarkAsRead) && resolved.kind === 'notification';

  return (
    <ListItem
      disablePadding
      secondaryAction={
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          {showQuickReadButton && (
            <Tooltip title={t('Mark as read')}>
              <span>
                <IconButton
                  size="small"
                  className="notif-mark-read-btn"
                  disabled={isMarkingRead}
                  aria-label={t('Mark as read')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead?.(resolved);
                  }}
                  sx={{
                    opacity: { xs: 1, md: 0 },
                    transition: 'opacity 140ms ease',
                    color: 'text.secondary',
                    width: 32,
                    height: 32,
                    '&:focus-visible': { opacity: 1 },
                    '&:hover': { color: 'primary.main' },
                  }}
                >
                  <CheckRounded fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          <Box
            aria-hidden="true"
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isUnread ? 'primary.main' : 'transparent',
            }}
          />
        </Stack>
      }
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: isUnread
          ? (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(43, 132, 235, 0.09)'
                : 'rgba(43, 132, 235, 0.04)'
          : 'transparent',
        '&:last-of-type': { borderBottom: 'none' },
        '&:hover .notif-mark-read-btn': { opacity: 1 },
      }}
    >
      <ListItemButton
        onClick={() => onSelect(resolved)}
        sx={{
          py: compact ? 1.5 : 1.75,
          pl: { xs: 2, sm: 2.5 },
          pr: showQuickReadButton ? 9 : 5,
          gap: 1.75,
          alignItems: 'flex-start',
          '&:hover': {
            bgcolor: (theme) =>
              theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.04)'
                : 'rgba(24, 24, 27, 0.03)',
          },
        }}
      >
        {/* 40px circular icon badge */}
        <Box
          aria-hidden="true"
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            mt: 0.25,
            bgcolor: isUnread
              ? isWarning
                ? '#B45309'
                : 'primary.main'
              : 'background.paper',
            color: isUnread ? '#FFFFFF' : 'text.secondary',
            border: isUnread ? 'none' : '1px solid',
            borderColor: 'divider',
          }}
        >
          <CategoryIcon category={resolved.category} />
        </Box>

        {/* Content */}
        <Stack spacing={0.35} sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 650,
              fontSize: '0.875rem',
              lineHeight: 1.35,
              color: isUnread ? 'text.primary' : 'text.secondary',
            }}
          >
            {resolved.title}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: compact ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              fontSize: '0.8125rem',
              lineHeight: 1.45,
            }}
          >
            {resolved.body}
          </Typography>

          <Typography
            variant="caption"
            color="text.disabled"
            title={formatDateTime(resolved.createdAt)}
            sx={{ fontSize: '0.75rem', pt: 0.25, fontVariantNumeric: 'tabular-nums' }}
          >
            {timeLabel}
          </Typography>
        </Stack>
      </ListItemButton>
    </ListItem>
  );
}
