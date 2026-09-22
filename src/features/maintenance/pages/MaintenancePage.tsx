import { AssignmentTurnedInOutlined, BuildOutlined, TimelineOutlined } from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

const maintenanceSteps = [
  { label: 'Accepted finding', icon: AssignmentTurnedInOutlined },
  { label: 'Assigned engineer', icon: BuildOutlined },
  { label: 'Resolution history', icon: TimelineOutlined },
] as const;

export default function MaintenancePage() {
  return (
    <Box>
      <PageHeader
        title="Maintenance"
        subtitle="Follow work created from accepted inspection findings"
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.15fr) minmax(280px, 0.85fr)' }, gap: 1.5 }}>
        <EmptyState
          title="No maintenance tasks"
          description="Assigned maintenance work will appear here with its source finding, owner, and resolution status."
        />
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Traceable follow-up</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Keep the reason for the work visible from the finding through completion.
          </Typography>
          <Stack spacing={1.75} sx={{ mt: 3 }}>
            {maintenanceSteps.map(({ label, icon: Icon }) => (
              <Stack key={label} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <Icon fontSize="small" color="primary" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
