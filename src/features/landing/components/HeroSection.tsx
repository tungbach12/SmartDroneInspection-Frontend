import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

export function HeroSection() {
  const figureRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!figureRef.current) return;
    const animation = animate(figureRef.current, {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 900,
      ease: 'outExpo',
    });
    return () => {
      animation.pause();
    };
  }, []);

  return (
    <Box component="section" sx={{ bgcolor: '#f4f8fa', color: '#12222b' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 10 }, pb: { xs: 6, md: 10 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.05fr) minmax(0, 0.95fr)' },
            gap: { xs: 5, md: 8 },
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: '#3aa5bd', fontWeight: 700, letterSpacing: '0.22em' }}
            >
              DRONE INSPECTION, MANAGED
            </Typography>
            <Typography
              component="h1"
              variant="h1"
              sx={{
                mt: 2,
                fontSize: 'clamp(2.4rem, 5vw, 4.6rem)',
                lineHeight: 1.02,
                letterSpacing: '-0.045em',
                fontWeight: 700,
              }}
            >
              From flight plan to maintenance record.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2.5, color: '#4d6673', maxWidth: 520, lineHeight: 1.7 }}>
              Scope the asset, plan the mission, capture evidence with checksum, review AI candidates, and close
              defects with before and after proof.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button
                component="a"
                href="/register"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{ bgcolor: '#12222b', color: '#f4f8fa', px: 3.5, py: 1.5, borderRadius: 999, textTransform: 'none', fontWeight: 600 }}
              >
                Create Client account
              </Button>
              <Button
                component="a"
                href="/register-provider"
                variant="outlined"
                size="large"
                sx={{ px: 3.5, py: 1.5, borderRadius: 999, textTransform: 'none', fontWeight: 600, borderColor: '#c4d4dd', color: '#12222b' }}
              >
                Register as provider
              </Button>
            </Stack>
          </Box>

          <Box
            ref={figureRef}
            component="figure"
            sx={{
              m: 0,
              position: 'relative',
              minHeight: { xs: 300, md: 480 },
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              aria-hidden="true"
              sx={{
                position: 'absolute',
                width: { xs: 240, md: 380 },
                height: { xs: 240, md: 380 },
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(58,165,189,0.22) 0%, rgba(58,165,189,0.05) 55%, transparent 75%)',
              }}
            />
            <Box
              component="img"
              src="/images/landing/hero-asset.jpg"
              alt="Professional quadcopter inspection drone with a stabilized camera"
              loading="eager"
              sx={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: 520,
                borderRadius: 4,
                boxShadow: '0 32px 80px rgba(18,34,43,0.22)',
              }}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
