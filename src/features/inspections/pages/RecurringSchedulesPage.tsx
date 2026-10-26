import { useState } from 'react';
import { Box, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { PageHeader } from '@/shared/ui/PageHeader';
import { RecurringSchedulesPanel } from './RecurringSchedulesPanel';
import { CreateInspectionDialog } from '../components/CreateInspectionDialog';
import { useLocale } from '@/shared/i18n/LocaleProvider';

export default function RecurringSchedulesPage() {
  const { t } = useLocale();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <Box className="workspace-page workspace-page--recurring-schedules">
      <PageHeader
        title={t('Recurring Inspection Schedules')}
        subtitle={t('Automate periodic asset inspections, monitor occurrence generation, and resolve blocked dispatches.')}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              borderRadius: '10px',
              px: 2.5,
              py: 1,
              bgcolor: '#3758F9',
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#2b45cb' },
            }}
          >
            {t('New Inspection')}
          </Button>
        }
      />

      <RecurringSchedulesPanel onOpenCreateDialog={() => setCreateDialogOpen(true)} />

      <CreateInspectionDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </Box>
  );
}
