import { Box } from '@mui/material';
import { PageHeader } from '@/shared/ui/PageHeader';

/**
 * MF1 workforce entry point. The route and its ORG_ADMIN-only guard are established here; the
 * Users and Credentials tabs are added by the following task.
 */
export function WorkforcePage() {
  return (
    <Box className="workspace-page workspace-page--workforce">
      <PageHeader
        title="Workforce"
        subtitle="Inspectors, maintenance engineers and their recorded credentials"
      />
    </Box>
  );
}

export default WorkforcePage;