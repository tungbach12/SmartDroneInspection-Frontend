﻿import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssignmentIcon from '@mui/icons-material/Assignment';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useLandingColors } from '../landingTheme';

const securityItems = [
  { title: 'Organization data', description: 'Clients see records for their own organization.', icon: ApartmentIcon },
  { title: 'Assigned work', description: 'Field teams see inspections and tasks assigned to them.', icon: AssignmentIcon },
  { title: 'Record history', description: 'Statuses and accepted report versions remain available.', icon: VerifiedIcon },
];

export function SecuritySection() {
  const colors = useLandingColors();

  return (
    <Box id="security" component="section" sx={{ bgcolor: colors.surface, py: { xs: 8, md: 12 }, scrollMarginTop: 2 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.85fr) minmax(0, 1.15fr)' }, gap: { xs: 5, md: 9 }, alignItems: 'center' }}>
          <Box>
            <Typography variant="overline" sx={{ color: colors.tealDark, letterSpacing: '0.16em', fontWeight: 800 }}>Access controls</Typography>
            <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 1, letterSpacing: '-0.055em', color: colors.text }}>Access follows organization and assignment.</Typography>
            <Typography variant="body1" sx={{ mt: 2.5, color: colors.muted, lineHeight: 1.75 }}>The backend limits records based on the user role, organization, ownership, and assigned work.</Typography>
          </Box>
          <Stack spacing={1.5}>
            {securityItems.map((item) => {
              const Icon = item.icon;
              return (
                <Paper key={item.title} elevation={0} sx={{ p: 2.25, bgcolor: colors.paper, border: `1px solid ${colors.line}`, borderRadius: 2 }}>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Box sx={{ width: 42, height: 42, display: 'grid', placeItems: 'center', bgcolor: `${colors.teal}16`, color: colors.tealDark, borderRadius: '12px 12px 4px 12px' }}><Icon fontSize="small" /></Box>
                    <Box><Typography variant="subtitle1" sx={{ color: colors.text, fontWeight: 800 }}>{item.title}</Typography><Typography variant="body2" sx={{ mt: 0.25, color: colors.muted }}>{item.description}</Typography></Box>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
