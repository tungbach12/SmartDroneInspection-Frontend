import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { productItems } from '../content';
import { useLandingColors } from '../landingTheme';

const icons = {
  asset: ApartmentIcon,
  finding: AssignmentTurnedInIcon,
  maintenance: BuildCircleIcon,
} as const;

export function ProductProofPanel() {
  const colors = useLandingColors();

  return (
    <Box component="section" sx={{ bgcolor: colors.surface, py: { xs: 8, md: 12 } }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.82fr) minmax(0, 1.18fr)' }, gap: { xs: 5, md: 9 }, alignItems: 'center' }}>
          <Box>
            <Typography variant="overline" sx={{ color: colors.tealDark, letterSpacing: '0.16em', fontWeight: 800 }}>
              What the platform stores
            </Typography>
            <Typography component="h2" variant="h2" sx={{ mt: 1, fontSize: 'clamp(2.2rem, 4vw, 4rem)', lineHeight: 1, letterSpacing: '-0.055em', color: colors.text }}>
              Keep the inspection record together.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2.5, color: colors.muted, lineHeight: 1.75 }}>
              Keep asset details, evidence, findings, reports, and maintenance work available to the people responsible for them.
            </Typography>
            <Stack spacing={2} sx={{ mt: 4 }}>
              {productItems.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <Stack key={item.label} direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
                    <Box sx={{ flexShrink: 0, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: '12px 12px 4px 12px', bgcolor: `${colors.teal}16`, color: colors.tealDark }}>
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ color: colors.text, fontWeight: 800 }}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ mt: 0.35, color: colors.muted, lineHeight: 1.6 }}>{item.description}</Typography>
                    </Box>
                  </Stack>
                );
              })}
            </Stack>
          </Box>

          <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, bgcolor: colors.ink, color: colors.inverse, borderRadius: '28px 28px 8px 28px', boxShadow: '0 24px 70px rgba(11, 17, 23, 0.18)' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="overline" sx={{ color: colors.teal, letterSpacing: '0.14em' }}>Example inspection record</Typography>
                <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 800 }}>North tower · A-204</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: colors.teal, fontWeight: 800 }}>ACTIVE</Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 3 }}>
              {[
                { label: 'Evidence', value: 'Linked' },
                { label: 'Findings', value: 'Review' },
                { label: 'Follow-up', value: 'Assigned' },
              ].map((item, index) => (
                <Box key={item.label} sx={{ p: 1.5, bgcolor: index === 1 ? `${colors.teal}18` : colors.panel, border: `1px solid ${index === 1 ? `${colors.teal}55` : colors.lightLine}`, borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ display: 'block', color: 'rgba(246, 251, 247, 0.55)' }}>{item.label}</Typography>
                  <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 800 }}>{item.value}</Typography>
                </Box>
              ))}
            </Box>
            <Stack spacing={1.25} sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1.25} sx={{ p: 1.5, bgcolor: colors.panel, borderRadius: 2, alignItems: 'center' }}>
                <CheckCircleIcon sx={{ color: colors.teal, fontSize: 19 }} />
                <Box sx={{ flex: 1 }}><Typography variant="body2">Concrete surface</Typography><Typography variant="caption" sx={{ color: 'rgba(246, 251, 247, 0.5)' }}>Verified · Inspector</Typography></Box>
                <Typography variant="caption" sx={{ color: colors.teal }}>Clear</Typography>
              </Stack>
              <Stack direction="row" spacing={1.25} sx={{ p: 1.5, bgcolor: colors.panel, borderRadius: 2, alignItems: 'center' }}>
                <Box sx={{ width: 19, height: 19, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: `${colors.amber}22`, color: colors.amber, fontSize: 12, fontWeight: 800 }}>!</Box>
                <Box sx={{ flex: 1 }}><Typography variant="body2">Surface crack candidate</Typography><Typography variant="caption" sx={{ color: 'rgba(246, 251, 247, 0.5)' }}>Needs Inspector review</Typography></Box>
                <Typography variant="caption" sx={{ color: colors.amber }}>Review</Typography>
              </Stack>
            </Stack>
            <Typography variant="caption" sx={{ display: 'block', mt: 3, color: 'rgba(246, 251, 247, 0.5)' }}>Example timeline · Evidence remains linked to the decision.</Typography>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
}
