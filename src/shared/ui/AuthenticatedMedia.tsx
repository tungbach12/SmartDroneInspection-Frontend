import { useEffect, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import VideocamOffOutlined from '@mui/icons-material/VideocamOffOutlined';
import { api } from '@/shared/api/client';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface AuthenticatedMediaProps {
  src: string;
  alt: string;
  contentType?: string;
  sx?: Record<string, unknown>;
  maxHeight?: number | string;
}

/**
 * Fetches media bytes (image or video) with the shared authenticated API client,
 * producing an in-memory blob URL for rendering protected object store content.
 */
export function AuthenticatedMedia({
  src,
  alt,
  contentType = 'image/jpeg',
  sx,
  maxHeight = 420,
}: AuthenticatedMediaProps) {
  const { t } = useLocale();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isVideo = contentType.startsWith('video/');

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    const apiBaseUrl = api.defaults.baseURL?.replace(/\/+$/, '') ?? '/api/v1';
    const requestPath = src.startsWith(apiBaseUrl) ? src.slice(apiBaseUrl.length) : src;
    const requestUrl = requestPath.startsWith('/') ? requestPath : `/${requestPath}`;

    api
      .get<Blob>(requestUrl, { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(data);
        setBlobUrl(createdUrl);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src]);

  if (error && !blobUrl) {
    return (
      <Box
        data-src={src}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 220,
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: '12px',
          color: 'text.secondary',
          bgcolor: 'action.hover',
          gap: 1,
          ...sx,
        }}
      >
        {isVideo ? (
          <VideocamOffOutlined sx={{ fontSize: 32, color: 'text.disabled' }} />
        ) : (
          <BrokenImageOutlined sx={{ fontSize: 32, color: 'text.disabled' }} />
        )}
        <Typography variant="caption">{t('Could not load preview')}</Typography>
      </Box>
    );
  }

  return (
    <>
      {loading && (
        <Skeleton
          variant="rectangular"
          height={typeof maxHeight === 'number' ? maxHeight : 320}
          sx={{ borderRadius: '12px', ...sx }}
        />
      )}
      {isVideo ? (
        <Box
          component="video"
          controls
          src={blobUrl ?? undefined}
          data-src={src}
          aria-label={alt}
          sx={{
            maxWidth: '100%',
            maxHeight,
            borderRadius: '12px',
            display: loading ? 'none' : 'block',
            bgcolor: '#000000',
            ...sx,
          }}
        />
      ) : (
        <Box
          component="img"
          src={blobUrl ?? undefined}
          data-src={src}
          alt={alt}
          sx={{
            maxWidth: '100%',
            maxHeight,
            objectFit: 'contain',
            borderRadius: '12px',
            display: loading ? 'none' : 'block',
            bgcolor: 'background.paper',
            ...sx,
          }}
        />
      )}
    </>
  );
}
