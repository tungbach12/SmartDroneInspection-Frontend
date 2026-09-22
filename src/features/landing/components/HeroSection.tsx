﻿import { Box, Button, Chip, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useLandingColors } from '../landingTheme';

function DroneHeroVisual() {
  const colors = useLandingColors();

  return (
    <Box
      component="figure"
      sx={{
        m: 0,
        position: 'relative',
        width: '100%',
        minWidth: 0,
        overflow: 'hidden',
        minHeight: { xs: 280, sm: 410 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          width: { xs: 260, sm: 420 },
          height: { xs: 260, sm: 420 },
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.teal}35 0%, ${colors.teal}0e 38%, transparent 70%)`,
          filter: 'blur(2px)',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          width: '82%',
          height: '58%',
          border: `1px solid ${colors.heroLine}`,
          borderRadius: '50%',
          transform: 'rotate(-14deg)',
          boxShadow: `0 0 60px ${colors.teal}18`,
        }}
      />
      <Box
        component="img"
        src="/images/landing/inspection-drone-hero.png"
        alt="Professional quadcopter inspection drone with a stabilized camera"
        loading="eager"
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'block',
          width: '100%',
          maxWidth: '100%',
          height: 'auto',
          borderRadius: { xs: 3, sm: 5 },
          filter: 'contrast(1.06) saturate(1.08)',
          boxShadow: '0 32px 90px rgba(0, 0, 0, 0.38)',
        }}
      />
      <Stack
        direction="row"
        spacing={1}
        sx={{
          position: 'absolute',
          zIndex: 2,
          left: { xs: 8, sm: 18 },
          bottom: { xs: 8, sm: 18 },
          alignItems: 'center',
          px: 1.25,
          py: 0.75,
          bgcolor: colors.heroOverlay,
          border: `1px solid ${colors.heroLine}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: colors.teal, boxShadow: `0 0 0 5px ${colors.teal}24` }} />
        <Typography variant="caption" sx={{ color: colors.heroText, fontWeight: 800, letterSpacing: '0.06em' }}>
          INSPECTION DRONE
        </Typography>
      </Stack>
      <Typography component="figcaption" variant="caption" sx={{ position: 'absolute', right: { xs: 8, sm: 18 }, bottom: { xs: 12, sm: 22 }, zIndex: 2, color: colors.heroCaption }}>
        Camera gimbal / carbon frame
      </Typography>
    </Box>
  );
}

export function HeroSection() {
  const colors = useLandingColors();

  return (
    <Box component="section" sx={{ position: 'relative', width: '100%', maxWidth: '100vw', overflow: 'hidden', bgcolor: colors.hero, color: colors.heroText }}>
      <Box
        aria-hidden="true"
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.7,
          background: `radial-gradient(circle at 75% 35%, ${colors.teal}18 0, transparent 30%), linear-gradient(90deg, transparent 0 49.9%, ${colors.heroLine} 50%, transparent 50.1%)`,
          backgroundSize: 'auto, 72px 72px',
          maskImage: 'linear-gradient(to bottom, black, transparent 80%)',
        }}
      />
      <Container maxWidth="lg" sx={{ position: 'relative', width: '100%', maxWidth: { xs: '100%', lg: 1240 }, boxSizing: 'border-box', mx: 'auto', overflow: 'hidden', px: { xs: 2, sm: 3 }, pt: { xs: 13, sm: 15, lg: 18 }, pb: { xs: 8, sm: 9, lg: 13 } }}>
        <Box sx={{ display: 'grid', minWidth: 0, gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 0.84fr) minmax(0, 1.16fr)' }, gap: { xs: 4, lg: 8 }, alignItems: 'center' }}>
          <Box sx={{ position: 'relative', zIndex: 2, minWidth: 0, width: '100%', maxWidth: { xs: 350, lg: '100%' } }}>
            <Chip
              label="Infrastructure inspection management"
              sx={{ bgcolor: `${colors.teal}18`, color: colors.teal, border: `1px solid ${colors.teal}44`, fontWeight: 700 }}
            />
            <Typography component="h1" sx={{ mt: 3, width: '100%', maxWidth: { xs: 350, lg: '100%' }, fontSize: { xs: 'clamp(2rem, 8vw, 3.6rem)', lg: 'clamp(4rem, 5.4vw, 5.8rem)' }, lineHeight: 0.98, letterSpacing: '-0.065em', fontWeight: 800, overflowWrap: 'normal', wordBreak: 'keep-all' }}>
              Manage inspections from request to maintenance.
            </Typography>
            <Typography variant="h6" sx={{ mt: 3, width: '100%', maxWidth: { xs: 350, lg: 560 }, fontSize: { xs: '1rem', sm: '1.25rem' }, color: colors.heroMuted, lineHeight: 1.6, fontWeight: 400, overflowWrap: 'normal', wordBreak: 'keep-all' }}>
              Organize client requests, service assignments, inspection evidence, findings, reports, and maintenance tasks in one application.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4, width: '100%' }}>
              <Button
                href="#workflow"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                sx={{ width: { xs: '100%', sm: 'auto' }, bgcolor: colors.teal, color: colors.ink, '&:hover': { bgcolor: '#5be0cc' }, px: 2.5, py: 1.3 }}
              >
                See the workflow
              </Button>
              <Button
                href="/login"
                variant="outlined"
                sx={{ width: { xs: '100%', sm: 'auto' }, color: colors.heroText, borderColor: colors.heroLine, '&:hover': { borderColor: colors.teal, color: colors.teal }, px: 2.5, py: 1.3 }}
              >
                Open workspace
              </Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 3, color: colors.heroMuted, alignItems: 'center' }}>
              <VerifiedIcon sx={{ color: colors.teal, fontSize: 17 }} />
              <Typography variant="caption">Candidate findings are reviewed by an assigned Inspector.</Typography>
            </Stack>
          </Box>
          <DroneHeroVisual />
        </Box>
      </Container>
    </Box>
  );
}
