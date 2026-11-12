import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest } from '../api/contractApi';
import { usePostRequestMessage, useMarkMessagesRead } from '../hooks/useContracts';

interface RequestChatPanelProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
}

export function RequestChatPanel({ request, onChanged, onError }: RequestChatPanelProps) {
  const { t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const userRoles = useAuthStore((state) => state.roles);
  const isManagerRole = userRoles.includes('MANAGER') || userRoles.includes('ADMIN');
  const post = usePostRequestMessage(request.id);
  const markRead = useMarkMessagesRead(request.id);
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [request.messages]);

  useEffect(() => {
    const hasUnread = (request.messages || []).some(
      (m) => m.authorUserId !== currentUser?.id && !m.readAt,
    );
    if (hasUnread) {
      markRead.mutate(request.id);
    }
  }, [request.id, request.messages, currentUser?.id, markRead]);

  const send = async (textToSend?: string) => {
    const text = (textToSend ?? body).trim();
    if (!text) return;
    try {
      await post.mutateAsync(text);
      setBody('');
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể gửi tin nhắn.';
      onError(msg);
    }
  };

  const otherPartyMessage = [...(request.messages || [])]
    .reverse()
    .find((m) => m.authorUserId !== currentUser?.id && m.authorName);
  const partnerName =
    otherPartyMessage?.authorName || (isManagerRole ? t('Customer') : t('Service Manager'));
  const partnerInitial = partnerName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: '8px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 2.25 },
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar
            sx={{
              bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent)',
              color: 'primary.main',
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              fontWeight: 700,
            }}
          >
            {partnerInitial}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
              {partnerName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
              {request.description}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Messages Scroll Area */}
      <Box
        ref={scrollRef}
        sx={(theme) => ({
          p: { xs: 2, sm: 2.5 },
          minHeight: 380,
          maxHeight: { xs: 450, md: 540 },
          overflowY: 'auto',
          bgcolor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          scrollBehavior: 'smooth',
          ...theme.applyStyles('dark', {
            bgcolor: 'var(--mui-palette-background-default)',
          }),
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 3,
          },
        })}
      >
        {request.messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              my: 'auto',
              py: 8,
              textAlign: 'center',
            }}
          >
            <Box
              sx={(theme) => ({
                width: 52,
                height: 52,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                mb: 1.5,
                ...theme.applyStyles('dark', {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                }),
              })}
            >
              <ForumOutlinedIcon sx={{ fontSize: 26, color: 'text.secondary', opacity: 0.6 }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Chưa có tin nhắn đàm phán nào
            </Typography>
            <Typography
              variant="caption"
              sx={{ maxWidth: 420, mt: 0.5, color: 'text.secondary', lineHeight: 1.5 }}
            >
              Gửi tin nhắn để trao đổi chi tiết về phạm vi, khung giờ bay và thống nhất báo giá hợp đồng với đối tác.
            </Typography>
          </Box>
        ) : (
          (() => {
            const myMessages = (request.messages || []).filter((m) => m.authorUserId === currentUser?.id);
            const lastMyMessage = myMessages[myMessages.length - 1];

            return request.messages.map((message) => {
              const isMe = currentUser?.id === message.authorUserId;
              const isLastFromMe = isMe && message.id === lastMyMessage?.id;
              const authorRole = message.authorRole;
              const isManager = authorRole === 'MANAGER' || authorRole === 'ADMIN';

              return (
                <Box
                  key={message.id}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: { xs: '90%', sm: '78%' },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      alignItems: 'center',
                      mb: 0.5,
                      alignSelf: isMe ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {!isMe && (
                      isManager ? (
                        <SupportAgentRoundedIcon sx={{ fontSize: 16, color: 'info.main' }} />
                      ) : (
                        <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      )
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      {isMe ? 'Bạn' : message.authorName || (isManager ? 'Quản lý Dịch vụ' : 'Khách hàng')}
                    </Typography>
                    {!isMe && (
                      <Chip
                        label={isManager ? 'Quản lý Dịch vụ' : 'Khách hàng'}
                        size="small"
                        color={isManager ? 'info' : 'default'}
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600, borderRadius: '4px' }}
                      />
                    )}
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                      {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Stack>

                  <Paper
                    elevation={0}
                    sx={(theme) => ({
                      px: 2,
                      py: 1.25,
                      borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      bgcolor: isMe ? 'primary.main' : 'background.paper',
                      color: isMe ? '#ffffff' : 'text.primary',
                      border: isMe ? 'none' : '1px solid',
                      borderColor: 'divider',
                      boxShadow: isMe ? '0 1px 3px rgba(55, 88, 249, 0.25)' : 'none',
                      ...theme.applyStyles('dark', {
                        bgcolor: isMe ? 'primary.main' : '#18181b',
                        borderColor: isMe ? 'transparent' : 'rgba(255, 255, 255, 0.08)',
                        color: isMe ? '#ffffff' : '#f4f4f5',
                      }),
                    })}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.55,
                        fontSize: '0.875rem',
                      }}
                    >
                      {message.body}
                    </Typography>
                  </Paper>

                  {isLastFromMe && (
                    <Stack
                      direction="row"
                      spacing={0.4}
                      sx={{
                        alignItems: 'center',
                        alignSelf: 'flex-end',
                        mt: 0.35,
                        pr: 0.5,
                      }}
                    >
                      {message.readAt ? (
                        <>
                          <DoneAllRoundedIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              color: 'primary.main',
                            }}
                          >
                            Đã xem {new Date(message.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <CheckRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: '0.6875rem',
                              color: 'text.secondary',
                            }}
                          >
                            Đã gửi
                          </Typography>
                        </>
                      )}
                    </Stack>
                  )}
                </Box>
              );
            });
          })()
        )}
      </Box>

      {/* Chat Input Section */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            size="small"
            multiline
            minRows={1}
            maxRows={4}
            placeholder="Nhập nội dung trao đổi hoặc đàm phán điều khoản..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            slotProps={{
              input: {
                sx: (theme) => ({
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  bgcolor: 'background.default',
                  ...theme.applyStyles('dark', {
                    bgcolor: '#09090b',
                  }),
                }),
              },
            }}
          />
          <LoadingButton
            variant="contained"
            color="primary"
            aria-label="Send message"
            loading={post.isPending}
            disabled={!body.trim()}
            onClick={() => void send()}
            sx={{
              minWidth: 44,
              width: 44,
              height: 40,
              borderRadius: '8px',
              p: 0,
            }}
          >
            <SendRoundedIcon fontSize="small" />
          </LoadingButton>
        </Stack>
      </Box>
    </Paper>
  );
}
