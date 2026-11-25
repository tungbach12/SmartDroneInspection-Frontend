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
import type { PortalId } from '@/app/permissions/accessPolicy';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import {
  GlassBellIcon,
  GlassChatIcon,
  GlassIconBadge,
  GlassInspectionIcon,
  GlassPaymentIcon,
  GlassPermitIcon,
  GlassReportIcon,
  GlassWarningIcon,
  type GlassTone,
} from '@/shared/ui/GradientGlassIcons';
import type { NotificationItem } from '../api/notificationApi';
import {
  formatRelativeNotificationTime,
  resolveLocalizedNotificationText,
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

function resolveNotificationGlassBadge(
  category: NotificationCategory,
  eventType: string,
): { tone: GlassTone; icon: React.ReactNode } {
  const upper = eventType.toUpperCase();
  if (upper.includes('PERMIT') || upper.includes('DRONE')) {
    return { tone: 'blue', icon: <GlassPermitIcon size={20} /> };
  }
  if (upper.includes('REPORT')) {
    return { tone: 'blue', icon: <GlassReportIcon size={20} /> };
  }
  switch (category) {
    case 'message':
      return { tone: 'cyan', icon: <GlassChatIcon size={20} /> };
    case 'payment':
      return { tone: 'emerald', icon: <GlassPaymentIcon size={20} /> };
    case 'warning':
      return { tone: 'amber', icon: <GlassWarningIcon size={20} /> };
    case 'mission':
      return { tone: 'indigo', icon: <GlassInspectionIcon size={20} /> };
    default:
      return { tone: 'amber', icon: <GlassBellIcon size={20} /> };
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
        title: resolveLocalizedNotificationText(n.title, locale),
        body: resolveLocalizedNotificationText(n.body, locale),
        createdAt: n.createdAt,
        isUnread: !n.read && n.status !== 'READ',
        safeRoute: resolveSafeNotificationRoute(n.targetPath, portal, roles),
        rawNotification: n,
      };
    })();

  const isUnread = resolved.isUnread;
  const badgeConfig = resolveNotificationGlassBadge(resolved.category, resolved.eventType);
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
        {/* Style 5: Gradient Glass squircle icon tile */}
        <GlassIconBadge
          size={40}
          borderRadius="12px"
          muted={!isUnread}
          tone={badgeConfig.tone}
          sx={{ mt: 0.25 }}
        >
          {badgeConfig.icon}
        </GlassIconBadge>

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
