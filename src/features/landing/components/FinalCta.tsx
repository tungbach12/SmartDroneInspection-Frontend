﻿import { Box, Button, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLandingColors } from '../landingTheme';

export function FinalCta() {
  const colors = useLandingColors();

  return (
    <Box component="section" sx={{ bgcolor: colors.paper, px: { xs: 2, sm: 3 }, pb: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ p: { xs: 3, md: 6 }, bgcolor: colors.ink, color: colors.inverse, borderRadius: '28px 28px 8px 28px', position: 'relative', overflow: 'hidden' }}>
          <Box aria-hidden="true" sx={{ position: 'absolute', width: 340, height: 340, right: -120, top: -160, borderRadius: '50%', background: `radial-gradient(circle, ${colors.teal}36 0%, transparent 68%)` }} />
          <Box sx={{ position: 'relative', maxWidth: 680 }}>
            <Typography variant="overline" sx={{ color: colors.teal, letterSpacing: '0.16em', fontWeight: 800 }}>See the workflow</Typography>
            <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 1, letterSpacing: '-0.055em' }}>Follow an inspection from request to maintenance.</Typography>
            <Typography variant="body1" sx={{ mt: 2.5, color: 'rgba(246, 251, 247, 0.68)', lineHeight: 1.75 }}>Review the steps from client request to report review and assigned maintenance work.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 4 }}>
              <Button href="#workflow" variant="contained" endIcon={<ArrowForwardIcon />} sx={{ bgcolor: colors.teal, color: colors.ink, '&:hover': { bgcolor: '#5be0cc' }, px: 2.5, py: 1.3 }}>View the workflow</Button>
              <Button href="/login" variant="outlined" sx={{ color: colors.inverse, borderColor: colors.lightLine, '&:hover': { borderColor: colors.teal, color: colors.teal }, px: 2.5, py: 1.3 }}>Log in</Button>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
