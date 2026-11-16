import { useCallback, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { CustomerContractsView } from '../customer/CustomerContractsView';
import { useServiceRequest, useServiceRequests } from '../hooks/useContracts';
import { ManagerContractsView } from '../manager/ManagerContractsView';
import { extractContractErrorText } from '../shared/contractStage';

export default function ContractsPage() {
  const roles = useAuthStore((state) => state.roles);
  const isCustomer = roles.includes('CUSTOMER');
  const isManager = roles.includes('MANAGER');
  const isAdmin = roles.includes('ADMIN');

  const requests = useServiceRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRequestId = isAdmin ? '' : searchParams.get('requestId') ?? '';
  const selectedRequest = useServiceRequest(selectedRequestId || undefined);
  const [error, setError] = useState('');

  const selectRequest = useCallback(
    (requestId: string) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (requestId) {
            next.set('requestId', requestId);
          } else {
            next.delete('requestId');
            next.delete('step');
            next.delete('occurrenceId');
            next.delete('inspectorId');
            next.delete('droneId');
          }
          return next;
        },
        { replace: false },
      );
    },
    [setSearchParams],
  );

  const refreshSelectedRequest = () => {
    void requests.refetch();
    if (selectedRequestId) void selectedRequest.refetch();
  };

  if (!isCustomer && !isManager && !isAdmin) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">MF2 is available to Customer and Platform Manager accounts.</Alert>
      </Box>
    );
  }

  if (requests.isPending) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress aria-label="Loading requests" />
      </Box>
    );
  }

  if (requests.isError) {
    return (
      <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
        <Alert severity="error">{extractContractErrorText(requests.error)}</Alert>
      </Box>
    );
  }

  const requestItems = requests.data ?? [];
  const currentRequest =
    selectedRequest.data || requestItems.find((item) => item.id === selectedRequestId);

  const sharedProps = {
    requests: requestItems,
    selectedRequestId,
    currentRequest,
    isSyncingSelected: selectedRequest.isFetching,
    onSelectRequest: selectRequest,
    onRefresh: refreshSelectedRequest,
    onError: setError,
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 3.5 }, pb: { xs: 11, md: 12 } }}>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}
      {isCustomer ? (
        <CustomerContractsView {...sharedProps} />
      ) : (
        <ManagerContractsView
          {...sharedProps}
          isAdmin={isAdmin}
        />
      )}
    </Box>
  );
}
