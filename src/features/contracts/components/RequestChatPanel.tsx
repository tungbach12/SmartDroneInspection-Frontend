import { type ReactNode, Fragment, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ArrowOutwardRoundedIcon from '@mui/icons-material/ArrowOutwardRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { api } from '@/shared/api/client';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import DoneAllRoundedIcon from '@mui/icons-material/DoneAllRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { LoadingButton } from '@/shared/ui/LoadingButton';
import {
  type InspectionChatThread,
  type PartnerChatThread,
  type ServiceRequest,
  type ServiceRequestMessage,
  type ServiceRequestMessageAttachment,
} from '../api/contractApi';
import {
  useMarkInspectionMessagesRead,
  useMarkMessagesRead,
  useMarkPartnerMessagesRead,
  usePostInspectionMessage,
  usePostPartnerMessage,
  usePostRequestMessage,
} from '../hooks/useContracts';
import {
  formatVndPerOccurrence,
  getEffectiveRequestStatus,
  getStatusLabel,
  resolveCurrentQuote,
} from '../shared/contractStage';

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

function saveBlobUrl(url: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function isImageAttachment(attachment: ServiceRequestMessageAttachment): boolean {
  return attachment.contentType.startsWith('image/');
}

/**
 * Renders one message attachment. Images load as an authenticated blob and open in a viewer
 * dialog where the original file can be downloaded; other file types keep the inline download.
 */
function MessageAttachment({
  attachmentPath: path,
  attachment,
  locale,
  onError,
}: {
  attachmentPath: string;
  attachment: ServiceRequestMessageAttachment;
  locale: string;
  onError: (message: string) => void;
}) {
  const image = isImageAttachment(attachment);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!image) return;
    let active = true;
    let objectUrl: string | null = null;
    api
      .get<Blob>(path, { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (active) {
          onError(
            locale === 'vi'
              ? 'Không thể tải ảnh đính kèm.'
              : 'Could not load image attachment.',
          );
        }
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image, locale, onError, path]);

  const download = async () => {
    setDownloading(true);
    try {
      // The preview blob already holds the bytes; re-fetch only when it is unavailable.
      if (previewUrl) {
        saveBlobUrl(previewUrl, attachment.fileName);
        return;
      }
      const { data } = await api.get<Blob>(path, { responseType: 'blob' });
      const objectUrl = URL.createObjectURL(data);
      saveBlobUrl(objectUrl, attachment.fileName);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    } catch {
      onError(
        locale === 'vi' ? 'Không thể tải tệp đính kèm.' : 'Could not download attachment.',
      );
    } finally {
      setDownloading(false);
    }
  };

  if (!image) {
    return (
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
          <Typography variant="body2" noWrap>
            {attachment.fileName}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.75 }}>
            {formatFileSize(attachment.sizeBytes)}
          </Typography>
        </Box>
      </Button>
    );
  }

  return (
    <>
      <Box
        sx={{
          mt: 0.75,
          maxWidth: 360,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '8px',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <Box
          component="button"
          type="button"
          aria-label={
            locale === 'vi'
              ? `Xem ảnh ${attachment.fileName}`
              : `View image ${attachment.fileName}`
          }
          onClick={() => setViewerOpen(true)}
          disabled={!previewUrl}
          sx={{
            display: 'block',
            width: '100%',
            p: 0,
            border: 0,
            bgcolor: 'transparent',
            cursor: previewUrl ? 'zoom-in' : 'default',
            lineHeight: 0,
            '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
          }}
        >
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt={attachment.fileName}
              loading="lazy"
              sx={{
                display: 'block',
                width: '100%',
                maxHeight: 280,
                objectFit: 'cover',
                bgcolor: 'action.hover',
              }}
            />
          ) : (
            <Box
              role="status"
              sx={{
                width: '100%',
                height: 140,
                display: 'grid',
                placeItems: 'center',
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {locale === 'vi' ? 'Đang tải ảnh…' : 'Loading image…'}
              </Typography>
            </Box>
          )}
        </Box>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            px: 1,
            py: 0.75,
            borderTop: '1px solid',
            borderColor: 'divider',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={attachment.fileName}
            >
              {attachment.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(attachment.sizeBytes)}
            </Typography>
          </Box>
          <Tooltip title={locale === 'vi' ? 'Tải ảnh về' : 'Download image'}>
            <span>
              <IconButton
                size="small"
                aria-label={locale === 'vi' ? 'Tải ảnh về' : 'Download image'}
                onClick={() => void download()}
                disabled={downloading}
              >
                <DownloadRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="lg"
        fullWidth
        aria-label={attachment.fileName}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            py: 1.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              component="span"
              sx={{ display: 'block', wordBreak: 'break-word' }}
            >
              {attachment.fileName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatFileSize(attachment.sizeBytes)}
            </Typography>
          </Box>
          <IconButton
            size="small"
            aria-label={locale === 'vi' ? 'Đóng' : 'Close'}
            onClick={() => setViewerOpen(false)}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: 'background.default', textAlign: 'center' }}>
          {previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt={attachment.fileName}
              sx={{
                display: 'inline-block',
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
                bgcolor: 'background.paper',
              }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button
            onClick={() => setViewerOpen(false)}
            color="inherit"
            sx={{ textTransform: 'none' }}
          >
            {locale === 'vi' ? 'Đóng' : 'Close'}
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadRoundedIcon />}
            onClick={() => void download()}
            disabled={downloading}
            sx={{ textTransform: 'none' }}
          >
            {locale === 'vi' ? 'Tải ảnh về' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

interface ChatConversationPanelProps {
  threadId: string;
  partnerName: string;
  partnerAvatarUrl?: string | null | undefined;
  subtitle: string;
  actionLabel: string;
  actionTo: string;
  emptyTitle: string;
  emptyDescription: string;
  contextStrip?: ReactNode | undefined;
  messages: ServiceRequestMessage[];
  isSending: boolean;
  onSend: (input: { body: string; files: File[] }) => Promise<void>;
  onMarkRead: () => void;
  getAttachmentPath: (messageId: string, attachmentId: string) => string;
  onError: (message: string) => void;
  onBack?: (() => void) | undefined;
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

function ChatConversationPanel({
  threadId,
  partnerName,
  partnerAvatarUrl,
  subtitle,
  actionLabel,
  actionTo,
  emptyTitle,
  emptyDescription,
  contextStrip,
  messages,
  isSending,
  onSend,
  onMarkRead,
  getAttachmentPath,
  onError,
  onBack,
}: ChatConversationPanelProps) {
  const { locale, t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const [body, setBody] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const onMarkReadRef = useRef(onMarkRead);
  const lastMarkedKeyRef = useRef<string>('');

  useEffect(() => {
    onMarkReadRef.current = onMarkRead;
  }, [onMarkRead]);

  const latestUnreadId = [...messages]
    .reverse()
    .find((m) => m.authorUserId !== currentUser?.id && !m.readAt)?.id;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!latestUnreadId) return;
    const key = `${threadId}:${latestUnreadId}`;
    if (lastMarkedKeyRef.current === key) return;
    lastMarkedKeyRef.current = key;
    onMarkReadRef.current();
  }, [threadId, latestUnreadId]);

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
      await onSend({ body: text, files: selectedFiles });
      setBody('');
      setSelectedFiles([]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unable to send message.';
      onError(msg);
    }
  };

  const partnerInitial = partnerName.trim().charAt(0).toUpperCase() || 'U';
  const myMessages = messages.filter((m) => m.authorUserId === currentUser?.id);
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
      <Box
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0, flex: 1 }}>
          {onBack && (
            <IconButton
              size="small"
              aria-label={t('Back to conversations')}
              onClick={onBack}
              sx={{ display: { xs: 'inline-flex', md: 'none' }, flexShrink: 0 }}
            >
              <ArrowBackRoundedIcon fontSize="small" />
            </IconButton>
          )}
          <Avatar
            src={partnerAvatarUrl?.trim() || undefined}
            sx={{
              bgcolor: 'color-mix(in srgb, var(--mui-palette-primary-main) 14%, transparent)',
              color: 'primary.main',
              width: 40,
              height: 40,
              fontSize: '0.875rem',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {partnerInitial}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25 }} noWrap>
              {partnerName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
              {subtitle}
            </Typography>
          </Box>
        </Stack>

        <Button
          component={Link}
          to={actionTo}
          size="small"
          variant="outlined"
          endIcon={<ArrowOutwardRoundedIcon sx={{ fontSize: 15 }} />}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            borderColor: 'divider',
            color: 'text.primary',
          }}
        >
          {actionLabel}
        </Button>
      </Box>

      {contextStrip && (
        <Box
          sx={{
            px: { xs: 1.5, sm: 2.5 },
            py: 0.75,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {contextStrip}
        </Box>
      )}

      <Box
        ref={scrollRef}
        sx={{
          flex: 1,
          minHeight: 0,
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
        {messages.length === 0 ? (
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
              {emptyTitle}
            </Typography>
            <Typography
              variant="caption"
              sx={{ maxWidth: 380, mt: 0.5, color: 'text.secondary', lineHeight: 1.5 }}
            >
              {emptyDescription}
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => {
            const isMe = currentUser?.id === message.authorUserId;
            const isLastFromMe = isMe && message.id === lastMyMessage?.id;
            const prevMessage = index > 0 ? messages[index - 1] : null;
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

                  {message.body && (
                    <Box
                      sx={(theme) => ({
                        px: 2,
                        py: 1.25,
                        borderRadius: isMe ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                        bgcolor: isMe ? 'primary.main' : 'background.paper',
                        color: isMe ? '#ffffff' : 'text.primary',
                        border: isMe ? 'none' : '1px solid',
                        borderColor: 'divider',
                        boxShadow: 'none',
                        ...theme.applyStyles('dark', {
                          bgcolor: isMe ? 'primary.main' : '#27272A',
                          color: isMe ? '#FFFFFF' : '#F4F4F5',
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
                    </Box>
                  )}

                  {(message.attachments ?? []).length > 0 && (
                    <Stack
                      spacing={1}
                      sx={{
                        mt: message.body ? 1 : 0,
                        alignItems: isMe ? 'flex-end' : 'flex-start',
                        width: '100%',
                      }}
                    >
                      {(message.attachments ?? []).map((attachment) => (
                        <MessageAttachment
                          key={attachment.id}
                          attachmentPath={getAttachmentPath(message.id, attachment.id)}
                          attachment={attachment}
                          locale={locale}
                          onError={onError}
                        />
                      ))}
                    </Stack>
                  )}

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
                    {isLastFromMe &&
                      (message.readAt ? (
                        <Stack direction="row" spacing={0.35} sx={{ alignItems: 'center' }}>
                          <DoneAllRoundedIcon sx={{ fontSize: 13, color: 'primary.main' }} />
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'primary.main' }}
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
                            sx={{ fontSize: '0.75rem', color: 'text.secondary' }}
                          >
                            {locale === 'vi' ? 'Đã gửi' : 'Sent'}
                          </Typography>
                        </Stack>
                      ))}
                  </Stack>
                </Box>
              </Fragment>
            );
          })
        )}
      </Box>

      <Box sx={{ p: 2, pt: 1 }}>
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '8px',
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
                  onDelete={() =>
                    setSelectedFiles((current) => current.filter((_, i) => i !== index))
                  }
                  sx={{ maxWidth: '100%', mb: 0.5 }}
                />
              ))}
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mb: 0.5 }}>
                {formatFileSize(totalSelectedBytes)} / 20 MB
              </Typography>
            </Stack>
          )}

          <Stack direction="row" spacing={1.25} sx={{ p: 1.5, alignItems: 'flex-end' }}>
            <IconButton
              aria-label={locale === 'vi' ? 'Đính kèm tệp' : 'Attach files'}
              disabled={isSending || selectedFiles.length >= MAX_ATTACHMENT_COUNT}
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
              placeholder={locale === 'vi' ? 'Nhập nội dung tin nhắn...' : 'Type your message...'}
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
              sx={{ fontSize: '0.875rem', lineHeight: 1.5, py: 0.25 }}
            />
            <LoadingButton
              variant="contained"
              color="primary"
              aria-label="Send message"
              loading={isSending}
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

interface RequestChatPanelProps {
  request: ServiceRequest;
  onChanged: () => void;
  onError: (message: string) => void;
  onBack?: () => void;
}

export function RequestChatPanel({ request, onChanged, onError, onBack }: RequestChatPanelProps) {
  const { locale, t } = useLocale();
  const currentUser = useAuthStore((state) => state.user);
  const userRoles = useAuthStore((state) => state.roles);
  const isManagerRole = userRoles.includes('MANAGER') || userRoles.includes('ADMIN');
  const post = usePostRequestMessage(request.id);
  const { mutate: markRead } = useMarkMessagesRead(request.id);

  const otherPartyMessage = [...(request.messages || [])]
    .reverse()
    .find((m) => m.authorUserId !== currentUser?.id && m.authorName);
  const partnerName =
    otherPartyMessage?.authorName || (isManagerRole ? t('Customer') : t('Service Manager'));
  const currentQuote = resolveCurrentQuote(request);
  const statusLabel = getStatusLabel(getEffectiveRequestStatus(request), t);
  const quoteAmount = Number(
    currentQuote?.pricePerOccurrenceVnd ?? currentQuote?.pricePerOccurrenceUsd ?? 0,
  );

  return (
    <ChatConversationPanel
      threadId={request.id}
      partnerName={partnerName}
      partnerAvatarUrl={!isManagerRole ? request.serviceManager?.avatarUrl : undefined}
      subtitle={`${request.description} · ${statusLabel}`}
      actionLabel={locale === 'vi' ? 'Xem yêu cầu' : 'Open request'}
      actionTo={`/${isManagerRole ? 'manager' : 'client'}/contracts?requestId=${request.id}`}
      emptyTitle={locale === 'vi' ? 'Chưa có tin nhắn đàm phán nào' : 'No messages yet'}
      emptyDescription={
        locale === 'vi'
          ? 'Gửi tin nhắn để trao đổi chi tiết về phạm vi, khung giờ bay và thống nhất báo giá hợp đồng.'
          : 'Send a message to discuss inspection scope, flight timing, and quotation terms.'
      }
      contextStrip={
        <>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {request.requestType === 'ONE_TIME'
              ? request.requestedFrom
              : `${request.requestedFrom} – ${request.requestedUntil}`}
            {request.occurrenceCount ? ` · ${request.occurrenceCount} ${t('occurrences')}` : ''}
          </Typography>
          {currentQuote && quoteAmount > 0 && (
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
            >
              {t('Current quote')}: {formatVndPerOccurrence(quoteAmount, locale)}
            </Typography>
          )}
        </>
      }
      messages={request.messages || []}
      isSending={post.isPending}
      onSend={async ({ body, files }) => {
        await post.mutateAsync({ body, files });
        onChanged();
      }}
      onMarkRead={() => markRead(request.id)}
      getAttachmentPath={(messageId, attachmentId) =>
        `/contracts/requests/${request.id}/messages/${messageId}/attachments/${attachmentId}`
      }
      onError={onError}
      onBack={onBack}
    />
  );
}

interface InspectionChatPanelProps {
  thread: InspectionChatThread;
  onChanged: () => void;
  onError: (message: string) => void;
  onBack?: () => void;
}

export function InspectionChatPanel({
  thread,
  onChanged,
  onError,
  onBack,
}: InspectionChatPanelProps) {
  const { locale, t } = useLocale();
  const userRoles = useAuthStore((state) => state.roles);
  const isInspectorRole = userRoles.includes('INSPECTOR');
  const post = usePostInspectionMessage(thread.inspectionId);
  const { mutate: markRead } = useMarkInspectionMessagesRead(thread.inspectionId);

  return (
    <ChatConversationPanel
      threadId={thread.inspectionId}
      partnerName={
        thread.counterpartName || (isInspectorRole ? t('Customer') : t('Inspector'))
      }
      partnerAvatarUrl={thread.counterpartAvatarUrl}
      subtitle={`${thread.assetName} · ${t(thread.status)}`}
      actionLabel={locale === 'vi' ? 'Mở đợt kiểm tra' : 'Open inspection'}
      actionTo={`/${isInspectorRole ? 'operations' : 'client'}/inspections/${thread.inspectionId}`}
      emptyTitle={
        locale === 'vi'
          ? 'Chưa có trao đổi nào cho đợt kiểm tra này'
          : 'No messages for this inspection yet'
      }
      emptyDescription={
        locale === 'vi'
          ? 'Gửi tin nhắn trực tiếp cho khách hàng hoặc phi công đối tác về lối vào hiện trường, lịch bay và phối hợp thực địa.'
          : 'Message directly about site access, flight timing, and field coordination.'
      }
      contextStrip={
        <>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {thread.plannedStartAt && thread.plannedEndAt
              ? `${new Date(thread.plannedStartAt).toLocaleString()} – ${new Date(
                  thread.plannedEndAt,
                ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : thread.assetName}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {thread.assignmentStatus === 'ACCEPTED'
              ? locale === 'vi'
                ? 'Đã xác nhận lịch bay'
                : 'Assignment confirmed'
              : locale === 'vi'
                ? 'Chờ xác nhận lịch bay'
                : 'Awaiting confirmation'}
          </Typography>
        </>
      }
      messages={thread.messages || []}
      isSending={post.isPending}
      onSend={async ({ body, files }) => {
        await post.mutateAsync({ body, files });
        onChanged();
      }}
      onMarkRead={() => markRead(thread.inspectionId)}
      getAttachmentPath={(messageId, attachmentId) =>
        `/inspections/${thread.inspectionId}/messages/${messageId}/attachments/${attachmentId}`
      }
      onError={onError}
      onBack={onBack}
    />
  );
}

interface PartnerChatPanelProps {
  thread: PartnerChatThread;
  onChanged: () => void;
  onError: (message: string) => void;
  onBack?: () => void;
}

export function PartnerChatPanel({
  thread,
  onChanged,
  onError,
  onBack,
}: PartnerChatPanelProps) {
  const { locale, t } = useLocale();
  const userRoles = useAuthStore((state) => state.roles);
  const isManagerRole = userRoles.includes('MANAGER') || userRoles.includes('ADMIN');
  const post = usePostPartnerMessage(thread.requestId, thread.inspectorId);
  const { mutate: markRead } = useMarkPartnerMessagesRead(thread.requestId, thread.inspectorId);
  const threadKey = `${thread.requestId}:${thread.inspectorId}`;

  return (
    <ChatConversationPanel
      threadId={threadKey}
      partnerName={
        thread.counterpartName || (isManagerRole ? t('Inspector') : t('Service Manager'))
      }
      partnerAvatarUrl={thread.counterpartAvatarUrl}
      subtitle={`${thread.assetName}${thread.assetCode ? ` (${thread.assetCode})` : ''} · ${thread.requestDescription}`}
      actionLabel={
        isManagerRole
          ? locale === 'vi'
            ? 'Xem yêu cầu'
            : 'Open request'
          : locale === 'vi'
            ? 'Danh sách đợt bay'
            : 'Open inspections'
      }
      actionTo={
        isManagerRole
          ? `/manager/contracts?requestId=${thread.requestId}`
          : '/operations/inspections'
      }
      emptyTitle={
        locale === 'vi'
          ? 'Chưa có trao đổi điều phối nào'
          : 'No partner coordination messages yet'
      }
      emptyDescription={
        locale === 'vi'
          ? 'Trao đổi trực tiếp giữa Quản lý dịch vụ và Phi công UAV về kế hoạch bay, giấy phép, thiết bị và tiến độ thực địa của đơn hàng.'
          : 'Coordinate directly between Service Manager and Inspector on flight schedule, permits, equipment, and field execution.'
      }
      contextStrip={
        <>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {thread.customerName ? `${t('Customer')}: ${thread.customerName} · ` : ''}
            {thread.occurrenceCount} {locale === 'vi' ? 'đợt phụ trách' : t('occurrences')}
          </Typography>
          {thread.nextPlannedStartAt && thread.nextPlannedEndAt && (
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}
            >
              {new Date(thread.nextPlannedStartAt).toLocaleString()} –{' '}
              {new Date(thread.nextPlannedEndAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          )}
        </>
      }
      messages={thread.messages || []}
      isSending={post.isPending}
      onSend={async ({ body, files }) => {
        await post.mutateAsync({ body, files });
        onChanged();
      }}
      onMarkRead={() => markRead({ requestId: thread.requestId, inspectorId: thread.inspectorId })}
      getAttachmentPath={(messageId, attachmentId) =>
        `/contracts/partner-messages/${thread.requestId}/inspectors/${thread.inspectorId}/attachments/${messageId}/${attachmentId}`
      }
      onError={onError}
      onBack={onBack}
    />
  );
}
