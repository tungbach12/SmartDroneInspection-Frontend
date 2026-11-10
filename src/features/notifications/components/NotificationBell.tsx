import { useState, type MouseEvent } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { NextAdminBellIcon } from '@/shared/ui/NextAdminIcons';
import type { PortalId } from '@/app/permissions/accessPolicy';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useUnreadChatSummary } from '@/features/contracts/hooks/useContracts';
import { useNotificationUnreadCount } from '../hooks/useNotifications';
import { NotificationInboxPopover } from './NotificationInboxPopover';

interface NotificationBellProps {
  portal: PortalId;
}

export function NotificationBell({ portal }: NotificationBellProps) {
  const { t } = useLocale();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { data } = useNotificationUnreadCount();
  const { totalUnread: unreadChatCount, items: unreadChatItems } = useUnreadChatSummary();
  const unreadCount = (data?.unreadCount ?? 0) + unreadChatCount;

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const label =
    unreadCount > 0
      ? `${t('Notifications')} (${unreadCount})`
      : t('Notifications');

  return (
    <>
      <Tooltip title={label}>
        <IconButton
          color="inherit"
          aria-label={label}
          aria-haspopup="dialog"
          aria-expanded={Boolean(anchorEl)}
          onClick={handleClick}
          data-testid="notification-bell-button"
          sx={{
            mr: 1,
            color: 'text.secondary',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            max={99}
            overlap="circular"
          >
            <NextAdminBellIcon width={18} height={18} />
          </Badge>
        </IconButton>
      </Tooltip>

      <NotificationInboxPopover
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        portal={portal}
        unreadChatItems={unreadChatItems}
      />
    </>
  );
}

