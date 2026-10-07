import {
  AssignmentOutlined,
  AssignmentTurnedInOutlined,
  BuildOutlined,
  CloudDoneOutlined,
  FactCheckOutlined,
  FlightTakeoffOutlined,
  FolderOutlined,
  GroupsOutlined,
  HandshakeOutlined,
  QueryStatsOutlined,
  TaskAltOutlined,
  VerifiedOutlined,
} from '@mui/icons-material';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { layoutTokens } from '@/app/theme/tokens';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useAuthStore } from '@/features/auth/store/authStore';

const clientAreas = [
  { label: 'Assets', description: 'Register and maintain inspection targets', icon: FolderOutlined },
  { label: 'Requests', description: 'Submit inspection requests', icon: AssignmentOutlined },
  { label: 'Reports', description: 'Review released reports', icon: FactCheckOutlined },
  { label: 'Maintenance', description: 'Track repair work', icon: BuildOutlined },
] as const;

const operationsAreas = [
  { label: 'Team', description: 'Provision inspectors and engineers', icon: GroupsOutlined },
  { label: 'Asset review', description: 'Vet new client assets', icon: VerifiedOutlined },
  { label: 'Inspections', description: 'Mission plans and field work', icon: FlightTakeoffOutlined },
  { label: 'Reports', description: 'Author verification and release', icon: FactCheckOutlined },
  { label: 'Maintenance', description: 'Defect close-out per provider', icon: BuildOutlined },
] as const;

const adminAreas = [
  { label: 'Providers', description: 'Onboard and verify provider organizations', icon: HandshakeOutlined },
  { label: 'Users', description: 'Manage platform access', icon: GroupsOutlined },
  { label: 'Audit', description: 'Security and access events', icon: QueryStatsOutlined },
  { label: 'System', description: 'Service health and readiness', icon: CloudDoneOutlined },
] as const;

function getAreas(roles: readonly string[]) {
  if (roles.includes('CLIENT')) return clientAreas;
  if (roles.some((role) => ['PROVIDER_MANAGER', 'INSPECTOR', 'MAINTENANCE_ENGINEER', 'PLATFORM_OPERATOR'].includes(role))) {
    return operationsAreas;
  }
  return adminAreas;
}

export default function DashboardPage() {
  const roles = useAuthStore((state) => state.roles);
  const focusAreas = getAreas(roles);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle={
          roles.includes('CLIENT')
            ? 'Your assets, requests, and released reports'
            : roles.includes('PLATFORM_ADMIN')
              ? 'Platform administration at a glance'
              : 'Operations workspace — missions, reports, and maintenance'
        }
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
        <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Recent activity</Typography>
          <Chip size="small" icon={<AssignmentTurnedInOutlined />} label="No live feed yet" />
        </Stack>
        <EmptyState
          title="No activity to show"
          description="Requests, inspection evidence, reports, and maintenance updates will appear here when they are available."
        />
      </Box>

      <Box sx={{ mt: layoutTokens.sectionGap }}>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 800 }}>Next steps</Typography>
        <Stack spacing={1.25}>
          {[
            'Finish onboarding your organization and issue invites.',
            'Create your first asset or review assigned inspections.',
            'Follow up on open defects and release ready reports.',
          ].map((step) => (
            <Paper key={step} variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <TaskAltOutlined color="primary" fontSize="small" />
              <Typography variant="body2">{step}</Typography>
            </Paper>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
