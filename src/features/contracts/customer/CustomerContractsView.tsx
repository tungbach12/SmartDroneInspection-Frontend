import { useState } from 'react';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { useAssets } from '@/features/assets/hooks/useAssets';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { type ServiceRequest } from '../api/contractApi';
import { CreateRequestDialog } from '../components/CreateRequestDialog';
import { ServiceRequestListView } from '../shared/ServiceRequestListView';
import { CustomerRequestDetail } from './CustomerRequestDetail';

interface CustomerContractsViewProps {
  requests: ServiceRequest[];
  selectedRequestId: string;
  currentRequest: ServiceRequest | undefined;
  isSyncingSelected: boolean;
  onSelectRequest: (requestId: string) => void;
  onRefresh: () => void;
  onError: (message: string) => void;
}

export function CustomerContractsView({
  requests,
  selectedRequestId,
  currentRequest,
  isSyncingSelected,
  onSelectRequest,
  onRefresh,
  onError,
}: CustomerContractsViewProps) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const assets = useAssets({ page: 1, pageSize: 100 }, true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <>
      {selectedRequestId && currentRequest ? (
        <CustomerRequestDetail
          request={currentRequest}
          isSyncing={isSyncingSelected}
          onBackToList={() => onSelectRequest('')}
          onChanged={onRefresh}
          onError={onError}
          onOpenInbox={(requestId) => navigate(`/client/messages?requestId=${requestId}`)}
        />
      ) : (
        <ServiceRequestListView
          requests={requests}
          role="CUSTOMER"
          homePath="/client/dashboard"
          emptyQueueMessage={t(
            'Click "+ New service request" above to create your first inspection request.',
          )}
          onSelectRequest={onSelectRequest}
          toolbarAction={
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
              sx={{
                borderRadius: '8px',
                px: 2,
                py: 1,
                fontWeight: 600,
                fontSize: '0.875rem',
                textTransform: 'none',
                boxShadow: 'none',
              }}
            >
              {t('New service request')}
            </Button>
          }
        />
      )}

      <CreateRequestDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        assets={assets.data?.items ?? []}
        existingRequests={requests}
        onCreated={(id) => {
          setCreateDialogOpen(false);
          onSelectRequest(id);
          onRefresh();
        }}
        onError={onError}
      />
    </>
  );
}
