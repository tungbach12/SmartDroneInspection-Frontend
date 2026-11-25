import type { PortalId } from '@/app/permissions/accessPolicy';
import { getSectionPath } from '@/app/permissions/accessPolicy';
import type { Role } from '@/features/auth/store/authStore';
import type { UnreadChatNotification } from '@/features/contracts/hooks/useContracts';
import type { Locale } from '@/shared/i18n/LocaleProvider';
import type { NotificationItem } from '../api/notificationApi';
import { resolveSafeNotificationRoute } from './targetPath';

export type NotificationCategory = 'message' | 'payment' | 'warning' | 'mission' | 'system';

export interface UnifiedNotificationEntry {
  id: string;
  kind: 'notification' | 'chat';
  eventType: string;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  isUnread: boolean;
  safeRoute: string | null;
  rawNotification?: NotificationItem;
  chatChannel?: 'requests' | 'inspections' | 'partners';
  chatRequestId?: string;
  chatInspectionId?: string;
  chatInspectorId?: string;
}

export type DayBucket = 'TODAY' | 'YESTERDAY' | 'EARLIER';

export interface NotificationDayGroup {
  bucket: DayBucket;
  label: string;
  items: UnifiedNotificationEntry[];
}

export function resolveLocalizedNotificationText(text: string, locale: Locale): string {
  if (!text) return '';
  const separatorIndex = text.indexOf(' | ');
  if (separatorIndex <= 0) {
    return text;
  }
  const viPart = text.slice(0, separatorIndex).trim();
  const enPart = text.slice(separatorIndex + 3).trim();
  if (!viPart || !enPart) {
    return text;
  }
  return locale === 'vi' ? viPart : enPart;
}

export function resolveNotificationCategory(eventType: string): NotificationCategory {
  const upper = eventType.toUpperCase();
  if (upper.includes('CHAT') || upper.includes('MESSAGE')) {
    return 'message';
  }
  if (
    upper.includes('PAY') ||
    upper.includes('INVOICE') ||
    upper.includes('SETTLEMENT') ||
    upper.includes('QUOTE') ||
    upper.includes('REFUND') ||
    upper.includes('RECEIVABLE')
  ) {
    return 'payment';
  }
  if (
    upper.includes('DECLINE') ||
    upper.includes('ABORT') ||
    upper.includes('OVERDUE') ||
    upper.includes('HUNG') ||
    upper.includes('REJECT') ||
    upper.includes('RETURN') ||
    upper.includes('EXPIRE') ||
    upper.includes('TIMEOUT') ||
    upper.includes('REVOKED') ||
    upper.includes('CANCEL') ||
    upper.includes('FAILED') ||
    upper.includes('SECURITY') ||
    upper.includes('CLARIFICATION') ||
    upper.includes('WITHDRAWN')
  ) {
    return 'warning';
  }
  if (
    upper.includes('INSPECTION') ||
    upper.includes('FIELD_SESSION') ||
    upper.includes('REPORT') ||
    upper.includes('ASSIGN') ||
    upper.includes('VIDEO') ||
    upper.includes('CONTRACT') ||
    upper.includes('FLIGHT_PERMIT')
  ) {
    return 'mission';
  }
  return 'system';
}

export function buildUnifiedNotificationEntries(
  notifications: NotificationItem[],
  unreadChatItems: UnreadChatNotification[] | undefined,
  portal: PortalId,
  roles: readonly Role[],
  unreadOnly = false,
  locale: Locale = 'en',
): UnifiedNotificationEntry[] {
  const entries: UnifiedNotificationEntry[] = notifications.map((item) => ({
    id: item.id,
    kind: 'notification',
    eventType: item.eventType,
    category: resolveNotificationCategory(item.eventType),
    title: resolveLocalizedNotificationText(item.title, locale),
    body: resolveLocalizedNotificationText(item.body, locale),
    createdAt: item.createdAt,
    isUnread: !item.read && item.status !== 'READ',
    safeRoute: resolveSafeNotificationRoute(item.targetPath, portal, roles),
    rawNotification: item,
  }));

  if (unreadChatItems && unreadChatItems.length > 0) {
    const messagesBase = getSectionPath(portal, 'messages');
    for (const chat of unreadChatItems) {
      const channel = chat.channel ?? 'requests';
      const safeRoute =
        channel === 'inspections'
          ? `${messagesBase}?inspectionId=${chat.inspectionId ?? chat.requestId}`
          : channel === 'partners'
            ? `${messagesBase}?partnerRequestId=${chat.requestId}${
                chat.inspectorId ? `&inspectorId=${chat.inspectorId}` : ''
              }`
            : `${messagesBase}?requestId=${chat.requestId}`;
      const chatKey =
        channel === 'inspections'
          ? `chat-insp-${chat.inspectionId ?? chat.requestId}`
          : channel === 'partners'
            ? `chat-partner-${chat.requestId}-${chat.inspectorId ?? ''}`
            : `chat-${chat.requestId}`;
      entries.push({
        id: chatKey,
        kind: 'chat',
        eventType: 'CONTRACT_CHAT_MESSAGE',
        category: 'message',
        title: chat.requestDescription,
        body: `${chat.latestMessageAuthor}: ${chat.latestMessageBody}`,
        createdAt: chat.latestMessageTime || new Date().toISOString(),
        isUnread: true,
        safeRoute,
        chatChannel: channel,
        chatRequestId: chat.requestId,
        ...(chat.inspectionId ? { chatInspectionId: chat.inspectionId } : {}),
        ...(chat.inspectorId ? { chatInspectorId: chat.inspectorId } : {}),
      });
    }
  }

  return entries
    .filter((entry) => (!unreadOnly ? true : entry.isUnread))
    .toSorted((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function groupNotificationsByDay(
  entries: UnifiedNotificationEntry[],
  now = new Date(),
): NotificationDayGroup[] {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const buckets: Record<DayBucket, UnifiedNotificationEntry[]> = {
    TODAY: [],
    YESTERDAY: [],
    EARLIER: [],
  };

  for (const entry of entries) {
    const ts = new Date(entry.createdAt).getTime();
    if (Number.isNaN(ts) || ts >= todayStart) {
      buckets.TODAY.push(entry);
    } else if (ts >= yesterdayStart) {
      buckets.YESTERDAY.push(entry);
    } else {
      buckets.EARLIER.push(entry);
    }
  }

  const order: Array<{ bucket: DayBucket; label: string }> = [
    { bucket: 'TODAY', label: 'TODAY' },
    { bucket: 'YESTERDAY', label: 'YESTERDAY' },
    { bucket: 'EARLIER', label: 'EARLIER' },
  ];

  return order
    .filter(({ bucket }) => buckets[bucket].length > 0)
    .map(({ bucket, label }) => ({
      bucket,
      label,
      items: buckets[bucket],
    }));
}

export function formatRelativeNotificationTime(
  iso: string,
  locale: Locale,
  fallbackFormat: (value: Date | string | number) => string,
  now = new Date(),
): string {
  const date = new Date(iso);
  const ts = date.getTime();
  if (Number.isNaN(ts)) {
    return iso;
  }
  const diffSec = Math.max(0, Math.floor((now.getTime() - ts) / 1000));
  if (diffSec < 60) {
    return locale === 'vi' ? 'Vừa xong' : 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return locale === 'vi' ? `${diffMin} phút trước` : `${diffMin}m ago`;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const diffHours = Math.floor(diffMin / 60);

  if (ts >= todayStart && diffHours < 24) {
    return locale === 'vi' ? `${diffHours} giờ trước` : `${diffHours}h ago`;
  }
  if (ts >= yesterdayStart && ts < todayStart) {
    return locale === 'vi' ? 'Hôm qua' : 'Yesterday';
  }

  const itemDayStart = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const calendarDays = Math.max(
    2,
    Math.round((todayStart - itemDayStart) / (24 * 60 * 60 * 1000)),
  );
  if (calendarDays < 7) {
    return locale === 'vi' ? `${calendarDays} ngày trước` : `${calendarDays}d ago`;
  }
  return fallbackFormat(date);
}
