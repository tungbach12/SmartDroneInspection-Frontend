import { Box, Typography } from '@mui/material';

export default function DashboardPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary">
        Inspection statistics, defect analytics, maintenance KPIs (WP1).
      </Typography>
    </Box>
  );
}
