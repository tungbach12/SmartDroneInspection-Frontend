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
import { useAuthStore } from '@/features/auth/store/authStore';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest } from '../api/contractApi';
import { usePostRequestMessage } from '../hooks/useContracts';

interface RequestChatPanelProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
}

const QUICK_PROMPTS = [
  '🗓️ Đề xuất khung giờ bay vào sáng sớm (07:00–09:00)',
  '🚁 Yêu cầu bổ sung drone chuyên dụng camera nhiệt/zoom quang học',
  '💰 Đề nghị điều chỉnh mức dự toán chi phí phù hợp ngân sách',
  '📄 Yêu cầu cấp giấy phép bay đặc khu quân sự/an ninh',
];

export function RequestChatPanel({ request, onChanged, onError }: RequestChatPanelProps) {
  const currentUser = useAuthStore((state) => state.user);
  const post = usePostRequestMessage(request.id);
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [request.messages]);

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

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
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
                Trao đổi & Đàm phán Điều khoản
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Kênh liên lạc trực tiếp giữa Khách hàng và Quản lý Dịch vụ cho yêu cầu này
              </Typography>
            </Box>
          </Stack>
          <Chip
            size="small"
            label={`${request.messages.length} tin nhắn`}
            color={request.messages.length > 0 ? 'primary' : 'default'}
            variant="outlined"
            sx={{ fontWeight: 600, fontSize: '0.75rem' }}
          />
        </Stack>
      </CardContent>

      <Divider />

      {/* Messages Scroll Area */}
      <Box
        ref={scrollRef}
        sx={{
          p: 2,
          minHeight: 280,
          maxHeight: 380,
          overflowY: 'auto',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'background.default' : '#f8fafc'),
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
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
              py: 4,
              color: 'text.secondary',
            }}
          >
            <ForumOutlinedIcon sx={{ fontSize: 44, opacity: 0.3, mb: 1 }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Chưa có tin nhắn đàm phán nào
            </Typography>
            <Typography variant="caption" sx={{ maxWidth: 360, textAlign: 'center', mt: 0.5 }}>
              Gửi tin nhắn hoặc chọn gợi ý bên dưới để làm rõ điều kiện bay, khung giờ và chi phí với đối tác.
            </Typography>
          </Box>
        ) : (
          request.messages.map((message) => {
            const isMe = currentUser?.id === message.authorUserId;
            const authorRole = message.authorRole;
            const isManager = authorRole === 'MANAGER' || authorRole === 'ADMIN';

            return (
              <Box
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: { xs: '88%', sm: '75%' },
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
                    {isMe ? 'Bạn' : message.authorName || 'Đối tác'}
                  </Typography>
                  {authorRole && !isMe && (
                    <Chip
                      label={isManager ? 'Quản lý Dịch vụ' : 'Khách hàng'}
                      size="small"
                      color={isManager ? 'info' : 'default'}
                      variant="outlined"
                      sx={{ height: 18, fontSize: '0.68rem', fontWeight: 600 }}
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    bgcolor: isMe ? 'primary.main' : 'background.paper',
                    color: isMe ? 'primary.contrastText' : 'text.primary',
                    border: isMe ? 'none' : '1px solid',
                    borderColor: 'divider',
                    boxShadow: isMe ? '0 2px 6px rgba(2, 106, 162, 0.25)' : '0 1px 3px rgba(0,0,0,0.05)',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.5 }}>
                    {message.body}
                  </Typography>
                </Paper>
              </Box>
            );
          })
        )}
      </Box>

      {/* Quick Prompts Bar */}
      <Box sx={{ px: 2, pt: 1, pb: 0.5, bgcolor: 'background.paper' }}>
        <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {QUICK_PROMPTS.map((prompt, i) => (
            <Chip
              key={i}
              label={prompt}
              size="small"
              clickable
              onClick={() => {
                setBody((prev) => (prev ? `${prev}\n${prompt}` : prompt));
              }}
              sx={{ fontSize: '0.75rem', height: 26, bgcolor: 'action.hover' }}
            />
          ))}
        </Stack>
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
                sx: { borderRadius: 2, fontSize: '0.9rem' },
              },
            }}
          />
          <LoadingButton
            variant="contained"
            color="primary"
            loading={post.isPending}
            disabled={!body.trim()}
            onClick={() => void send()}
            sx={{
              minWidth: 44,
              width: 44,
              height: 40,
              borderRadius: 2,
              p: 0,
            }}
          >
            <SendRoundedIcon fontSize="small" />
          </LoadingButton>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontSize: '0.7rem' }}>
          💡 Mẹo: Bấm <strong>Enter</strong> để gửi tin nhắn, <strong>Shift + Enter</strong> để xuống dòng.
        </Typography>
      </Box>
    </Card>
  );
}
