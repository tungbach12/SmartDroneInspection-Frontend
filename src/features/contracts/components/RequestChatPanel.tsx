import { Fragment, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  InputBase,
  Stack,
  Typography,
} from '@mui/material';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import { api } from '@/shared/api/client';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import { type ServiceRequest, type ServiceRequestMessageAttachment } from '../api/contractApi';
import { usePostRequestMessage, useMarkMessagesRead } from '../hooks/useContracts';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_ATTACHMENT_COUNT = 5;
const MAX_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENT_TOTAL_SIZE = 20 * 1024 * 1024;
const ACCEPTED_ATTACHMENT_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageAttachment({
  requestId,
  messageId,
  attachment,
  locale,
  onError,
}: {
  requestId: string;
  messageId: string;
  attachment: ServiceRequestMessageAttachment;
  locale: string;
  onError: (message: string) => void;
}) {
  const image = attachment.contentType.startsWith('image/');
  const path = `/contracts/requests/${requestId}/messages/${messageId}/attachments/${attachment.id}`;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!image) return;
    let active = true;
    let objectUrl: string | null = null;
    api.get<Blob>(path, { responseType: 'blob' }).then(({ data }) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(data);
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (active) onError(locale === 'vi' ? 'Không thể tải ảnh đính kèm.' : 'Could not load image attachment.');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image, locale, onError, path]);

  const download = async () => {
    try {
      const { data } = await api.get<Blob>(path, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = attachment.fileName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch {
      onError(locale === 'vi' ? 'Không thể tải tệp đính kèm.' : 'Could not download attachment.');
    }
  };

  return image ? (
    <Box sx={{ display: 'block', mt: 1, maxWidth: 360 }} aria-label={attachment.fileName}>
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={attachment.fileName}
          loading="lazy"
          style={{ display: 'block', maxWidth: '100%', maxHeight: 280, borderRadius: 8 }}
        />
      ) : (
        <Box
          role="status"
          sx={{
            width: 220,
            height: 90,
            display: 'grid',
            placeItems: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
          }}
        >
          <Typography variant="caption">{locale === 'vi' ? 'Đang tải ảnh…' : 'Loading image…'}</Typography>
        </Box>
      )}
      <Typography variant="caption" sx={{ display: 'block', mt: 0.4, opacity: 0.85 }}>
        {attachment.fileName} · {formatFileSize(attachment.sizeBytes)}
      </Typography>
    </Box>
  ) : (
    <Button
      onClick={() => void download()}
      startIcon={<InsertDriveFileOutlinedIcon />}
      sx={{
        mt: 0.75,
        justifyContent: 'flex-start',
        color: 'inherit',
        border: '1px solid',
        borderColor: 'currentColor',
        textTransform: 'none',
        maxWidth: 360,
        '& .MuiButton-startIcon': { opacity: 0.8 },
      }}
    >
      <Box sx={{ minWidth: 0, textAlign: 'left' }}>
        <Typography variant="body2" noWrap>{attachment.fileName}</Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>{formatFileSize(attachment.sizeBytes)}</Typography>
      </Box>
    </Button>
  );
}

interface RequestChatPanelProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
}

function getDateGroupKey(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatDateHeading(isoDate: string, locale: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function RequestChatPanel({ request, onChanged, onError }: RequestChatPanelProps) {
  const { locale, t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const userRoles = useAuthStore((state) => state.roles);
  const isManagerRole = userRoles.includes('MANAGER') || userRoles.includes('ADMIN');
  const post = usePostRequestMessage(request.id);
  const { mutate: markRead } = useMarkMessagesRead(request.id);
  const [body, setBody] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      markRead(request.id);
    }
  }, [request.id, request.messages, currentUser?.id, markRead]);

  const totalSelectedBytes = selectedFiles.reduce((total, file) => total + file.size, 0);

  const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (selectedFiles.length + incoming.length > MAX_ATTACHMENT_COUNT) {
      onError(locale === 'vi' ? 'Mỗi tin nhắn tối đa 5 tệp.' : 'A message can include up to 5 files.');
      return;
    }
    if (incoming.some((file) => !ACCEPTED_ATTACHMENT_TYPES.has(file.type))) {
      onError(
        locale === 'vi'
          ? 'Chỉ hỗ trợ PNG, JPG, WEBP, PDF và DOCX.'
          : 'Only PNG, JPG, WEBP, PDF, and DOCX files are supported.',
      );
      return;
    }
    if (incoming.some((file) => file.size > MAX_ATTACHMENT_FILE_SIZE)) {
      onError(locale === 'vi' ? 'Mỗi tệp tối đa 10 MB.' : 'Each file is limited to 10 MB.');
      return;
    }
    const next = [...selectedFiles, ...incoming];
    if (next.reduce((total, file) => total + file.size, 0) > MAX_ATTACHMENT_TOTAL_SIZE) {
      onError(locale === 'vi' ? 'Tổng dung lượng đính kèm tối đa 20 MB.' : 'Attachments are limited to 20 MB total.');
      return;
    }
    setSelectedFiles(next);
  };

  const send = async (textToSend?: string) => {
    const text = (textToSend ?? body).trim();
    if (!text && selectedFiles.length === 0) return;
    try {
      await post.mutateAsync({ body: text, files: selectedFiles });
      setBody('');
      setSelectedFiles([]);
      onChanged();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to send message.';
      onError(msg);
    }
  };

  const otherPartyMessage = [...(request.messages || [])]
    .reverse()
    .find((m) => m.authorUserId !== currentUser?.id && m.authorName);
  const partnerName =
    otherPartyMessage?.authorName || (isManagerRole ? t('Customer') : t('Service Manager'));
  const partnerInitial = partnerName.trim().charAt(0).toUpperCase() || 'U';
  const requestPath = `/${isManagerRole ? 'manager' : 'client'}/contracts?requestId=${request.id}`;

  const myMessages = (request.messages || []).filter((m) => m.authorUserId === currentUser?.id);
  const lastMyMessage = myMessages[myMessages.length - 1];

  return (
    <Box
      sx={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        minHeight: 0,
      }}
    >
      {/* Top Conversation Header */}
      <Box
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: 1.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar
            sx={{
              bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent)',
              color: 'primary.main',
              width: 40,
              height: 40,
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
              {request.description} · {request.status}
            </Typography>
          </Box>
        </Stack>

        <Button
          component={Link}
          to={requestPath}
          size="small"
          variant="outlined"
          endIcon={<ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} />}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            flexShrink: 0,
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          {locale === 'vi' ? 'Xem yêu cầu' : 'Open request'}
        </Button>
      </Box>

      {/* Clean NextAdmin Messages Canvas */}
      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 340,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.75,
          bgcolor: 'background.paper',
          scrollBehavior: 'smooth',
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
              py: 8,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                mb: 1.5,
              }}
            >
              <ForumOutlinedIcon sx={{ fontSize: 24, color: 'text.secondary' }} />
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {locale === 'vi' ? 'Chưa có tin nhắn đàm phán nào' : 'No messages yet'}
            </Typography>
            <Typography
              variant="caption"
              sx={{ maxWidth: 380, mt: 0.5, color: 'text.secondary', lineHeight: 1.5 }}
            >
              {locale === 'vi'
                ? 'Gửi tin nhắn để trao đổi chi tiết về phạm vi, khung giờ bay và thống nhất báo giá hợp đồng.'
                : 'Send a message to discuss inspection scope, flight timing, and quotation terms.'}
            </Typography>
          </Box>
        ) : (
          request.messages.map((message, index) => {
            const isMe = currentUser?.id === message.authorUserId;
            const isLastFromMe = isMe && message.id === lastMyMessage?.id;
            const prevMessage = index > 0 ? request.messages[index - 1] : null;
            const showDateHeader =
              !prevMessage ||
              getDateGroupKey(prevMessage.createdAt) !== getDateGroupKey(message.createdAt);

            return (
              <Fragment key={message.id}>
                {showDateHeader && (
                  <Box sx={{ textAlign: 'center', my: 0.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                    >
                      {formatDateHeading(message.createdAt, locale)}
                    </Typography>
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    alignItems: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: { xs: '86%', sm: '70%' },
                  }}
                >
                  {!isMe && message.authorName && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 0.4, px: 0.5, fontWeight: 600, fontSize: '0.75rem' }}
                    >
                      {message.authorName}
                    </Typography>
                  )}

                  <Box
                    sx={(theme) => ({
                      px: 2,
                      py: 1.25,
                      borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                      bgcolor: isMe ? 'primary.main' : 'background.paper',
                      color: isMe ? '#ffffff' : 'text.primary',
                      border: isMe ? 'none' : '1px solid',
                      borderColor: 'divider',
                      boxShadow: isMe ? '0 1px 3px rgba(43, 132, 235, 0.25)' : 'none',
                      ...theme.applyStyles('dark', {
                        bgcolor: isMe ? 'primary.main' : '#27272A',
                        color: isMe ? '#FFFFFF' : '#F4F4F5',
                      }),
                    })}
                  >
                    {message.body && (
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
                    )}
                    {(message.attachments ?? []).map((attachment) => (
                      <MessageAttachment
                        key={attachment.id}
                        requestId={request.id}
                        messageId={message.id}
                        attachment={attachment}
                        locale={locale}
                        onError={onError}
                      />
                    ))}
                  </Box>

                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: 'center', mt: 0.4, px: 0.5 }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
                    >
                      {new Date(message.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Typography>
                    {isLastFromMe && (
                      message.readAt ? (
                        <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center' }}>
                          <DoneAllRoundedIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.6875rem', fontWeight: 600, color: 'primary.main' }}
                          >
                            {locale === 'vi' ? 'Đã xem' : 'Seen'}{' '}
                            {new Date(message.readAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Typography>
                        </Stack>
                      ) : (
                        <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center' }}>
                          <CheckRoundedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}
                          >
                            {locale === 'vi' ? 'Đã gửi' : 'Sent'}
                          </Typography>
                        </Stack>
                      )
                    )}
                  </Stack>
                </Box>
              </Fragment>
            );
          })
        )}
      </Box>

      {/* NextAdmin Rounded Composer Card */}
      <Box sx={{ p: 2, pt: 1 }}>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
            bgcolor: 'background.paper',
            overflow: 'hidden',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            hidden
            multiple
            accept="image/png,image/jpeg,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={selectFiles}
          />
          <Box
            sx={{
              px: 1.75,
              py: 0.75,
              borderBottom: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {locale === 'vi'
                ? 'Enter để gửi · Shift + Enter để xuống dòng · Tối đa 5 tệp / 20 MB'
                : 'Enter to send · Shift + Enter for new line · Up to 5 files / 20 MB'}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.75rem', fontVariantNumeric: 'tabular-nums', flexShrink: 0, ml: 1 }}
            >
              {body.length}/{MAX_MESSAGE_LENGTH}
            </Typography>
          </Box>

          {selectedFiles.length > 0 && (
            <Stack direction="row" spacing={0.75} sx={{ p: 1.25, pb: 0, flexWrap: 'wrap' }}>
              {selectedFiles.map((file, index) => (
                <Chip
                  key={`${file.name}-${file.lastModified}-${index}`}
                  size="small"
                  label={`${file.name} · ${formatFileSize(file.size)}`}
                  onDelete={() => setSelectedFiles((current) => current.filter((_, i) => i !== index))}
                  sx={{ maxWidth: '100%', mb: 0.5 }}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mb: 0.5 }}>
                {formatFileSize(totalSelectedBytes)} / 20 MB
              </Typography>
            </Stack>
          )}

          <Stack
            direction="row"
            spacing={1.25}
            sx={{ p: 1.5, alignItems: 'flex-end' }}
          >
            <IconButton
              aria-label={locale === 'vi' ? 'Đính kèm tệp' : 'Attach files'}
              disabled={post.isPending || selectedFiles.length >= MAX_ATTACHMENT_COUNT}
              onClick={() => fileInputRef.current?.click()}
              sx={{ width: 38, height: 38, borderRadius: '8px', flexShrink: 0 }}
            >
              <AttachFileRoundedIcon fontSize="small" />
            </IconButton>
            <InputBase
              fullWidth
              multiline
              minRows={2}
              maxRows={5}
              placeholder={
                locale === 'vi' ? 'Nhập nội dung tin nhắn...' : 'Type your message...'
              }
              value={body}
              onChange={(event) => {
                if (event.target.value.length <= MAX_MESSAGE_LENGTH) {
                  setBody(event.target.value);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              sx={{
                fontSize: '0.875rem',
                lineHeight: 1.5,
                py: 0.25,
              }}
            />
            <LoadingButton
              variant="contained"
              color="primary"
              aria-label="Send message"
              loading={post.isPending}
              disabled={!body.trim() && selectedFiles.length === 0}
              onClick={() => void send()}
              sx={{
                minWidth: 38,
                width: 38,
                height: 38,
                p: 0,
                borderRadius: '8px',
                boxShadow: 'none',
                flexShrink: 0,
              }}
            >
              <SendRoundedIcon sx={{ fontSize: 18 }} />
            </LoadingButton>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
}
