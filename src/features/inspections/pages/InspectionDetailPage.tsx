import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Box, Button, Tab, Tabs } from '@mui/material';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import { PageHeader } from '@/shared/ui/PageHeader';

const STAGE_TABS = [
  { value: 'evidence', label: 'Evidence', to: 'evidence' },
  { value: 'findings', label: 'Findings', to: 'findings' },
  { value: 'report', label: 'Report draft', to: 'report' },
  { value: 'preparation', label: 'Preparation', to: 'preparation' },
] as const;

/**
 * The inspection workspace layout: one inspection, four stage tabs, one stage at a time.
 *
 * Each stage owns its own sub-page (evidence, findings, report draft, preparation); this layout
 * only renders the inspection header plus the stage tabs and an outlet. Report document editing
 * stays on the separate `reports/:inspectionId` page.
 */
export default function InspectionDetailPage() {
  const { inspectionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.split('/').filter(Boolean).pop() ?? 'evidence';
  const tabValue = STAGE_TABS.some((tab) => tab.value === current) ? current : 'evidence';

  return (
    <Box className="workspace-page workspace-page--inspections" sx={{ maxWidth: 1040, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackRounded />}
          onClick={() => navigate(-1)}
          sx={{
            color: '#475467',
            fontWeight: 600,
            fontSize: '14px',
            textTransform: 'none',
            borderRadius: '8px',
            mb: 2,
            '&:hover': { bgcolor: '#f2f4f7' },
          }}
        >
          Back to list
        </Button>

        <PageHeader
          title="Inspection Detail"
          subtitle={`Inspection ID: ${inspectionId} · Field evidence, verified findings and reports`}
        />

        <Tabs value={tabValue} sx={{ mt: 2, borderBottom: '1px solid #eaecf0' }}>
          {STAGE_TABS.map((tab) => (
            <Tab
              key={tab.value}
              label={tab.label}
              value={tab.value}
              component={NavLink}
              to={tab.to}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            />
          ))}
        </Tabs>
      </Box>

      <Outlet />
    </Box>
  );
}
