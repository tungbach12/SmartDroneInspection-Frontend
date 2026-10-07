import { Box, Container, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { productItems } from '../content';
import { useAnimeStagger } from '../hooks/useAnimeStagger';

export function ProductProofPanel() {
  const ref = useAnimeStagger('[data-product-item]', { delay: 110, duration: 680 }) as React.RefObject<HTMLDivElement>;

  return (
    <Box id="features" component="section" sx={{ bgcolor: '#ffffff', py: { xs: 8, md: 12 }, scrollMarginTop: 2 }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 0.9fr) minmax(0, 1.1fr)' }, gap: { xs: 5, md: 9 }, alignItems: 'start' }}>
          <Box>
            <Typography component="h2" sx={{ fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 1, letterSpacing: '-0.045em', color: '#12222b', fontWeight: 700 }}>
              The record stays linked.
            </Typography>
            <Typography variant="body1" sx={{ mt: 2.5, color: '#5a7280', lineHeight: 1.7, maxWidth: 480 }}>
              Asset context, mission evidence, reviewed findings, approval state, and maintenance all point back to the same asset history.
            </Typography>
            <Stack ref={ref} spacing={2} sx={{ mt: 4 }}>
              {productItems.map((item) => (
                <Stack data-product-item key={item.label} direction="row" spacing={1.75} sx={{ alignItems: 'flex-start' }}>
                  <Box sx={{ flexShrink: 0, width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 2, bgcolor: '#e8f2f6', color: '#2a7a96' }}>
                    <CheckCircleIcon fontSize="small" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: '#12222b', fontWeight: 700 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, color: '#5a7280', lineHeight: 1.6 }}>{item.description}</Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          </Box>

          <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#10222b', color: '#e6eef3', borderRadius: 4 }}>
            <Typography variant="caption" sx={{ color: '#3aa5bd', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Example inspection record
            </Typography>
            <Typography variant="h6" sx={{ mt: 0.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
              North tower A-204
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mt: 3 }}>
              {[
                { label: 'Evidence', value: 'Linked' },
                { label: 'Findings', value: 'Review' },
                { label: 'Follow-up', value: 'Assigned' },
              ].map((item) => (
                <Box key={item.label} sx={{ p: 1.5, bgcolor: '#16303c', borderRadius: 2 }}>
                  <Typography variant="caption" sx={{ display: 'block', color: '#7ba0b0' }}>{item.label}</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.5, fontWeight: 700 }}>{item.value}</Typography>
                </Box>
              ))}
            </Box>
            <Stack spacing={1.25} sx={{ mt: 3 }}>
              <Stack direction="row" spacing={1.25} sx={{ p: 1.5, bgcolor: '#16303c', borderRadius: 2, alignItems: 'center' }}>
                <CheckCircleIcon sx={{ color: '#3aa5bd', fontSize: 19 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">Concrete surface</Typography>
                  <Typography variant="caption" sx={{ color: '#7ba0b0' }}>Verified by Inspector</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#3aa5bd' }}>Clear</Typography>
              </Stack>
              <Stack direction="row" spacing={1.25} sx={{ p: 1.5, bgcolor: '#16303c', borderRadius: 2, alignItems: 'center' }}>
                <Box sx={{ width: 19, height: 19, display: 'grid', placeItems: 'center', borderRadius: '50%', bgcolor: '#3a2c14', color: '#d69a3a', fontSize: 12, fontWeight: 800 }}>!</Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">Surface crack candidate</Typography>
                  <Typography variant="caption" sx={{ color: '#7ba0b0' }}>Needs Inspector review</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#d69a3a' }}>Review</Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
