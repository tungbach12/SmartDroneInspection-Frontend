import { ChecklistOutlined, FactCheckOutlined, FolderOutlined } from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';
import { layoutTokens } from '@/app/theme/tokens';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

const evidenceSteps = [
  { label: 'Asset context', description: 'Asset and request details stay attached to the inspection.', icon: FolderOutlined },
  { label: 'Evidence set', description: 'Images and files are grouped by the inspection record.', icon: ChecklistOutlined },
  { label: 'Inspector review', description: 'Findings are reviewed before a report is released.', icon: FactCheckOutlined },
] as const;

export default function InspectionsPage() {
  return (
    <Box>
      <PageHeader
        title="Inspections"
        subtitle="Review assigned work with its evidence and decision history"
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.1fr) minmax(280px, 0.9fr)' }, gap: layoutTokens.cardGap }}>
        <EmptyState
          title="No inspections assigned"
          description="Assigned inspections will show their asset, schedule, evidence status, and review progress here."
        />
        <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Evidence-first record</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Keep the context, files, and review decision together instead of splitting them across screens.
          </Typography>
          <Stack spacing={2} sx={{ mt: 3 }}>
            {evidenceSteps.map(({ label, description, icon: Icon }) => (
              <Stack key={label} direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                <Box sx={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 1.5, bgcolor: 'action.hover', color: 'primary.main', flexShrink: 0 }}>
                  <Icon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{label}</Typography>
                  <Typography variant="body2" color="text.secondary">{description}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
