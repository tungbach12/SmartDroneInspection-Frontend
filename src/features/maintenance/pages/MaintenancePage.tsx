import { AssignmentTurnedInOutlined, BuildOutlined, TimelineOutlined } from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { MetricCard } from '@/shared/ui/MetricCard';

const maintenanceSteps = [
  { label: 'Accepted finding', icon: AssignmentTurnedInOutlined },
  { label: 'Assigned engineer', icon: BuildOutlined },
  { label: 'Resolution history', icon: TimelineOutlined },
] as const;

export default function MaintenancePage() {
  return (
    <Box className="workspace-page workspace-page--maintenance">
      <PageHeader
        title="Maintenance"
        subtitle="Follow work created from accepted inspection findings"
      />

      {/* 4 Lytic KPI Metric Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 3,
        }}
      >
        <MetricCard
          label="Total Work Orders"
          value="0"
          change="Baseline"
          positive
          subtext="tracked tickets"
          iconType="wrench"
        />
        <MetricCard
          label="Pending Repair"
          value="0"
          change="Clear"
          positive
          subtext="action required"
          iconType="alert"
        />
        <MetricCard
          label="In Progress"
          value="0"
          change="Operational"
          positive
          subtext="active engineer tasks"
          iconType="clock"
        />
        <MetricCard
          label="Resolved"
          value="0"
          change="Closed"
          positive
          subtext="completed repairs"
          iconType="check-circle"
        />
      </Box>

      {/* Main card container */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)' }, gap: 2.5 }}>
        <Paper
          variant="outlined"
          sx={{
            p: 4,
            borderRadius: '16px',
            border: '1px solid #eaecf0',
            bgcolor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 280,
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <EmptyState
            title="No maintenance tasks"
            description="Assigned maintenance work will appear here with its source finding, owner, and resolution status."
          />
        </Paper>

        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: '16px',
            border: '1px solid #eaecf0',
            bgcolor: '#ffffff',
            boxShadow: '0 1px 3px rgba(16, 24, 40, 0.05)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#101828' }}>
            Traceable follow-up
          </Typography>
          <Typography variant="body2" sx={{ color: '#667085', mt: 0.75 }}>
            Keep the reason for the work visible from the finding through completion.
          </Typography>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {maintenanceSteps.map(({ label, icon: Icon }) => (
              <Stack key={label} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '8px',
                    bgcolor: '#eff8ff',
                    color: '#2e90fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#344054' }}>
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
