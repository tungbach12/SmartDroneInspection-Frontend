import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Fab,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import MinimizeRoundedIcon from '@mui/icons-material/MinimizeRounded';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest } from '../api/contractApi';
import { usePostRequestMessage, useServiceRequest } from '../hooks/useContracts';
import { generateContextualAiBotReply, shouldAiBotAutoReply } from '../utils/aiChatAssistant';
import { useManagerPresence } from '../utils/presence';

interface FloatingNegotiationChatProps {
  requests: ServiceRequest[];
  activeRequestId?: string;
  onSelectRequest?: (requestId: string) => void;
  onError: (message: string) => void;
}

export function FloatingNegotiationChat({
  requests,
  activeRequestId,
  onSelectRequest,
  onError,
}: FloatingNegotiationChatProps) {
  const { locale, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const currentUser = useAuthStore((state) => state.user);
  const userRoles = useAuthStore((state) => state.roles);
  const isManagerRole = userRoles.includes('MANAGER') || userRoles.includes('ADMIN');
  const isManagerOnline = useManagerPresence(isManagerRole);

  // Currently focused request in the chat widget
  const [chatRequestId, setChatRequestId] = useState<string>('');

  // Keep chat in sync with active request when user opens one in the main view
  useEffect(() => {
    if (activeRequestId) {
      setChatRequestId(activeRequestId);
    } else if (!chatRequestId && requests.length > 0) {
      setChatRequestId(requests[0]?.id || '');
    }
  }, [activeRequestId, requests]);

  const selectedRequestQuery = useServiceRequest(chatRequestId || undefined);
  const currentRequest =
    selectedRequestQuery.data || requests.find((r) => r.id === chatRequestId);

  const post = usePostRequestMessage(chatRequestId || '');
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read state persisted in localStorage: map of requestId -> lastReadTimestamp
  const [lastReadMap, setLastReadMap] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(`sdi_chat_read_${currentUser?.id || 'anon'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Mark request as read when focused or opened
  const markAsRead = (reqId: string) => {
    if (!reqId) return;
    const now = new Date().toISOString();
    setLastReadMap((prev) => {
      const updated = { ...prev, [reqId]: now };
      try {
        localStorage.setItem(`sdi_chat_read_${currentUser?.id || 'anon'}`, JSON.stringify(updated));
      } catch {
        // localStorage not available
      }
      return updated;
    });
  };

  useEffect(() => {
    if (isOpen && chatRequestId && !isMinimized) {
      markAsRead(chatRequestId);
    }
  }, [isOpen, chatRequestId, isMinimized, currentRequest?.messages.length]);

  // Auto scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentRequest?.messages.length, isOpen, isMinimized]);

  // Compute unread count per request and total unread across all active requests
  const { unreadPerRequest, totalUnread } = useMemo(() => {
    const unreadMap: Record<string, number> = {};
    let total = 0;

    requests.forEach((req) => {
      const lastRead = lastReadMap[req.id];
      // Messages from OTHER parties (not current user)
      const incomingMessages = req.messages.filter((m) => m.authorUserId !== currentUser?.id);

      let unreadForThisReq = 0;
      if (!lastRead) {
        unreadForThisReq = incomingMessages.length;
      } else {
        const lastReadTime = new Date(lastRead).getTime();
        unreadForThisReq = incomingMessages.filter(
          (m) => new Date(m.createdAt).getTime() > lastReadTime,
        ).length;
      }

      // If the current user was the last to reply in this conversation, mark unread as 0
      const latestMsg = req.messages[req.messages.length - 1];
      if (latestMsg && latestMsg.authorUserId === currentUser?.id) {
        unreadForThisReq = 0;
      }

      unreadMap[req.id] = unreadForThisReq;
      total += unreadForThisReq;
    });

    return { unreadPerRequest: unreadMap, totalUnread: total };
  }, [requests, lastReadMap, currentUser?.id]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? body).trim();
    if (!text || !chatRequestId) return;
    try {
      await post.mutateAsync(text);
      setBody('');
      markAsRead(chatRequestId);

      // AUTOMATED AI BOT: ONLY triggers if Manager is currently OFFLINE and has not taken over yet
      const shouldAutoReply = shouldAiBotAutoReply(
        currentRequest?.messages ?? [],
        text,
        isManagerRole,
        isManagerOnline,
      );

      if (shouldAutoReply) {
        setIsAiReplying(true);
        window.setTimeout(async () => {
          try {
            const aiReply = generateContextualAiBotReply(text, currentRequest);
            await post.mutateAsync(aiReply);
            markAsRead(chatRequestId);
          } catch {
            // ignore bot send failure
          } finally {
            setIsAiReplying(false);
          }
        }, 1500);
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : locale === 'vi'
            ? 'Không thể gửi tin nhắn.'
            : 'Unable to send message.';
      onError(msg);
    }
  };

  // AI Assistant auto-answer for customer questions
  const handleAskAiAssistant = async () => {
    if (!currentRequest || currentRequest.messages.length === 0 || isAiReplying) return;
    const latestIncoming = [...currentRequest.messages]
      .reverse()
      .find((m) => m.authorUserId !== currentUser?.id);
    const questionText = latestIncoming
      ? latestIncoming.body
      : locale === 'vi'
        ? 'Tư vấn quy trình kiểm định'
        : 'Inspection workflow consultation';

    setIsAiReplying(true);
    try {
      const aiReply = generateContextualAiBotReply(questionText, currentRequest);
      await post.mutateAsync(aiReply);
      markAsRead(chatRequestId);
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : locale === 'vi'
            ? 'Trợ lý AI chưa thể phản hồi.'
            : 'AI Assistant could not respond.';
      onError(msg);
    } finally {
      setIsAiReplying(false);
    }
  };

  const fabLabel = isOpen
    ? locale === 'vi'
      ? 'Thu nhỏ chat đàm phán'
      : 'Minimize negotiation chat'
    : totalUnread > 0
      ? locale === 'vi'
        ? `Bạn có ${totalUnread} tin nhắn mới chưa phản hồi`
        : `You have ${totalUnread} unread message(s)`
      : locale === 'vi'
        ? 'Mở kênh đàm phán hợp đồng'
        : t('Open contract negotiation chat');

  return (
    <>
      {/* Floating Action Button (FAB) at Bottom-Right */}
      <Box
        sx={{
          position: 'fixed',
          bottom: { xs: 20, md: 28 },
          right: { xs: 20, md: 28 },
          zIndex: 1300,
        }}
      >
        <Badge
          badgeContent={totalUnread}
          color="error"
          max={99}
          invisible={totalUnread === 0}
          sx={{
            '& .MuiBadge-badge': {
              fontWeight: 800,
              fontSize: '0.75rem',
              minWidth: 20,
              height: 20,
            },
          }}
        >
          <Tooltip title={fabLabel} placement="left">
            <Fab
              color="primary"
              aria-label={fabLabel}
              onClick={() => {
                if (isOpen && isMinimized) {
                  setIsMinimized(false);
                  if (chatRequestId) markAsRead(chatRequestId);
                } else {
                  setIsOpen(!isOpen);
                  setIsMinimized(false);
                  if (!isOpen && chatRequestId) markAsRead(chatRequestId);
                }
              }}
              sx={{
                width: 56,
                height: 56,
                boxShadow: totalUnread > 0
                  ? '0 4px 20px rgba(211, 47, 47, 0.45)'
                  : '0 4px 16px rgba(25, 118, 210, 0.35)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  transition: 'transform 0.2s',
                },
              }}
            >
              <ForumRoundedIcon />
            </Fab>
          </Tooltip>
        </Badge>
      </Box>

      {/* Floating Chat Modal / Window */}
      {isOpen && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: { xs: 84, md: 96 },
            right: { xs: 16, md: 28 },
            width: { xs: 'calc(100vw - 32px)', sm: 430 },
            height: isMinimized ? 'auto' : 580,
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '10px',
            zIndex: 1300,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 1.5,
              px: 2,
              bgcolor: 'background.paper',
              borderBottom: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              <Avatar
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'primary.dark' : 'primary.50',
                  color: 'primary.main',
                  width: 32,
                  height: 32,
                }}
              >
                <ForumRoundedIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  {t('Commercial Negotiation Channel')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {isManagerRole ? t('Multi-client negotiations') : t('Chat with Platform Manager')}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              {chatRequestId && (unreadPerRequest[chatRequestId] ?? 0) > 0 && (
                <Tooltip
                  title={
                    locale === 'vi'
                      ? 'Đánh dấu đã xem cuộc hội thoại này'
                      : 'Mark conversation as read'
                  }
                >
                  <IconButton
                    size="small"
                    aria-label={
                      locale === 'vi'
                        ? 'Đánh dấu đã xem cuộc hội thoại này'
                        : 'Mark conversation as read'
                    }
                    onClick={() => markAsRead(chatRequestId)}
                  >
                    <DoneAllRoundedIcon fontSize="small" color="primary" />
                  </IconButton>
                </Tooltip>
              )}
              <IconButton
                size="small"
                onClick={() => setIsMinimized(!isMinimized)}
                title={locale === 'vi' ? 'Thu nhỏ' : 'Minimize'}
                aria-label={locale === 'vi' ? 'Thu nhỏ' : 'Minimize'}
              >
                <MinimizeRoundedIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setIsOpen(false)}
                title={locale === 'vi' ? 'Đóng' : 'Close'}
                aria-label={locale === 'vi' ? 'Đóng' : 'Close'}
              >
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Box>

          {!isMinimized && (
            <>
              {/* Request Switcher Bar with Unread Badges */}
              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="chat-request-selector-label" sx={{ fontSize: '0.875rem' }}>
                      {t('Select service request')}
                    </InputLabel>
                    <Select
                      labelId="chat-request-selector-label"
                      label={t('Select service request')}
                      value={chatRequestId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setChatRequestId(newId);
                        markAsRead(newId);
                      }}
                      sx={{ fontSize: '0.875rem', bgcolor: 'background.paper', borderRadius: '8px' }}
                    >
                      {requests.map((req) => {
                        const unreadInReq = unreadPerRequest[req.id] || 0;

                        return (
                          <MenuItem key={req.id} value={req.id} sx={{ fontSize: '0.875rem' }}>
                            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
                              <Typography noWrap sx={{ maxWidth: 210, fontSize: '0.875rem', fontWeight: unreadInReq > 0 ? 750 : 600 }}>
                                {req.description}
                              </Typography>
                              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                                {unreadInReq > 0 && (
                                  <Chip
                                    label={`${unreadInReq} ${t('New')}`}
                                    size="small"
                                    color="error"
                                    sx={{ height: 20, fontSize: '0.75rem', fontWeight: 800 }}
                                  />
                                )}
                                <Chip
                                  label={req.status.replaceAll('_', ' ')}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.75rem' }}
                                />
                              </Stack>
                            </Stack>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  {onSelectRequest && chatRequestId && (
                    <Tooltip
                      title={
                        locale === 'vi'
                          ? 'Xem chi tiết yêu cầu này ở màn hình chính'
                          : 'Open request in main workspace'
                      }
                    >
                      <IconButton
                        size="small"
                        aria-label={
                          locale === 'vi'
                            ? 'Xem chi tiết yêu cầu này ở màn hình chính'
                            : 'Open request in main workspace'
                        }
                        onClick={() => onSelectRequest(chatRequestId)}
                        sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}
                      >
                        <OpenInNewRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>

              {/* Message Feed */}
              <Box
                ref={scrollRef}
                sx={{
                  flex: 1,
                  p: 2,
                  overflowY: 'auto',
                  bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc'),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.75,
                }}
              >
                {!currentRequest || currentRequest.messages.length === 0 ? (
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      my: 'auto',
                      py: 4,
                      textAlign: 'center',
                      color: 'text.secondary',
                    }}
                  >
                    <ForumRoundedIcon sx={{ fontSize: 40, opacity: 0.25, mb: 1 }} />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t('No messages yet')}
                    </Typography>
                    <Typography variant="caption" sx={{ maxWidth: 280, mt: 0.5 }}>
                      {t('Send a message to discuss flight windows, drone inspection models, or quote terms.')}
                    </Typography>
                  </Box>
                ) : (
                  currentRequest.messages.map((message) => {
                    const isAiBot = message.body.startsWith('🤖');
                    const isMe = !isAiBot && currentUser?.id === message.authorUserId;
                    const authorRole = message.authorRole;
                    const isMsgManager = authorRole === 'MANAGER' || authorRole === 'ADMIN';

                    return (
                      <Box
                        key={message.id}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '88%',
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={0.75}
                          sx={{
                            alignItems: 'center',
                            mb: 0.5,
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            px: 0.5,
                          }}
                        >
                          {!isMe && (
                            isAiBot ? (
                              <SmartToyOutlinedIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                            ) : isMsgManager ? (
                              <SupportAgentRoundedIcon sx={{ fontSize: 14, color: 'info.main' }} />
                            ) : (
                              <PersonOutlineRoundedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            )
                          )}
                          <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            {isMe
                              ? locale === 'vi'
                                ? 'Bạn'
                                : 'You'
                              : isAiBot
                                ? locale === 'vi'
                                  ? 'Trợ lý AI'
                                  : 'AI Assistant'
                                : message.authorName ||
                                  (isMsgManager
                                    ? locale === 'vi'
                                      ? 'Quản lý sàn'
                                      : 'Platform Manager'
                                    : locale === 'vi'
                                      ? 'Khách hàng'
                                      : 'Customer')}
                          </Typography>
                          {!isMe && (
                            <Chip
                              label={isAiBot ? 'AI Bot' : isMsgManager ? 'Manager' : 'Customer'}
                              size="small"
                              color={isAiBot ? 'secondary' : isMsgManager ? 'info' : 'default'}
                              variant="outlined"
                              sx={{ height: 18, fontSize: '0.75rem', fontWeight: 600, px: 0.5 }}
                            />
                          )}
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Stack>

                        <Box
                          sx={{
                            p: 1.25,
                            px: 1.75,
                            borderRadius: '8px',
                            bgcolor: isMe
                              ? 'primary.main'
                              : isAiBot
                                ? (theme) => (theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.15)' : '#f3e5f5')
                                : (theme) => (theme.palette.mode === 'dark' ? 'grey.800' : 'background.paper'),
                            color: isMe ? 'primary.contrastText' : 'text.primary',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            border: isMe ? 'none' : '1px solid',
                            borderColor: isAiBot ? 'secondary.light' : 'divider',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              fontSize: '0.875rem',
                              lineHeight: 1.45,
                            }}
                          >
                            {message.body}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
                {isAiReplying && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.25,
                      px: 1.75,
                      borderRadius: '8px',
                      bgcolor: (theme) =>
                        theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.15)' : '#f3e5f5',
                      border: '1px solid',
                      borderColor: 'secondary.light',
                      alignSelf: 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <SmartToyOutlinedIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                    <Typography
                      variant="caption"
                      sx={{ color: 'secondary.main', fontStyle: 'italic', fontWeight: 600, fontSize: '0.75rem' }}
                    >
                      {locale === 'vi'
                        ? 'Trợ lý AI SmartDrone đang soạn phản hồi...'
                        : 'SmartDrone AI Assistant is composing a reply...'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Status / AI Assistant Banner */}
              <Box
                sx={{
                  px: 1.5,
                  py: 0.75,
                  bgcolor: 'background.paper',
                  borderTop: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {isManagerRole ? (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: '0.75rem', fontWeight: 600 }}
                  >
                    <SupportAgentRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    {t('Direct negotiation with customer')}
                  </Typography>
                ) : (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem' }}
                    >
                      <SmartToyOutlinedIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                      {t('Need quick answers?')}
                    </Typography>
                    <Button
                      size="small"
                      variant="text"
                      color="secondary"
                      disabled={isAiReplying}
                      onClick={() => void handleAskAiAssistant()}
                      sx={{
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        py: 0.25,
                        px: 0.75,
                        borderRadius: '8px',
                        fontWeight: 600,
                      }}
                    >
                      {isAiReplying ? 'AI...' : `🤖 ${t('Ask AI Assistant')}`}
                    </Button>
                  </>
                )}
              </Box>

              {/* Input Area */}
              <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    maxRows={3}
                    placeholder={t('Type your message... (Press Enter to send)')}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                    slotProps={{
                      input: {
                        sx: { borderRadius: '8px', fontSize: '0.875rem' },
                      },
                    }}
                  />
                  <LoadingButton
                    variant="contained"
                    size="small"
                    aria-label={locale === 'vi' ? 'Gửi tin nhắn' : 'Send message'}
                    loading={post.isPending}
                    disabled={!body.trim()}
                    onClick={() => void handleSend()}
                    sx={{ minWidth: 40, width: 40, height: 40, borderRadius: '8px', p: 0 }}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </LoadingButton>
                </Stack>
              </Box>
            </>
          )}
        </Paper>
      )}
    </>
  );
}
