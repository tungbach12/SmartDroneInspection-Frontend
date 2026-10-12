import { Box } from '@mui/material';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageHeader } from '@/shared/ui/PageHeader';

/**
 * MF1 workforce entry point. The route and its ORG_ADMIN-only guard are established here; the
 * Users and Credentials tabs are added by the following task.
 */
export default function WorkforcePage() {
  return (
    <Box className="workspace-page workspace-page--workforce">
      <PageHeader title="Workforce" />
      <EmptyState
        title="Workforce management is not available yet"
        description="Provisioning inspectors and maintenance engineers, and recording their credentials, arrives with the next release."
      />
    </Box>
  );
}