import { useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { PageHeader } from '@/shared/ui/PageHeader';
import { QueryState } from '@/shared/ui/QueryState';
import { StatusChip } from '@/shared/ui/StatusChip';
import {
  useInspectionFinanceSettings,
  useUpdateInspectionFinanceSettings,
} from '../hooks/useInspectionFinance';
import { useLocale } from '@/shared/i18n/LocaleProvider';

interface PlatformFinanceSettingsPageProps {
  /** Rendered inside the Platform settings hub, which owns the page header. */
  embedded?: boolean;
}

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(280px, 380px)' },
        gap: { xs: 1.5, md: 4 },
        alignItems: { xs: 'stretch', md: 'start' },
        px: { xs: 2, sm: 3 },
        py: { xs: 2, sm: 2.5 },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem', color: 'text.primary' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 520 }}>
          {description}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Box>
  );
}

export default function PlatformFinanceSettingsPage({
  embedded = false,
}: PlatformFinanceSettingsPageProps) {
  const { formatNumber, t } = useLocale();
  const settingsQuery = useInspectionFinanceSettings();
  const updateSettings = useUpdateInspectionFinanceSettings();

  const [formValues, setFormValues] = useState<{
    commissionRate: string;
    vatRate: string;
    tncnRate: string;
  } | null>(null);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<{
    commissionRate: number;
    vatRate: number;
    tncnRate: number;
  } | null>(null);

  const savedCommission = settingsQuery.data?.commissionRate != null ? String(settingsQuery.data.commissionRate) : '';
  const savedVat = settingsQuery.data?.vatRate != null ? String(settingsQuery.data.vatRate) : '';
  const savedTncn = settingsQuery.data?.tncnRate != null ? String(settingsQuery.data.tncnRate) : '';

  const commissionRate = formValues !== null ? formValues.commissionRate : savedCommission;
  const vatRate = formValues !== null ? formValues.vatRate : savedVat;
  const tncnRate = formValues !== null ? formValues.tncnRate : savedTncn;

  const isDirty = Boolean(
    formValues !== null &&
      (commissionRate !== savedCommission || vatRate !== savedVat || tncnRate !== savedTncn),
  );

  const isRateOutOfRange = (value: string) => {
    if (value.trim() === '') return false;
    const parsed = Number(value);
    return Number.isNaN(parsed) || parsed < 0 || parsed > 100;
  };
  const commInvalid = isRateOutOfRange(commissionRate);
  const vatInvalid = isRateOutOfRange(vatRate);
  const tncnInvalid = isRateOutOfRange(tncnRate);

  const commNum = Number(commissionRate) || 0;
  const vatNum = Number(vatRate) || 0;
  const tncnNum = Number(tncnRate) || 0;

  // Real calculation preview on a standard 10,000,000 VND base contract
  const sampleBase = 10_000_000;
  const sampleVat = Math.round((sampleBase * vatNum) / 100);
  const sampleCustomerTotal = sampleBase + sampleVat;
  const samplePlatformFee = Math.round((sampleBase * commNum) / 100);
  const sampleInspectorGross = Math.max(0, sampleBase - samplePlatformFee);
  const sampleTncn = Math.round((sampleInspectorGross * tncnNum) / 100);
  const sampleInspectorNet = Math.max(0, sampleInspectorGross - sampleTncn);

  const updateField = (field: keyof NonNullable<typeof formValues>, value: string) => {
    setValidationError(null);
    setSaveSuccess(false);
    setFormValues({ commissionRate, vatRate, tncnRate, [field]: value });
  };

  const handleSaveRequest = (event: FormEvent) => {
    event.preventDefault();
    setSaveSuccess(false);
    setValidationError(null);
    const comm = Number(commissionRate);
    const vat = Number(vatRate);
    const tncn = Number(tncnRate);
    if (
      commissionRate.trim() === '' ||
      vatRate.trim() === '' ||
      tncnRate.trim() === '' ||
      Number.isNaN(comm) ||
      comm < 0 ||
      comm > 100 ||
      Number.isNaN(vat) ||
      vat < 0 ||
      vat > 100 ||
      Number.isNaN(tncn) ||
      tncn < 0 ||
      tncn > 100
    ) {
      setValidationError(t('Rates must be valid numbers between 0% and 100%.'));
      return;
    }

    setPendingSubmit({ commissionRate: comm, vatRate: vat, tncnRate: tncn });
  };

  const handleConfirmSave = async () => {
    if (!pendingSubmit) return;
    await updateSettings.mutateAsync(pendingSubmit);
    setFormValues({
      commissionRate: String(pendingSubmit.commissionRate),
      vatRate: String(pendingSubmit.vatRate),
      tncnRate: String(pendingSubmit.tncnRate),
    });
    setPendingSubmit(null);
    setSaveSuccess(true);
  };

  return (
    <Box sx={embedded ? undefined : { width: '100%', maxWidth: 1200, mx: 'auto' }}>
      {!embedded && (
        <PageHeader
          title={t('Inspection Finance Settings')}
          subtitle={t('Configure platform commission, VAT, and partner PIT withholding rates.')}
          breadcrumbs={[{ label: t('Governance'), to: '/admin/dashboard' }, { label: t('Finance settings') }]}
        />
      )}

      <QueryState
        isLoading={settingsQuery.isLoading}
        error={settingsQuery.error}
        onRetry={() => void settingsQuery.refetch()}
      >
        <Stack spacing={2}>
          <Alert severity="info">
            {t('Updated rates apply prospectively to newly issued quotations and settlements. Previously accepted contracts keep their locked terms.')}
          </Alert>

          {saveSuccess && (
            <Alert severity="success" onClose={() => setSaveSuccess(false)}>
              {t('Finance settings updated successfully.')}
            </Alert>
          )}

          {validationError && (
            <Alert severity="error" onClose={() => setValidationError(null)}>
              {validationError}
            </Alert>
          )}

          {updateSettings.isError && (
            <Alert severity="error">
              {updateSettings.error instanceof Error
                ? updateSettings.error.message
                : t('Failed to update finance settings.')}
            </Alert>
          )}

          <Box
            component="form"
            noValidate
            onSubmit={handleSaveRequest}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '10px',
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                  {t('Settlement Rate Configuration')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('Rates apply to newly issued quotations.')}
                </Typography>
              </Box>
              {isDirty && <StatusChip status="pending" label={t('Unsaved changes')} />}
            </Box>

            <SettingsRow
              title={t('Platform commission')}
              description={t('Deducted from the pre-VAT service base before the partner inspector payout.')}
            >
              <TextField
                label={t('Commission Rate (%)')}
                value={commissionRate}
                error={commInvalid}
                helperText={commInvalid ? t('Must be between 0% and 100%.') : t('Applied on pre-VAT service base')}
                onChange={(event) => updateField('commissionRate', event.target.value)}
                fullWidth
                required
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
              />
            </SettingsRow>

            <Divider />

            <SettingsRow
              title={t('Value added tax (VAT)')}
              description={t('Added to the customer invoice total on top of the service base.')}
            >
              <TextField
                label={t('VAT Rate (%)')}
                value={vatRate}
                error={vatInvalid}
                helperText={vatInvalid ? t('Must be between 0% and 100%.') : t('Added to customer invoice total')}
                onChange={(event) => updateField('vatRate', event.target.value)}
                fullWidth
                required
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
              />
            </SettingsRow>

            <Divider />

            <SettingsRow
              title={t('Partner PIT withholding (TNCN)')}
              description={t('Withheld from the partner inspector gross payout before settlement.')}
            >
              <TextField
                label={t('TNCN Rate (%)')}
                value={tncnRate}
                error={tncnInvalid}
                helperText={tncnInvalid ? t('Must be between 0% and 100%.') : t('Withheld from partner inspector payout')}
                onChange={(event) => updateField('tncnRate', event.target.value)}
                fullWidth
                required
                size="small"
                type="number"
                slotProps={{ htmlInput: { min: 0, max: 100, step: '0.01' } }}
              />
            </SettingsRow>

            <Divider />

            <SettingsRow
              title={t('Sample Settlement Breakdown (10,000,000 ₫ Base)')}
              description={t('Live settlement simulation using configured rates')}
            >
              <Box
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: '8px',
                  bgcolor: 'background.default',
                  p: 1.75,
                }}
              >
                <Stack spacing={1}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Pre-tax service base')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(sampleBase)} ₫
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('VAT')} ({vatNum}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      + {formatNumber(sampleVat)} ₫
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('Customer total (Sepay)')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(sampleCustomerTotal)} ₫
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('Platform commission fee')} ({commNum}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.main', fontVariantNumeric: 'tabular-nums' }}>
                      - {formatNumber(samplePlatformFee)} ₫
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('PIT withholding (TNCN)')} ({tncnNum}%)
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                      - {formatNumber(sampleTncn)} ₫
                    </Typography>
                  </Stack>
                  <Divider />
                  <Stack direction="row" sx={{ justifyContent: 'space-between', pt: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {t('Partner inspector net payout')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: 'success.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumber(sampleInspectorNet)} ₫
                    </Typography>
                  </Stack>
                </Stack>
              </Box>
            </SettingsRow>

            <Divider />

            <Stack
              direction="row"
              spacing={1.25}
              sx={{
                px: { xs: 2, sm: 3 },
                py: 2,
                justifyContent: 'flex-end',
                bgcolor: 'background.default',
              }}
            >
              {isDirty && (
                <Button
                  type="button"
                  variant="outlined"
                  color="inherit"
                  disabled={updateSettings.isPending}
                  onClick={() => {
                    setFormValues(null);
                    setValidationError(null);
                  }}
                >
                  {t('Reset')}
                </Button>
              )}
              <Button
                type="submit"
                variant="contained"
                disabled={updateSettings.isPending}
                sx={{ px: 3 }}
              >
                {updateSettings.isPending ? t('Saving…') : t('Save Rates')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </QueryState>

      <ConfirmDialog
        open={Boolean(pendingSubmit)}
        title={t('Update platform finance rates?')}
        message={
          pendingSubmit
            ? `${t('New rates')}: ${t('Commission')} ${pendingSubmit.commissionRate}%, ${t('VAT')} ${pendingSubmit.vatRate}%, ${t('TNCN')} ${pendingSubmit.tncnRate}%. ${t('These rates apply to newly issued quotations.')}`
            : ''
        }
        confirmLabel={t('Confirm save')}
        cancelLabel={t('Cancel')}
        loading={updateSettings.isPending}
        onCancel={() => setPendingSubmit(null)}
        onConfirm={() => void handleConfirmSave()}
      />
    </Box>
  );
}
