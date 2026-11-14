import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServiceRequests, useMarkMessagesRead } from '../hooks/useContracts';
import { RequestChatPanel } from '../components/RequestChatPanel';

export default function ContractInboxPage() {
  const { t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);
  const isCustomer = roles.includes('CUSTOMER');
  const isManager = roles.includes('MANAGER');
  const requests = useServiceRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedParam = searchParams.get('requestId') ?? '';

  const [selectedId, setSelectedId] = useState<string>(requestedParam);
  const [error, setError] = useState('');

  const list = useMemo(() => requests.data ?? [], [requests.data]);

  const activeId =
    selectedId && list.some((item) => item.id === selectedId)
      ? selectedId
      : (list[0]?.id ?? '');

  const markRead = useMarkMessagesRead(activeId);

  useEffect(() => {
    if (requestedParam && list.some((item) => item.id === requestedParam)) {
      setSelectedId(requestedParam);
    }
  }, [requestedParam, list]);

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
        <Paper variant="outlined" sx={{ p: 4, borderRadius: 1.5, textAlign: 'center' }}>
          <Typography color="text.secondary">{t('No service requests available for messaging.')}</Typography>
        </Paper>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
          <Paper
            variant="outlined"
            sx={{
              width: { xs: '100%', md: 340 },
              borderRadius: '8px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'background.paper',
              borderColor: 'divider',
              boxShadow: 'none',
            }}
          >
            <Box
              sx={{
                p: 2,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {t('Conversations')}
              </Typography>
              <Chip
                label={list.length}
                size="small"
                variant="outlined"
                sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px' }}
              />
            </Box>
            <List disablePadding sx={{ maxHeight: 600, overflowY: 'auto' }}>
              {list.map((item) => {
                const isSelected = item.id === activeId;
                const latestMessage = item.messages[item.messages.length - 1];
                const unreadCount = (item.messages || []).filter(
                  (m) => m.authorUserId !== currentUser?.id && !m.readAt,
                ).length;

                return (
                  <ListItemButton
                    key={item.id}
                    selected={isSelected}
                    onClick={() => handleSelectConversation(item.id)}
                    sx={(theme) => ({
                      alignItems: 'flex-start',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      py: 1.5,
                      px: 2,
                      transition: 'all 0.15s ease',
                      borderLeft: isSelected
                        ? '3px solid var(--mui-palette-primary-main)'
                        : '3px solid transparent',
                      bgcolor: isSelected
                        ? 'color-mix(in srgb, var(--mui-palette-primary-main) 8%, transparent)'
                        : 'transparent',
                      '&:hover': {
                        bgcolor: isSelected
                          ? 'color-mix(in srgb, var(--mui-palette-primary-main) 12%, transparent)'
                          : 'action.hover',
                      },
                      ...theme.applyStyles('dark', {
                        bgcolor: isSelected
                          ? 'color-mix(in srgb, var(--mui-palette-primary-main) 18%, transparent)'
                          : 'transparent',
                        '&:hover': {
                          bgcolor: isSelected
                            ? 'color-mix(in srgb, var(--mui-palette-primary-main) 24%, transparent)'
                            : 'rgba(255, 255, 255, 0.04)',
                        },
                      }),
                    })}
                  >
                    <ListItemText
                      disableTypography
                      primary={
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isSelected ? 700 : unreadCount > 0 ? 700 : 500,
                              color: unreadCount > 0 && !isSelected ? 'primary.main' : 'text.primary',
                            }}
                            noWrap
                          >
                            {item.description}
                          </Typography>
                          {unreadCount > 0 && (
                            <Chip
                              label={unreadCount}
                              size="small"
                              color="primary"
                              sx={{
                                height: 18,
                                minWidth: 18,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                px: 0.5,
                              }}
                            />
                          )}
                        </Stack>
                      }
                      secondary={
                        <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: unreadCount > 0 ? 600 : 400,
                              color: unreadCount > 0 ? 'text.primary' : 'text.secondary',
                            }}
                            noWrap
                          >
                            {latestMessage ? latestMessage.body : t('No messages yet')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.requestType === 'ONE_TIME' ? item.requestedFrom : `${item.requestedFrom} – ${item.requestedUntil}`} · {item.status}
                          </Typography>
                        </Stack>
                      }
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {selectedRequest ? (
              <RequestChatPanel
                request={selectedRequest}
                onChanged={() => void requests.refetch()}
                onError={setError}
              />
            ) : null}
          </Box>
        </Stack>
      )}
    </Box>
  );
}
