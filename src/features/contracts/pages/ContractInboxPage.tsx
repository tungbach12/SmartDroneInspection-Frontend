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
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { type InspectionChatThread, type ServiceRequest } from '../api/contractApi';
import {
  useInspectionChatThreads,
  useMarkInspectionMessagesRead,
  useMarkMessagesRead,
  useServiceRequests,
} from '../hooks/useContracts';
import { InspectionChatPanel, RequestChatPanel } from '../components/RequestChatPanel';
import { getEffectiveRequestStatus, getStatusLabel } from '../shared/contractStage';

type InboxFilter = 'ALL' | 'UNREAD';
type InboxChannel = 'requests' | 'inspections';

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

function getConversationInitials(request: ServiceRequest, currentUserId?: string): string {
  const partnerMsg = [...(request.messages || [])]
    .reverse()
    .find((m) => m.authorUserId !== currentUserId && m.authorName);
  return getInitialsFromText(partnerMsg?.authorName || request.description, 'SR');
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

  const requests = useServiceRequests(canUseRequests, canUseRequests);
  const inspectionThreads = useInspectionChatThreads(canUseInspections, canUseInspections);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedParam = searchParams.get('requestId') ?? '';
  const inspectionParam = searchParams.get('inspectionId') ?? '';

  const [channelOverride, setChannelOverride] = useState<InboxChannel | null>(() =>
    isInspector && !isCustomer ? 'inspections' : inspectionParam ? 'inspections' : null,
  );
  const [selectedId, setSelectedId] = useState<string>('');
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(() =>
    Boolean(requestedParam || inspectionParam),
  );
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [error, setError] = useState('');

  const activeChannel: InboxChannel =
    !canUseRequests && canUseInspections
      ? 'inspections'
      : channelOverride ?? (inspectionParam && canUseInspections ? 'inspections' : 'requests');

  const requestList = useMemo<ServiceRequest[]>(() => requests?.data ?? [], [requests?.data]);
  const threadList = useMemo<InspectionChatThread[]>(
    () => inspectionThreads?.data ?? [],
    [inspectionThreads?.data],
  );

  const activeRequestId =
    (selectedId && requestList.some((item) => item.id === selectedId) ? selectedId : null) ??
    (requestedParam && requestList.some((item) => item.id === requestedParam)
      ? requestedParam
      : null) ??
    (requestList[0]?.id ?? '');

  const activeInspectionId =
    (selectedId && threadList.some((item) => item.inspectionId === selectedId)
      ? selectedId
      : null) ??
    (inspectionParam && threadList.some((item) => item.inspectionId === inspectionParam)
      ? inspectionParam
      : null) ??
    (threadList[0]?.inspectionId ?? '');

  const markRead = useMarkMessagesRead(activeRequestId);
  const markInspectionRead = useMarkInspectionMessagesRead(activeInspectionId);

  const countUnread = (messages: { authorUserId: string; readAt?: string | null }[]) =>
    messages.filter((m) => m.authorUserId !== currentUser?.id && !m.readAt).length;

  const requestUnreadThreads = useMemo(
    () => requestList.filter((item) => countUnread(item.messages || []) > 0).length,
    [requestList, currentUser?.id],
  );

  const inspectionUnreadThreads = useMemo(
    () => threadList.filter((item) => countUnread(item.messages || []) > 0).length,
    [threadList, currentUser?.id],
  );

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    return requestList.filter((item) => {
      if (filter === 'UNREAD' && countUnread(item.messages || []) === 0) return false;
      if (!query) return true;
      const latestBody = item.messages[item.messages.length - 1]?.body ?? '';
      return (
        item.description.toLowerCase().includes(query) ||
        latestBody.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.requestedFrom.includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    });
  }, [requestList, search, filter, currentUser?.id]);

  const filteredThreads = useMemo(() => {
    const query = search.trim().toLowerCase();
    return threadList.filter((item) => {
      if (filter === 'UNREAD' && countUnread(item.messages || []) === 0) return false;
      if (!query) return true;
      const latestBody = item.messages[item.messages.length - 1]?.body ?? '';
      return (
        item.assetName.toLowerCase().includes(query) ||
        item.counterpartName.toLowerCase().includes(query) ||
        latestBody.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query) ||
        item.inspectionId.toLowerCase().includes(query)
      );
    });
  }, [threadList, search, filter, currentUser?.id]);

  const activeItemsCount =
    activeChannel === 'requests' ? requestList.length : threadList.length;
  const activeUnreadThreads =
    activeChannel === 'requests' ? requestUnreadThreads : inspectionUnreadThreads;

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
    activeChannel === 'requests' ? requests?.isPending : inspectionThreads?.isPending;

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

  const hasSelection = Boolean(selectedRequest || selectedInspectionThread);
  const totalAvailableAnyChannel = requestList.length + threadList.length;
  const dashboardPath = isCustomer
    ? '/client/dashboard'
    : isInspector
      ? '/operations/dashboard'
      : '/manager/dashboard';

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 3 } }}>
      <PageHeader
        title={t('Messages')}
        breadcrumbs={[{ label: t('Operations'), to: dashboardPath }, { label: t('Messages') }]}
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {totalAvailableAnyChannel === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 4, borderRadius: '10px', textAlign: 'center', borderColor: 'divider', boxShadow: 'none' }}
        >
          <Typography color="text.secondary">
            {isInspector
              ? locale === 'vi'
                ? 'Chưa có đợt kiểm tra nào được phân công để nhắn tin với khách hàng.'
                : 'No assigned inspections are available for messaging yet.'
              : t('No service requests available for messaging.')}
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper',
            overflow: 'hidden',
            height: { xs: 'calc(100dvh - 180px)', md: 'calc(100dvh - 190px)' },
            minHeight: { xs: 460, md: 500 },
          }}
        >
          {/* Left Conversations Sidebar */}
          <Box
            sx={{
              width: { xs: '100%', md: 340 },
              flexShrink: 0,
              minHeight: 0,
              flex: { xs: 1, md: 'none' },
              borderRight: { md: '1px solid' },
              borderColor: 'divider',
              display: { xs: mobileShowChat && hasSelection ? 'none' : 'flex', md: 'flex' },
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ p: 2, pb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {t('Messages')}
                </Typography>
                <Box
                  sx={{
                    px: 1,
                    py: 0.15,
                    borderRadius: '999px',
                    bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                    color: 'primary.main',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    lineHeight: 1.4,
                  }}
                >
                  {activeItemsCount}
                </Box>
              </Stack>

              {canUseRequests && canUseInspections && (
                <Stack direction="row" spacing={0.75} sx={{ mb: 1.5 }}>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => handleSwitchChannel('requests')}
                    sx={{
                      flex: 1,
                      px: 1.25,
                      py: 0.7,
                      border: '1px solid',
                      borderColor: activeChannel === 'requests' ? 'primary.main' : 'divider',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: activeChannel === 'requests' ? 700 : 600,
                      bgcolor:
                        activeChannel === 'requests'
                          ? 'color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)'
                          : 'transparent',
                      color: activeChannel === 'requests' ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {locale === 'vi' ? 'Quản lý dịch vụ' : 'Manager'}
                    {requestUnreadThreads > 0 ? ` (${requestUnreadThreads})` : ''}
                  </Box>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => handleSwitchChannel('inspections')}
                    sx={{
                      flex: 1,
                      px: 1.25,
                      py: 0.7,
                      border: '1px solid',
                      borderColor: activeChannel === 'inspections' ? 'primary.main' : 'divider',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: activeChannel === 'inspections' ? 700 : 600,
                      bgcolor:
                        activeChannel === 'inspections'
                          ? 'color-mix(in srgb, var(--mui-palette-primary-main) 10%, transparent)'
                          : 'transparent',
                      color: activeChannel === 'inspections' ? 'primary.main' : 'text.secondary',
                    }}
                  >
                    {locale === 'vi' ? 'Phi công UAV' : 'Inspector'}
                    {inspectionUnreadThreads > 0 ? ` (${inspectionUnreadThreads})` : ''}
                  </Box>
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
                        <SearchRoundedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  mb: 1.5,
                  '& .MuiOutlinedInput-root': {
                    height: 38,
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    bgcolor: 'background.default',
                  },
                }}
              />

              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setFilter('ALL')}
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    border: 0,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: filter === 'ALL' ? 700 : 500,
                    bgcolor: filter === 'ALL' ? 'action.selected' : 'transparent',
                    color: filter === 'ALL' ? 'text.primary' : 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {locale === 'vi' ? 'Tất cả' : 'All'}
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setFilter('UNREAD')}
                  sx={{
                    px: 1.5,
                    py: 0.6,
                    border: 0,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: filter === 'UNREAD' ? 700 : 500,
                    bgcolor: filter === 'UNREAD' ? 'action.selected' : 'transparent',
                    color: filter === 'UNREAD' ? 'text.primary' : 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {locale === 'vi' ? 'Chưa đọc' : 'Unread'}
                  {activeUnreadThreads > 0 ? ` (${activeUnreadThreads})` : ''}
                </Box>
              </Stack>
            </Box>

            <List disablePadding sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1 }}>
              {activeChannel === 'requests' ? (
                filteredRequests.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {t('No records found')}
                    </Typography>
                  </Box>
                ) : (
                  filteredRequests.map((item) => {
                    const isSelected = item.id === activeRequestId;
                    const latestMessage = item.messages[item.messages.length - 1];
                    const unreadCount = countUnread(item.messages || []);
                    const latestTime = formatShortTime(latestMessage?.createdAt ?? item.createdAt);
                    const statusLabel = getStatusLabel(getEffectiveRequestStatus(item), t);

                    return (
                      <ListItemButton
                        key={item.id}
                        selected={isSelected}
                        onClick={() => handleSelectRequest(item.id)}
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
                          {getConversationInitials(item, currentUser?.id)}
                        </Avatar>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isSelected || unreadCount > 0 ? 700 : 600,
                                color: 'text.primary',
                              }}
                              noWrap
                            >
                              {item.description}
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
                            sx={{ display: 'block', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}
                            noWrap
                          >
                            {statusLabel} · {item.requestedFrom} · #{item.id.slice(0, 8)}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              mt: 0.15,
                              fontWeight: unreadCount > 0 ? 600 : 400,
                              color: unreadCount > 0 ? 'text.primary' : 'text.secondary',
                            }}
                            noWrap
                          >
                            {latestMessage ? latestMessage.body : t('No messages yet')}
                          </Typography>
                        </Box>

                        {unreadCount > 0 && (
                          <Box
                            aria-label={`${unreadCount} unread`}
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
                )
              ) : filteredThreads.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('No records found')}
                  </Typography>
                </Box>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = thread.inspectionId === activeInspectionId;
                  const latestMessage = thread.messages[thread.messages.length - 1];
                  const unreadCount = countUnread(thread.messages || []);
                  const latestTime = formatShortTime(
                    latestMessage?.createdAt ?? thread.plannedStartAt ?? '',
                  );

                  return (
                    <ListItemButton
                      key={thread.inspectionId}
                      selected={isSelected}
                      onClick={() => handleSelectInspection(thread.inspectionId)}
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
                        {getInitialsFromText(thread.counterpartName || thread.assetName, 'IN')}
                      </Avatar>

                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isSelected || unreadCount > 0 ? 700 : 600,
                              color: 'text.primary',
                            }}
                            noWrap
                          >
                            {thread.counterpartName}
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
                          sx={{ display: 'block', fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums' }}
                          noWrap
                        >
                          {thread.assetName} · {t(thread.status)} · #{thread.inspectionId.slice(0, 8)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.15,
                            fontWeight: unreadCount > 0 ? 600 : 400,
                            color: unreadCount > 0 ? 'text.primary' : 'text.secondary',
                          }}
                          noWrap
                        >
                          {latestMessage ? latestMessage.body : t('No messages yet')}
                        </Typography>
                      </Box>

                      {unreadCount > 0 && (
                        <Box
                          aria-label={`${unreadCount} unread`}
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
                onChanged={() => void requests.refetch()}
                onError={setError}
                onBack={() => setMobileShowChat(false)}
              />
            ) : selectedInspectionThread ? (
              <InspectionChatPanel
                thread={selectedInspectionThread}
                onChanged={() => void inspectionThreads.refetch()}
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
