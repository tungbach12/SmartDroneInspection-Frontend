import { useEffect, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import { api } from '@/shared/api/client';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  sx?: Record<string, unknown>;
  maxHeight?: number | string;
}

/** Fetches image bytes with the shared authenticated API client. */
export function AuthenticatedImage({ src, alt, sx, maxHeight = 420 }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;
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
          border: '1px dashed #eaecf0',
          borderRadius: '12px',
          color: '#667085',
          bgcolor: '#fafbfc',
          gap: 1,
          ...sx,
        }}
      >
        <img src="" alt={alt} style={{ display: 'none' }} />
        <BrokenImageOutlined sx={{ fontSize: 32, color: '#98a2b3' }} />
        <Typography variant="caption">Could not load preview</Typography>
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
      <Box
        component="img"
        // Only the authenticated blob URL may reach src. Putting the protected path here would
        // make the browser fetch it directly, without the bearer token, and answer 401.
        src={blobUrl ?? undefined}
        data-src={src}
        alt={alt}
        sx={{
          maxWidth: '100%',
          maxHeight,
          objectFit: 'contain',
          borderRadius: '12px',
          display: loading ? 'none' : 'block',
          bgcolor: '#ffffff',
          ...sx,
        }}
      />
    </>
  );
}
