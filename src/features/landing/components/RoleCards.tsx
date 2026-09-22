﻿import { Box, Container, Paper, Typography } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import { roleCards } from '../content';
import { useLandingColors } from '../landingTheme';

const icons = {
  client: ApartmentIcon,
  service: ManageAccountsIcon,
  field: EngineeringIcon,
} as const;

export function RoleCards() {
  const colors = useLandingColors();

  return (
    <Box id="roles" component="section" sx={{ bgcolor: colors.paper, py: { xs: 8, md: 12 }, scrollMarginTop: 2 }}>
      <Container maxWidth="lg">
        <Box sx={{ maxWidth: 720 }}>
          <Typography variant="overline" sx={{ color: colors.tealDark, letterSpacing: '0.16em', fontWeight: 800 }}>For each team</Typography>
          <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 1, letterSpacing: '-0.055em', color: colors.text }}>Each role sees its part of the work.</Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 1.5, mt: 5 }}>
          {roleCards.map((card, index) => {
            const Icon = icons[card.icon];
            return (
              <Paper key={card.role} elevation={0} sx={{ p: 3, minHeight: 280, bgcolor: colors.surface, border: `1px solid ${colors.line}`, borderRadius: index === 1 ? '18px 6px 18px 18px' : '18px 18px 6px 18px' }}>
                <Box sx={{ width: 44, height: 44, display: 'grid', placeItems: 'center', bgcolor: colors.ink, color: colors.teal, borderRadius: '14px 14px 4px 14px' }}><Icon /></Box>
                <Typography variant="overline" sx={{ display: 'block', mt: 4, color: colors.tealDark, fontWeight: 800, letterSpacing: '0.14em' }}>{card.role}</Typography>
                <Typography variant="h6" sx={{ mt: 1, color: colors.text, fontWeight: 800, letterSpacing: '-0.025em' }}>{card.title}</Typography>
                <Typography variant="body2" sx={{ mt: 1.5, color: colors.muted, lineHeight: 1.65 }}>{card.description}</Typography>
              </Paper>
            );
          })}
        </Box>
      </Container>
    </Box>
  );
}
