import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  InputAdornment,
  List,
  ListItemButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { type InspectionChatThread, type PartnerChatThread, type ServiceRequest } from '../api/contractApi';
import {
  useInspectionChatThreads,
  useMarkInspectionMessagesRead,
  useMarkMessagesRead,
  useMarkPartnerMessagesRead,
  usePartnerChatThreads,
  useServiceRequests,
} from '../hooks/useContracts';
import {
  type ChatContextThreadItem,
  InspectionChatPanel,
  PartnerChatPanel,
  RequestChatPanel,
} from '../components/RequestChatPanel';
import {
  getEffectiveRequestStatus,
  getInspectionStatusLabel,
  getStatusLabel,
} from '../shared/contractStage';

type InboxFilter = 'ALL' | 'UNREAD';
type InboxChannel = 'requests' | 'inspections' | 'partners';

function formatShortTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return '1d';
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getInitialsFromText(source: string, fallback = 'SR'): string {
  const parts = source.trim().split(/\s+/).filter(Boolean);
  const firstWord = parts[0];
  const secondWord = parts[1];
  if (firstWord && secondWord) {
    return `${firstWord.charAt(0)}${secondWord.charAt(0)}`.toUpperCase();
  }
  return (source.trim().slice(0, 2) || fallback).toUpperCase();
}

interface PersonGroup {
  personKey: string;
  personName: string;
  avatarUrl?: string | null | undefined;
  contextItems: ChatContextThreadItem[];
  unreadCount: number;
  latestMessage: { body: string; createdAt: string } | null;
  latestActivityIso: string;
  searchCorpus: string;
  singleItemTitle: string;
  singleItemMeta: string;
  multiItemMeta: string;
}

function buildPersonGroups<T>(
  items: T[],
  currentUserId: string | undefined,
  describe: (item: T) => {
    personKey: string;
    personName: string;
    avatarUrl?: string | null | undefined;
    contextItem: ChatContextThreadItem;
    fallbackActivityIso: string;
    searchTokens: string[];
    singleTitle: string;
    singleMeta: string;
    formatMultiLabel: (count: number) => string;
  },
): PersonGroup[] {
  const countUnread = (messages: { authorUserId: string; readAt?: string | null }[]) =>
    messages.filter((m) => m.authorUserId !== currentUserId && !m.readAt).length;

  const grouped = new Map<
    string,
    {
      personKey: string;
      personName: string;
      avatarUrl?: string | null | undefined;
      contextItems: ChatContextThreadItem[];
      unreadCount: number;
      latestMessage: { body: string; createdAt: string; timeMs: number } | null;
      latestActivityIso: string;
      latestActivityMs: number;
      searchTokens: string[];
      singleTitle: string;
      singleMeta: string;
      formatMultiLabel: (count: number) => string;
    }
  >();

  for (const raw of items) {
    const meta = describe(raw);
    const messages = meta.contextItem.messages;
    const lastMsg = messages[messages.length - 1];
    const lastMsgMs = lastMsg ? Date.parse(lastMsg.createdAt) || 0 : 0;
    const activityIso = lastMsg?.createdAt || meta.fallbackActivityIso;
    const activityMs = activityIso ? Date.parse(activityIso) || 0 : 0;
    const itemUnread = countUnread(messages);

    const existing = grouped.get(meta.personKey);
    if (!existing) {
      grouped.set(meta.personKey, {
        personKey: meta.personKey,
        personName: meta.personName,
        avatarUrl: meta.avatarUrl,
        contextItems: [{ ...meta.contextItem, unreadCount: itemUnread }],
        unreadCount: itemUnread,
        latestMessage: lastMsg
          ? { body: lastMsg.body, createdAt: lastMsg.createdAt, timeMs: lastMsgMs }
          : null,
        latestActivityIso: activityIso,
        latestActivityMs: activityMs,
        searchTokens: [...meta.searchTokens],
        singleTitle: meta.singleTitle,
        singleMeta: meta.singleMeta,
        formatMultiLabel: meta.formatMultiLabel,
      });
      continue;
    }

    existing.contextItems.push({ ...meta.contextItem, unreadCount: itemUnread });
    existing.unreadCount += itemUnread;
    if (!existing.avatarUrl && meta.avatarUrl) {
      existing.avatarUrl = meta.avatarUrl;
    }
    if (lastMsg && (!existing.latestMessage || lastMsgMs > existing.latestMessage.timeMs)) {
      existing.latestMessage = { body: lastMsg.body, createdAt: lastMsg.createdAt, timeMs: lastMsgMs };
    }
    if (activityMs > existing.latestActivityMs) {
      existing.latestActivityMs = activityMs;
      existing.latestActivityIso = activityIso;
    }
    existing.searchTokens.push(...meta.searchTokens);
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.latestActivityMs - a.latestActivityMs)
    .map((group) => ({
      personKey: group.personKey,
      personName: group.personName,
      avatarUrl: group.avatarUrl,
      contextItems: group.contextItems,
      unreadCount: group.unreadCount,
      latestMessage: group.latestMessage
        ? { body: group.latestMessage.body, createdAt: group.latestMessage.createdAt }
        : null,
      latestActivityIso: group.latestActivityIso,
      searchCorpus: group.searchTokens.join(' ').toLowerCase(),
      singleItemTitle: group.singleTitle,
      singleItemMeta: group.singleMeta,
      multiItemMeta: `${group.formatMultiLabel(group.contextItems.length)} · ${group.contextItems[0]?.title ?? ''}`,
    }));
}

export default function ContractInboxPage() {
  const { locale, t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const isCustomer = roles.includes('CUSTOMER');
  const isManager = roles.includes('MANAGER');
  const isInspector = roles.includes('INSPECTOR');

  const canUseRequests = isCustomer || isManager;
  const canUseInspections = isCustomer || isInspector;
  const canUsePartners = isManager || isInspector;

  const requests = useServiceRequests(canUseRequests, canUseRequests);
  const inspectionThreads = useInspectionChatThreads(canUseInspections, canUseInspections);
  const partnerThreads = usePartnerChatThreads(canUsePartners, canUsePartners);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedParam = searchParams.get('requestId') ?? '';
  const inspectionParam = searchParams.get('inspectionId') ?? '';
  const partnerRequestParam = searchParams.get('partnerRequestId') ?? '';
  const partnerInspectorParam = searchParams.get('inspectorId') ?? '';

  const [channelOverride, setChannelOverride] = useState<InboxChannel | null>(() => {
    if (partnerRequestParam && canUsePartners) return 'partners';
    if (inspectionParam && canUseInspections) return 'inspections';
    if (isInspector && !isCustomer) return 'inspections';
    return null;
  });
  const [selectedId, setSelectedId] = useState<string>('');
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(() =>
    Boolean(requestedParam || inspectionParam || partnerRequestParam),
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [error, setError] = useState('');

  const activeChannel: InboxChannel = (() => {
    if (channelOverride) {
      if (channelOverride === 'requests' && canUseRequests) return 'requests';
      if (channelOverride === 'inspections' && canUseInspections) return 'inspections';
      if (channelOverride === 'partners' && canUsePartners) return 'partners';
    }
    if (partnerRequestParam && canUsePartners) return 'partners';
    if (inspectionParam && canUseInspections) return 'inspections';
    if (canUseRequests) return 'requests';
    if (canUseInspections) return 'inspections';
    return 'partners';
  })();

  const requestList = useMemo<ServiceRequest[]>(() => requests?.data ?? [], [requests?.data]);
  const threadList = useMemo<InspectionChatThread[]>(
    () => inspectionThreads?.data ?? [],
    [inspectionThreads?.data],
  );
  const partnerThreadList = useMemo<PartnerChatThread[]>(
    () => partnerThreads?.data ?? [],
    [partnerThreads?.data],
  );

  const partnerThreadKey = (thread: Pick<PartnerChatThread, 'requestId' | 'inspectorId'>) =>
    `${thread.requestId}:${thread.inspectorId}`;

  const requestGroups = useMemo(
    () =>
      buildPersonGroups(requestList, currentUser?.id, (item) => {
        const statusLabel = getStatusLabel(getEffectiveRequestStatus(item), t);
        const otherMsg = [...(item.messages || [])]
          .reverse()
          .find((m) => m.authorUserId !== currentUser?.id && m.authorName);
        const personKey = isManager
          ? `customer:${item.ownerCustomerId}`
          : `manager:${item.assignedManagerId || item.serviceManager?.id || 'unassigned'}`;
        const personName = isManager
          ? item.ownerCustomerName || otherMsg?.authorName || item.description
          : item.serviceManager?.fullName || otherMsg?.authorName || t('Service Manager');
        const avatarUrl = !isManager ? item.serviceManager?.avatarUrl : undefined;
        const latestBody = item.messages[item.messages.length - 1]?.body ?? '';

        return {
          personKey,
          personName,
          avatarUrl,
          fallbackActivityIso: item.createdAt,
          singleTitle: item.description,
          singleMeta: `${statusLabel} · ${item.requestedFrom}`,
          formatMultiLabel: (count) =>
            locale === 'vi' ? `${count} yêu cầu` : `${count} requests`,
          searchTokens: [
            item.description,
            item.assetName ?? '',
            item.ownerCustomerName ?? '',
            item.serviceManager?.fullName ?? '',
            latestBody,
            item.status,
            item.requestedFrom,
            item.id,
          ],
          contextItem: {
            id: item.id,
            title: item.assetName || item.description,
            subtitle: `${statusLabel} · ${item.requestedFrom}`,
            actionTo: `/${isManager ? 'manager' : 'client'}/contracts?requestId=${item.id}`,
            unreadCount: 0,
            messages: item.messages || [],
            getAttachmentPath: (messageId, attachmentId) =>
              `/contracts/requests/${item.id}/messages/${messageId}/attachments/${attachmentId}`,
          },
        };
      }),
    [requestList, currentUser?.id, isManager, locale, t],
  );

  const inspectionGroups = useMemo(
    () =>
      buildPersonGroups(threadList, currentUser?.id, (thread) => {
        const statusLabel = getInspectionStatusLabel(thread.status, t);
        const personName =
          thread.counterpartName || (isInspector ? t('Customer') : t('Inspector'));
        const personKey = thread.counterpartUserId || `name:${personName}`;
        const latestBody = thread.messages[thread.messages.length - 1]?.body ?? '';

        return {
          personKey,
          personName,
          avatarUrl: thread.counterpartAvatarUrl,
          fallbackActivityIso: thread.plannedStartAt ?? '',
          singleTitle: thread.assetName,
          singleMeta: statusLabel,
          formatMultiLabel: (count) =>
            locale === 'vi' ? `${count} đợt kiểm tra` : `${count} inspections`,
          searchTokens: [
            thread.assetName,
            personName,
            latestBody,
            thread.status,
            statusLabel,
            thread.inspectionId,
          ],
          contextItem: {
            id: thread.inspectionId,
            title: thread.assetName,
            subtitle: statusLabel,
            meta: thread.plannedStartAt
              ? new Date(thread.plannedStartAt).toLocaleDateString()
              : undefined,
            actionTo: `/${isInspector ? 'operations' : 'client'}/inspections/${thread.inspectionId}`,
            unreadCount: 0,
            messages: thread.messages || [],
            getAttachmentPath: (messageId, attachmentId) =>
              `/inspections/${thread.inspectionId}/messages/${messageId}/attachments/${attachmentId}`,
          },
        };
      }),
    [threadList, currentUser?.id, isInspector, locale, t],
  );

  const partnerGroups = useMemo(
    () =>
      buildPersonGroups(partnerThreadList, currentUser?.id, (thread) => {
        const personName =
          thread.counterpartName || (isManager ? t('Inspector') : t('Service Manager'));
        const personKey = thread.counterpartUserId || `name:${personName}`;
        const latestBody = thread.messages[thread.messages.length - 1]?.body ?? '';
        const key = `${thread.requestId}:${thread.inspectorId}`;

        return {
          personKey,
          personName,
          avatarUrl: thread.counterpartAvatarUrl,
          fallbackActivityIso: thread.nextPlannedStartAt ?? '',
          singleTitle: thread.assetName,
          singleMeta: thread.customerName || thread.requestDescription,
          formatMultiLabel: (count) =>
            locale === 'vi' ? `${count} đơn phối hợp` : `${count} assignments`,
          searchTokens: [
            thread.assetName,
            thread.requestDescription,
            personName,
            thread.customerName ?? '',
            latestBody,
            thread.requestId,
          ],
          contextItem: {
            id: key,
            title: thread.assetName,
            subtitle: thread.requestDescription,
            meta: thread.customerName || undefined,
            actionTo: isManager
              ? `/manager/contracts?requestId=${thread.requestId}`
              : '/operations/inspections',
            unreadCount: 0,
            messages: thread.messages || [],
            getAttachmentPath: (messageId, attachmentId) =>
              `/contracts/partner-messages/${thread.requestId}/inspectors/${thread.inspectorId}/attachments/${messageId}/${attachmentId}`,
          },
        };
      }),
    [partnerThreadList, currentUser?.id, isManager, locale, t],
  );

  const requestUnreadThreads = useMemo(
    () => requestGroups.filter((group) => group.unreadCount > 0).length,
    [requestGroups],
  );

  const inspectionUnreadThreads = useMemo(
    () => inspectionGroups.filter((group) => group.unreadCount > 0).length,
    [inspectionGroups],
  );

  const partnerUnreadThreads = useMemo(
    () => partnerGroups.filter((group) => group.unreadCount > 0).length,
    [partnerGroups],
  );

  const defaultGroupThreadId = (group?: PersonGroup) =>
    group?.contextItems.find((item) => item.unreadCount > 0)?.id ??
    group?.contextItems[0]?.id ??
    '';

  const activeRequestId =
    (selectedId && requestList.some((item) => item.id === selectedId) ? selectedId : null) ??
    (requestedParam && requestList.some((item) => item.id === requestedParam)
      ? requestedParam
      : null) ??
    defaultGroupThreadId(requestGroups[0]);

  const activeInspectionId =
    (selectedId && threadList.some((item) => item.inspectionId === selectedId)
      ? selectedId
      : null) ??
    (inspectionParam && threadList.some((item) => item.inspectionId === inspectionParam)
      ? inspectionParam
      : null) ??
    defaultGroupThreadId(inspectionGroups[0]);

  const matchedPartnerThread =
    (selectedId
      ? partnerThreadList.find((item) => partnerThreadKey(item) === selectedId)
      : undefined) ??
    (partnerRequestParam
      ? partnerThreadList.find(
          (item) =>
            item.requestId === partnerRequestParam &&
            (!partnerInspectorParam || item.inspectorId === partnerInspectorParam),
        )
      : undefined) ??
    (() => {
      const firstId = defaultGroupThreadId(partnerGroups[0]);
      return partnerThreadList.find((item) => partnerThreadKey(item) === firstId);
    })() ??
    partnerThreadList[0];
  const activePartnerKey = matchedPartnerThread ? partnerThreadKey(matchedPartnerThread) : '';

  const markRead = useMarkMessagesRead(activeRequestId);
  const markInspectionRead = useMarkInspectionMessagesRead(activeInspectionId);
  const markPartnerRead = useMarkPartnerMessagesRead(
    matchedPartnerThread?.requestId ?? '',
    matchedPartnerThread?.inspectorId ?? '',
  );

  const activeGroups =
    activeChannel === 'requests'
      ? requestGroups
      : activeChannel === 'inspections'
        ? inspectionGroups
        : partnerGroups;

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return activeGroups.filter((group) => {
      if (filter === 'UNREAD' && group.unreadCount === 0) return false;
      if (!query) return true;
      return (
        group.personName.toLowerCase().includes(query) ||
        group.searchCorpus.includes(query)
      );
    });
  }, [activeGroups, search, filter]);

  const activeItemsCount = activeGroups.length;
  const activeUnreadThreads =
    activeChannel === 'requests'
      ? requestUnreadThreads
      : activeChannel === 'inspections'
        ? inspectionUnreadThreads
        : partnerUnreadThreads;

  const availableChannels: Array<{ key: InboxChannel; label: string; unread: number }> = [
    ...(canUseRequests
      ? [
          {
            key: 'requests' as const,
            label: isManager
              ? locale === 'vi'
                ? 'Khách hàng'
                : 'Customer'
              : locale === 'vi'
                ? 'Quản lý dịch vụ'
                : 'Manager',
            unread: requestUnreadThreads,
          },
        ]
      : []),
    ...(canUseInspections
      ? [
          {
            key: 'inspections' as const,
            label: isInspector
              ? locale === 'vi'
                ? 'Khách hàng'
                : 'Customer'
              : locale === 'vi'
                ? 'Phi công UAV'
                : 'Inspector',
            unread: inspectionUnreadThreads,
          },
        ]
      : []),
    ...(canUsePartners
      ? [
          {
            key: 'partners' as const,
            label: isManager
              ? locale === 'vi'
                ? 'Phi công UAV'
                : 'Inspector'
              : locale === 'vi'
                ? 'Quản lý dịch vụ'
                : 'Manager',
            unread: partnerUnreadThreads,
          },
        ]
      : []),
  ];

  const handleSelectRequest = (id: string) => {
    setSelectedId(id);
    setMobileShowChat(true);
    setSearchParams({ requestId: id });
    markRead?.mutate(id);
  };

  const handleSelectInspection = (id: string) => {
    setSelectedId(id);
    setMobileShowChat(true);
    setSearchParams({ inspectionId: id });
    markInspectionRead?.mutate(id);
  };

  const handleSelectPartnerThread = (thread: PartnerChatThread) => {
    setSelectedId(partnerThreadKey(thread));
    setMobileShowChat(true);
    setSearchParams({ partnerRequestId: thread.requestId, inspectorId: thread.inspectorId });
    markPartnerRead?.mutate({ requestId: thread.requestId, inspectorId: thread.inspectorId });
  };

  const handleSwitchChannel = (next: InboxChannel) => {
    setChannelOverride(next);
    setSelectedId('');
    setMobileShowChat(false);
    setSearchParams({});
  };

  if (!isCustomer && !isManager && !isInspector) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">
          {t('Messages inbox is available to Customer, Manager, and Inspector accounts.')}
        </Alert>
      </Box>
    );
  }

  const isLoading =
    activeChannel === 'requests'
      ? requests?.isPending
      : activeChannel === 'inspections'
        ? inspectionThreads?.isPending
        : partnerThreads?.isPending;

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress aria-label="Loading messages" />
      </Box>
    );
  }

  const selectedRequest =
    activeChannel === 'requests'
      ? requestList.find((item) => item.id === activeRequestId)
      : undefined;
  const selectedInspectionThread =
    activeChannel === 'inspections'
      ? threadList.find((item) => item.inspectionId === activeInspectionId)
      : undefined;
  const selectedPartnerThread =
    activeChannel === 'partners'
      ? partnerThreadList.find((item) => partnerThreadKey(item) === activePartnerKey)
      : undefined;

  const activeContextId =
    activeChannel === 'requests'
      ? activeRequestId
      : activeChannel === 'inspections'
        ? activeInspectionId
        : activePartnerKey;
  const selectedGroup = activeGroups.find((group) =>
    group.contextItems.some((item) => item.id === activeContextId),
  );
  const handleSelectGroup = (group: PersonGroup) => {
    const targetId = defaultGroupThreadId(group);
    if (!targetId) return;
    if (activeChannel === 'requests') {
      handleSelectRequest(targetId);
    } else if (activeChannel === 'inspections') {
      handleSelectInspection(targetId);
    } else {
      const matched = partnerThreadList.find((item) => partnerThreadKey(item) === targetId);
      if (matched) handleSelectPartnerThread(matched);
    }
  };

  const hasSelection = Boolean(selectedRequest || selectedInspectionThread || selectedPartnerThread);
  const totalAvailableAnyChannel =
    requestList.length + threadList.length + partnerThreadList.length;

  return (
    <Box sx={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ m: 2, mb: 1, borderRadius: '8px', flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {totalAvailableAnyChannel === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            m: { xs: 2, md: 3 },
            p: 4,
            borderRadius: '10px',
            textAlign: 'center',
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <Typography color="text.secondary">
            {isInspector
              ? locale === 'vi'
                ? 'Chưa có đợt kiểm tra hoặc đơn dịch vụ nào được phân công để nhắn tin.'
                : 'No assigned inspections or service requests are available for messaging yet.'
              : t('No service requests available for messaging.')}
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            flex: 1,
            minHeight: 0,
            width: '100%',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          {/* Left Conversations Sidebar */}
          <Box
            sx={{
              width: { xs: '100%', md: 336 },
              flexShrink: 0,
              minHeight: 0,
              flex: { xs: 1, md: 'none' },
              borderRight: { xs: 'none', md: '1px solid var(--mui-palette-divider)' },
              display: { xs: mobileShowChat && hasSelection ? 'none' : 'flex', md: 'flex' },
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ px: 2, pt: 1.75, pb: 1.25 }}>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}
              >
                <Stack direction="row" spacing={0.875} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {t('Messages')}
                  </Typography>
                  <Box
                    sx={{
                      px: 0.9,
                      py: 0.1,
                      borderRadius: '999px',
                      bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)',
                      color: 'primary.main',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      lineHeight: 1.4,
                    }}
                  >
                    {activeItemsCount}
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  spacing={0.25}
                  sx={{
                    p: 0.3,
                    borderRadius: '8px',
                    bgcolor: 'action.hover',
                    flexShrink: 0,
                  }}
                >
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setFilter('ALL')}
                    sx={{
                      px: 1.1,
                      py: 0.35,
                      border: 0,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: filter === 'ALL' ? 700 : 500,
                      bgcolor: filter === 'ALL' ? 'background.paper' : 'transparent',
                      color: filter === 'ALL' ? 'text.primary' : 'text.secondary',
                      boxShadow: filter === 'ALL' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    {locale === 'vi' ? 'Tất cả' : 'All'}
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setFilter('UNREAD')}
                    sx={{
                      px: 1.1,
                      py: 0.35,
                      border: 0,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: filter === 'UNREAD' ? 700 : 500,
                      bgcolor: filter === 'UNREAD' ? 'background.paper' : 'transparent',
                      color: filter === 'UNREAD' ? 'text.primary' : 'text.secondary',
                      boxShadow: filter === 'UNREAD' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                      '&:hover': { color: 'text.primary' },
                    }}
                  >
                    {locale === 'vi' ? 'Chưa đọc' : 'Unread'}
                    {activeUnreadThreads > 0 ? ` (${activeUnreadThreads})` : ''}
                  </Box>
                </Stack>
              </Stack>

              {availableChannels.length > 1 && (
                <Stack
                  direction="row"
                  spacing={0.35}
                  sx={{
                    p: 0.35,
                    mb: 1.1,
                    borderRadius: '8px',
                    bgcolor: 'action.hover',
                  }}
                >
                  {availableChannels.map((channel) => {
                    const active = activeChannel === channel.key;
                    return (
                      <Box
                        key={channel.key}
                        component="button"
                        type="button"
                        onClick={() => handleSwitchChannel(channel.key)}
                        sx={{
                          flex: 1,
                          px: 1.25,
                          py: 0.6,
                          border: 0,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8125rem',
                          fontWeight: active ? 600 : 500,
                          bgcolor: active ? 'background.paper' : 'transparent',
                          color: active ? 'primary.main' : 'text.secondary',
                          boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                          transition: 'background-color 140ms ease, color 140ms ease',
                          '&:hover': { color: active ? 'primary.main' : 'text.primary' },
                        }}
                      >
                        {channel.label}
                        {channel.unread > 0 ? ` (${channel.unread})` : ''}
                      </Box>
                    );
                  })}
                </Stack>
              )}

              <TextField
                fullWidth
                size="small"
                placeholder={locale === 'vi' ? 'Tìm kiếm...' : 'Search...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    height: 36,
                    borderRadius: '8px',
                    fontSize: '0.84rem',
                    bgcolor: 'action.hover',
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover fieldset': { borderColor: 'divider' },
                    '&.Mui-focused': {
                      bgcolor: 'background.paper',
                    },
                  },
                }}
              />
            </Box>

            <List disablePadding sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1 }}>
              {filteredGroups.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('No records found')}
                  </Typography>
                </Box>
              ) : (
                filteredGroups.map((group) => {
                  const isSelected = selectedGroup?.personKey === group.personKey;
                  const latestTime = formatShortTime(group.latestActivityIso);
                  const isMulti = group.contextItems.length > 1;
                  const showTitleSpan =
                    !isMulti &&
                    Boolean(group.singleItemTitle) &&
                    group.singleItemTitle !== group.personName;

                  return (
                    <ListItemButton
                      key={group.personKey}
                      selected={isSelected}
                      onClick={() => handleSelectGroup(group)}
                      sx={{
                        borderRadius: '8px',
                        mb: 0.5,
                        py: 1.25,
                        px: 1.25,
                        gap: 1.5,
                        alignItems: 'center',
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        '&.Mui-selected': {
                          bgcolor: 'action.selected',
                          '&:hover': { bgcolor: 'action.selected' },
                        },
                        '&:hover': {
                          bgcolor: isSelected ? 'action.selected' : 'action.hover',
                        },
                      }}
                    >
                      <Avatar
                        src={group.avatarUrl?.trim() || undefined}
                        sx={{
                          width: 40,
                          height: 40,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                          bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                          color: 'primary.main',
                        }}
                      >
                        {getInitialsFromText(group.personName, 'CH')}
                      </Avatar>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isSelected || group.unreadCount > 0 ? 700 : 600,
                              color: 'text.primary',
                            }}
                            noWrap
                          >
                            {group.personName}
                          </Typography>
                          {latestTime && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ flexShrink: 0, fontSize: '0.75rem' }}
                            >
                              · {latestTime}
                            </Typography>
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', fontSize: '0.75rem' }}
                          noWrap
                        >
                          {isMulti ? (
                            group.multiItemMeta
                          ) : showTitleSpan ? (
                            <>
                              <Box component="span">{group.singleItemTitle}</Box>
                              {group.singleItemMeta ? ` · ${group.singleItemMeta}` : ''}
                            </>
                          ) : (
                            group.singleItemMeta
                          )}
                        </Typography>
                        {group.latestMessage && (
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.15,
                              fontWeight: group.unreadCount > 0 ? 600 : 400,
                              color: group.unreadCount > 0 ? 'text.primary' : 'text.secondary',
                            }}
                            noWrap
                          >
                            {group.latestMessage.body}
                          </Typography>
                        )}
                      </Box>

                      {group.unreadCount > 0 && (
                        <Box
                          aria-label={`${group.unreadCount} unread`}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            bgcolor: 'primary.main',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </ListItemButton>
                  );
                })
              )}
            </List>
          </Box>

          {/* Right Conversation Thread */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
              display: { xs: mobileShowChat && hasSelection ? 'flex' : 'none', md: 'flex' },
              flexDirection: 'column',
            }}
          >
            {selectedRequest ? (
              <RequestChatPanel
                request={selectedRequest}
                partnerNameOverride={selectedGroup?.personName}
                contextThreads={selectedGroup?.contextItems}
                onSelectContext={handleSelectRequest}
                onChanged={() => void requests.refetch()}
                onError={setError}
                onBack={() => setMobileShowChat(false)}
              />
            ) : selectedInspectionThread ? (
              <InspectionChatPanel
                thread={selectedInspectionThread}
                contextThreads={selectedGroup?.contextItems}
                onSelectContext={handleSelectInspection}
                onChanged={() => void inspectionThreads.refetch()}
                onError={setError}
                onBack={() => setMobileShowChat(false)}
              />
            ) : selectedPartnerThread ? (
              <PartnerChatPanel
                thread={selectedPartnerThread}
                contextThreads={selectedGroup?.contextItems}
                onSelectContext={(targetKey) => {
                  const matched = partnerThreadList.find(
                    (item) => partnerThreadKey(item) === targetKey,
                  );
                  if (matched) handleSelectPartnerThread(matched);
                }}
                onChanged={() => void partnerThreads.refetch()}
                onError={setError}
                onBack={() => setMobileShowChat(false)}
              />
            ) : (
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 4,
                  color: 'text.secondary',
                }}
              >
                <Typography variant="body2">
                  {locale === 'vi'
                    ? 'Chọn một cuộc hội thoại để xem tin nhắn.'
                    : 'Select a conversation to view messages.'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
