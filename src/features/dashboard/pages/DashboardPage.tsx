import {
  AssignmentOutlined,
  BuildOutlined,
  FactCheckOutlined,
  FolderOutlined,
} from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { layoutTokens } from '@/app/theme/tokens';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

const focusAreas = [
  { label: 'Requests', description: 'Customer inspection requests', icon: AssignmentOutlined },
  { label: 'Evidence', description: 'Files linked to inspections', icon: FolderOutlined },
  { label: 'Reports', description: 'Inspector-reviewed results', icon: FactCheckOutlined },
  { label: 'Maintenance', description: 'Assigned follow-up work', icon: BuildOutlined },
] as const;

export default function DashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="A concise view of the inspection and maintenance workflow"
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: layoutTokens.cardGap }}>
        {focusAreas.map(({ label, description, icon: Icon }) => (
          <Paper key={label} variant="outlined" sx={{ p: 2.5, minHeight: 150 }}>
            <Stack spacing={2}>
              <Box sx={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 1.5, bgcolor: 'action.hover', color: 'primary.main' }}>
                <Icon />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{label}</Typography>
                <Typography variant="body2" color="text.secondary">{description}</Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Box sx={{ mt: layoutTokens.sectionGap }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 800 }}>Recent activity</Typography>
        <EmptyState
          title="No activity to show"
          description="Requests, inspection evidence, reports, and maintenance updates will appear here when they are available."
        />
      </Box>
    </Box>
  );
}
