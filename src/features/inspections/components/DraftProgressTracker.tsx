import { AutoAwesomeOutlined } from '@mui/icons-material';
import { Alert, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material';

/** The API returns a completed draft or an error; it does not report intermediate stages. */
export function DraftProgressTracker() {
  return (
    <Card
      variant="outlined"
      sx={{ mt: 2, borderRadius: '12px', borderColor: 'primary.main', bgcolor: 'background.paper' }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <AutoAwesomeOutlined color="primary" sx={{ fontSize: 24 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Generating report draft
            </Typography>
          </Stack>
          <LinearProgress sx={{ borderRadius: 4 }} />
          <Alert severity="info" sx={{ borderRadius: '8px' }}>
            Waiting for the report-drafting service. Progress stages are not available. The draft
            will appear when the request completes; you must review and verify every section before
            submitting it.
          </Alert>
        </Stack>
      </CardContent>
    </Card>
  );
}
