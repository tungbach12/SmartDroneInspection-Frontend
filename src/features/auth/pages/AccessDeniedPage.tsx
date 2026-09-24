import { Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Workspace unavailable
        </Typography>
        <Typography color="text.secondary">
          Your account does not have a workspace or screen for this address.
        </Typography>
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
        >
          Return to home
        </Button>
      </Stack>
    </Container>
  );
}
