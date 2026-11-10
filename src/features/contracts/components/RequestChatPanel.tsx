import { useEffect, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest } from '../api/contractApi';
import { usePostRequestMessage } from '../hooks/useContracts';
import { generateContextualAiBotReply, shouldAiBotAutoReply } from '../utils/aiChatAssistant';
import { useManagerPresence } from '../utils/presence';

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
  const isManagerOnline = useManagerPresence(isManagerRole);
  const post = usePostRequestMessage(request.id);
  const [body, setBody] = useState('');
  const [botTyping, setBotTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [request.messages, botTyping]);

  const send = async (textToSend?: string) => {
    const text = (textToSend ?? body).trim();
    if (!text) return;
    try {
      await post.mutateAsync(text);
      setBody('');
      onChanged();

      // AUTOMATED AI BOT: ONLY trigger if Manager is currently OFFLINE and has not taken over
      const shouldAutoReply = shouldAiBotAutoReply(request.messages, text, isManagerRole, isManagerOnline);
      if (shouldAutoReply) {
        setBotTyping(true);
        window.setTimeout(async () => {
          try {
            const aiReply = generateContextualAiBotReply(text, request);
            await post.mutateAsync(aiReply);
            onChanged();
          } catch {
            // bot error ignored
          } finally {
            setBotTyping(false);
          }
        }, 1500);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Không thể gửi tin nhắn.';
      onError(msg);
    }
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: '10px',
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <CardContent sx={{ pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main', width: 36, height: 36 }}>
              <ForumOutlinedIcon fontSize="small" />
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {t('Contract Negotiation & Terms')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Direct channel between Customer and Service Manager for this request')}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip
              icon={<SmartToyOutlinedIcon sx={{ fontSize: '14px !important' }} />}
              label={
                isManagerRole
                  ? t('Direct negotiation with customer')
                  : t('Ask AI Assistant')
              }
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 650, fontSize: '0.75rem' }}
            />
            <Chip
              size="small"
              label={`${request.messages.length} ${t('messages')}`}
              color={request.messages.length > 0 ? 'primary' : 'default'}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          </Stack>
        </Stack>
      </CardContent>

      <Divider />

      {/* Messages Scroll Area */}
      <Box
        ref={scrollRef}
        sx={{
          p: { xs: 2, sm: 2.5 },
          minHeight: 340,
          maxHeight: { xs: 420, md: 520 },
          overflowY: 'auto',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc'),
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          scrollBehavior: 'smooth',
          '&::-webkit-scrollbar': {
            width: 6,
          },
          '&::-webkit-scrollbar-thumb': {
            bgcolor: 'divider',
            borderRadius: 3,
          },
        }}
      >
        {request.messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              my: 'auto',
              py: 6,
              color: 'text.secondary',
            }}
          >
            <ForumOutlinedIcon sx={{ fontSize: 48, opacity: 0.25, mb: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Chưa có tin nhắn đàm phán nào
            </Typography>
            <Typography variant="caption" sx={{ maxWidth: 380, textAlign: 'center', mt: 0.75, color: 'text.secondary' }}>
              Gửi tin nhắn hoặc chọn gợi ý nhanh bên dưới để làm rõ điều kiện bay, khung giờ và chi phí với đối tác.
            </Typography>
          </Box>
        ) : (
          request.messages.map((message) => {
            const isMe = currentUser?.id === message.authorUserId;
            const authorRole = message.authorRole;
            const isManager = authorRole === 'MANAGER' || authorRole === 'ADMIN';
            const isAiBot = message.body.startsWith('🤖');

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
                    isAiBot ? (
                      <SmartToyOutlinedIcon sx={{ fontSize: 16, color: 'secondary.main' }} />
                    ) : isManager ? (
                      <SupportAgentRoundedIcon sx={{ fontSize: 16, color: 'info.main' }} />
                    ) : (
                      <PersonOutlineRoundedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    )
                  )}
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    {isMe ? 'Bạn' : isAiBot ? 'Trợ lý AI SmartDrone' : message.authorName || 'Đối tác'}
                  </Typography>
                  {!isMe && (
                    <Chip
                      label={isAiBot ? 'AI Assistant' : isManager ? 'Quản lý Dịch vụ' : 'Khách hàng'}
                      size="small"
                      color={isAiBot ? 'secondary' : isManager ? 'info' : 'default'}
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.75rem', fontWeight: 600 }}
                    />
                  )}
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.25,
                    borderRadius: isMe ? '10px 10px 5px 10px' : '10px 10px 10px 5px',
                    bgcolor: (theme) =>
                      isMe
                        ? 'primary.main'
                        : isAiBot
                          ? theme.palette.mode === 'dark'
                            ? 'rgba(156, 39, 176, 0.18)'
                            : '#f3e5f5'
                          : 'background.paper',
                    color: isMe ? 'primary.contrastText' : 'text.primary',
                    border: isMe ? 'none' : '1px solid',
                    borderColor: isAiBot ? 'secondary.light' : 'divider',
                    boxShadow: isMe
                      ? '0 2px 6px rgba(0, 109, 119, 0.2)'
                      : '0 1px 3px rgba(0,0,0,0.04)',
                  }}
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
              </Box>
            );
          })
        )}
        {botTyping && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              p: 1.5,
              px: 2,
              borderRadius: '10px 10px 10px 5px',
              bgcolor: (theme) =>
                theme.palette.mode === 'dark' ? 'rgba(156, 39, 176, 0.15)' : '#f3e5f5',
              border: '1px solid',
              borderColor: 'secondary.light',
              alignSelf: 'flex-start',
              maxWidth: '80%',
            }}
          >
            <SmartToyOutlinedIcon sx={{ fontSize: 18, color: 'secondary.main' }} />
            <Typography variant="body2" sx={{ color: 'secondary.main', fontStyle: 'italic', fontWeight: 600 }}>
              Trợ lý AI SmartDrone đang soạn câu trả lời...
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Chat Input Section */}
      <Box sx={{ p: 1.5, bgcolor: 'background.paper' }}>
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
                sx: { borderRadius: '8px', fontSize: '0.875rem' },
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
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}>
          💡 Mẹo: Bấm <strong>Enter</strong> để gửi tin nhắn, <strong>Shift + Enter</strong> để xuống dòng.
        </Typography>
      </Box>
    </Card>
  );
}
