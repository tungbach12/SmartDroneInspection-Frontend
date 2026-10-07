import { Box, Container, Stack, Typography } from '@mui/material';
import NorthEastIcon from '@mui/icons-material/NorthEast';
import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { StatusChip } from './StatusChip';

export function DarkHero() {
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const elements = contentRef.current.querySelectorAll('[data-hero-anim]');
    if (!elements.length) return;

    const anim = animate(elements, {
      opacity: [0, 1],
      translateY: [24, 0],
      duration: 850,
      delay: stagger(120),
      ease: 'outExpo',
    });

    return () => {
      anim.pause();
    };
  }, []);

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: '100svh',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        bgcolor: '#000000',
        overflow: 'hidden',
        pb: { xs: 8, md: 12 },
      }}
    >
      {/* Background Image with object-fit: cover */}
      <Box
        component="img"
        src="/images/landing/dark-drone-hero.jpg"
        alt="High-voltage transmission inspection drone with technical camera gimbal"
        loading="eager"
        sx={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 35%',
          opacity: 0.88,
          filter: 'contrast(1.1) brightness(0.9)',
        }}
      />

      {/* Scrim Gradients: bottom 40-70% per spec linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.76) 40%, rgba(0,0,0,0) 93.785%) */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0.92) 28%, rgba(0, 0, 0, 0.76) 55%, rgba(0, 0, 0, 0.25) 90%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />

      {/* Subtle blue accent glow behind bottom content */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          bottom: '10%',
          left: '15%',
          width: '500px',
          height: '240px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(82, 168, 255, 0.12) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      {/* Hero Content */}
      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 10,
          pt: { xs: 18, md: 24 },
        }}
      >
        <div ref={contentRef}>
          {/* Status Indicators (Pills per spec) */}
          <Stack
            data-hero-anim
            direction="row"
            spacing={1.5}
            sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
          >
            <StatusChip status="pass" label="RTK GPS LOCKED" />
            <StatusChip status="active" label="SHA-256 RAW VERIFICATION" />
            <StatusChip status="warn" label="HUMAN-GATED REVIEW" />
          </Stack>

          {/* Headline: Inter Display / Geist, 500 weight, fluid 32px to 60px, -1px to -3.36px tracking */}
          <Typography
            data-hero-anim
            component="h1"
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(32px, 5.5vw, 60px)',
              lineHeight: 1.05,
              letterSpacing: { xs: '-1.2px', md: '-2.8px' },
              color: '#FFFFFF',
              maxWidth: '752px',
              textWrap: 'balance',
            }}
          >
            High-Integrity Drone Telemetry & Cryptographic Inspection
          </Typography>

          {/* Subtext: 16px, #e7e7e7, max-width 640px */}
          <Typography
            data-hero-anim
            sx={{
              mt: 2.5,
              fontFamily: '"Geist Sans", sans-serif',
              fontSize: '16px',
              lineHeight: 1.65,
              color: '#e7e7e7',
              maxWidth: '640px',
            }}
          >
            Automate mission plans, capture raw imagery with immutable checksums, screen defects through neural models, and mandate assigned human validation before release.
          </Typography>

          {/* Square CTAs (0px border-radius, background #FFFFFF, text #121212) */}
          <Stack
            data-hero-anim
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ mt: 4 }}
          >
            <Box
              component="a"
              href="/register"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                bgcolor: '#FFFFFF',
                color: '#121212',
                px: '24px',
                py: '14px',
                borderRadius: '0px',
                textDecoration: 'none',
                fontFamily: '"Geist Sans", sans-serif',
                fontWeight: 600,
                fontSize: { xs: '16px', md: '18px' },
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#ededed',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Deploy Inspection Workspace
              <NorthEastIcon sx={{ fontSize: 16 }} />
            </Box>

            <Box
              component="a"
              href="https://smartdroneinspection-provider.duckdns.org/register-provider"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                bgcolor: 'transparent',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                px: '22px',
                py: '14px',
                borderRadius: '0px',
                textDecoration: 'none',
                fontFamily: '"Geist Sans", sans-serif',
                fontWeight: 500,
                fontSize: { xs: '15px', md: '16px' },
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: '#52a8ff',
                  color: '#52a8ff',
                },
              }}
            >
              Register Provider Node
              <NorthEastIcon sx={{ fontSize: 14 }} />
            </Box>
          </Stack>
        </div>
      </Container>
    </Box>
  );
}
