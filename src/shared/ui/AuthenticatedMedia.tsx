import { type RefObject, useEffect, useRef, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import VideocamOffOutlined from '@mui/icons-material/VideocamOffOutlined';
import { api } from '@/shared/api/client';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export interface MediaSeekRequest {
  timestampSeconds: number;
  nonce: number;
}

interface AuthenticatedMediaProps {
  src: string;
  alt: string;
  contentType?: string | undefined;
  posterSrc?: string | undefined;
  sx?: Record<string, unknown> | undefined;
  maxHeight?: number | string | undefined;
  videoRef?: RefObject<HTMLVideoElement | null> | undefined;
  seekRequest?: MediaSeekRequest | null | undefined;
  onVideoStateChange?:
    | ((state: { currentTime: number; duration: number; paused: boolean }) => void)
    | undefined;
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
  seekRequest,
  onVideoStateChange,
}: AuthenticatedMediaProps) {
  const { t } = useLocale();
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
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

  useEffect(() => {
    if (!isVideo || !seekRequest) return;
    const videoEl = videoRef?.current ?? internalVideoRef.current;
    if (!videoEl) return;
    const targetTime = Math.max(0, seekRequest.timestampSeconds);
    const applySeek = () => {
      try {
        videoEl.currentTime = targetTime;
        videoEl.pause();
      } catch {
        // Ignore seek errors on unready mock elements in unit tests.
      }
    };
    if (videoEl.readyState >= 1) {
      applySeek();
      return;
    }
    videoEl.addEventListener('loadedmetadata', applySeek, { once: true });
    return () => {
      videoEl.removeEventListener('loadedmetadata', applySeek);
    };
  }, [isVideo, mediaUrl, seekRequest, videoRef]);

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
          ref={(el: HTMLVideoElement | null) => {
            internalVideoRef.current = el;
            if (videoRef && 'current' in videoRef) {
              (videoRef as { current: HTMLVideoElement | null }).current = el;
            }
          }}
          controls
          preload="metadata"
          onLoadedMetadata={(e) => {
            if (seekRequest && seekRequest.timestampSeconds > 0) {
              try {
                e.currentTarget.currentTime = seekRequest.timestampSeconds;
                e.currentTarget.pause();
              } catch {
                // Ignore if element is mocked.
              }
            }
            onVideoStateChange?.({
              currentTime: e.currentTarget.currentTime || 0,
              duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
              paused: e.currentTarget.paused,
            });
          }}
          onDurationChange={(e) => {
            onVideoStateChange?.({
              currentTime: e.currentTarget.currentTime || 0,
              duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
              paused: e.currentTarget.paused,
            });
          }}
          onTimeUpdate={(e) => {
            onVideoStateChange?.({
              currentTime: e.currentTarget.currentTime || 0,
              duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
              paused: e.currentTarget.paused,
            });
          }}
          onSeeked={(e) => {
            onVideoStateChange?.({
              currentTime: e.currentTarget.currentTime || 0,
              duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
              paused: e.currentTarget.paused,
            });
          }}
          onPlay={(e) => {
            onVideoStateChange?.({
              currentTime: e.currentTarget.currentTime || 0,
              duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
              paused: false,
            });
          }}
          onPause={(e) => {
            onVideoStateChange?.({
              currentTime: e.currentTarget.currentTime || 0,
              duration: Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0,
              paused: true,
            });
          }}
          poster={posterUrl ?? undefined}
          src={mediaUrl ?? undefined}
          data-src={src}
          aria-label={alt}
          sx={{
            width: '100%',
            maxWidth: '100%',
            maxHeight,
            objectFit: 'contain',
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
            mx: 'auto',
            bgcolor: 'background.paper',
            ...sx,
          }}
        />
      )}
      {isVideo && !loading && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('No captions')}
        </Typography>
      )}
    </>
  );
}
