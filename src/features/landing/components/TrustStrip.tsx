import { Box, Container, Stack, Typography } from '@mui/material';

const signals = [
  'Mission plan before flight',
  'Evidence with checksum',
  'Human-reviewed AI',
  'Immutable reports',
  'Maintenance closeout',
];

export function TrustStrip() {
  return (
    <Box component="section" sx={{ bgcolor: '#10222b', color: '#9fb9c7' }}>
      <Container maxWidth="lg" sx={{ py: 1.75 }}>
        <Stack
          direction="row"
          spacing={3}
          sx={{ overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
        >
          {signals.map((signal) => (
            <Typography
              key={signal}
              variant="caption"
              sx={{ whiteSpace: 'nowrap', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              {signal}
            </Typography>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}
