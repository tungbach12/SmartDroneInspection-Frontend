﻿import { Box, Container, Stack, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useLandingColors } from '../landingTheme';

const trustItems = ['Asset and schedule records', 'Inspector-reviewed findings', 'Organization-scoped access', 'Maintenance status tracking'];

export function TrustStrip() {
  const colors = useLandingColors();

  return (
    <Box component="section" sx={{ bgcolor: colors.paper, borderBottom: `1px solid ${colors.line}` }}>
      <Container maxWidth="lg" sx={{ py: 2.25 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.25, sm: 3 }} sx={{ justifyContent: 'space-between' }}>
          {trustItems.map((item) => (
            <Stack key={item} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <ArrowForwardIcon sx={{ color: colors.tealDark, fontSize: 16 }} />
              <Typography variant="caption" sx={{ color: colors.muted, fontWeight: 700, letterSpacing: '0.02em' }}>
                {item}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
