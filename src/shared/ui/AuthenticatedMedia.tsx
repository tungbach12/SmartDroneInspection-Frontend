import { type RefObject, useEffect, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import VideocamOffOutlined from '@mui/icons-material/VideocamOffOutlined';
import { api } from '@/shared/api/client';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface AuthenticatedMediaProps {
  src: string;
  alt: string;
  contentType?: string | undefined;
  posterSrc?: string | undefined;
  sx?: Record<string, unknown> | undefined;
  maxHeight?: number | string | undefined;
  videoRef?: RefObject<HTMLVideoElement | null> | undefined;
}

function toApiRelativePath(src: string): string {
  const apiBaseUrl = (api.defaults.baseURL ?? '/api/v1').replace(/\/+$/, '');
  const withoutBase = src.startsWith(apiBaseUrl) ? src.slice(apiBaseUrl.length) : src;
  return withoutBase.startsWith('/') ? withoutBase : `/${withoutBase}`;
}

function resolveStreamUrl(streamUrl: string): string {
  if (/^https?:\/\//i.test(streamUrl)) {
    return streamUrl;
  }
  const base = api.defaults.baseURL ?? '';
  const originMatch = base.match(/^(https?:\/\/[^/]+)/i);
  if (originMatch) {
    return `${originMatch[1]}${streamUrl.startsWith('/') ? streamUrl : `/${streamUrl}`}`;
  }
  return streamUrl;
}

/**
 * Fetches protected inspection media cleanly:
 * - Images are fetched as authenticated blobs for in-memory rendering and canvas/annotation use.
 * - Videos exchange Bearer auth for a short-lived scoped media ticket and stream via native
 *   <video src> HTTP Range requests without downloading the whole file into a Blob.
 */
export function AuthenticatedMedia({
  src,
  alt,
  contentType = 'image/jpeg',
  posterSrc,
  sx,
  maxHeight = 420,
  videoRef,
}: AuthenticatedMediaProps) {
  const { t } = useLocale();
  const [prevKey, setPrevKey] = useState(`${src}|${posterSrc ?? ''}|${contentType}`);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const renderKey = `${src}|${posterSrc ?? ''}|${contentType}`;
  if (prevKey !== renderKey) {
    setPrevKey(renderKey);
    setMediaUrl(null);
    setPosterUrl(null);
    setLoading(true);
    setError(false);
  }

  const isVideo = contentType.startsWith('video/');

  useEffect(() => {
    let active = true;
    let createdBlobUrl: string | null = null;
    let createdPosterUrl: string | null = null;

    if (isVideo) {
      const relative = toApiRelativePath(src);
      const pathWithoutQuery = relative.split('?')[0] ?? relative;
      const ticketPath = pathWithoutQuery.endsWith('/content')
        ? `${pathWithoutQuery.slice(0, -'/content'.length)}/media-ticket`
        : `${pathWithoutQuery}/media-ticket`;

      api
        .post<{ streamUrl: string }>(ticketPath)
        .then(({ data }) => {
          if (!active) return;
          setMediaUrl(resolveStreamUrl(data.streamUrl));
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setError(true);
          setLoading(false);
        });

      if (posterSrc) {
        api
          .get<Blob>(toApiRelativePath(posterSrc), { responseType: 'blob' })
          .then(({ data }) => {
            if (!active) return;
            createdPosterUrl = URL.createObjectURL(data);
            setPosterUrl(createdPosterUrl);
          })
          .catch(() => {
            // Poster is optional; stream still works without it.
          });
      }
    } else {
      api
        .get<Blob>(toApiRelativePath(src), { responseType: 'blob' })
        .then(({ data }) => {
          if (!active) return;
          createdBlobUrl = URL.createObjectURL(data);
          setMediaUrl(createdBlobUrl);
          setLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setError(true);
          setLoading(false);
        });
    }

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
      if (createdPosterUrl) {
        URL.revokeObjectURL(createdPosterUrl);
      }
    };
  }, [src, posterSrc, isVideo]);

  if (error && !mediaUrl) {
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
          ref={videoRef}
          controls
          preload="metadata"
          poster={posterUrl ?? undefined}
          src={mediaUrl ?? undefined}
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
          src={mediaUrl ?? undefined}
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
