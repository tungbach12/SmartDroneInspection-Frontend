import { useEffect, useState } from 'react';
import { Box, Skeleton, Typography } from '@mui/material';
import BrokenImageOutlined from '@mui/icons-material/BrokenImageOutlined';
import { useAuthStore } from '@/features/auth/store/authStore';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  sx?: Record<string, unknown>;
  maxHeight?: number | string;
}

/**
 * Fetches an image through the authenticated API client and renders it as an object URL.
 * Automatically attaches Bearer token from the in-memory session.
 */
export function AuthenticatedImage({ src, alt, sx, maxHeight = 420 }: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    // Normalize URL
    const normalizedUrl = src.startsWith('http')
      ? src
      : src.startsWith('/api/v1')
        ? src
        : `/api/v1${src.startsWith('/') ? src : `/${src}`}`;

    fetch(normalizedUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (!active) return;
        createdUrl = URL.createObjectURL(blob);
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
  }, [src, token]);

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
        <img src={src} alt={alt} style={{ display: 'none' }} />
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
        src={blobUrl ?? src}
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
