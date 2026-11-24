import { useState } from 'react';
import {
  Alert,
  Button,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import { getErrorMessage } from '@/shared/api/errorMessage';
import { isConflict } from '@/shared/api/problem';
import { useLocale } from '@/shared/i18n/LocaleProvider';
import { MutationProblemAlert, RefusalNotice } from '@/shared/ui/MutationProblemAlert';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';

export interface ReportReviewDecisionBarProps {
  isPending: boolean;
  reportReadLoading: boolean;
  hasReadError: boolean;
  showReturnBox: boolean;
  reviewReason: string;
  onReviewReasonChange: (value: string) => void;
  onShowReturnBox: (show: boolean) => void;
  onApprove: () => void;
  onReturn: () => void;
  reviewError: unknown;
  isReviewError: boolean;
  approveLabel?: string | undefined;
  pendingApproveLabel?: string | undefined;
  confirmTitle?: string | undefined;
  confirmMessage?: string | undefined;
  confirmLabel?: string | undefined;
}

/**
 * Bottom reviewer decision bar for approving/publishing or returning a submitted inspection report.
 */
export function ReportReviewDecisionBar({
  isPending,
  reportReadLoading,
  hasReadError,
  showReturnBox,
  reviewReason,
  onReviewReasonChange,
  onShowReturnBox,
  onApprove,
  onReturn,
  reviewError,
  isReviewError,
  approveLabel,
  pendingApproveLabel,
  confirmTitle,
  confirmMessage,
  confirmLabel,
}: ReportReviewDecisionBarProps) {
  const { t } = useLocale();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: '10px',
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: 'none',
      }}
    >
      <Stack spacing={2}>
        {reportReadLoading && (
          <Alert severity={hasReadError ? 'error' : 'info'}>
            {hasReadError
              ? 'Could not load the report sources. Retry before approving or returning.'
              : 'Loading report sources…'}
          </Alert>
        )}

        {showReturnBox ? (
          <Stack spacing={1.5}>
            <TextField
              label={t('Reason for return')}
              placeholder={t('Required when returning for author revisions')}
              multiline
              minRows={2}
              autoFocus
              value={reviewReason}
              onChange={(e) => onReviewReasonChange(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                color="inherit"
                disabled={isPending}
                onClick={() => {
                  onShowReturnBox(false);
                  onReviewReasonChange('');
                }}
                sx={{ borderRadius: '8px', px: 2, textTransform: 'none', fontWeight: 600 }}
              >
                {t('Cancel')}
              </Button>
              <Button
                variant="contained"
                color="error"
                disabled={isPending || reportReadLoading || !reviewReason.trim()}
                onClick={onReturn}
                sx={{ borderRadius: '8px', px: 2.5, textTransform: 'none', fontWeight: 600 }}
              >
                {t('Return with reason')}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              color="error"
              disabled={isPending || reportReadLoading}
              onClick={() => onShowReturnBox(true)}
              sx={{ borderRadius: '8px', px: 2.5, minHeight: 44, textTransform: 'none', fontWeight: 600 }}
            >
              {t('Return with reason')}
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={isPending || reportReadLoading}
              onClick={() => setConfirmOpen(true)}
              sx={{ borderRadius: '8px', px: 2.5, minHeight: 44, textTransform: 'none', fontWeight: 600 }}
            >
              {isPending
                ? (pendingApproveLabel ?? t('Publishing…'))
                : (approveLabel ?? t('Approve & publish'))}
            </Button>
          </Stack>
        )}

        {isReviewError && isConflict(reviewError) ? (
          <RefusalNotice
            testId="report-review-refusal"
            reason={getErrorMessage(reviewError, '')}
            fallbackMessage={t('The server refused this report review. Refresh the report before trying again.')}
          />
        ) : null}
        <MutationProblemAlert
          error={reviewError}
          isError={isReviewError && !isConflict(reviewError)}
          fallbackMessage={t('Could not record this report review.')}
        />
      </Stack>
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle ?? t('Publish report?')}
        message={confirmMessage ?? t('Publish? Locks the report and sends it to the Customer.')}
        confirmLabel={confirmLabel ?? t('Publish')}
        cancelLabel={t('Cancel')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onApprove();
        }}
      />
    </Paper>
  );
}
