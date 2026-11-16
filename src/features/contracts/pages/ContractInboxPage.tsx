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
import { type ServiceRequest } from '../api/contractApi';
import { useServiceRequests, useMarkMessagesRead } from '../hooks/useContracts';
import { RequestChatPanel } from '../components/RequestChatPanel';

type InboxFilter = 'ALL' | 'UNREAD';

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

function getConversationInitials(request: ServiceRequest, currentUserId?: string): string {
  const partnerMsg = [...(request.messages || [])]
    .reverse()
    .find((m) => m.authorUserId !== currentUserId && m.authorName);
  const source = partnerMsg?.authorName || request.description;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  const firstWord = parts[0];
  const secondWord = parts[1];
  if (firstWord && secondWord) {
    return `${firstWord.charAt(0)}${secondWord.charAt(0)}`.toUpperCase();
  }
  return (source.trim().slice(0, 2) || 'SR').toUpperCase();
}

export default function ContractInboxPage() {
  const { locale, t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const isCustomer = roles.includes('CUSTOMER');
  const isManager = roles.includes('MANAGER');
  const requests = useServiceRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedParam = searchParams.get('requestId') ?? '';

  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('ALL');
  const [error, setError] = useState('');

  const list = useMemo(() => requests.data ?? [], [requests.data]);

  const activeId =
    (selectedId && list.some((item) => item.id === selectedId) ? selectedId : null) ??
    (requestedParam && list.some((item) => item.id === requestedParam) ? requestedParam : null) ??
    (list[0]?.id ?? '');

  const markRead = useMarkMessagesRead(activeId);

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();
    return list.filter((item) => {
      const unreadCount = (item.messages || []).filter(
        (m) => m.authorUserId !== currentUser?.id && !m.readAt,
      ).length;
      if (filter === 'UNREAD' && unreadCount === 0) return false;
      if (!query) return true;
      const latestBody = item.messages[item.messages.length - 1]?.body ?? '';
      return (
        item.description.toLowerCase().includes(query) ||
        latestBody.toLowerCase().includes(query) ||
        item.status.toLowerCase().includes(query)
      );
    });
  }, [list, search, filter, currentUser?.id]);

  const totalUnreadThreads = useMemo(
    () =>
      list.filter((item) =>
        (item.messages || []).some((m) => m.authorUserId !== currentUser?.id && !m.readAt),
      ).length,
    [list, currentUser?.id],
  );

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setSearchParams({ requestId: id });
    markRead.mutate(id);
  };

  if (!isCustomer && !isManager) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">Messages inbox is available to Customer and Platform Manager accounts.</Alert>
      </Box>
    );
  }

  if (requests.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress aria-label="Loading messages" />
      </Box>
    );
  }

  const selectedRequest = list.find((item) => item.id === activeId);

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 3.5 } }}>
      <PageHeader
        title={t('Messages')}
        breadcrumbs={[
          { label: t('Operations'), to: isCustomer ? '/client/dashboard' : '/manager/dashboard' },
          { label: t('Messages') },
        ]}
      />

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {list.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 4, borderRadius: '10px', textAlign: 'center', borderColor: 'divider', boxShadow: 'none' }}
        >
          <Typography color="text.secondary">{t('No service requests available for messaging.')}</Typography>
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
            minHeight: { md: 640 },
            height: { md: 'calc(100vh - 210px)' },
          }}
        >
          {/* Left Conversations Sidebar (NextAdmin style) */}
          <Box
            sx={{
              width: { xs: '100%', md: 340 },
              flexShrink: 0,
              borderRight: { md: '1px solid' },
              borderBottom: { xs: '1px solid', md: 'none' },
              borderColor: 'divider',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
            }}
          >
            <Box sx={{ p: 2, pb: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.75 }}>
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
                  {list.length}
                </Box>
              </Stack>

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
                    fontSize: '0.8125rem',
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
                    fontSize: '0.8125rem',
                    fontWeight: filter === 'UNREAD' ? 700 : 500,
                    bgcolor: filter === 'UNREAD' ? 'action.selected' : 'transparent',
                    color: filter === 'UNREAD' ? 'text.primary' : 'text.secondary',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {locale === 'vi' ? 'Chưa đọc' : 'Unread'}
                  {totalUnreadThreads > 0 ? ` (${totalUnreadThreads})` : ''}
                </Box>
              </Stack>
            </Box>

            <List disablePadding sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 1, maxHeight: { xs: 320, md: 'none' } }}>
              {filteredList.length === 0 ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {t('No records found')}
                  </Typography>
                </Box>
              ) : (
                filteredList.map((item) => {
                  const isSelected = item.id === activeId;
                  const latestMessage = item.messages[item.messages.length - 1];
                  const unreadCount = (item.messages || []).filter(
                    (m) => m.authorUserId !== currentUser?.id && !m.readAt,
                  ).length;
                  const latestTime = formatShortTime(latestMessage?.createdAt ?? item.createdAt);
                  const isActiveLifecycle = ['OPEN', 'QUOTED', 'ACCEPTED'].includes(item.status);

                  return (
                    <ListItemButton
                      key={item.id}
                      selected={isSelected}
                      onClick={() => handleSelectConversation(item.id)}
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
                      <Box sx={{ position: 'relative', flexShrink: 0 }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)',
                            color: 'primary.main',
                          }}
                        >
                          {getConversationInitials(item, currentUser?.id)}
                        </Avatar>
                        {isActiveLifecycle && (
                          <Box
                            sx={{
                              position: 'absolute',
                              right: 0,
                              bottom: 0,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              bgcolor: '#16A34A',
                              border: '2px solid',
                              borderColor: 'background.paper',
                            }}
                          />
                        )}
                      </Box>

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
                          sx={{
                            display: 'block',
                            mt: 0.25,
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
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {selectedRequest ? (
              <RequestChatPanel
                request={selectedRequest}
                onChanged={() => void requests.refetch()}
                onError={setError}
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
                  {locale === 'vi' ? 'Chọn một cuộc hội thoại để xem tin nhắn.' : 'Select a conversation to view messages.'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
