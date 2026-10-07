import { Box, Container, Typography } from '@mui/material';
import { roleCards } from '../content';
import { useAnimeStagger } from '../hooks/useAnimeStagger';

export function RoleCards() {
  const ref = useAnimeStagger('[data-role-card]', { delay: 90, duration: 640 }) as React.RefObject<HTMLDivElement>;

  return (
    <Box id="roles" component="section" sx={{ bgcolor: '#f4f8fa', py: { xs: 8, md: 12 }, scrollMarginTop: 2 }}>
      <Container maxWidth="lg">
        <Typography component="h2" sx={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.045em', color: '#12222b', fontWeight: 700 }}>
          One workspace, four roles.
        </Typography>
        <Typography variant="body1" sx={{ mt: 2, color: '#5a7280', maxWidth: 560 }}>
          Everyone sees the same job at their level of ownership.
        </Typography>
        <Box
          ref={ref}
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mt: 5 }}
        >
          {roleCards.map((card) => (
            <Box
              data-role-card
              key={card.role}
              sx={{
                p: 3,
                bgcolor: '#ffffff',
                border: '1px solid #dde8ee',
                borderRadius: 4,
                minHeight: 260,
              }}
            >
              <Typography variant="overline" sx={{ color: '#3aa5bd', fontWeight: 700, letterSpacing: '0.14em' }}>
                {card.role}
              </Typography>
              <Typography variant="h6" sx={{ mt: 1.5, color: '#12222b', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {card.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1.5, color: '#5a7280', lineHeight: 1.6 }}>
                {card.description}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
