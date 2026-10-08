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
      {/* Background Drone Visual with object-fit: cover */}
      <Box
        component="img"
        src="/images/landing/dark-drone-hero.jpg"
        alt="Automated infrastructure drone inspection"
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

      {/* Scrim Overlay */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, #000000 0%, rgba(0, 0, 0, 0.92) 28%, rgba(0, 0, 0, 0.76) 55%, rgba(0, 0, 0, 0.25) 90%, rgba(0, 0, 0, 0.6) 100%)',
        }}
      />

      {/* Subtle blue accent glow */}
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
          {/* Status Indicators: Value propositions */}
          <Stack
            data-hero-anim
            direction="row"
            spacing={1.5}
            sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
          >
            <StatusChip status="pass" label="ZERO HUMAN CLIMBING RISK" />
            <StatusChip status="active" label="AI VISION DEFECT SCREENING" />
            <StatusChip status="pass" label="CERTIFIED INSPECTOR SIGN-OFF" />
          </Stack>

          {/* Outcome-driven Headline: What the visitor achieves */}
          <Typography
            data-hero-anim
            component="h1"
            sx={{
              fontFamily: '"Geist Sans", "Inter Display", sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(32px, 5.5vw, 62px)',
              lineHeight: 1.05,
              letterSpacing: { xs: '-1.2px', md: '-2.8px' },
              color: '#FFFFFF',
              maxWidth: '820px',
              textWrap: 'balance',
            }}
          >
            Inspect Infrastructure 10x Faster with Drones and AI
          </Typography>

          {/* Subtext: Who it is for & the painful problem it eliminates */}
          <Typography
            data-hero-anim
            sx={{
              mt: 2.5,
              fontFamily: '"Geist Sans", sans-serif',
              fontSize: '16px',
              lineHeight: 1.65,
              color: '#e7e7e7',
              maxWidth: '680px',
            }}
          >
            Eliminate costly scaffolding and hazardous rope access. SmartDroneInspection coordinates autonomous drone flights, flags structural cracks with computer vision, and delivers audit-ready repair tickets certified by licensed inspectors.
          </Typography>

          {/* Square CTAs (0px border-radius, brutalist contrast) */}
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
                fontSize: { xs: '16px', md: '17px' },
                transition: 'all 0.2s ease',
                '&:hover': {
                  bgcolor: '#ededed',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Start Free Inspection
              <NorthEastIcon sx={{ fontSize: 16 }} />
            </Box>

            <Box
              component="a"
              href="/login"
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
              Sign In for Field Operations
              <NorthEastIcon sx={{ fontSize: 14 }} />
            </Box>
          </Stack>

          {/* Friction-reducing microcopy */}
          <Typography
            data-hero-anim
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '12px',
              color: '#999999',
              mt: 2,
            }}
          >
            No credit card required · Instant setup · End-to-end audit compliance
          </Typography>
        </div>
      </Container>
    </Box>
  );
}
